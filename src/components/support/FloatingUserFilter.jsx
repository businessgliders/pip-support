import React from "react";
import { Users } from "lucide-react";

// Map user emails / name keywords to profile photos.
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

export default function FloatingUserFilter({ allUsers, userFilter, onChange }) {
  const studioUsers = (allUsers || [])
    .filter((u) => u.email.endsWith("@pilatesinpinkstudio.com"))
    .sort((a, b) => {
      if (a.email === "info@pilatesinpinkstudio.com") return -1;
      if (b.email === "info@pilatesinpinkstudio.com") return 1;
      return 0;
    });

  return (
    <div className="fixed left-4 top-1/2 -translate-y-1/2 z-40">
      <div className="backdrop-blur-xl bg-white/30 border border-white/50 rounded-2xl p-2 shadow-2xl flex flex-col items-center gap-2 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center gap-1 text-white text-[10px] font-semibold uppercase tracking-wider px-1 pt-1">
          <Users className="w-3 h-3" />
          Filter
        </div>

        {/* All Users option */}
        <button
          onClick={() => onChange("all")}
          className="group flex flex-col items-center transition-transform hover:scale-105"
          title="All Users"
        >
          <div
            className={`w-11 h-11 rounded-full flex items-center justify-center border-2 shadow-md ${
              userFilter === "all"
                ? "bg-pink-400 border-white ring-2 ring-pink-300"
                : "bg-white/40 border-white/70 hover:bg-white/60"
            }`}
          >
            <Users className={`w-5 h-5 ${userFilter === "all" ? "text-white" : "text-white"}`} />
          </div>
          <span className="text-white text-[10px] font-medium mt-1 max-w-[60px] truncate drop-shadow">
            All
          </span>
        </button>

        {studioUsers.map((u) => {
          const photo = getPhotoForUser(u);
          const isActive = userFilter === u.email;
          return (
            <button
              key={u.id}
              onClick={() => onChange(u.email)}
              className="group flex flex-col items-center transition-transform hover:scale-105"
              title={getDisplayName(u)}
            >
              <div
                className={`w-11 h-11 rounded-full overflow-hidden border-2 shadow-md ${
                  isActive ? "border-white ring-2 ring-pink-400" : "border-white/70 opacity-80 hover:opacity-100"
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
      </div>
    </div>
  );
}