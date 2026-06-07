import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Defense-in-depth: this endpoint can't require user auth (it powers the
    // pre-login user selection screen). Instead, require a shared-secret token
    // in the request body. The token is stored as a Base44 secret and provided
    // to the frontend via Vite env at build time. This is stronger than the
    // previous origin/referer check (which can be trivially spoofed via curl).
    const expectedToken = Deno.env.get('USER_SELECTION_TOKEN');
    if (!expectedToken) {
      return Response.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    let body = {};
    try {
      body = await req.json();
    } catch (_) {
      body = {};
    }

    const providedToken = body?.token || '';

    // Constant-time comparison to avoid timing attacks.
    const a = new TextEncoder().encode(providedToken);
    const b = new TextEncoder().encode(expectedToken);
    let mismatch = a.length !== b.length ? 1 : 0;
    const len = Math.max(a.length, b.length);
    for (let i = 0; i < len; i++) {
      mismatch |= (a[i] ?? 0) ^ (b[i] ?? 0);
    }
    if (mismatch !== 0) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Use service role to fetch users (no user auth required — this powers the
    // pre-login user selection screen).
    const users = await base44.asServiceRole.entities.User.list();

    // Filter to only @pilatesinpinkstudio.com domain, and return ONLY the minimal
    // fields needed to render selection tiles. Strips out roles, custom fields,
    // signatures, and any other sensitive data.
    const filteredUsers = users
      .filter(user => user.email?.endsWith('@pilatesinpinkstudio.com'))
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