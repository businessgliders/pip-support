import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Hardcoded escalation recipient(s). Can be moved to settings later.
const ESCALATION_TO = "talia@pilatesinpinkstudio.com";
const FROM_NAME = "PiP Support Bug Report";

const URGENCY_COLOR = {
  "Critical": "#dc2626",
  "High": "#ea580c",
  "Soon": "#ca8a04",
  "Low": "#16a34a"
};

function escapeHtml(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildHtml(report) {
  const urgencyColor = URGENCY_COLOR[report.urgency] || "#64748b";
  const transcriptHtml = (report.transcript || []).map(m => `
    <div style="margin:6px 0;padding:8px 10px;border-radius:8px;background:${m.role === 'user' ? '#fdf2f4' : '#f8fafc'};border:1px solid ${m.role === 'user' ? '#fbcfe8' : '#e2e8f0'};">
      <div style="font-size:11px;text-transform:uppercase;color:#64748b;letter-spacing:.05em;margin-bottom:2px;">${escapeHtml(m.role === 'user' ? (report.reported_by_name || 'Reporter') : 'Assistant')}</div>
      <div style="font-size:13px;color:#0f172a;white-space:pre-wrap;">${escapeHtml(m.content || '')}</div>
    </div>
  `).join("");

  const imagesHtml = (report.image_urls || []).length
    ? `<h3 style="margin:18px 0 8px;font-size:14px;color:#334155;">📎 Attachments</h3>
       <div>${report.image_urls.map(u => `
         <div style="margin:8px 0;">
           <a href="${escapeHtml(u)}" style="color:#b67651;font-size:12px;word-break:break-all;">${escapeHtml(u)}</a><br/>
           <img src="${escapeHtml(u)}" style="max-width:480px;border-radius:8px;border:1px solid #e2e8f0;margin-top:4px;" />
         </div>
       `).join("")}</div>`
    : "";

  return `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:640px;margin:0 auto;background:#ffffff;padding:24px;">
    <div style="border-left:4px solid ${urgencyColor};padding-left:14px;margin-bottom:18px;">
      <div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#64748b;">🐛 Bug Report • ${escapeHtml(report.urgency || 'Soon')}</div>
      <h1 style="margin:4px 0 0;font-size:20px;color:#0f172a;">New bug reported from Support Portal</h1>
    </div>

    <table style="width:100%;font-size:13px;color:#0f172a;border-collapse:collapse;">
      <tr><td style="padding:4px 0;color:#64748b;width:140px;">Platform</td><td>${escapeHtml(report.platform || '—')}</td></tr>
      <tr><td style="padding:4px 0;color:#64748b;">Urgency</td><td><span style="display:inline-block;padding:2px 8px;border-radius:9999px;background:${urgencyColor}1a;color:${urgencyColor};font-weight:600;font-size:12px;">${escapeHtml(report.urgency || '—')}</span></td></tr>
      <tr><td style="padding:4px 0;color:#64748b;">Reported by</td><td>${escapeHtml(report.reported_by_name || report.reported_by_email || '—')}</td></tr>
      ${report.ticket_number ? `<tr><td style="padding:4px 0;color:#64748b;">Related Ticket</td><td><strong>#${escapeHtml(report.ticket_number)}</strong></td></tr>` : ''}
      ${report.client_name ? `<tr><td style="padding:4px 0;color:#64748b;">Client</td><td>${escapeHtml(report.client_name)}</td></tr>` : ''}
      ${report.booking_info ? `<tr><td style="padding:4px 0;color:#64748b;">Booking</td><td>${escapeHtml(report.booking_info)}</td></tr>` : ''}
    </table>

    <h3 style="margin:18px 0 8px;font-size:14px;color:#334155;">📝 Description</h3>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px;font-size:13px;color:#0f172a;white-space:pre-wrap;">${escapeHtml(report.description || '—')}</div>

    ${imagesHtml}

    ${(report.transcript || []).length ? `
      <h3 style="margin:18px 0 8px;font-size:14px;color:#334155;">💬 Conversation</h3>
      ${transcriptHtml}
    ` : ''}

    <div style="margin-top:24px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;">
      Sent automatically from PiP Support Portal • Bug Report ID: ${escapeHtml(report.id || 'n/a')}
    </div>
  </div>`;
}

function encodeBase64Url(str) {
  // UTF-8 safe base64url
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function buildRawEmail({ to, fromEmail, fromName, subject, html }) {
  const boundary = "----pipbug" + Math.random().toString(36).slice(2);
  const headers = [
    `From: ${fromName} <${fromEmail}>`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ].join("\r\n");

  const textPart = `--${boundary}\r\nContent-Type: text/plain; charset="UTF-8"\r\nContent-Transfer-Encoding: 7bit\r\n\r\n${subject}\r\n`;
  const htmlPart = `--${boundary}\r\nContent-Type: text/html; charset="UTF-8"\r\nContent-Transfer-Encoding: 7bit\r\n\r\n${html}\r\n`;
  const end = `--${boundary}--`;

  return `${headers}\r\n\r\n${textPart}\r\n${htmlPart}\r\n${end}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const {
      description,
      ticket_number,
      ticket_id,
      client_name,
      booking_info,
      platform = "Support Portal",
      urgency = "Soon",
      image_urls = [],
      transcript = []
    } = body || {};

    if (!description || !String(description).trim()) {
      return Response.json({ error: "Missing description" }, { status: 400 });
    }

    // Persist the bug report
    const created = await base44.asServiceRole.entities.BugReport.create({
      description,
      ticket_number: ticket_number || "",
      ticket_id: ticket_id || "",
      client_name: client_name || "",
      booking_info: booking_info || "",
      platform,
      urgency,
      image_urls,
      transcript,
      reported_by_email: user.email,
      reported_by_name: user.full_name || user.email,
      escalated_to: ESCALATION_TO,
      email_status: "pending"
    });

    // Send via Gmail connector
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("gmail");

    const html = buildHtml({ ...created, id: created.id });
    const subject = `🐛 [${urgency}] Bug report${ticket_number ? ` • Ticket #${ticket_number}` : ""} - ${user.full_name || user.email}`;

    const raw = buildRawEmail({
      to: ESCALATION_TO,
      fromEmail: "info@pilatesinpinkstudio.com",
      fromName: FROM_NAME,
      subject,
      html
    });

    const gmailRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ raw: encodeBase64Url(raw) })
    });

    if (!gmailRes.ok) {
      const errText = await gmailRes.text();
      await base44.asServiceRole.entities.BugReport.update(created.id, {
        email_status: "failed",
        email_error: errText.slice(0, 500)
      });
      return Response.json({ error: "Failed to send email", details: errText }, { status: 500 });
    }

    await base44.asServiceRole.entities.BugReport.update(created.id, {
      email_status: "sent"
    });

    return Response.json({
      success: true,
      bug_report_id: created.id,
      escalated_to: ESCALATION_TO
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});