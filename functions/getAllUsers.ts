export default async function getAllUsers(data, { base44 }) {
  try {
    const users = await base44.asServiceRole.entities.User.list("-created_date", 100);
    console.log('getAllUsers response:', { count: users.length, users });
    return {
      users: users
    };
  } catch (error) {
    console.error('getAllUsers error:', error);
    return {
      users: [],
      error: error.message
    };
  }
}