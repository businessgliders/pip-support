import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Bell, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Keep notifications visible (greyed out) this many hours after being marked as read
const KEEP_READ_HOURS = 4;

const getReadAt = (msg, email) => {
  const entry = (msg.read_at || []).find(r => r.email === email);
  if (!entry?.timestamp) return null;
  const ts = entry.timestamp;
  const isoZ = (typeof ts === "string" && !ts.endsWith("Z") && !ts.includes("+")) ? ts + "Z" : ts;
  return new Date(isoZ).getTime();
};

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

// Shows a bell with unread-count badge. Lists tickets (assigned to current user)
// that have at least one inbound EmailMessage the user hasn't read yet.
export default function NotificationCenter({ currentUser, tickets, onTicketClick, variant = "floating" }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const myTicketIds = (tickets || [])
    .filter(t => t.assigned_to === currentUser?.email && !t.archived)
    .map(t => t.id);

  const { data: visibleMessages = [] } = useQuery({
    queryKey: ["unread-emails", currentUser?.email, myTicketIds.length],
    queryFn: async () => {
      if (!currentUser?.email || myTicketIds.length === 0) return [];
      const recent = await base44.entities.EmailMessage.filter(
        { direction: "inbound" }, "-sent_at", 200
      );
      const keepReadCutoff = Date.now() - KEEP_READ_HOURS * 60 * 60 * 1000;
      return recent.filter(m => {
        if (!myTicketIds.includes(m.ticket_id)) return false;
        const isRead = (m.read_by || []).includes(currentUser.email);
        if (!isRead) return true; // unread always visible
        // Read: keep visible only if marked-read timestamp is within window
        const readAt = getReadAt(m, currentUser.email);
        if (!readAt) return false; // read but no timestamp -> already dismissed
        return readAt >= keepReadCutoff;
      });
    },
    enabled: !!currentUser?.email && myTicketIds.length > 0,
    refetchInterval: 15000,
  });

  const markTicketAsRead = async (msgs) => {
    const nowIso = new Date().toISOString();
    await Promise.all(
      msgs.map(m => {
        if ((m.read_by || []).includes(currentUser.email)) return null;
        const readAtEntries = (m.read_at || []).filter(r => r.email !== currentUser.email);
        readAtEntries.push({ email: currentUser.email, timestamp: nowIso });
        return base44.entities.EmailMessage.update(m.id, {
          read_by: [...(m.read_by || []), currentUser.email],
          read_at: readAtEntries,
        }).catch(() => null);
      })
    );
    queryClient.invalidateQueries({ queryKey: ["unread-emails"] });
    queryClient.invalidateQueries({ queryKey: ["unread-by-ticket"] });
  };

  // Group messages by ticket
  const grouped = visibleMessages.reduce((acc, m) => {
    if (!acc[m.ticket_id]) acc[m.ticket_id] = [];
    acc[m.ticket_id].push(m);
    return acc;
  }, {});

  const ticketEntries = Object.entries(grouped).map(([ticketId, msgs]) => {
    const ticket = tickets.find(t => t.id === ticketId);
    const unreadMsgs = msgs.filter(m => !(m.read_by || []).includes(currentUser.email));
    const allRead = unreadMsgs.length === 0;
    return { ticket, msgs, unreadMsgs, allRead };
  }).filter(e => e.ticket).sort((a, b) => {
    // Unread first, then by latest sent_at
    if (a.allRead !== b.allRead) return a.allRead ? 1 : -1;
    const aLatest = a.msgs[0]?.sent_at || "";
    const bLatest = b.msgs[0]?.sent_at || "";
    return bLatest.localeCompare(aLatest);
  });

  const totalUnread = visibleMessages.filter(m => !(m.read_by || []).includes(currentUser?.email)).length;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={`relative backdrop-blur-md border shadow-lg flex items-center justify-center transition-all ${
            variant === "inline"
              ? `rounded-xl h-11 px-3 md:px-4 gap-2 ${
                  totalUnread > 0
                    ? "bg-red-500/90 hover:bg-red-500 border-red-300 text-white animate-pulse-soft"
                    : "bg-white/70 hover:bg-white/80 border-white/80 text-gray-900"
                }`
              : "bg-white/20 hover:bg-white/30 border-white/40 text-white rounded-full w-10 h-10"
          }`}
          title="Notifications"
        >
          <Bell className={variant === "inline" ? "w-5 h-5" : "w-4 h-4"} />
          {variant === "inline" && totalUnread > 0 && (
            <span className="hidden md:inline font-semibold text-sm">
              {totalUnread} new
            </span>
          )}
          {totalUnread > 0 && (
            <span className={`absolute bg-red-600 text-white font-bold rounded-full flex items-center justify-center shadow-md ring-2 ring-white ${
              variant === "inline"
                ? "-top-1.5 -right-1.5 text-[10px] min-w-[20px] h-[20px] px-1 md:hidden"
                : "-top-1 -right-1 text-[10px] min-w-[18px] h-[18px] px-1"
            }`}>
              {totalUnread > 99 ? "99+" : totalUnread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 max-h-[480px] overflow-y-auto">
        <div className="px-4 py-3 border-b bg-gradient-to-r from-pink-50 to-purple-50">
          <h3 className="font-semibold text-gray-900">Notifications</h3>
          <p className="text-xs text-gray-600">
            {totalUnread === 0 ? "You're all caught up 🎉" : `${totalUnread} new client repl${totalUnread === 1 ? "y" : "ies"}`}
          </p>
        </div>

        {ticketEntries.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">
            No new replies on your tickets.
          </div>
        ) : (
          <div className="divide-y">
            {ticketEntries.map(({ ticket, msgs, unreadMsgs, allRead }) => {
              const latest = msgs[0];
              return (
                <div
                  key={ticket.id}
                  className={`flex items-stretch transition-colors ${allRead ? "opacity-50 hover:opacity-70" : "hover:bg-pink-50"}`}
                >
                  <button
                    onClick={() => {
                      setOpen(false);
                      onTicketClick(ticket, latest?.id);
                    }}
                    className="flex-1 text-left px-4 py-3 min-w-0"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`font-semibold text-sm truncate ${allRead ? "text-gray-600" : "text-gray-900"}`}>{ticket.client_name}</span>
                        {!allRead && (
                          <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 flex-shrink-0">
                            {unreadMsgs.length}
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
                  </button>
                  {!allRead && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markTicketAsRead(unreadMsgs);
                      }}
                      title="Mark as read"
                      className="flex-shrink-0 px-3 flex items-center justify-center text-gray-400 hover:text-green-600 hover:bg-green-50 border-l border-gray-100 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DropdownMenuContent>
      <style jsx>{`
        @keyframes pulse-soft {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5); }
          50% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
        }
        .animate-pulse-soft {
          animation: pulse-soft 2s ease-in-out infinite;
        }
      `}</style>
    </DropdownMenu>
  );
}