import React, { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Mail, MoreVertical, Gift, User } from "lucide-react";
import { motion, AnimatePresence, useAnimationControls } from "framer-motion";
import { getPhotoForEmail } from "@/lib/userProfile";

// pip-events style: subtle left accent stripe by priority
const priorityAccent = {
  Low:    "#34d399",
  Medium: "#fbbf24",
  High:   "#fb923c",
  Urgent: "#ef4444",
};

const userColors = {
  0: "bg-pink-400", 1: "bg-purple-400", 2: "bg-blue-400", 3: "bg-teal-400",
  4: "bg-green-400", 5: "bg-amber-400", 6: "bg-rose-400", 7: "bg-indigo-400",
};

const inquiryTypeIcons = {
  "General Inquiry": "❓",
  "Membership Inquiry": "💳",
  "Private Events": "🎉",
  "Cancellation": "⚠️",
  "Other": "📝",
};

const formatRelativeTime = (dateString) => {
  if (!dateString) return "";
  let iso = dateString;
  if (typeof iso === "string" && !iso.endsWith("Z") && !iso.includes("+")) iso += "Z";
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export default function TicketCard({
  ticket, onStatusChange, onClick, isDragging, isHighlighted,
  allUsers = [], viewMode = "status", unreadCount = 0,
}) {
  const mailShake = useAnimationControls();
  const prevUnreadRef = useRef(unreadCount);
  useEffect(() => {
    if (unreadCount > prevUnreadRef.current) {
      mailShake.start({
        rotate: [0, -10, 10, -6, 6, 0],
        transition: { duration: 0.5, ease: "easeOut" },
      });
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount, mailShake]);

  const accent = priorityAccent[ticket.priority] || priorityAccent.Medium;
  const watermarkText = viewMode === "category" ? ticket.status : null;

  const getInitials = (email) => {
    if (email === "info@pilatesinpinkstudio.com") return "FD";
    const user = allUsers.find((u) => u.email === email);
    if (user?.full_name) {
      return user.full_name.split(" ").map((n) => n[0]).join("").toUpperCase();
    }
    return (email || "").substring(0, 2).toUpperCase();
  };

  const getUserColor = (email = "") => {
    const hash = email.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return userColors[hash % 8];
  };

  const tag = ticket.ticket_number ? `#${ticket.ticket_number}` : `#${ticket.id?.slice(-6)}`;

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden bg-white rounded-xl group transition-all ${
        isDragging
          ? "shadow-2xl ring-2 ring-pink-300 cursor-grabbing scale-[1.02]"
          : isHighlighted
          ? "shadow-xl ring-2 ring-yellow-400 cursor-grab animate-shake"
          : "shadow-sm hover:shadow-md cursor-grab border border-gray-100 hover:border-pink-200"
      }`}
    >
      {/* Left accent stripe — priority color */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ background: accent }}
        aria-hidden="true"
      />

      <div className="pl-3 pr-3 py-3">
        {/* Watermark */}
        {watermarkText && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-2 right-3 text-[10px] font-black uppercase tracking-wider text-gray-200 select-none whitespace-nowrap"
          >
            {watermarkText}
          </span>
        )}

        {/* Unread email badge */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.div
              key="unread-badge"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [1, 1.15, 1], opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{
                scale: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
                opacity: { duration: 0.2 },
              }}
              title={`${unreadCount} unread ${unreadCount === 1 ? "reply" : "replies"}`}
              className="absolute top-2 right-2 z-10"
            >
              <div className="relative bg-red-500 rounded-full w-6 h-6 flex items-center justify-center shadow ring-2 ring-white">
                <motion.span animate={mailShake} style={{ display: "inline-flex", transformOrigin: "50% 50%" }}>
                  <Mail className="w-3 h-3 text-white" />
                </motion.span>
                <span className="absolute -top-1 -right-1 bg-white text-red-600 text-[9px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5 shadow">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top line: tag + inquiry type */}
        <div className="flex items-center gap-1.5 text-[11px] mb-1 pr-8">
          <span className="font-mono font-semibold text-gray-400">{tag}</span>
          <span className="text-gray-500 truncate">{ticket.inquiry_type}</span>
        </div>

        {/* Name with emoji */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="text-base flex-shrink-0">{inquiryTypeIcons[ticket.inquiry_type]}</span>
            <h4 className="text-gray-900 font-semibold truncate text-sm">
              {ticket.client_name}
            </h4>
          </div>

          {!isDragging && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-white border border-gray-200">
                {["New", "In Progress", "Resolved", "Closed"].map((s) => (
                  <DropdownMenuItem
                    key={s}
                    onClick={(e) => { e.stopPropagation(); onStatusChange(ticket.id, s); }}
                  >
                    Move to {s}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Cancellation discount chip */}
        {ticket.inquiry_type === "Cancellation" && ticket.discount_offered && (
          <div className="mb-2 flex items-center justify-between gap-2 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <Gift className="w-3 h-3 text-amber-700 flex-shrink-0" />
              <span className="text-amber-900 text-[11px] font-medium truncate">
                {ticket.discount_offered} offer
              </span>
            </div>
            {ticket.discount_accepted !== undefined && ticket.discount_accepted !== null && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap ${
                ticket.discount_accepted
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-600"
              }`}>
                {ticket.discount_accepted ? "✓" : "✗"}
              </span>
            )}
          </div>
        )}

        {/* Footer: relative time + assignee */}
        <div className="flex items-center justify-between mt-2">
          <span className="text-gray-400 text-[11px]">
            {formatRelativeTime(ticket.created_date)}
          </span>
          {ticket.assigned_to && (() => {
            const photo = getPhotoForEmail(ticket.assigned_to, allUsers);
            if (photo) {
              return (
                <div className="w-6 h-6 rounded-full overflow-hidden border border-white shadow-sm">
                  <img src={photo} alt={getInitials(ticket.assigned_to)} className="w-full h-full object-cover" />
                </div>
              );
            }
            return (
              <div className={`flex items-center justify-center w-6 h-6 rounded-full ${getUserColor(ticket.assigned_to)} shadow-sm`}>
                <span className="text-white text-[9px] font-semibold">
                  {getInitials(ticket.assigned_to)}
                </span>
              </div>
            );
          })()}
        </div>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-3px); }
          20%, 40%, 60%, 80% { transform: translateX(3px); }
        }
        .animate-shake { animation: shake 0.5s ease-in-out 2; }
      `}</style>
    </div>
  );
}