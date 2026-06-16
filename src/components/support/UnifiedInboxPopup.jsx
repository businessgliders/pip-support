import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, X, LogOut } from "lucide-react";
import { base44 } from "@/api/base44Client";

const INBOX_URL = "https://inbox.pilatesinpinkstudio.com/inbox#support";
const INBOX_ICON = "https://media.base44.com/images/public/69841af9c747b033a60780f2/8796f5d2d_IMG_0093.png";
const SHOWCASE = "https://media.base44.com/images/public/690aaf0c732696417648d224/716d936b0_generated_image.png";

export default function UnifiedInboxPopup({ open, onTryNow, onDismiss }) {
  const handleSwitchAccount = async () => {
    try {
      await base44.auth.logout();
    } catch (_) {
      // Swallow — even if the SDK call fails we still want to redirect.
    }
    base44.auth.loginWithProvider('google', `${window.location.origin}/TicketBoard`);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Blurred backdrop */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-md" />

          {/* Card */}
          <motion.div
            initial={{ scale: 0.92, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 24, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-white/60"
          >
            {/* Showcase image */}
            <div className="relative">
              <img
                src={SHOWCASE}
                alt="PiP Inbox preview"
                className="w-full h-44 object-cover object-center"
              />
            </div>

            {/* Content */}
            <div className="p-5 md:p-6 text-center">
              <div className="flex items-center justify-center gap-2.5 mb-2.5">
                <img src={INBOX_ICON} alt="PiP Inbox" className="w-9 h-9 rounded-xl shadow-md" />
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-pink-100 text-[#b6486a] text-xs font-semibold uppercase tracking-wide">
                  <Sparkles className="w-3.5 h-3.5" />
                  New
                </span>
              </div>

              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-1.5">
                Try the new Unified PiP Inbox
              </h2>
              <p className="text-sm text-gray-600 max-w-md mx-auto mb-5">
                PiP Inbox brings all your support, events, and influencer conversations
                into one beautiful place. Reply faster, stay organized, never miss a message.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  onClick={onTryNow}
                  className="w-full sm:w-auto h-12 px-7 bg-[#f1899b] hover:bg-[#e8718a] text-white rounded-xl text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  Try now
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
                <button
                  onClick={handleSwitchAccount}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-sm font-medium transition-colors border"
                  style={{
                    color: '#7a6970',
                    borderColor: 'rgba(122,105,112,0.25)',
                    background: 'white',
                  }}
                  title="Log out and sign in with a different Google account"
                >
                  <LogOut className="w-4 h-4" />
                  Switch account
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export { INBOX_URL };