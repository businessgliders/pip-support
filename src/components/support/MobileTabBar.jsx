import React from "react";
import { Search, Archive } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getPhotoForUser } from "@/lib/userPhotos";
import { Settings as SettingsIcon, BarChart3, LogOut, User } from "lucide-react";

const userColors = {
  0: "bg-pink-400",
  1: "bg-purple-400",
  2: "bg-blue-400",
  3: "bg-teal-400",
  4: "bg-green-400",
  5: "bg-amber-400",
  6: "bg-rose-400",
  7: "bg-indigo-400",
};

function getUserColor(email = "") {
  const hash = email.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return userColors[hash % 8];
}

function getInitials(user) {
  if (user?.email === "info@pilatesinpinkstudio.com") return "FD";
  if (user?.full_name) {
    return user.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  }
  return (user?.email || "").substring(0, 2).toUpperCase();
}

/**
 * iOS-style bottom tab bar (mobile + tablet only).
 * Mirrors the pip-events 4-cell layout: Home (logo) · Search · Archive · Profile.
 * Reserves safe-area space via env(safe-area-inset-bottom).
 */
export default function MobileTabBar({
  user,
  onHome,
  onSearch,
  showArchived,
  onToggleArchived,
}) {
  const navigate = useNavigate();
  const photo = user ? getPhotoForUser(user) : null;
  const activeColor = "#e86c84";
  const idleColor = "#8a6a6a";

  return (
    <>
      {/* Spacer so content doesn't sit under the fixed bar */}
      <div
        aria-hidden="true"
        className="lg:hidden flex-shrink-0"
        style={{ height: "calc(64px + env(safe-area-inset-bottom, 0px))" }}
      />

      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur-xl bg-white/85 border-t border-white/60 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-stretch justify-around h-16 px-2">
          {/* Home — logo tile */}
          <button
            type="button"
            onClick={onHome}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 active:scale-95 transition-transform"
            style={{ color: !showArchived ? activeColor : idleColor }}
          >
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_690aada19e27fe8fcf067828/45da48106_Pilatesinpinklogojusticon1.png"
              alt="Home"
              className="w-6 h-6"
              style={{ opacity: !showArchived ? 1 : 0.55 }}
            />
            <span className="text-[10px] font-medium">Home</span>
          </button>

          {/* Search */}
          <button
            type="button"
            onClick={onSearch}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 active:scale-95 transition-transform"
            style={{ color: idleColor }}
          >
            <Search className="w-5 h-5" />
            <span className="text-[10px] font-medium">Search</span>
          </button>

          {/* Archive */}
          <button
            type="button"
            onClick={onToggleArchived}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 active:scale-95 transition-transform"
            style={{ color: showArchived ? activeColor : idleColor }}
          >
            <Archive className="w-5 h-5" />
            <span className="text-[10px] font-medium">Archive</span>
          </button>

          {/* Profile — dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex flex-col items-center justify-center gap-0.5 flex-1 active:scale-95 transition-transform"
                style={{ color: idleColor }}
                title={user?.full_name || user?.email}
              >
                <div
                  className={`w-7 h-7 rounded-full overflow-hidden flex items-center justify-center border border-white/80 shadow-sm ${photo ? "" : getUserColor(user?.email)}`}
                >
                  {photo ? (
                    <img src={photo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-[10px] font-semibold">
                      {getInitials(user)}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">Profile</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-52 mb-2">
              <div className="px-3 py-2 border-b">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.full_name || "Staff"}
                </p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
              <DropdownMenuItem onClick={() => navigate("/Analytics")}>
                <BarChart3 className="w-4 h-4 mr-2" />
                Analytics
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/Settings")}>
                <SettingsIcon className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
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
        </div>
      </nav>
    </>
  );
}