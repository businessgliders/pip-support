import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Mail, Phone, Calendar, MessageSquare, Gift, User, History, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // Added Select imports

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
  // Parse the ISO string and format in EST/EDT
  const date = new Date(dateString);
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
  // Parse the ISO string and format in EST/EDT
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

export default function TicketDetailsModal({ ticket, onClose, onStatusChange, onTicketClick }) {
  const [relatedTickets, setRelatedTickets] = useState([]);
  const [loadingRelated, setLoadingRelated] = useState(true);

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

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl backdrop-blur-2xl bg-white/95 border-white/40 max-h-[90vh] overflow-y-auto md:text-base text-xs">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="text-left">
              <DialogTitle className="text-lg md:text-2xl mb-2">{ticket.client_name}</DialogTitle>
              <div className="flex gap-2">
                <Badge className={`${statusColors[ticket.status]} border`}>
                  {ticket.status}
                </Badge>
                <Badge className={`${priorityColors[ticket.priority]} border`}>
                  {ticket.priority}
                </Badge>
                <Badge variant="outline" className="bg-gray-50">
                  {ticket.inquiry_type}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Contact Information */}
          <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-4 border border-pink-200">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
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

          {/* Additional Notes */}
          {ticket.notes && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Additional Details
              </h3>
              <p className="text-gray-700 whitespace-pre-wrap">{ticket.notes}</p>
            </div>
          )}

          {/* Related Tickets History */}
          {(loadingRelated || relatedTickets.length > 0) && (
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <History className="w-4 h-4" />
                Client Ticket History
                <Badge variant="outline" className="ml-auto">
                  {relatedTickets.length} previous ticket{relatedTickets.length !== 1 ? 's' : ''}
                </Badge>
              </h3>
              
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
                        // Give a slight delay to allow the current modal to close completely
                        // before attempting to open a new one with the new ticket data.
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
                            {formatShortDateEST(relatedTicket.created_date)} EST
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

          {/* Status History Timeline */}
          {ticket.status_history && ticket.status_history.length > 0 && (
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <History className="w-4 h-4" />
                Status History
              </h3>
              <div className="space-y-3">
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
                          {formatShortDateEST(entry.timestamp)} EST
                        </span>
                      </div>
                      {entry.note && (
                        <p className="text-sm text-gray-600 mt-1">{entry.note}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Update Status - Dropdown on Mobile, Pipeline on Desktop */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Update Status</h3>
            
            {/* Desktop View - Pipeline */}
            <div className="hidden md:flex items-center gap-2">
              {["New", "In Progress", "Resolved", "Closed"].map((status, index) => (
                <React.Fragment key={status}>
                  <button
                    onClick={() => {
                      if (ticket.status !== status) {
                        const note = prompt(`Add a note for moving to ${status} (optional):`);
                        onStatusChange(ticket.id, status, note || "");
                        onClose();
                      }
                    }}
                    className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${
                      ticket.status === status
                        ? `${statusColors[status]} border-2 shadow-lg`
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300"
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-sm">{status}</div>
                    </div>
                  </button>
                  {index < 3 && (
                    <div className="text-gray-400">
                      →
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Mobile View - Dropdown */}
            <div className="md:hidden">
              <Select
                value={ticket.status}
                onValueChange={(newStatus) => {
                  if (ticket.status !== newStatus) {
                    const note = prompt(`Add a note for moving to ${newStatus} (optional):`);
                    onStatusChange(ticket.id, newStatus, note || "");
                    onClose();
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-3">
            <Button
              asChild
              className="flex-1 bg-[#b67651] hover:bg-[#a56541] text-white"
            >
              <a href={`mailto:${ticket.client_email}`}>
                <Mail className="w-4 h-4 mr-2" />
                Email Client
              </a>
            </Button>
            {ticket.client_phone && (
              <Button
                asChild
                variant="outline"
                className="flex-1"
              >
                <a href={`tel:${ticket.client_phone}`}>
                  <Phone className="w-4 h-4 mr-2" />
                  Call Client
                </a>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}