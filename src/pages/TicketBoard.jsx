import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, LogOut, User, Filter, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import TicketDetailsModal from "../components/support/TicketDetailsModal";
import AccessDenied from "../components/support/AccessDenied";
import UnifiedInboxPopup, { INBOX_URL } from "../components/support/UnifiedInboxPopup";
import ForwardStatsBar from "../components/support/ForwardStatsBar";
import TicketListRow from "../components/support/TicketListRow";
import { getPhotoForUser } from "@/lib/userPhotos";

export default function TicketBoard() {
  const [user, setUser] = useState(null);
  const [isSuperAdminUser, setIsSuperAdminUser] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [forwardFilter, setForwardFilter] = useState("all"); // all | success | failed | pending
  const [retryingId, setRetryingId] = useState(null);
  const [showUnifiedInboxPopup, setShowUnifiedInboxPopup] = useState(false);
  const queryClient = useQueryClient();

  // Check authentication and domain restriction
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (!currentUser.email.endsWith("@pilatesinpinkstudio.com")) {
          setUser(null);
          setIsAuthLoading(false);
          return;
        }
        setUser(currentUser);
        try {
          const resp = await base44.functions.invoke("checkSuperAdmin", {});
          setIsSuperAdminUser(!!resp?.data?.is_super_admin);
        } catch {
          setIsSuperAdminUser(false);
        }
        // Unified Inbox migration prompt — shows on every page load.
        setShowUnifiedInboxPopup(true);
      } catch (error) {
        setUser(null);
      } finally {
        setIsAuthLoading(false);
      }
    };
    checkAuth();
  }, []);

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["support-tickets"],
    queryFn: () => base44.entities.SupportTicket.list("-created_date", 500),
    refetchInterval: 10000,
    enabled: !!user,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await base44.functions.invoke("getUsersForSelection", {});
      return res.data?.users || [];
    },
    enabled: !!user,
  });

  const updateTicketMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SupportTicket.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
    },
  });

  const handleStatusChange = (ticketId, newStatus, note = "") => {
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return;
    const statusHistory = ticket.status_history || [];
    statusHistory.push({ status: newStatus, note, timestamp: new Date().toISOString() });
    updateTicketMutation.mutate({
      id: ticketId,
      data: { status: newStatus, status_history: statusHistory },
    });
  };

  const handleRetryForward = async (ticket) => {
    setRetryingId(ticket.id);
    try {
      await base44.functions.invoke("forwardToHub", { ticket_id: ticket.id });
    } catch (e) {
      console.error("Retry forward failed", e);
    } finally {
      setRetryingId(null);
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
    }
  };

  // Check URL for ticket parameter (deep-link from notifications/hub)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ticketId = urlParams.get("ticket");
    if (ticketId && tickets.length > 0) {
      const ticket = tickets.find((t) => t.id === ticketId);
      if (ticket) {
        setSelectedTicket(ticket);
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, [tickets]);

  const filteredTickets = tickets.filter((ticket) => {
    if (forwardFilter !== "all" && (ticket.hub_forward_status || "pending") !== forwardFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        ticket.client_name?.toLowerCase().includes(q) ||
        ticket.client_email?.toLowerCase().includes(q) ||
        ticket.client_phone?.toLowerCase().includes(q) ||
        ticket.inquiry_type?.toLowerCase().includes(q) ||
        String(ticket.ticket_number || "").includes(q)
      );
    }
    return true;
  });

  const getInitials = (email) => {
    if (email === "info@pilatesinpinkstudio.com") return "FD";
    const found = allUsers.find((u) => u.email === email);
    if (found?.full_name) return found.full_name.split(" ").map((n) => n[0]).join("").toUpperCase();
    return email.substring(0, 2).toUpperCase();
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#ff899b] via-[#f7b1bd] to-[#fbe0e2]">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) return <AccessDenied />;

  return (
    <div className="min-h-screen px-4 md:px-8 py-6 md:py-8 bg-gradient-to-b from-[#f1899b] to-white">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-row justify-between items-center gap-3 mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690aaf0c732696417648d224/a1b923375_PiPSupport.png"
              alt="PiP Support"
              className="h-10 md:h-14 drop-shadow-xl"
            />
            <div className="hidden sm:block">
              <h1 className="text-white font-bold text-xl drop-shadow">Submitted Tickets</h1>
              <p className="text-white/90 text-sm">Intake & forwarding log</p>
            </div>
          </div>

          {/* Profile dropdown */}
          {(() => {
            const photo = getPhotoForUser(user);
            return (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center justify-center h-11 w-11 rounded-xl overflow-hidden shadow-lg border-2 border-white/80 bg-pink-400 hover:ring-2 hover:ring-white/60 transition"
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

        {/* Forwarding stats */}
        <ForwardStatsBar tickets={tickets} />

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            <Input
              placeholder="Search by name, email, phone, ticket #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="backdrop-blur-md bg-white/70 border-white/80 text-gray-900 placeholder:text-gray-500 rounded-xl h-11 pl-9"
            />
          </div>
          <Select value={forwardFilter} onValueChange={setForwardFilter}>
            <SelectTrigger className="w-full sm:w-48 h-11 backdrop-blur-md bg-white/70 border-white/80 rounded-xl">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All forwards</SelectItem>
              <SelectItem value="success">Forwarded</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading tickets...
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="text-center py-20 text-gray-500 bg-white/40 rounded-2xl border border-white/50">
            No tickets match your filters.
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTickets.map((ticket) => (
              <TicketListRow
                key={ticket.id}
                ticket={ticket}
                onView={setSelectedTicket}
                onRetry={handleRetryForward}
                isRetrying={retryingId === ticket.id}
              />
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 flex items-center justify-center gap-3">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_690aada19e27fe8fcf067828/45da48106_Pilatesinpinklogojusticon1.png"
            alt="Pilates in Pink"
            className="w-6 h-6 rounded shadow"
          />
          <p className="text-gray-500 text-xs">© 2026 Pilates in Pink™ • All rights reserved</p>
        </div>
      </div>

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <TicketDetailsModal
          ticket={selectedTicket}
          onClose={() => { setSelectedTicket(null); setHighlightedMessageId(null); }}
          onStatusChange={handleStatusChange}
          onTicketClick={setSelectedTicket}
          currentUser={user}
          isOwner={isSuperAdminUser}
          allUsers={allUsers}
          highlightMessageId={highlightedMessageId}
        />
      )}

      {/* Unified Inbox migration prompt */}
      <UnifiedInboxPopup
        open={showUnifiedInboxPopup}
        onTryNow={() => {
          window.open(INBOX_URL, "_blank", "noopener,noreferrer");
        }}
        onDismiss={() => setShowUnifiedInboxPopup(false)}
      />
    </div>
  );
}