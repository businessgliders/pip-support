import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Decode base64url body part
function decodeBody(data) {
  if (!data) return '';
  const b64 = data.replace(/-/g, '+').replace(/_/g, '/');
  try {
    return decodeURIComponent(escape(atob(b64)));
  } catch {
    try { return atob(b64); } catch { return ''; }
  }
}

// Walk MIME parts and find text/html and text/plain bodies
function extractBodies(payload) {
  let html = '';
  let text = '';
  function walk(part) {
    if (!part) return;
    const mime = part.mimeType || '';
    if (mime === 'text/html' && part.body?.data) {
      html = decodeBody(part.body.data);
    } else if (mime === 'text/plain' && part.body?.data) {
      text = decodeBody(part.body.data);
    }
    if (Array.isArray(part.parts)) {
      for (const p of part.parts) walk(p);
    }
  }
  walk(payload);
  return { html, text };
}

function getHeader(headers, name) {
  return headers?.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
}

// Extract ticket short id from subject like "[Ticket #abc12345] ..."
function extractTicketShortId(subject) {
  const m = subject.match(/\[Ticket\s*#([A-Za-z0-9]+)\]/i);
  return m ? m[1] : null;
}

function parseFromHeader(fromHeader) {
  const match = fromHeader.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/);
  if (match) return { name: match[1].trim(), email: match[2].trim().toLowerCase() };
  return { name: '', email: fromHeader.trim().toLowerCase() };
}

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const base44 = createClientFromRequest(req);

    const messageIds = body?.data?.new_message_ids ?? [];
    if (messageIds.length === 0) {
      return Response.json({ ok: true, processed: 0 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    let processed = 0;
    for (const messageId of messageIds) {
      // Skip if we already have it
      const existing = await base44.asServiceRole.entities.EmailMessage.filter(
        { gmail_message_id: messageId }, '-sent_at', 1
      );
      if (existing.length > 0) continue;

      const res = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
        { headers: authHeader }
      );
      if (!res.ok) continue;
      const message = await res.json();
      const headers = message.payload?.headers || [];

      const subject = getHeader(headers, 'Subject');
      const fromHeader = getHeader(headers, 'From');
      const toHeader = getHeader(headers, 'To');
      const messageIdHeader = getHeader(headers, 'Message-ID');
      const inReplyTo = getHeader(headers, 'In-Reply-To');
      const dateHeader = getHeader(headers, 'Date');

      // Skip emails sent by us (outbound) - they're already stored
      const labelIds = message.labelIds || [];
      if (labelIds.includes('SENT')) continue;

      // Find ticket via [Ticket #xxxx] tag
      const shortId = extractTicketShortId(subject);
      if (!shortId) continue;

      // Find ticket by id ending with shortId
      const candidates = await base44.asServiceRole.entities.SupportTicket.list('-created_date', 500);
      const ticket = candidates.find(t => t.id.slice(-8) === shortId);
      if (!ticket) continue;

      const { html, text } = extractBodies(message.payload);
      const from = parseFromHeader(fromHeader);

      await base44.asServiceRole.entities.EmailMessage.create({
        ticket_id: ticket.id,
        gmail_thread_id: message.threadId,
        gmail_message_id: message.id,
        rfc_message_id: messageIdHeader,
        in_reply_to: inReplyTo,
        direction: 'inbound',
        from_email: from.email,
        from_name: from.name,
        to_email: toHeader,
        subject,
        body_html: html,
        body_text: text,
        snippet: message.snippet || '',
        sent_by: '',
        sent_at: dateHeader ? new Date(dateHeader).toISOString() : new Date().toISOString(),
        is_welcome: false,
      });

      // Bump ticket back to "In Progress" if it's Resolved/Closed (client replied)
      if (ticket.status === 'Resolved' || ticket.status === 'Closed') {
        const statusHistory = ticket.status_history || [];
        statusHistory.push({
          status: 'In Progress',
          note: `Client replied via email — auto-reopened`,
          timestamp: new Date().toISOString(),
        });
        await base44.asServiceRole.entities.SupportTicket.update(ticket.id, {
          status: 'In Progress',
          status_history: statusHistory,
        });
      }

      processed++;
    }

    return Response.json({ ok: true, processed });
  } catch (error) {
    console.error('ingestGmailReply error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});