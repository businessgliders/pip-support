import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Mail, Phone, MoreVertical, Gift, User } from "lucide-react";
import { getPhotoForEmail } from "@/lib/userProfile";

const priorityBorderColors = {
  "Low": "border-green-500",
  "Medium": "border-yellow-500",
  "High": "border-orange-500",
  "Urgent": "border-red-500"
};

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

const inquiryTypeIcons = {
  "General Inquiry": "❓",
  "Membership Inquiry": "💳",
  "Private Events": "🎉",
  "Cancellation": "⚠️",
  "Other": "📝"
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

const formatRelativeTime = (dateString) => {
  let isoString = dateString;
  if (typeof dateString === 'string' && !dateString.endsWith('Z') && !dateString.includes('+')) {
    isoString = dateString + 'Z';
  }
  const date = new Date(isoString);
  const now = new Date();
  
  // Get dates in EST
  const dateEST = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const nowEST = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  
  const diffMs = nowEST - dateEST;
  const diffMins = Math.floor(diffMs / 60000);
  
  const dateESTOnly = new Date(dateEST.getFullYear(), dateEST.getMonth(), dateEST.getDate());
  const nowESTOnly = new Date(nowEST.getFullYear(), nowEST.getMonth(), nowEST.getDate());
  const diffDays = Math.round((nowESTOnly - dateESTOnly) / 86400000);
  
  const time = date.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} mins ago`;
  if (diffDays === 0) return `Today, ${time}`;
  if (diffDays === 1) return `Yesterday, ${time}`;
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

export default function TicketCard({ ticket, onStatusChange, onClick, isDragging, isHighlighted, allUsers = [], viewMode = "status" }) {
  // Watermark only shown in category view (where status isn't already visible via column).
  // In status view, category is already shown as a badge on the card, so no watermark needed.
  const watermarkText = viewMode === "category" ? ticket.status : null;
  const getInitials = (email) => {
    if (email === 'info@pilatesinpinkstudio.com') return 'FD';
    const user = allUsers.find(u => u.email === email);
    if (user?.full_name) {
      return user.full_name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  const getUserColor = (email) => {
    const hash = email.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return userColors[hash % 8];
  };
  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden backdrop-blur-md bg-white/40 border-2 ${priorityBorderColors[ticket.priority]} rounded-xl p-2 md:p-4 group ${
        isDragging 
          ? "shadow-2xl bg-white/90 cursor-grabbing ring-4 ring-white/60" 
          : isHighlighted
          ? "shadow-2xl bg-white/70 ring-4 ring-yellow-400/50 animate-shake cursor-grab transition-all"
          : "hover:bg-white/50 shadow-lg hover:shadow-xl cursor-grab transition-all"
      }`}
    >
      {/* Watermark - opposite dimension (status <-> category) */}
      {watermarkText && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1 right-2 text-[10px] md:text-xs font-black uppercase tracking-wider text-gray-900/10 select-none whitespace-nowrap"
        >
          {watermarkText}
        </span>
      )}

      {/* Mobile Compact View */}
      <div className="md:hidden">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className="text-sm">{inquiryTypeIcons[ticket.inquiry_type]}</span>
            <h4 className="text-gray-900 font-medium truncate text-xs">
              {ticket.ticket_number && <span className="text-gray-500 mr-1">#{ticket.ticket_number}</span>}
              {ticket.client_name}
            </h4>
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
          <Badge variant="outline" className="bg-white/20 text-gray-900 border-white/40 text-[10px] px-1.5 py-0">
            {ticket.inquiry_type}
          </Badge>
          <span className="text-gray-700 text-[10px]">
            {formatRelativeTime(ticket.created_date)}
          </span>
        </div>
      </div>

      {/* Desktop Full View */}
      <div className="hidden md:block">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{inquiryTypeIcons[ticket.inquiry_type]}</span>
              <h4 className="text-gray-900 font-semibold truncate text-base">
                {ticket.ticket_number && <span className="text-gray-500 font-normal mr-1.5">#{ticket.ticket_number}</span>}
                {ticket.client_name}
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-white/20 text-gray-900 border-white/40 text-xs">
                {ticket.inquiry_type}
              </Badge>
            </div>
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

        {ticket.inquiry_type === "Cancellation" && ticket.discount_offered && (
          <div className="mt-3 mb-3 space-y-2">
            <div className="backdrop-blur-sm bg-[#b67651]/30 border border-[#b67651]/50 rounded-lg p-2 flex items-center gap-2">
              <Gift className="w-4 h-4 text-gray-900 flex-shrink-0" />
              <span className="text-gray-900 text-xs font-medium">
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
                <span className="text-gray-900 text-xs font-medium">
                  {ticket.discount_accepted ? 'Accepted!' : 'Declined'}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-3">
          <div className="text-gray-700 text-xs">
            {formatRelativeTime(ticket.created_date)}
          </div>
          {ticket.assigned_to && (() => {
            const photo = getPhotoForEmail(ticket.assigned_to, allUsers);
            if (photo) {
              return (
                <div className="w-7 h-7 rounded-full overflow-hidden border-2 border-white/80 shadow-sm">
                  <img src={photo} alt={getInitials(ticket.assigned_to)} className="w-full h-full object-cover" />
                </div>
              );
            }
            return (
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${getUserColor(ticket.assigned_to)} shadow-sm`}>
                <User className="w-3 h-3 text-white" />
                <span className="text-white text-xs font-semibold">
                  {getInitials(ticket.assigned_to)}
                </span>
              </div>
            );
          })()}
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