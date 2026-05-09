import React, { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Mail, Loader2 } from "lucide-react";
import EmailMessageItem from "./EmailMessageItem";
import EmailComposer from "./EmailComposer";
import { buildWelcomeHtml } from "./welcomeEmailHtml";

export default function EmailThreadPanel({ ticket, currentUser, highlightMessageId }) {
  const { data: fetchedMessages = [], isLoading, refetch } = useQuery({
    queryKey: ["email-messages", ticket.id],
    queryFn: () => base44.entities.EmailMessage.filter({ ticket_id: ticket.id }, "sent_at", 100),
    refetchInterval: 15000,
  });

  // Mark all unread inbound emails on this ticket as read by the current user
  useEffect(() => {
    if (!currentUser?.email || fetchedMessages.length === 0) return;
    const unread = fetchedMessages.filter(
      m => m.direction === "inbound" && !(m.read_by || []).includes(currentUser.email)
    );
    if (unread.length === 0) return;
    Promise.all(
      unread.map(m =>
        base44.entities.EmailMessage.update(m.id, {
          read_by: [...(m.read_by || []), currentUser.email],
        }).catch(() => null)
      )
    );
  }, [fetchedMessages, currentUser?.email]);

  const shortId = ticket.ticket_number ? String(ticket.ticket_number) : (ticket.id ? ticket.id.slice(-8) : "");

  // Always show the original intake notes as the first inbound message.
  // Always show a synthetic welcome preview (placed right after notes / at the top
  // if there are no notes) — but if a real welcome EmailMessage exists in the DB,
  // we let the real one render and skip the synthetic.
  const hasRealWelcome = fetchedMessages.some(m => m.is_welcome);

  const synthetic = [];

  // Build the initial inbound bubble. For cancellations, surface the
  // cancellation details (reason, satisfaction, feedback) using the same
  // headings as the right-side "⚠️ Cancellation Request" panel — so staff
  // see them right inside the email thread, just like notes for other types.
  const escapeHtml = (s = "") => s.replace(/</g, "&lt;").replace(/>/g, "&gt;");

  if (ticket.inquiry_type === "Cancellation") {
    const parts = [];
    if (ticket.cancellation_reason) {
      parts.push(`<p style="margin:0 0 6px 0;font-weight:600;color:#374151;">Reason for Cancellation:</p><p style="margin:0 0 12px 0;">${escapeHtml(ticket.cancellation_reason)}</p>`);
    }
    if (ticket.cancellation_satisfaction) {
      parts.push(`<p style="margin:0 0 6px 0;font-weight:600;color:#374151;">Satisfaction Level:</p><p style="margin:0 0 12px 0;">${escapeHtml(ticket.cancellation_satisfaction)}</p>`);
    }
    if (ticket.cancellation_feedback) {
      parts.push(`<p style="margin:0 0 6px 0;font-weight:600;color:#374151;">Additional Feedback:</p><p style="margin:0 0 12px 0;white-space:pre-wrap;">${escapeHtml(ticket.cancellation_feedback)}</p>`);
    }
    if (ticket.notes && ticket.notes.trim()) {
      parts.push(`<p style="margin:0 0 6px 0;font-weight:600;color:#374151;">Additional Notes:</p><p style="margin:0;white-space:pre-wrap;">${escapeHtml(ticket.notes)}</p>`);
    }
    if (parts.length > 0) {
      const snippet = [
        ticket.cancellation_reason,
        ticket.cancellation_satisfaction,
        ticket.cancellation_feedback,
      ].filter(Boolean).join(" • ");
      synthetic.push({
        id: `intake-${ticket.id}`,
        direction: "inbound",
        from_name: ticket.client_name,
        from_email: ticket.client_email,
        to_email: "info@pilatesinpinkstudio.com",
        subject: `Cancellation Request - Initial Submission`,
        body_html: parts.join(""),
        body_text: snippet,
        snippet,
        sent_at: ticket.created_date,
      });
    }
  } else if (ticket.notes && ticket.notes.trim()) {
    synthetic.push({
      id: `intake-${ticket.id}`,
      direction: "inbound",
      from_name: ticket.client_name,
      from_email: ticket.client_email,
      to_email: "info@pilatesinpinkstudio.com",
      subject: `${ticket.inquiry_type} - Initial Submission`,
      body_html: `<p style="white-space:pre-wrap;">${escapeHtml(ticket.notes)}</p>`,
      body_text: ticket.notes,
      snippet: ticket.notes,
      sent_at: ticket.created_date,
    });
  }
  if (!hasRealWelcome) {
    synthetic.push({
      id: `welcome-${ticket.id}`,
      direction: "outbound",
      from_name: "Pilates in Pink\u2122",
      from_email: "info@pilatesinpinkstudio.com",
      to_email: ticket.client_email,
      subject: `[Ticket #${shortId}] ${ticket.inquiry_type} - Pilates in Pink`,
      body_html: buildWelcomeHtml({
        clientName: ticket.client_name,
        inquiryType: ticket.inquiry_type,
        ticketShortId: shortId,
      }),
      snippet: `We've received your ${ticket.inquiry_type} request and one of our team members will be in touch with you very soon.`,
      sent_at: ticket.created_date,
      is_welcome: true,
    });
  }

  // Hide internal owner-notification emails (assignment alerts sent to staff).
  // Client communications go to the client's email; assignment notifications
  // go to @pilatesinpinkstudio.com addresses — those should not appear here.
  const visibleFetched = fetchedMessages.filter(m => {
    if (m.direction !== "outbound") return true;
    const to = (m.to_email || "").toLowerCase();
    return !to.endsWith("@pilatesinpinkstudio.com");
  });

  const messages = [...synthetic, ...visibleFetched];

  // Scroll to highlighted message after render
  useEffect(() => {
    if (!highlightMessageId) return;
    const el = document.getElementById(`email-msg-${highlightMessageId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightMessageId, messages.length]);

  // After a reply is sent, auto-scroll the thread container to the newest message
  const threadRef = useRef(null);
  const [pendingScroll, setPendingScroll] = useState(false);
  useEffect(() => {
    if (!pendingScroll || isLoading) return;
    const container = threadRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    }
    setPendingScroll(false);
  }, [pendingScroll, isLoading, fetchedMessages.length]);

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
        <span className="text-xs text-[#b67651]">{ticket.client_email}</span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-6 text-gray-500 text-sm">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading thread…
        </div>
      ) : (
        <div ref={threadRef} className="bg-gradient-to-b from-white/60 to-amber-50/40 rounded-xl p-3 mb-3 max-h-[480px] overflow-y-auto border border-amber-100">
          {messages.map((m) => (
            <div key={m.id} id={`email-msg-${m.id}`}>
              <EmailMessageItem
                message={m}
                isHighlighted={m.id === highlightMessageId}
              />
            </div>
          ))}
        </div>
      )}

      <EmailComposer
        ticket={ticket}
        currentUser={currentUser}
        onSent={async () => { await refetch(); setPendingScroll(true); }}
      />
    </div>
  );
}