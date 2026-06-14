// Per-status / per-category theme classes — mirrors pip-events columnTheme.
// Translucent gradient column tint + translucent colored header bar.

export const COLUMN_COLOR_CLASSES = {
  // Status columns
  "New": "from-pink-400/20 to-pink-300/20 border-pink-300/40",
  "In Progress": "from-blue-400/20 to-sky-300/20 border-sky-300/40",
  "Resolved": "from-emerald-400/20 to-green-300/20 border-green-300/40",
  "Closed": "from-slate-400/20 to-gray-300/20 border-gray-300/40",
  // Category columns
  "General Inquiry": "from-blue-400/20 to-sky-300/20 border-sky-300/40",
  "Membership Inquiry": "from-violet-400/20 to-purple-300/20 border-purple-300/40",
  "Private Events": "from-fuchsia-400/20 to-pink-300/20 border-pink-300/40",
  "Cancellation": "from-red-400/20 to-rose-300/20 border-rose-300/40",
  "Other": "from-slate-400/20 to-gray-300/20 border-gray-300/40",
};

export const COLUMN_HEADER_CLASSES = {
  "New": "bg-pink-500/30 border-pink-400/40",
  "In Progress": "bg-sky-500/30 border-sky-400/40",
  "Resolved": "bg-emerald-500/30 border-emerald-400/40",
  "Closed": "bg-slate-500/30 border-slate-400/40",
  "General Inquiry": "bg-sky-500/30 border-sky-400/40",
  "Membership Inquiry": "bg-purple-500/30 border-purple-400/40",
  "Private Events": "bg-fuchsia-500/30 border-fuchsia-400/40",
  "Cancellation": "bg-rose-500/30 border-rose-400/40",
  "Other": "bg-gray-500/30 border-gray-400/40",
};

export const DEFAULT_COLOR = "from-white/20 to-white/10 border-white/30";
export const DEFAULT_HEADER = "bg-white/30 border-white/40";