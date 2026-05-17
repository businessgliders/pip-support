import React, { useRef, useState } from "react";
import { Plus, Send, X, Loader2, Image as ImageIcon } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

export default function BugReportReplyComposer({ report, currentUser, onSent }) {
  const [body, setBody] = useState("");
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  const handlePickFiles = () => fileInputRef.current?.click();

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const uploaded = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploaded.push(file_url);
      }
      setImages(prev => [...prev, ...uploaded]);
    } catch (err) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = (idx) => setImages(prev => prev.filter((_, i) => i !== idx));

  const handleSend = async () => {
    if (!body.trim() && images.length === 0) return;
    setSending(true);
    try {
      const res = await base44.functions.invoke("sendBugReportReply", {
        bug_report_id: report.id,
        body_text: body.trim(),
        image_urls: images,
      });
      if (res?.data?.error) throw new Error(res.data.error);
      setBody("");
      setImages([]);
      toast({ title: "Reply sent" });
      onSent?.();
    } catch (err) {
      toast({ title: "Send failed", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border-t border-slate-200 bg-slate-50 p-3 flex-shrink-0">
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {images.map((url, i) => (
            <div key={i} className="relative">
              <img src={url} alt="attachment" className="w-14 h-14 object-cover rounded-lg border border-slate-200" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute -top-1.5 -right-1.5 bg-slate-800 text-white rounded-full p-0.5 hover:bg-slate-900"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={handlePickFiles}
          disabled={uploading || sending}
          className="flex-shrink-0 w-9 h-9 rounded-full bg-white border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          title="Attach image"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFiles}
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Reply to this thread..."
          rows={1}
          className="flex-1 resize-none rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:border-slate-500 max-h-32"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || uploading || (!body.trim() && images.length === 0)}
          className="flex-shrink-0 w-9 h-9 rounded-full bg-[#b67651] hover:bg-[#a05a3a] text-white flex items-center justify-center disabled:opacity-50"
          title="Send reply"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}