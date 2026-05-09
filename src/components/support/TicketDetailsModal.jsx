import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Mail, Phone, Calendar, MessageSquare, Gift, User, History, ExternalLink, Send, UserPlus, ChevronDown, ChevronUp, Sparkles, Clock, CheckCircle, XCircle } from "lucide-react";
import EmailThreadPanel from "../email/EmailThreadPanel";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const priorityColors = {
  "Low": "bg-green-500/20 text-green-700 border-green-400/40",
  "Medium": "bg-yellow-500/20 text-yellow-700 border-yellow-400/40",
  "High": "bg-orange-500/20 text-orange-700 border-orange-400/40",
  "Urgent": "bg-red-500/20 text-red-700 border-red-400/40"
};

const statusColors = {
  "New": "bg-pink-500/20 text-pink-700 border-pink-400/40",
  "In Progress": "bg-blue-500/20 text-blue-700 border-blue-400/40",
  "Resolved": "bg-green-500/20 text-green-700 border-green-400/40",
  "Closed": "bg-gray-500/20 text-gray-700 border-gray-400/40"
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
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

const formatShortDateEST = (dateString) => {
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
    year: 'numeric'
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
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  const time = date.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24 && dateEST.getDate() === nowEST.getDate()) return `Today ${time}`;
  if (diffDays === 1) return `Yesterday ${time}`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

export default function TicketDetailsModal({ ticket, onClose, onStatusChange, onTicketClick, currentUser, isOwner, allUsers, highlightMessageId }) {
  const [relatedTickets, setRelatedTickets] = useState([]);
  const [loadingRelated, setLoadingRelated] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState(ticket.assigned_to || "info@pilatesinpinkstudio.com");
  const [showRelatedTickets, setShowRelatedTickets] = useState(false);
  const [showInternalNotes, setShowInternalNotes] = useState(false);
  const [showStatusHistory, setShowStatusHistory] = useState(true); // expanded by default
  const [systemAlert, setSystemAlert] = useState(null);
  const [statusPrompt, setStatusPrompt] = useState(null);
  const [statusNote, setStatusNote] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);
  const scrollRef = React.useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setIsScrolled(el.scrollTop > 4);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const fetchRelatedTickets = async () => {
      try {
        const allTickets = await base44.entities.SupportTicket.list("-created_date");
        
        // Find tickets with same email or phone, excluding current ticket
        const related = allTickets.filter(t => 
          t.id !== ticket.id && (
            t.client_email === ticket.client_email ||
            (ticket.client_phone && t.client_phone === ticket.client_phone)
          )
        );
        
        setRelatedTickets(related);
      } catch (error) {
        console.error("Failed to fetch related tickets:", error);
      } finally {
        setLoadingRelated(false);
      }
    };

    fetchRelatedTickets();
  }, [ticket]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    setIsAddingComment(true);
    try {
      const comments = ticket.comments || [];
      const newCommentObj = {
        user_email: currentUser.email,
        comment: newComment,
        timestamp: new Date().toISOString()
      };
      comments.push(newCommentObj);
      
      await base44.entities.SupportTicket.update(ticket.id, { comments });
      ticket.comments = comments;
      
      // Send email notification to assigned user
      if (ticket.assigned_to && ticket.assigned_to !== currentUser.email) {
        const assignedUser = allUsers.find(u => u.email === ticket.assigned_to);
        const assignedUserName = assignedUser?.full_name || ticket.assigned_to.split('@')[0];
        const commenterName = currentUser.full_name || currentUser.email.split('@')[0];
        
        // Build comments trail HTML
        const commentsTrailHTML = comments.slice(-5).reverse().map(c => {
          const commentUser = allUsers.find(u => u.email === c.user_email);
          const displayName = c.user_email === 'info@pilatesinpinkstudio.com' 
            ? 'Front Desk' 
            : (commentUser?.full_name || c.user_email.split('@')[0]);
          
          return `
            <div style="background: ${c.user_email === currentUser.email ? '#f1899b20' : '#f8f9fa'}; padding: 15px; border-radius: 10px; margin-bottom: 12px; border-left: 4px solid ${c.user_email === currentUser.email ? '#f1899b' : '#e0e0e0'};">
              <p style="color: #333; margin: 0 0 8px 0; white-space: pre-wrap; line-height: 1.6;">${c.comment}</p>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="color: #666; font-size: 12px; font-weight: 600;">${displayName}</span>
                <span style="color: #999; font-size: 12px;">•</span>
                <span style="color: #999; font-size: 12px;">${formatRelativeTime(c.timestamp)}</span>
              </div>
            </div>
          `;
        }).join('');
        
        await base44.integrations.Core.SendEmail({
          from_name: "Pilates in Pink Support",
          to: ticket.assigned_to,
          subject: `New Comment on Ticket: ${ticket.client_name}`,
          body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #f1899b 0%, #f7b1bd 50%, #fbe0e2 100%); padding: 40px 20px;">
              <div style="background: white; border-radius: 20px; padding: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
                <div style="text-align: center; margin-bottom: 30px;">
                  <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_690aada19e27fe8fcf067828/45da48106_Pilatesinpinklogojusticon1.png" alt="Pilates in Pink" style="width: 80px; height: 80px;">
                  <h1 style="color: #f1899b; margin: 15px 0 10px 0; font-size: 28px;">💬 New Comment</h1>
                  <p style="color: #666; margin: 0;">${commenterName} commented on your ticket</p>
                </div>
                
                <div style="background: linear-gradient(135deg, #f1899b20, #fbe0e220); border-left: 4px solid #f1899b; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                  <h2 style="color: #333; margin: 0 0 15px 0; font-size: 20px;">${ticket.client_name}</h2>
                  <p style="margin: 8px 0; color: #555;"><strong>Email:</strong> ${ticket.client_email}</p>
                  ${ticket.client_phone ? `<p style="margin: 8px 0; color: #555;"><strong>Phone:</strong> ${ticket.client_phone}</p>` : ''}
                  <p style="margin: 8px 0; color: #555;"><strong>Status:</strong> <span style="background: #e3f2fd; padding: 4px 12px; border-radius: 12px; color: #1976d2;">${ticket.status}</span></p>
                </div>
                
                <div style="margin-bottom: 30px;">
                  <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">Recent Comments</h3>
                  ${commentsTrailHTML}
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                  <a href="https://support.pilatesinpinkstudio.com/TicketBoard?ticket=${ticket.id}" style="display: inline-block; background: #f1899b; color: white; padding: 14px 32px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px;">View Ticket & Reply</a>
                </div>
                
                <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center;">
                  <p style="color: #999; margin: 5px 0; font-size: 13px;">Pilates in Pink Support System</p>
                  <p style="color: #999; margin: 5px 0; font-size: 12px;">You're receiving this because you're assigned to this ticket</p>
                </div>
              </div>
            </div>
          `
        });
      }
      
      setNewComment("");
    } catch (error) {
      console.error("Failed to add comment:", error);
    } finally {
      setIsAddingComment(false);
    }
  };

  const handleAssignment = async () => {
    if (selectedAssignee === ticket.assigned_to) return;
    
    try {
      await base44.entities.SupportTicket.update(ticket.id, { 
        assigned_to: selectedAssignee 
      });
      
      // Send assignment email via Gmail (works for any address, not just Base44 users)
      try {
        await base44.functions.invoke('sendAssignmentEmail', {
          ticket_id: ticket.id,
          assigned_to: selectedAssignee,
        });
      } catch (notifyErr) {
        console.error('Assignment email failed:', notifyErr);
      }

      ticket.assigned_to = selectedAssignee;
      setSystemAlert({ message: 'Ticket assigned successfully!', onClose: onClose });
    } catch (error) {
      console.error("Failed to assign ticket:", error);
      setSystemAlert({ message: 'Failed to assign ticket' });
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl backdrop-blur-2xl bg-white/95 border-white/40 max-h-[90vh] overflow-hidden md:text-base text-xs p-0">
        <div ref={scrollRef} className="overflow-y-auto max-h-[90vh] p-6">
        <DialogHeader className={`sticky -top-6 -mx-6 -mt-6 px-6 pt-6 pb-3 z-20 bg-white/95 backdrop-blur-xl transition-shadow ${isScrolled ? "shadow-[0_8px_16px_-8px_rgba(0,0,0,0.15)]" : ""} after:content-[''] after:absolute after:left-0 after:right-0 after:-bottom-4 after:h-4 after:pointer-events-none after:transition-opacity ${isScrolled ? "after:opacity-100" : "after:opacity-0"} after:bg-gradient-to-b after:from-white/90 after:to-transparent`}>
          <div className="flex items-start justify-between gap-4 pr-8">
            <div className="flex items-start gap-3 min-w-0 md:flex-[3]">
              <div className="text-left min-w-0 flex-1">
                <DialogTitle className="text-lg md:text-2xl mb-2 truncate">
                  {ticket.ticket_number && <span className="text-gray-400 font-normal mr-2">#{ticket.ticket_number}</span>}
                  {ticket.client_name}
                </DialogTitle>
                <div className="flex gap-2 flex-wrap">
                  <Badge className={`${priorityColors[ticket.priority]} border`}>
                    {ticket.priority}
                  </Badge>
                  <Badge variant="outline" className="bg-gray-50">
                    {ticket.inquiry_type}
                  </Badge>
                </div>
              </div>

              {/* Email/Call buttons - aligned to right edge of left column */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  asChild
                  size="icon"
                  variant="outline"
                  title="Email Client"
                  className="h-9 w-9"
                >
                  <a href={`mailto:${ticket.client_email}`}>
                    <Mail className="w-4 h-4" />
                  </a>
                </Button>
                {ticket.client_phone && (
                  <Button
                    asChild
                    size="icon"
                    variant="outline"
                    title="Call Client"
                    className="h-9 w-9"
                  >
                    <a href={`tel:${ticket.client_phone}`}>
                      <Phone className="w-4 h-4" />
                    </a>
                  </Button>
                )}
              </div>
            </div>

            {/* Right-aligned: status pills */}
            <div className="flex items-center gap-2 flex-shrink-0 md:flex-[2] md:justify-start">
              {/* Desktop status pills */}
              <div className="hidden md:flex items-center gap-1.5">
                {[
                  { status: "New", icon: Sparkles, color: "bg-pink-500" },
                  { status: "In Progress", icon: Clock, color: "bg-blue-500" },
                  { status: "Resolved", icon: CheckCircle, color: "bg-green-500" },
                  { status: "Closed", icon: XCircle, color: "bg-gray-500" }
                ].map(({ status, icon: Icon, color }, index) => {
                  const isActive = ticket.status === status;
                  return (
                    <React.Fragment key={status}>
                      <button
                        onClick={() => {
                          if (!isActive) {
                            setStatusPrompt({ ticketId: ticket.id, newStatus: status });
                            setStatusNote("");
                          }
                        }}
                        disabled={isActive}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                          isActive
                            ? `${color} text-white shadow`
                            : "bg-white border border-gray-300 text-gray-600 hover:border-gray-400 hover:shadow-sm"
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        {status}
                      </button>
                      {index < 3 && <div className="text-gray-300 text-xs">→</div>}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Mobile status select */}
          <div className="md:hidden mt-3">
            <Select
              value={ticket.status}
              onValueChange={(newStatus) => {
                if (ticket.status !== newStatus) {
                  setStatusPrompt({ ticketId: ticket.id, newStatus });
                  setStatusNote("");
                }
              }}
            >
              <SelectTrigger className="w-full h-9 bg-gradient-to-r from-pink-50 to-purple-50 border-2 text-xs">
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="New">✨ New</SelectItem>
                <SelectItem value="In Progress">🕒 In Progress</SelectItem>
                <SelectItem value="Resolved">✅ Resolved</SelectItem>
                <SelectItem value="Closed">❌ Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </DialogHeader>

                    <div className="flex flex-col md:flex-row gap-6">
                      {/* Left Section - Cancellation + Email */}
                      <div className="w-full md:flex-[3] space-y-4 md:min-w-0 order-2 md:order-1">
          {/* Cancellation Details */}
          {ticket.inquiry_type === "Cancellation" && (
            <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-4 border border-red-200">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                ⚠️ Cancellation Request
              </h3>
              
              {ticket.discount_offered && (
                <div className="mb-4 space-y-3">
                  <div className="bg-[#b67651]/10 border border-[#b67651]/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Gift className="w-5 h-5 text-[#b67651]" />
                      <span className="font-semibold text-[#b67651] text-lg">
                        {ticket.discount_offered} Special Offer
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Personalized pricing offered to help keep client in our community
                    </p>
                  </div>

                  {/* Client's Decision */}
                  {ticket.discount_accepted !== undefined && ticket.discount_accepted !== null && (
                    <div className={`border-2 rounded-lg p-4 ${
                      ticket.discount_accepted 
                        ? 'bg-green-50 border-green-400'
                        : 'bg-gray-50 border-gray-300'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          ticket.discount_accepted ? 'bg-green-500' : 'bg-gray-400'
                        }`}>
                          <span className="text-2xl">{ticket.discount_accepted ? '🎉' : '😔'}</span>
                        </div>
                        <div className="flex-1">
                          <p className={`font-semibold ${
                            ticket.discount_accepted ? 'text-green-700' : 'text-gray-700'
                          }`}>
                            {ticket.discount_accepted 
                              ? '✨ Client Accepted the Offer!' 
                              : 'Client Chose to Continue with Cancellation'}
                          </p>
                          <p className={`text-sm ${
                            ticket.discount_accepted ? 'text-green-600' : 'text-gray-600'
                          }`}>
                            {ticket.discount_accepted 
                              ? 'Great news! They want to keep their membership with the special pricing.' 
                              : 'They decided not to take the discount offer.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3">
                {ticket.cancellation_reason && (
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Reason for Cancellation:</p>
                    <p className="text-gray-900">{ticket.cancellation_reason}</p>
                  </div>
                )}
                
                {ticket.cancellation_satisfaction && (
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Satisfaction Level:</p>
                    <p className="text-gray-900">{ticket.cancellation_satisfaction}</p>
                  </div>
                )}
                
                {ticket.cancellation_feedback && (
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Additional Feedback:</p>
                    <p className="text-gray-900 whitespace-pre-wrap">{ticket.cancellation_feedback}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Email Communications */}
          <EmailThreadPanel ticket={ticket} currentUser={currentUser} highlightMessageId={highlightMessageId} />
                      </div>

              {/* Divider */}
              <Separator orientation="vertical" className="hidden md:block h-auto" />

              {/* Right Section - Contact + Status History + Escalate + Related + Internal Notes */}
              <div className="flex-1 md:flex-[2] space-y-4 md:min-w-0 order-1 md:order-2">

          {/* Contact Information */}
          <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-4 border border-pink-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 flex-shrink-0 mb-3">
              <User className="w-4 h-4" />
              Contact Information
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-gray-700">
                <Mail className="w-4 h-4 flex-shrink-0 text-pink-600" />
                <a href={`mailto:${ticket.client_email}`} className="hover:underline">
                  {ticket.client_email}
                </a>
              </div>
              {ticket.client_phone && (
                <div className="flex items-center gap-3 text-gray-700">
                  <Phone className="w-4 h-4 flex-shrink-0 text-pink-600" />
                  <a href={`tel:${ticket.client_phone}`} className="hover:underline">
                    {ticket.client_phone}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-3 text-gray-700">
                <Calendar className="w-4 h-4 flex-shrink-0 text-pink-600" />
                <span>
                  Submitted {formatDateEST(ticket.created_date)} EST
                </span>
              </div>
            </div>
          </div>

          {/* Status History Timeline */}
          {ticket.status_history && ticket.status_history.length > 0 && (
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
              <button
                onClick={() => setShowStatusHistory(!showStatusHistory)}
                className="w-full flex items-center justify-between text-left"
              >
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Status History
                </h3>
                {showStatusHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showStatusHistory && (
                <div className="space-y-3 mt-3">
                  {[...ticket.status_history].reverse().map((entry, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full ${statusColors[entry.status]?.split(' ')[0].replace('bg-', 'bg-') || 'bg-gray-400'} border-2 border-white`} />
                        {index !== ticket.status_history.length - 1 && (
                          <div className="w-0.5 h-full bg-gray-300 mt-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">{entry.status}</span>
                          <span className="text-xs text-gray-500">
                            {formatRelativeTime(entry.timestamp)}
                          </span>
                        </div>
                        {entry.note && (
                          <p className="text-sm text-gray-600 mt-1">{entry.note}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Related Tickets History */}
          {(loadingRelated || relatedTickets.length > 0) && (
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
              <button
                onClick={() => setShowRelatedTickets(!showRelatedTickets)}
                className="w-full flex items-center justify-between text-left"
              >
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Client Ticket History
                  <Badge variant="outline">
                    {relatedTickets.length} previous ticket{relatedTickets.length !== 1 ? 's' : ''}
                  </Badge>
                </h3>
                {showRelatedTickets ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showRelatedTickets && (
                <div className="mt-3">
                  {loadingRelated ? (
                    <div className="space-y-2">
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {relatedTickets.map((relatedTicket) => (
                        <div
                          key={relatedTicket.id}
                          onClick={() => {
                            onClose();
                            setTimeout(() => onTicketClick(relatedTicket), 100);
                          }}
                          className="bg-white/60 rounded-lg p-3 border border-purple-200/50 hover:bg-white/80 transition-all cursor-pointer hover:border-purple-300"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs">
                                  {relatedTicket.inquiry_type}
                                </Badge>
                                <Badge className={`${statusColors[relatedTicket.status]} border text-xs`}>
                                  {relatedTicket.status}
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-600">
                                {formatRelativeTime(relatedTicket.created_date)}
                              </p>
                              {relatedTicket.inquiry_type === "Cancellation" && relatedTicket.discount_offered && (
                                <p className="text-xs text-[#b67651] font-medium mt-1">
                                  🎁 {relatedTicket.discount_offered} discount offered
                                </p>
                              )}
                            </div>
                            <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}



          {/* Internal Notes Section */}
          <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-4 border border-teal-200">
            <button
              onClick={() => setShowInternalNotes(!showInternalNotes)}
              className="w-full flex items-center justify-between text-left"
            >
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Internal Notes
                {ticket.comments && ticket.comments.length > 0 && (
                  <Badge variant="outline">
                    {ticket.comments.length} note{ticket.comments.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </h3>
              {showInternalNotes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showInternalNotes && (
              <div className="mt-3">
                {/* Existing Comments */}
                {ticket.comments && ticket.comments.length > 0 && (
                  <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                    {ticket.comments.map((comment, index) => {
                      const commentUser = allUsers.find(u => u.email === comment.user_email);
                      const displayName = comment.user_email === 'info@pilatesinpinkstudio.com' 
                        ? 'Front Desk' 
                        : (commentUser?.full_name || comment.user_email.split('@')[0]);
                      return (
                        <div key={index} className="bg-white/60 rounded-lg p-3 border border-teal-200/50">
                          <p className="text-base text-gray-900 whitespace-pre-wrap mb-2">{comment.comment}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="font-medium">{displayName}</span>
                            <span>•</span>
                            <span>{formatRelativeTime(comment.timestamp)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add Internal Note */}
                <div className="space-y-2">
                  <Label htmlFor="new-comment">Add Note</Label>
                  <Textarea
                    id="new-comment"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Type an internal note here..."
                    className="min-h-20"
                  />
                  <Button
                    onClick={handleAddComment}
                    disabled={isAddingComment || !newComment.trim()}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Add Note
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Escalate Ticket Section */}
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-4 border border-indigo-200">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Escalate Ticket
            </h3>
            <div className="flex gap-2">
              <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {allUsers.filter(u => u.email.endsWith('@pilatesinpinkstudio.com')).map(u => (
                    <SelectItem key={u.id} value={u.email}>
                      {u.email === 'info@pilatesinpinkstudio.com'
                        ? 'Front Desk'
                        : u.full_name ? u.full_name.split(' ')[0] : u.email.split('@')[0]
                      }
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleAssignment}
                disabled={selectedAssignee === ticket.assigned_to}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Assign
              </Button>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Currently assigned to: {
                ticket.assigned_to === 'info@pilatesinpinkstudio.com'
                  ? 'Front Desk'
                  : allUsers.find(u => u.email === ticket.assigned_to)?.full_name || ticket.assigned_to?.split('@')[0] || 'Unassigned'
              }
            </p>
          </div>
              </div>
              </div>
              
              {/* Nested System Dialogs */}
              {systemAlert && (
                <Dialog open={true} onOpenChange={() => {
                  if (systemAlert.onClose) systemAlert.onClose();
                  setSystemAlert(null);
                }}>
                  <DialogContent className="backdrop-blur-2xl bg-white/95 border-white/40">
                    <DialogHeader>
                      <DialogTitle>Notification</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                      <p className="text-gray-700">{systemAlert.message}</p>
                    </div>
                    <DialogFooter>
                      <Button onClick={() => {
                        if (systemAlert.onClose) systemAlert.onClose();
                        setSystemAlert(null);
                      }} className="bg-[#b67651] hover:bg-[#a56541] text-white">
                        OK
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}

              {statusPrompt && (
                <Dialog open={true} onOpenChange={() => setStatusPrompt(null)}>
                  <DialogContent className="backdrop-blur-2xl bg-white/95 border-white/40">
                    <DialogHeader>
                      <DialogTitle>Update Status</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <p className="text-gray-700">
                        Add a note for moving to <span className="font-medium text-green-600">{statusPrompt.newStatus}</span> (optional):
                      </p>
                      <Textarea
                        value={statusNote}
                        onChange={(e) => setStatusNote(e.target.value)}
                        placeholder="e.g., Spoke with client, confirmed resolution..."
                        className="min-h-24"
                      />
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setStatusPrompt(null)}>
                        Cancel
                      </Button>
                      <Button onClick={() => {
                        onStatusChange(statusPrompt.ticketId, statusPrompt.newStatus, statusNote);
                        setStatusPrompt(null);
                        onClose();
                      }} className="bg-[#b67651] hover:bg-[#a56541] text-white">
                        Confirm
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}

              </div>
              </DialogContent>
              </Dialog>
  );
}