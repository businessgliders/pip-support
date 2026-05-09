import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { LogOut, Users } from "lucide-react";

// Map user emails / name keywords to profile photos.
// Add more entries here as new team members join.
const PROFILE_PHOTOS = {
  gurpreen: "https://media.base44.com/images/public/690aaf0c732696417648d224/a37d46c24_gurpreen.png",
  rashmeen: "https://media.base44.com/images/public/690aaf0c732696417648d224/20b2c7a4b_rashmeen.png",
  sahil: "https://media.base44.com/images/public/690aaf0c732696417648d224/68e1dc32d_sahil.png",
};

const FRONT_DESK_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_690aada19e27fe8fcf067828/45da48106_Pilatesinpinklogojusticon1.png";

const getPhotoForUser = (u) => {
  if (!u) return null;
  if (u.email === "info@pilatesinpinkstudio.com") return FRONT_DESK_LOGO;
  const haystack = `${u.full_name || ""} ${u.email || ""}`.toLowerCase();
  for (const key of Object.keys(PROFILE_PHOTOS)) {
    if (haystack.includes(key)) return PROFILE_PHOTOS[key];
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

export default function FloatingUserSwitcher({ currentUser, allUsers }) {
  const [expanded, setExpanded] = useState(false);

  const studioUsers = (allUsers || [])
    .filter((u) => u.email.endsWith("@pilatesinpinkstudio.com"))
    .sort((a, b) => {
      if (a.email === "info@pilatesinpinkstudio.com") return -1;
      if (b.email === "info@pilatesinpinkstudio.com") return 1;
      return 0;
    });

  const switchUser = () => {
    base44.auth.logout();
    window.location.reload();
  };

  const currentPhoto = getPhotoForUser(currentUser);

  return (
    <div className="fixed left-4 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-3">
      {/* Current user trigger */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="group relative w-12 h-12 rounded-full backdrop-blur-md bg-white/30 hover:bg-white/50 border-2 border-white/60 shadow-lg overflow-hidden transition-all hover:scale-105"
        title={getDisplayName(currentUser)}
      >
        {currentPhoto ? (
          <img src={currentPhoto} alt={getDisplayName(currentUser)} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-pink-400 flex items-center justify-center text-white font-bold text-sm">
            {getInitials(currentUser)}
          </div>
        )}
      </button>

      {/* Expanded user list */}
      {expanded && (
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl p-3 shadow-2xl flex flex-col items-center gap-3 max-h-[70vh] overflow-y-auto">
          <div className="flex items-center gap-1 text-white text-[10px] font-semibold uppercase tracking-wider px-1">
            <Users className="w-3 h-3" />
            Switch
          </div>

          {studioUsers.map((u) => {
            const photo = getPhotoForUser(u);
            const isCurrent = u.email === currentUser?.email;
            return (
              <button
                key={u.id}
                onClick={switchUser}
                className={`group flex flex-col items-center transition-transform hover:scale-105 ${
                  isCurrent ? "opacity-100" : "opacity-90 hover:opacity-100"
                }`}
                title={getDisplayName(u)}
              >
                <div
                  className={`w-11 h-11 rounded-full overflow-hidden border-2 shadow-md ${
                    isCurrent ? "border-white ring-2 ring-pink-400" : "border-white/70"
                  }`}
                >
                  {photo ? (
                    <img src={photo} alt={getDisplayName(u)} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-pink-400 flex items-center justify-center text-white font-bold text-xs">
                      {getInitials(u)}
                    </div>
                  )}
                </div>
                <span className="text-white text-[10px] font-medium mt-1 max-w-[60px] truncate drop-shadow">
                  {getDisplayName(u)}
                </span>
              </button>
            );
          })}

          <div className="w-full h-px bg-white/40 my-1" />

          <button
            onClick={() => base44.auth.logout()}
            className="w-11 h-11 rounded-full bg-white/30 hover:bg-red-500/70 border-2 border-white/60 flex items-center justify-center transition-all"
            title="Logout"
          >
            <LogOut className="w-4 h-4 text-white" />
          </button>
        </div>
      )}
    </div>
  );
}