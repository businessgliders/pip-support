import React from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";

/**
 * Shown when an authenticated user's email does NOT match the
 * @pilatesinpinkstudio.com staff domain. Unauthenticated users never
 * reach this — AuthProvider redirects them to login first.
 */
export default function AccessDenied() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f1899b] via-[#f7b1bd] to-[#fbe0e2] p-6">
      <div className="backdrop-blur-xl bg-white/80 border border-white/60 rounded-3xl p-8 max-w-md text-center shadow-xl">
        <h1 className="text-2xl font-bold text-[#b67651] mb-2">Access Restricted</h1>
        <p className="text-gray-700 mb-6">
          This portal is limited to <strong>@pilatesinpinkstudio.com</strong> staff accounts.
          Please sign in with your studio email.
        </p>
        <Button
          onClick={() => {
            // Clear Base44 token (no redirect), then send the user to
            // Google's logout endpoint. After Google clears its session,
            // it sends them back to our app root, where AuthProvider will
            // trigger a fresh login and Google will show the account
            // chooser instead of silently reusing the rejected account.
            base44.auth.logout();
            const returnTo = `${window.location.origin}/`;
            window.location.href =
              `https://accounts.google.com/Logout?continue=https://appengine.google.com/_ah/logout?continue=${encodeURIComponent(returnTo)}`;
          }}
          className="bg-[#f1899b] hover:bg-[#e0788a] text-white rounded-xl"
        >
          Switch Account
        </Button>
      </div>
    </div>
  );
}