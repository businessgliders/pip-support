import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExternalLink, Archive, X, Search, Columns, LogOut, User, Menu, Settings as SettingsIcon, BarChart3, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { DragDropContext } from "@hello-pangea/dnd";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import KanbanColumn from "../components/support/KanbanColumn";
import TicketDetailsModal from "../components/support/TicketDetailsModal";
import UserSelectionScreen from "../components/support/UserSelectionScreen";
import FloatingUserFilter from "../components/support/FloatingUserFilter";
import NotificationCenter from "../components/support/NotificationCenter";
import ChangelogPopup from "../components/support/ChangelogPopup";
import ResolvedCleanupPopup from "../components/support/ResolvedCleanupPopup";
import ArchivedTicketsList from "../components/support/ArchivedTicketsList";
import { getPhotoForUser } from "@/lib/userPhotos";

const userColors = {
  0: "bg-pink-400",
  1: "bg-purple-400",
  2: "bg-blue-400",
  3: "bg-teal-400",
  4: "bg-green-400",
  5: "bg-amber-400",
  6: "bg-rose-400",
  7: "bg-indigo-400"
};

export default function TicketBoard() {
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [dragNoteDialog, setDragNoteDialog] = useState(null);
  const [highlightedTicketId, setHighlightedTicketId] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [alertDialog, setAlertDialog] = useState(null);
  const [archiveAllConfirmDialog, setArchiveAllConfirmDialog] = useState(null);
  const [mobileSearchDialog, setMobileSearchDialog] = useState(false);
  const [mobileSearchInput, setMobileSearchInput] = useState("");
  const [viewMode, setViewMode] = useState("status"); // "status" or "category"
  const [hiddenColumns, setHiddenColumns] = useState(["Private Events"]); // Hidden columns in category view
  const [showColumnEditor, setShowColumnEditor] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userFilter, setUserFilter] = useState("all"); // "all" or specific user email
  const [showChangelog, setShowChangelog] = useState(false);
  const [showCleanupPopup, setShowCleanupPopup] = useState(false);
  const [cleanupDismissed, setCleanupDismissed] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const swimlaneScrollRef = React.useRef(null);
  const queryClient = useQueryClient();

  const updateScrollButtons = React.useCallback(() => {
    const el = swimlaneScrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  React.useEffect(() => {
    const el = swimlaneScrollRef.current;
    if (!el) return;
    updateScrollButtons();
    el.addEventListener('scroll', updateScrollButtons, { passive: true });
    window.addEventListener('resize', updateScrollButtons);
    return () => {
      el.removeEventListener('scroll', updateScrollButtons);
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, [updateScrollButtons]);

  const scrollSwimlanes = (direction) => {
    const el = swimlaneScrollRef.current;
    if (!el) return;
    // Scroll by the width of the first child column (includes gap roughly)
    const firstChild = el.querySelector('[data-swimlane]');
    const step = firstChild ? firstChild.getBoundingClientRect().width + 16 : el.clientWidth * 0.85;
    el.scrollBy({ left: direction === 'left' ? -step : step, behavior: 'smooth' });
    // Ensure arrow visibility updates even if scroll event timing is off
    setTimeout(updateScrollButtons, 400);
  };

  const getInitials = (email) => {
    if (email === 'info@pilatesinpinkstudio.com') return 'FD';
    const foundUser = allUsers.find(u => u.email === email);
    if (foundUser?.full_name) {
      return foundUser.full_name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  const getUserColor = (email) => {
    const hash = email.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return userColors[hash % 8];
  };

  // Check authentication and domain restriction
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        // Check if email is from @pilatesinpinkstudio.com domain
        if (!currentUser.email.endsWith('@pilatesinpinkstudio.com')) {
          setAlertDialog('Access restricted to @pilatesinpinkstudio.com domain only');
          setUser(null);
          setIsAuthLoading(false);
          return;
        }
        setUser(currentUser);
        if (!currentUser.seen_changelog_v1) {
          setShowChangelog(true);
        }
      } catch (error) {
        // Not authenticated - show user selection
        setUser(null);
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
    queryFn: async () => {
      const res = await base44.functions.invoke('getUsersForSelection', {});
      return res.data?.users || [];
    },
    enabled: !!user
  });

  // Unread inbound email counts per ticket (for the current user).
  // If the most recent message on a ticket is outbound (i.e. we've already
  // replied), suppress the unread count for that ticket.
  const { data: unreadByTicket = {} } = useQuery({
    queryKey: ['unread-by-ticket', user?.email],
    queryFn: async () => {
      if (!user?.email) return {};
      const recent = await base44.entities.EmailMessage.filter(
        {}, "-sent_at", 500
      );
      const latestByTicket = {};
      for (const m of recent) {
        if (!latestByTicket[m.ticket_id]) latestByTicket[m.ticket_id] = m;
      }
      const counts = {};
      for (const m of recent) {
        if (m.direction !== "inbound") continue;
        const latest = latestByTicket[m.ticket_id];
        if (latest && latest.direction === "outbound") continue; // already replied
        if (!(m.read_by || []).includes(user.email)) {
          counts[m.ticket_id] = (counts[m.ticket_id] || 0) + 1;
        }
      }
      return counts;
    },
    enabled: !!user?.email,
    refetchInterval: 15000,
  });



  // Auto-trigger cleanup popup when current user has more than 10 resolved tickets
  useEffect(() => {
    if (!user || cleanupDismissed || showCleanupPopup) return;
    const resolvedActive = tickets.filter(
      t => t.status === "Resolved" && !t.archived && t.assigned_to === user.email
    );
    if (resolvedActive.length > 6) {
      setShowCleanupPopup(true);
    }
  }, [tickets, user, cleanupDismissed, showCleanupPopup]);

  const handleBulkMoveToClosed = async (ticketIds) => {
    const now = new Date().toISOString();
    for (const id of ticketIds) {
      const ticket = tickets.find(t => t.id === id);
      if (!ticket) continue;
      const statusHistory = ticket.status_history || [];
      statusHistory.push({
        status: "Closed",
        note: "Bulk closed via Resolved cleanup",
        timestamp: now
      });
      await updateTicketMutation.mutateAsync({
        id,
        data: { status: "Closed", status_history: statusHistory }
      });
    }
  };

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

  const handleArchiveSome = async () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const ticketsToArchive = tickets.filter(t => {
      if (t.status !== "Closed" || t.archived) return false;
      const ticketDate = new Date(t.updated_date || t.created_date);
      return ticketDate.getMonth() !== currentMonth || ticketDate.getFullYear() !== currentYear;
    });
    
    if (ticketsToArchive.length === 0) {
      setAlertDialog("There are no closed tickets from previous months to archive.");
      return;
    }

    for (const ticket of ticketsToArchive) {
      await updateTicketMutation.mutateAsync({
        id: ticket.id,
        data: { archived: true }
      });
    }
    
    setAlertDialog(`Successfully archived ${ticketsToArchive.length} ticket(s) from previous months.`);
  };

  const handleArchiveAll = () => {
    const ticketsToArchive = tickets.filter(t => t.status === "Closed" && !t.archived);
    
    if (ticketsToArchive.length === 0) {
      setAlertDialog("There are no closed tickets to archive.");
      return;
    }

    setArchiveAllConfirmDialog({
      ticketsToArchive,
      message: `Are you sure you want to archive all ${ticketsToArchive.length} closed ticket(s), including those from this month?`
    });
  };

  const confirmArchiveAll = async () => {
    if (!archiveAllConfirmDialog) return;
    for (const ticket of archiveAllConfirmDialog.ticketsToArchive) {
      await updateTicketMutation.mutateAsync({
        id: ticket.id,
        data: { archived: true }
      });
    }
    setArchiveAllConfirmDialog(null);
    setAlertDialog(`Successfully archived ${archiveAllConfirmDialog.ticketsToArchive.length} ticket(s).`);
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

  const handleConfirmStatusChange = (name, note) => {
    if (dragNoteDialog) {
      const combinedNote = `${name}: ${note}`;
      handleStatusChange(dragNoteDialog.ticketId, dragNoteDialog.newColumn, combinedNote);
      setDragNoteDialog(null);
    }
  };

  const allCategoryColumns = ["General Inquiry", "Membership Inquiry", "Private Events", "Cancellation", "Other"];
  
  const allStatusColumns = ["New", "In Progress", "Resolved", "Closed"];
  
  const columns = viewMode === "status" 
    ? allStatusColumns.filter(col => !hiddenColumns.includes(col))
    : allCategoryColumns.filter(col => !hiddenColumns.includes(col));

  React.useEffect(() => {
    // Re-check scroll position after layout changes (columns swap, archive toggle)
    const t = setTimeout(updateScrollButtons, 50);
    return () => clearTimeout(t);
  }, [updateScrollButtons, columns.length, showArchived]);

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

  if (!user) {
    return <UserSelectionScreen />;
  }

  return (
    <div className="min-h-screen lg:h-screen flex flex-col px-4 md:px-8 pt-4 md:pt-8 pb-2 bg-gradient-to-b from-[#f1899b] to-white relative overflow-x-hidden lg:overflow-hidden">
      {/* Decorative background */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-white/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-pink-100/40 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />

      {/* Slanted tiled SUPPORT watermark — masked to fade behind swimlanes */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
        style={{
          WebkitMaskImage:
            "radial-gradient(ellipse 55% 50% at 50% 55%, transparent 0%, transparent 35%, rgba(0,0,0,0.7) 70%, #000 100%), linear-gradient(to bottom, transparent 0px, transparent 140px, #000 240px)",
          WebkitMaskComposite: "source-in",
          maskImage:
            "radial-gradient(ellipse 55% 50% at 50% 55%, transparent 0%, transparent 35%, rgba(0,0,0,0.7) 70%, #000 100%), linear-gradient(to bottom, transparent 0px, transparent 140px, #000 240px)",
          maskComposite: "intersect",
        }}
      >
        <div
          className="absolute -inset-[20%] flex flex-wrap content-start gap-x-16 gap-y-12 text-white/15 font-black uppercase tracking-[0.25em] text-5xl md:text-7xl whitespace-nowrap leading-none"
          style={{ transform: "rotate(-20deg)" }}
        >
          {Array.from({ length: 30 }).map((_, i) => (
            <span key={i}>SUPPORT</span>
          ))}
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto relative z-10 flex flex-col flex-1 w-full lg:min-h-0">
        {/* Sticky wrapper for header + filter on mobile/tablet */}
        <div className="sticky top-0 z-30 lg:static -mx-4 md:-mx-8 px-4 md:px-8 pt-4 md:pt-8 -mt-4 md:-mt-8 mb-4 lg:mb-0 bg-gradient-to-b from-[#f1899b] via-[#f1899b]/95 to-[#f1899b]/80 lg:bg-none backdrop-blur-sm lg:backdrop-blur-none lg:p-0 lg:m-0 pb-3 lg:pb-0">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center md:items-center gap-4 mb-4 lg:mb-8">
          <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
            <Link 
              to={createPageUrl("TicketBoard")} 
              onClick={() => { 
                setShowArchived(false); 
                setSearchQuery(""); 
                setViewMode("status"); 
                setUserFilter("all");
              }}
            >
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690aaf0c732696417648d224/a1b923375_PiPSupport.png"
                alt="PiP Support"
                className="h-12 md:h-16 drop-shadow-xl hover:scale-105 transition-transform"
              />
            </Link>
            <div className="text-center md:text-left">
              <p className="text-white/90">
                {showArchived 
                  ? `${archivedTickets.length} archived tickets`
                  : `${activeTickets.length} active tickets • ${getTicketsByColumn(columns[0]).length} in ${columns[0]}`
                }
              </p>
            </div>
          </div>
          <div className="flex gap-3 flex-wrap items-center justify-center md:justify-start w-full md:w-auto">
            {/* Notification Bell - first on desktop, last (after archive) on mobile/tablet */}
            <div className="order-last lg:order-none">
              <NotificationCenter
                currentUser={user}
                tickets={tickets}
                variant="inline"
                onTicketClick={(ticket, messageId) => {
                  setHighlightedMessageId(messageId || null);
                  setSelectedTicket(ticket);
                }}
              />
            </div>

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
                setMobileSearchInput(searchQuery);
                setMobileSearchDialog(true);
              }}
              className="md:hidden backdrop-blur-md bg-white/70 border border-white/80 text-gray-900 hover:bg-white/80 rounded-xl h-11 px-3 shadow-lg"
            >
              <Search className="w-4 h-4" />
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

            {/* Profile Avatar with dropdown menu */}
            {(() => {
              const photo = getPhotoForUser(user);
              return (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={`flex items-center justify-center h-11 w-11 rounded-xl overflow-hidden shadow-lg border-2 border-white/80 hover:ring-2 hover:ring-white/60 transition ${photo ? "" : getUserColor(user.email)}`}
                      title={user.full_name || user.email}
                    >
                      {photo ? (
                        <img src={photo} alt={user.full_name || user.email} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white font-semibold">{getInitials(user.email)}</span>
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => base44.auth.logout()}>
                      <User className="w-4 h-4 mr-2" />
                      Switch User
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => base44.auth.logout()}>
                      <LogOut className="w-4 h-4 mr-2" />
                      Log Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            })()}

          </div>
        </div>

        {/* Floating Action Icons (top-right, like padlock on intake) */}
        <div className="fixed top-4 right-4 z-40 flex flex-col gap-2">
          <Link to={createPageUrl("Analytics")}>
            <Button
              variant="ghost"
              size="icon"
              className="backdrop-blur-md bg-white/20 hover:bg-white/30 border border-white/40 text-white rounded-full w-10 h-10 shadow-lg"
              title="Analytics"
            >
              <BarChart3 className="w-4 h-4" />
            </Button>
          </Link>
          <Link to={createPageUrl("Settings")}>
            <Button
              variant="ghost"
              size="icon"
              className="backdrop-blur-md bg-white/20 hover:bg-white/30 border border-white/40 text-white rounded-full w-10 h-10 shadow-lg"
              title="Settings"
            >
              <SettingsIcon className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        {/* Floating User Filter (left-center, owner only) */}
        {isOwner && (
          <FloatingUserFilter
            allUsers={allUsers}
            userFilter={userFilter}
            onChange={setUserFilter}
          />
        )}
        </div>
        {/* End sticky wrapper */}

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
          <div className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl p-6 shadow-xl flex-1 overflow-y-auto">
            <ArchivedTicketsList
              tickets={archivedTickets}
              onView={setSelectedTicket}
              onRestore={handleRestoreTicket}
            />
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="relative lg:contents">
              {/* Left scroll arrow - mobile/tablet only */}
              {canScrollLeft && (
                <button
                  type="button"
                  onClick={() => scrollSwimlanes('left')}
                  aria-label="Previous column"
                  className="lg:hidden absolute left-1 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full backdrop-blur-md bg-white/70 hover:bg-white/90 border border-white/80 shadow-lg flex items-center justify-center text-gray-800 active:scale-95 transition"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              {/* Right scroll arrow - mobile/tablet only */}
              {canScrollRight && (
                <button
                  type="button"
                  onClick={() => scrollSwimlanes('right')}
                  aria-label="Next column"
                  className="lg:hidden absolute right-1 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full backdrop-blur-md bg-white/70 hover:bg-white/90 border border-white/80 shadow-lg flex items-center justify-center text-gray-800 active:scale-95 transition"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            <div
              ref={swimlaneScrollRef}
              className="flex lg:grid lg:grid-cols-4 gap-4 md:gap-6 overflow-x-auto lg:overflow-visible -mx-4 md:-mx-8 pl-6 pr-4 md:pl-10 md:pr-8 pb-2 lg:mx-0 lg:pl-0 lg:pr-0 lg:pb-0 snap-x snap-mandatory lg:snap-none lg:flex-1 lg:min-h-0 scroll-smooth touch-pan-x overscroll-x-contain"
            >
              {columns.map((column) => (
                <div key={column} data-swimlane className="flex-shrink-0 w-[85%] sm:w-[60%] md:w-[45%] lg:w-auto snap-start lg:snap-align-none">
                  <KanbanColumn
                    status={column}
                    tickets={getTicketsByColumn(column)}
                    onStatusChange={handleStatusChange}
                    onTicketClick={setSelectedTicket}
                    isLoading={isLoading}
                    highlightedTicketId={highlightedTicketId}
                    onArchiveSome={column === "Closed" && viewMode === "status" ? handleArchiveSome : undefined}
                    onArchiveAll={column === "Closed" && viewMode === "status" ? handleArchiveAll : undefined}
                    onTidyUp={column === "Resolved" && viewMode === "status" ? () => { setCleanupDismissed(false); setShowCleanupPopup(true); } : undefined}
                    viewMode={viewMode}
                    allUsers={allUsers}
                    unreadByTicket={unreadByTicket}
                  />
                </div>
              ))}
            </div>
            </div>
          </DragDropContext>
        )}
      </div>

      {/* Status Change Note Dialog */}
      {showChangelog && (
        <ChangelogPopup onDismiss={() => setShowChangelog(false)} />
      )}

      <ResolvedCleanupPopup
        isOpen={showCleanupPopup}
        resolvedTickets={tickets.filter(t => t.status === "Resolved" && !t.archived)}
        onClose={() => { setShowCleanupPopup(false); setCleanupDismissed(true); }}
        onMoveToClosed={handleBulkMoveToClosed}
        currentUser={user}
      />

      {dragNoteDialog && (
        <StatusChangeDialog
          data={dragNoteDialog}
          currentUser={user}
          allUsers={allUsers}
          onConfirm={handleConfirmStatusChange}
          onCancel={() => setDragNoteDialog(null)}
        />
      )}

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <TicketDetailsModal
          ticket={selectedTicket}
          onClose={() => { setSelectedTicket(null); setHighlightedMessageId(null); }}
          onStatusChange={handleStatusChange}
          onTicketClick={setSelectedTicket}
          currentUser={user}
          isOwner={isOwner}
          allUsers={allUsers}
          highlightMessageId={highlightedMessageId}
        />
      )}

      {/* System Dialogs */}
      <ConfirmDialog 
        isOpen={!!archiveAllConfirmDialog}
        title="Confirm Archive All"
        message={archiveAllConfirmDialog?.message}
        onConfirm={confirmArchiveAll}
        onCancel={() => setArchiveAllConfirmDialog(null)}
      />
      <AlertDialogComponent
        isOpen={!!alertDialog}
        message={alertDialog}
        onClose={() => setAlertDialog(null)}
      />
      <MobileSearchDialog
        isOpen={mobileSearchDialog}
        initialValue={mobileSearchInput}
        onSearch={(val) => {
          setSearchQuery(val);
          setMobileSearchDialog(false);
        }}
        onClose={() => setMobileSearchDialog(false)}
      />

      {/* Footer */}
      <div className="mt-2 mb-0 flex items-center justify-center gap-3 flex-shrink-0">
        <img 
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_690aada19e27fe8fcf067828/45da48106_Pilatesinpinklogojusticon1.png"
          alt="Pilates in Pink"
          className="w-6 h-6 rounded shadow"
        />
        <p className="text-gray-500 text-xs">
          © 2026 Pilates in Pink™ • All rights reserved
        </p>
      </div>
    </div>
  );
}

function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel }) {
  if (!isOpen) return null;
  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="backdrop-blur-2xl bg-white/95 border-white/40">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-gray-700">{message}</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onConfirm} className="bg-[#b67651] hover:bg-[#a56541] text-white">
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AlertDialogComponent({ isOpen, message, onClose }) {
  if (!isOpen) return null;
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="backdrop-blur-2xl bg-white/95 border-white/40">
        <DialogHeader>
          <DialogTitle>Notification</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-gray-700">{message}</p>
        </div>
        <DialogFooter>
          <Button onClick={onClose} className="bg-[#b67651] hover:bg-[#a56541] text-white">
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MobileSearchDialog({ isOpen, initialValue, onSearch, onClose }) {
  const [val, setVal] = useState(initialValue);
  if (!isOpen) return null;
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="backdrop-blur-2xl bg-white/95 border-white/40">
        <DialogHeader>
          <DialogTitle>Search Tickets</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Input 
            autoFocus
            value={val} 
            onChange={e => setVal(e.target.value)} 
            placeholder="Enter search term..."
            onKeyDown={e => {
              if (e.key === 'Enter') {
                onSearch(val);
              }
            }}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSearch(val)} className="bg-[#b67651] hover:bg-[#a56541] text-white">
            Search
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const FD_NAMES_KEY = 'pip_front_desk_recent_names';

function getRecentFrontDeskNames() {
  try {
    const stored = localStorage.getItem(FD_NAMES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentFrontDeskName(name) {
  try {
    const trimmed = name.trim();
    if (!trimmed) return;
    const existing = getRecentFrontDeskNames();
    const filtered = existing.filter(n => n.toLowerCase() !== trimmed.toLowerCase());
    const updated = [trimmed, ...filtered].slice(0, 5);
    localStorage.setItem(FD_NAMES_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

function StatusChangeDialog({ data, currentUser, allUsers, onConfirm, onCancel }) {
  const isFrontDesk = currentUser?.email === 'info@pilatesinpinkstudio.com';
  const matchedUser = allUsers?.find(u => u.email === currentUser?.email);
  const recentNames = isFrontDesk ? getRecentFrontDeskNames() : [];
  const defaultName = isFrontDesk
    ? (recentNames[0] || "")
    : (matchedUser?.full_name || currentUser?.full_name || currentUser?.email?.split('@')[0] || "");

  const [name, setName] = useState(defaultName);
  const [note, setNote] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredSuggestions = recentNames.filter(n =>
    n.toLowerCase().includes(name.toLowerCase()) && n.toLowerCase() !== name.toLowerCase()
  );

  const canSubmit = name.trim().length > 0 && note.trim().length > 0;

  const handleSubmit = () => {
    if (isFrontDesk) saveRecentFrontDeskName(name);
    onConfirm(name.trim(), note.trim());
  };

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
          <div className="space-y-2 relative">
            <Label htmlFor="status-name">
              {isFrontDesk ? "Front Desk Associate Name" : "Name"} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="status-name"
              value={name}
              onChange={(e) => { setName(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder={isFrontDesk ? "Enter your name" : ""}
              readOnly={!isFrontDesk}
              className={!isFrontDesk ? "bg-gray-100" : ""}
              autoComplete="off"
            />
            {isFrontDesk && showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                {filteredSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setName(suggestion);
                      setShowSuggestions(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-pink-50 text-sm text-gray-700"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="status-note">
              Note <span className="text-red-500">*</span>
            </Label>
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
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="bg-[#b67651] hover:bg-[#a56541] text-white"
          >
            Update Status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}