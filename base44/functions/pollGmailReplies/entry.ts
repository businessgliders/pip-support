import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Fallback poller: every 2 mins, list recent inbox messages and feed unknown ones
// to ingestGmailReply. This protects against missed Gmail push webhooks.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    // Last 1 hour, inbox only, exclude SENT
    const query = encodeURIComponent('newer_than:1h -in:sent in:inbox');
    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=50`,
      { headers: authHeader }
    );
    if (!listRes.ok) {
      const err = await listRes.text();
      console.error('Gmail list failed:', err);
      return Response.json({ error: 'list failed', details: err }, { status: 500 });
    }
    const list = await listRes.json();
    const messageIds = (list.messages || []).map(m => m.id);
    if (messageIds.length === 0) return Response.json({ ok: true, processed: 0, scanned: 0 });

    // Filter out IDs we already have
    const newIds = [];
    for (const id of messageIds) {
      const existing = await base44.asServiceRole.entities.EmailMessage.filter(
        { gmail_message_id: id }, '-sent_at', 1
      );
      if (existing.length === 0) newIds.push(id);
    }

    if (newIds.length === 0) return Response.json({ ok: true, processed: 0, scanned: messageIds.length });

    // Delegate to ingestGmailReply
    const ingestRes = await base44.asServiceRole.functions.invoke('ingestGmailReply', {
      message_ids: newIds,
    });

    return Response.json({
      ok: true,
      scanned: messageIds.length,
      new: newIds.length,
      ingest_result: ingestRes?.data ?? ingestRes,
    });
  } catch (error) {
    console.error('pollGmailReplies error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});