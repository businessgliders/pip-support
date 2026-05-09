import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, X, Wand2, Sparkles, Lightbulb, Trash2 } from "lucide-react";
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
  const [polishing, setPolishing] = useState(false);
  const [error, setError] = useState(null);
  const [showDescribe, setShowDescribe] = useState(false);
  const [showSuggest, setShowSuggest] = useState(false);

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

  const handlePolish = async () => {
    if (!draft.trim()) return;
    setPolishing(true);
    try {
      const res = await base44.functions.invoke("aiEmailAssist", {
        mode: "polish",
        ticket_id: ticket.id,
        draft,
      });
      if (res.data?.body_html) setDraft(htmlToPlain(res.data.body_html));
    } finally {
      setPolishing(false);
    }
  };

  const handleSend = async () => {
    if (!draft.trim()) return;
    setSending(true);
    setError(null);
    try {
      const html = plainToHtml(draft);
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

      {/* Action bar: Describe + Suggest + Templates */}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowDescribe(v => !v)}
          className={`bg-white border-purple-300 text-purple-700 hover:bg-purple-50 ${showDescribe ? "ring-2 ring-purple-400" : ""}`}
        >
          <Sparkles className="w-3.5 h-3.5 mr-1.5" />
          Describe in simple words
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowSuggest(v => !v)}
          className={`bg-white border-purple-300 text-purple-700 hover:bg-purple-50 ${showSuggest ? "ring-2 ring-purple-400" : ""}`}
        >
          <Lightbulb className="w-3.5 h-3.5 mr-1.5" />
          Suggest Replies
        </Button>
        <TemplatePicker onSelect={applyTemplate} vars={templateVars} />
      </div>

      <AiAssistBar
        ticketId={ticket.id}
        onApply={applyAiHtml}
        showDescribe={showDescribe}
        showSuggest={showSuggest}
      />

      <Textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={`Hi ${ticket.client_name?.split(" ")[0] || "there"},\n\nWrite your reply here…`}
        className="min-h-24 font-sans text-sm"
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={handlePolish}
          disabled={!draft.trim() || polishing}
          className="border-purple-300 text-purple-700 hover:bg-purple-50"
        >
          {polishing ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Wand2 className="w-4 h-4 mr-1.5" />}
          Polish
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setDraft("")}
          disabled={!draft.trim()}
          title="Clear"
          className="border-gray-300 text-gray-600 hover:bg-gray-50"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
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