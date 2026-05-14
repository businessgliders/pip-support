import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function toQuotedPrintable(str) {
  const bytes = new TextEncoder().encode(str);
  let out = '';
  let lineLen = 0;
  for (const b of bytes) {
    let chunk;
    if (b === 0x3D) chunk = '=3D';
    else if (b === 0x0A) { out += '\r\n'; lineLen = 0; continue; }
    else if (b === 0x0D) continue;
    else if (b >= 0x20 && b <= 0x7E) chunk = String.fromCharCode(b);
    else chunk = '=' + b.toString(16).toUpperCase().padStart(2, '0');
    if (lineLen + chunk.length > 75) { out += '=\r\n'; lineLen = 0; }
    out += chunk;
    lineLen += chunk.length;
  }
  return out;
}

function buildMime({ from, to, bcc, subject, htmlBody }) {
  const boundary = "____pip_boundary_" + Math.random().toString(36).slice(2);
  const headers = [
    `From: ${from}`,
    `To: ${to}`,
  ];
  if (bcc) headers.push(`Bcc: ${bcc}`);
  headers.push(
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  );
  const plainText = htmlBody
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const body = [
    `--${boundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: quoted-printable`,
    ``,
    toQuotedPrintable(plainText),
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: quoted-printable`,
    ``,
    toQuotedPrintable(htmlBody),
    ``,
    `--${boundary}--`,
  ].join("\r\n");
  const raw = headers.join("\r\n") + "\r\n\r\n" + body;
  const rawBytes = new TextEncoder().encode(raw);
  let binary = '';
  for (const b of rawBytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
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
        <p style="color:#f1899b;margin:5px 0;font-size:15px;font-weight:bold;">The Pilates in Pink&trade; Team 🌸</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { ticket_id } = await req.json();
    if (!ticket_id) return Response.json({ error: 'ticket_id required' }, { status: 400 });

    let ticket = await base44.asServiceRole.entities.SupportTicket.get(ticket_id);
    if (!ticket) return Response.json({ error: 'Ticket not found' }, { status: 404 });

    // Hybrid auth: authenticated staff can call freely. Anonymous callers (public
    // IntakeForm) are only allowed when the ticket was just created (< 5 min old)
    // — prevents replaying old ticket IDs to spam-trigger welcome emails.
    // Also block if a welcome was already sent (idempotency + abuse guard).
    let caller = null;
    try { caller = await base44.auth.me(); } catch (_e) { caller = null; }
    const isStaff = caller?.email?.endsWith('@pilatesinpinkstudio.com');
    if (!isStaff) {
      const ageMs = Date.now() - new Date(ticket.created_date).getTime();
      if (ageMs > 5 * 60 * 1000) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      const existingWelcome = await base44.asServiceRole.entities.EmailMessage.filter(
        { ticket_id, is_welcome: true }, '-sent_at', 1
      );
      if (existingWelcome.length > 0) {
        return Response.json({ success: true, already_sent: true });
      }
    }

    // Ensure the ticket has a sequential ticket_number before sending — guarantees
    // a clean numeric reference in the subject (no random ID fallback).
    if (!ticket.ticket_number) {
      const all = await base44.asServiceRole.entities.SupportTicket.list('-ticket_number', 1);
      const highest = all.find(t => typeof t.ticket_number === 'number')?.ticket_number;
      const next = highest && highest >= 1 ? highest + 1 : 1;
      await base44.asServiceRole.entities.SupportTicket.update(ticket_id, { ticket_number: next });
      ticket = { ...ticket, ticket_number: next };
    }

    const ticketRef = String(ticket.ticket_number);
    const subject = `👋 [Ticket #${ticketRef}] ${ticket.inquiry_type} - ${ticket.client_name}`;
    const htmlBody = welcomeHtml({
      clientName: ticket.client_name,
      inquiryType: ticket.inquiry_type,
      ticketShortId: ticketRef,
    });

    // Brand sender as "Pilates in Pink ™" — RFC 2047 encode the display name so non-ASCII (™) renders correctly
    const fromName = 'Pilates in Pink \u2122';
    const fromNameEncoded = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(fromName)))}?=`;
    const fromEmail = 'support@pilatesinpinkstudio.com';
    const fromHeader = `${fromNameEncoded} <${fromEmail}>`;
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
      // Record failure so staff can see it
      await base44.asServiceRole.entities.EmailMessage.create({
        ticket_id,
        direction: 'outbound',
        from_email: fromEmail,
        from_name: fromName,
        to_email: ticket.client_email,
        subject,
        body_html: htmlBody,
        snippet: `Welcome email FAILED to send`,
        sent_by: 'system',
        sent_at: new Date().toISOString(),
        is_welcome: true,
        send_status: 'failed',
        send_error: err.slice(0, 500),
      });
      return Response.json({ error: 'Send failed', details: err }, { status: 500 });
    }
    const sentMessage = await sendRes.json();

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
      references: '',
      direction: 'outbound',
      from_email: fromEmail,
      from_name: fromName,
      to_email: ticket.client_email,
      subject,
      body_html: htmlBody,
      body_text: `We've received your ${ticket.inquiry_type} request and one of our team members will be in touch with you very soon. We typically respond within 24 hours during business days.`,
      snippet: `We've received your ${ticket.inquiry_type} request...`,
      sent_by: 'system',
      sent_at: new Date().toISOString(),
      is_welcome: true,
      send_status: 'sent',
      read_by: [],
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('sendWelcomeEmail error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});