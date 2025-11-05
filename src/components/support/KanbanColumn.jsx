import React from "react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Draggable } from "@hello-pangea/dnd";
import TicketCard from "./TicketCard";

const columnColors = {
  "New": "from-pink-400/20 to-pink-300/20 border-pink-300/40",
  "In Progress": "from-blue-400/20 to-blue-300/20 border-blue-300/40",
  "Resolved": "from-green-400/20 to-green-300/20 border-green-300/40",
  "Closed": "from-gray-400/20 to-gray-300/20 border-gray-300/40"
};

const headerColors = {
  "New": "bg-pink-500/30 border-pink-400/40",
  "In Progress": "bg-blue-500/30 border-blue-400/40",
  "Resolved": "bg-green-500/30 border-green-400/40",
  "Closed": "bg-gray-500/30 border-gray-400/40"
};

export default function KanbanColumn({ status, tickets, onStatusChange, onTicketClick, isLoading }) {
  return (
    <div className={`backdrop-blur-xl bg-gradient-to-b ${columnColors[status]} border rounded-2xl overflow-hidden shadow-xl flex flex-col h-[calc(100vh-250px)] min-h-[600px]`}>
      {/* Column Header */}
      <div className={`backdrop-blur-md ${headerColors[status]} border-b px-4 py-4 flex-shrink-0`}>
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold text-lg">{status}</h3>
          <span className="backdrop-blur-sm bg-white/30 text-white text-sm font-medium px-3 py-1 rounded-full border border-white/40">
            {tickets.length}
          </span>
        </div>
      </div>

      {/* Tickets Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {isLoading ? (
          <>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 rounded-xl bg-white/20" />
            ))}
          </>
        ) : tickets.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-white/60 text-sm">No tickets</p>
          </div>
        ) : (
          tickets.map((ticket, index) => (
            <Draggable key={ticket.id} draggableId={ticket.id} index={index}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    style={{
                      ...provided.draggableProps.style,
                      transform: snapshot.isDragging
                        ? provided.draggableProps.style?.transform
                        : "none",
                    }}
                  >
                    <TicketCard
                      ticket={ticket}
                      onStatusChange={onStatusChange}
                      onClick={() => onTicketClick(ticket)}
                      isDragging={snapshot.isDragging}
                    />
                  </motion.div>
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