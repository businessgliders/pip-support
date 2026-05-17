import React from "react";
import { Users, Archive, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getPhotoForUser } from "@/lib/userPhotos";

// Lower = earlier
const ORDER = { frontdesk: 0, sahil: 1, rashmeen: 2, gurpreen: 3 };

const matchKey = (u) => {
  if (u.email === "info@pilatesinpinkstudio.com") return "frontdesk";
  const haystack = `${u.full_name || ""} ${u.email || ""}`.toLowerCase();
  for (const key of Object.keys(ORDER)) {
    if (key !== "frontdesk" && haystack.includes(key)) return key;
  }
  return null;
};

const getDisplayName = (u) => {
  if (u.email === "info@pilatesinpinkstudio.com") return "Front Desk";
  if (u.full_name) return u.full_name.split(" ")[0];
  return u.email.split("@")[0];
};

const getInitials = (u) => {
  if (u.email === "info@pilatesinpinkstudio.com") return "FD";
  if (u.full_name) {
    return u.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  }
  return u.email.substring(0, 2).toUpperCase();
};

export default function MobileUserFilter({
  allUsers,
  userFilter,
  onChange,
  showArchived,
  onToggleArchived,
}) {
  const studioUsers = (allUsers || [])
    .filter((u) => u.email.endsWith("@pilatesinpinkstudio.com"))
    .sort((a, b) => {
      const ak = matchKey(a);
      const bk = matchKey(b);
      const ao = ak !== null && ORDER[ak] !== undefined ? ORDER[ak] : 99;
      const bo = bk !== null && ORDER[bk] !== undefined ? ORDER[bk] : 99;
      return ao - bo;
    });

  const selectedUser = studioUsers.find((u) => u.email === userFilter);
  const selectedPhoto = selectedUser ? getPhotoForUser(selectedUser) : null;
  const selectedLabel = userFilter === "all" ? "All Users" : (selectedUser ? getDisplayName(selectedUser) : "All Users");

  return (
    <div className="lg:hidden flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex-1 min-w-0 flex items-center gap-2 backdrop-blur-xl bg-white/40 border border-white/60 rounded-xl px-3 py-2 shadow-lg text-left"
          >
            <div className="w-7 h-7 rounded-full overflow-hidden border border-white/80 flex items-center justify-center bg-pink-400 flex-shrink-0">
              {userFilter === "all" ? (
                <Users className="w-3.5 h-3.5 text-white" />
              ) : selectedPhoto ? (
                <img src={selectedPhoto} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-[10px] font-bold">{selectedUser ? getInitials(selectedUser) : "?"}</span>
              )}
            </div>
            <span className="text-sm font-medium text-gray-900 truncate flex-1">{selectedLabel}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem onClick={() => onChange("all")} className="gap-2">
            <div className="w-6 h-6 rounded-full bg-pink-400 flex items-center justify-center">
              <Users className="w-3 h-3 text-white" />
            </div>
            <span className="flex-1">All Users</span>
            {userFilter === "all" && <Check className="w-4 h-4 text-[#b67651]" />}
          </DropdownMenuItem>
          {studioUsers.map((u) => {
            const photo = getPhotoForUser(u);
            const isActive = userFilter === u.email;
            return (
              <DropdownMenuItem key={u.id} onClick={() => onChange(u.email)} className="gap-2">
                <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center bg-pink-400">
                  {photo ? (
                    <img src={photo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-[9px] font-bold">{getInitials(u)}</span>
                  )}
                </div>
                <span className="flex-1">{getDisplayName(u)}</span>
                {isActive && <Check className="w-4 h-4 text-[#b67651]" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        type="button"
        onClick={onToggleArchived}
        title={showArchived ? "Hide archived" : "Show archived"}
        className={`flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl border shadow-lg backdrop-blur-xl transition ${
          showArchived
            ? "bg-purple-500/80 border-purple-400/80 text-white"
            : "bg-white/40 border-white/60 text-gray-900 hover:bg-white/60"
        }`}
      >
        <Archive className="w-4 h-4" />
      </button>
    </div>
  );
}