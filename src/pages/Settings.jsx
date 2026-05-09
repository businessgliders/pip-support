import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { PenLine, ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import UserSelectionScreen from "../components/support/UserSelectionScreen";

const settingsCards = [
  {
    key: "signature",
    title: "Signature",
    description: "Your branded email signature",
    icon: PenLine,
    path: "/Settings/Signature"
  },
  {
    key: "templates",
    title: "Email Templates",
    description: "Quick-reply templates with variables",
    icon: FileText,
    path: "/Settings/Templates"
  }
];

export default function Settings() {
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
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
      } catch (error) {
        setUser(null);
      } finally {
        setIsAuthLoading(false);
      }
    };
    checkAuth();
  }, []);

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

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Button
            onClick={() => navigate("/TicketBoard")}
            variant="ghost"
            className="backdrop-blur-md bg-white/30 hover:bg-white/50 border border-white/40 text-white rounded-xl"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">
            Settings
          </h1>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {settingsCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.key}
                to={card.path}
                className="group backdrop-blur-xl bg-white/80 hover:bg-white/95 border border-white/60 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 flex flex-col items-center text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#f1899b]/15 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Icon className="w-7 h-7 text-[#b67651]" />
                </div>
                <h3 className="text-lg font-bold text-[#b67651] mb-1">
                  {card.title}
                </h3>
                <p className="text-sm text-gray-600">
                  {card.description}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}