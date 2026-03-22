export default async function sendDailyReminders({}, { base44 }) {
  // Get all tickets that are not resolved or closed
  const activeTickets = await base44.asServiceRole.entities.SupportTicket.filter({
    status: { $in: ["New", "In Progress"] }
  });

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  let remindersSent = 0;

  for (const ticket of activeTickets) {
    // Check if we should send a reminder (no reminder sent in last 24 hours)
    const lastReminder = ticket.last_reminder_sent ? new Date(ticket.last_reminder_sent) : null;
    
    if (!lastReminder || lastReminder < oneDayAgo) {
      // Send reminder email
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: ticket.assigned_to,
        subject: `Reminder: Pending Ticket - ${ticket.client_name}`,
        body: `
          <h2>Ticket Reminder</h2>
          
          <p>You have a pending support ticket that needs attention:</p>
          
          <p><strong>Client:</strong> ${ticket.client_name}</p>
          <p><strong>Email:</strong> ${ticket.client_email}</p>
          <p><strong>Phone:</strong> ${ticket.client_phone || 'N/A'}</p>
          <p><strong>Inquiry Type:</strong> ${ticket.inquiry_type}</p>
          <p><strong>Priority:</strong> ${ticket.priority}</p>
          <p><strong>Status:</strong> ${ticket.status}</p>
          <p><strong>Created:</strong> ${new Date(ticket.created_date).toLocaleString()}</p>
          
          ${ticket.notes ? `<p><strong>Notes:</strong> ${ticket.notes}</p>` : ''}
          
          <p>Please log in to the support portal to manage this ticket.</p>
        `
      });

      // Update last reminder sent timestamp
      await base44.asServiceRole.entities.SupportTicket.update(ticket.id, {
        last_reminder_sent: now.toISOString()
      });

      remindersSent++;
    }
  }

  return { 
    success: true, 
    remindersSent,
    ticketsChecked: activeTickets.length 
  };
}