import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const ticketUrl = `https://support.pilatesinpinkstudio.com/TicketBoard?ticket=TEST-123`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: "Pilates in Pink Support",
      to: "info@pilatesinpinkstudio.com",
      subject: `[TEST] New Ticket Assigned: Jane Doe`,
      body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #f1899b 0%, #f7b1bd 50%, #fbe0e2 100%); padding: 40px 20px;">
          <div style="background: white; border-radius: 20px; padding: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_690aada19e27fe8fcf067828/45da48106_Pilatesinpinklogojusticon1.png" alt="Pilates in Pink" style="width: 80px; height: 80px;">
              <h1 style="color: #f1899b; margin: 15px 0 10px 0; font-size: 28px;">New Ticket Assigned</h1>
              <p style="color: #666; margin: 0;">You have been assigned a support ticket</p>
            </div>
            
            <div style="background: linear-gradient(135deg, #f1899b20, #fbe0e220); border-left: 4px solid #f1899b; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
              <h2 style="color: #333; margin: 0 0 15px 0; font-size: 20px;">Jane Doe</h2>
              <p style="margin: 8px 0; color: #555;"><strong>Email:</strong> jane.doe@example.com</p>
              <p style="margin: 8px 0; color: #555;"><strong>Phone:</strong> (555) 123-4567</p>
              <p style="margin: 8px 0; color: #555;"><strong>Inquiry Type:</strong> Membership Inquiry</p>
              <p style="margin: 8px 0; color: #555;"><strong>Status:</strong> <span style="background: #e3f2fd; padding: 4px 12px; border-radius: 12px; color: #1976d2;">New</span></p>
              <p style="margin: 8px 0; color: #555;"><strong>Priority:</strong> <span style="background: #fff3e0; padding: 4px 12px; border-radius: 12px; color: #e65100;">Medium</span></p>
            </div>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
              <p style="color: #666; margin: 0 0 8px 0; font-weight: 600;">Additional Notes:</p>
              <p style="color: #555; margin: 0;">This is a test email to verify the new ticket notification is working correctly.</p>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="${ticketUrl}" style="display: inline-block; background: #f1899b; color: white; padding: 14px 32px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px;">View Ticket Details</a>
            </div>
            
            <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center;">
              <p style="color: #999; margin: 5px 0; font-size: 13px;">Auto-assigned from new ticket submission</p>
              <p style="color: #999; margin: 5px 0; font-size: 13px;">Pilates in Pink Support System</p>
            </div>
          </div>
        </div>
      `
    });

    return Response.json({ success: true, message: "Test email sent to info@pilatesinpinkstudio.com" });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});