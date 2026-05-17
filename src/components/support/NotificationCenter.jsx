import React, { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Bell, Check, MessageSquare, Bug } from "lucide-react";
import { motion, useAnimationControls, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import NotificationRow from "./NotificationRow";

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
      // Fetch recent messages across both directions so we can detect tickets
      // that have already been replied to (latest message is outbound).
      const recent = await base44.entities.EmailMessage.filter(
        {}, "-sent_at", 400
      );
      // Determine the most recent message per ticket; if it's outbound,
      // suppress unread badges for that ticket entirely.
      const latestByTicket = {};
      for (const m of recent) {
        if (!latestByTicket[m.ticket_id]) latestByTicket[m.ticket_id] = m;
      }
      const repliedTicketIds = new Set(
        Object.entries(latestByTicket)
          .filter(([, m]) => m.direction === "outbound")
          .map(([tid]) => tid)
      );
      const keepReadCutoff = Date.now() - KEEP_READ_HOURS * 60 * 60 * 1000;
      return recent.filter(m => {
        if (m.direction !== "inbound") return false;
        if (!myTicketIds.includes(m.ticket_id)) return false;
        if (repliedTicketIds.has(m.ticket_id)) return false;
        const isRead = (m.read_by || []).includes(currentUser.email);
        if (!isRead) return true; // unread always visible
        // Read: keep visible only if marked-read timestamp is within window
        const readAt = getReadAt(m, currentUser.email);
        if (!readAt) return false; // read but no timestamp -> already dismissed
        return readAt >= keepReadCutoff;
      });
    },
    enabled: !!currentUser?.email && myTicketIds.length > 0,
  });

  // Real-time: refresh on any EmailMessage change
  useEffect(() => {
    if (!currentUser?.email) return;
    const unsubscribe = base44.entities.EmailMessage.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["unread-emails"] });
      queryClient.invalidateQueries({ queryKey: ["unread-by-ticket"] });
    });
    return () => unsubscribe?.();
  }, [currentUser?.email, queryClient]);

  // Bug report replies (vendor responses on escalation threads)
  const { data: bugReports = [] } = useQuery({
    queryKey: ["bug-reports-notifications"],
    queryFn: () => base44.entities.BugReport.list("-created_date", 50),
    enabled: !!currentUser?.email,
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (!currentUser?.email) return;
    const unsub = base44.entities.BugReport.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["bug-reports-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["bug-reports"] });
    });
    return () => unsub?.();
  }, [currentUser?.email, queryClient]);

  const bugReportsWithUnread = bugReports
    .map(r => {
      const replies = r.replies || [];
      const unread = replies.filter(rep => !(rep.read_by || []).includes(currentUser?.email));
      return { report: r, replies, unread };
    })
    .filter(x => x.unread.length > 0)
    .sort((a, b) => {
      const aLatest = a.unread[a.unread.length - 1]?.received_at || "";
      const bLatest = b.unread[b.unread.length - 1]?.received_at || "";
      return bLatest.localeCompare(aLatest);
    });

  const markBugReportRead = async (reportEntry) => {
    if (!currentUser?.email) return;
    const updated = reportEntry.replies.map(r => {
      const readBy = r.read_by || [];
      if (readBy.includes(currentUser.email)) return r;
      return { ...r, read_by: [...readBy, currentUser.email] };
    });
    try {
      await base44.entities.BugReport.update(reportEntry.report.id, { replies: updated });
      queryClient.invalidateQueries({ queryKey: ["bug-reports-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["bug-reports"] });
    } catch (e) {
      console.error("Failed to mark bug report replies read", e);
    }
  };

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

  const unreadEmailCount = visibleMessages.filter(m => !(m.read_by || []).includes(currentUser?.email)).length;
  const unreadBugReplyCount = bugReportsWithUnread.reduce((sum, x) => sum + x.unread.length, 0);
  const totalUnread = unreadEmailCount + unreadBugReplyCount;

  // Bell wiggle when a new unread arrives
  const bellControls = useAnimationControls();
  const prevUnreadRef = useRef(totalUnread);
  useEffect(() => {
    if (totalUnread > prevUnreadRef.current) {
      bellControls.start({
        rotate: [0, -15, 15, -12, 12, -8, 8, 0],
        transition: { duration: 0.7, ease: "easeInOut" },
      });
    }
    prevUnreadRef.current = totalUnread;
  }, [totalUnread, bellControls]);

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
          <motion.span animate={bellControls} style={{ display: "inline-flex", transformOrigin: "50% 0%" }}>
            <Bell className={variant === "inline" ? "w-5 h-5" : "w-4 h-4"} />
          </motion.span>
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
            {totalUnread === 0
              ? "You're all caught up 🎉"
              : [
                  unreadEmailCount > 0 ? `${unreadEmailCount} client repl${unreadEmailCount === 1 ? "y" : "ies"}` : null,
                  unreadBugReplyCount > 0 ? `${unreadBugReplyCount} bug report repl${unreadBugReplyCount === 1 ? "y" : "ies"}` : null,
                ].filter(Boolean).join(" • ")}
          </p>
        </div>

        {ticketEntries.length === 0 && bugReportsWithUnread.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">
            No new replies.
          </div>
        ) : (
          <div className="divide-y">
            <AnimatePresence initial={false}>
              {ticketEntries.map(({ ticket, msgs, unreadMsgs, allRead }) => {
                const latest = msgs[0];
                return (
                  <NotificationRow
                    key={ticket.id}
                    ticket={ticket}
                    latest={latest}
                    unreadCount={unreadMsgs.length}
                    allRead={allRead}
                    onOpen={() => {
                      setOpen(false);
                      onTicketClick(ticket, latest?.id);
                      if (!allRead) markTicketAsRead(unreadMsgs);
                    }}
                    onMarkRead={() => markTicketAsRead(unreadMsgs)}
                  />
                );
              })}
            </AnimatePresence>

            {bugReportsWithUnread.length > 0 && (
              <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-slate-500 font-semibold bg-slate-50 flex items-center gap-1">
                <Bug className="w-3 h-3" /> Bug report replies
              </div>
            )}
            {bugReportsWithUnread.map(entry => {
              const latest = entry.unread[entry.unread.length - 1];
              return (
                <button
                  key={entry.report.id}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    markBugReportRead(entry);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 transition flex items-start gap-2"
                >
                  <span className="mt-1 inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#b67651]/10 text-[#b67651] flex-shrink-0">
                    <MessageSquare className="w-3.5 h-3.5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800 truncate">
                        {latest.from_name || latest.from_email}
                      </span>
                      <span className="text-[10px] font-bold bg-blue-600 text-white rounded-full px-1.5">
                        {entry.unread.length}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      Re: {entry.report.description?.slice(0, 60) || "Bug report"}
                    </div>
                    <div className="text-xs text-slate-600 truncate mt-0.5">
                      {latest.snippet || latest.body_text?.slice(0, 100)}
                    </div>
                  </div>
                </button>
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