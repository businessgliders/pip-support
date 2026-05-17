import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Quoted-printable encoder for non-ASCII safety (handles ™, em-dashes, emojis)
function toQuotedPrintable(str) {
  const bytes = new TextEncoder().encode(str);
  let out = '';
  let lineLen = 0;
  for (const b of bytes) {
    let chunk;
    if (b === 0x3D /* = */) {
      chunk = '=3D';
    } else if (b === 0x0A) {
      out += '\r\n';
      lineLen = 0;
      continue;
    } else if (b === 0x0D) {
      continue;
    } else if (b >= 0x20 && b <= 0x7E) {
      chunk = String.fromCharCode(b);
    } else {
      chunk = '=' + b.toString(16).toUpperCase().padStart(2, '0');
    }
    if (lineLen + chunk.length > 75) {
      out += '=\r\n';
      lineLen = 0;
    }
    out += chunk;
    lineLen += chunk.length;
  }
  return out;
}

// Wrap base64 to 76-char lines (RFC 2045)
function wrapBase64(b64) {
  return b64.match(/.{1,76}/g)?.join("\r\n") || b64;
}

// Encode filename per RFC 2047 if it contains non-ASCII
function encodeFilename(name) {
  if (/^[\x20-\x7E]+$/.test(name)) return `"${name.replace(/"/g, '')}"`;
  return `=?UTF-8?B?${btoa(unescape(encodeURIComponent(name)))}?=`;
}

function buildMime({ from, to, subject, htmlBody, inReplyTo, references, attachments = [] }) {
  const altBoundary = "____pip_alt_" + Math.random().toString(36).slice(2);
  const hasAttachments = attachments.length > 0;
  const mixedBoundary = hasAttachments ? "____pip_mixed_" + Math.random().toString(36).slice(2) : null;

  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    `MIME-Version: 1.0`,
    hasAttachments
      ? `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`
      : `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
  ];
  if (inReplyTo) headers.push(`In-Reply-To: ${inReplyTo}`);
  if (references) headers.push(`References: ${references}`);

  // Plain text fallback
  const plainText = htmlBody
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const altPart = [
    `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
    ``,
    `--${altBoundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: quoted-printable`,
    ``,
    toQuotedPrintable(plainText),
    ``,
    `--${altBoundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: quoted-printable`,
    ``,
    toQuotedPrintable(htmlBody),
    ``,
    `--${altBoundary}--`,
  ].join("\r\n");

  let body;
  if (hasAttachments) {
    const parts = [
      `--${mixedBoundary}`,
      altPart,
      ``,
    ];
    for (const att of attachments) {
      const fname = encodeFilename(att.filename || 'attachment');
      parts.push(`--${mixedBoundary}`);
      parts.push(`Content-Type: ${att.mimeType || 'application/octet-stream'}; name=${fname}`);
      parts.push(`Content-Transfer-Encoding: base64`);
      parts.push(`Content-Disposition: attachment; filename=${fname}`);
      parts.push(``);
      parts.push(wrapBase64(att.base64));
      parts.push(``);
    }
    parts.push(`--${mixedBoundary}--`);
    body = parts.join("\r\n");
  } else {
    body = altPart;
  }

  const raw = headers.join("\r\n") + "\r\n\r\n" + body;
  // Base64url encode the full raw message
  const rawBytes = new TextEncoder().encode(raw);
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < rawBytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, rawBytes.subarray(i, i + CHUNK));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Fetch a file URL and convert it to base64 for MIME embedding
async function fetchAttachment(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch attachment ${url}: ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < buf.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, buf.subarray(i, i + CHUNK));
  }
  const base64 = btoa(binary);
  const mimeType = res.headers.get('content-type')?.split(';')[0]?.trim() || 'application/octet-stream';
  // Try to derive filename from URL path
  let filename = 'attachment';
  try {
    const u = new URL(url);
    const last = u.pathname.split('/').filter(Boolean).pop();
    if (last) filename = decodeURIComponent(last);
  } catch (_) { /* ignore */ }
  return { base64, mimeType, filename };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.email.endsWith('@pilatesinpinkstudio.com')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { ticket_id, body_html, is_welcome, attachment_urls, attachments: attachmentMeta } = await req.json();
    if (!ticket_id || !body_html) {
      return Response.json({ error: 'ticket_id and body_html required' }, { status: 400 });
    }

    // Fetch any attachments (uploaded via UploadFile -> file_url) and base64-encode them
    const attachments = [];
    if (Array.isArray(attachment_urls) && attachment_urls.length > 0) {
      for (const url of attachment_urls) {
        try {
          attachments.push(await fetchAttachment(url));
        } catch (e) {
          console.error('Attachment fetch failed:', e);
          return Response.json({ error: `Attachment fetch failed: ${e.message}` }, { status: 400 });
        }
      }
    }

    const ticket = await base44.asServiceRole.entities.SupportTicket.get(ticket_id);
    if (!ticket) return Response.json({ error: 'Ticket not found' }, { status: 404 });

    const ticketRef = ticket.ticket_number ? String(ticket.ticket_number) : ticket.id.slice(-8);
    const subjectTag = `[Ticket #${ticketRef}]`;

    // Find existing thread messages for threading
    const existing = await base44.asServiceRole.entities.EmailMessage.filter(
      { ticket_id }, '-sent_at', 50
    );
    const threadAnchor = existing.length > 0 ? existing[existing.length - 1] : null;
    const lastMessage = existing[0];

    let subject;
    if (threadAnchor && threadAnchor.subject) {
      subject = threadAnchor.subject.startsWith(subjectTag)
        ? threadAnchor.subject
        : `${subjectTag} ${threadAnchor.subject}`;
    } else {
      subject = `${subjectTag} ${ticket.inquiry_type} - Pilates in Pink`;
    }

    // Always brand sender as "Pilates in Pink ™" — RFC 2047 encode display name for non-ASCII safety
    const staffName = 'Pilates in Pink \u2122';
    const fromEmail = 'support@pilatesinpinkstudio.com';
    const staffNameEncoded = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(staffName)))}?=`;
    const fromHeader = `${staffNameEncoded} <${fromEmail}>`;

    // Auto-append signature for non-welcome replies — fetch fresh user record
    // to guarantee custom fields (signature_html) are present.
    let finalHtml = body_html;
    if (!is_welcome) {
      // Custom user fields may live at user.signature_html OR user.data.signature_html
      // depending on SDK shape — check both, then fall back to a fresh entity fetch.
      let signatureHtml = user.signature_html || user.data?.signature_html || '';
      if (!signatureHtml) {
        try {
          const matches = await base44.asServiceRole.entities.User.filter({ email: user.email }, '-updated_date', 1);
          const u = matches?.[0];
          signatureHtml = u?.signature_html || u?.data?.signature_html || '';
        } catch (e) {
          console.error('Failed to load user signature:', e);
        }
      }
      if (signatureHtml) {
        finalHtml = `${body_html}<br><br><!--SIGNATURE-->${signatureHtml}`;
      } else {
        console.log(`No signature found for ${user.email}`);
      }
    }

    // Threading headers — proper References chain (RFC 2822)
    const inReplyTo = lastMessage?.rfc_message_id || null;
    let references = null;
    if (lastMessage) {
      const prevRefs = lastMessage.references || '';
      const prevId = lastMessage.rfc_message_id || '';
      references = (prevRefs + ' ' + prevId).trim();
    }
    const threadId = lastMessage?.gmail_thread_id || null;

    const raw = buildMime({
      from: fromHeader,
      to: ticket.client_email,
      subject,
      htmlBody: finalHtml,
      inReplyTo,
      references,
      attachments,
    });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');

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
      // Persist failed-send record
      await base44.asServiceRole.entities.EmailMessage.create({
        ticket_id,
        direction: 'outbound',
        from_email: fromEmail,
        from_name: staffName,
        to_email: ticket.client_email,
        subject,
        body_html: finalHtml,
        snippet: finalHtml.replace(/<[^>]+>/g, '').slice(0, 200),
        sent_by: is_welcome ? 'system' : user.email,
        sent_at: new Date().toISOString(),
        is_welcome: !!is_welcome,
        send_status: 'failed',
        send_error: err.slice(0, 500),
      });
      return Response.json({ error: 'Gmail send failed', details: err }, { status: 500 });
    }

    const sentMessage = await sendRes.json();

    // Fetch sent message metadata for Message-ID header
    const fetchRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${sentMessage.id}?format=metadata&metadataHeaders=Message-ID`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const fullMsg = await fetchRes.json();
    const headers = fullMsg.payload?.headers || [];
    const rfcMessageId = headers.find(h => h.name.toLowerCase() === 'message-id')?.value || '';

    // Build attachments metadata to persist on the EmailMessage record.
    // Prefer client-supplied metadata (name/size/type); fall back to derived values.
    const persistedAttachments = Array.isArray(attachmentMeta) && attachmentMeta.length > 0
      ? attachmentMeta.map(a => ({
          name: a.name || 'attachment',
          url: a.url,
          size: a.size || 0,
          type: a.type || 'application/octet-stream',
        }))
      : (Array.isArray(attachment_urls) ? attachment_urls.map((url, i) => ({
          name: attachments[i]?.filename || 'attachment',
          url,
          size: 0,
          type: attachments[i]?.mimeType || 'application/octet-stream',
        })) : []);

    await base44.asServiceRole.entities.EmailMessage.create({
      ticket_id,
      gmail_thread_id: sentMessage.threadId,
      gmail_message_id: sentMessage.id,
      rfc_message_id: rfcMessageId,
      in_reply_to: inReplyTo || '',
      references: references || '',
      direction: 'outbound',
      from_email: fromEmail,
      from_name: staffName,
      to_email: ticket.client_email,
      subject,
      body_html: finalHtml,
      body_text: finalHtml.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(),
      snippet: finalHtml.replace(/<[^>]+>/g, '').slice(0, 200),
      sent_by: is_welcome ? 'system' : user.email,
      sent_at: new Date().toISOString(),
      is_welcome: !!is_welcome,
      send_status: 'sent',
      read_by: [user.email],
      attachments: persistedAttachments,
    });

    return Response.json({ success: true, message_id: sentMessage.id, thread_id: sentMessage.threadId });
  } catch (error) {
    console.error('sendTicketEmail error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});