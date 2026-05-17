import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const FROM_EMAIL = 'support@pilatesinpinkstudio.com';
const FROM_NAME = 'Pilates in Pink Support';

const escapeHtml = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

function buildHtmlBody(bodyText, imageUrls) {
  const safeText = escapeHtml(bodyText).replace(/\n/g, '<br/>');
  const imgs = (imageUrls || [])
    .map(u => `<div style="margin-top:8px"><img src="${u}" style="max-width:100%;border-radius:8px;border:1px solid #e5e7eb"/></div>`)
    .join('');
  return `<div style="font-family:Arial,sans-serif;font-size:14px;color:#0f172a;line-height:1.5">${safeText}${imgs}</div>`;
}

function encodeRFC2047(str) {
  return `=?UTF-8?B?${btoa(unescape(encodeURIComponent(str)))}?=`;
}

function buildRawEmail({ to, subject, html, text, inReplyTo, references, fromEmail, fromName }) {
  const messageId = `<bugreply-${Date.now()}-${Math.random().toString(36).slice(2)}@pilatesinpinkstudio.com>`;
  const boundary = `bdy_${Math.random().toString(36).slice(2)}`;
  const headers = [
    `From: ${encodeRFC2047(fromName)} <${fromEmail}>`,
    `To: ${to}`,
    `Subject: ${encodeRFC2047(subject)}`,
    `Message-ID: ${messageId}`,
    inReplyTo ? `In-Reply-To: ${inReplyTo}` : null,
    references ? `References: ${references}` : (inReplyTo ? `References: ${inReplyTo}` : null),
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ].filter(Boolean).join('\r\n');

  const body = [
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    text || '',
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    html,
    `--${boundary}--`,
  ].join('\r\n');

  const raw = `${headers}\r\n\r\n${body}`;
  const base64 = btoa(unescape(encodeURIComponent(raw)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return { raw: base64, messageId };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { bug_report_id, body_text = '', image_urls = [] } = await req.json();
    if (!bug_report_id) return Response.json({ error: 'bug_report_id required' }, { status: 400 });
    if (!body_text.trim() && image_urls.length === 0) {
      return Response.json({ error: 'Empty reply' }, { status: 400 });
    }

    const report = await base44.asServiceRole.entities.BugReport.get(bug_report_id);
    if (!report) return Response.json({ error: 'Bug report not found' }, { status: 404 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');

    const subject = `Re: Issue B${report.bug_number} – ${report.title || 'Bug report'}`;
    const recipients = [report.escalated_to].filter(Boolean).join(', ');
    if (!recipients) return Response.json({ error: 'No escalation recipient on report' }, { status: 400 });

    const html = buildHtmlBody(body_text, image_urls);
    const text = body_text + (image_urls.length ? `\n\n[${image_urls.length} attachment(s)]` : '');

    const { raw, messageId } = buildRawEmail({
      to: recipients,
      subject,
      html,
      text,
      inReplyTo: report.rfc_message_id,
      references: report.rfc_message_id,
      fromEmail: FROM_EMAIL,
      fromName: FROM_NAME,
    });

    const sendRes = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw, threadId: report.gmail_thread_id || undefined }),
      }
    );
    if (!sendRes.ok) {
      const errText = await sendRes.text();
      return Response.json({ error: 'Gmail send failed', details: errText }, { status: 500 });
    }
    const sent = await sendRes.json();

    // Append to replies as an outbound bubble
    const newReply = {
      from_email: user.email,
      from_name: user.full_name || user.email,
      subject,
      body_text,
      body_html: html,
      snippet: body_text.slice(0, 200),
      received_at: new Date().toISOString(),
      gmail_message_id: sent.id,
      rfc_message_id: messageId,
      read_by: [user.email],
      direction: 'outbound',
      image_urls,
    };
    const updatedReplies = [...(report.replies || []), newReply];
    await base44.asServiceRole.entities.BugReport.update(report.id, { replies: updatedReplies });

    return Response.json({ ok: true, reply: newReply });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});