import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Wand2, Loader2, Lightbulb } from "lucide-react";

export default function AiAssistBar({ ticketId, draft, onApply }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showDescribe, setShowDescribe] = useState(false);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(null); // 'suggest' | 'compose' | 'polish'

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
      setShowDescribe(false);
      setDescription("");
    }
  };

  const handlePolish = async () => {
    if (!draft?.trim()) return;
    const data = await callAi("polish", { draft });
    if (data?.body_html) onApply(data.body_html);
  };

  return (
    <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-3 space-y-3">
      <div className="flex flex-wrap gap-2">
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
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowDescribe(!showDescribe)}
          className="bg-white hover:bg-purple-50 border-purple-300 text-purple-700"
        >
          <Sparkles className="w-3.5 h-3.5 mr-1.5" />
          Describe in simple words
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handlePolish}
          disabled={!draft?.trim() || loading === "polish"}
          className="bg-white hover:bg-purple-50 border-purple-300 text-purple-700"
        >
          {loading === "polish" ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5 mr-1.5" />}
          Polish
        </Button>
      </div>

      {showDescribe && (
        <div className="space-y-2">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. tell them yes we have availability Sat 2pm and ask which class they prefer"
            className="min-h-20 text-sm bg-white"
          />
          <div className="flex gap-2 justify-end">
            <Button type="button" size="sm" variant="ghost" onClick={() => { setShowDescribe(false); setDescription(""); }}>Cancel</Button>
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

      {suggestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-purple-700">Suggested replies — click to load</p>
          {suggestions.map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => { onApply(s.body_html); setSuggestions([]); }}
              className="w-full text-left bg-white hover:bg-purple-50 border border-purple-200 rounded-lg p-3 transition-colors"
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
  );
}