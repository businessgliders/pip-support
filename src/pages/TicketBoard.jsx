import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExternalLink, Archive, X, Search, Columns, LogOut, Menu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import UserSelection from "../components/support/UserSelection";

export default function TicketBoard() {
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showUserSelection, setShowUserSelection] = useState(false);
  const [dragNoteDialog, setDragNoteDialog] = useState(null);
  const [highlightedTicketId, setHighlightedTicketId] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [viewMode, setViewMode] = useState("status"); // "status" or "category"
  const [hiddenColumns, setHiddenColumns] = useState(["Private Events"]); // Hidden columns in category view
  const [showColumnEditor, setShowColumnEditor] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userFilter, setUserFilter] = useState("all"); // "all" or specific user email
  const queryClient = useQueryClient();

  // Check authentication and domain restriction
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        // Check if email is from @pilatesinpinkstudio.com domain
        if (!currentUser.email.endsWith('@pilatesinpinkstudio.com')) {
          alert('Access restricted to @pilatesinpinkstudio.com domain only');
          base44.auth.redirectToLogin();
          return;
        }
        setUser(currentUser);
      } catch (error) {
        // Not logged in - show UserSelection instead of redirecting
        setShowUserSelection(true);
      } finally {
        setIsAuthLoading(false);
      }
    };
    checkAuth();
  }, []);

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['support-tickets'],
    queryFn: () => base44.entities.SupportTicket.list("-created_date"),
    refetchInterval: 5000,
    enabled: !!user
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    enabled: !!user
  });



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

  const allCategoryColumns = ["General Inquiry", "Membership Inquiry", "Private Events", "Cancellation", "Other"];
  
  const allStatusColumns = ["New", "In Progress", "Resolved", "Closed"];
  
  const columns = viewMode === "status" 
    ? allStatusColumns.filter(col => !hiddenColumns.includes(col))
    : allCategoryColumns.filter(col => !hiddenColumns.includes(col));

  const isOwner = user?.email === 'info@pilatesinpinkstudio.com';

  const getTicketsByColumn = (column) => {
    // This function is only called when showArchived is false,
    // as the archived view has its own rendering logic.
    let filtered = [];
    if (viewMode === "status") {
      filtered = tickets.filter(ticket => ticket.status === column && !ticket.archived);
    } else { // viewMode === "category"
      filtered = tickets.filter(ticket => ticket.inquiry_type === column && !ticket.archived);
    }
    
    // Apply user filter (owner sees all or filtered, regular users only see their tickets)
    if (!isOwner) {
      filtered = filtered.filter(ticket => ticket.assigned_to === user?.email);
    } else if (userFilter !== "all") {
      filtered = filtered.filter(ticket => ticket.assigned_to === userFilter);
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(ticket =>
        ticket.client_name?.toLowerCase().includes(query) ||
        ticket.client_email?.toLowerCase().includes(query) ||
        ticket.client_phone?.toLowerCase().includes(query) ||
        ticket.inquiry_type?.toLowerCase().includes(query) ||
        ticket.notes?.toLowerCase().includes(query) ||
        ticket.assigned_to?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  };

  const formatDateEST = (dateString) => {
    // Force UTC interpretation by ensuring ISO format with Z suffix
    let isoString = dateString;
    if (typeof dateString === 'string' && !dateString.endsWith('Z') && !dateString.includes('+')) {
      isoString = dateString + 'Z';
    }
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  let activeTickets = tickets.filter(t => !t.archived);
  let archivedTickets = tickets.filter(t => t.archived);
  
  // Apply user filter for non-owners
  if (!isOwner) {
    activeTickets = activeTickets.filter(t => t.assigned_to === user?.email);
    archivedTickets = archivedTickets.filter(t => t.assigned_to === user?.email);
  } else if (userFilter !== "all") {
    activeTickets = activeTickets.filter(t => t.assigned_to === userFilter);
    archivedTickets = archivedTickets.filter(t => t.assigned_to === userFilter);
  }
  
  // Apply search filter to archived tickets
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    archivedTickets = archivedTickets.filter(ticket =>
      ticket.client_name?.toLowerCase().includes(query) ||
      ticket.client_email?.toLowerCase().includes(query) ||
      ticket.client_phone?.toLowerCase().includes(query) ||
      ticket.inquiry_type?.toLowerCase().includes(query) ||
      ticket.notes?.toLowerCase().includes(query) ||
      ticket.assigned_to?.toLowerCase().includes(query)
    );
  }

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#ff899b] via-[#f7b1bd] to-[#fbe0e2]">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user || showUserSelection) {
    return <UserSelection onUserSelected={() => setShowUserSelection(false)} />;
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-b from-[#f1899b] to-white relative">
      {/* Decorative background */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-white/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-pink-100/40 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center md:items-center gap-4 mb-8">
          <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_690aada19e27fe8fcf067828/45da48106_Pilatesinpinklogojusticon1.png"
              alt="Pilates in Pink"
              className="w-16 h-16 drop-shadow-xl"
            />
            <div className="text-center md:text-left">
              <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">
                {showArchived ? "Archived Tickets" : "PiP Support"}
              </h1>
              <p className="text-white/90">
                {showArchived 
                  ? `${archivedTickets.length} archived tickets`
                  : `${activeTickets.length} active tickets • ${getTicketsByColumn(columns[0]).length} in ${columns[0]}`
                }
              </p>
            </div>
          </div>
          <div className="flex gap-3 flex-wrap items-center justify-center md:justify-start w-full md:w-auto">
            {/* Search Bar (Desktop) / Button (Mobile) */}
            <div className="hidden md:block">
              <Input
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="backdrop-blur-md bg-white/70 border-white/80 text-gray-900 placeholder:text-gray-600 rounded-xl h-11 w-64"
              />
            </div>
            <Button
              onClick={() => {
                const query = prompt("Search tickets:", searchQuery);
                if (query !== null) setSearchQuery(query);
              }}
              className="md:hidden backdrop-blur-md bg-white/70 border border-white/80 text-gray-900 hover:bg-white/80 rounded-xl h-11 px-3 shadow-lg"
            >
              <Search className="w-4 h-4" />
            </Button>

            {/* Edit Columns Button */}
            {!showArchived && (
              <Button
                onClick={() => setShowColumnEditor(!showColumnEditor)}
                className="backdrop-blur-md bg-white/70 border border-white/80 text-gray-900 hover:bg-white/80 rounded-xl h-11 shadow-lg px-3"
              >
                <Columns className="w-4 h-4" />
              </Button>
            )}

            {/* Archive Toggle Button */}
            <Button
              onClick={() => setShowArchived(!showArchived)}
              className={`backdrop-blur-md border shadow-lg h-11 rounded-xl px-3 ${
                showArchived
                  ? "bg-purple-500/80 border-purple-400/80 text-white hover:bg-purple-500/90"
                  : "bg-white/70 border-white/80 text-gray-900 hover:bg-white/80"
              }`}
            >
              <Archive className="w-4 h-4" />
            </Button>

            {/* View Mode Toggle */}
            {!showArchived && (
              <Button
                onClick={() => setViewMode(viewMode === "status" ? "category" : "status")}
                className="backdrop-blur-md bg-white/70 border border-white/80 text-gray-900 hover:bg-white/80 rounded-xl h-11 px-3 md:px-6 shadow-lg"
              >
                <span className="hidden md:inline">
                  {viewMode === "status" ? "View by Category" : "View by Status"}
                </span>
                <span className="md:hidden">
                  {viewMode === "status" ? "📂" : "📊"}
                </span>
              </Button>
            )}

            {/* User Filter (Owner only) */}
            {isOwner && (
              <select
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="backdrop-blur-md bg-white/70 border border-white/80 text-gray-900 rounded-xl h-11 px-4 cursor-pointer"
              >
                <option value="all">All Users</option>
                {allUsers.filter(u => u.email.endsWith('@pilatesinpinkstudio.com')).map(u => (
                  <option key={u.id} value={u.email}>
                    {u.email === 'info@pilatesinpinkstudio.com' 
                      ? 'Front Desk' 
                      : u.full_name ? u.full_name.split(' ')[0] : u.email.split('@')[0]
                    }
                  </option>
                ))}
              </select>
            )}

            {/* User Menu with Switch User and Logout */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="backdrop-blur-md bg-white/70 border border-white/80 text-gray-900 hover:bg-white/80 rounded-xl h-11 px-4 shadow-lg hidden md:flex items-center gap-2">
                  <span className="text-sm font-semibold">
                    {user.full_name 
                      ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
                      : user.email.substring(0, 2).toUpperCase()
                    }
                  </span>
                  <Menu className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="backdrop-blur-xl bg-white/95 border-white/40">
                <DropdownMenuItem onClick={() => setShowUserSelection(true)}>
                  Switch User
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => base44.auth.logout()}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Column Editor Dialog */}
        {showColumnEditor && (
          <div className="backdrop-blur-xl bg-white/90 border border-white/40 rounded-2xl p-6 mb-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {viewMode === "status" ? "Edit Status Columns" : "Edit Category Columns"}
            </h3>
            <div className="space-y-2">
              {(viewMode === "status" 
                ? ["New", "In Progress", "Resolved", "Closed"]
                : allCategoryColumns
              ).map(col => (
                <label key={col} className="flex items-center gap-3 p-3 hover:bg-white/50 rounded-lg cursor-pointer transition-all">
                  <input
                    type="checkbox"
                    checked={!hiddenColumns.includes(col)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setHiddenColumns(hiddenColumns.filter(c => c !== col));
                      } else {
                        setHiddenColumns([...hiddenColumns, col]);
                      }
                    }}
                    className="w-5 h-5 rounded border-gray-300"
                  />
                  <span className="text-gray-900 font-medium">{col}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end mt-4">
              <Button
                onClick={() => setShowColumnEditor(false)}
                className="bg-[#b67651] hover:bg-[#a56541] text-white"
              >
                Done
              </Button>
            </div>
          </div>
        )}

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
                      style={{ position: 'static' }}
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
                        allUsers={allUsers}
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
          currentUser={user}
          isOwner={isOwner}
          allUsers={allUsers}
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