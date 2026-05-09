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
  const [systemAlert, setSystemAlert] = useState(null);

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

      // Assign sequential 5-digit ticket number
      try {
        await base44.functions.invoke('assignTicketNumber', { ticket_id: newTicket.id });
      } catch (numErr) {
        console.log("Note: Ticket number assignment failed", numErr);
      }

      // Build ticket URL
      const ticketUrl = `https://support.pilatesinpinkstudio.com/TicketBoard?ticket=${newTicket.id}`;

      // Send branded welcome email to the client (threaded with [Ticket #xxx] subject tag)
      try {
        await base44.functions.invoke('sendWelcomeEmail', { ticket_id: newTicket.id });
      } catch (welcomeErr) {
        console.log("Note: Welcome email failed", welcomeErr);
      }

      // Send assignment email notification to owner (Front Desk)
      // Uses sendAssignmentEmail so it's branded, threaded, and logged in the email panel
      try {
        await base44.functions.invoke('sendAssignmentEmail', {
          ticket_id: newTicket.id,
          assigned_to: 'info@pilatesinpinkstudio.com',
        });
      } catch (emailError) {
        console.log("Note: Assignment email notification failed", emailError);
      }

      // (Removed: dead support@... Core.SendEmail — recipient not a registered Base44 app user, was always silently failing)
      // eslint-disable-next-line no-constant-condition
      if (false) { /*
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

      */ }

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
      setSystemAlert("There was an error submitting your request. Please try again or contact us directly.");
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

      // Assign sequential 5-digit ticket number
      try {
        await base44.functions.invoke('assignTicketNumber', { ticket_id: newTicket.id });
      } catch (numErr) {
        console.log("Note: Ticket number assignment failed", numErr);
      }

      // Build ticket URL
      const ticketUrl = `https://support.pilatesinpinkstudio.com/TicketBoard?ticket=${newTicket.id}`;

      // Send branded welcome email to the client
      try {
        await base44.functions.invoke('sendWelcomeEmail', { ticket_id: newTicket.id });
      } catch (welcomeErr) {
        console.log("Note: Welcome email failed", welcomeErr);
      }

      // Send assignment email notification to owner (Front Desk)
      // Uses sendAssignmentEmail so it's branded, threaded, and logged in the email panel
      try {
        await base44.functions.invoke('sendAssignmentEmail', {
          ticket_id: newTicket.id,
          assigned_to: 'info@pilatesinpinkstudio.com',
        });
      } catch (emailError) {
        console.log("Note: Assignment email notification failed", emailError);
      }

      // eslint-disable-next-line no-constant-condition
      if (false) { /* legacy cancellation owner email body — replaced by sendAssignmentEmail above
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #f1899b 0%, #f7b1bd 50%, #fbe0e2 100%); padding: 40px 20px;">
              <div style="background: white; border-radius: 20px; padding: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
                <div style="text-align: center; margin-bottom: 30px;">
                  <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_690aada19e27fe8fcf067828/45da48106_Pilatesinpinklogojusticon1.png" alt="Pilates in Pink" style="width: 80px; height: 80px;">
                  <h1 style="color: #dc2626; margin: 15px 0 10px 0; font-size: 28px;">⚠️ URGENT Cancellation Assigned</h1>
                  <p style="color: #666; margin: 0;">Immediate action needed - cancellation request</p>
                </div>
                
                <div style="background: linear-gradient(135deg, #dc262620, #ef444420); border-left: 4px solid #dc2626; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                  <h2 style="color: #333; margin: 0 0 15px 0; font-size: 20px;">${formData.client_name}</h2>
                  <p style="margin: 8px 0; color: #555;"><strong>Email:</strong> ${formData.client_email}</p>
                  ${formData.client_phone ? `<p style="margin: 8px 0; color: #555;"><strong>Phone:</strong> ${formData.client_phone}</p>` : ''}
                  <p style="margin: 8px 0; color: #555;"><strong>Inquiry Type:</strong> Cancellation</p>
                  <p style="margin: 8px 0; color: #555;"><strong>Status:</strong> <span style="background: #e3f2fd; padding: 4px 12px; border-radius: 12px; color: #1976d2;">New</span></p>
                  <p style="margin: 8px 0; color: #555;"><strong>Priority:</strong> <span style="background: #ffebee; padding: 4px 12px; border-radius: 12px; color: #c62828;">Urgent</span></p>
                </div>
                
                <div style="background: linear-gradient(135deg, #b67651, #a56541); padding: 25px; border-radius: 10px; text-align: center; color: white; margin: 20px 0;">
                  <div style="font-size: 48px; margin-bottom: 10px;">🎁</div>
                  <h2 style="margin: 0; font-size: 32px;">${cancellationData.discount_offered}</h2>
                  <p style="margin: 10px 0 0 0; opacity: 0.9;">Special pricing offered</p>
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                  <a href="${ticketUrl}" style="display: inline-block; background: #dc2626; color: white; padding: 14px 32px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px;">View Ticket & Take Action</a>
                </div>
                
                <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center;">
                  <p style="color: #999; margin: 5px 0; font-size: 13px;">Auto-assigned from new cancellation request</p>
                  <p style="color: #999; margin: 5px 0; font-size: 13px;">Pilates in Pink Support System</p>
                </div>
              </div>
            </div>
          ` */ }

      // (Removed: dead support@... Core.SendEmail for cancellations)
      // eslint-disable-next-line no-constant-condition
      if (false) { /*
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
      */ }

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
      setSystemAlert("There was an error submitting your cancellation request. Please try again or contact us directly.");
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
      
      {systemAlert && (
        <Dialog open={true} onOpenChange={() => setSystemAlert(null)}>
          <DialogContent className="backdrop-blur-2xl bg-white/95 border-white/40">
            <DialogHeader>
              <DialogTitle>Notification</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-gray-700">{systemAlert}</p>
            </div>
            <DialogFooter>
              <Button onClick={() => setSystemAlert(null)} className="bg-[#b67651] hover:bg-[#a56541] text-white">
                OK
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
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
                        href="https://events.pilatesinpinkstudio.com"
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