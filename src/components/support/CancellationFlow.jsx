
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertCircle, Gift, Loader2, Sparkles, AlertTriangle } from "lucide-react"; // Added AlertTriangle

export default function CancellationFlow({ onSubmit, isSubmitting, missingContactInfo }) {
  const [step, setStep] = useState(1);
  const [cancellationData, setCancellationData] = useState({
    cancellation_reason: "",
    cancellation_satisfaction: "",
    cancellation_feedback: "",
    discount_offered: ""
  });

  const calculateDiscount = (reason, satisfaction) => {
    // Strategic discount calculation - not directly predictable
    const riskScore = {
      // Reason scoring (out of 10)
      "Too expensive / pricing concerns": 8,
      "Not seeing results": 7,
      "Moving away / relocating": 3,
      "Schedule doesn't work": 6,
      "Health or injury concerns": 5,
      "Found another studio": 9,
      "Other": 5
    };

    // Satisfaction impact
    const satisfactionMultiplier = {
      "Very Dissatisfied": 1.2,
      "Somewhat Dissatisfied": 1.1,
      "Neutral": 1.0,
      "Somewhat Satisfied": 0.9,
      "Very Satisfied": 0.8
    };

    let score = (riskScore[reason] || 5) * (satisfactionMultiplier[satisfaction] || 1.0);
    
    // Add slight randomization to prevent gaming (-0.5 to +0.5)
    score += (Math.random() - 0.5);

    // Map to discount tiers
    if (score >= 8) return "20%";
    if (score >= 6.5) return "15%";
    if (score >= 5) return "10%";
    return "5%";
  };

  const handleNext = () => {
    if (step === 3) {
      // Calculate discount and move to step 4 to show it
      const discount = calculateDiscount(
        cancellationData.cancellation_reason,
        cancellationData.cancellation_satisfaction
      );
      setCancellationData({ ...cancellationData, discount_offered: discount });
      setStep(4);
    } else if (step === 4) {
      // Final submission
      onSubmit(cancellationData);
    } else {
      setStep(step + 1);
    }
  };

  const isStepComplete = () => {
    if (step === 1) return cancellationData.cancellation_reason !== "" && !missingContactInfo;
    if (step === 2) return cancellationData.cancellation_satisfaction !== "";
    if (step === 3) return true; // Feedback is optional
    if (step === 4) return true; // Always allow submission on step 4
    return false;
  };

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="backdrop-blur-md bg-[#8b5a3c]/40 border border-[#b67651]/60 rounded-2xl p-6 overflow-hidden shadow-lg"
    >
      <div className="flex items-center gap-3 mb-6">
        <AlertCircle className="w-6 h-6 text-white drop-shadow-lg" />
        <h3 className="text-white font-semibold text-xl drop-shadow-lg">We're Sorry to See You Go</h3>
      </div>

      {/* Progress indicator */}
      <div className="flex gap-2 mb-6">
        {[1, 2, 3, 4].map((num) => (
          <div
            key={num}
            className={`h-1.5 flex-1 rounded-full transition-all ${
              num <= step ? "bg-white" : "bg-white/30"
            }`}
          />
        ))}
      </div>

      {/* Step 1: Reason */}
      {step === 1 && (
        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -20, opacity: 0 }}
          className="space-y-4"
        >
          <Label className="text-white font-medium text-lg drop-shadow-md">
            What's your primary reason for canceling?
          </Label>
          <RadioGroup
            value={cancellationData.cancellation_reason}
            onValueChange={(value) =>
              setCancellationData({ ...cancellationData, cancellation_reason: value })
            }
            className="space-y-3"
          >
            {[
              "Too expensive / pricing concerns",
              "Not seeing results",
              "Moving away / relocating",
              "Schedule doesn't work",
              "Health or injury concerns",
              "Found another studio",
              "Other"
            ].map((reason) => (
              <div
                key={reason}
                className="flex items-center space-x-3 backdrop-blur-sm bg-[#8b5a3c]/40 border border-white/50 rounded-xl p-4 hover:bg-[#8b5a3c]/50 transition-all cursor-pointer"
              >
                <RadioGroupItem value={reason} id={reason} className="border-white text-[#b67651]" />
                <Label htmlFor={reason} className="text-white cursor-pointer flex-1 font-medium drop-shadow-sm">
                  {reason}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </motion.div>
      )}

      {/* Step 2: Satisfaction */}
      {step === 2 && (
        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -20, opacity: 0 }}
          className="space-y-4"
        >
          <Label className="text-white font-medium text-lg drop-shadow-md">
            How satisfied were you with your experience?
          </Label>
          <RadioGroup
            value={cancellationData.cancellation_satisfaction}
            onValueChange={(value) =>
              setCancellationData({ ...cancellationData, cancellation_satisfaction: value })
            }
            className="space-y-3"
          >
            {[
              "Very Satisfied",
              "Somewhat Satisfied",
              "Neutral",
              "Somewhat Dissatisfied",
              "Very Dissatisfied"
            ].map((level) => (
              <div
                key={level}
                className="flex items-center space-x-3 backdrop-blur-sm bg-[#8b5a3c]/40 border border-white/50 rounded-xl p-4 hover:bg-[#8b5a3c]/50 transition-all cursor-pointer"
              >
                <RadioGroupItem value={level} id={level} className="border-white text-[#b67651]" />
                <Label htmlFor={level} className="text-white cursor-pointer flex-1 font-medium drop-shadow-sm">
                  {level}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </motion.div>
      )}

      {/* Step 3: Feedback */}
      {step === 3 && (
        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -20, opacity: 0 }}
          className="space-y-4"
        >
          <Label className="text-white font-medium text-lg drop-shadow-md">
            Is there anything we could do to keep you as a member?
          </Label>
          <Textarea
            value={cancellationData.cancellation_feedback}
            onChange={(e) =>
              setCancellationData({ ...cancellationData, cancellation_feedback: e.target.value })
            }
            className="backdrop-blur-md bg-[#8b5a3c]/40 border-white/60 text-white placeholder:text-white/70 rounded-xl min-h-32 focus:bg-[#8b5a3c]/50 transition-all resize-none"
            placeholder="We value your feedback and would love to hear your thoughts..."
          />
          
          <div className="backdrop-blur-sm bg-[#8b5a3c]/40 border border-white/50 rounded-xl p-4 mt-4">
            <div className="flex items-start gap-3">
              <Gift className="w-6 h-6 text-white flex-shrink-0 mt-0.5 drop-shadow-md" />
              <div>
                <p className="text-white font-medium mb-1 drop-shadow-md">We want to make this right!</p>
                <p className="text-white/90 text-sm drop-shadow-sm">
                  We truly value having you as part of our community. Based on your feedback, we'd like to offer you special pricing to help make things work for you.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Step 4: Discount Offer */}
      {step === 4 && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="space-y-6"
        >
          {/* Discount Reveal */}
          <div className="backdrop-blur-xl bg-gradient-to-br from-white/40 to-white/30 border-2 border-white/60 rounded-2xl p-8 shadow-2xl text-center">
            <Sparkles className="w-12 h-12 text-white mx-auto mb-4 animate-pulse drop-shadow-lg" />
            <h3 className="text-white font-bold text-3xl mb-2 drop-shadow-lg">
              {cancellationData.discount_offered} OFF
            </h3>
            <p className="text-white/95 text-xl font-medium mb-1 drop-shadow-md">
              Special Pricing for You
            </p>
            <p className="text-white/85 text-sm drop-shadow-md">
              Because you're valued
            </p>
          </div>

          {/* Offer Details */}
          <div className="backdrop-blur-sm bg-white/30 border border-white/50 rounded-xl p-5">
            <h4 className="text-white font-semibold mb-3 flex items-center gap-2 drop-shadow-md">
              <Gift className="w-5 h-5" />
              What This Includes
            </h4>
            <ul className="space-y-2 text-white text-sm">
              <li className="flex items-start gap-2">
                <span className="text-white mt-1 drop-shadow-sm">✓</span>
                <span className="drop-shadow-sm">Available on any Membership plans</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-white mt-1 drop-shadow-sm">✓</span>
                <span className="drop-shadow-sm">Valid for the first 3 months</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-white mt-1 drop-shadow-sm">✓</span>
                <span className="drop-shadow-sm">No long-term commitment required</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-white mt-1 drop-shadow-sm">✓</span>
                <span className="drop-shadow-sm">Our team will provide full details and answer any questions</span>
              </li>
            </ul>
          </div>

          {/* Call to Action */}
          <div className="backdrop-blur-sm bg-white/20 border border-white/40 rounded-xl p-4">
            <p className="text-white text-center font-medium drop-shadow-md">
              Submit your request and we'll reach out to discuss how we can support you! 💙
            </p>
          </div>
        </motion.div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 mt-6">
        {step > 1 && (
          <Button
            type="button"
            onClick={() => setStep(step - 1)}
            variant="outline"
            className="flex-1 h-12 backdrop-blur-md bg-white/30 border-white/50 text-white hover:bg-white/40 rounded-xl font-medium"
            disabled={isSubmitting}
          >
            Back
          </Button>
        )}
        <Button
          type="button"
          onClick={handleNext}
          disabled={!isStepComplete() || isSubmitting}
          className="flex-1 h-12 bg-white/90 hover:bg-white text-[#b67651] rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Submitting...
            </>
          ) : step === 4 ? (
            <>
              <Gift className="w-5 h-5 mr-2" />
              Submit Request
            </>
          ) : (
            "Continue"
          )}
        </Button>
      </div>

      {/* Missing Contact Info Warning - Below button */}
      {missingContactInfo && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 flex items-center gap-2 text-amber-200 text-xs"
        >
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Please complete your contact information above (name, email, phone) to continue</span>
        </motion.div>
      )}
    </motion.div>
  );
}
