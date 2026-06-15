import React from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function IntakeSuccess({ onReset }) {
  return (
    <div className="backdrop-blur-xl bg-white/30 border border-white/40 rounded-3xl shadow-2xl p-8 md:p-12 text-center">
      <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-white/40 flex items-center justify-center">
        <CheckCircle2 className="w-9 h-9 text-green-600" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Thank you!</h2>
      <p className="text-white/90 mb-6">
        Your inquiry has been received. Our team will get back to you shortly.
      </p>
      <Button
        onClick={onReset}
        className="bg-white/40 hover:bg-white/50 text-white border border-white/50 backdrop-blur-md"
      >
        Submit Another Inquiry
      </Button>
    </div>
  );
}