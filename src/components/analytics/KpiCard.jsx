import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function KpiCard({ label, value, sublabel, change, icon: Icon, accent = "#f1899b" }) {
  const isUp = typeof change === "number" && change > 0;
  const isDown = typeof change === "number" && change < 0;
  const TrendIcon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
  const trendColor = isUp ? "text-green-600" : isDown ? "text-red-500" : "text-gray-400";

  return (
    <div className="backdrop-blur-xl bg-white/85 border border-white/60 rounded-2xl p-5 shadow-lg">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
        {Icon && (
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${accent}20` }}>
            <Icon className="w-4 h-4" style={{ color: accent }} />
          </div>
        )}
      </div>
      <div className="text-3xl font-bold text-gray-900 mb-1">{value}</div>
      <div className="flex items-center gap-2">
        {typeof change === "number" && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trendColor}`}>
            <TrendIcon className="w-3 h-3" />
            {Math.abs(change).toFixed(0)}%
          </div>
        )}
        {sublabel && <span className="text-xs text-gray-500">{sublabel}</span>}
      </div>
    </div>
  );
}