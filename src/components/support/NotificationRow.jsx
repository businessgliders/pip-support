import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check } from "lucide-react";

const formatRelative = (iso) => {
  if (!iso) return "";
  const isoZ = (typeof iso === "string" && !iso.endsWith("Z") && !iso.includes("+")) ? iso + "Z" : iso;
  const d = new Date(isoZ);
  const diffMs = Date.now() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return d.toLocaleDateString();
};

// Single notification row with click animations + mark-as-read icon swap.
// Handles its own exit animation when removed via AnimatePresence parent.
export default function NotificationRow({ ticket, latest, unreadCount, allRead, onOpen, onMarkRead }) {
  const [marking, setMarking] = useState(false);

  const handleRowClick = async () => {
    // Quick scale+fade dip then open ticket
    await new Promise(r => setTimeout(r, 220));
    onOpen();
  };

  const handleMarkIconClick = async (e) => {
    e.stopPropagation();
    setMarking(true);
    // Wait briefly for icon swap, then trigger removal (parent re-renders without this row)
    setTimeout(() => onMarkRead(), 350);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`flex items-stretch transition-colors overflow-hidden ${allRead ? "opacity-50 hover:opacity-70" : "hover:bg-pink-50"}`}
    >
      <motion.button
        whileTap={{ scale: 0.97 }}
        animate={
          marking
            ? {}
            : undefined
        }
        onClick={handleRowClick}
        className="flex-1 text-left px-4 py-3 min-w-0"
      >
        <motion.div
          whileTap={{ scale: 0.96, opacity: 0.6 }}
          transition={{ duration: 0.12, ease: "easeOut" }}
        >
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`font-semibold text-sm truncate ${allRead ? "text-gray-600" : "text-gray-900"}`}>
                {ticket.client_name}
              </span>
              {!allRead && (
                <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 flex-shrink-0">
                  {unreadCount}
                </span>
              )}
            </div>
            <span className="text-[11px] text-gray-500 flex-shrink-0">
              {formatRelative(latest?.sent_at)}
            </span>
          </div>
          <p className="text-xs text-gray-600 line-clamp-2">
            {latest?.snippet || latest?.body_text?.slice(0, 120) || "(new reply)"}
          </p>
        </motion.div>
      </motion.button>
      {!allRead && (
        <button
          onClick={handleMarkIconClick}
          title="Mark as read"
          className="flex-shrink-0 px-3 flex items-center justify-center text-gray-400 hover:text-green-600 hover:bg-green-50 border-l border-gray-100 transition-colors relative"
        >
          <AnimatePresence mode="wait" initial={false}>
            {marking ? (
              <motion.span
                key="check"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="text-green-600"
              >
                <Check className="w-4 h-4" />
              </motion.span>
            ) : (
              <motion.span
                key="bell"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                <Bell className="w-4 h-4" />
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      )}
    </motion.div>
  );
}