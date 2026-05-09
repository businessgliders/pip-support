import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Sends a branded assignment notification through Gmail (so it works for any
// recipient, not just registered Base44 users). Used by ticket assignment flows.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.email.endsWith('@pilatesinpinkstudio.com')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { ticket_id, assigned_to } = await req.json();
    if (!ticket_id || !assigned_to) {
      return Response.json({ error: 'ticket_id and assigned_to required' }, { status: 400 });
    }

    const ticket = await base44.asServiceRole.entities.SupportTicket.get(ticket_id);
    if (!ticket) return Response.json({ error: 'Ticket not found' }, { status: 404 });

    const ticketUrl = `https://support.pilatesinpinkstudio.com/TicketBoard?ticket=${ticket.id}`;
    const assignedByName = user.full_name || user.email.split('@')[0];
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
            <p style="color:#999;margin:5px 0;font-size:13px;">Pilates in Pink Support System</p>
          </div>
        </div>
      </div>`;

    // Send via Gmail (works for any address, not just Base44 users)
    const subject = `${isUrgent ? '🚨 URGENT: ' : ''}Ticket Assigned: ${ticket.client_name}`;
    // RFC 2047 encode display name so ™ renders correctly across mail clients
    const fromName = 'Pilates in Pink \u2122';
    const fromNameEncoded = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(fromName)))}?=`;
    const fromHeader = `${fromNameEncoded} <support@pilatesinpinkstudio.com>`;

    const boundary = "____pip_assign_" + Math.random().toString(36).slice(2);
    const headers = [
      `From: ${fromHeader}`,
      `To: ${assigned_to}`,
      `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ];
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
    const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: encoded }),
    });

    if (!sendRes.ok) {
      const err = await sendRes.text();
      console.error('Assignment email send failed:', err);
      return Response.json({ error: 'Send failed', details: err }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('sendAssignmentEmail error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});