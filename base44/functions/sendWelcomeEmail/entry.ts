import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function buildMime({ from, to, subject, htmlBody }) {
  const boundary = "____pip_boundary_" + Math.random().toString(36).slice(2);
  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];
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
  return btoa(unescape(encodeURIComponent(raw)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function welcomeHtml({ clientName, inquiryType, ticketShortId }) {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#fbe0e2;">
  <div style="max-width:600px;margin:0 auto;background:linear-gradient(135deg,#f1899b 0%,#f7b1bd 50%,#fbe0e2 100%);padding:40px 20px;">
    <div style="background:white;border-radius:20px;padding:30px;box-shadow:0 10px 30px rgba(0,0,0,0.1);">
      <div style="text-align:center;margin-bottom:30px;">
        <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_690aada19e27fe8fcf067828/45da48106_Pilatesinpinklogojusticon1.png" alt="Pilates in Pink" style="width:80px;height:80px;">
        <h1 style="color:#f1899b;margin:15px 0 10px 0;font-size:28px;">We've Got Your Message 💕</h1>
        <p style="color:#666;margin:0;font-size:16px;">Thanks for reaching out, ${clientName}!</p>
      </div>
      <div style="background:linear-gradient(135deg,#f1899b15,#fbe0e220);border-left:4px solid #f1899b;padding:20px;border-radius:10px;margin-bottom:25px;">
        <p style="color:#333;margin:0 0 10px 0;line-height:1.6;">
          We've received your <strong>${inquiryType}</strong> request and one of our team members will be in touch with you very soon.
        </p>
        <p style="color:#333;margin:0;line-height:1.6;">
          We typically respond within <strong>24 hours</strong> during business days.
        </p>
      </div>
      <div style="background:#f8f9fa;padding:15px;border-radius:10px;margin-bottom:25px;text-align:center;">
        <p style="color:#666;margin:0 0 5px 0;font-size:13px;">Your Reference</p>
        <p style="color:#b67651;margin:0;font-size:18px;font-weight:bold;letter-spacing:1px;">#${ticketShortId}</p>
      </div>
      <p style="color:#555;line-height:1.6;margin:0 0 10px 0;">
        💡 <strong>Tip:</strong> Just reply to this email anytime to add more info — your reply will go straight to our support team and stay in this conversation.
      </p>
      <div style="margin-top:30px;padding-top:20px;border-top:1px solid #e0e0e0;text-align:center;">
        <p style="color:#999;margin:5px 0;font-size:13px;">With love,</p>
        <p style="color:#f1899b;margin:5px 0;font-size:15px;font-weight:bold;">The Pilates in Pink Team 🌸</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // This can be called by IntakeForm with the user not yet authenticated as staff,
    // so we use service role internally. But we still validate the ticket exists.
    const { ticket_id } = await req.json();
    if (!ticket_id) return Response.json({ error: 'ticket_id required' }, { status: 400 });

    const ticket = await base44.asServiceRole.entities.SupportTicket.get(ticket_id);
    if (!ticket) return Response.json({ error: 'Ticket not found' }, { status: 404 });

    const ticketRef = ticket.ticket_number ? String(ticket.ticket_number) : ticket.id.slice(-8);
    const subject = `[Ticket #${ticketRef}] ${ticket.inquiry_type} - Pilates in Pink`;
    const htmlBody = welcomeHtml({
      clientName: ticket.client_name,
      inquiryType: ticket.inquiry_type,
      ticketShortId: ticketRef,
    });

    const fromHeader = `"Pilates in Pink" <info@pilatesinpinkstudio.com>`;
    const raw = buildMime({ from: fromHeader, to: ticket.client_email, subject, htmlBody });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');
    const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw }),
    });

    if (!sendRes.ok) {
      const err = await sendRes.text();
      console.error('Welcome email send failed:', err);
      return Response.json({ error: 'Send failed', details: err }, { status: 500 });
    }
    const sentMessage = await sendRes.json();

    // Get RFC Message-ID
    const fetchRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${sentMessage.id}?format=metadata&metadataHeaders=Message-ID`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const fullMsg = await fetchRes.json();
    const headers = fullMsg.payload?.headers || [];
    const rfcMessageId = headers.find(h => h.name.toLowerCase() === 'message-id')?.value || '';

    await base44.asServiceRole.entities.EmailMessage.create({
      ticket_id,
      gmail_thread_id: sentMessage.threadId,
      gmail_message_id: sentMessage.id,
      rfc_message_id: rfcMessageId,
      in_reply_to: '',
      direction: 'outbound',
      from_email: 'info@pilatesinpinkstudio.com',
      from_name: 'Pilates in Pink',
      to_email: ticket.client_email,
      subject,
      body_html: htmlBody,
      snippet: `We've received your ${ticket.inquiry_type} request...`,
      sent_by: 'system',
      sent_at: new Date().toISOString(),
      is_welcome: true,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('sendWelcomeEmail error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});