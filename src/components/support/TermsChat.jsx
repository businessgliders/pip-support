import React, { useState, useRef, useEffect } from "react";
import { BookOpen, X, Send, Loader2, Sparkles, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ReactMarkdown from "react-markdown";
import { base44 } from "@/api/base44Client";

const TERMS_URL = "https://pricing.pilatesinpinkstudio.com/terms";

const SUGGESTIONS = [
  "What's the cancellation policy?",
  "How do late arrivals work?",
  "Are walk-ins allowed?",
  "What's the policy on no-shows?",
  "Refund policy?",
];

export default function TermsChat({ openSignal = 0 }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (openSignal > 0) setOpen(true);
  }, [openSignal]);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: "Hi! 📖 Ask me anything about the studio's Terms & Etiquette and I'll find the exact policy for you. Try one of the suggestions below or type your own question."
      }]);
    }
  }, [open]); // eslint-disable-line

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleClose = () => setOpen(false);

  const ask = async (question) => {
    const q = (question ?? input).trim();
    if (!q || loading) return;
    setInput("");

    const newMessages = [...messages, { role: "user", content: q }];
    setMessages(newMessages);
    setLoading(true);

    try {
      // Build short conversation history for context
      const history = newMessages
        .slice(-8)
        .map(m => `${m.role === "user" ? "Front Desk" : "Assistant"}: ${m.content}`)
        .join("\n");

      // Call backend function that fetches terms server-side and asks the LLM (fast: no web crawling)
      const callPromise = base44.functions.invoke("askTerms", { question: q, history });
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timed out after 30s")), 30000)
      );
      const res = await Promise.race([callPromise, timeout]);

      // eslint-disable-next-line no-console
      console.log("[TermsChat] askTerms response:", res);

      const data = res?.data ?? res;
      const answer = data?.answer || "I got an empty response. Please try rephrasing your question.";
      setMessages(prev => [...prev, { role: "assistant", content: answer }]);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[TermsChat] LLM error:", err);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `⚠️ Couldn't fetch that right now: ${err.message || "Unknown error"}. Please try again.`
      }]);
    } finally {
      setLoading(false);
    }
  };

  const resetChat = () => {
    setMessages([{
      role: "assistant",
      content: "Cleared! Ask me anything about the Terms & Etiquette."
    }]);
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{ bottom: "calc(132px + env(safe-area-inset-bottom, 0px))" }}
          className="fixed md:!bottom-5 right-0 md:right-[200px] z-50 flex items-center justify-center w-12 h-12 rounded-l-full md:rounded-full bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-2xl hover:scale-105 active:scale-95 transition-all border border-white/30"
          title="Ask about Terms"
        >
          <BookOpen className="w-5 h-5" />
        </button>
      )}

      {open && (
        <div
          style={{ bottom: "calc(72px + env(safe-area-inset-bottom, 0px))" }}
          className="fixed md:!bottom-5 right-5 z-50 w-[calc(100vw-2.5rem)] sm:w-[420px] h-[640px] max-h-[calc(100vh-6rem)] md:max-h-[calc(100vh-2.5rem)] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-4 duration-200"
        >
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-pink-500 to-rose-600 text-white">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <div>
                <div className="font-semibold text-sm">Terms Assistant</div>
                <div className="text-[11px] text-white/80">Powered by Studio Terms & Etiquette</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <a
                href={TERMS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 hover:bg-white/20 rounded-lg transition"
                title="Open source page"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              <button
                onClick={resetChat}
                className="p-1 hover:bg-white/20 rounded-lg transition text-[11px] px-2"
                title="Start over"
              >
                Reset
              </button>
              <button onClick={handleClose} className="p-1 hover:bg-white/20 rounded-lg transition">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-slate-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[88%] px-3 py-2 rounded-2xl text-sm ${
                  m.role === "user"
                    ? "bg-pink-500 text-white rounded-br-sm whitespace-pre-wrap"
                    : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm"
                }`}>
                  {m.role === "user" ? (
                    m.content
                  ) : (
                    <div className="prose prose-sm max-w-none prose-slate prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-blockquote:my-2 prose-blockquote:border-pink-400 prose-blockquote:text-slate-600 [&>p:has(+blockquote)]:mb-3 [&>p:has(+blockquote)]:text-xs [&>p:has(+blockquote)]:italic [&>p:has(+blockquote)]:text-slate-500">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 text-slate-600 rounded-2xl rounded-bl-sm px-3 py-2 text-sm flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Looking up the terms...
                </div>
              </div>
            )}

            {messages.length <= 1 && !loading && (
              <div className="pt-2 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 px-1">
                  <Sparkles className="w-3 h-3" /> Quick questions
                </div>
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => ask(s)}
                    className="block w-full text-left px-3 py-2 text-xs bg-white border border-slate-200 hover:border-pink-300 hover:bg-pink-50 rounded-xl text-slate-700 transition"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 p-2 bg-white flex gap-2">
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask a question about the terms..."
              className="min-h-[44px] max-h-32 text-sm resize-none"
              disabled={loading}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  ask();
                }
              }}
            />
            <Button
              onClick={() => ask()}
              disabled={!input.trim() || loading}
              className="bg-gradient-to-br from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white self-end"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}