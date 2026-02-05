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

export default function TicketCard({ ticket, onStatusChange, onClick, isDragging, isHighlighted }) {
  return (
    <div
      onClick={onClick}
      className={`backdrop-blur-md bg-white/40 border border-white/50 rounded-xl p-2 md:p-4 transition-all group ${
        isDragging 
          ? "shadow-2xl scale-105 bg-white/70 border-white/80 rotate-2 cursor-grabbing ring-4 ring-white/40" 
          : isHighlighted
          ? "shadow-2xl bg-white/70 border-yellow-400/80 ring-4 ring-yellow-400/50 animate-shake cursor-grab"
          : "hover:bg-white/50 shadow-lg hover:shadow-xl cursor-grab"
      }`}
    >
      {/* Mobile Compact View */}
      <div className="md:hidden">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className="text-sm">{inquiryTypeIcons[ticket.inquiry_type]}</span>
            <h4 className="text-white font-medium truncate text-xs">{ticket.client_name}</h4>
          </div>
          {!isDragging && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 text-white hover:bg-white/20"
                >
                  <MoreVertical className="w-3 h-3" />
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
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline" className="bg-white/20 text-white border-white/40 text-[10px] px-1.5 py-0">
            {ticket.inquiry_type}
          </Badge>
          <span className="text-white/70 text-[10px]">
            {new Date(ticket.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Desktop Full View */}
      <div className="hidden md:block">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{inquiryTypeIcons[ticket.inquiry_type]}</span>
              <h4 className="text-white font-semibold truncate text-base">{ticket.client_name}</h4>
            </div>
            <Badge className={`${priorityColors[ticket.priority]} border text-xs`}>
              {ticket.priority}
            </Badge>
          </div>
          
          {!isDragging && (
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
          )}
        </div>

        <div className="mb-3">
          <Badge variant="outline" className="bg-white/20 text-white border-white/40 text-xs">
            {ticket.inquiry_type}
          </Badge>
        </div>

        {ticket.inquiry_type === "Cancellation" && ticket.discount_offered && (
          <div className="mb-3 space-y-2">
            <div className="backdrop-blur-sm bg-[#b67651]/30 border border-[#b67651]/50 rounded-lg p-2 flex items-center gap-2">
              <Gift className="w-4 h-4 text-white flex-shrink-0" />
              <span className="text-white text-xs font-medium">
                {ticket.discount_offered} offer
              </span>
            </div>
            
            {ticket.discount_accepted !== undefined && ticket.discount_accepted !== null && (
              <div className={`rounded-lg p-2 flex items-center gap-2 ${
                ticket.discount_accepted 
                  ? 'bg-green-500/30 border border-green-400/50' 
                  : 'bg-gray-400/30 border border-gray-300/50'
              }`}>
                <span className="text-sm">{ticket.discount_accepted ? '🎉' : '😔'}</span>
                <span className="text-white text-xs font-medium">
                  {ticket.discount_accepted ? 'Accepted!' : 'Declined'}
                </span>
              </div>
            )}
          </div>
        )}

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

        <div className="text-white/70 text-xs">
          {formatDateEST(ticket.created_date)} EST
        </div>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out 3;
        }
      `}</style>
    </div>
  );
}