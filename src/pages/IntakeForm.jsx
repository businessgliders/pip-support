
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, CheckCircle2, Loader2, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import CancellationFlow from "../components/support/CancellationFlow";

export default function IntakeForm() {
  const [formData, setFormData] = useState({
    client_name: "",
    client_email: "",
    client_phone: "",
    inquiry_type: "",
    notes: ""
  });
  const [showCancellation, setShowCancellation] = useState(false);
  const [showPrivateEvents, setShowPrivateEvents] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");
  
  const navigate = useNavigate();

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleInquiryTypeChange = (value) => {
    setFormData(prev => ({ ...prev, inquiry_type: value }));
    
    if (value === "Private Events") {
      setShowPrivateEvents(true);
      setShowCancellation(false);
    } else if (value === "Cancellation") {
      setShowCancellation(true);
      setShowPrivateEvents(false);
    } else {
      setShowPrivateEvents(false);
      setShowCancellation(false);
    }
  };

  const handleAdminAccess = () => {
    // Simple password check - you can change "admin123" to your preferred password
    if (adminPassword === "admin123") {
      navigate(createPageUrl("TicketBoard"));
    } else {
      setAdminError("Incorrect password");
      setTimeout(() => setAdminError(""), 2000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await base44.entities.SupportTicket.create({
        ...formData,
        status: "New",
        priority: formData.inquiry_type === "Cancellation" ? "High" : "Medium"
      });

      // Try to send email, but don't fail if it doesn't work
      base44.integrations.Core.SendEmail({
        from_name: "Pilates in Pink - Support Form",
        to: "gurpreen@pilatesinpinkstudio.com",
        subject: `New Support Ticket: ${formData.inquiry_type}`,
        body: `
New support ticket received:

From: ${formData.client_name}
Email: ${formData.client_email}
Phone: ${formData.client_phone}
Inquiry Type: ${formData.inquiry_type}

Message:
${formData.notes || "No additional notes"}

---
Please reply directly to ${formData.client_email} to respond to this inquiry.
        `
      }).catch(err => console.error("Email failed:", err));

      // Show success
      setSubmitted(true);
      setIsSubmitting(false);
      
      setTimeout(() => {
        setFormData({
          client_name: "",
          client_email: "",
          client_phone: "",
          inquiry_type: "",
          notes: ""
        });
        setSubmitted(false);
        setShowCancellation(false);
        setShowPrivateEvents(false);
      }, 4000);
    } catch (error) {
      console.error("Error submitting form:", error);
      setIsSubmitting(false);
      alert("There was an error submitting your request. Please try again or contact us directly.");
    }
  };

  const handleCancellationSubmit = async (cancellationData) => {
    setIsSubmitting(true);
    
    try {
      await base44.entities.SupportTicket.create({
        ...formData,
        ...cancellationData,
        status: "New",
        priority: "Urgent"
      });

      // Try to send email, but don't fail if it doesn't work
      base44.integrations.Core.SendEmail({
        from_name: "Pilates in Pink - Support Form",
        to: "gurpreen@pilatesinpinkstudio.com",
        subject: `🚨 URGENT: Cancellation Request - ${formData.client_name}`,
        body: `
⚠️ CANCELLATION REQUEST - RETENTION OPPORTUNITY

Client Information:
Name: ${formData.client_name}
Email: ${formData.client_email}
Phone: ${formData.client_phone}

Cancellation Details:
Reason: ${cancellationData.cancellation_reason}
Satisfaction: ${cancellationData.cancellation_satisfaction}
Additional Feedback: ${cancellationData.cancellation_feedback || "No additional feedback"}

💰 DISCOUNT OFFERED TO CLIENT: ${cancellationData.discount_offered} OFF

Terms shown to client:
- Available on any Membership plans
- Valid for the first 3 months
- No long-term commitment required
- Conditions apply

Risk Level: ${cancellationData.discount_offered === "20%" ? "VERY HIGH" : cancellationData.discount_offered === "15%" ? "HIGH" : cancellationData.discount_offered === "10%" ? "MEDIUM" : "LOW"}

---
⚡ URGENT: Client expects a call to activate this discount today.
Please contact ${formData.client_email} (${formData.client_phone}) immediately.
        `
      }).catch(err => console.error("Email failed:", err));

      // Show success
      setSubmitted(true);
      setIsSubmitting(false);
      
      setTimeout(() => {
        setFormData({
          client_name: "",
          client_email: "",
          client_phone: "",
          inquiry_type: "",
          notes: ""
        });
        setSubmitted(false);
        setShowCancellation(false);
        setShowPrivateEvents(false);
      }, 4000);
    } catch (error) {
      console.error("Error submitting cancellation:", error);
      setIsSubmitting(false);
      alert("There was an error submitting your cancellation request. Please try again or contact us directly.");
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#f1899b] via-[#f7b1bd] to-[#fbe0e2]">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="backdrop-blur-xl bg-white/30 border border-white/40 rounded-3xl p-12 shadow-2xl">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            >
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-green-500 flex items-center justify-center">
                <CheckCircle2 className="w-16 h-16 text-white" />
              </div>
            </motion.div>
            <h2 className="text-3xl font-bold text-white mb-3">Thank You!</h2>
            <p className="text-white/90 text-lg mb-2">We've received your request successfully.</p>
            <p className="text-white/80 text-base">We'll be in touch with you soon!</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-[#f1899b] via-[#f7b1bd] to-[#fbe0e2] relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#b67651]/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      
      {/* Admin Access Button */}
      <div className="absolute top-4 right-4 z-10">
        <Button
          onClick={() => setShowAdminLogin(true)}
          variant="ghost"
          size="icon"
          className="backdrop-blur-md bg-white/20 hover:bg-white/30 border border-white/40 text-white rounded-full w-10 h-10 shadow-lg"
        >
          <Lock className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="max-w-2xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-8"
        >
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_690aada19e27fe8fcf067828/45da48106_Pilatesinpinklogojusticon1.png"
            alt="Pilates in Pink"
            className="w-24 h-24 mx-auto mb-4 drop-shadow-2xl"
          />
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 drop-shadow-lg">
            We're Here to Help
          </h1>
          <p className="text-white/90 text-lg">Tell us how we can support you today</p>
        </motion.div>

        {/* Main Form Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="backdrop-blur-xl bg-white/20 border border-white/30 shadow-2xl rounded-3xl overflow-hidden">
            <CardHeader className="border-b border-white/20 bg-white/10">
              <CardTitle className="text-2xl text-white">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="p-6 md:p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name */}
                <div className="space-y-2">
                  <Label className="text-white font-medium">Full Name *</Label>
                  <Input
                    required
                    value={formData.client_name}
                    onChange={(e) => handleInputChange("client_name", e.target.value)}
                    className="backdrop-blur-md bg-white/30 border-white/40 text-[#b67651] placeholder:text-[#b67651]/60 rounded-xl h-12 focus:bg-white/50 transition-all"
                    placeholder="Your name"
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label className="text-white font-medium">Email Address *</Label>
                  <Input
                    required
                    type="email"
                    value={formData.client_email}
                    onChange={(e) => handleInputChange("client_email", e.target.value)}
                    className="backdrop-blur-md bg-white/30 border-white/40 text-[#b67651] placeholder:text-[#b67651]/60 rounded-xl h-12 focus:bg-white/50 transition-all"
                    placeholder="your.email@example.com"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label className="text-white font-medium">Phone Number *</Label>
                  <Input
                    required
                    type="tel"
                    value={formData.client_phone}
                    onChange={(e) => handleInputChange("client_phone", e.target.value)}
                    className="backdrop-blur-md bg-white/30 border-white/40 text-[#b67651] placeholder:text-[#b67651]/60 rounded-xl h-12 focus:bg-white/50 transition-all"
                    placeholder="(555) 123-4567"
                  />
                </div>

                {/* Inquiry Type */}
                <div className="space-y-2">
                  <Label className="text-white font-medium">How can we help? *</Label>
                  <Select required value={formData.inquiry_type} onValueChange={handleInquiryTypeChange}>
                    <SelectTrigger className="backdrop-blur-md bg-white/30 border-white/40 text-[#b67651] rounded-xl h-12 focus:bg-white/50">
                      <SelectValue placeholder="Select inquiry type" />
                    </SelectTrigger>
                    <SelectContent className="backdrop-blur-xl bg-white/95 border-white/40">
                      <SelectItem value="General Inquiry">General Inquiry</SelectItem>
                      <SelectItem value="Membership Inquiry">Membership Inquiry</SelectItem>
                      <SelectItem value="Private Events">Private Events</SelectItem>
                      <SelectItem value="Cancellation">Cancellation</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Private Events Message */}
                <AnimatePresence>
                  {showPrivateEvents && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="backdrop-blur-md bg-[#b67651]/20 border border-[#b67651]/40 rounded-2xl p-6 overflow-hidden"
                    >
                      <h3 className="text-white font-semibold text-lg mb-2 flex items-center gap-2 drop-shadow-md">
                        <ExternalLink className="w-5 h-5" />
                        Private Events
                      </h3>
                      <p className="text-white/90 mb-4 drop-shadow-sm">
                        For private event inquiries and bookings, please visit our dedicated events page:
                      </p>
                      <a
                        href="https://68e7f88493bea0ec207ab95e.blocks-app.diy/68e7f94faa69e69923c41264"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-[#b67651] hover:bg-[#a56541] text-white rounded-xl font-medium transition-all shadow-lg hover:shadow-xl"
                      >
                        Visit Events Page
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Cancellation Flow */}
                <AnimatePresence>
                  {showCancellation && (
                    <CancellationFlow
                      onSubmit={handleCancellationSubmit}
                      isSubmitting={isSubmitting}
                    />
                  )}
                </AnimatePresence>

                {/* Additional Notes (hidden for cancellation) */}
                {!showCancellation && (
                  <div className="space-y-2">
                    <Label className="text-white font-medium">Additional Details</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => handleInputChange("notes", e.target.value)}
                      className="backdrop-blur-md bg-white/30 border-white/40 text-[#b67651] placeholder:text-[#b67651]/60 rounded-xl min-h-32 focus:bg-white/50 transition-all resize-none"
                      placeholder="Please share any additional information..."
                    />
                  </div>
                )}

                {/* Submit Button (hidden for cancellation - it has its own) */}
                {!showCancellation && (
                  <Button
                    type="submit"
                    disabled={isSubmitting || showPrivateEvents}
                    className="w-full h-14 bg-[#b67651] hover:bg-[#a56541] text-white rounded-xl text-lg font-semibold shadow-xl hover:shadow-2xl transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Request"
                    )}
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center text-white/80 mt-6 text-sm"
        >
          We typically respond within 24 hours
        </motion.p>
      </div>

      {/* Admin Login Dialog */}
      <Dialog open={showAdminLogin} onOpenChange={setShowAdminLogin}>
        <DialogContent className="backdrop-blur-2xl bg-white/95 border-white/40">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Admin Access
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-password">Password</Label>
              <Input
                id="admin-password"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdminAccess()}
                placeholder="Enter admin password"
                className={adminError ? "border-red-500" : ""}
              />
              {adminError && (
                <p className="text-red-600 text-sm">{adminError}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAdminLogin(false);
              setAdminPassword("");
              setAdminError("");
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleAdminAccess}
              className="bg-[#b67651] hover:bg-[#a56541] text-white"
            >
              Access Dashboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
