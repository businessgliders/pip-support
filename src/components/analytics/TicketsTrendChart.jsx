import React from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

export default function TicketsTrendChart({ data }) {
  return (
    <div className="backdrop-blur-xl bg-white/85 border border-white/60 rounded-2xl p-5 shadow-lg">
      <h3 className="text-sm font-bold text-[#b67651] mb-4">Tickets Over Time (last 6 months)</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
            <YAxis stroke="#9ca3af" fontSize={12} allowDecimals={false} />
            <Tooltip
              contentStyle={{ backgroundColor: "white", border: "1px solid #f1899b", borderRadius: "8px" }}
            />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            <Line type="monotone" dataKey="total" name="Total" stroke="#f1899b" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="cancellations" name="Cancellations" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}