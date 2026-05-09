import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Admin-only: Renumber ALL tickets sequentially starting at 1, ordered by created_date ASC.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all tickets sorted by created_date ascending
    const all = await base44.asServiceRole.entities.SupportTicket.list('created_date', 5000);

    const updates = [];
    for (let i = 0; i < all.length; i++) {
      const t = all[i];
      const newNumber = i + 1;
      if (t.ticket_number !== newNumber) {
        updates.push({ id: t.id, newNumber });
      }
    }

    // Run updates in parallel batches
    const batchSize = 25;
    let updated = 0;
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      await Promise.all(batch.map(u =>
        base44.asServiceRole.entities.SupportTicket.update(u.id, { ticket_number: u.newNumber })
      ));
      updated += batch.length;
    }

    return Response.json({ success: true, total: all.length, updated });
  } catch (error) {
    console.error('renumberTickets error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});