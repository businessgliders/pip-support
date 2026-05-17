import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { ArrowLeft, LifeBuoy, User, LogOut } from "lucide-react";
import BugReportChat from "@/components/support/BugReportChat";
import BugReportIssueList from "@/components/support/BugReportIssueList";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getPhotoForUser } from "@/lib/userPhotos";

const userColors = [
  "bg-pink-400", "bg-purple-400", "bg-blue-400", "bg-teal-400",
  "bg-green-400", "bg-amber-400", "bg-rose-400", "bg-indigo-400"
];

const getUserColor = (email = "") => {
  const hash = email.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return userColors[hash % userColors.length];
};

const getInitials = (user) => {
  if (!user) return "?";
  if (user.email === 'info@pilatesinpinkstudio.com') return 'FD';
  if (user.full_name) return user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  return (user.email || "").substring(0, 2).toUpperCase();
};

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
    <div className="h-screen flex flex-col bg-gradient-to-b from-[#f1899b] to-white overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 backdrop-blur-md bg-[#f1899b]/90 border-b border-white/30 shadow-sm">
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
          {user ? (() => {
            const photo = getPhotoForUser(user);
            return (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`flex items-center justify-center h-9 w-9 rounded-xl overflow-hidden shadow-lg border-2 border-white/80 hover:ring-2 hover:ring-white/60 transition ${photo ? "" : getUserColor(user.email)}`}
                    title={user.full_name || user.email}
                  >
                    {photo ? (
                      <img src={photo} alt={user.full_name || user.email} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white font-semibold text-sm">{getInitials(user)}</span>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => base44.auth.logout()}>
                    <User className="w-4 h-4 mr-2" />
                    Switch User
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => base44.auth.logout()}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })() : <div className="w-9" />}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 max-w-2xl w-full mx-auto px-4 pt-5 pb-5 flex flex-col">
        <div className="mb-4 flex-shrink-0">
          <h1 className="text-2xl font-bold text-white drop-shadow-sm">Report an Issue</h1>
        </div>

        <div className="flex-1 min-h-0 bg-white/70 backdrop-blur-md border border-white/60 rounded-2xl p-3 sm:p-4 shadow-lg flex flex-col">
          <h2 className="text-sm font-semibold text-slate-700 mb-3 px-1 flex-shrink-0">Open Issues</h2>
          <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
            <BugReportIssueList currentUser={user} />
          </div>
        </div>

        {/* Dedicated full-width Report a Bug button */}
        <button
          type="button"
          onClick={() => setChatSignal(s => s + 1)}
          className="mt-5 flex-shrink-0 w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-br from-[#b67651] to-[#a05a3a] text-white shadow-xl hover:shadow-2xl hover:scale-[1.01] active:scale-[0.99] transition-all border border-white/30"
        >
          <LifeBuoy className="w-6 h-6" />
          <span className="text-lg font-semibold tracking-wide">Report an Issue</span>
        </button>
      </div>

      {/* Chat panel only (no floating FAB on this page) */}
      <BugReportChat currentUser={user} tickets={tickets} hideFab openSignal={chatSignal} />
    </div>
  );
}