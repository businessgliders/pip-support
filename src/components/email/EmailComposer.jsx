import React, { useRef, useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Send, Loader2, X, Wand2, Sparkles, Lightbulb, Trash2, Bold, Italic, List, Link as LinkIcon, Paperclip, FileText, Save, Check } from "lucide-react";
import AiAssistBar from "./AiAssistBar";
import TemplatePicker from "./TemplatePicker";

const DRAFT_AUTOSAVE_INTERVAL_MS = 30 * 1000; // every 30 seconds

// Lightweight contentEditable rich-text composer.
// Preserves HTML formatting (bold, italics, lists, links) end-to-end —
// AI suggestions / templates flow into the editor as HTML and are sent as HTML.
export default function EmailComposer({ ticket, currentUser, onSent, onCancel }) {
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const [draftHtml, setDraftHtml] = useState("");
  const [sending, setSending] = useState(false);
  const [polishing, setPolishing] = useState(false);
  const [error, setError] = useState(null);
  const [showDescribe, setShowDescribe] = useState(false);
  const [showSuggest, setShowSuggest] = useState(false);
  const [attachments, setAttachments] = useState([]); // [{ name, url, size, type }]
  const [uploading, setUploading] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  const draftKey = `ticketDraft:${ticket.id}:${currentUser?.email || "anon"}`;
  const lastSavedRef = useRef(""); // serialized snapshot of last saved state
  const hasRestoredRef = useRef(false);

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

  const hasContent = !isEmpty(draftHtml) || attachments.length > 0;

  const serializeDraft = useCallback((html, atts) => {
    return JSON.stringify({ html, attachments: atts });
  }, []);

  const saveDraft = useCallback(() => {
    if (!hasContent) return;
    const snapshot = serializeDraft(draftHtml, attachments);
    try {
      localStorage.setItem(draftKey, JSON.stringify({
        html: draftHtml,
        attachments,
        savedAt: Date.now(),
      }));
      lastSavedRef.current = snapshot;
      setDraftSavedAt(Date.now());
      setIsDirty(false);
    } catch (e) {
      console.warn("Failed to save draft", e);
    }
  }, [draftHtml, attachments, draftKey, hasContent, serializeDraft]);

  const clearDraft = useCallback(() => {
    try { localStorage.removeItem(draftKey); } catch {}
    lastSavedRef.current = "";
    setDraftSavedAt(null);
    setIsDirty(false);
  }, [draftKey]);

  // Restore draft on mount
  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved?.html && !isEmpty(saved.html)) {
        setDraftHtml(saved.html);
        if (editorRef.current) editorRef.current.innerHTML = saved.html;
      }
      if (Array.isArray(saved?.attachments) && saved.attachments.length) {
        setAttachments(saved.attachments);
      }
      if (saved?.savedAt) setDraftSavedAt(saved.savedAt);
      lastSavedRef.current = serializeDraft(saved?.html || "", saved?.attachments || []);
    } catch (e) {
      console.warn("Failed to restore draft", e);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  // Track dirty state vs last saved snapshot
  useEffect(() => {
    const current = serializeDraft(draftHtml, attachments);
    setIsDirty(current !== lastSavedRef.current && hasContent);
  }, [draftHtml, attachments, hasContent, serializeDraft]);

  // Autosave every interval if dirty
  useEffect(() => {
    const id = setInterval(() => {
      if (isDirty && hasContent) saveDraft();
    }, DRAFT_AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isDirty, hasContent, saveDraft]);

  // Warn before unloading the tab/window when there are unsaved changes
  useEffect(() => {
    const handler = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const handleCancel = () => {
    if (isDirty) {
      const choice = window.confirm("You have unsaved changes. Save this draft before closing?\n\nOK = Save draft\nCancel = Discard");
      if (choice) saveDraft();
      else clearDraft();
    }
    onCancel?.();
  };

  const formatSavedTime = (ts) => {
    if (!ts) return "";
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 5) return "just now";
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  const handleAttachClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of files) {
        const res = await base44.integrations.Core.UploadFile({ file });
        if (res?.file_url) {
          setAttachments(prev => [...prev, { name: file.name, url: res.file_url, size: file.size, type: file.type }]);
        }
      }
    } catch (err) {
      setError(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (idx) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  const formatBytes = (b) => {
    if (!b && b !== 0) return "";
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSend = async () => {
    if (isEmpty(draftHtml)) return;
    setSending(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("sendTicketEmail", {
        ticket_id: ticket.id,
        body_html: draftHtml,
        attachment_urls: attachments.map(a => a.url),
        attachments: attachments.map(a => ({ name: a.name, url: a.url, size: a.size, type: a.type })),
      });
      if (res.data?.error) throw new Error(res.data.error);
      setEditorHtml("");
      setAttachments([]);
      clearDraft();
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
        <div className="flex items-center gap-2">
          {draftSavedAt && !isDirty && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <Check className="w-3 h-3" /> Draft saved {formatSavedTime(draftSavedAt)}
            </span>
          )}
          {isDirty && (
            <span className="flex items-center gap-1 text-xs text-amber-600">
              Unsaved changes
            </span>
          )}
          {onCancel && (
            <Button type="button" variant="ghost" size="icon" onClick={handleCancel} className="h-7 w-7">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
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

      {/* Attachments list */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((a, i) => {
            const isImage = a.type?.startsWith('image/');
            return (
              <div key={i} className="relative group">
                {isImage ? (
                  <div className="relative w-20 h-20 rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
                    <img src={a.url} alt={a.name} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeAttachment(i)}
                      className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1 py-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                      {a.name}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 text-xs">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-slate-800 max-w-[180px] truncate" title={a.name}>{a.name}</span>
                    {a.size ? <span className="text-slate-500">({formatBytes(a.size)})</span> : null}
                    <button
                      type="button"
                      onClick={() => removeAttachment(i)}
                      className="text-slate-500 hover:text-red-600"
                      title="Remove"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleAttachClick}
          disabled={uploading || sending}
          title="Attach files"
          className="border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
        </Button>
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
          size="sm"
          onClick={saveDraft}
          disabled={!isDirty || !hasContent}
          title="Save draft"
          className="border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          <Save className="w-4 h-4 mr-1.5" />
          Save Draft
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => { setEditorHtml(""); setAttachments([]); clearDraft(); }}
          disabled={!hasContent}
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