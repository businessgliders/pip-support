import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Mail, Plus, Loader2 } from "lucide-react";
import EmailMessageItem from "./EmailMessageItem";
import EmailComposer from "./EmailComposer";

export default function EmailThreadPanel({ ticket, currentUser }) {
  const [composing, setComposing] = useState(false);

  const { data: fetchedMessages = [], isLoading, refetch } = useQuery({
    queryKey: ["email-messages", ticket.id],
    queryFn: () => base44.entities.EmailMessage.filter({ ticket_id: ticket.id }, "sent_at", 100),
    refetchInterval: 15000,
  });

  // If no real emails exist yet, synthesize the auto-response welcome email so users
  // can preview the reply that was sent to the submitter.
  const shortId = ticket.ticket_number ? String(ticket.ticket_number) : (ticket.id ? ticket.id.slice(-8) : "");
  const welcomeHtml = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#fbe0e2;">
  <div style="max-width:600px;margin:0 auto;background:linear-gradient(135deg,#f1899b 0%,#f7b1bd 50%,#fbe0e2 100%);padding:40px 20px;">
    <div style="background:white;border-radius:20px;padding:30px;box-shadow:0 10px 30px rgba(0,0,0,0.1);">
      <div style="text-align:center;margin-bottom:30px;">
        <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_690aada19e27fe8fcf067828/45da48106_Pilatesinpinklogojusticon1.png" alt="Pilates in Pink" style="width:80px;height:80px;">
        <h1 style="color:#f1899b;margin:15px 0 10px 0;font-size:28px;">We've Got Your Message 💕</h1>
        <p style="color:#666;margin:0;font-size:16px;">Thanks for reaching out, ${ticket.client_name}!</p>
      </div>
      <div style="background:linear-gradient(135deg,#f1899b15,#fbe0e220);border-left:4px solid #f1899b;padding:20px;border-radius:10px;margin-bottom:25px;">
        <p style="color:#333;margin:0 0 10px 0;line-height:1.6;">
          We've received your <strong>${ticket.inquiry_type}</strong> request and one of our team members will be in touch with you very soon.
        </p>
        <p style="color:#333;margin:0;line-height:1.6;">
          We typically respond within <strong>24 hours</strong> during business days.
        </p>
      </div>
      <div style="background:#f8f9fa;padding:15px;border-radius:10px;margin-bottom:25px;text-align:center;">
        <p style="color:#666;margin:0 0 5px 0;font-size:13px;">Your Reference</p>
        <p style="color:#b67651;margin:0;font-size:18px;font-weight:bold;letter-spacing:1px;">#${shortId}</p>
      </div>
      <p style="color:#555;line-height:1.6;margin:0 0 10px 0;">
        💡 <strong>Tip:</strong> Just reply to this email anytime to add more info — your reply will go straight to our support team and stay in this conversation.
      </p>
      <div style="margin-top:30px;padding-top:20px;border-top:1px solid #e0e0e0;text-align:center;">
        <p style="color:#999;margin:5px 0;font-size:13px;">With love,</p>
        <p style="color:#f1899b;margin:5px 0;font-size:15px;font-weight:bold;">The Pilates in Pink Team 🌸</p>
      </div>
    </div>
  </div>
</body></html>`;

  // Synthetic initial messages: client's submitted notes (if any) + auto-reply welcome
  const syntheticMessages = [];

  if (ticket.notes && ticket.notes.trim()) {
    syntheticMessages.push({
      id: `intake-${ticket.id}`,
      direction: "inbound",
      from_name: ticket.client_name,
      from_email: ticket.client_email,
      to_email: "info@pilatesinpinkstudio.com",
      subject: `${ticket.inquiry_type} - Initial Submission`,
      body_html: `<p style="white-space:pre-wrap;">${ticket.notes.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`,
      body_text: ticket.notes,
      snippet: ticket.notes,
      sent_at: ticket.created_date,
    });
  }

  if (fetchedMessages.length === 0) {
    syntheticMessages.push({
      id: `welcome-${ticket.id}`,
      direction: "outbound",
      from_name: "Pilates in Pink",
      from_email: "info@pilatesinpinkstudio.com",
      to_email: ticket.client_email,
      subject: `[Ticket #${shortId}] ${ticket.inquiry_type} - Pilates in Pink`,
      body_html: welcomeHtml,
      snippet: `We've received your ${ticket.inquiry_type} request and one of our team members will be in touch with you very soon.`,
      sent_at: ticket.created_date,
      is_welcome: true,
    });
  }

  const messages = [...syntheticMessages, ...fetchedMessages];

  return (
    <div className="bg-gradient-to-br from-amber-50 to-pink-50 rounded-xl p-4 border border-amber-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Mail className="w-4 h-4" />
          Email Communications
          {messages.length > 0 && (
            <span className="text-xs bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
              {messages.length}
            </span>
          )}
        </h3>
        {!composing && (
          <Button
            size="sm"
            onClick={() => setComposing(true)}
            className="bg-[#b67651] hover:bg-[#a56541] text-white h-8"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            New Reply
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-6 text-gray-500 text-sm">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading thread…
        </div>
      ) : (
        <div className="bg-gradient-to-b from-white/60 to-amber-50/40 rounded-xl p-3 mb-3 max-h-[480px] overflow-y-auto border border-amber-100">
          {messages.map((m) => (
            <EmailMessageItem key={m.id} message={m} />
          ))}
        </div>
      )}

      {composing && (
        <div className="mt-3">
          <EmailComposer
            ticket={ticket}
            currentUser={currentUser}
            onSent={() => { setComposing(false); refetch(); }}
            onCancel={() => setComposing(false)}
          />
        </div>
      )}
    </div>
  );
}