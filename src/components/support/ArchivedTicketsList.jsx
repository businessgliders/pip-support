import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Archive, ChevronDown, ChevronRight } from "lucide-react";

const formatDateEST = (dateString) => {
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

const getMonthKey = (dateString) => {
  let iso = dateString;
  if (typeof dateString === "string" && !dateString.endsWith("Z") && !dateString.includes("+")) {
    iso = dateString + "Z";
  }
  const d = new Date(iso);
  // Use EST/EDT to group months consistently with how dates are displayed
  const parts = d.toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "long",
    year: "numeric",
  });
  // parts looks like "May 2026"
  return parts;
};

const getMonthSortValue = (dateString) => {
  let iso = dateString;
  if (typeof dateString === "string" && !dateString.endsWith("Z") && !dateString.includes("+")) {
    iso = dateString + "Z";
  }
  const d = new Date(iso);
  // Year * 12 + month, computed in EST
  const y = parseInt(d.toLocaleString("en-US", { timeZone: "America/New_York", year: "numeric" }), 10);
  const m = parseInt(d.toLocaleString("en-US", { timeZone: "America/New_York", month: "numeric" }), 10);
  return y * 12 + m;
};

export default function ArchivedTicketsList({ tickets, onView, onRestore }) {
  // Group tickets by month (using updated_date, falling back to created_date)
  const groups = useMemo(() => {
    const map = new Map();
    for (const t of tickets) {
      const dateStr = t.updated_date || t.created_date;
      if (!dateStr) continue;
      const key = getMonthKey(dateStr);
      if (!map.has(key)) {
        map.set(key, { key, sortValue: getMonthSortValue(dateStr), tickets: [] });
      }
      map.get(key).tickets.push(t);
    }
    // Sort tickets within each group newest first
    for (const g of map.values()) {
      g.tickets.sort((a, b) => {
        const aD = new Date((a.updated_date || a.created_date) + "").getTime();
        const bD = new Date((b.updated_date || b.created_date) + "").getTime();
        return bD - aD;
      });
    }
    // Sort groups newest month first
    return Array.from(map.values()).sort((a, b) => b.sortValue - a.sortValue);
  }, [tickets]);

  // Expanded state: most recent month expanded by default
  const [expanded, setExpanded] = useState(() => {
    const set = new Set();
    if (groups[0]) set.add(groups[0].key);
    return set;
  });

  // When the grouping changes (e.g. filter), make sure newest is open if nothing is open
  React.useEffect(() => {
    setExpanded(prev => {
      if (prev.size > 0) return prev;
      const next = new Set();
      if (groups[0]) next.add(groups[0].key);
      return next;
    });
  }, [groups]);

  const toggle = (key) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  if (tickets.length === 0) {
    return (
      <div className="text-center py-12">
        <Archive className="w-16 h-16 text-white/50 mx-auto mb-4" />
        <p className="text-white/90 text-lg font-medium">No archived tickets</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map(group => {
        const isOpen = expanded.has(group.key);
        return (
          <div
            key={group.key}
            className="backdrop-blur-md bg-white/30 border border-white/40 rounded-xl overflow-hidden shadow-sm"
          >
            <button
              type="button"
              onClick={() => toggle(group.key)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/30 transition-all"
            >
              <div className="flex items-center gap-3">
                {isOpen ? (
                  <ChevronDown className="w-5 h-5 text-gray-800" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-800" />
                )}
                <span className="font-semibold text-gray-900">{group.key}</span>
              </div>
              <Badge className="bg-white/60 text-gray-900 border-white/70 shadow-sm">
                {group.tickets.length} ticket{group.tickets.length === 1 ? "" : "s"}
              </Badge>
            </button>
            {isOpen && (
              <div className="border-t border-white/40 p-3 space-y-2">
                {group.tickets.map(ticket => (
                  <div
                    key={ticket.id}
                    className="backdrop-blur-md bg-white/40 border border-white/40 rounded-lg p-4 flex items-center justify-between hover:bg-white/55 transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h4 className="text-gray-900 font-bold">{ticket.client_name}</h4>
                        <Badge className="bg-white/60 text-gray-900 border-white/70 shadow-sm">
                          {ticket.inquiry_type}
                        </Badge>
                        <Badge className="bg-gray-500/20 text-gray-800 border-gray-400/40 shadow-sm">
                          {ticket.status}
                        </Badge>
                      </div>
                      <p className="text-gray-800 font-medium text-sm truncate">{ticket.client_email}</p>
                      <p className="text-gray-600 text-xs mt-1 font-medium">
                        Archived from {ticket.status} • {formatDateEST(ticket.updated_date)} EST
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        onClick={() => onView(ticket)}
                        variant="outline"
                        size="sm"
                        className="backdrop-blur-md bg-white/50 border-white/60 text-gray-900 hover:bg-white/70 shadow-sm"
                      >
                        View
                      </Button>
                      <Button
                        onClick={() => onRestore(ticket.id)}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white shadow-sm"
                      >
                        Restore
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}