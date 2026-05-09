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

  // If no real emails exist yet, show a synthetic "initial inquiry" entry built from the ticket
  const messages = fetchedMessages.length > 0 ? fetchedMessages : [{
    id: `initial-${ticket.id}`,
    direction: "inbound",
    from_name: ticket.client_name,
    from_email: ticket.client_email,
    to_email: "info@pilatesinpinkstudio.com",
    subject: `${ticket.inquiry_type} — ${ticket.client_name}`,
    body_html: `<p>${(ticket.notes || "Initial inquiry submitted via the support form.").replace(/\n/g, "<br/>")}</p>`,
    snippet: ticket.notes ? ticket.notes.slice(0, 140) : "Initial inquiry submitted via the support form.",
    sent_at: ticket.created_date,
    is_welcome: false,
  }];

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
        <div className="space-y-2 mb-3 max-h-[420px] overflow-y-auto pr-1">
          {messages.map((m, idx) => (
            <EmailMessageItem
              key={m.id}
              message={m}
              defaultExpanded={idx === messages.length - 1}
            />
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