export default async function getAllUsers(data, { base44 }) {
  try {
    const users = await base44.asServiceRole.entities.User.list();
    return {
      success: true,
      users: users
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}