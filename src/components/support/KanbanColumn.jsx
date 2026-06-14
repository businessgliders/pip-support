import React from "react";
import ReactDOM from "react-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Draggable, Droppable } from "@hello-pangea/dnd";
import { Archive, Sparkles } from "lucide-react";
import TicketCard from "./TicketCard";
import {
  COLUMN_COLOR_CLASSES,
  COLUMN_HEADER_CLASSES,
  DEFAULT_COLOR,
  DEFAULT_HEADER,
} from "./columnTheme";

export default function KanbanColumn({
  status, tickets, onStatusChange, onTicketClick, isLoading, highlightedTicketId,
  onArchiveSome, onArchiveAll, onTidyUp, viewMode, allUsers, unreadByTicket = {},
}) {
  const colorClass = COLUMN_COLOR_CLASSES[status] || DEFAULT_COLOR;
  const headerClass = COLUMN_HEADER_CLASSES[status] || DEFAULT_HEADER;

  return (
    <div
      className={`backdrop-blur-xl bg-gradient-to-b ${colorClass} border rounded-2xl overflow-hidden shadow-xl flex flex-col h-[calc(100dvh-260px)] lg:h-[calc(100vh-220px)]`}
    >
      {/* Column Header — translucent colored bar (pip-events) */}
      <div className={`px-4 py-3 flex-shrink-0 backdrop-blur-md ${headerClass} border-b`}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-white text-sm md:text-base truncate drop-shadow">
            {status}
          </h3>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/30 text-white border border-white/40">
            {tickets.length}
          </span>
        </div>

        {/* Tidy Up — Resolved column */}
        {status === "Resolved" && onTidyUp && tickets.length > 0 && (
          <Button
            onClick={onTidyUp}
            size="sm"
            className="w-full h-7 mt-2 bg-white/30 hover:bg-white/40 text-white border border-white/40 text-xs"
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
                className="flex-1 h-7 bg-white/30 hover:bg-white/40 text-white border border-white/40 text-xs"
              >
                <Archive className="w-3 h-3 mr-1 hidden sm:inline-block" />
                Clean Up
              </Button>
            )}
            {onArchiveAll && (
              <Button
                onClick={onArchiveAll}
                size="sm"
                className="flex-1 h-7 bg-white/30 hover:bg-white/40 text-white border border-white/40 text-xs"
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
              dropSnapshot.isDraggingOver ? "bg-white/10" : ""
            }`}
            style={{ position: "static" }}
          >
            {isLoading ? (
              <>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 md:h-32 rounded-xl bg-white/20" />
                ))}
              </>
            ) : tickets.length === 0 ? (
              <div className="flex items-center justify-center h-full min-h-[100px]">
                <p className="text-white/60 text-xs md:text-sm">No tickets</p>
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
          background: rgba(255,255,255,0.3); border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.5); }
      `}</style>
    </div>
  );
}