import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Returns whether the authenticated caller is a super-admin.
// The super-admin allow-list is stored server-side in SUPER_ADMIN_EMAILS
// (comma-separated) so it can be updated without redeploying the frontend.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ is_super_admin: false }, { status: 200 });

    const raw = Deno.env.get('SUPER_ADMIN_EMAILS') || '';
    const allowed = raw
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);

    const email = (user.email || '').toLowerCase();
    const isSuperAdmin = user.role === 'admin' && allowed.includes(email);

    return Response.json({ is_super_admin: isSuperAdmin });
  } catch (error) {
    return Response.json({ is_super_admin: false, error: error.message }, { status: 500 });
  }
});