
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Mail, Phone, MoreVertical, Gift } from "lucide-react";

const priorityColors = {
  "Low": "bg-green-500/20 text-green-100 border-green-400/40",
  "Medium": "bg-yellow-500/20 text-yellow-100 border-yellow-400/40",
  "High": "bg-orange-500/20 text-orange-100 border-orange-400/40",
  "Urgent": "bg-red-500/20 text-red-100 border-red-400/40"
};

const inquiryTypeIcons = {
  "General Inquiry": "❓",
  "Membership Inquiry": "💳",
  "Private Events": "🎉",
  "Cancellation": "⚠️",
  "Other": "📝"
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

export default function TicketCard({ ticket, onStatusChange, onClick, isDragging }) {
  return (
    <div
      onClick={onClick}
      className={`backdrop-blur-md bg-white/30 border border-white/40 rounded-xl p-4 transition-all cursor-grab group ${
        isDragging 
          ? "shadow-2xl scale-105 bg-white/50 border-white/60 rotate-3 cursor-grabbing ring-4 ring-white/30" 
          : "hover:bg-white/40 shadow-lg hover:shadow-xl"
      }`}
      style={{
        transition: isDragging ? 'none' : 'all 0.2s ease'
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{inquiryTypeIcons[ticket.inquiry_type]}</span>
            <h4 className="text-white font-semibold truncate">{ticket.client_name}</h4>
          </div>
          <Badge className={`${priorityColors[ticket.priority]} border text-xs`}>
            {ticket.priority}
          </Badge>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-white hover:bg-white/20"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="backdrop-blur-xl bg-white/95 border-white/40">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange(ticket.id, "New"); }}>
              Move to New
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange(ticket.id, "In Progress"); }}>
              Move to In Progress
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange(ticket.id, "Resolved"); }}>
              Move to Resolved
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange(ticket.id, "Closed"); }}>
              Move to Closed
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Inquiry Type */}
      <div className="mb-3">
        <Badge variant="outline" className="bg-white/20 text-white border-white/40 text-xs">
          {ticket.inquiry_type}
        </Badge>
      </div>

      {/* Special Indicators */}
      {ticket.inquiry_type === "Cancellation" && ticket.discount_offered && (
        <div className="backdrop-blur-sm bg-[#b67651]/30 border border-[#b67651]/50 rounded-lg p-2 mb-3 flex items-center gap-2">
          <Gift className="w-4 h-4 text-white flex-shrink-0" />
          <span className="text-white text-xs font-medium">
            {ticket.discount_offered} Discount Offered
          </span>
        </div>
      )}

      {/* Contact Info */}
      <div className="space-y-1.5 mb-3">
        <div className="flex items-center gap-2 text-white/90 text-sm">
          <Mail className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{ticket.client_email}</span>
        </div>
        {ticket.client_phone && (
          <div className="flex items-center gap-2 text-white/90 text-sm">
            <Phone className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{ticket.client_phone}</span>
          </div>
        )}
      </div>

      {/* Timestamp */}
      <div className="text-white/70 text-xs">
        {formatDateEST(ticket.created_date)} EST
      </div>
    </div>
  );
}
