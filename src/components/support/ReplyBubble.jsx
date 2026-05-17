import React, { useState } from "react";
import { X, Maximize2 } from "lucide-react";

const formatDate = (s) => {
  if (!s) return "";
  let iso = s;
  if (typeof s === "string" && !s.endsWith("Z") && !s.includes("+")) iso = s + "Z";
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
};

function stripQuoted(text = "") {
  if (!text) return "";
  // Cut off Gmail-style quoted replies ("On ... wrote:") and lines starting with ">"
  const cutMarkers = [
    /\n\s*On .+ wrote:\s*\n/i,
    /\n\s*-{2,}\s*Original Message\s*-{2,}/i,
    /\n\s*From:\s.+\n\s*Sent:\s/i,
  ];
  let out = text;
  for (const re of cutMarkers) {
    const m = out.match(re);
    if (m) out = out.slice(0, m.index);
  }
  out = out
    .split("\n")
    .filter(line => !/^\s*>/.test(line))
    .join("\n")
    .trim();
  return out;
}

export default function ReplyBubble({ reply, isBugReport = false }) {
  const [showFull, setShowFull] = useState(false);
  const clean = stripQuoted(reply.body_text || "") || reply.snippet || "";
  const sender = reply.from_name || reply.from_email || "Unknown";
  const isOutbound = reply.direction === "outbound";

  return (
    <>
      <div className={`flex flex-col max-w-[85%] ${isOutbound ? "items-end ml-auto" : "items-start"}`}>
        <button
           type="button"
           onClick={() => setShowFull(true)}
           className={`transition rounded-lg px-4 py-3 text-sm text-slate-800 break-words shadow-md border ${
             isOutbound
               ? isBugReport ? "bg-green-50 hover:bg-green-100 border-green-200 rounded-tr-none" : "bg-slate-50 hover:bg-slate-100 border-slate-300 rounded-tr-none"
               : "bg-white hover:bg-slate-50 border-slate-300 rounded-tl-none"
           }`}
           title="Click to view full email"
         >
           {(reply.image_urls || []).length > 0 && (
             <div className="flex flex-wrap gap-2 mb-2">
               {reply.image_urls.map((u, i) => (
                 <img key={i} src={u} alt="" className="w-16 h-16 object-cover rounded border border-slate-200" />
               ))}
             </div>
           )}
           <div className="line-clamp-1 text-slate-700">
             {clean || "No preview"}
           </div>
           <div className="flex items-center justify-end gap-2 mt-2 text-[10px] text-slate-500">
             <span>{sender} • {formatDate(reply.received_at)}</span>
             <Maximize2 className="w-3 h-3" />
           </div>
         </button>
      </div>

      {showFull && (
        <div
          className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 pt-20 sm:pt-4 overflow-y-auto"
          onClick={() => setShowFull(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[calc(100vh-6rem)] sm:max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3 bg-gradient-to-r from-slate-700 to-slate-800 text-white flex items-center justify-between flex-shrink-0">
              <div className="min-w-0">
                <div className="font-semibold text-sm truncate">{sender}</div>
                <div className="text-[11px] text-white/70 truncate">
                  {reply.subject} • {formatDate(reply.received_at)}
                </div>
              </div>
              <button onClick={() => setShowFull(false)} className="p-1 hover:bg-white/20 rounded-lg flex-shrink-0 ml-2">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 text-sm">
              {reply.body_html ? (
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: reply.body_html }}
                />
              ) : (
                <pre className="whitespace-pre-wrap font-sans text-slate-800 text-sm">
                  {reply.body_text || reply.snippet}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}