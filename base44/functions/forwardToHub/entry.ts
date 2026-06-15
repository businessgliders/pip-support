import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Forwards a newly-created SupportTicket to the central PiP Inbox hub.
// Server-side ONLY — the SPOKE_INTAKE_SECRET never reaches the browser.
//
// Called fire-and-forget from the IntakeForm create flow right after a ticket
// is saved. If the POST to the hub fails, we log it and still return 200 so the
// client submission is never blocked.
const HUB_ENDPOINT =
  'https://pink-app-hub.base44.app/api/apps/69841af9c747b033a60780f2/functions/spokeIntake';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { ticket_id } = await req.json();
    if (!ticket_id) {
      return Response.json({ error: 'ticket_id required' }, { status: 400 });
    }

    const ticket = await base44.asServiceRole.entities.SupportTicket.get(ticket_id);
    if (!ticket) {
      return Response.json({ error: 'Ticket not found' }, { status: 404 });
    }

    if (!ticket.client_email) {
      console.warn('forwardToHub: ticket has no client_email, skipping', ticket_id);
      return Response.json({ success: false, skipped: 'no_email' });
    }

    const secret = Deno.env.get('SPOKE_INTAKE_SECRET');
    if (!secret) {
      console.error('forwardToHub: SPOKE_INTAKE_SECRET not set');
      return Response.json({ success: false, error: 'secret_missing' });
    }

    const shortTitle = ticket.inquiry_type
      ? `${ticket.inquiry_type}${ticket.client_name ? ` - ${ticket.client_name}` : ''}`
      : (ticket.client_name || 'New support request');

    // Core mapped fields plus every other ticket field at the top level so the
    // hub stores whatever extra context the form captured (cancellation reason,
    // ticket_number, etc.). Core fields are spread last to win.
    const payload = {
      ...ticket,
      source_app: 'support',
      name: ticket.client_name || '',
      email: ticket.client_email,
      phone: ticket.client_phone || '',
      subject: shortTitle,
      inquiry_type: ticket.inquiry_type || '',
      priority: ticket.priority || '',
      message: ticket.notes || '',
      notes: ticket.notes || '',
      spoke_ticket_id: ticket.id,
    };

    const res = await fetch(HUB_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('forwardToHub: hub POST failed', res.status, errText.slice(0, 500));
      // Don't block the user — report soft failure.
      return Response.json({ success: false, hub_status: res.status });
    }

    let hubResult = null;
    try { hubResult = await res.json(); } catch (_e) { /* hub may return empty */ }

    return Response.json({ success: true, hub: hubResult });
  } catch (error) {
    console.error('forwardToHub error:', error);
    // Soft-fail so the client submission is never blocked.
    return Response.json({ success: false, error: error.message });
  }
});