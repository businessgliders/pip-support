import React from "react";
import { base44 } from "@/api/base44Client";

/**
 * Mirrors the pip-events "not authorized" pattern: a minimal centered
 * message with a single Log Out link. No "Switch Account" button.
 */
export default function AccessDenied() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f1899b] via-[#f7b1bd] to-[#fbe0e2] p-6">
      <div className="backdrop-blur-xl bg-white/85 border border-white/60 rounded-3xl p-10 max-w-md w-full text-center shadow-xl">
        <img
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_690aada19e27fe8fcf067828/45da48106_Pilatesinpinklogojusticon1.png"
          alt="Pilates in Pink"
          className="w-14 h-14 mx-auto mb-5"
        />
        <h1 className="text-xl font-semibold text-[#b67651] mb-2">Not authorized</h1>
        <p className="text-gray-600 text-sm mb-6">
          This portal is for <strong>@pilatesinpinkstudio.com</strong> staff only.
        </p>
        <button
          onClick={() => base44.auth.logout()}
          className="text-sm font-medium text-[#b67651] hover:text-[#a56541] underline-offset-4 hover:underline transition-colors"
        >
          Log out
        </button>
      </div>
    </div>
  );
}