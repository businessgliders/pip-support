import React, { useState, useMemo, useEffect } from "react";
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

const getYearMonth = (dateString) => {
  let iso = dateString;
  if (typeof dateString === "string" && !dateString.endsWith("Z") && !dateString.includes("+")) {
    iso = dateString + "Z";
  }
  const d = new Date(iso);
  const year = parseInt(
    d.toLocaleString("en-US", { timeZone: "America/New_York", year: "numeric" }),
    10
  );
  const monthNum = parseInt(
    d.toLocaleString("en-US", { timeZone: "America/New_York", month: "numeric" }),
    10
  );
  const monthName = d.toLocaleString("en-US", { timeZone: "America/New_York", month: "long" });
  return { year, monthNum, monthName, key: `${year}-${String(monthNum).padStart(2, "0")}`, label: `${monthName} ${year}` };
};

// Use the date the ticket was moved to Closed (from status_history) as the
// "archive date". Fall back to created_date if no Closed event is recorded.
// updated_date is unreliable because bulk-archiving rewrites it on every ticket.
const getArchiveDate = (t) => {
  const history = t.status_history || [];
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i]?.status === "Closed" && history[i]?.timestamp) {
      return history[i].timestamp;
    }
  }
  // Fall back to most recent status_history entry, then created_date
  const last = history[history.length - 1];
  return last?.timestamp || t.created_date;
};

export default function ArchivedTicketsList({ tickets, onView, onRestore }) {
  // Build a structure: { year -> [ { key, monthName, monthNum, count, tickets } ] }
  const { years, monthMap, allMonthKeys } = useMemo(() => {
    const months = new Map(); // key -> { key, year, monthNum, monthName, label, tickets }
    for (const t of tickets) {
      const dateStr = getArchiveDate(t);
      if (!dateStr) continue;
      const ym = getYearMonth(dateStr);
      if (!months.has(ym.key)) {
        months.set(ym.key, { ...ym, tickets: [] });
      }
      months.get(ym.key).tickets.push(t);
    }
    // Sort tickets newest first inside each month
    for (const m of months.values()) {
      m.tickets.sort((a, b) => {
        const aD = new Date(getArchiveDate(a) + "").getTime();
        const bD = new Date(getArchiveDate(b) + "").getTime();
        return bD - aD;
      });
    }
    // Group by year, sort years newest first, months newest first
    const byYear = new Map();
    for (const m of months.values()) {
      if (!byYear.has(m.year)) byYear.set(m.year, []);
      byYear.get(m.year).push(m);
    }
    for (const arr of byYear.values()) {
      arr.sort((a, b) => b.monthNum - a.monthNum);
    }
    const yearList = Array.from(byYear.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([year, monthsArr]) => ({ year, months: monthsArr }));

    const sortedKeys = yearList.flatMap(y => y.months.map(m => m.key));
    return { years: yearList, monthMap: months, allMonthKeys: sortedKeys };
  }, [tickets]);

  // Selected month key (most recent by default)
  const [selectedKey, setSelectedKey] = useState(allMonthKeys[0] || null);
  // Expanded years (most recent expanded by default)
  const [expandedYears, setExpandedYears] = useState(() => {
    const set = new Set();
    if (years[0]) set.add(years[0].year);
    return set;
  });

  // If the selected month disappears (filter changes), pick the newest available
  useEffect(() => {
    if (!selectedKey || !monthMap.has(selectedKey)) {
      setSelectedKey(allMonthKeys[0] || null);
    }
  }, [allMonthKeys, monthMap, selectedKey]);

  // Ensure the year of the selected month is expanded
  useEffect(() => {
    if (!selectedKey) return;
    const m = monthMap.get(selectedKey);
    if (!m) return;
    setExpandedYears(prev => {
      if (prev.has(m.year)) return prev;
      const next = new Set(prev);
      next.add(m.year);
      return next;
    });
  }, [selectedKey, monthMap]);

  const toggleYear = (year) => {
    setExpandedYears(prev => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year); else next.add(year);
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

  const selectedMonth = selectedKey ? monthMap.get(selectedKey) : null;

  return (
    <div className="flex flex-col md:flex-row gap-4 h-full min-h-0">
      {/* Sidebar */}
      <aside className="md:w-60 md:flex-shrink-0 backdrop-blur-md bg-white/30 border border-white/40 rounded-xl p-3 md:max-h-full md:overflow-y-auto">
        <h3 className="text-gray-900 font-semibold text-sm px-2 pb-2 mb-2 border-b border-white/40">
          Archive
        </h3>
        <div className="space-y-1">
          {years.map(({ year, months }) => {
            const isOpen = expandedYears.has(year);
            const yearTotal = months.reduce((sum, m) => sum + m.tickets.length, 0);
            return (
              <div key={year}>
                <button
                  type="button"
                  onClick={() => toggleYear(year)}
                  className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-white/40 transition-colors text-left"
                >
                  <span className="flex items-center gap-1.5">
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4 text-gray-700" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-700" />
                    )}
                    <span className="font-semibold text-gray-900 text-sm">{year}</span>
                  </span>
                  <span className="text-[11px] text-gray-700 bg-white/50 rounded-full px-2 py-0.5">
                    {yearTotal}
                  </span>
                </button>
                {isOpen && (
                  <div className="ml-5 mt-1 space-y-0.5">
                    {months.map(m => {
                      const active = m.key === selectedKey;
                      return (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => setSelectedKey(m.key)}
                          className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg text-sm text-left transition-colors ${
                            active
                              ? "bg-[#b67651] text-white shadow-sm"
                              : "text-gray-800 hover:bg-white/50"
                          }`}
                        >
                          <span>{m.monthName}</span>
                          <span className={`text-[11px] rounded-full px-2 py-0.5 ${
                            active ? "bg-white/30 text-white" : "bg-white/50 text-gray-700"
                          }`}>
                            {m.tickets.length}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* Main panel */}
      <div className="flex-1 min-w-0 md:overflow-y-auto">
        {selectedMonth ? (
          <>
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-white text-lg font-semibold drop-shadow">
                {selectedMonth.label}
              </h3>
              <Badge className="bg-white/60 text-gray-900 border-white/70 shadow-sm">
                {selectedMonth.tickets.length} ticket{selectedMonth.tickets.length === 1 ? "" : "s"}
              </Badge>
            </div>
            <div className="space-y-2">
              {selectedMonth.tickets.map(ticket => (
                <div
                  key={ticket.id}
                  className="backdrop-blur-md bg-white/40 border border-white/40 rounded-lg p-4 flex items-center justify-between hover:bg-white/55 transition-all shadow-sm"
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
                      Closed {formatDateEST(getArchiveDate(ticket))} EST
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
          </>
        ) : (
          <div className="text-center py-12 text-white/90">Select a month to view tickets.</div>
        )}
      </div>
    </div>
  );
}