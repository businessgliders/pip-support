import React from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import PageTitle from "@/components/seo/PageTitle";

/**
 * Public Login page (mirrors the pip-events pattern).
 *
 * Shows a "Continue with Google" button. After successful login Google
 * redirects back to "/" where AuthProvider picks up the new token.
 *
 * If the signed-in account is NOT a @pilatesinpinkstudio.com email, the
 * inline staff-domain checks on protected pages render <AccessDenied />,
 * whose "Switch Account" button just calls base44.auth.logout() — the
 * page reload then sends the user back here to pick a different account.
 */
export default function Login() {
  const handleGoogle = () => {
    base44.auth.loginWithProvider("google", "/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f1899b] via-[#f7b1bd] to-[#fbe0e2] p-6">
      <PageTitle title="Staff Login" />
      <div className="backdrop-blur-xl bg-white/80 border border-white/60 rounded-3xl p-8 max-w-md w-full text-center shadow-xl">
        <img
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_690aada19e27fe8fcf067828/45da48106_Pilatesinpinklogojusticon1.png"
          alt="Pilates in Pink"
          className="w-16 h-16 mx-auto mb-4"
        />
        <h1 className="text-2xl font-bold text-[#b67651] mb-1">Welcome back</h1>
        <p className="text-gray-700 mb-6">
          Sign in with your <strong>@pilatesinpinkstudio.com</strong> account
        </p>
        <Button
          onClick={handleGoogle}
          className="w-full bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 rounded-xl gap-3 h-11"
        >
          <svg className="w-5 h-5" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
            <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z" />
            <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
            <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
          </svg>
          Continue with Google
        </Button>
      </div>
    </div>
  );
}