import React, { useRef, useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import UserSelectionScreen from "../components/support/UserSelectionScreen";

export default function SignatureSettings() {
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [title, setTitle] = useState("");
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(false);
  const signatureRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (!currentUser.email.endsWith('@pilatesinpinkstudio.com')) {
          setUser(null);
          setIsAuthLoading(false);
          return;
        }
        setUser(currentUser);
        setFullName(currentUser.full_name || "");
        setEmail(currentUser.email || "");
      } catch (error) {
        setUser(null);
      } finally {
        setIsAuthLoading(false);
      }
    };
    checkAuth();
  }, []);

  const handleCopy = () => {
    if (!signatureRef.current) return;
    const range = document.createRange();
    range.selectNode(signatureRef.current);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    document.execCommand("copy");
    selection.removeAllRanges();
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f1899b] via-[#f7b1bd] to-[#fbe0e2]">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <UserSelectionScreen />;
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-b from-[#f1899b] to-white relative overflow-y-auto">
      <div className="absolute top-0 left-0 w-96 h-96 bg-white/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-pink-100/40 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

      <div className="max-w-3xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Button
            onClick={() => navigate("/Settings")}
            variant="ghost"
            className="backdrop-blur-md bg-white/30 hover:bg-white/50 border border-white/40 text-white rounded-xl"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">
            Email Signature
          </h1>
        </div>

        {/* Personalization Form */}
        <div className="backdrop-blur-xl bg-white/80 border border-white/60 rounded-3xl p-6 md:p-8 shadow-xl mb-6">
          <h2 className="text-lg font-bold text-[#b67651] mb-4">Personalize</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-700">Full Name</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700">Title (optional)</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Studio Manager"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700">Email</Label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@pilatesinpinkstudio.com"
                className="rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="backdrop-blur-xl bg-white/80 border border-white/60 rounded-3xl p-6 md:p-8 shadow-xl mb-6">
          <h2 className="text-lg font-bold text-[#b67651] mb-2">How to use</h2>
          <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
            <li>Click <strong>Copy Signature</strong> below.</li>
            <li>In Gmail: <strong>Settings → See all settings → General → Signature</strong>.</li>
            <li>Create or edit a signature and <strong>paste</strong> directly into the box.</li>
            <li>Scroll down and click <strong>Save Changes</strong>.</li>
          </ol>
        </div>

        {/* Rendered Signature */}
        <div className="backdrop-blur-xl bg-white border border-white/60 rounded-3xl p-6 md:p-8 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#b67651]">Preview</h2>
            <Button
              onClick={handleCopy}
              className="bg-[#b67651] hover:bg-[#a56541] text-white rounded-xl"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Signature
                </>
              )}
            </Button>
          </div>

          {/* The rendered signature - this is what gets copied */}
          <div className="border border-gray-200 rounded-xl p-6 bg-white overflow-x-auto">
            <div ref={signatureRef}>
              <table cellPadding="0" cellSpacing="0" border="0" style={{ fontFamily: "Arial, Helvetica, sans-serif", color: "#333333", fontSize: "14px", lineHeight: "1.5" }}>
                <tbody>
                  <tr>
                    <td style={{ paddingRight: "20px", verticalAlign: "middle" }}>
                      <img
                        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_690aada19e27fe8fcf067828/45da48106_Pilatesinpinklogojusticon1.png"
                        alt="Pilates in Pink Studio"
                        width="90"
                        height="90"
                        style={{ display: "block", border: "0" }}
                      />
                    </td>
                    <td style={{ width: "1px", padding: "0", verticalAlign: "middle" }}>
                      <div style={{ width: "1px", height: "110px", background: "#f1899b" }}></div>
                    </td>
                    <td style={{ paddingLeft: "20px", verticalAlign: "middle" }}>
                      <div style={{ fontSize: "20px", fontWeight: "bold", color: "#f1899b", marginBottom: "2px" }}>
                        Pilates in Pink&trade; Studio
                      </div>
                      <div style={{ fontSize: "13px", color: "#b67651", fontStyle: "italic", marginBottom: "12px", letterSpacing: "0.5px" }}>
                        Pretty • Powerful • Pilates
                      </div>

                      {email && (
                        <div style={{ fontSize: "13px", color: "#555555", marginBottom: "3px" }}>
                          <span style={{ display: "inline-block", width: "16px", marginRight: "8px", verticalAlign: "middle" }}>
                            <img src="https://img.icons8.com/ios-filled/16/b67651/new-post.png" alt="Email" width="14" height="14" style={{ verticalAlign: "middle", border: "0" }} />
                          </span>
                          <a href={`mailto:${email}`} style={{ color: "#b67651", textDecoration: "none", verticalAlign: "middle" }}>
                            {email}
                          </a>
                        </div>
                      )}
                      <div style={{ fontSize: "13px", color: "#555555", marginBottom: "12px" }}>
                        <span style={{ display: "inline-block", width: "16px", marginRight: "8px", verticalAlign: "middle" }}>
                          <img src="https://img.icons8.com/ios-filled/16/b67651/domain.png" alt="Website" width="14" height="14" style={{ verticalAlign: "middle", border: "0" }} />
                        </span>
                        <a href="https://pilatesinpinkstudio.com" style={{ color: "#b67651", textDecoration: "none", verticalAlign: "middle" }}>
                          pilatesinpinkstudio.com
                        </a>
                      </div>

                      {/* Action buttons */}
                      <div style={{ marginBottom: "12px" }}>
                        <a href="https://pilatesinpinkstudio.com" style={{ display: "inline-block", background: "#ffffff", color: "#f1899b", padding: "6px 14px", borderRadius: "20px", textDecoration: "none", fontSize: "12px", fontWeight: "bold", border: "1.5px solid #f1899b", marginRight: "6px", marginBottom: "6px" }}>
                          Home
                        </a>
                        <a href="https://pilatesinpinkstudio.com/schedule" style={{ display: "inline-block", background: "#ffffff", color: "#f1899b", padding: "6px 14px", borderRadius: "20px", textDecoration: "none", fontSize: "12px", fontWeight: "bold", border: "1.5px solid #f1899b", marginRight: "6px", marginBottom: "6px" }}>
                          Schedule
                        </a>
                        <a href="https://pilatesinpinkstudio.com/pricing" style={{ display: "inline-block", background: "#ffffff", color: "#f1899b", padding: "6px 14px", borderRadius: "20px", textDecoration: "none", fontSize: "12px", fontWeight: "bold", border: "1.5px solid #f1899b", marginRight: "6px", marginBottom: "6px" }}>
                          Pricing
                        </a>
                        <a href="https://events.pilatesinpinkstudio.com" style={{ display: "inline-block", background: "#ffffff", color: "#f1899b", padding: "6px 14px", borderRadius: "20px", textDecoration: "none", fontSize: "12px", fontWeight: "bold", border: "1.5px solid #f1899b", marginBottom: "6px" }}>
                          Host Events
                        </a>
                      </div>

                      {/* Social icons */}
                      <div>
                        <a href="https://www.instagram.com/pilatesinpinkstudio" style={{ textDecoration: "none", marginRight: "8px", display: "inline-block" }}>
                          <img src="https://img.icons8.com/ios-filled/24/f1899b/instagram-new.png" alt="Instagram" width="22" height="22" style={{ border: "0", verticalAlign: "middle" }} />
                        </a>
                        <a href="https://www.tiktok.com/@pilatesinpinkstudio1" style={{ textDecoration: "none", display: "inline-block" }}>
                          <img src="https://img.icons8.com/ios-filled/24/f1899b/tiktok--v1.png" alt="TikTok" width="22" height="22" style={{ border: "0", verticalAlign: "middle" }} />
                        </a>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-4">
            💡 The signature is fully formatted — Gmail will preserve the logo, colors, and the pink button when you paste it in.
          </p>
        </div>
      </div>
    </div>
  );
}