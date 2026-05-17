import React, { useState, useRef, useEffect } from "react";
import { LifeBuoy, X, Send, Loader2, CheckCircle2, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";

const FRONT_DESK_EMAIL = "info@pilatesinpinkstudio.com";

const URGENCY_OPTIONS = [
  { value: "Low", label: "🟢 Low - whenever you can" },
  { value: "Soon", label: "🟡 Soon - this week" },
  { value: "High", label: "🟠 High - today" },
  { value: "Critical", label: "🔴 Critical - blocking work" }
];

const SIDE_OPTIONS = [
  { value: "client", label: "Client-side" },
  { value: "our", label: "Our side" },
  { value: "both", label: "Both" }
];

const CLIENT_PLATFORM_OPTIONS = ["App", "Website", "Other"];

const SIDE_LABELS = {
  client: "Client-side",
  our: "Our side",
  both: "Both"
};

export default function BugReportChat({ currentUser, tickets = [], hideFab = false, openSignal = 0 }) {
  const isFrontDesk = currentUser?.email === FRONT_DESK_EMAIL;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (openSignal > 0) setOpen(true);
  }, [openSignal]);
  const [step, setStep] = useState("describe");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [repNameInput, setRepNameInput] = useState("");
  const [clientNameInput, setClientNameInput] = useState("");
  const [bookingInput, setBookingInput] = useState("");
  const [data, setData] = useState({
    description: "",
    rep_name: "",
    ticket_number: "",
    ticket_id: "",
    client_name: "",
    booking_info: "",
    affected_side: "",
    client_platform: "",
    urgency: "Soon",
    image_urls: []
  });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      pushAssistant("Hey! 👋 I'll help you escalate this. What went wrong? Describe the bug in as much detail as you can.");
    }
  }, [open]); // eslint-disable-line

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, step]);

  const pushAssistant = (content) => {
    setMessages(prev => [...prev, { role: "assistant", content }]);
  };
  const pushUser = (content) => {
    setMessages(prev => [...prev, { role: "user", content }]);
  };

  const resetAll = () => {
    setStep("describe");
    setMessages([]);
    setInput("");
    setRepNameInput("");
    setClientNameInput("");
    setBookingInput("");
    setData({
      description: "",
      rep_name: "",
      ticket_number: "",
      ticket_id: "",
      client_name: "",
      booking_info: "",
      affected_side: "",
      client_platform: "",
      urgency: "Soon",
      image_urls: []
    });
    setError(null);
  };

  const handleClose = () => {
    setOpen(false);
    if (step === "done") {
      setTimeout(resetAll, 300);
    }
  };

  const buildPlatform = (side, clientPlatform) => {
    const sideLabel = SIDE_LABELS[side] || side;
    if (side === "our") return "Our side";
    if (clientPlatform) return `${sideLabel} • ${clientPlatform}`;
    return sideLabel;
  };

  const submitDescribe = () => {
    const text = input.trim();
    if (!text) return;
    pushUser(text);
    setData(d => ({ ...d, description: text }));
    setInput("");
    if (isFrontDesk) {
      setStep("repName");
      setTimeout(() => pushAssistant("Got it. What's your name? (Front Desk Rep)"), 250);
    } else {
      setStep("linkTicket");
      setTimeout(() => pushAssistant("Got it. Is this related to an existing ticket?"), 250);
    }
  };

  const submitRepName = () => {
    const name = repNameInput.trim();
    if (!name) return;
    pushUser(name);
    setData(d => ({ ...d, rep_name: name }));
    setRepNameInput("");
    setStep("linkTicket");
    setTimeout(() => pushAssistant("Thanks! Is this related to an existing ticket?"), 250);
  };

  // Try to extract a client name from free-text description.
  // Looks for simple patterns like "client John Smith", "for Jane Doe", "with Mary Jones".
  const extractClientName = (text) => {
    if (!text) return "";
    const patterns = [
      /\bclient(?:\s+is|\s+named|:)?\s+([A-Z][a-zA-Z'’-]+(?:\s+[A-Z][a-zA-Z'’-]+){0,2})/,
      /\bfor\s+([A-Z][a-zA-Z'’-]+\s+[A-Z][a-zA-Z'’-]+)/,
      /\bwith\s+([A-Z][a-zA-Z'’-]+\s+[A-Z][a-zA-Z'’-]+)/,
    ];
    for (const re of patterns) {
      const m = text.match(re);
      if (m && m[1]) return m[1].trim();
    }
    return "";
  };

  const answerLinkTicket = (yes) => {
    pushUser(yes ? "Yes" : "No");
    if (yes) {
      setStep("ticketSelect");
      setTimeout(() => pushAssistant("Pick the ticket it relates to:"), 200);
    } else {
      // No linked ticket — try to auto-extract a client name from description
      const guessed = extractClientName(data.description);
      if (guessed) {
        setData(d => ({ ...d, client_name: guessed }));
        setClientNameInput(guessed);
        setStep("clientName");
        setTimeout(() => pushAssistant(`Is this about client "${guessed}"? You can edit or clear the name below.`), 200);
      } else {
        setStep("clientName");
        setTimeout(() => pushAssistant("Which client is this about? (or skip if not client-specific)"), 200);
      }
    }
  };

  const pickTicket = (ticketId) => {
    if (ticketId === "__none__") {
      pushUser("Can't find it");
      const guessed = extractClientName(data.description);
      if (guessed) {
        setData(d => ({ ...d, client_name: guessed }));
        setClientNameInput(guessed);
        setStep("clientName");
        setTimeout(() => pushAssistant(`No problem. Is this about client "${guessed}"? You can edit or clear the name below.`), 200);
      } else {
        setStep("clientName");
        setTimeout(() => pushAssistant("No problem. Which client is this about? (or skip)"), 200);
      }
      return;
    }
    const t = tickets.find(x => x.id === ticketId);
    if (!t) return;
    pushUser(`Ticket #${t.ticket_number || "—"} • ${t.client_name}`);
    setData(d => ({
      ...d,
      ticket_id: t.id,
      ticket_number: t.ticket_number ? String(t.ticket_number) : "",
      client_name: t.client_name || ""
    }));
    setStep("bookingInfo");
    setTimeout(() => pushAssistant("Got it. Is there a specific booking date & time of concern? (or skip)"), 200);
  };

  const submitClientName = (skip = false) => {
    const name = clientNameInput.trim();
    if (skip || !name) {
      pushUser("Skip");
      setData(d => ({ ...d, client_name: "" }));
    } else {
      pushUser(name);
      setData(d => ({ ...d, client_name: name }));
    }
    setClientNameInput("");
    setStep("bookingInfo");
    setTimeout(() => pushAssistant("Is there a specific booking date & time of concern? (or skip)"), 200);
  };

  const submitBookingInfo = (skip = false) => {
    const info = bookingInput.trim();
    if (skip || !info) {
      pushUser("Skip");
      setData(d => ({ ...d, booking_info: "" }));
    } else {
      pushUser(info);
      setData(d => ({ ...d, booking_info: info }));
    }
    setBookingInput("");
    setStep("affectedSide");
    setTimeout(() => pushAssistant("Is this happening on client-side, our side, or both?"), 200);
  };

  const pickSide = (side) => {
    const label = SIDE_LABELS[side];
    pushUser(label);
    setData(d => ({ ...d, affected_side: side }));
    if (side === "our") {
      setStep("urgency");
      setTimeout(() => pushAssistant("How urgent is this?"), 200);
    } else {
      setStep("clientPlatform");
      setTimeout(() => pushAssistant("Did the client have this issue on the App, Website, or Other?"), 200);
    }
  };

  const pickClientPlatform = (p) => {
    pushUser(p);
    setData(d => ({ ...d, client_platform: p }));
    setStep("urgency");
    setTimeout(() => pushAssistant("How urgent is this?"), 200);
  };

  const pickUrgency = (u) => {
    const label = URGENCY_OPTIONS.find(o => o.value === u)?.label || u;
    pushUser(label);
    setData(d => ({ ...d, urgency: u }));
    setStep("images");
    setTimeout(() => pushAssistant("Want to attach any screenshots? You can add a few, or skip."), 200);
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    setError(null);
    const uploaded = [];
    for (const file of files) {
      try {
        const res = await base44.integrations.Core.UploadFile({ file });
        if (res?.file_url) uploaded.push(res.file_url);
      } catch (err) {
        setError(`Upload failed: ${err.message}`);
      }
    }
    setData(d => ({ ...d, image_urls: [...d.image_urls, ...uploaded] }));
    if (uploaded.length) {
      pushUser(`📎 Attached ${uploaded.length} image${uploaded.length === 1 ? "" : "s"}`);
    }
    setUploading(false);
    e.target.value = "";
  };

  const finishImages = () => {
    setStep("review");
    setTimeout(() => pushAssistant("Here's the summary. Ready to send?"), 200);
  };

  const submitReport = async () => {
    setStep("sending");
    setError(null);
    try {
      const transcript = [
        ...messages,
        { role: "user", content: "Send it" }
      ];
      const platform = buildPlatform(data.affected_side, data.client_platform);
      const payload = {
        description: data.description,
        ticket_number: data.ticket_number,
        ticket_id: data.ticket_id,
        client_name: data.client_name,
        booking_info: data.booking_info,
        platform,
        urgency: data.urgency,
        image_urls: data.image_urls,
        transcript,
        rep_name: data.rep_name
      };
      const res = await base44.functions.invoke("sendBugReport", payload);
      if (res?.data?.success) {
        setStep("done");
        pushAssistant(`✅ Sent to ${res.data.escalated_to}. Thanks for the heads up!`);
      } else {
        throw new Error(res?.data?.error || "Unknown error");
      }
    } catch (err) {
      setError(err.message);
      setStep("review");
      pushAssistant(`⚠️ Couldn't send: ${err.message}. Try again?`);
    }
  };

  const ticketOptions = tickets
    .filter(t => !t.archived)
    .slice()
    .sort((a, b) => (b.ticket_number || 0) - (a.ticket_number || 0))
    .slice(0, 50);

  const platformSummary = buildPlatform(data.affected_side, data.client_platform);

  return (
    <>
      {!open && !hideFab && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{ bottom: "calc(72px + env(safe-area-inset-bottom, 0px))" }}
          className="fixed md:!bottom-5 right-5 z-50 group flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-br from-[#b67651] to-[#a05a3a] text-white shadow-2xl hover:scale-105 active:scale-95 transition-all border border-white/30"
          title="Report a bug"
        >
          <LifeBuoy className="w-5 h-5" />
          <span className="hidden sm:inline text-sm font-semibold">Report a bug</span>
        </button>
      )}

      {open && (
        <div
          style={{ bottom: "calc(72px + env(safe-area-inset-bottom, 0px))" }}
          className="fixed md:!bottom-5 right-5 z-50 w-[calc(100vw-2.5rem)] sm:w-[400px] h-[600px] max-h-[calc(100vh-6rem)] md:max-h-[calc(100vh-2.5rem)] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-4 duration-200"
        >
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#b67651] to-[#a05a3a] text-white">
            <div className="flex items-center gap-2">
              <LifeBuoy className="w-4 h-4" />
              <div>
                <div className="font-semibold text-sm">Report a bug</div>
                <div className="text-[11px] text-white/80">Internal escalation</div>
              </div>
            </div>
            <button onClick={handleClose} className="p-1 hover:bg-white/20 rounded-lg transition">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-slate-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-[#b67651] text-white rounded-br-sm"
                    : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm"
                }`}>
                  {m.content}
                </div>
              </div>
            ))}

            {step === "linkTicket" && (
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={() => answerLinkTicket(true)} className="bg-[#b67651] hover:bg-[#a05a3a] text-white">Yes</Button>
                <Button size="sm" variant="outline" onClick={() => answerLinkTicket(false)}>No</Button>
              </div>
            )}

            {step === "ticketSelect" && (
              <div className="pt-1 space-y-2">
                <Select onValueChange={pickTicket}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Search & select a ticket..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ticketOptions.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        #{t.ticket_number || "—"} • {t.client_name} • {t.inquiry_type}
                      </SelectItem>
                    ))}
                    <SelectItem value="__none__">Can't find it</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {step === "affectedSide" && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SIDE_OPTIONS.map(s => (
                  <Button key={s.value} size="sm" variant="outline" onClick={() => pickSide(s.value)} className="bg-white">
                    {s.label}
                  </Button>
                ))}
              </div>
            )}

            {step === "clientPlatform" && (
              <div className="flex flex-wrap gap-2 pt-1">
                {CLIENT_PLATFORM_OPTIONS.map(p => (
                  <Button key={p} size="sm" variant="outline" onClick={() => pickClientPlatform(p)} className="bg-white">
                    {p}
                  </Button>
                ))}
              </div>
            )}

            {step === "urgency" && (
              <div className="flex flex-col gap-2 pt-1">
                {URGENCY_OPTIONS.map(o => (
                  <Button key={o.value} size="sm" variant="outline" onClick={() => pickUrgency(o.value)} className="bg-white justify-start">
                    {o.label}
                  </Button>
                ))}
              </div>
            )}

            {step === "images" && (
              <div className="pt-1 space-y-2">
                {data.image_urls.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {data.image_urls.map((url, i) => (
                      <img key={i} src={url} alt="attachment" className="w-16 h-16 object-cover rounded-lg border border-slate-200" />
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="bg-white">
                    {uploading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <ImagePlus className="w-3 h-3 mr-1" />}
                    Add image
                  </Button>
                  <Button size="sm" onClick={finishImages} disabled={uploading} className="bg-[#b67651] hover:bg-[#a05a3a] text-white">
                    {data.image_urls.length ? "Continue" : "Skip"}
                  </Button>
                </div>
              </div>
            )}

            {step === "review" && (
              <div className="pt-1 space-y-2">
                <div className="bg-white border border-slate-200 rounded-xl p-3 text-xs space-y-1">
                  <div><span className="text-slate-500">Description:</span> <span className="text-slate-800">{data.description}</span></div>
                  {data.rep_name && <div><span className="text-slate-500">Front Desk Rep:</span> {data.rep_name}</div>}
                  {data.ticket_number && <div><span className="text-slate-500">Ticket:</span> <strong>#{data.ticket_number}</strong></div>}
                  {data.client_name && <div><span className="text-slate-500">Client:</span> {data.client_name}</div>}
                  {data.booking_info && <div><span className="text-slate-500">Booking:</span> {data.booking_info}</div>}
                  <div><span className="text-slate-500">Platform:</span> {platformSummary || "—"}</div>
                  <div><span className="text-slate-500">Urgency:</span> {data.urgency}</div>
                  {data.image_urls.length > 0 && <div><span className="text-slate-500">Attachments:</span> {data.image_urls.length}</div>}
                </div>
                {error && <div className="text-xs text-red-600 bg-red-50 p-2 rounded">{error}</div>}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setStep("images"); }} className="bg-white">Back</Button>
                  <Button size="sm" onClick={submitReport} className="bg-[#b67651] hover:bg-[#a05a3a] text-white flex-1">
                    <Send className="w-3 h-3 mr-1" /> Send to escalation
                  </Button>
                </div>
              </div>
            )}

            {step === "sending" && (
              <div className="pt-1 flex items-center gap-2 text-slate-500 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Sending report...
              </div>
            )}

            {step === "done" && (
              <div className="pt-1">
                <Button size="sm" onClick={() => { resetAll(); pushAssistant("Hey! 👋 What went wrong this time?"); }} className="bg-[#b67651] hover:bg-[#a05a3a] text-white">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Report another bug
                </Button>
              </div>
            )}
          </div>

          {step === "describe" && (
            <div className="border-t border-slate-200 p-2 bg-white flex gap-2">
              <Textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="What went wrong?"
                className="min-h-[44px] max-h-32 text-sm resize-none"
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submitDescribe();
                  }
                }}
              />
              <Button onClick={submitDescribe} disabled={!input.trim()} className="bg-[#b67651] hover:bg-[#a05a3a] text-white self-end">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          )}

          {step === "repName" && (
            <div className="border-t border-slate-200 p-2 bg-white flex gap-2">
              <Input
                autoFocus
                value={repNameInput}
                onChange={e => setRepNameInput(e.target.value)}
                placeholder="Your name"
                className="text-sm"
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submitRepName();
                  }
                }}
              />
              <Button onClick={submitRepName} disabled={!repNameInput.trim()} className="bg-[#b67651] hover:bg-[#a05a3a] text-white">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          )}

          {step === "clientName" && (
            <div className="border-t border-slate-200 p-2 bg-white flex gap-2">
              <Input
                autoFocus
                value={clientNameInput}
                onChange={e => setClientNameInput(e.target.value)}
                placeholder="Client name (or skip)"
                className="text-sm"
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submitClientName();
                  }
                }}
              />
              <Button variant="outline" onClick={() => submitClientName(true)} className="bg-white">Skip</Button>
              <Button onClick={() => submitClientName()} disabled={!clientNameInput.trim()} className="bg-[#b67651] hover:bg-[#a05a3a] text-white">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          )}

          {step === "bookingInfo" && (
            <div className="border-t border-slate-200 p-2 bg-white flex gap-2">
              <Input
                autoFocus
                value={bookingInput}
                onChange={e => setBookingInput(e.target.value)}
                placeholder="e.g. Mon May 19, 9am"
                className="text-sm"
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submitBookingInfo();
                  }
                }}
              />
              <Button variant="outline" onClick={() => submitBookingInfo(true)} className="bg-white">Skip</Button>
              <Button onClick={() => submitBookingInfo()} disabled={!bookingInput.trim()} className="bg-[#b67651] hover:bg-[#a05a3a] text-white">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
}