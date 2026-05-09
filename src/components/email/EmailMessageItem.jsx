import React, { useState } from "react";
import { ChevronDown, ChevronUp, Mail, Sparkles, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const formatDate = (s) => {
  if (!s) return "";
  let iso = s;
  if (typeof s === "string" && !s.endsWith("Z") && !s.includes("+")) iso = s + "Z";
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
    timeZone: "America/New_York"
  });
};

export default function EmailMessageItem({ message, defaultExpanded = false }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const isInbound = message.direction === "inbound";

  return (
    <div className={`border rounded-xl overflow-hidden ${isInbound ? "bg-blue-50/60 border-blue-200" : "bg-pink-50/60 border-pink-200"}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start justify-between gap-3 p-3 text-left hover:bg-white/40 transition-colors"
      >
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isInbound ? "bg-blue-500" : "bg-pink-500"}`}>
            {isInbound ? <User className="w-4 h-4 text-white" /> : <Mail className="w-4 h-4 text-white" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="font-semibold text-gray-900 text-sm truncate">
                {message.from_name || message.from_email}
              </span>
              {message.is_welcome && (
                <Badge className="bg-pink-100 text-pink-700 border-pink-200 text-[10px]">
                  <Sparkles className="w-2.5 h-2.5 mr-1" />Welcome
                </Badge>
              )}
              {isInbound && (
                <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px]">Reply from client</Badge>
              )}
            </div>
            <p className="text-xs text-gray-500 truncate">{message.subject}</p>
            {!expanded && (
              <p className="text-xs text-gray-600 mt-1 line-clamp-1">{message.snippet}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-gray-500 whitespace-nowrap hidden sm:inline">{formatDate(message.sent_at)}</span>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </div>
      </button>
      {expanded && (
        <div className="border-t border-white/40 bg-white p-4">
          <div className="text-xs text-gray-500 mb-2 sm:hidden">{formatDate(message.sent_at)}</div>
          <div
            className="prose prose-sm max-w-none text-gray-800"
            dangerouslySetInnerHTML={{ __html: message.body_html || message.body_text || "" }}
          />
        </div>
      )}
    </div>
  );
}