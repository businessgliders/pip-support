import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Assigns the next sequential ticket_number (starting at 1) to a ticket.
// Idempotent: if ticket already has a ticket_number, returns it unchanged.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { ticket_id } = await req.json();
    if (!ticket_id) {
      return Response.json({ error: 'ticket_id required' }, { status: 400 });
    }

    const ticket = await base44.asServiceRole.entities.SupportTicket.get(ticket_id);
    if (!ticket) return Response.json({ error: 'Ticket not found' }, { status: 404 });

    // Hybrid auth: authenticated staff can call freely. Anonymous callers (public
    // IntakeForm) are only allowed when the ticket was just created (< 5 min old)
    // — prevents replaying old ticket IDs to spam-trigger ticket number bumps.
    // The function is idempotent (returns existing number) so this is mostly
    // defense-in-depth against junk calls.
    let caller = null;
    try { caller = await base44.auth.me(); } catch (_e) { caller = null; }
    const isStaff = caller?.email?.endsWith('@pilatesinpinkstudio.com');
    if (!isStaff) {
      const ageMs = Date.now() - new Date(ticket.created_date).getTime();
      if (ageMs > 5 * 60 * 1000) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    if (ticket.ticket_number) {
      return Response.json({ success: true, ticket_number: ticket.ticket_number });
    }

    // Find the highest existing ticket_number
    const all = await base44.asServiceRole.entities.SupportTicket.list('-ticket_number', 1);
    const highest = all.find(t => typeof t.ticket_number === 'number')?.ticket_number;
    const next = highest && highest >= 1 ? highest + 1 : 1;

    await base44.asServiceRole.entities.SupportTicket.update(ticket_id, { ticket_number: next });
    return Response.json({ success: true, ticket_number: next });
  } catch (error) {
    console.error('assignTicketNumber error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});