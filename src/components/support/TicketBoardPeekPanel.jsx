import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { LayoutDashboard, X, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import KanbanColumn from "@/components/support/KanbanColumn";
import TicketDetailsModal from "@/components/support/TicketDetailsModal";

const STATUS_COLUMNS = ["New", "In Progress", "Resolved", "Closed"];

export default function TicketBoardPeekPanel({ currentUser }) {
  const [open, setOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["support-tickets-peek"],
    queryFn: () => base44.entities.SupportTicket.list("-created_date"),
    refetchInterval: 15000,
    enabled: !!currentUser,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await base44.functions.invoke("getUsersForSelection", {});
      return res.data?.users || [];
    },
    enabled: !!currentUser,
  });

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (selectedTicket) setSelectedTicket(null);
        else if (open) setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, selectedTicket]);

  const isOwner = currentUser?.email === "info@pilatesinpinkstudio.com";

  const getTicketsByColumn = (column) => {
    let filtered = tickets.filter((t) => t.status === column && !t.archived);
    if (!isOwner) {
      filtered = filtered.filter((t) => t.assigned_to === currentUser?.email);
    }
    return filtered;
  };

  const activeCount = tickets.filter(
    (t) => !t.archived && (isOwner || t.assigned_to === currentUser?.email)
  ).length;

  return (
    <>
      {/* Backdrop blur when expanded */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/10 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Peeking tab + expanded panel (left edge) */}
      <div
        className={`fixed top-1/2 -translate-y-1/2 left-0 z-50 flex items-stretch transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-[calc(100%-28px)]"
        }`}
        style={{ height: open ? "min(80vh, 720px)" : undefined }}
      >
        {/* Panel content */}
        <div
          className="w-[min(92vw,1100px)] bg-white shadow-2xl border-y border-r border-slate-200 rounded-r-xl flex flex-col overflow-hidden"
          style={{ height: open ? "min(80vh, 720px)" : undefined }}
        >
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-[#f1899b] to-[#e8718a] text-white flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4" />
              <div>
                <div className="font-semibold text-sm">TicketBoard</div>
                <div className="text-[11px] text-white/80">
                  {activeCount} active ticket{activeCount === 1 ? "" : "s"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Link
                to={createPageUrl("TicketBoard")}
                onClick={() => setOpen(false)}
                className="p-1 hover:bg-white/20 rounded-lg transition"
                title="Open full TicketBoard"
              >
                <ExternalLink className="w-4 h-4" />
              </Link>
              <button
                onClick={() => setOpen(false)}
                className="p-1 hover:bg-white/20 rounded-lg transition"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Swimlanes */}
          <div className="flex-1 overflow-y-auto bg-gradient-to-b from-[#fbe0e2] to-white p-4">
            {isLoading ? (
              <div className="p-4 text-center text-slate-500 text-sm">Loading tickets...</div>
            ) : (
              <div className="flex lg:grid lg:grid-cols-4 gap-4 overflow-x-auto h-full snap-x snap-mandatory lg:snap-none">
                {STATUS_COLUMNS.map((column) => (
                  <div
                    key={column}
                    className="flex-shrink-0 w-[85%] sm:w-[60%] md:w-[45%] lg:w-auto snap-start lg:snap-align-none"
                  >
                    <KanbanColumn
                      status={column}
                      tickets={getTicketsByColumn(column)}
                      onStatusChange={() => {}}
                      onTicketClick={setSelectedTicket}
                      isLoading={isLoading}
                      highlightedTicketId={null}
                      viewMode="status"
                      allUsers={allUsers}
                      unreadByTicket={{}}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Peek tab (always visible sliver) */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-7 py-3 flex flex-col items-center justify-center gap-1.5 bg-gradient-to-b from-[#f1899b] to-[#e8718a] text-white rounded-r-xl shadow-2xl border-y border-r border-white/30 hover:from-[#e8718a] hover:to-[#d85f7a] transition-colors self-center"
          title="TicketBoard"
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <div
            className="text-[9px] font-bold tracking-wider whitespace-nowrap"
            style={{ writingMode: "vertical-rl" }}
          >
            TICKETBOARD
          </div>
          {activeCount > 0 && (
            <span className="text-[10px] font-bold bg-white text-[#e8718a] rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {/* Ticket details modal */}
      {selectedTicket && (
        <TicketDetailsModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onStatusChange={() => {}}
          onTicketClick={setSelectedTicket}
          currentUser={currentUser}
          isOwner={isOwner}
          allUsers={allUsers}
        />
      )}
    </>
  );
}