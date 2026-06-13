import React, { useEffect } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Renders a minimal "redirecting…" screen and immediately sends the user
 * to the Base44 / Google OAuth login flow. After successful login the user
 * is returned to the same path they were trying to access.
 *
 * Use this as the fallback when an unauthenticated user hits a protected
 * page (TicketBoard, Settings, Analytics, ReportBug).
 */
export default function RequireGoogleAuth() {
  useEffect(() => {
    base44.auth.redirectToLogin(window.location.pathname + window.location.search);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f1899b] via-[#f7b1bd] to-[#fbe0e2]">
      <div className="text-white text-lg drop-shadow">Redirecting to sign in…</div>
    </div>
  );
}