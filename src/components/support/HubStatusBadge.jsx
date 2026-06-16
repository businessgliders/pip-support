import React from "react";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

// Small pill showing whether a ticket was forwarded to the PiP Inbox hub.
export default function HubStatusBadge({ status }) {
  const config = {
    success: {
      label: "Forwarded",
      icon: CheckCircle2,
      className: "bg-green-100 text-green-700 border-green-300",
    },
    failed: {
      label: "Failed",
      icon: XCircle,
      className: "bg-red-100 text-red-700 border-red-300",
    },
    pending: {
      label: "Pending",
      icon: Clock,
      className: "bg-amber-100 text-amber-700 border-amber-300",
    },
  }[status || "pending"];

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-xs font-medium ${config.className}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
}