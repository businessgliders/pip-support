import React from "react";
import { Bug, MessageSquare, X, PanelRight, Sparkles, LifeBuoy, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Feature announcement popup explaining the new Bug Report system:
 *   1. Live chat (floating bug button) to report new issues
 *   2. Side panel (peeking tab on the right) to view all reported issues + replies
 *
 * Props:
 *   - open: boolean
 *   - onClose: () => void          (just close, will reappear next visit)
 *   - onMarkRead: () => void       (close + persist so it doesn't reappear)
 */
export default function BugReportFeaturePopup({ open, onClose, onMarkRead }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-6 py-5 bg-gradient-to-br from-[#b67651] via-[#a05a3a] to-[#8f4d31] text-white flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 hover:bg-white/20 rounded-lg transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-white/80">New feature</div>
              <h2 className="text-xl font-bold leading-tight">Report & Track Issues</h2>
            </div>
          </div>
          <p className="text-sm text-white/90 mt-3 leading-relaxed">
            You can now report bugs and operational issues directly from the board — and follow up on
            vendor replies without leaving the support portal.
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50">
          {/* Feature 1: Live chat */}
          <FeatureCard
            iconBg="bg-gradient-to-br from-[#b67651] to-[#a05a3a]"
            icon={<LifeBuoy className="w-5 h-5 text-white" />}
            number="1"
            title="Report an issue with the chat assistant"
            description="Click the floating bug button at the bottom right to launch a guided chat. It walks you through capturing the description, urgency, screenshots, and ticket reference — then emails the right vendor automatically."
            graphic={<LiveChatGraphic />}
          />

          {/* Feature 2: Side panel */}
          <FeatureCard
            iconBg="bg-gradient-to-br from-[#b67651] to-[#a05a3a]"
            icon={<PanelRight className="w-5 h-5 text-white" />}
            number="2"
            title="Track replies in the side panel"
            description='Look for the "Reported Issues" tab peeking out on the right edge of the board. Click it to slide open a list of all reported issues, see vendor replies as they come in, and click any item for full details.'
            graphic={<SidePanelGraphic />}
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 flex-shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            Close
          </Button>
          <Button
            onClick={onMarkRead}
            className="bg-[#b67651] hover:bg-[#a05a3a] text-white"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Got it, don't show again
          </Button>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ iconBg, icon, number, title, description, graphic }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0 shadow-sm`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#b67651]">
              Step {number}
            </span>
          </div>
          <h3 className="text-base font-bold text-slate-900 leading-tight">{title}</h3>
        </div>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed mb-3">{description}</p>
      {graphic}
    </div>
  );
}

/* ---------- Inline SVG-ish graphics (built with divs for crisp scaling) ---------- */

function LiveChatGraphic() {
  return (
    <div className="relative rounded-lg bg-gradient-to-br from-pink-50 to-rose-100 border border-rose-200 p-4 h-44 overflow-hidden">
      {/* Mock board area */}
      <div className="absolute inset-3 grid grid-cols-3 gap-1.5 opacity-60">
        {[...Array(9)].map((_, i) => (
          <div key={i} className="bg-white/70 rounded h-7 border border-white" />
        ))}
      </div>

      {/* Floating bug button */}
      <div className="absolute bottom-3 right-3 flex flex-col items-end gap-2">
        {/* Speech bubble */}
        <div className="bg-white rounded-xl rounded-br-sm shadow-lg border border-slate-200 px-3 py-2 max-w-[180px] animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="text-[10px] font-semibold text-slate-700 mb-0.5">Hi! 👋</div>
          <div className="text-[10px] text-slate-600 leading-snug">
            Tell me what went wrong and I'll escalate it for you.
          </div>
        </div>
        {/* Bug FAB */}
        <div className="relative">
          <span className="absolute inset-0 rounded-full bg-[#b67651]/40 animate-ping" />
          <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-[#b67651] to-[#a05a3a] shadow-xl border-2 border-white flex items-center justify-center">
            <Bug className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>

      {/* Label */}
      <div className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wider text-rose-600/70">
        Bottom-right of board
      </div>
    </div>
  );
}

function SidePanelGraphic() {
  return (
    <div className="relative rounded-lg bg-gradient-to-br from-pink-50 to-rose-100 border border-rose-200 p-4 h-44 overflow-hidden">
      {/* Mock board area */}
      <div className="absolute inset-3 right-12 grid grid-cols-3 gap-1.5 opacity-60">
        {[...Array(9)].map((_, i) => (
          <div key={i} className="bg-white/70 rounded h-7 border border-white" />
        ))}
      </div>

      {/* Peeking tab on right */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-stretch">
        {/* Tab */}
        <div className="bg-gradient-to-b from-[#b67651] to-[#a05a3a] text-white rounded-l-lg shadow-xl border-y border-l border-white/30 px-1.5 py-3 flex flex-col items-center gap-1">
          <Bug className="w-3 h-3" />
          <div
            className="text-[7px] font-bold tracking-wider whitespace-nowrap"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            REPORTED
          </div>
          <span className="text-[8px] font-bold bg-white text-[#b67651] rounded-full w-4 h-4 flex items-center justify-center">
            2
          </span>
        </div>
      </div>

      {/* Mini panel preview peeking out */}
      <div className="absolute right-7 top-3 bottom-3 w-32 bg-white rounded-l-lg shadow-2xl border-y border-l border-slate-200 overflow-hidden animate-in slide-in-from-right duration-700">
        <div className="bg-gradient-to-r from-[#b67651] to-[#a05a3a] text-white text-[8px] font-bold px-2 py-1 flex items-center gap-1">
          <Bug className="w-2 h-2" /> Reported Issues
        </div>
        <div className="p-1.5 space-y-1">
          <div className="bg-yellow-50 border border-yellow-200 rounded p-1.5">
            <div className="flex items-center gap-1 mb-0.5">
              <span className="w-1 h-1 rounded-full bg-yellow-500" />
              <span className="text-[7px] font-bold text-yellow-700">SOON</span>
              <span className="ml-auto flex items-center gap-0.5 bg-blue-600 text-white text-[7px] rounded px-1">
                <MessageSquare className="w-1.5 h-1.5" />1
              </span>
            </div>
            <div className="text-[8px] font-bold text-slate-900 leading-tight">Pause credits...</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded p-1.5">
            <div className="flex items-center gap-1 mb-0.5">
              <span className="w-1 h-1 rounded-full bg-green-500" />
              <span className="text-[7px] font-bold text-green-700">LOW</span>
            </div>
            <div className="text-[8px] font-bold text-slate-900 leading-tight">Client charged...</div>
          </div>
        </div>
      </div>

      {/* Label */}
      <div className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wider text-rose-600/70">
        Right edge of board
      </div>
    </div>
  );
}