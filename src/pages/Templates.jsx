import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Trash2, Pencil, FileText, Copy } from "lucide-react";
import UserSelectionScreen from "../components/support/UserSelectionScreen";

const VARIABLES = [
  { key: "client_name", label: "Client full name" },
  { key: "client_first_name", label: "Client first name" },
  { key: "client_email", label: "Client email" },
  { key: "client_phone", label: "Client phone" },
  { key: "inquiry_type", label: "Inquiry type" },
  { key: "ticket_id", label: "Ticket ID (short)" },
  { key: "staff_name", label: "Your full name" },
  { key: "staff_first_name", label: "Your first name" },
  { key: "staff_email", label: "Your email" },
];

const CATEGORIES = ["General", "Membership", "Cancellation", "Private Events", "Other"];

export default function Templates() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(u => {
      if (u?.email?.endsWith("@pilatesinpinkstudio.com")) setUser(u);
    }).catch(() => {}).finally(() => setAuthLoading(false));
  }, []);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["email-templates-all"],
    queryFn: () => base44.entities.EmailTemplate.list("name", 200),
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async (t) => {
      if (t.id) return base44.entities.EmailTemplate.update(t.id, { name: t.name, category: t.category, subject: t.subject, body_html: t.body_html, is_active: t.is_active });
      return base44.entities.EmailTemplate.create({ name: t.name, category: t.category, subject: t.subject, body_html: t.body_html, is_active: t.is_active ?? true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates-all"] });
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.EmailTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates-all"] });
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      setConfirmDelete(null);
    },
  });

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f1899b] to-[#fbe0e2] text-white">Loading…</div>;
  }
  if (!user) return <UserSelectionScreen />;

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-b from-[#f1899b] to-white relative">
      <div className="absolute top-0 left-0 w-96 h-96 bg-white/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-pink-100/40 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

      <div className="max-w-5xl mx-auto relative z-10">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button onClick={() => navigate("/Settings")} variant="ghost" className="backdrop-blur-md bg-white/30 hover:bg-white/50 border border-white/40 text-white rounded-xl">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg flex items-center gap-3">
              <FileText className="w-8 h-8" /> Email Templates
            </h1>
          </div>
          <Button onClick={() => setEditing({ name: "", category: "General", subject: "", body_html: "", is_active: true })} className="bg-[#b67651] hover:bg-[#a56541] text-white">
            <Plus className="w-4 h-4 mr-1" /> New Template
          </Button>
        </div>

        <div className="bg-white/85 backdrop-blur-xl rounded-3xl border border-white/60 shadow-xl p-4 md:p-6">
          {isLoading ? (
            <p className="text-center text-gray-500 py-10">Loading…</p>
          ) : templates.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-600 mb-4">No templates yet. Create your first quick-reply template.</p>
              <Button onClick={() => setEditing({ name: "", category: "General", subject: "", body_html: "", is_active: true })} className="bg-[#b67651] hover:bg-[#a56541] text-white">
                <Plus className="w-4 h-4 mr-1" /> Create Template
              </Button>
            </div>
          ) : (
            <div className="grid gap-3">
              {templates.map(t => (
                <div key={t.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-gray-900">{t.name}</h3>
                        <Badge variant="outline" className="text-xs">{t.category || "General"}</Badge>
                        {!t.is_active && <Badge className="bg-gray-100 text-gray-600 border-gray-200 text-xs">Inactive</Badge>}
                      </div>
                      <p className="text-sm text-gray-600 truncate"><span className="text-gray-400">Subject:</span> {t.subject}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setEditing(t)} className="h-8 w-8"><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => setConfirmDelete(t)} className="h-8 w-8 text-red-600 hover:text-red-700"><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {editing && (
        <TemplateEditor
          template={editing}
          onSave={(t) => saveMutation.mutate(t)}
          onCancel={() => setEditing(null)}
          saving={saveMutation.isPending}
        />
      )}

      {confirmDelete && (
        <Dialog open={true} onOpenChange={() => setConfirmDelete(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Delete template?</DialogTitle></DialogHeader>
            <p className="py-2 text-gray-700">Delete "{confirmDelete.name}"? This cannot be undone.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
              <Button onClick={() => deleteMutation.mutate(confirmDelete.id)} className="bg-red-600 hover:bg-red-700 text-white">Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function TemplateEditor({ template, onSave, onCancel, saving }) {
  const [t, setT] = useState(template);

  const insertVar = (field, key) => {
    setT(prev => ({ ...prev, [field]: (prev[field] || "") + `{{${key}}}` }));
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template.id ? "Edit Template" : "New Template"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={t.name} onChange={e => setT({ ...t, name: e.target.value })} placeholder="e.g. Membership Pricing" />
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={t.category || "General"} onValueChange={v => setT({ ...t, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label>Subject</Label>
              <VarMenu onPick={(k) => insertVar("subject", k)} />
            </div>
            <Input value={t.subject} onChange={e => setT({ ...t, subject: e.target.value })} placeholder="e.g. Re: Your inquiry, {{client_first_name}}" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label>Body (HTML)</Label>
              <VarMenu onPick={(k) => insertVar("body_html", k)} />
            </div>
            <Textarea
              value={t.body_html}
              onChange={e => setT({ ...t, body_html: e.target.value })}
              className="min-h-48 font-mono text-xs"
              placeholder={`<p>Hi {{client_first_name}},</p>\n<p>Thanks for reaching out about {{inquiry_type}}…</p>\n<p>— {{staff_first_name}}</p>`}
            />
          </div>

          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs font-semibold text-gray-700 mb-2">Available variables (click to copy)</p>
            <div className="flex flex-wrap gap-1.5">
              {VARIABLES.map(v => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(`{{${v.key}}}`)}
                  className="text-[11px] bg-white border border-gray-200 hover:border-amber-400 hover:bg-amber-50 rounded px-2 py-0.5 font-mono text-gray-700 transition-colors"
                  title={v.label}
                >
                  {`{{${v.key}}}`}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={t.is_active !== false} onChange={e => setT({ ...t, is_active: e.target.checked })} />
            Active (show in template picker)
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button
            onClick={() => onSave(t)}
            disabled={!t.name || !t.subject || !t.body_html || saving}
            className="bg-[#b67651] hover:bg-[#a56541] text-white"
          >
            {saving ? "Saving…" : (template.id ? "Save Changes" : "Create Template")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VarMenu({ onPick }) {
  return (
    <Select onValueChange={onPick}>
      <SelectTrigger className="w-auto h-7 text-xs gap-1 border-amber-300 text-amber-700">
        <Copy className="w-3 h-3 mr-1" /> Insert variable
      </SelectTrigger>
      <SelectContent>
        {VARIABLES.map(v => (
          <SelectItem key={v.key} value={v.key} className="text-xs">
            <span className="font-mono">{`{{${v.key}}}`}</span> — {v.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}