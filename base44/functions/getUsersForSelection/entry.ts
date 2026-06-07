import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Pre-login endpoint that powers the user-selection screen.
//
// Security model:
// - No user auth (the screen runs before login).
// - No client-side secret (would be readable by anyone inspecting the bundle).
// - Instead: strict Origin allow-list. The Origin header is set by the browser
//   on cross-origin and same-origin fetch() requests and CANNOT be spoofed by
//   page JavaScript (it is one of the "forbidden headers"). Non-browser clients
//   (curl, scripts) can set any Origin they want, so the allow-list is a
//   reasonable bar — combined with field projection (only id/email/full_name)
//   and a domain filter, this exposes no more than the selection screen itself.
// - Response is also restricted to internal staff domain.

Deno.serve(async (req) => {
  try {
    const allowedOriginsRaw = Deno.env.get('ALLOWED_ORIGINS') || '';
    const staffDomain = Deno.env.get('ALLOWED_STAFF_DOMAIN') || '';
    if (!allowedOriginsRaw || !staffDomain) {
      return Response.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    const allowedOrigins = allowedOriginsRaw
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);

    const origin = (req.headers.get('origin') || '').toLowerCase();
    if (!origin || !allowedOrigins.includes(origin)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const base44 = createClientFromRequest(req);
    const users = await base44.asServiceRole.entities.User.list();

    const suffix = `@${staffDomain}`;
    const filteredUsers = users
      .filter(user => user.email?.toLowerCase().endsWith(suffix))
      .map(user => ({
        id: user.id,
        email: user.email,
        full_name: user.full_name,
      }));

    return Response.json({ users: filteredUsers });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});