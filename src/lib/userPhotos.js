// Shared profile photo lookup used by FloatingUserFilter and the header avatar.
const PROFILE_PHOTOS = {
  gurpreen: "https://media.base44.com/images/public/690aaf0c732696417648d224/a37d46c24_gurpreen.png",
  rashmeen: "https://media.base44.com/images/public/690aaf0c732696417648d224/20b2c7a4b_rashmeen.png",
  sahil: "https://media.base44.com/images/public/690aaf0c732696417648d224/68e1dc32d_sahil.png",
};

const FRONT_DESK_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_690aada19e27fe8fcf067828/45da48106_Pilatesinpinklogojusticon1.png";

export const getPhotoForUser = (u) => {
  if (!u) return null;
  if (u.email === "info@pilatesinpinkstudio.com") return FRONT_DESK_LOGO;
  const haystack = `${u.full_name || ""} ${u.email || ""}`.toLowerCase();
  for (const key of Object.keys(PROFILE_PHOTOS)) {
    if (haystack.includes(key)) return PROFILE_PHOTOS[key];
  }
  return null;
};