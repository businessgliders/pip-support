import React from "react";
import { FileText, Download } from "lucide-react";

const formatBytes = (b) => {
  if (!b && b !== 0) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
};

// Renders attachment chips. Two layouts:
//   - "bubble"   : compact previews/badges for use inside SMS-style bubbles
//   - "modal"    : larger 96x96 thumbnails for use in the full-email modal
// Image clicks open the lightbox (via onOpenLightbox callback); file clicks
// open the URL in a new tab.
export default function AttachmentChips({ attachments, onOpenLightbox, layout = "bubble" }) {
  if (!attachments || attachments.length === 0) return null;

  const thumbSize = layout === "modal" ? "w-24 h-24" : "w-16 h-16";
  const isImage = (a) => a?.type?.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(a?.name || "");

  return (
    <div className={`flex flex-wrap gap-2 ${layout === "modal" ? "mt-1" : ""}`}>
      {attachments.map((a, i) => {
        if (isImage(a)) {
          return (
            <button
              key={i}
              type="button"
              onClick={(e) => { e.stopPropagation(); onOpenLightbox?.(a); }}
              className={`${thumbSize} rounded-lg border border-slate-200 overflow-hidden bg-slate-50 hover:opacity-90 transition-opacity cursor-zoom-in block`}
              title={a.name}
            >
              <img src={a.url} alt={a.name} className="w-full h-full object-cover" />
            </button>
          );
        }
        return (
          <a
            key={i}
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 transition-colors"
            title={a.name}
          >
            <FileText className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <span className="max-w-[160px] truncate">{a.name}</span>
            {a.size ? <span className="text-slate-500">({formatBytes(a.size)})</span> : null}
            <Download className="w-3 h-3 text-slate-400" />
          </a>
        );
      })}
    </div>
  );
}