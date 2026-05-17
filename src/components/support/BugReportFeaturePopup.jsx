import React, { useState } from "react";
import { Bug, MessageSquare, X, PanelRight, Sparkles, LifeBuoy, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Feature announcement popup explaining the new Bug Report system as
 * sliding steps (one feature per slide):
 *   Step 1. Live chat (floating bug button)
 *   Step 2. Side panel (peeking tab on the right)
 *
 * Props:
 *   - open: boolean
 *   - onClose: () => void
 *   - onMarkRead: () => void
 */
export default function BugReportFeaturePopup({ open, onClose, onMarkRead }) {
  const [step, setStep] = useState(0);

  // Reset to first step whenever popup re-opens
  React.useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  if (!open) return null;

  const steps = [
    {
      icon: <LifeBuoy className="w-5 h-5 text-white" />,
      eyebrow: "Step 1 of 2",
      title: "Report an issue with the chat assistant",
      description:
        "Click the floating bug button at the bottom-right to start a guided chat. It captures the details and emails the right vendor for you.",
      graphic: <LiveChatGraphic />,
    },
    {
      icon: <PanelRight className="w-5 h-5 text-white" />,
      eyebrow: "Step 2 of 2",
      title: "Track replies in the side panel",
      description:
        'Open the "Reported Issues" tab on the right edge to view all reports and vendor replies.',
      graphic: <SidePanelGraphic />,
    },
  ];

  const isLast = step === steps.length - 1;
  const isFirst = step === 0;

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col"
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
        </div>

        {/* Sliding content */}
        <div className="relative flex-1 overflow-hidden bg-slate-50">
          <div
            className="flex transition-transform duration-300 ease-out h-full"
            style={{ transform: `translateX(-${step * 100}%)` }}
          >
            {steps.map((s, i) => (
              <div key={i} className="w-full flex-shrink-0 overflow-y-auto p-6">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#b67651] to-[#a05a3a] flex items-center justify-center flex-shrink-0 shadow-sm">
                    {s.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#b67651]">
                      {s.eyebrow}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 leading-tight">{s.title}</h3>
                  </div>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">{s.description}</p>
                {s.graphic}
              </div>
            ))}
          </div>
        </div>

        {/* Footer with dots + navigation */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3 flex-shrink-0">
          {/* Prev */}
          <Button
            variant="ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={isFirst}
            className="text-slate-600 hover:bg-slate-100 disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>

          {/* Dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                aria-label={`Go to step ${i + 1}`}
                className={`h-2 rounded-full transition-all ${
                  i === step ? "w-6 bg-[#b67651]" : "w-2 bg-slate-300 hover:bg-slate-400"
                }`}
              />
            ))}
          </div>

          {/* Next or Mark read */}
          {isLast ? (
            <Button
              onClick={onMarkRead}
              className="bg-[#b67651] hover:bg-[#a05a3a] text-white"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Got it
            </Button>
          ) : (
            <Button
              onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
              className="bg-[#b67651] hover:bg-[#a05a3a] text-white"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Inline graphics ---------- */

function LiveChatGraphic() {
  return (
    <div className="relative rounded-lg bg-gradient-to-br from-pink-50 to-rose-100 border border-rose-200 p-4 h-48 overflow-hidden">
      {/* Mock board area */}
      <div className="absolute inset-3 grid grid-cols-3 gap-1.5 opacity-60">
        {[...Array(9)].map((_, i) => (
          <div key={i} className="bg-white/70 rounded h-7 border border-white" />
        ))}
      </div>

      {/* Floating bug button */}
      <div className="absolute bottom-3 right-3 flex flex-col items-end gap-2">
        <div className="bg-white rounded-xl rounded-br-sm shadow-lg border border-slate-200 px-3 py-2 max-w-[180px] animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="text-[10px] font-semibold text-slate-700 mb-0.5">Hi! 👋</div>
          <div className="text-[10px] text-slate-600 leading-snug">
            Tell me what went wrong and I'll escalate it for you.
          </div>
        </div>
        <div className="relative">
          <span className="absolute inset-0 rounded-full bg-[#b67651]/40 animate-ping" />
          <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-[#b67651] to-[#a05a3a] shadow-xl border-2 border-white flex items-center justify-center">
            <Bug className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>

      <div className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wider text-rose-600/70">
        Bottom-right of board
      </div>
    </div>
  );
}

function SidePanelGraphic() {
  return (
    <div className="relative rounded-lg bg-gradient-to-br from-pink-50 to-rose-100 border border-rose-200 p-4 h-48 overflow-hidden">
      {/* Mock board area */}
      <div className="absolute inset-3 right-12 grid grid-cols-3 gap-1.5 opacity-60">
        {[...Array(9)].map((_, i) => (
          <div key={i} className="bg-white/70 rounded h-7 border border-white" />
        ))}
      </div>

      {/* Peeking tab on right */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-stretch">
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

      <div className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wider text-rose-600/70">
        Right edge of board
      </div>
    </div>
  );
}