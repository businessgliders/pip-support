import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { LayoutDashboard, ClipboardList } from "lucide-react";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();

  // No layout for intake form (it's embedded)
  if (currentPageName === "IntakeForm") {
    return children;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f1899b] via-[#f7b1bd] to-[#fbe0e2]">
      {/* Top Navigation */}
      <nav className="backdrop-blur-xl bg-white/20 border-b border-white/30 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to={createPageUrl("TicketBoard")} className="flex items-center gap-3">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_690aada19e27fe8fcf067828/45da48106_Pilatesinpinklogojusticon1.png"
                alt="Pilates in Pink"
                className="w-10 h-10"
              />
              <div>
                <h1 className="text-white font-bold text-lg">Pilates in Pink</h1>
                <p className="text-white/80 text-xs">Support Portal</p>
              </div>
            </Link>

            {/* Navigation Links */}
            <div className="flex gap-2">
              <Link
                to={createPageUrl("TicketBoard")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                  location.pathname === createPageUrl("TicketBoard")
                    ? "backdrop-blur-md bg-white/40 text-white border border-white/50 shadow-lg"
                    : "text-white/80 hover:text-white hover:bg-white/20"
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden md:inline">Dashboard</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>{children}</main>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}