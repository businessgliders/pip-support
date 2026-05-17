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
  // Cut at the first "On ... wrote:" marker (Gmail reply pattern)
  const match = text.match(/\n\s*On\s+.+?wrote:\s*\n/is);
  let out = match ? text.slice(0, match.index) : text;
  // Also cut at standard reply markers
  const markers = [
    /\n\s*-{2,}\s*Original Message\s*-{2,}/i,
    /\n\s*From:\s.+\n\s*Sent:\s/i,
  ];
  for (const re of markers) {
    const m = out.match(re);
    if (m) out = out.slice(0, m.index);
  }
  return out.trim();
}

export default function ReplyBubble({ reply, isBugReport = false }) {
  const [showFull, setShowFull] = useState(false);
  const clean = stripQuoted(reply.body_text || "") || reply.snippet || "";
  const sender = reply.from_name || reply.from_email || "Unknown";
  const isOutbound = reply.direction === "outbound";

  return (
    <>
      <div className={`flex flex-col gap-1 max-w-[75%] ${isOutbound ? "items-end ml-auto" : "items-start"}`}>
        <button
           type="button"
           onClick={() => setShowFull(true)}
           className={`transition px-4 py-2.5 text-sm rounded-3xl cursor-pointer hover:opacity-90 ${
             isOutbound
               ? isBugReport ? "bg-green-500 text-white" : "bg-blue-500 text-white"
               : "bg-slate-200 text-slate-900"
           }`}
           title="Click to view full email"
         >
           {(reply.image_urls || []).length > 0 && (
             <div className="flex flex-wrap gap-1.5 mb-2">
               {reply.image_urls.map((u, i) => (
                 <img key={i} src={u} alt="" className="w-20 h-20 object-cover rounded-lg" />
               ))}
             </div>
           )}
           <div className="line-clamp-3 break-words">
             {clean || "No content"}
           </div>
         </button>
        <div className={`text-[10px] text-slate-500 px-2 ${isOutbound ? "text-right" : "text-left"}`}>
          {sender} • {formatDate(reply.received_at)}
        </div>
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
                <div className="font-semibold text-sm truncate">
                  {sender} <span className="font-normal text-white/70">&lt;{reply.from_email || "unknown"}&gt;</span>
                </div>
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