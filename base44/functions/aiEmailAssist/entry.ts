import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function htmlToText(html) {
  if (!html) return '';
  return html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function buildContext(base44, ticket_id) {
  const ticket = await base44.asServiceRole.entities.SupportTicket.get(ticket_id);
  const messages = await base44.asServiceRole.entities.EmailMessage.filter(
    { ticket_id }, 'sent_at', 50
  );
  const thread = messages.map(m => {
    const who = m.direction === 'inbound' ? `Client (${m.from_name || m.from_email})` : `Staff (${m.from_name || 'Pilates in Pink'})`;
    return `--- ${who} on ${m.sent_at} ---\nSubject: ${m.subject}\n\n${htmlToText(m.body_html || m.body_text || '')}`;
  }).join('\n\n');
  return { ticket, thread };
}

const STYLE_GUIDE = `Tone: warm, friendly, professional. Pilates in Pink is a women's pilates studio.
- Keep replies concise (2-4 short paragraphs max).
- Address the client by their first name when known.
- Sign off as the staff member writing (signature added separately).
- Never invent facts about pricing, schedules, or membership terms — be helpful but defer to confirming details if unsure.
- Use plain HTML with <p> tags only. No headers, no inline styles.`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.email.endsWith('@pilatesinpinkstudio.com')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { mode, ticket_id, description, draft, force_refresh } = await req.json();
    if (!mode) return Response.json({ error: 'mode required' }, { status: 400 });

    const staffName = user.full_name ? user.full_name.split(' ')[0] : 'the team';

    if (mode === 'suggest') {
      const { ticket, thread } = await buildContext(base44, ticket_id);

      // Return cached suggestions if they exist and the thread hasn't changed
      const messages = await base44.asServiceRole.entities.EmailMessage.filter({ ticket_id });
      const currentMessageCount = messages.length;

      if (
        !force_refresh &&
        ticket.ai_suggestions &&
        ticket.ai_suggestions.length > 0 &&
        ticket.ai_suggestions_message_count === currentMessageCount
      ) {
        return Response.json({
          suggestions: ticket.ai_suggestions,
          cached: true,
          generated_at: ticket.ai_suggestions_generated_at,
        });
      }

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are drafting reply suggestions for a support ticket at Pilates in Pink.

${STYLE_GUIDE}

Ticket info:
- Client: ${ticket.client_name}
- Inquiry type: ${ticket.inquiry_type}
- Status: ${ticket.status}
- Original notes: ${ticket.notes || '(none)'}

Email thread so far:
${thread || '(no emails yet)'}

Generate 3 distinct reply suggestions for the staff member (${staffName}) to send to the client. Each should take a different angle (e.g. one direct/quick, one detailed/thorough, one warm/relational).

Return as JSON.`,
        response_json_schema: {
          type: 'object',
          properties: {
            suggestions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  label: { type: 'string', description: 'Short 2-4 word label for this suggestion' },
                  body_html: { type: 'string', description: 'Full email body in simple HTML <p> tags' }
                },
                required: ['label', 'body_html']
              }
            }
          },
          required: ['suggestions']
        }
      });

      // Cache result on the ticket
      if (result?.suggestions?.length) {
        await base44.asServiceRole.entities.SupportTicket.update(ticket_id, {
          ai_suggestions: result.suggestions,
          ai_suggestions_generated_at: new Date().toISOString(),
          ai_suggestions_message_count: currentMessageCount,
        });
      }

      return Response.json({ ...result, cached: false });
    }

    if (mode === 'compose') {
      const { ticket, thread } = await buildContext(base44, ticket_id);
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are writing a support reply email at Pilates in Pink.

${STYLE_GUIDE}

Ticket info:
- Client: ${ticket.client_name}
- Inquiry type: ${ticket.inquiry_type}

Email thread so far:
${thread || '(no emails yet)'}

The staff member (${staffName}) wants to convey this in their reply (in plain words):
"${description}"

Write the full email reply body as polished HTML with <p> tags only. Do not include subject line, greeting variations, or signature — just the body.`,
        response_json_schema: {
          type: 'object',
          properties: { body_html: { type: 'string' } },
          required: ['body_html']
        }
      });
      return Response.json(result);
    }

    if (mode === 'polish') {
      if (!draft) return Response.json({ error: 'draft required' }, { status: 400 });
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Polish this support reply draft from a Pilates in Pink staff member.

${STYLE_GUIDE}

Original draft:
${draft}

Keep the same intent and key information. Improve grammar, tone, flow, and warmth. Output only the polished body in plain HTML with <p> tags.`,
        response_json_schema: {
          type: 'object',
          properties: { body_html: { type: 'string' } },
          required: ['body_html']
        }
      });
      return Response.json(result);
    }

    return Response.json({ error: 'invalid mode' }, { status: 400 });
  } catch (error) {
    console.error('aiEmailAssist error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});