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
  const [adminError, setAdminError] = useState(""); // Initialize with an empty string
  const [isEmbedded, setIsEmbedded] = useState(false);

  const navigate = useNavigate();

  // Detect if page is embedded in iframe
  React.useEffect(() => {
    setIsEmbedded(window.self !== window.top);
  }, []);

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
    // Simple password check - you can change "pip6161" to your preferred password
    if (adminPassword === "pip6161") {
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
      const newTicket = await base44.entities.SupportTicket.create({
        ...formData,
        status: "New",
        priority: formData.inquiry_type === "Cancellation" ? "High" : "Medium"
      });

      // Build ticket URL
      const ticketUrl = `https://support.pilatesinpinkstudio.com/TicketBoard?ticket=${newTicket.id}`;

      // Send notification email to internal support team (only works for app users)
      try {
        await base44.integrations.Core.SendEmail({
          from_name: "Pilates in Pink Support",
          to: "support@pilatesinpinkstudio.com",
          subject: `New Support Ticket: ${formData.inquiry_type} - ${formData.client_name}`,
          body: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f1899b, #f7b1bd); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .header h1 { color: white; margin: 0; font-size: 24px; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
    .field { margin-bottom: 20px; }
    .label { font-weight: bold; color: #b67651; margin-bottom: 5px; }
    .value { color: #333; padding: 10px; background: #f9f9f9; border-radius: 5px; }
    .button { display: inline-block; padding: 15px 30px; background: #b67651; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
    .button:hover { background: #a56541; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    .priority { display: inline-block; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: bold; }
    .priority-high { background: #fecaca; color: #991b1b; }
    .priority-medium { background: #fef3c7; color: #92400e; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📩 New Support Ticket Received</h1>
    </div>
    <div class="content">
      <div style="text-align: center; margin-bottom: 20px;">
        <span class="priority priority-${formData.inquiry_type === "Cancellation" ? "high" : "medium"}">
          ${formData.inquiry_type === "Cancellation" ? "HIGH" : "MEDIUM"} PRIORITY
        </span>
      </div>

      <div class="field">
        <div class="label">Client Name:</div>
        <div class="value">${formData.client_name}</div>
      </div>

      <div class="field">
        <div class="label">Email Address:</div>
        <div class="value"><a href="mailto:${formData.client_email}">${formData.client_email}</a></div>
      </div>

      <div class="field">
        <div class="label">Phone Number:</div>
        <div class="value"><a href="tel:${formData.client_phone}">${formData.client_phone}</a></div>
      </div>

      <div class="field">
        <div class="label">Inquiry Type:</div>
        <div class="value">${formData.inquiry_type}</div>
      </div>

      ${formData.notes ? `
      <div class="field">
        <div class="label">Message:</div>
        <div class="value">${formData.notes.replace(/\n/g, '<br>')}</div>
      </div>
      ` : ''}

      <div style="text-align: center; margin-top: 30px;">
        <a href="${ticketUrl}" class="button">
          🎫 View Ticket in Dashboard
        </a>
      </div>

      <div style="margin-top: 20px; padding: 15px; background: #f0f9ff; border-left: 4px solid #3b82f6; border-radius: 5px;">
        <strong>📌 Quick Actions:</strong><br>
        • Click the button above to view full ticket details<br>
        • Reply directly to <a href="mailto:${formData.client_email}">${formData.client_email}</a><br>
        • Call client at <a href="tel:${formData.client_phone}">${formData.client_phone}</a>
      </div>
    </div>
    <div class="footer">
      <p>This is an automated notification from Pilates in Pink Support System</p>
      <p style="margin-top: 10px;">Ticket ID: ${newTicket.id}</p>
    </div>
  </div>
</body>
</html>
        `
        });
      } catch (emailError) {
        // Silent fail - email only works for registered app users
        console.log("Note: Email notification requires recipient to be a registered app user");
      }

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
      const newTicket = await base44.entities.SupportTicket.create({
        ...formData,
        ...cancellationData,
        status: "New",
        priority: "Urgent"
      });

      // Build ticket URL
      const ticketUrl = `https://support.pilatesinpinkstudio.com/TicketBoard?ticket=${newTicket.id}`;

      base44.integrations.Core.SendEmail({
        from_name: "Pilates in Pink Support",
        to: "support@pilatesinpinkstudio.com",
        subject: `🚨 URGENT: Cancellation Request - ${formData.client_name}`,
        body: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #dc2626, #ef4444); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .header h1 { color: white; margin: 0; font-size: 24px; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
    .field { margin-bottom: 20px; }
    .label { font-weight: bold; color: #b67651; margin-bottom: 5px; }
    .value { color: #333; padding: 10px; background: #f9f9f9; border-radius: 5px; }
    .button { display: inline-block; padding: 15px 30px; background: #b67651; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
    .button:hover { background: #a56541; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    .alert { background: #fef2f2; border: 2px solid #ef4444; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
    .discount-box { background: linear-gradient(135deg, #b67651, #a56541); padding: 25px; border-radius: 10px; text-align: center; color: white; margin: 20px 0; }
    .discount-box h2 { margin: 0; font-size: 32px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ URGENT: Cancellation Request</h1>
    </div>
    <div class="content">
      <div class="alert">
        <strong>🚨 IMMEDIATE ACTION NEEDED</strong><br>
        A valued member is considering cancellation. Let's reach out and see how we can help!
      </div>

      <div class="discount-box">
        <div style="font-size: 48px; margin-bottom: 10px;">🎁</div>
        <h2>${cancellationData.discount_offered} SPECIAL PRICING</h2>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">Offered to help keep this client in our community</p>
      </div>

      <div class="field">
        <div class="label">Client Name:</div>
        <div class="value">${formData.client_name}</div>
      </div>

      <div class="field">
        <div class="label">Email Address:</div>
        <div class="value"><a href="mailto:${formData.client_email}">${formData.client_email}</a></div>
      </div>

      <div class="field">
        <div class="label">Phone Number:</div>
        <div class="value"><a href="tel:${formData.client_phone}">${formData.client_phone}</a></div>
      </div>

      <div class="field">
        <div class="label">Cancellation Reason:</div>
        <div class="value">${cancellationData.cancellation_reason}</div>
      </div>

      <div class="field">
        <div class="label">Satisfaction Level:</div>
        <div class="value">${cancellationData.cancellation_satisfaction}</div>
      </div>

      ${cancellationData.cancellation_feedback ? `
      <div class="field">
        <div class="label">Additional Feedback:</div>
        <div class="value">${cancellationData.cancellation_feedback.replace(/\n/g, '<br>')}</div>
      </div>
      ` : ''}

      <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <strong>💰 Pricing Details Shared with Client:</strong><br>
        ✓ Available on any Membership plans<br>
        ✓ Valid for the first 3 months<br>
        ✓ No long-term commitment required<br>
        ✓ Our team will provide full details
      </div>

      <div style="text-align: center; margin-top: 30px;">
        <a href="${ticketUrl}" class="button">
          🎫 View Full Details & Connect
        </a>
      </div>

      <div style="margin-top: 20px; padding: 15px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 5px;">
        <strong>⚡ Next Steps:</strong><br>
        • Reach out to ${formData.client_email} or ${formData.client_phone} today<br>
        • Client is expecting a personal call to discuss options<br>
        • Review full feedback in the dashboard
      </div>
    </div>
    <div class="footer">
      <p>This is an automated urgent notification from Pilates in Pink Support System</p>
      <p style="margin-top: 10px;">Ticket ID: ${newTicket.id}</p>
    </div>
  </div>
</body>
</html>
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
      <div className={`flex items-center justify-center p-4 ${isEmbedded ? 'min-h-[600px]' : 'min-h-screen'} bg-gradient-to-br from-[#f1899b] via-[#f7b1bd] to-[#fbe0e2]`}>
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
    <div className={`p-4 md:p-8 bg-gradient-to-br from-[#f1899b] via-[#f7b1bd] to-[#fbe0e2] relative overflow-hidden ${isEmbedded ? 'min-h-[800px]' : 'min-h-screen'}`}>
      {/* Decorative background elements - hide in embed */}
      {!isEmbedded && (
        <>
          <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#b67651]/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        </>
      )}

      {/* Admin Access Button - hide in embed */}
      {!isEmbedded && (
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
      )}

      <div className="max-w-2xl mx-auto relative z-10">
        {/* Header - hide in embed */}
        {!isEmbedded && (
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
        )}

        {/* Main Form Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: isEmbedded ? 0 : 0.1 }}
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
                    <SelectTrigger className="backdrop-blur-md bg-white/30 border-white/40 rounded-xl h-12 focus:bg-white/50 [&>span]:text-[#b67651]">
                      <SelectValue placeholder="Select inquiry type" className="text-[#b67651]" />
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
                      className="backdrop-blur-md bg-[#8b5a3c]/40 border border-[#b67651]/60 rounded-2xl p-6 overflow-hidden shadow-lg"
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
                      missingContactInfo={!formData.client_name || !formData.client_email || !formData.client_phone}
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

        {/* Footer - hide in embed */}
        {!isEmbedded && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center text-white/80 mt-6 text-sm"
          >
            We typically respond within 24 hours
          </motion.p>
        )}
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