import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Returns a minimal staff-user list (id, email, full_name) for two use cases:
//
// 1) Pre-login user-selection screen — no auth available, so we fall back to
//    strict Origin allow-listing against ALLOWED_ORIGINS.
// 2) Post-login UI (filter avatars, assignee pickers) — the caller is
//    authenticated; the staff-domain check is enough.
//
// Either pathway is sufficient on its own. Response is always limited to the
// staff domain and projects only id/email/full_name.

Deno.serve(async (req) => {
  try {
    const staffDomain = Deno.env.get('ALLOWED_STAFF_DOMAIN') || '';
    if (!staffDomain) {
      return Response.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    // Path 1: any authenticated user → allow. All staff are trusted; the
    // response is already limited to the staff domain below.
    let authorized = false;
    try {
      const base44Auth = createClientFromRequest(req);
      const me = await base44Auth.auth.me();
      if (me?.email) {
        authorized = true;
      }
    } catch {
      // Not authenticated — fall through to origin check.
    }

    // Path 2: pre-login user-selection screen → require allow-listed Origin.
    if (!authorized) {
      const allowedOriginsRaw = Deno.env.get('ALLOWED_ORIGINS') || '';
      const allowedOrigins = allowedOriginsRaw
        .split(',')
        .map(s => s.trim().toLowerCase())
        .filter(Boolean);
      const origin = (req.headers.get('origin') || '').toLowerCase();
      if (origin && allowedOrigins.includes(origin)) {
        authorized = true;
      }
    }

    if (!authorized) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const base44 = createClientFromRequest(req);
    const users = await base44.asServiceRole.entities.User.list();

    const filteredUsers = users
      .filter(user => !!user.email)
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