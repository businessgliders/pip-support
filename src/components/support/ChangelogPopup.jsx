import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mail, UserPlus, Users, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";

const features = [
  {
    icon: Mail,
    color: "from-pink-400 to-pink-600",
    bg: "from-pink-50 to-pink-100",
    title: "Email Communications",
    description:
      "View and reply to all client emails directly inside each ticket. The full conversation thread, AI-assisted replies, and templates are now built-in.",
    visual: (
      <div className="bg-gradient-to-br from-pink-50 to-pink-100 border border-pink-200 rounded-xl p-4 space-y-3">
        <div className="flex justify-end">
          <div className="bg-pink-500 text-white text-xs px-3 py-2 rounded-2xl rounded-br-sm max-w-[80%] shadow">
            Hi Sarah, thanks for reaching out! Here are the details...
          </div>
        </div>
        <div className="flex justify-start">
          <div className="bg-white text-gray-700 text-xs px-3 py-2 rounded-2xl rounded-bl-sm max-w-[80%] shadow border border-gray-200">
            Perfect, that works for me. See you Tuesday!
          </div>
        </div>
        <div className="flex items-center gap-2 pt-2 border-t border-pink-200">
          <Sparkles className="w-3 h-3 text-pink-500" />
          <span className="text-xs text-pink-700 font-medium">AI reply suggestions available</span>
        </div>
      </div>
    ),
  },
  {
    icon: UserPlus,
    color: "from-indigo-400 to-indigo-600",
    bg: "from-indigo-50 to-indigo-100",
    title: "Escalate Ticket",
    description:
      "Reassign a ticket to another team member in one click. They'll get an email notification and the ticket will appear in their queue.",
    visual: (
      <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 rounded-xl p-4 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-900">
          <UserPlus className="w-4 h-4" />
          Escalate Ticket
        </div>
        <div className="flex gap-2">
          <div className="flex-1 bg-white border border-gray-300 rounded-md px-3 py-2 text-xs text-gray-700 flex items-center justify-between">
            <span>Sahil (Operations, Finance)</span>
            <span className="text-gray-400">▾</span>
          </div>
          <div className="bg-indigo-600 text-white text-xs px-4 py-2 rounded-md font-medium">
            Assign
          </div>
        </div>
        <p className="text-xs text-gray-600 pt-1">Currently assigned to: Front Desk</p>
      </div>
    ),
  },
  {
    icon: Users,
    color: "from-purple-400 to-purple-600",
    bg: "from-purple-50 to-purple-100",
    title: "User Switcher",
    description:
      "Quickly filter the board by team member using the floating sidebar. See exactly which tickets each person is handling.",
    visual: (
      <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-2xl p-2 shadow-md flex flex-col gap-2 border border-gray-200">
            {["FD", "SA", "RA", "GU"].map((initials, i) => (
              <div
                key={initials}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-semibold text-white shadow ${
                  i === 1 ? "ring-2 ring-purple-500 ring-offset-1" : ""
                } ${
                  ["bg-pink-400", "bg-purple-500", "bg-blue-400", "bg-teal-400"][i]
                }`}
              >
                {initials}
              </div>
            ))}
          </div>
          <div className="flex-1 text-xs text-gray-700">
            <div className="font-medium text-gray-900 mb-1">Filter by team member</div>
            <div className="text-gray-600">Click an avatar to view only their tickets</div>
          </div>
        </div>
      </div>
    ),
  },
];

export default function ChangelogPopup({ onDismiss }) {
  const [step, setStep] = useState(0);
  const [isDismissing, setIsDismissing] = useState(false);

  const isLast = step === features.length - 1;
  const feature = features[step];
  const Icon = feature.icon;

  const handleDismiss = async () => {
    setIsDismissing(true);
    try {
      await base44.auth.updateMe({ seen_changelog_v1: true });
    } catch (err) {
      console.error("Failed to save changelog dismissal:", err);
    }
    onDismiss();
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="backdrop-blur-2xl bg-white/95 border-white/40 max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-pink-500" />
            <span className="text-xs font-semibold text-pink-600 uppercase tracking-wide">What's New</span>
          </div>
          <DialogTitle className="text-2xl">{feature.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-lg`}>
            <Icon className="w-6 h-6 text-white" />
          </div>

          <p className="text-gray-700 leading-relaxed">{feature.description}</p>

          {feature.visual}

          {/* Step indicators */}
          <div className="flex items-center justify-center gap-2 pt-2">
            {features.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`h-2 rounded-full transition-all ${
                  i === step ? "w-8 bg-pink-500" : "w-2 bg-gray-300 hover:bg-gray-400"
                }`}
              />
            ))}
          </div>
        </div>

        <DialogFooter className="flex sm:justify-between gap-2">
          <Button
            variant="outline"
            onClick={() => setStep(step - 1)}
            disabled={step === 0}
            className="gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>
          {isLast ? (
            <Button
              onClick={handleDismiss}
              disabled={isDismissing}
              className="bg-[#b67651] hover:bg-[#a56541] text-white"
            >
              Got it!
            </Button>
          ) : (
            <Button
              onClick={() => setStep(step + 1)}
              className="bg-[#b67651] hover:bg-[#a56541] text-white gap-1"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}