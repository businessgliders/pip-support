import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";

// Renders only the expanded panels for "Describe" and "Suggest".
// Trigger buttons live in the parent (EmailComposer) so they sit beside Templates.
export default function AiAssistBar({ ticketId, onApply, showDescribe, showSuggest }) {
  const [suggestions, setSuggestions] = useState([]);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(null); // 'suggest' | 'compose'
  const [hasFetchedSuggestions, setHasFetchedSuggestions] = useState(false);
  const [cached, setCached] = useState(false);
  const [generatedAt, setGeneratedAt] = useState(null);
  const scrollerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  const scrollByAmount = (dir) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth * 0.8), behavior: "smooth" });
  };

  useEffect(() => {
    updateScrollButtons();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollButtons, { passive: true });
    window.addEventListener("resize", updateScrollButtons);
    return () => {
      el.removeEventListener("scroll", updateScrollButtons);
      window.removeEventListener("resize", updateScrollButtons);
    };
  }, [suggestions.length]);

  const callAi = async (mode, payload) => {
    setLoading(mode);
    try {
      const res = await base44.functions.invoke("aiEmailAssist", { mode, ticket_id: ticketId, ...payload });
      return res.data;
    } finally {
      setLoading(null);
    }
  };

  const fetchSuggestions = async (force = false) => {
    const data = await callAi("suggest", force ? { force_refresh: true } : {});
    if (data?.suggestions) {
      setSuggestions(data.suggestions);
      setCached(!!data.cached);
      setGeneratedAt(data.generated_at || null);
    }
  };

  const handleCompose = async () => {
    if (!description.trim()) return;
    const data = await callAi("compose", { description });
    if (data?.body_html) {
      onApply(data.body_html);
      setDescription("");
    }
  };

  // Auto-fetch suggestions the first time the panel opens
  useEffect(() => {
    if (showSuggest && !hasFetchedSuggestions && loading !== "suggest") {
      setHasFetchedSuggestions(true);
      fetchSuggestions(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSuggest]);

  const formatGeneratedAt = (iso) => {
    if (!iso) return null;
    const d = new Date(iso.endsWith('Z') ? iso : iso + 'Z');
    const diffMins = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return d.toLocaleDateString();
  };

  if (!showDescribe && !showSuggest) return null;

  return (
    <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-3 space-y-3">
      {showDescribe && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-purple-700">
            <Sparkles className="w-3.5 h-3.5" />
            Describe in simple words
          </div>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. tell them yes we have availability Sat 2pm and ask which class they prefer"
            className="min-h-16 text-sm bg-white"
          />
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              size="sm"
              onClick={handleCompose}
              disabled={!description.trim() || loading === "compose"}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {loading === "compose" ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
              Generate
            </Button>
          </div>
        </div>
      )}

      {showSuggest && (
        <div className="space-y-2">
          {loading === "suggest" ? (
            <div className="flex items-center gap-2 text-xs text-purple-700 py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Generating suggestions…
            </div>
          ) : suggestions.length > 0 ? (
            <>
              <div className="flex items-center justify-between text-xs text-purple-700">
                <span>
                  {cached && generatedAt ? (
                    <>Cached suggestions · generated {formatGeneratedAt(generatedAt)}</>
                  ) : (
                    <>Fresh suggestions</>
                  )}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchSuggestions(true)}
                  className="h-7 text-purple-700 hover:bg-purple-100"
                  title="Re-generate suggestions (uses credits)"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Refresh
                </Button>
              </div>
              <div className="relative group">
                {canScrollLeft && (
                  <button
                    type="button"
                    onClick={() => scrollByAmount(-1)}
                    aria-label="Scroll left"
                    className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 items-center justify-center rounded-full bg-white border border-purple-200 shadow-md hover:bg-purple-50 text-purple-700"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}
                {canScrollRight && (
                  <button
                    type="button"
                    onClick={() => scrollByAmount(1)}
                    aria-label="Scroll right"
                    className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 items-center justify-center rounded-full bg-white border border-purple-200 shadow-md hover:bg-purple-50 text-purple-700"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
                <div
                  ref={scrollerRef}
                  className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 touch-pan-x snap-x snap-mandatory scroll-smooth"
                  style={{ WebkitOverflowScrolling: "touch" }}
                >
                  {suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => onApply(s.body_html)}
                      className="snap-start flex-shrink-0 w-64 text-left bg-white hover:bg-purple-50 border border-purple-200 rounded-lg p-3 transition-colors"
                    >
                      <div className="font-semibold text-sm text-purple-700 mb-1">{s.label}</div>
                      <div
                        className="text-xs text-gray-600 line-clamp-3 prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: s.body_html }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-xs text-gray-500 py-1">No suggestions available.</div>
          )}
        </div>
      )}
    </div>
  );
}