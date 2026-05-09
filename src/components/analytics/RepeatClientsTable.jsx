import React from "react";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function RepeatClientsTable({ clients }) {
  return (
    <div className="backdrop-blur-xl bg-white/85 border border-white/60 rounded-2xl p-5 shadow-lg">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        <h3 className="text-sm font-bold text-[#b67651]">Repeat Clients (2+ tickets)</h3>
      </div>
      {clients.length === 0 ? (
        <div className="text-sm text-gray-400 py-8 text-center">No repeat clients yet</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-200">
                <th className="pb-2 font-semibold">Client</th>
                <th className="pb-2 font-semibold">Email</th>
                <th className="pb-2 font-semibold text-center">Tickets</th>
                <th className="pb-2 font-semibold text-center">Cancellations</th>
                <th className="pb-2 font-semibold">Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.email} className="border-b border-gray-100 hover:bg-pink-50/30">
                  <td className="py-2 font-medium text-gray-900">{c.name}</td>
                  <td className="py-2 text-gray-600">{c.email}</td>
                  <td className="py-2 text-center">
                    <Badge className="bg-pink-100 text-pink-800 border-pink-200">{c.count}</Badge>
                  </td>
                  <td className="py-2 text-center">
                    {c.cancellations > 0 ? (
                      <Badge className="bg-red-100 text-red-700 border-red-200">{c.cancellations}</Badge>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="py-2 text-gray-600 text-xs">{c.lastActivity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}