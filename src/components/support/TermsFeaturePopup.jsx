import React from "react";
import { X, Sparkles, CheckCircle2, BookOpen, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * One-time announcement popup for the new Terms Assistant feature.
 *
 * Props:
 *   - open: boolean
 *   - onClose: () => void
 *   - onMarkRead: () => void
 */
export default function TermsFeaturePopup({ open, onClose, onMarkRead }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-6 py-5 bg-gradient-to-br from-pink-500 via-rose-500 to-rose-600 text-white flex-shrink-0">
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
              <h2 className="text-xl font-bold leading-tight">Ask about Terms</h2>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 bg-slate-50 overflow-y-auto">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center flex-shrink-0 shadow-sm">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-pink-600">
                Instant policy lookup
              </span>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                Find any term in plain English
              </h3>
            </div>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            Stop scrolling through the Terms page. Ask a question in natural language
            (like <em>"what's the cancellation policy?"</em>) and the assistant pulls
            the exact answer straight from the studio's Terms & Etiquette page.
          </p>

          {/* Graphic */}
          <div className="relative rounded-lg bg-gradient-to-br from-pink-50 to-rose-100 border border-rose-200 p-4 h-44 overflow-hidden">
            <div className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wider text-rose-600/70">
              Bottom-right of board
            </div>

            {/* Mock chat preview */}
            <div className="absolute left-3 right-20 top-7 bottom-3 bg-white rounded-lg shadow-md border border-slate-200 p-2 flex flex-col gap-1.5 overflow-hidden">
              <div className="flex items-center gap-1 bg-slate-100 rounded px-1.5 py-1">
                <Search className="w-2.5 h-2.5 text-slate-400" />
                <span className="text-[8px] text-slate-500">Late cancellation fee?</span>
              </div>
              <div className="bg-pink-50 border border-pink-200 rounded px-1.5 py-1">
                <div className="text-[7px] font-bold text-pink-700 mb-0.5">TERMS ASSISTANT</div>
                <div className="text-[8px] text-slate-700 leading-snug">
                  Cancellations within 12h are charged the full class fee.
                </div>
              </div>
            </div>

            {/* Floating button mock */}
            <div className="absolute bottom-3 right-3">
              <div className="relative">
                <span className="absolute inset-0 rounded-full bg-pink-500/40 animate-ping" />
                <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 shadow-xl border-2 border-white flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-end gap-3 flex-shrink-0">
          <Button
            onClick={onMarkRead}
            className="bg-gradient-to-br from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Got it
          </Button>
        </div>
      </div>
    </div>
  );
}