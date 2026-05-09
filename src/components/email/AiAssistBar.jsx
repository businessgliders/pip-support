import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, Lightbulb } from "lucide-react";

export default function AiAssistBar({ ticketId, onApply }) {
  const [suggestions, setSuggestions] = useState([]);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(null); // 'suggest' | 'compose'

  const callAi = async (mode, payload) => {
    setLoading(mode);
    try {
      const res = await base44.functions.invoke("aiEmailAssist", { mode, ticket_id: ticketId, ...payload });
      return res.data;
    } finally {
      setLoading(null);
    }
  };

  const handleSuggest = async () => {
    const data = await callAi("suggest", {});
    if (data?.suggestions) setSuggestions(data.suggestions);
  };

  const handleCompose = async () => {
    if (!description.trim()) return;
    const data = await callAi("compose", { description });
    if (data?.body_html) {
      onApply(data.body_html);
      setDescription("");
    }
  };

  return (
    <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-3 space-y-3">
      {/* Describe in simple words — expanded by default */}
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

      {/* Suggest Replies */}
      <div className="space-y-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleSuggest}
          disabled={loading === "suggest"}
          className="bg-white hover:bg-purple-50 border-purple-300 text-purple-700"
        >
          {loading === "suggest" ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Lightbulb className="w-3.5 h-3.5 mr-1.5" />}
          Suggest Replies
        </Button>

        {suggestions.length > 0 && (
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
        )}
      </div>
    </div>
  );
}