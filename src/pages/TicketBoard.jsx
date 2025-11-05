
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import KanbanColumn from "../components/support/KanbanColumn";
import TicketDetailsModal from "../components/support/TicketDetailsModal";

export default function TicketBoard() {
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [dragNoteDialog, setDragNoteDialog] = useState(null);
  const queryClient = useQueryClient();

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['support-tickets'],
    queryFn: () => base44.entities.SupportTicket.list("-created_date"),
    refetchInterval: 5000
  });

  const updateTicketMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SupportTicket.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
    }
  });

  const handleStatusChange = (ticketId, newStatus, note = "") => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;

    const statusHistory = ticket.status_history || [];
    statusHistory.push({
      status: newStatus,
      note: note,
      timestamp: new Date().toISOString()
    });

    updateTicketMutation.mutate({
      id: ticketId,
      data: { 
        status: newStatus,
        status_history: statusHistory
      }
    });
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const ticketId = result.draggableId;
    const newStatus = result.destination.droppableId;
    const ticket = tickets.find(t => t.id === ticketId);

    if (!ticket || ticket.status === newStatus) return;

    // Open dialog to ask for note
    setDragNoteDialog({
      ticketId,
      newStatus,
      oldStatus: ticket.status,
      ticketName: ticket.client_name
    });
  };

  const handleConfirmStatusChange = (note) => {
    if (dragNoteDialog) {
      handleStatusChange(dragNoteDialog.ticketId, dragNoteDialog.newStatus, note);
      setDragNoteDialog(null);
    }
  };

  const columns = ["New", "In Progress", "Resolved", "Closed"];

  const getTicketsByStatus = (status) => {
    return tickets.filter(ticket => ticket.status === status);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-[#f1899b] via-[#f7b1bd] to-[#fbe0e2] relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#b67651]/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">
              Support Tickets
            </h1>
            <p className="text-white/90">
              {tickets.length} total tickets • {getTicketsByStatus("New").length} new
            </p>
          </div>
          <Link to={createPageUrl("IntakeForm")} target="_blank">
            <Button className="backdrop-blur-md bg-white/30 border border-white/40 text-white hover:bg-white/40 rounded-xl h-11 px-6 shadow-lg">
              <ExternalLink className="w-4 h-4 mr-2" />
              View Public Form
            </Button>
          </Link>
        </div>

        {/* Kanban Board with Drag & Drop */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {columns.map((status) => (
              <Droppable key={status} droppableId={status}>
                {(provided, snapshot) => (
                  <div 
                    ref={provided.innerRef} 
                    {...provided.droppableProps}
                    className={`transition-all duration-200 ${
                      snapshot.isDraggingOver ? 'ring-4 ring-white/50 scale-102' : ''
                    }`}
                  >
                    <KanbanColumn
                      status={status}
                      tickets={getTicketsByStatus(status)}
                      onStatusChange={handleStatusChange}
                      onTicketClick={setSelectedTicket}
                      isLoading={isLoading}
                    />
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      </div>

      {/* Status Change Note Dialog */}
      {dragNoteDialog && (
        <StatusChangeDialog
          data={dragNoteDialog}
          onConfirm={handleConfirmStatusChange}
          onCancel={() => setDragNoteDialog(null)}
        />
      )}

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <TicketDetailsModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onStatusChange={handleStatusChange}
          onTicketClick={setSelectedTicket}
        />
      )}
    </div>
  );
}

function StatusChangeDialog({ data, onConfirm, onCancel }) {
  const [note, setNote] = useState("");

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="backdrop-blur-2xl bg-white/95 border-white/40">
        <DialogHeader>
          <DialogTitle>Moving Ticket</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-gray-700">
            Moving <strong>{data.ticketName}</strong> from{" "}
            <span className="text-blue-600 font-medium">{data.oldStatus}</span> to{" "}
            <span className="text-green-600 font-medium">{data.newStatus}</span>
          </p>
          <div className="space-y-2">
            <Label htmlFor="status-note">Add a note (optional)</Label>
            <Textarea
              id="status-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., Spoke with client, confirmed resolution..."
              className="min-h-24"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm(note)}
            className="bg-[#b67651] hover:bg-[#a56541] text-white"
          >
            Update Status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
