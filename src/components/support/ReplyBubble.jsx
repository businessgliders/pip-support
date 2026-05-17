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
  const fromEmail = (reply.from_email || "").toLowerCase();
  const isOutbound =
    reply.direction === "outbound" ||
    fromEmail.endsWith("@pilatesinpinkstudio.com");

  return (
    <>
      <div className={`flex flex-col max-w-[85%] ${isOutbound ? "items-start" : "items-end ml-auto"}`}>
        <div className={`text-[10px] text-slate-500 mb-1 px-2 ${isOutbound ? "text-left" : "text-right"}`}>
          {sender} • {formatDate(reply.received_at)}
        </div>
        <button
          type="button"
          onClick={() => setShowFull(true)}
          className={`text-left transition rounded-2xl px-3 py-2 text-xs text-slate-800 whitespace-pre-wrap break-words shadow-sm ${
            isOutbound
              ? isBugReport ? "bg-sky-100 hover:bg-sky-200 border border-sky-200 rounded-tl-sm" : "bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-tl-sm"
              : "bg-yellow-100 hover:bg-yellow-200 border border-yellow-200 rounded-tr-sm"
          }`}
          title="Click to view full email"
        >
          {(reply.image_urls || []).length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1">
              {reply.image_urls.map((u, i) => (
                <img key={i} src={u} alt="" className="w-12 h-12 object-cover rounded border border-slate-200" />
              ))}
            </div>
          )}
          {clean.slice(0, 280)}
          {clean.length > 280 && "…"}
          <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 mt-1 ml-1 align-middle">
            <Maximize2 className="w-2.5 h-2.5" />
          </span>
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