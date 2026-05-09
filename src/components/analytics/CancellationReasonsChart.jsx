import React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

const COLORS = ["#f1899b", "#b67651", "#f7b1bd", "#dc2626", "#a56541", "#fbe0e2", "#9ca3af"];

export default function CancellationReasonsChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="backdrop-blur-xl bg-white/85 border border-white/60 rounded-2xl p-5 shadow-lg">
        <h3 className="text-sm font-bold text-[#b67651] mb-4">Cancellation Reasons</h3>
        <div className="h-72 flex items-center justify-center text-gray-400 text-sm">No cancellation data yet</div>
      </div>
    );
  }

  return (
    <div className="backdrop-blur-xl bg-white/85 border border-white/60 rounded-2xl p-5 shadow-lg">
      <h3 className="text-sm font-bold text-[#b67651] mb-4">Cancellation Reasons</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={90}
              label={(entry) => `${entry.value}`}
            >
              {data.map((_, idx) => (
                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: "11px" }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}