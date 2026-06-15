// HANDOVER: outbound email is now owned by the PiP Inbox hub.
// Daily reminder emails are disabled — this function no-ops and is no longer
// scheduled. Historical data is untouched.
Deno.serve(async (_req) => {
  return Response.json({ success: true, disabled: true, remindersSent: 0 });
});