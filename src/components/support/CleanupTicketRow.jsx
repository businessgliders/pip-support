import React, { useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { MessageSquare, Mail, ArrowDownLeft, ArrowUpRight } from "lucide-react";

const daysSince = (dateString) => {
  if (!dateString) return 0;
  let iso = dateString;
  if (typeof dateString === "string" && !dateString.endsWith("Z") && !dateString.includes("+")) {
    iso = dateString + "Z";
  }
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
};

const formatDate = (dateString) => {
  let iso = dateString;
  if (typeof dateString === "string" && !dateString.endsWith("Z") && !dateString.includes("+")) {
    iso = dateString + "Z";
  }
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatDateTime = (dateString) => {
  if (!dateString) return "";
  let iso = dateString;
  if (typeof dateString === "string" && !dateString.endsWith("Z") && !dateString.includes("+")) {
    iso = dateString + "Z";
  }
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const stripHtml = (html) => {
  if (!html) return "";
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || "").replace(/\s+/g, " ").trim();
};

export default function CleanupTicketRow({ ticket, isSelected, onToggle }) {
  const age = daysSince(ticket.created_date);
  const [hoverOpen, setHoverOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const hoverTimerRef = useRef(null);

  const PREVIEW_W = 384;
  const PREVIEW_H = 400;
  const OFFSET = 16;

  const updatePos = (e) => {
    let x = e.clientX + OFFSET;
    let y = e.clientY + OFFSET;
    if (typeof window !== "undefined") {
      if (x + PREVIEW_W > window.innerWidth - 8) x = e.clientX - PREVIEW_W - OFFSET;
      if (y + PREVIEW_H > window.innerHeight - 8) y = window.innerHeight - PREVIEW_H - 8;
      if (y < 8) y = 8;
    }
    setPos({ x, y });
  };

  const handleMouseEnter = (e) => {
    updatePos(e);
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => setHoverOpen(true), 250);
  };

  const handleMouseMove = (e) => {
    if (hoverOpen) updatePos(e);
  };

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setHoverOpen(false);
  };

  // Most recent comment (inline)
  const latestComment = useMemo(() => {
    const comments = ticket.comments || [];
    if (comments.length === 0) return null;
    return [...comments].sort((a, b) =>
      (b.timestamp || "").localeCompare(a.timestamp || "")
    )[0];
  }, [ticket.comments]);

  // Lazy-load emails only when hover preview opens
  const { data: emails = [], isLoading } = useQuery({
    queryKey: ["cleanup-thread", ticket.id],
    queryFn: () => base44.entities.EmailMessage.filter(
      { ticket_id: ticket.id }, "-sent_at", 5
    ),
    enabled: hoverOpen,
    staleTime: 60000,
  });

  return (
    <>
        <div
          onClick={() => onToggle(ticket.id)}
          onMouseEnter={handleMouseEnter}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
            isSelected
              ? "bg-pink-50 border-pink-300 shadow-sm"
              : "bg-white border-gray-200 hover:border-gray-300"
          }`}
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggle(ticket.id)}
            onClick={(e) => e.stopPropagation()}
            className="mt-0.5"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              {ticket.ticket_number && (
                <span className="text-xs text-gray-500 font-mono">#{ticket.ticket_number}</span>
              )}
              <span className="font-semibold text-sm text-gray-900 truncate">
                {ticket.client_name}
              </span>
              <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                {ticket.inquiry_type}
              </Badge>
            </div>
            <p className="text-xs text-gray-500 truncate">
              Created {formatDate(ticket.created_date)}
            </p>
            {latestComment && (
              <div className="mt-1.5 flex items-start gap-1.5 text-xs text-gray-600 bg-gray-50 rounded px-2 py-1">
                <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0 text-gray-400" />
                <p className="line-clamp-2 italic">
                  {latestComment.comment}
                </p>
              </div>
            )}
          </div>
          <Badge className={`flex-shrink-0 ${age >= 30 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"} border-0`}>
            {age}d old
          </Badge>
        </div>
      {hoverOpen && typeof document !== "undefined" && createPortal(
        <div
          style={{ position: "fixed", left: pos.x, top: pos.y, width: PREVIEW_W, maxHeight: PREVIEW_H, zIndex: 100 }}
          className="bg-white rounded-md border shadow-xl overflow-hidden flex flex-col pointer-events-none"
        >
        <div className="px-4 py-2 border-b bg-gradient-to-r from-pink-50 to-purple-50 flex items-center gap-2 flex-shrink-0">
          <Mail className="w-4 h-4 text-gray-700" />
          <span className="text-sm font-semibold text-gray-900">Email History</span>
          <span className="text-xs text-gray-500 ml-auto">{emails.length} message{emails.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {isLoading ? (
            <p className="text-xs text-gray-500 text-center py-4">Loading...</p>
          ) : emails.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">No email communications yet.</p>
          ) : (
            emails.map(msg => {
              const isInbound = msg.direction === "inbound";
              const preview = msg.snippet || msg.body_text || stripHtml(msg.body_html);
              return (
                <div
                  key={msg.id}
                  className={`rounded-md border p-2 text-xs ${
                    isInbound ? "bg-blue-50 border-blue-200" : "bg-green-50 border-green-200"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    {isInbound ? (
                      <ArrowDownLeft className="w-3 h-3 text-blue-600 flex-shrink-0" />
                    ) : (
                      <ArrowUpRight className="w-3 h-3 text-green-600 flex-shrink-0" />
                    )}
                    <span className="font-semibold text-gray-800 truncate">
                      {isInbound ? (msg.from_name || msg.from_email) : (msg.sent_by || "Staff")}
                    </span>
                    <span className="text-gray-500 ml-auto flex-shrink-0">
                      {formatDateTime(msg.sent_at)}
                    </span>
                  </div>
                  {msg.subject && (
                    <p className="font-medium text-gray-700 truncate mb-0.5">{msg.subject}</p>
                  )}
                  <p className="text-gray-600 line-clamp-3">{preview}</p>
                </div>
              );
            })
          )}
        </div>
        </div>,
        document.body
      )}
    </>
  );
}