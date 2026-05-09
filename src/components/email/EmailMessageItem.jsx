import React, { useState } from "react";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

  return (
    <>
      <div className={`flex ${isInbound ? "justify-start" : "justify-end"} mb-1`}>
        <div className={`max-w-[80%] flex flex-col ${isInbound ? "items-start" : "items-end"}`}>
          <span className="text-[10px] text-gray-500 mb-0.5 px-1">{senderName}</span>
          <button
            onClick={() => setOpen(true)}
            className={`text-left rounded-2xl px-3.5 py-2 shadow-sm transition-all hover:shadow-md ${
              isInbound
                ? "bg-white border border-gray-200 text-gray-800 rounded-bl-sm"
                : "bg-pink-500 text-white rounded-br-sm"
            }`}
          >
            <p className={`text-sm leading-snug line-clamp-3 whitespace-pre-wrap break-words ${isInbound ? "" : "text-white"}`}>
              {message.snippet || (message.body_text || "").slice(0, 200) || "(empty message)"}
            </p>
            {message.is_welcome && (
              <Badge className="mt-1.5 bg-white/20 text-white border-white/30 text-[9px] hover:bg-white/20">
                <Sparkles className="w-2.5 h-2.5 mr-0.5" />Auto-reply
              </Badge>
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