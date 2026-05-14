import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Sends a branded assignment notification through Gmail (so it works for any
// recipient, not just registered Base44 users). Used by ticket assignment flows.
// The email is threaded onto the client conversation AND logged as an
// EmailMessage so it appears in the ticket's thread panel.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // No auth gate — this endpoint is invoked by the public IntakeForm on new ticket
    // submission (anonymous), and also by authenticated staff on reassignment.
    let user = null;
    try { user = await base44.auth.me(); } catch (_e) { user = null; }

    const { ticket_id, assigned_to } = await req.json();
    if (!ticket_id || !assigned_to) {
      return Response.json({ error: 'ticket_id and assigned_to required' }, { status: 400 });
    }

    const ticket = await base44.asServiceRole.entities.SupportTicket.get(ticket_id);
    if (!ticket) return Response.json({ error: 'Ticket not found' }, { status: 404 });

    // Find the most recent message in the thread to attach this assignment
    // notification to. Falls back to the welcome email if nothing else exists.
    // This matches the threading approach used by sendTicketEmail.
    const existing = await base44.asServiceRole.entities.EmailMessage.filter(
      { ticket_id }, '-sent_at', 50
    );
    const lastMessage = existing[0] || null;
    const threadAnchor = existing.length > 0 ? existing[existing.length - 1] : null;

    const ticketUrl = `https://support.pilatesinpinkstudio.com/TicketBoard?ticket=${ticket.id}`;
    const assignedByName = user?.full_name || user?.email?.split('@')[0] || 'System';
    const isUrgent = ticket.priority === 'Urgent' || ticket.inquiry_type === 'Cancellation';
    const headerColor = isUrgent ? '#dc2626' : '#f1899b';
    const headerEmoji = isUrgent ? '🚨' : '✨';
    const headerText = isUrgent ? 'URGENT Cancellation Assigned' : 'New Ticket Assigned';

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:linear-gradient(135deg,#f1899b 0%,#f7b1bd 50%,#fbe0e2 100%);padding:40px 20px;">
        <div style="background:white;border-radius:20px;padding:30px;box-shadow:0 10px 30px rgba(0,0,0,0.1);">
          <div style="text-align:center;margin-bottom:30px;">
            <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_690aada19e27fe8fcf067828/45da48106_Pilatesinpinklogojusticon1.png" alt="Pilates in Pink" style="width:80px;height:80px;">
            <h1 style="color:${headerColor};margin:15px 0 10px 0;font-size:28px;">${headerEmoji} ${headerText}</h1>
            <p style="color:#666;margin:0;">A ticket has been assigned to you</p>
          </div>
          <div style="background:linear-gradient(135deg,#f1899b20,#fbe0e220);border-left:4px solid ${headerColor};padding:20px;border-radius:10px;margin-bottom:20px;">
            <h2 style="color:#333;margin:0 0 15px 0;font-size:20px;">${ticket.client_name}</h2>
            <p style="margin:8px 0;color:#555;"><strong>Email:</strong> ${ticket.client_email}</p>
            ${ticket.client_phone ? `<p style="margin:8px 0;color:#555;"><strong>Phone:</strong> ${ticket.client_phone}</p>` : ''}
            <p style="margin:8px 0;color:#555;"><strong>Inquiry:</strong> ${ticket.inquiry_type}</p>
            <p style="margin:8px 0;color:#555;"><strong>Status:</strong> ${ticket.status}</p>
            <p style="margin:8px 0;color:#555;"><strong>Priority:</strong> ${ticket.priority}</p>
          </div>
          ${ticket.notes ? `<div style="background:#f8f9fa;padding:15px;border-radius:10px;margin-bottom:20px;"><p style="color:#666;margin:0 0 8px 0;font-weight:600;">Notes:</p><p style="color:#555;margin:0;white-space:pre-wrap;">${ticket.notes.replace(/</g, '&lt;')}</p></div>` : ''}
          <div style="text-align:center;margin-top:30px;">
            <a href="${ticketUrl}" style="display:inline-block;background:${headerColor};color:white;padding:14px 32px;text-decoration:none;border-radius:25px;font-weight:bold;font-size:16px;">View Ticket Details</a>
          </div>
          <div style="margin-top:25px;padding-top:20px;border-top:1px solid #e0e0e0;text-align:center;">
            <p style="color:#999;margin:5px 0;font-size:13px;">Assigned by ${assignedByName}</p>
            <p style="color:#999;margin:5px 0;font-size:13px;">Pilates in Pink&trade; Support System</p>
          </div>
        </div>
      </div>`;

    // Build subject — match the same `[Ticket #N] ...` prefix the rest of the
    // thread uses so Gmail groups everything in one conversation.
    const ticketRef = ticket.ticket_number ? String(ticket.ticket_number) : ticket.id.slice(-8);
    const subjectTag = `[Ticket #${ticketRef}]`;
    let subject;
    if (threadAnchor && threadAnchor.subject) {
      // Strip any prior "🚨 URGENT: " prefix so we always match the clean
      // `[Ticket #N] ...` subject used by the welcome email and client replies.
      const cleaned = threadAnchor.subject.replace(/^🚨\s*URGENT:\s*/i, '');
      subject = cleaned.startsWith(subjectTag) ? cleaned : `${subjectTag} ${cleaned}`;
    } else {
      subject = `${subjectTag} ${ticket.inquiry_type} — ${ticket.client_name}`;
    }

    // Sender — same branding as sendTicketEmail
    const fromName = 'Pilates in Pink \u2122';
    const fromEmail = 'support@pilatesinpinkstudio.com';
    const fromNameEncoded = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(fromName)))}?=`;
    const fromHeader = `${fromNameEncoded} <${fromEmail}>`;

    const boundary = "____pip_assign_" + Math.random().toString(36).slice(2);
    const headers = [
      `From: ${fromHeader}`,
      `To: ${assigned_to}`,
      `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ];

    // No threading headers — we want the assignment email to land in its own
    // Gmail thread on the owner's side (separate from the BCC'd welcome email).
    // Customer replies to the welcome will naturally merge into this thread via
    // the matching `[Ticket #N]` subject prefix.
    const inReplyTo = null;
    const references = null;

    const plainText = html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    const body = [
      `--${boundary}`, `Content-Type: text/plain; charset="UTF-8"`, ``, plainText, ``,
      `--${boundary}`, `Content-Type: text/html; charset="UTF-8"`, ``, html, ``,
      `--${boundary}--`,
    ].join("\r\n");
    const raw = headers.join("\r\n") + "\r\n\r\n" + body;
    const rawBytes = new TextEncoder().encode(raw);
    let binary = '';
    for (const b of rawBytes) binary += String.fromCharCode(b);
    const encoded = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');
    // Do not pass threadId — let Gmail create a fresh thread for the assignment
    // email so it doesn't bury the BCC'd welcome email's content.
    const sendBody = { raw: encoded };

    const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(sendBody),
    });

    if (!sendRes.ok) {
      const err = await sendRes.text();
      console.error('Assignment email send failed:', err);
      // Log the failed send so it's visible in the thread panel
      await base44.asServiceRole.entities.EmailMessage.create({
        ticket_id,
        direction: 'outbound',
        from_email: fromEmail,
        from_name: fromName,
        to_email: assigned_to,
        subject,
        body_html: html,
        snippet: `Assignment notification to ${assigned_to}`,
        sent_by: user?.email || 'system',
        sent_at: new Date().toISOString(),
        send_status: 'failed',
        send_error: err.slice(0, 500),
      });
      return Response.json({ error: 'Send failed', details: err }, { status: 500 });
    }

    const sentMessage = await sendRes.json();

    // Pull Message-ID header so future replies thread correctly off this email
    let rfcMessageId = '';
    try {
      const fetchRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${sentMessage.id}?format=metadata&metadataHeaders=Message-ID`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const fullMsg = await fetchRes.json();
      const hdrs = fullMsg.payload?.headers || [];
      rfcMessageId = hdrs.find(h => h.name.toLowerCase() === 'message-id')?.value || '';
    } catch (_e) { rfcMessageId = ''; }

    // Log the assignment email as part of the ticket's email thread
    await base44.asServiceRole.entities.EmailMessage.create({
      ticket_id,
      gmail_thread_id: sentMessage.threadId,
      gmail_message_id: sentMessage.id,
      rfc_message_id: rfcMessageId,
      in_reply_to: inReplyTo || '',
      references: references || '',
      direction: 'outbound',
      from_email: fromEmail,
      from_name: fromName,
      to_email: assigned_to,
      subject,
      body_html: html,
      body_text: plainText,
      snippet: `Ticket assigned to ${assigned_to} by ${assignedByName}`,
      sent_by: user?.email || 'system',
      sent_at: new Date().toISOString(),
      send_status: 'sent',
      read_by: user?.email ? [user.email] : [],
    });

    return Response.json({ success: true, message_id: sentMessage.id, thread_id: sentMessage.threadId });
  } catch (error) {
    console.error('sendAssignmentEmail error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});