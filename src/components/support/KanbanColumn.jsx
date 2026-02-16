import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Draggable } from "@hello-pangea/dnd";
import { Archive } from "lucide-react";
import TicketCard from "./TicketCard";

const columnColors = {
  "New": "from-pink-400/20 to-pink-300/20 border-pink-300/40",
  "In Progress": "from-blue-400/20 to-blue-300/20 border-blue-300/40",
  "Resolved": "from-green-400/20 to-green-300/20 border-green-300/40",
  "Closed": "from-gray-400/20 to-gray-300/20 border-gray-300/40",
  "General Inquiry": "from-blue-400/20 to-blue-300/20 border-blue-300/40",
  "Membership Inquiry": "from-purple-400/20 to-purple-300/20 border-purple-300/40",
  "Private Events": "from-pink-400/20 to-pink-300/20 border-pink-300/40",
  "Cancellation": "from-red-400/20 to-red-300/20 border-red-300/40",
  "Other": "from-gray-400/20 to-gray-300/20 border-gray-300/40"
};

const headerColors = {
  "New": "bg-pink-500/30 border-pink-400/40",
  "In Progress": "bg-blue-500/30 border-blue-400/40",
  "Resolved": "bg-green-500/30 border-green-400/40",
  "Closed": "bg-gray-500/30 border-gray-400/40",
  "General Inquiry": "bg-blue-500/30 border-blue-400/40",
  "Membership Inquiry": "bg-purple-500/30 border-purple-400/40",
  "Private Events": "bg-pink-500/30 border-pink-400/40",
  "Cancellation": "bg-red-500/30 border-red-400/40",
  "Other": "bg-gray-500/30 border-gray-400/40"
};

export default function KanbanColumn({ status, tickets, onStatusChange, onTicketClick, isLoading, highlightedTicketId, onArchiveAll, viewMode, allUsers }) {
  return (
    <div className={`backdrop-blur-xl bg-gradient-to-b ${columnColors[status]} border rounded-2xl overflow-hidden shadow-xl flex flex-col md:h-[calc(100vh-250px)] md:min-h-[600px]`}>
      {/* Column Header */}
      <div className={`backdrop-blur-md ${headerColors[status]} border-b px-3 md:px-4 py-3 md:py-4 flex-shrink-0`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-white font-semibold text-base md:text-lg truncate">{status}</h3>
          <span className="backdrop-blur-sm bg-white/30 text-white text-xs md:text-sm font-medium px-2 md:px-3 py-0.5 md:py-1 rounded-full border border-white/40">
            {tickets.length}
          </span>
        </div>
        
        {/* Clear All Button for Closed Column */}
        {status === "Closed" && onArchiveAll && tickets.length > 0 && (
          <Button
            onClick={onArchiveAll}
            size="sm"
            className="w-full mt-2 h-7 md:h-8 backdrop-blur-md bg-white/20 hover:bg-white/30 text-white border border-white/40 text-xs"
          >
            <Archive className="w-3 h-3 mr-1.5" />
            Archive All ({tickets.length})
          </Button>
        )}
      </div>

      {/* Tickets Container */}
      <div className="flex-1 overflow-y-auto p-2 md:p-4 space-y-2 md:space-y-3 custom-scrollbar">
        {isLoading ? (
          <>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 md:h-32 rounded-xl bg-white/20" />
            ))}
          </>
        ) : tickets.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-white/60 text-xs md:text-sm">No tickets</p>
          </div>
        ) : (
          tickets.map((ticket, index) => (
            <Draggable key={ticket.id} draggableId={ticket.id} index={index}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                  style={{
                    ...provided.draggableProps.style,
                    opacity: snapshot.isDragging ? 1 : undefined,
                  }}
                >
                  <TicketCard
                    ticket={ticket}
                    onStatusChange={onStatusChange}
                    onClick={() => !snapshot.isDragging && onTicketClick(ticket)}
                    isDragging={snapshot.isDragging}
                    isHighlighted={ticket.id === highlightedTicketId}
                    allUsers={allUsers}
                  />
                </div>
              )}
            </Draggable>
          ))
        )}
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.4);
        }
      `}</style>
    </div>
  );
}