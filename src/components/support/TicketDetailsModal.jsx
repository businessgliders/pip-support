import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Mail, Phone, Calendar, MessageSquare, Gift, User } from "lucide-react";
import { format } from "date-fns";

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

export default function TicketDetailsModal({ ticket, onClose, onStatusChange }) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl backdrop-blur-2xl bg-white/95 border-white/40 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl mb-2">{ticket.client_name}</DialogTitle>
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
                  Submitted {format(new Date(ticket.created_date), "MMMM d, yyyy 'at' h:mm a")}
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
                <div className="bg-[#b67651]/10 border border-[#b67651]/30 rounded-lg p-3 mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Gift className="w-5 h-5 text-[#b67651]" />
                    <span className="font-semibold text-[#b67651] text-lg">
                      {ticket.discount_offered} Retention Offer
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    System-calculated retention discount based on client feedback
                  </p>
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

          <Separator />

          {/* Status Actions */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Update Status</h3>
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => { onStatusChange(ticket.id, "New"); onClose(); }}
                variant="outline"
                className={`${ticket.status === "New" ? "bg-pink-50 border-pink-300" : ""}`}
              >
                New
              </Button>
              <Button
                onClick={() => { onStatusChange(ticket.id, "In Progress"); onClose(); }}
                variant="outline"
                className={`${ticket.status === "In Progress" ? "bg-blue-50 border-blue-300" : ""}`}
              >
                In Progress
              </Button>
              <Button
                onClick={() => { onStatusChange(ticket.id, "Resolved"); onClose(); }}
                variant="outline"
                className={`${ticket.status === "Resolved" ? "bg-green-50 border-green-300" : ""}`}
              >
                Resolved
              </Button>
              <Button
                onClick={() => { onStatusChange(ticket.id, "Closed"); onClose(); }}
                variant="outline"
                className={`${ticket.status === "Closed" ? "bg-gray-50 border-gray-300" : ""}`}
              >
                Closed
              </Button>
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