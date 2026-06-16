import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Forwards a newly-created SupportTicket to the central PiP Inbox hub.
// Server-side ONLY — the SPOKE_INTAKE_SECRET never reaches the browser.
//
// Records the forward outcome back onto the ticket (hub_forward_status,
// hub_forwarded_at, hub_forward_error, hub_forward_attempts) so the TicketBoard
// list view can show a reliable success/fail log and offer a retry button.
const HUB_ENDPOINT =
  'https://pink-app-hub.base44.app/api/apps/69841af9c747b033a60780f2/functions/spokeIntake';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  let ticketId = null;

  // Helper: best-effort status write. Never throws.
  const recordStatus = async (id, patch) => {
    try {
      await base44.asServiceRole.entities.SupportTicket.update(id, patch);
    } catch (e) {
      console.error('forwardToHub: failed to record status', e?.message);
    }
  };

  try {
    const body = await req.json();
    ticketId = body?.ticket_id;
    if (!ticketId) {
      return Response.json({ error: 'ticket_id required' }, { status: 400 });
    }

    const ticket = await base44.asServiceRole.entities.SupportTicket.get(ticketId);
    if (!ticket) {
      return Response.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const attempts = (ticket.hub_forward_attempts || 0) + 1;

    if (!ticket.client_email) {
      console.warn('forwardToHub: ticket has no client_email, skipping', ticketId);
      await recordStatus(ticketId, {
        hub_forward_status: 'failed',
        hub_forward_error: 'Ticket has no client email',
        hub_forward_attempts: attempts,
      });
      return Response.json({ success: false, skipped: 'no_email' });
    }

    const secret = Deno.env.get('SPOKE_INTAKE_SECRET');
    if (!secret) {
      console.error('forwardToHub: SPOKE_INTAKE_SECRET not set');
      await recordStatus(ticketId, {
        hub_forward_status: 'failed',
        hub_forward_error: 'Server secret missing',
        hub_forward_attempts: attempts,
      });
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
      await recordStatus(ticketId, {
        hub_forward_status: 'failed',
        hub_forward_error: `Hub returned ${res.status}`,
        hub_forward_attempts: attempts,
      });
      return Response.json({ success: false, hub_status: res.status });
    }

    let hubResult = null;
    try { hubResult = await res.json(); } catch (_e) { /* hub may return empty */ }

    await recordStatus(ticketId, {
      hub_forward_status: 'success',
      hub_forwarded_at: new Date().toISOString(),
      hub_forward_error: '',
      hub_forward_attempts: attempts,
    });

    return Response.json({ success: true, hub: hubResult });
  } catch (error) {
    console.error('forwardToHub error:', error);
    if (ticketId) {
      await recordStatus(ticketId, {
        hub_forward_status: 'failed',
        hub_forward_error: error.message,
      });
    }
    // Soft-fail so the client submission is never blocked.
    return Response.json({ success: false, error: error.message });
  }
});