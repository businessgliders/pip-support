import React from "react";
import { CheckCircle2, XCircle, Clock, TrendingUp } from "lucide-react";

// Summary header showing overall forward-to-hub success rate across tickets.
export default function ForwardStatsBar({ tickets }) {
  const total = tickets.length;
  const success = tickets.filter((t) => t.hub_forward_status === "success").length;
  const failed = tickets.filter((t) => t.hub_forward_status === "failed").length;
  const pending = total - success - failed;
  const rate = total > 0 ? Math.round((success / total) * 100) : 0;

  const stats = [
    { label: "Total Tickets", value: total, icon: TrendingUp, color: "text-gray-700", bg: "bg-white/70" },
    { label: "Forwarded", value: success, icon: CheckCircle2, color: "text-green-700", bg: "bg-green-50" },
    { label: "Failed", value: failed, icon: XCircle, color: "text-red-700", bg: "bg-red-50" },
    { label: "Pending", value: pending, icon: Clock, color: "text-amber-700", bg: "bg-amber-50" },
  ];

  return (
    <div className="backdrop-blur-xl bg-white/30 border border-white/40 rounded-2xl p-4 md:p-6 shadow-lg mb-6">
      <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
        {/* Success rate */}
        <div className="flex items-center gap-4 md:pr-6 md:border-r border-white/50">
          <div className="relative w-16 h-16 flex-shrink-0">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="16" fill="none"
                stroke={rate >= 90 ? "#16a34a" : rate >= 70 ? "#d97706" : "#dc2626"}
                strokeWidth="3"
                strokeDasharray={`${rate} 100`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold text-gray-800">{rate}%</span>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600">Forward Success Rate</p>
            <p className="text-xs text-gray-500">{success} of {total} sent to PiP Hub</p>
          </div>
        </div>

        {/* Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
          {stats.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className={`${bg} rounded-xl px-3 py-2 flex items-center gap-2`}>
              <Icon className={`w-5 h-5 ${color}`} />
              <div>
                <p className={`text-lg font-bold leading-none ${color}`}>{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}