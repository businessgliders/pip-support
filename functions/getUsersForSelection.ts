import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Use service role to fetch users (no auth required)
    const users = await base44.asServiceRole.entities.User.list();
    
    // Filter to only @pilatesinpinkstudio.com domain
    const filteredUsers = users.filter(user => 
      user.email.endsWith('@pilatesinpinkstudio.com')
    );
    
    return Response.json({ users: filteredUsers });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});