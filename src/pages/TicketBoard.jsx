
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ExternalLink, Bell, BellOff, Archive, X } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import KanbanColumn from "../components/support/KanbanColumn";
import TicketDetailsModal from "../components/support/TicketDetailsModal";

export default function TicketBoard() {
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [dragNoteDialog, setDragNoteDialog] = useState(null);
  const [highlightedTicketId, setHighlightedTicketId] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [seenTicketIds, setSeenTicketIds] = useState(new Set());
  const [showArchived, setShowArchived] = useState(false);
  const [viewMode, setViewMode] = useState("status"); // "status" or "category"
  const queryClient = useQueryClient();

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['support-tickets'],
    queryFn: () => base44.entities.SupportTicket.list("-created_date"),
    refetchInterval: 5000
  });

  // Request notification permission
  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      alert("This browser does not support desktop notifications");
      return;
    }

    if (Notification.permission === "granted") {
      setNotificationsEnabled(true);
      return;
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setNotificationsEnabled(true);
        new Notification("Notifications Enabled! 🔔", {
          body: "You'll now receive alerts for new support tickets",
          icon: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_690aada19e27fe8fcf067828/45da48106_Pilatesinpinklogojusticon1.png"
        });
      }
    }
  };

  // Check for new tickets and show notifications
  useEffect(() => {
    if (!notificationsEnabled || tickets.length === 0) return;

    // Initialize seen tickets on first load
    if (seenTicketIds.size === 0) {
      setSeenTicketIds(new Set(tickets.map(t => t.id)));
      return;
    }

    // Check for new tickets
    tickets.forEach(ticket => {
      if (!seenTicketIds.has(ticket.id) && ticket.status === "New") {
        // Show notification
        const notification = new Notification(`🎫 New ${ticket.inquiry_type}`, {
          body: `From: ${ticket.client_name}\n${ticket.client_email}`,
          icon: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_690aada19e27fe8fcf067828/45da48106_Pilatesinpinklogojusticon1.png",
          badge: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_690aada19e27fe8fcf067828/45da48106_Pilatesinpinklogojusticon1.png",
          tag: ticket.id,
          requireInteraction: ticket.inquiry_type === "Cancellation"
        });

        // Click to open ticket
        notification.onclick = () => {
          window.focus();
          setHighlightedTicketId(ticket.id);
          setTimeout(() => setSelectedTicket(ticket), 500);
          setTimeout(() => setHighlightedTicketId(null), 3000);
          notification.close();
        };

        // Mark as seen
        setSeenTicketIds(prev => new Set([...prev, ticket.id]));
      }
    });
  }, [tickets, notificationsEnabled, seenTicketIds]);

  // Check notification permission on load
  useEffect(() => {
    if (Notification.permission === "granted") {
      setNotificationsEnabled(true);
      // Initialize seen tickets
      setSeenTicketIds(new Set(tickets.map(t => t.id)));
    }
  }, []);

  // Check URL for ticket parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ticketId = urlParams.get('ticket');
    
    if (ticketId && tickets.length > 0) {
      const ticket = tickets.find(t => t.id === ticketId);
      if (ticket) {
        setHighlightedTicketId(ticketId);
        setTimeout(() => {
          setSelectedTicket(ticket);
        }, 500);
        setTimeout(() => {
          setHighlightedTicketId(null);
        }, 3000);
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [tickets]);

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

  const handleArchiveAll = async () => {
    const closedTickets = tickets.filter(t => t.status === "Closed" && !t.archived);
    
    if (closedTickets.length === 0) return;
    
    if (!confirm(`Archive ${closedTickets.length} closed ticket(s)? They can be restored later from the archive.`)) {
      return;
    }

    for (const ticket of closedTickets) {
      await updateTicketMutation.mutateAsync({
        id: ticket.id,
        data: { archived: true }
      });
    }
  };

  const handleRestoreTicket = (ticketId) => {
    updateTicketMutation.mutate({
      id: ticketId,
      data: { archived: false }
    });
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const ticketId = result.draggableId;
    const newColumn = result.destination.droppableId;
    const ticket = tickets.find(t => t.id === ticketId);

    if (!ticket) return;

    // Only allow drag-and-drop for status changes if in status view
    if (viewMode === "status" && ticket.status === newColumn) return;
    // Only allow drag-and-drop for category changes if in category view
    if (viewMode === "category" && ticket.inquiry_type === newColumn) return;

    // If changing category, we don't automatically change status
    // If changing status, we need to know the new status
    let newStatus = ticket.status;
    let newInquiryType = ticket.inquiry_type;

    if (viewMode === "status") {
      newStatus = newColumn;
    } else if (viewMode === "category") {
      newInquiryType = newColumn;
      // We don't want to show a note dialog for category changes only.
      // If categories are changing, we only update the category and don't prompt for a note
      // The prompt suggests a note for status change.
      updateTicketMutation.mutate({
        id: ticketId,
        data: { inquiry_type: newInquiryType }
      });
      return; // Skip the dialog
    }

    setDragNoteDialog({
      ticketId,
      newStatus: newStatus, // Will be the same as old status if viewMode is "category"
      oldStatus: ticket.status,
      ticketName: ticket.client_name,
      // Pass newColumn as the identifier for the dialog
      newColumn: newColumn, 
      oldColumn: viewMode === "status" ? ticket.status : ticket.inquiry_type,
      viewMode: viewMode
    });
  };

  const handleConfirmStatusChange = (note) => {
    if (dragNoteDialog) {
      // If we are in status view, newColumn is newStatus
      // If we are in category view, we wouldn't reach this dialog as per above logic in handleDragEnd
      handleStatusChange(dragNoteDialog.ticketId, dragNoteDialog.newColumn, note);
      setDragNoteDialog(null);
    }
  };

  const columns = viewMode === "status" 
    ? ["New", "In Progress", "Resolved", "Closed"]
    : ["General Inquiry", "Membership Inquiry", "Private Events", "Cancellation", "Other"];

  const getTicketsByColumn = (column) => {
    // This function is only called when showArchived is false,
    // as the archived view has its own rendering logic.
    if (viewMode === "status") {
      return tickets.filter(ticket => ticket.status === column && !ticket.archived);
    } else { // viewMode === "category"
      return tickets.filter(ticket => ticket.inquiry_type === column && !ticket.archived);
    }
  };

  const formatDateEST = (date) => {
    return new Date(date).toLocaleString('en-US', {
      timeZone: 'America/New_York',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const activeTickets = tickets.filter(t => !t.archived);
  const archivedTickets = tickets.filter(t => t.archived);

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
              {showArchived ? "Archived Tickets" : "Support Tickets"}
            </h1>
            <p className="text-white/90">
              {showArchived 
                ? `${archivedTickets.length} archived tickets`
                : `${activeTickets.length} active tickets • ${getTicketsByColumn(columns[0]).length} in ${columns[0]}`
              }
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            {/* View Mode Toggle (only show when not in archive) */}
            {!showArchived && (
              <Button
                onClick={() => setViewMode(viewMode === "status" ? "category" : "status")}
                className="backdrop-blur-md bg-white/30 border border-white/40 text-white hover:bg-white/40 rounded-xl h-11 px-4 md:px-6 shadow-lg"
              >
                <span className="hidden md:inline">
                  {viewMode === "status" ? "View by Category" : "View by Status"}
                </span>
                <span className="md:hidden">
                  {viewMode === "status" ? "📂" : "📊"}
                </span>
              </Button>
            )}

            {/* Archive Toggle Button */}
            <Button
              onClick={() => setShowArchived(!showArchived)}
              className={`backdrop-blur-md border shadow-lg h-11 px-4 md:px-6 rounded-xl ${
                showArchived
                  ? "bg-purple-500/30 border-purple-400/40 text-white hover:bg-purple-500/40"
                  : "bg-white/30 border-white/40 text-white hover:bg-white/40"
              }`}
            >
              <Archive className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">
                {showArchived ? "Close Archive" : `View Archive (${archivedTickets.length})`}
              </span>
            </Button>

            {/* Notification Toggle */}
            <Button
              onClick={() => {
                if (notificationsEnabled) {
                  setNotificationsEnabled(false);
                } else {
                  requestNotificationPermission();
                }
              }}
              className={`backdrop-blur-md border shadow-lg h-11 px-4 md:px-6 rounded-xl ${
                notificationsEnabled
                  ? "bg-green-500/30 border-green-400/40 text-white hover:bg-green-500/40"
                  : "bg-white/30 border-white/40 text-white hover:bg-white/40"
              }`}
            >
              {notificationsEnabled ? (
                <>
                  <Bell className="w-4 h-4 md:mr-2" />
                  <span className="hidden md:inline">Notifications On</span>
                </>
              ) : (
                <>
                  <BellOff className="w-4 h-4 md:mr-2" />
                  <span className="hidden md:inline">Enable Notifications</span>
                </>
              )}
            </Button>
            
            <Link to={createPageUrl("IntakeForm")} target="_blank">
              <Button className="backdrop-blur-md bg-white/30 border border-white/40 text-white hover:bg-white/40 rounded-xl h-11 px-4 md:px-6 shadow-lg">
                <ExternalLink className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">View Public Form</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Kanban Board or Archived List */}
        {showArchived ? (
          <div className="backdrop-blur-xl bg-purple-500/20 border border-purple-400/30 rounded-2xl p-6">
            {archivedTickets.length === 0 ? (
              <div className="text-center py-12">
                <Archive className="w-16 h-16 text-white/40 mx-auto mb-4" />
                <p className="text-white/80 text-lg">No archived tickets</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {archivedTickets.map(ticket => (
                  <div
                    key={ticket.id}
                    className="backdrop-blur-md bg-purple-500/30 border border-purple-400/50 rounded-xl p-4 flex items-center justify-between hover:bg-purple-500/40 transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-white font-semibold">{ticket.client_name}</h4>
                        <Badge className="bg-purple-400/30 text-white border-purple-300/40">
                          {ticket.inquiry_type}
                        </Badge>
                        <Badge className="bg-purple-600/30 text-white border-purple-500/40">
                          {ticket.status}
                        </Badge>
                      </div>
                      <p className="text-white/80 text-sm">{ticket.client_email}</p>
                      <p className="text-white/60 text-xs mt-1">
                        Archived from {ticket.status} • {formatDateEST(ticket.updated_date)} EST
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setSelectedTicket(ticket)}
                        variant="outline"
                        size="sm"
                        className="backdrop-blur-md bg-purple-400/30 border-purple-300/50 text-white hover:bg-purple-400/40"
                      >
                        View
                      </Button>
                      <Button
                        onClick={() => handleRestoreTicket(ticket.id)}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        Restore
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {columns.map((column) => (
                <Droppable key={column} droppableId={column}>
                  {(provided, snapshot) => (
                    <div 
                      ref={provided.innerRef} 
                      {...provided.droppableProps}
                      className={`transition-all duration-200 ${
                        snapshot.isDraggingOver ? 'ring-4 ring-white/50 scale-102' : ''
                      }`}
                    >
                      <KanbanColumn
                        status={column}
                        tickets={getTicketsByColumn(column)}
                        onStatusChange={handleStatusChange}
                        onTicketClick={setSelectedTicket}
                        isLoading={isLoading}
                        highlightedTicketId={highlightedTicketId}
                        onArchiveAll={column === "Closed" && viewMode === "status" ? handleArchiveAll : undefined}
                        viewMode={viewMode}
                      />
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              ))}
            </div>
          </DragDropContext>
        )}
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
            <span className="text-blue-600 font-medium">{data.oldColumn}</span> to{" "}
            <span className="text-green-600 font-medium">{data.newColumn}</span>
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
