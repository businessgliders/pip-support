import React from "react";
import ReactDOM from "react-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Draggable, Droppable } from "@hello-pangea/dnd";
import { Archive, Sparkles } from "lucide-react";
import TicketCard from "./TicketCard";

// pip-events style palette: soft pastel header strip + clean white column body
const headerTheme = {
  "New":                 { bg: "#fde4d4", text: "#9a3412", accent: "#fb923c" },
  "In Progress":         { bg: "#dbeafe", text: "#1e40af", accent: "#3b82f6" },
  "Resolved":            { bg: "#d1fae5", text: "#065f46", accent: "#10b981" },
  "Closed":              { bg: "#e5e7eb", text: "#374151", accent: "#9ca3af" },
  "General Inquiry":     { bg: "#dbeafe", text: "#1e40af", accent: "#3b82f6" },
  "Membership Inquiry":  { bg: "#ede9fe", text: "#5b21b6", accent: "#8b5cf6" },
  "Private Events":      { bg: "#fce7f3", text: "#9d174d", accent: "#ec4899" },
  "Cancellation":        { bg: "#fee2e2", text: "#991b1b", accent: "#ef4444" },
  "Other":               { bg: "#f3f4f6", text: "#374151", accent: "#9ca3af" },
};

export default function KanbanColumn({
  status, tickets, onStatusChange, onTicketClick, isLoading, highlightedTicketId,
  onArchiveSome, onArchiveAll, onTidyUp, viewMode, allUsers, unreadByTicket = {},
}) {
  const theme = headerTheme[status] || headerTheme["Other"];
  const isDimmed = status === "Closed";

  return (
    <div
      className={`bg-white/95 backdrop-blur-sm border border-white rounded-2xl overflow-hidden shadow-lg flex flex-col h-[calc(100dvh-260px)] lg:h-[calc(100vh-220px)] ${
        isDimmed ? "opacity-70 hover:opacity-100 transition-opacity" : ""
      }`}
    >
      {/* Column Header — soft pastel strip in pip-events style */}
      <div
        className="px-4 py-3 flex-shrink-0 border-b border-black/5"
        style={{ background: theme.bg }}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: theme.accent }}
              aria-hidden="true"
            />
            <h3
              className="font-semibold text-sm md:text-base truncate"
              style={{ color: theme.text }}
            >
              {status}
            </h3>
          </div>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/70 border"
            style={{ color: theme.text, borderColor: "rgba(0,0,0,0.06)" }}
          >
            {tickets.length}
          </span>
        </div>

        {/* Tidy Up — Resolved column */}
        {status === "Resolved" && onTidyUp && tickets.length > 0 && (
          <Button
            onClick={onTidyUp}
            size="sm"
            className="w-full h-7 mt-2 bg-white/80 hover:bg-white text-gray-800 border border-black/5 text-xs shadow-sm"
          >
            <Sparkles className="w-3 h-3 mr-1.5" />
            Tidy Up
          </Button>
        )}

        {/* Clear/Archive — Closed column */}
        {status === "Closed" && (onArchiveSome || onArchiveAll) && tickets.length > 0 && (
          <div className="flex gap-2 mt-2">
            {onArchiveSome && (
              <Button
                onClick={onArchiveSome}
                size="sm"
                className="flex-1 h-7 bg-white/80 hover:bg-white text-gray-800 border border-black/5 text-xs shadow-sm"
              >
                <Archive className="w-3 h-3 mr-1 hidden sm:inline-block" />
                Clean Up
              </Button>
            )}
            {onArchiveAll && (
              <Button
                onClick={onArchiveAll}
                size="sm"
                className="flex-1 h-7 bg-white/80 hover:bg-white text-gray-800 border border-black/5 text-xs shadow-sm"
              >
                <Archive className="w-3 h-3 mr-1 hidden sm:inline-block" />
                Archive All
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Tickets Container */}
      <Droppable droppableId={status}>
        {(dropProvided, dropSnapshot) => (
          <div
            ref={dropProvided.innerRef}
            {...dropProvided.droppableProps}
            className={`flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar transition-colors ${
              dropSnapshot.isDraggingOver ? "bg-pink-50/50" : "bg-white/60"
            }`}
            style={{ position: "static" }}
          >
            {isLoading ? (
              <>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 md:h-32 rounded-xl bg-gray-100" />
                ))}
              </>
            ) : tickets.length === 0 ? (
              <div className="flex items-center justify-center h-full min-h-[100px]">
                <p className="text-gray-400 text-xs md:text-sm">No tickets</p>
              </div>
            ) : (
              tickets.map((ticket, index) => (
                <Draggable key={ticket.id} draggableId={ticket.id} index={index}>
                  {(provided, snapshot) => {
                    const child = (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        style={{
                          ...provided.draggableProps.style,
                          zIndex: snapshot.isDragging ? 9999 : "auto",
                        }}
                      >
                        <TicketCard
                          ticket={ticket}
                          onStatusChange={onStatusChange}
                          onClick={() => !snapshot.isDragging && onTicketClick(ticket)}
                          isDragging={snapshot.isDragging}
                          isHighlighted={ticket.id === highlightedTicketId}
                          allUsers={allUsers}
                          viewMode={viewMode}
                          unreadCount={unreadByTicket[ticket.id] || 0}
                        />
                      </div>
                    );
                    if (snapshot.isDragging && typeof document !== "undefined") {
                      return ReactDOM.createPortal(child, document.body);
                    }
                    return child;
                  }}
                </Draggable>
              ))
            )}
            {dropProvided.placeholder}
          </div>
        )}
      </Droppable>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.1); border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.2); }
      `}</style>
    </div>
  );
}