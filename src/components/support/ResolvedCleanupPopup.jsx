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
import CleanupTicketRow from "./CleanupTicketRow";

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

export default function ResolvedCleanupPopup({ isOpen, resolvedTickets, onClose, onMoveToClosed, currentUser }) {
  // Old tickets eligible for cleanup (created over 20 days ago, assigned to current user)
  const oldTickets = useMemo(
    () => (resolvedTickets || [])
      .filter(t => daysSince(t.created_date) >= DAYS_THRESHOLD)
      .filter(t => !currentUser?.email || t.assigned_to === currentUser.email)
      .sort((a, b) => daysSince(b.created_date) - daysSince(a.created_date)),
    [resolvedTickets, currentUser?.email]
  );

  // Select all by default
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isMoving, setIsMoving] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set(oldTickets.map(t => t.id)));
      setShowSplash(true);
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

        {showSplash ? (
          <div className="flex-1 overflow-y-auto -mx-6 px-6 py-2 min-h-0">
            <div className="flex flex-col items-center text-center py-2">
              <img
                src="https://media.base44.com/images/public/690aaf0c732696417648d224/9528a60ef_generated_image.png"
                alt="Tidy up illustration"
                className="w-64 h-64 object-contain mb-3 rounded-2xl shadow-md"
              />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">What is Tidy Up?</h3>
              <div className="max-w-md space-y-2 text-sm text-gray-600">
                <p>
                  When tickets have been sitting in <strong className="text-pink-600">Resolved</strong> for a while, it usually means the issue is fully handled and the client has stopped replying.
                </p>
                <p>
                  Tidy Up finds Resolved tickets older than <strong>{DAYS_THRESHOLD} days</strong> and lets you bulk-move them to <strong className="text-gray-700">Closed</strong> — keeping your board focused on what's currently active.
                </p>
                <p className="text-xs text-gray-500 italic pt-1">
                  Closed tickets are never deleted — you can always restore them from the Archive view.
                </p>
              </div>
            </div>
          </div>
        ) : (
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
                {oldTickets.map(ticket => (
                  <CleanupTicketRow
                    key={ticket.id}
                    ticket={ticket}
                    isSelected={selectedIds.has(ticket.id)}
                    onToggle={toggleOne}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
        )}

        <DialogFooter className="flex-shrink-0 pt-2 border-t">
          {!showSplash && (
            <Button variant="outline" onClick={onClose} disabled={isMoving}>
              Not Now
            </Button>
          )}
          {showSplash ? (
            <Button
              onClick={() => setShowSplash(false)}
              className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white gap-2"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : oldTickets.length > 0 && (
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