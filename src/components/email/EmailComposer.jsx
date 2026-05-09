import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Send, Loader2, X, Wand2, Sparkles, Lightbulb, Trash2, Bold, Italic, List, Link as LinkIcon } from "lucide-react";
import AiAssistBar from "./AiAssistBar";
import TemplatePicker from "./TemplatePicker";

// Lightweight contentEditable rich-text composer.
// Preserves HTML formatting (bold, italics, lists, links) end-to-end —
// AI suggestions / templates flow into the editor as HTML and are sent as HTML.
export default function EmailComposer({ ticket, currentUser, onSent, onCancel }) {
  const editorRef = useRef(null);
  const [draftHtml, setDraftHtml] = useState("");
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

  const setEditorHtml = (html) => {
    setDraftHtml(html);
    if (editorRef.current) editorRef.current.innerHTML = html;
  };

  const handleEditorInput = () => {
    if (editorRef.current) setDraftHtml(editorRef.current.innerHTML);
  };

  const exec = (cmd, value = null) => {
    document.execCommand(cmd, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
      setDraftHtml(editorRef.current.innerHTML);
    }
  };

  const handleLink = () => {
    const url = window.prompt("Link URL:", "https://");
    if (url) exec("createLink", url);
  };

  const applyAiHtml = (html) => setEditorHtml(html);
  const applyTemplate = ({ body_html }) => setEditorHtml(body_html);

  const handlePolish = async () => {
    if (!draftHtml.trim() || draftHtml === "<br>") return;
    setPolishing(true);
    try {
      const res = await base44.functions.invoke("aiEmailAssist", {
        mode: "polish",
        ticket_id: ticket.id,
        draft: draftHtml,
      });
      if (res.data?.body_html) setEditorHtml(res.data.body_html);
    } finally {
      setPolishing(false);
    }
  };

  const isEmpty = (html) => {
    const stripped = html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
    return stripped.length === 0;
  };

  const handleSend = async () => {
    if (isEmpty(draftHtml)) return;
    setSending(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("sendTicketEmail", {
        ticket_id: ticket.id,
        body_html: draftHtml,
      });
      if (res.data?.error) throw new Error(res.data.error);
      setEditorHtml("");
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

      {/* Formatting toolbar */}
      <div className="flex items-center gap-1 border border-gray-200 rounded-t-md bg-gray-50 px-2 py-1">
        <button type="button" onClick={() => exec("bold")} title="Bold" className="p-1.5 rounded hover:bg-gray-200 text-gray-700">
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => exec("italic")} title="Italic" className="p-1.5 rounded hover:bg-gray-200 text-gray-700">
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => exec("insertUnorderedList")} title="Bulleted list" className="p-1.5 rounded hover:bg-gray-200 text-gray-700">
          <List className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={handleLink} title="Insert link" className="p-1.5 rounded hover:bg-gray-200 text-gray-700">
          <LinkIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Rich-text editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleEditorInput}
        suppressContentEditableWarning
        data-placeholder={`Hi ${ticket.client_name?.split(" ")[0] || "there"}, write your reply here…`}
        className="min-h-32 max-h-80 overflow-y-auto border border-gray-300 border-t-0 rounded-b-md p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 prose prose-sm max-w-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400"
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={handlePolish}
          disabled={isEmpty(draftHtml) || polishing}
          className="border-purple-300 text-purple-700 hover:bg-purple-50"
        >
          {polishing ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Wand2 className="w-4 h-4 mr-1.5" />}
          Polish
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setEditorHtml("")}
          disabled={isEmpty(draftHtml)}
          title="Clear"
          className="border-gray-300 text-gray-600 hover:bg-gray-50"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          onClick={handleSend}
          disabled={isEmpty(draftHtml) || sending}
          className="bg-[#b67651] hover:bg-[#a56541] text-white"
        >
          {sending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Send className="w-4 h-4 mr-1.5" />}
          Send Reply
        </Button>
      </div>
    </div>
  );
}