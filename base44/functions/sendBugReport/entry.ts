import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Hardcoded escalation recipient(s). Can be moved to settings later.
const ESCALATION_TO = "gurpreen@pilatesinpinkstudio.com";
const FROM_EMAIL = "reportbug@pilatesinpinkstudio.com";
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

function buildForwardMailto(report) {
  const subject = `[Bug${report.bug_number ? ` #${report.bug_number}` : ''}] ${report.title || 'Issue reported'}${report.client_name ? ` - ${report.client_name}` : ''}`;
  const lines = [
    `Forwarding bug report from PiP Support Portal.`,
    ``,
    `Title: ${report.title || '—'}`,
    `Urgency: ${report.urgency || '—'}`,
    `Platform: ${report.platform || '—'}`,
    `Reported by: ${report.reported_by_name || report.reported_by_email || '—'}`,
    report.ticket_number ? `Related Ticket: #${report.ticket_number}` : null,
    report.client_name ? `Client: ${report.client_name}` : null,
    report.booking_info ? `Booking: ${report.booking_info}` : null,
    ``,
    `Description:`,
    report.description || '—',
    ``,
    (report.image_urls || []).length ? `Attachments:\n${(report.image_urls || []).join('\n')}` : null,
  ].filter(Boolean).join('\n');
  return `mailto:support@gokenko.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines)}`;
}

function buildHtml(report) {
  const urgencyColor = URGENCY_COLOR[report.urgency] || "#64748b";

  const imagesHtml = (report.image_urls || []).length
    ? `<h3 style="margin:18px 0 8px;font-size:14px;color:#334155;">📎 Attachments</h3>
       <div>${report.image_urls.map(u => `
         <div style="margin:8px 0;">
           <img src="${escapeHtml(u)}" style="max-width:480px;border-radius:8px;border:1px solid #e2e8f0;" />
           <div style="margin-top:4px;font-size:11px;color:#64748b;word-break:break-all;">${escapeHtml(u)}</div>
         </div>
       `).join("")}</div>`
    : "";

  return `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:640px;margin:0 auto;background:#ffffff;padding:24px;">
    <div style="border-left:4px solid ${urgencyColor};padding-left:14px;margin-bottom:18px;">
      <div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#64748b;">Issue ${report.bug_number ? `B${report.bug_number} • ` : ''}${escapeHtml(report.urgency || 'Soon')}</div>
      <h1 style="margin:4px 0 0;font-size:22px;color:#0f172a;">${escapeHtml(report.title || 'New issue reported')}</h1>
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
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px;font-size:13px;color:#0f172a;white-space:pre-wrap;font-style:italic;">${escapeHtml(report.description || '—')}</div>

    <div style="margin-top:14px;">
      <a href="${buildForwardMailto(report)}" style="display:inline-block;padding:10px 18px;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:600;">Forward to Platform</a>
    </div>

    ${imagesHtml}

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

function buildRawEmail({ to, fromEmail, fromName, replyTo, subject, html }) {
  const boundary = "----pipbug" + Math.random().toString(36).slice(2);
  const headers = [
    `From: ${fromName} <${fromEmail}>`,
    `To: ${to}`,
    `Reply-To: ${replyTo}`,
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
      transcript = [],
      rep_name = ""
    } = body || {};

    // If a Front Desk rep name was provided, prefer it as the reporter name
    const reporterName = (rep_name && rep_name.trim())
      ? rep_name.trim()
      : (user.full_name || user.email);

    if (!description || !String(description).trim()) {
      return Response.json({ error: "Missing description" }, { status: 400 });
    }

    // Assign next sequential bug_number starting at 100
    let bugNumber = 100;
    try {
      const latest = await base44.asServiceRole.entities.BugReport.list("-bug_number", 1);
      const lastNum = latest?.[0]?.bug_number;
      if (typeof lastNum === "number" && lastNum >= 100) bugNumber = lastNum + 1;
    } catch (e) {
      console.error("Failed to compute next bug_number, defaulting to 100:", e);
    }

    // Generate a short LLM title (3-6 words, headline-style)
    let title = "";
    try {
      const llmRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Summarize the following support issue as a short headline-style title of 3-6 words (Title Case, no period, no quotes). Just output the title text and nothing else.\n\nIssue: ${description}${client_name ? `\nClient: ${client_name}` : ""}`,
        response_json_schema: {
          type: "object",
          properties: { title: { type: "string" } },
          required: ["title"]
        }
      });
      title = String(llmRes?.title || "").trim().replace(/^["']|["']$/g, "").slice(0, 80);
    } catch (e) {
      console.error("Failed to generate title via LLM:", e);
    }

    // Persist the bug report
    const created = await base44.asServiceRole.entities.BugReport.create({
      bug_number: bugNumber,
      title,
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
      reported_by_name: reporterName,
      escalated_to: ESCALATION_TO,
      email_status: "pending",
      replies: []
    });

    // Send via Gmail connector
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("gmail");

    const html = buildHtml({ ...created, id: created.id });
    const titlePart = title ? ` ${title}` : " New Issue Reported";
    const clientPart = client_name ? ` - ${client_name}` : "";
    const subject = `⚠️ [Bug #${bugNumber}]${titlePart}${clientPart}`;

    const raw = buildRawEmail({
      to: ESCALATION_TO,
      fromEmail: FROM_EMAIL,
      fromName: FROM_NAME,
      replyTo: FROM_EMAIL,
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
      // Return success so the report is acknowledged as saved, but flag email failure
      return Response.json({
        success: true,
        bug_report_id: created.id,
        escalated_to: ESCALATION_TO,
        email_failed: true,
        bug_number: bugNumber
      });
    }

    const sentMessage = await gmailRes.json();

    // Fetch sent message Message-ID header so we can match inbound replies later
    let rfcMessageId = "";
    try {
      const metaRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${sentMessage.id}?format=metadata&metadataHeaders=Message-ID`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (metaRes.ok) {
        const fullMsg = await metaRes.json();
        const headers = fullMsg.payload?.headers || [];
        rfcMessageId = headers.find(h => h.name.toLowerCase() === "message-id")?.value || "";
      }
    } catch (e) {
      console.error("Failed to fetch sent Message-ID:", e);
    }

    await base44.asServiceRole.entities.BugReport.update(created.id, {
      email_status: "sent",
      gmail_thread_id: sentMessage.threadId || "",
      rfc_message_id: rfcMessageId
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