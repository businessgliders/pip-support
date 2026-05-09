import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, X } from "lucide-react";
import AiAssistBar from "./AiAssistBar";
import TemplatePicker from "./TemplatePicker";

// Convert simple HTML to plain text for editor (so user can edit easily)
function htmlToPlain(html) {
  if (!html) return "";
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?p[^>]*>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function plainToHtml(text) {
  if (!text) return "";
  return text
    .split(/\n{2,}/)
    .map(p => `<p>${p.trim().replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export default function EmailComposer({ ticket, currentUser, onSent, onCancel }) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const staffFirstName = currentUser?.full_name?.split(" ")[0] || "";
  const templateVars = {
    client_name: ticket.client_name,
    client_first_name: ticket.client_name?.split(" ")[0] || "",
    client_email: ticket.client_email,
    client_phone: ticket.client_phone || "",
    inquiry_type: ticket.inquiry_type,
    ticket_id: ticket.id.slice(-8),
    staff_name: currentUser?.full_name || "",
    staff_first_name: staffFirstName,
    staff_email: currentUser?.email || "",
  };

  const applyAiHtml = (html) => {
    setDraft(htmlToPlain(html));
  };

  const applyTemplate = ({ body_html }) => {
    setDraft(htmlToPlain(body_html));
  };

  const handleSend = async () => {
    if (!draft.trim()) return;
    setSending(true);
    setError(null);
    try {
      const html = plainToHtml(draft) +
        `<p style="color:#999;font-size:13px;margin-top:24px;border-top:1px solid #eee;padding-top:12px;">— ${currentUser?.full_name || 'Pilates in Pink'}<br/>Pilates in Pink Studio</p>`;
      const res = await base44.functions.invoke("sendTicketEmail", {
        ticket_id: ticket.id,
        body_html: html,
      });
      if (res.data?.error) throw new Error(res.data.error);
      setDraft("");
      onSent?.();
    } catch (e) {
      setError(e.message || "Failed to send email");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white border border-gray-300 rounded-xl shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-700">
          <span className="text-gray-500">To:</span> <span className="font-medium">{ticket.client_email}</span>
        </div>
        {onCancel && (
          <Button type="button" variant="ghost" size="icon" onClick={onCancel} className="h-7 w-7">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <TemplatePicker onSelect={applyTemplate} vars={templateVars} />
      </div>

      <AiAssistBar ticketId={ticket.id} draft={draft} onApply={applyAiHtml} />

      <Textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={`Hi ${ticket.client_name?.split(" ")[0] || "there"},\n\nWrite your reply here…`}
        className="min-h-48 font-sans text-sm"
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button
          type="button"
          onClick={handleSend}
          disabled={!draft.trim() || sending}
          className="bg-[#b67651] hover:bg-[#a56541] text-white"
        >
          {sending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Send className="w-4 h-4 mr-1.5" />}
          Send Reply
        </Button>
      </div>
    </div>
  );
}