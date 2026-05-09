import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Build a base64url-encoded MIME message for Gmail API
function buildMime({ from, to, subject, htmlBody, inReplyTo, references }) {
  const boundary = "____pip_boundary_" + Math.random().toString(36).slice(2);
  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];
  if (inReplyTo) headers.push(`In-Reply-To: ${inReplyTo}`);
  if (references) headers.push(`References: ${references}`);

  // Strip HTML for plain text fallback
  const plainText = htmlBody.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

  const body = [
    `--${boundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    plainText,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    htmlBody,
    ``,
    `--${boundary}--`,
  ].join("\r\n");

  const raw = headers.join("\r\n") + "\r\n\r\n" + body;
  // Base64url encode
  return btoa(unescape(encodeURIComponent(raw)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.email.endsWith('@pilatesinpinkstudio.com')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { ticket_id, body_html, is_welcome } = await req.json();
    if (!ticket_id || !body_html) {
      return Response.json({ error: 'ticket_id and body_html required' }, { status: 400 });
    }

    // Get ticket
    const ticket = await base44.asServiceRole.entities.SupportTicket.get(ticket_id);
    if (!ticket) return Response.json({ error: 'Ticket not found' }, { status: 404 });

    // Subject with [Ticket #number] tag for threading
    const ticketRef = ticket.ticket_number ? String(ticket.ticket_number) : ticket.id.slice(-8);
    const subjectTag = `[Ticket #${ticketRef}]`;
    let subject;

    // Find the most recent email on this thread for threading
    const existing = await base44.asServiceRole.entities.EmailMessage.filter(
      { ticket_id }, '-sent_at', 50
    );
    const threadAnchor = existing.length > 0 ? existing[existing.length - 1] : null; // first email = anchor
    const lastMessage = existing[0]; // most recent

    if (threadAnchor && threadAnchor.subject) {
      // Reuse existing subject for threading consistency
      subject = threadAnchor.subject.startsWith(subjectTag)
        ? threadAnchor.subject
        : `${subjectTag} ${threadAnchor.subject}`;
    } else {
      // First email - build subject
      subject = `${subjectTag} ${ticket.inquiry_type} - Pilates in Pink`;
    }

    // Staff display name — always "Pilates in Pink™" so client inbox shows brand name + Gmail profile photo
    const staffName = 'Pilates in Pink\u2122';
    const fromHeader = `"${staffName}" <info@pilatesinpinkstudio.com>`;

    // Auto-append the sender's saved signature (skip for welcome emails which have their own template)
    let finalHtml = body_html;
    if (!is_welcome && user.signature_html) {
      finalHtml = `${body_html}<br><br>${user.signature_html}`;
    }

    // Threading headers
    const inReplyTo = lastMessage?.rfc_message_id || null;
    const references = lastMessage?.rfc_message_id || null;
    const threadId = lastMessage?.gmail_thread_id || null;

    // Build MIME
    const raw = buildMime({
      from: fromHeader,
      to: ticket.client_email,
      subject,
      htmlBody: finalHtml,
      inReplyTo,
      references,
    });

    // Get Gmail token
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');

    // Send via Gmail API
    const sendBody = { raw };
    if (threadId) sendBody.threadId = threadId;

    const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sendBody),
    });

    if (!sendRes.ok) {
      const err = await sendRes.text();
      console.error('Gmail send failed:', err);
      return Response.json({ error: 'Gmail send failed', details: err }, { status: 500 });
    }

    const sentMessage = await sendRes.json();

    // Fetch the sent message to get headers (Message-ID)
    const fetchRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${sentMessage.id}?format=metadata&metadataHeaders=Message-ID&metadataHeaders=Subject`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const fullMsg = await fetchRes.json();
    const headers = fullMsg.payload?.headers || [];
    const rfcMessageId = headers.find(h => h.name.toLowerCase() === 'message-id')?.value || '';

    // Store EmailMessage record
    await base44.asServiceRole.entities.EmailMessage.create({
      ticket_id,
      gmail_thread_id: sentMessage.threadId,
      gmail_message_id: sentMessage.id,
      rfc_message_id: rfcMessageId,
      in_reply_to: inReplyTo || '',
      direction: 'outbound',
      from_email: 'info@pilatesinpinkstudio.com',
      from_name: staffName,
      to_email: ticket.client_email,
      subject,
      body_html: finalHtml,
      snippet: finalHtml.replace(/<[^>]+>/g, '').slice(0, 200),
      sent_by: is_welcome ? 'system' : user.email,
      sent_at: new Date().toISOString(),
      is_welcome: !!is_welcome,
    });

    return Response.json({ success: true, message_id: sentMessage.id, thread_id: sentMessage.threadId });
  } catch (error) {
    console.error('sendTicketEmail error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});