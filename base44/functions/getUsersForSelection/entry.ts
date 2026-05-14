import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Use service role to fetch users (no auth required — this powers the
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