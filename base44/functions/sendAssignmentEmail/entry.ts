export default async function sendAssignmentEmail({ ticketId, assignedTo, assignedBy }, { base44 }) {
  // Get ticket details
  const ticket = await base44.asServiceRole.entities.SupportTicket.get(ticketId);
  
  if (!ticket) {
    throw new Error("Ticket not found");
  }

  // Send email to assigned user
  await base44.asServiceRole.integrations.Core.SendEmail({
    to: assignedTo,
    subject: `New Ticket Assigned: ${ticket.client_name} - ${ticket.inquiry_type}`,
    body: `
      <h2>You have been assigned a new support ticket</h2>
      
      <p><strong>Client:</strong> ${ticket.client_name}</p>
      <p><strong>Email:</strong> ${ticket.client_email}</p>
      <p><strong>Phone:</strong> ${ticket.client_phone || 'N/A'}</p>
      <p><strong>Inquiry Type:</strong> ${ticket.inquiry_type}</p>
      <p><strong>Priority:</strong> ${ticket.priority}</p>
      <p><strong>Status:</strong> ${ticket.status}</p>
      
      ${ticket.notes ? `<p><strong>Notes:</strong> ${ticket.notes}</p>` : ''}
      
      <p><strong>Assigned by:</strong> ${assignedBy}</p>
      
      <p>Please log in to the support portal to view and manage this ticket.</p>
    `
  });

  return { success: true };
}