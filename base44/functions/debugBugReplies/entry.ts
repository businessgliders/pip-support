import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { bug_number } = await req.json();
    const reports = await base44.asServiceRole.entities.BugReport.filter(
      { bug_number }, '-created_date', 1
    );
    if (reports.length === 0) return Response.json({ error: 'not found' });
    const r = reports[0];
    const summary = (r.replies || []).map((rep, i) => ({
      idx: i,
      direction: rep.direction || '(missing)',
      from_email: rep.from_email,
      from_name: rep.from_name,
      snippet: (rep.snippet || rep.body_text || '').slice(0, 60),
      received_at: rep.received_at,
      gmail_message_id: rep.gmail_message_id,
    }));
    return Response.json({ bug_id: r.id, replies_count: summary.length, replies: summary });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});