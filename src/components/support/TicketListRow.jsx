import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Loader2, AlertCircle } from "lucide-react";
import HubStatusBadge from "./HubStatusBadge";

const formatDateEST = (dateString) => {
  if (!dateString) return "";
  let iso = dateString;
  if (typeof dateString === "string" && !dateString.endsWith("Z") && !dateString.includes("+")) {
    iso = dateString + "Z";
  }
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

export default function TicketListRow({ ticket, onView, onRetry, isRetrying }) {
  const failed = ticket.hub_forward_status === "failed";

  return (
    <div
      onClick={() => onView(ticket)}
      className="group bg-white/70 hover:bg-white border border-white/60 hover:border-pink-200 rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-4"
    >
      {/* Ticket number + name */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {ticket.ticket_number && (
            <span className="text-gray-400 font-medium text-sm">#{ticket.ticket_number}</span>
          )}
          <span className="font-semibold text-gray-900 truncate">{ticket.client_name}</span>
          <Badge variant="outline" className="bg-gray-50 text-xs">{ticket.inquiry_type}</Badge>
        </div>
        <p className="text-xs text-gray-500 mt-0.5 truncate">
          {ticket.client_email}
          {ticket.client_phone ? ` • ${ticket.client_phone}` : ""}
        </p>
      </div>

      {/* Submitted date */}
      <div className="hidden md:block text-xs text-gray-500 flex-shrink-0 w-40 text-right">
        {formatDateEST(ticket.created_date)}
      </div>

      {/* Hub status */}
      <div className="flex-shrink-0 flex items-center gap-2">
        <HubStatusBadge status={ticket.hub_forward_status} />
        {failed && (
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => { e.stopPropagation(); onRetry(ticket); }}
            disabled={isRetrying}
            className="h-7 px-2 text-xs border-red-300 text-red-600 hover:bg-red-50"
            title="Re-forward to PiP Hub"
          >
            {isRetrying ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline ml-1">Retry</span>
          </Button>
        )}
      </div>

      {/* Error hint */}
      {failed && ticket.hub_forward_error && (
        <div className="hidden lg:flex items-center gap-1 text-xs text-red-500 max-w-[160px] truncate flex-shrink-0" title={ticket.hub_forward_error}>
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{ticket.hub_forward_error}</span>
        </div>
      )}
    </div>
  );
}