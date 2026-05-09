import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Mail, Plus, Loader2 } from "lucide-react";
import EmailMessageItem from "./EmailMessageItem";
import EmailComposer from "./EmailComposer";

export default function EmailThreadPanel({ ticket, currentUser }) {
  const [composing, setComposing] = useState(false);

  const { data: messages = [], isLoading, refetch } = useQuery({
    queryKey: ["email-messages", ticket.id],
    queryFn: () => base44.entities.EmailMessage.filter({ ticket_id: ticket.id }, "sent_at", 100),
    refetchInterval: 15000,
  });

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
      ) : messages.length === 0 ? (
        <div className="text-center py-6 text-sm text-gray-500">
          <Mail className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          No emails yet
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