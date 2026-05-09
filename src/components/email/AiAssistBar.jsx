import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2 } from "lucide-react";

// Renders only the expanded panels for "Describe" and "Suggest".
// Trigger buttons live in the parent (EmailComposer) so they sit beside Templates.
export default function AiAssistBar({ ticketId, onApply, showDescribe, showSuggest }) {
  const [suggestions, setSuggestions] = useState([]);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(null); // 'suggest' | 'compose'
  const [hasFetchedSuggestions, setHasFetchedSuggestions] = useState(false);

  const callAi = async (mode, payload) => {
    setLoading(mode);
    try {
      const res = await base44.functions.invoke("aiEmailAssist", { mode, ticket_id: ticketId, ...payload });
      return res.data;
    } finally {
      setLoading(null);
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
      callAi("suggest", {}).then((data) => {
        if (data?.suggestions) setSuggestions(data.suggestions);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSuggest]);

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
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onApply(s.body_html)}
                  className="flex-shrink-0 w-64 text-left bg-white hover:bg-purple-50 border border-purple-200 rounded-lg p-3 transition-colors"
                >
                  <div className="font-semibold text-sm text-purple-700 mb-1">{s.label}</div>
                  <div
                    className="text-xs text-gray-600 line-clamp-3 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: s.body_html }}
                  />
                </button>
              ))}
            </div>
          ) : (
            <div className="text-xs text-gray-500 py-1">No suggestions available.</div>
          )}
        </div>
      )}
    </div>
  );
}