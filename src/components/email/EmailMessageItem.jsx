import React, { useState } from "react";
import { Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const formatTime = (s) => {
  if (!s) return "";
  let iso = s;
  if (typeof s === "string" && !s.endsWith("Z") && !s.includes("+")) iso = s + "Z";
  return new Date(iso).toLocaleString("en-US", {
    hour: "numeric", minute: "2-digit", hour12: true,
    timeZone: "America/New_York"
  });
};

const formatFullDate = (s) => {
  if (!s) return "";
  let iso = s;
  if (typeof s === "string" && !s.endsWith("Z") && !s.includes("+")) iso = s + "Z";
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
    timeZone: "America/New_York"
  });
};

export default function EmailMessageItem({ message }) {
  const [open, setOpen] = useState(false);
  const isInbound = message.direction === "inbound";
  const senderName = message.from_name || message.from_email || (isInbound ? "Client" : "Support");

  // Auto-reply welcome → compact light-pink bubble with icon + short preview
  if (message.is_welcome) {
    return (
      <>
        <div className="flex justify-end mb-1">
          <div className="max-w-[80%] flex flex-col items-end">
            <span className="text-[10px] text-gray-500 mb-0.5 px-1">Auto-reply</span>
            <button
              onClick={() => setOpen(true)}
              title="View auto-reply"
              className="flex items-center gap-2 rounded-2xl bg-pink-100 hover:bg-pink-200 border border-pink-200 text-pink-700 px-3 py-2 shadow-sm transition-all hover:shadow-md rounded-br-sm"
            >
              <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-xs leading-snug text-left">
                We've received your {message.subject?.match(/\] (.+?) -/)?.[1] || "request"} — we'll be in touch within 24 hours.
              </span>
            </button>
            <span className="text-[10px] text-gray-400 mt-0.5 px-1">{formatTime(message.sent_at)}</span>
          </div>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-white">
            <DialogHeader>
              <DialogTitle className="text-base pr-8">{message.subject}</DialogTitle>
              <div className="text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1 mt-2">
                <span><strong>From:</strong> {message.from_name ? `${message.from_name} <${message.from_email}>` : message.from_email}</span>
                <span><strong>To:</strong> {message.to_email}</span>
                <span>{formatFullDate(message.sent_at)}</span>
              </div>
            </DialogHeader>
            <div
              className="prose prose-sm max-w-none text-gray-800 mt-2"
              dangerouslySetInnerHTML={{ __html: message.body_html || message.body_text || "" }}
            />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Show a smaller preview; only collapse when text is moderately long
  const fullText = message.body_text || message.snippet || "";
  const isLong = fullText.length > 300;
  const previewText = isLong ? fullText.slice(0, 300).trimEnd() + "…" : fullText;

  return (
    <>
      <div className={`flex ${isInbound ? "justify-start" : "justify-end"} mb-1`}>
        <div className={`max-w-[85%] flex flex-col ${isInbound ? "items-start" : "items-end"}`}>
          <span className="text-[10px] text-gray-500 mb-0.5 px-1">{senderName}</span>
          <button
            onClick={() => setOpen(true)}
            className={`text-left rounded-2xl px-3.5 py-2 shadow-sm transition-all hover:shadow-md ${
              isInbound
                ? "bg-white border border-gray-200 text-gray-800 rounded-bl-sm"
                : "bg-pink-100 border border-pink-200 text-gray-800 rounded-br-sm"
            }`}
          >
            <p className="text-sm leading-snug whitespace-pre-wrap break-words">
              {previewText || "(empty message)"}
            </p>
            {isLong && (
              <span className="text-[10px] mt-1 inline-block text-gray-500">
                Tap to view full message
              </span>
            )}
          </button>
          <span className="text-[10px] text-gray-400 mt-0.5 px-1">{formatTime(message.sent_at)}</span>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="text-base pr-8">{message.subject}</DialogTitle>
            <div className="text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1 mt-2">
              <span><strong>From:</strong> {message.from_name ? `${message.from_name} <${message.from_email}>` : message.from_email}</span>
              <span><strong>To:</strong> {message.to_email}</span>
              <span>{formatFullDate(message.sent_at)}</span>
            </div>
          </DialogHeader>
          <div
            className="prose prose-sm max-w-none text-gray-800 mt-2"
            dangerouslySetInnerHTML={{ __html: message.body_html || message.body_text || "" }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}