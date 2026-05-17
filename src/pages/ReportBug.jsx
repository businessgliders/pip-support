import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { ArrowLeft, LifeBuoy } from "lucide-react";
import BugReportChat from "@/components/support/BugReportChat";
import BugReportIssueList from "@/components/support/BugReportIssueList";

export default function ReportBug() {
  const [user, setUser] = useState(null);
  const [chatSignal, setChatSignal] = useState(0);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: tickets = [] } = useQuery({
    queryKey: ["tickets-for-bug-report"],
    queryFn: () => base44.entities.SupportTicket.list("-created_date", 200),
    enabled: !!user,
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f1899b] to-white">
      {/* Header */}
      <div className="sticky top-0 z-30 backdrop-blur-md bg-[#f1899b]/90 border-b border-white/30 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link
            to={createPageUrl("TicketBoard")}
            className="flex items-center gap-2 text-white/90 hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium hidden sm:inline">Back to board</span>
          </Link>
          <Link to={createPageUrl("TicketBoard")} className="flex items-center gap-2">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690aaf0c732696417648d224/a1b923375_PiPSupport.png"
              alt="PiP Support"
              className="h-9 drop-shadow-md hover:scale-105 transition-transform"
            />
          </Link>
          <div className="w-8" />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 pt-5 pb-32">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-white drop-shadow-sm">Report an Issue</h1>
        </div>

        <div className="bg-white/70 backdrop-blur-md border border-white/60 rounded-2xl p-3 sm:p-4 shadow-lg">
          <h2 className="text-sm font-semibold text-slate-700 mb-3 px-1">Open Issues</h2>
          <BugReportIssueList currentUser={user} />
        </div>

        {/* Dedicated full-width Report a Bug button */}
        <button
          type="button"
          onClick={() => setChatSignal(s => s + 1)}
          className="mt-5 w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-br from-[#b67651] to-[#a05a3a] text-white shadow-xl hover:shadow-2xl hover:scale-[1.01] active:scale-[0.99] transition-all border border-white/30"
        >
          <LifeBuoy className="w-6 h-6" />
          <span className="text-lg font-semibold tracking-wide">Report an Issue — Live Chat</span>
        </button>
      </div>

      {/* Chat panel only (no floating FAB on this page) */}
      <BugReportChat currentUser={user} tickets={tickets} hideFab openSignal={chatSignal} />
    </div>
  );
}