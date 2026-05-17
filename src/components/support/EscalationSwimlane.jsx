import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Bug, X, AlertCircle, CheckCircle2, ChevronRight } from "lucide-react";

const URGENCY_STYLE = {
  Critical: { dot: "bg-red-500", text: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
  High: { dot: "bg-orange-500", text: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" },
  Soon: { dot: "bg-yellow-500", text: "text-yellow-700", bg: "bg-yellow-50", border: "border-yellow-200" },
  Low: { dot: "bg-green-500", text: "text-green-700", bg: "bg-green-50", border: "border-green-200" }
};

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

export default function EscalationSwimlane() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["bug-reports"],
    queryFn: () => base44.entities.BugReport.list("-created_date", 50),
    refetchInterval: 15000,
  });

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (selected) setSelected(null);
        else if (open) setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, selected]);

  const count = reports.length;
  const openCount = reports.filter(r => r.email_status !== "failed").length;

  return (
    <>
      {/* Backdrop blur when expanded */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/10 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => { setOpen(false); setSelected(null); }}
        />
      )}

      {/* Peeking tab + expanded panel */}
      <div
        className={`fixed top-1/2 -translate-y-1/2 right-0 z-50 flex items-stretch transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-[calc(100%-28px)]"
        }`}
        style={{ height: open ? "min(70vh, 600px)" : undefined }}
      >
        {/* Peek tab (always visible sliver) */}
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="w-7 py-2 md:py-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-[#b67651] to-[#a05a3a] text-white rounded-l-xl shadow-2xl border-y border-l border-white/30 hover:from-[#a05a3a] hover:to-[#8f4d31] transition-colors md:h-auto"
          title="Reported Issues"
        >
          <Bug className="w-3.5 h-3.5" />
          <div className="text-[10px] font-bold tracking-wider" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
            REPORTED ISSUES
          </div>
          {count > 0 && (
            <span className="text-[10px] font-bold bg-white text-[#b67651] rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
              {count}
            </span>
          )}
        </button>

        {/* Panel content */}
        <div className="w-[340px] max-w-[calc(100vw-28px)] bg-white shadow-2xl border-y border-l border-slate-200 rounded-l-xl flex flex-col overflow-hidden" style={{ height: open ? "min(70vh, 600px)" : undefined }}>
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-[#b67651] to-[#a05a3a] text-white flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <Bug className="w-4 h-4" />
              <div>
                <div className="font-semibold text-sm">Reported Issues</div>
                <div className="text-[11px] text-white/80">{openCount} active • {count} total</div>
              </div>
            </div>
            <button
              onClick={() => { setOpen(false); setSelected(null); }}
              className="p-1 hover:bg-white/20 rounded-lg transition"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto bg-slate-50">
            {isLoading ? (
              <div className="p-4 text-center text-slate-500 text-sm">Loading...</div>
            ) : reports.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
                No reported issues yet
              </div>
            ) : (
              <div className="p-2 space-y-2">
                {reports.map(r => {
                  const u = URGENCY_STYLE[r.urgency] || URGENCY_STYLE.Soon;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelected(r)}
                      className={`w-full text-left p-3 rounded-xl border ${u.border} ${u.bg} hover:shadow-md transition-all`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`w-2 h-2 rounded-full ${u.dot} flex-shrink-0`} />
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${u.text}`}>
                          {r.urgency || "Soon"}
                        </span>
                        {r.ticket_number && (
                          <span className="text-[10px] font-semibold text-slate-600 bg-white border border-slate-200 rounded px-1.5 py-0.5">
                            #{r.ticket_number}
                          </span>
                        )}
                        {r.email_status === "failed" && (
                          <AlertCircle className="w-3 h-3 text-red-500 ml-auto" />
                        )}
                      </div>
                      <div className="text-sm text-slate-800 font-medium line-clamp-2 mb-1">
                        {r.description}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="truncate">{r.reported_by_name || r.reported_by_email}</span>
                        <span>{formatDate(r.created_date)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail modal */}
      {selected && (
        <div
          className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-gradient-to-r from-[#b67651] to-[#a05a3a] text-white flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <Bug className="w-4 h-4" />
                <div className="font-semibold">Bug Report</div>
              </div>
              <button onClick={() => setSelected(null)} className="p-1 hover:bg-white/20 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${URGENCY_STYLE[selected.urgency]?.bg} ${URGENCY_STYLE[selected.urgency]?.text} border ${URGENCY_STYLE[selected.urgency]?.border}`}>
                  {selected.urgency}
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700 border border-slate-200">
                  {selected.platform}
                </span>
                {selected.ticket_number && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-[#b67651]/10 text-[#b67651] border border-[#b67651]/30 font-semibold">
                    Ticket #{selected.ticket_number}
                  </span>
                )}
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  selected.email_status === "sent" ? "bg-green-50 text-green-700 border border-green-200" :
                  selected.email_status === "failed" ? "bg-red-50 text-red-700 border border-red-200" :
                  "bg-yellow-50 text-yellow-700 border border-yellow-200"
                }`}>
                  Email: {selected.email_status}
                </span>
              </div>

              <div>
                <div className="text-xs text-slate-500 mb-1">Description</div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 whitespace-pre-wrap">
                  {selected.description}
                </div>
              </div>

              {selected.client_name && (
                <div className="flex gap-4 text-xs">
                  <div><span className="text-slate-500">Client:</span> <span className="text-slate-800 font-medium">{selected.client_name}</span></div>
                  {selected.booking_info && <div><span className="text-slate-500">Booking:</span> <span className="text-slate-800">{selected.booking_info}</span></div>}
                </div>
              )}

              <div className="flex gap-4 text-xs">
                <div><span className="text-slate-500">Reported by:</span> <span className="text-slate-800">{selected.reported_by_name || selected.reported_by_email}</span></div>
              </div>

              <div className="flex gap-4 text-xs">
                <div><span className="text-slate-500">Escalated to:</span> <span className="text-slate-800">{selected.escalated_to}</span></div>
                <div><span className="text-slate-500">When:</span> <span className="text-slate-800">{formatDate(selected.created_date)}</span></div>
              </div>

              {selected.image_urls?.length > 0 && (
                <div>
                  <div className="text-xs text-slate-500 mb-1">Attachments ({selected.image_urls.length})</div>
                  <div className="grid grid-cols-3 gap-2">
                    {selected.image_urls.map((u, i) => (
                      <a key={i} href={u} target="_blank" rel="noopener noreferrer" className="block">
                        <img src={u} alt={`attachment ${i + 1}`} className="w-full h-20 object-cover rounded-lg border border-slate-200 hover:opacity-80 transition" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {selected.email_error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
                  <strong>Error:</strong> {selected.email_error}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}