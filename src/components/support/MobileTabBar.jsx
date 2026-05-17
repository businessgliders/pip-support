import React from "react";
import { Home, Search, Archive, User, LogOut } from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getPhotoForUser } from "@/lib/userPhotos";

const userColors = {
  0: "bg-pink-400",
  1: "bg-purple-400",
  2: "bg-blue-400",
  3: "bg-teal-400",
  4: "bg-green-400",
  5: "bg-amber-400",
  6: "bg-rose-400",
  7: "bg-indigo-400"
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

export default function MobileTabBar({
  user,
  onHome,
  onSearch,
  onToggleArchived,
  showArchived,
}) {
  const photo = user ? getPhotoForUser(user) : null;

  return (
    <>
      {/* Spacer so content doesn't sit under the fixed tab bar */}
      <div
        aria-hidden="true"
        className="lg:hidden flex-shrink-0"
        style={{ height: "calc(64px + env(safe-area-inset-bottom, 0px))" }}
      />

      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur-xl bg-white/80 border-t border-white/60 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-stretch justify-around h-16 px-2">
          <TabButton
            icon={<Home className="w-5 h-5" />}
            label="Home"
            active={!showArchived}
            onClick={onHome}
          />
          <TabButton
            icon={<Search className="w-5 h-5" />}
            label="Search"
            onClick={onSearch}
          />
          <TabButton
            icon={<Archive className="w-5 h-5" />}
            label="Archived"
            active={showArchived}
            onClick={onToggleArchived}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex flex-col items-center justify-center gap-0.5 flex-1 text-gray-600 hover:text-[#b67651] transition-colors active:scale-95"
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
                <span className="text-[10px] font-medium">Account</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-48 mb-2">
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

function TabButton({ icon, label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-0.5 flex-1 transition-colors active:scale-95 ${
        active ? "text-[#b67651]" : "text-gray-600 hover:text-[#b67651]"
      }`}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}