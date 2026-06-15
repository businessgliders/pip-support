import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import IntakeSuccess from "@/components/intake/IntakeSuccess";

const INQUIRY_TYPES = [
  "General Inquiry",
  "Membership Inquiry",
  "Private Events",
  "Cancellation",
  "Other",
];

const EMPTY_FORM = {
  client_name: "",
  client_email: "",
  client_phone: "",
  inquiry_type: "",
  notes: "",
};

export default function IntakeForm() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const isValid =
    form.client_name.trim() &&
    form.client_email.trim() &&
    form.inquiry_type;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;
    setSubmitting(true);
    await base44.entities.SupportTicket.create(form);
    setSubmitting(false);
    setSubmitted(true);
    setForm(EMPTY_FORM);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f1899b] via-[#f7b1bd] to-[#fbe0e2] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_690aada19e27fe8fcf067828/45da48106_Pilatesinpinklogojusticon1.png"
            alt="Pilates in Pink"
            className="w-16 h-16 mx-auto mb-3"
          />
          <h1 className="text-3xl font-bold text-white">Pilates in Pink</h1>
          <p className="text-white/90">How can we help you?</p>
        </div>

        {submitted ? (
          <IntakeSuccess onReset={() => setSubmitted(false)} />
        ) : (
          <form
            onSubmit={handleSubmit}
            className="backdrop-blur-xl bg-white/30 border border-white/40 rounded-3xl shadow-2xl p-6 md:p-8 space-y-4"
          >
            <div>
              <Label className="text-white">Full Name *</Label>
              <Input
                value={form.client_name}
                onChange={(e) => update("client_name", e.target.value)}
                placeholder="Your name"
                className="bg-white/60 border-white/50 mt-1"
                required
              />
            </div>

            <div>
              <Label className="text-white">Email *</Label>
              <Input
                type="email"
                value={form.client_email}
                onChange={(e) => update("client_email", e.target.value)}
                placeholder="you@example.com"
                className="bg-white/60 border-white/50 mt-1"
                required
              />
            </div>

            <div>
              <Label className="text-white">Phone</Label>
              <Input
                value={form.client_phone}
                onChange={(e) => update("client_phone", e.target.value)}
                placeholder="(optional)"
                className="bg-white/60 border-white/50 mt-1"
              />
            </div>

            <div>
              <Label className="text-white">Inquiry Type *</Label>
              <Select
                value={form.inquiry_type}
                onValueChange={(v) => update("inquiry_type", v)}
              >
                <SelectTrigger className="bg-white/60 border-white/50 mt-1">
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  {INQUIRY_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-white">Message</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                placeholder="Tell us more..."
                className="bg-white/60 border-white/50 mt-1 h-28"
              />
            </div>

            <Button
              type="submit"
              disabled={!isValid || submitting}
              className="w-full bg-white/40 hover:bg-white/50 text-white border border-white/50 backdrop-blur-md font-semibold"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                </>
              ) : (
                "Submit Inquiry"
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}