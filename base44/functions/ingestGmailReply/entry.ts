import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function decodeBody(data) {
  if (!data) return '';
  const b64 = data.replace(/-/g, '+').replace(/_/g, '/');
  try { return decodeURIComponent(escape(atob(b64))); }
  catch { try { return atob(b64); } catch { return ''; } }
}

function extractBodies(payload) {
  let html = '';
  let text = '';
  function walk(part) {
    if (!part) return;
    const mime = part.mimeType || '';
    if (mime === 'text/html' && part.body?.data) html = decodeBody(part.body.data);
    else if (mime === 'text/plain' && part.body?.data) text = decodeBody(part.body.data);
    if (Array.isArray(part.parts)) for (const p of part.parts) walk(p);
  }
  walk(payload);
  return { html, text };
}

// Walk MIME payload and collect attachment parts (filename + attachmentId).
// Skips inline parts with no filename (e.g. embedded body parts).
function collectAttachmentParts(payload) {
  const out = [];
  function walk(part) {
    if (!part) return;
    const filename = part.filename || '';
    const attachmentId = part.body?.attachmentId;
    if (filename && attachmentId) {
      out.push({
        filename,
        mimeType: part.mimeType || 'application/octet-stream',
        attachmentId,
        size: part.body?.size || 0,
      });
    }
    if (Array.isArray(part.parts)) for (const p of part.parts) walk(p);
  }
  walk(payload);
  return out;
}

// Download a Gmail attachment, upload it to base44 storage, return persisted metadata.
async function downloadAndStoreAttachment(base44, accessToken, messageId, part) {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${part.attachmentId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error(`Gmail attachment fetch failed: ${res.status}`);
  const json = await res.json();
  const b64 = (json.data || '').replace(/-/g, '+').replace(/_/g, '/');
  // Decode base64 -> bytes -> File-like Blob for UploadFile
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: part.mimeType });
  const file = new File([blob], part.filename, { type: part.mimeType });
  const uploaded = await base44.asServiceRole.integrations.Core.UploadFile({ file });
  return {
    name: part.filename,
    url: uploaded?.file_url,
    size: part.size || bytes.length,
    type: part.mimeType,
  };
}

function getHeader(headers, name) {
  return headers?.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
}

function extractTicketRef(subject) {
  const m = subject.match(/\[Ticket\s*#([A-Za-z0-9]+)\]/i);
  return m ? m[1] : null;
}

function parseFromHeader(fromHeader) {
  const match = fromHeader.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/);
  if (match) return { name: match[1].trim(), email: match[2].trim().toLowerCase() };
  return { name: '', email: fromHeader.trim().toLowerCase() };
}

// Find ticket by either ticket_number (e.g. "45123") or id.slice(-8) (legacy)
async function findTicketByRef(base44, ref) {
  if (!ref) return null;
  // Try ticket_number first
  const asNum = parseInt(ref, 10);
  if (!isNaN(asNum)) {
    const byNumber = await base44.asServiceRole.entities.SupportTicket.filter({ ticket_number: asNum }, '-created_date', 1);
    if (byNumber.length > 0) return byNumber[0];
  }
  // Fallback: legacy id.slice(-8) match (paginated)
  let skip = 0;
  while (skip < 2000) {
    const batch = await base44.asServiceRole.entities.SupportTicket.list('-created_date', 200, skip);
    if (batch.length === 0) break;
    const found = batch.find(t => t.id.slice(-8) === ref);
    if (found) return found;
    if (batch.length < 200) break;
    skip += 200;
  }
  return null;
}

// Find ticket via In-Reply-To by matching against existing EmailMessage rfc_message_ids
async function findTicketByInReplyTo(base44, inReplyTo) {
  if (!inReplyTo) return null;
  const matches = await base44.asServiceRole.entities.EmailMessage.filter(
    { rfc_message_id: inReplyTo }, '-sent_at', 1
  );
  if (matches.length === 0) return null;
  try {
    return await base44.asServiceRole.entities.SupportTicket.get(matches[0].ticket_id);
  } catch {
    return null;
  }
}

// Find a BugReport this inbound message is replying to, via Gmail thread id,
// or via In-Reply-To / References matching the bug report's rfc_message_id.
async function findBugReportForReply(base44, { threadId, inReplyTo, referencesHeader }) {
  // 1) Match by Gmail thread id (fastest)
  if (threadId) {
    const byThread = await base44.asServiceRole.entities.BugReport.filter(
      { gmail_thread_id: threadId }, '-created_date', 1
    );
    if (byThread.length > 0) return byThread[0];
  }
  // 2) Match by rfc_message_id present in In-Reply-To or References chain
  const candidateIds = new Set();
  if (inReplyTo) candidateIds.add(inReplyTo.trim());
  if (referencesHeader) {
    for (const id of referencesHeader.split(/\s+/)) {
      if (id) candidateIds.add(id.trim());
    }
  }
  for (const id of candidateIds) {
    const matches = await base44.asServiceRole.entities.BugReport.filter(
      { rfc_message_id: id }, '-created_date', 1
    );
    if (matches.length > 0) return matches[0];
  }
  return null;
}

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const base44 = createClientFromRequest(req);

    // Auth gate: require either an authenticated admin, a valid shared secret
    // (used by pollGmailReplies and the Gmail webhook automation), or trusted
    // webhook payload shape. Blocks anonymous direct calls.
    const providedSecret = body?.secret || req.headers.get('x-gmail-poll-secret') || '';
    const expectedSecret = Deno.env.get('GMAIL_POLL_SECRET') || '';
    const secretOk = expectedSecret && providedSecret === expectedSecret;
    const isWebhookPayload = Array.isArray(body?.data?.new_message_ids);

    if (!secretOk && !isWebhookPayload) {
      const user = await base44.auth.me().catch(() => null);
      if (!user || user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Support both webhook payload (data.new_message_ids) and our own poll (message_ids)
    const messageIds = body?.data?.new_message_ids ?? body?.message_ids ?? [];
    if (messageIds.length === 0) return Response.json({ ok: true, processed: 0 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    let processed = 0;
    let dropped = 0;
    for (const messageId of messageIds) {
      // Idempotency
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
      const referencesHeader = getHeader(headers, 'References');
      const dateHeader = getHeader(headers, 'Date');
      const autoSubmitted = getHeader(headers, 'Auto-Submitted');
      const precedence = getHeader(headers, 'Precedence');

      // Skip outbound
      const labelIds = message.labelIds || [];
      if (labelIds.includes('SENT')) continue;

      // Skip auto-replies / out-of-office to prevent loops
      if (autoSubmitted && autoSubmitted.toLowerCase() !== 'no') {
        dropped++;
        continue;
      }
      if (['bulk', 'auto_reply', 'list'].includes(precedence.toLowerCase())) {
        dropped++;
        continue;
      }

      // First, check if this is a reply to a bug-report escalation thread
      const bugReport = await findBugReportForReply(base44, {
        threadId: message.threadId,
        inReplyTo,
        referencesHeader,
      });
      if (bugReport) {
        const { html: brHtml, text: brText } = extractBodies(message.payload);
        const brFrom = parseFromHeader(fromHeader);
        const replies = Array.isArray(bugReport.replies) ? bugReport.replies : [];
        // Idempotency on bug-report replies
        if (replies.some(r => r.gmail_message_id === message.id)) {
          continue;
        }
        // Extract any inbound attachments → upload to storage
        const brAttachmentParts = collectAttachmentParts(message.payload);
        const brImageUrls = [];
        for (const p of brAttachmentParts) {
          try {
            const stored = await downloadAndStoreAttachment(base44, accessToken, message.id, p);
            if (stored?.url) brImageUrls.push(stored.url);
          } catch (e) {
            console.error('Bug-report inbound attachment failed:', e);
          }
        }
        replies.push({
          from_email: brFrom.email,
          from_name: brFrom.name,
          subject,
          body_html: brHtml,
          body_text: brText,
          snippet: message.snippet || '',
          received_at: dateHeader ? new Date(dateHeader).toISOString() : new Date().toISOString(),
          gmail_message_id: message.id,
          rfc_message_id: messageIdHeader,
          image_urls: brImageUrls,
          read_by: [],
          direction: 'inbound',
        });
        await base44.asServiceRole.entities.BugReport.update(bugReport.id, { replies });
        processed++;
        continue;
      }

      // Find ticket: subject tag first, fallback to In-Reply-To chain
      const ref = extractTicketRef(subject);
      let ticket = await findTicketByRef(base44, ref);
      if (!ticket) ticket = await findTicketByInReplyTo(base44, inReplyTo);
      if (!ticket) {
        dropped++;
        continue;
      }

      const { html, text } = extractBodies(message.payload);
      const from = parseFromHeader(fromHeader);

      // Extract inbound attachments → upload to storage → persist metadata
      const attachmentParts = collectAttachmentParts(message.payload);
      const inboundAttachments = [];
      for (const p of attachmentParts) {
        try {
          const stored = await downloadAndStoreAttachment(base44, accessToken, message.id, p);
          if (stored?.url) inboundAttachments.push(stored);
        } catch (e) {
          console.error('Inbound attachment failed:', e);
        }
      }

      await base44.asServiceRole.entities.EmailMessage.create({
        ticket_id: ticket.id,
        gmail_thread_id: message.threadId,
        gmail_message_id: message.id,
        rfc_message_id: messageIdHeader,
        in_reply_to: inReplyTo,
        references: referencesHeader,
        direction: 'inbound',
        from_email: from.email,
        from_name: from.name,
        to_email: toHeader.toLowerCase(),
        subject,
        body_html: html,
        body_text: text,
        snippet: message.snippet || '',
        sent_by: '',
        sent_at: dateHeader ? new Date(dateHeader).toISOString() : new Date().toISOString(),
        is_welcome: false,
        send_status: 'received',
        read_by: [],
        attachments: inboundAttachments,
      });

      // Auto-reopen Resolved/Closed
      const updatePayload = {};
      if (ticket.status === 'Resolved' || ticket.status === 'Closed') {
        const statusHistory = ticket.status_history || [];
        statusHistory.push({
          status: 'In Progress',
          note: `Client replied via email — auto-reopened`,
          timestamp: new Date().toISOString(),
        });
        updatePayload.status = 'In Progress';
        updatePayload.status_history = statusHistory;
      }
      if (Object.keys(updatePayload).length > 0) {
        await base44.asServiceRole.entities.SupportTicket.update(ticket.id, updatePayload);
      }

      processed++;
    }

    return Response.json({ ok: true, processed, dropped });
  } catch (error) {
    console.error('ingestGmailReply error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});