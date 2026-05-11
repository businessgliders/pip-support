import React, { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, ArrowRight, Sparkles } from "lucide-react";

const DAYS_THRESHOLD = 20;

const daysSince = (dateString) => {
  if (!dateString) return 0;
  let iso = dateString;
  if (typeof dateString === "string" && !dateString.endsWith("Z") && !dateString.includes("+")) {
    iso = dateString + "Z";
  }
  const diffMs = Date.now() - new Date(iso).getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
};

const formatDate = (dateString) => {
  let iso = dateString;
  if (typeof dateString === "string" && !dateString.endsWith("Z") && !dateString.includes("+")) {
    iso = dateString + "Z";
  }
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export default function ResolvedCleanupPopup({ isOpen, resolvedTickets, onClose, onMoveToClosed }) {
  // Old tickets eligible for cleanup (created over 20 days ago)
  const oldTickets = useMemo(
    () => (resolvedTickets || [])
      .filter(t => daysSince(t.created_date) >= DAYS_THRESHOLD)
      .sort((a, b) => daysSince(b.created_date) - daysSince(a.created_date)),
    [resolvedTickets]
  );

  // Select all by default
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isMoving, setIsMoving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set(oldTickets.map(t => t.id)));
    }
  }, [isOpen, oldTickets]);

  const toggleOne = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const allSelected = oldTickets.length > 0 && selectedIds.size === oldTickets.length;
  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(oldTickets.map(t => t.id)));
  };

  const handleConfirm = async () => {
    setIsMoving(true);
    const ids = Array.from(selectedIds);
    await onMoveToClosed(ids);
    setIsMoving(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="backdrop-blur-2xl bg-white/95 border-white/40 max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-400 flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl">Tidy Up Resolved Tickets</DialogTitle>
              <p className="text-sm text-gray-600 mt-1">
                Your Resolved column has {resolvedTickets?.length || 0} tickets. Move older ones to Closed to keep things clean.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6 py-2 min-h-0">
          {oldTickets.length === 0 ? (
            <div className="text-center py-10">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-gray-700 font-medium">No resolved tickets older than {DAYS_THRESHOLD} days.</p>
              <p className="text-gray-500 text-sm mt-1">Great job staying on top of things!</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleAll}
                    id="select-all-cleanup"
                  />
                  <label htmlFor="select-all-cleanup" className="text-sm font-medium text-gray-800 cursor-pointer">
                    Select all ({oldTickets.length} eligible)
                  </label>
                </div>
                <Badge className="bg-pink-500 text-white border-0">
                  {selectedIds.size} selected
                </Badge>
              </div>

              <div className="space-y-2">
                {oldTickets.map(ticket => {
                  const isSelected = selectedIds.has(ticket.id);
                  const age = daysSince(ticket.created_date);
                  return (
                    <div
                      key={ticket.id}
                      onClick={() => toggleOne(ticket.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? "bg-pink-50 border-pink-300 shadow-sm"
                          : "bg-white border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleOne(ticket.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          {ticket.ticket_number && (
                            <span className="text-xs text-gray-500 font-mono">#{ticket.ticket_number}</span>
                          )}
                          <span className="font-semibold text-sm text-gray-900 truncate">
                            {ticket.client_name}
                          </span>
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                            {ticket.inquiry_type}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          Created {formatDate(ticket.created_date)}
                        </p>
                      </div>
                      <Badge className={`flex-shrink-0 ${age >= 30 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"} border-0`}>
                        {age}d old
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 pt-2 border-t">
          <Button variant="outline" onClick={onClose} disabled={isMoving}>
            Not Now
          </Button>
          {oldTickets.length > 0 && (
            <Button
              onClick={handleConfirm}
              disabled={selectedIds.size === 0 || isMoving}
              className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white gap-2"
            >
              {isMoving ? "Moving..." : (
                <>
                  Move {selectedIds.size} to Closed
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}