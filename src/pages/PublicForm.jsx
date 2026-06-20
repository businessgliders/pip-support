import React, { useState, useEffect } from "react";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import PublicFormField from "@/components/PublicFormField";

const ACCENT = "#b67651";
// IMPORTANT: these functions live in the HUB app (PiP Inbox), not pip-support.
const HUB = "https://base44.app/api/apps/69841af9c747b033a60780f2/functions";

export default function PublicForm() {
  const token = new URLSearchParams(window.location.search).get("token");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) { setError("This link is missing its access token."); setLoading(false); return; }
    fetch(`${HUB}/getPublicForm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
        if (d.already_submitted) setDone(true);
      })
      .catch(() => setError("This form link is invalid or has expired."))
      .finally(() => setLoading(false));
  }, [token]);

  const setAnswer = (id, val) => setAnswers((a) => ({ ...a, [id]: val }));

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${HUB}/submitPublicForm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, answers }),
      });
      const d = await res.json();
      if (d.error) throw new Error(d.error);
      setDone(true);
    } catch (err) {
      setError(err.message === "already_submitted" ? "You've already submitted this form." : "Submission failed. Please try again.");
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen w-full flex items-start sm:items-center justify-center p-4 py-10"
      style={{ background: "linear-gradient(160deg,#fde7ef 0%,#f8d3e0 50%,#f3c2d4 100%)" }}>
      <div className="w-full max-w-lg">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 animate-spin" style={{ color: ACCENT }} /></div>
        ) : error && !data ? (
          <Card><State icon={AlertCircle} title="Link unavailable" msg={error} /></Card>
        ) : done ? (
          <Card><State icon={CheckCircle2} title="Thank you!" msg="Your response has been recorded." /></Card>
        ) : (
          <Card>
            <h1 className="text-2xl font-bold" style={{ color: ACCENT }}>{data.form.name}</h1>
            {data.recipient.name && <p className="text-sm text-pink-900/60 mt-1">For {data.recipient.name}</p>}
            <form onSubmit={submit} className="mt-6 space-y-5">
              {(data.form.fields || []).map((f) => (
                <PublicFormField key={f.id} field={f} value={answers[f.id]} onChange={(v) => setAnswer(f.id, v)} accent={ACCENT} />
              ))}
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button type="submit" disabled={submitting}
                className="w-full py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ backgroundColor: ACCENT }}>
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Submit
              </button>
            </form>
          </Card>
        )}
        <p className="text-center text-xs text-pink-900/40 mt-4">Pilates in Pink Studio</p>
      </div>
    </div>
  );
}

function Card({ children }) {
  return <div className="bg-white rounded-3xl shadow-xl shadow-pink-900/10 p-6 sm:p-8">{children}</div>;
}

function State({ icon: Icon, title, msg }) {
  return (
    <div className="text-center py-8">
      <div className="w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${ACCENT}1a`, color: ACCENT }}>
        <Icon className="w-7 h-7" />
      </div>
      <h2 className="text-xl font-bold text-pink-900">{title}</h2>
      <p className="text-sm text-pink-900/60 mt-1">{msg}</p>
    </div>
  );
}