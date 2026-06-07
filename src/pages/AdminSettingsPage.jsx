import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, DatabaseBackup, ExternalLink, Loader2, ShieldAlert } from "lucide-react";

function fmtDate(iso) {
  if (!iso) return "Never";
  try {
    return new Date(iso).toLocaleString("en-CA", {
      timeZone: "America/Toronto",
      year: "numeric", month: "short", day: "2-digit",
      hour: "2-digit", minute: "2-digit"
    });
  } catch {
    return iso;
  }
}

export default function AdminSettingsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSuperAdminUser, setIsSuperAdminUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // Authoritative super-admin check happens server-side; the email
        // allow-list lives in the SUPER_ADMIN_EMAILS secret and can be
        // updated without a frontend redeploy.
        const resp = await base44.functions.invoke("checkSuperAdmin", {});
        const allowed = !!resp?.data?.is_super_admin;
        setIsSuperAdminUser(allowed);
        if (allowed) {
          const list = await base44.entities.BackupSettings.list();
          let s = list[0];
          if (!s) {
            s = await base44.entities.BackupSettings.create({
              frequency: "weekly",
              is_active: true,
              backup_history: []
            });
          }
          setSettings(s);
        }
      } catch (e) {
        setIsSuperAdminUser(false);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const updateSetting = async (patch) => {
    if (!settings) return;
    setSaving(true);
    const optimistic = { ...settings, ...patch };
    setSettings(optimistic);
    try {
      await base44.entities.BackupSettings.update(settings.id, patch);
    } catch (e) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleRunNow = async () => {
    setRunning(true);
    try {
      const resp = await base44.functions.invoke("runBackup", { manual: true });
      const data = resp?.data || {};
      if (data.error) {
        toast({ title: "Backup failed", description: data.error, variant: "destructive" });
      } else {
        toast({ title: "Backup complete", description: "Spreadsheet created successfully." });
        // refresh settings to show new history
        const list = await base44.entities.BackupSettings.list();
        if (list[0]) setSettings(list[0]);
      }
    } catch (e) {
      toast({ title: "Backup failed", description: e.message, variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f1899b] via-[#f7b1bd] to-[#fbe0e2]">
        <Loader2 className="w-6 h-6 text-white animate-spin" />
      </div>
    );
  }

  if (!isSuperAdminUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f1899b] via-[#f7b1bd] to-[#fbe0e2] p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <ShieldAlert className="w-10 h-10 mx-auto text-red-500 mb-3" />
          <h2 className="text-xl font-bold text-slate-800 mb-1">Restricted Area</h2>
          <p className="text-sm text-slate-600 mb-4">Super-admin access is required to view this page.</p>
          <Button onClick={() => navigate("/Settings")} variant="outline">Back to Settings</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-b from-[#f1899b] to-white">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button
            onClick={() => navigate("/Settings")}
            variant="ghost"
            className="backdrop-blur-md bg-white/30 hover:bg-white/50 border border-white/40 text-white rounded-xl"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg">Admin Settings</h1>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-white/60 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-11 h-11 rounded-2xl bg-[#f1899b]/15 flex items-center justify-center">
              <DatabaseBackup className="w-6 h-6 text-[#b67651]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#b67651]">Disaster Recovery</h2>
              <p className="text-xs text-slate-500">Automatic exports of all entities to Google Sheets</p>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            {/* Active toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50">
              <div>
                <div className="font-semibold text-slate-800 text-sm">Scheduled Backups</div>
                <div className="text-xs text-slate-500">When off, the scheduler will skip runs.</div>
              </div>
              <button
                onClick={() => updateSetting({ is_active: !settings.is_active })}
                disabled={saving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                  settings.is_active ? "bg-green-500" : "bg-slate-300"
                }`}
                aria-label="Toggle backups"
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  settings.is_active ? "translate-x-6" : "translate-x-1"
                }`} />
              </button>
            </div>

            {/* Frequency */}
            <div>
              <Label className="text-xs text-slate-600">Frequency</Label>
              <Select
                value={settings.frequency || "weekly"}
                onValueChange={(v) => updateSetting({ frequency: v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Drive folder ID */}
            <div>
              <Label className="text-xs text-slate-600">Google Drive Folder ID (optional)</Label>
              <Input
                className="mt-1"
                placeholder="e.g. 1AbCdEfGhIjKlMnOpQrStUv"
                value={settings.drive_folder_id || ""}
                onChange={(e) => setSettings({ ...settings, drive_folder_id: e.target.value })}
                onBlur={(e) => updateSetting({ drive_folder_id: e.target.value })}
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Find this in the URL of your Drive folder. Leave blank to save in My Drive root.
              </p>
            </div>

            {/* Run now */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-[#b67651]/30 bg-[#b67651]/5">
              <div>
                <div className="font-semibold text-slate-800 text-sm">Run Backup Now</div>
                <div className="text-xs text-slate-500">
                  Last backup: <span className="font-medium text-slate-700">{fmtDate(settings.last_backup_date)}</span>
                </div>
              </div>
              <Button
                onClick={handleRunNow}
                disabled={running}
                className="bg-[#b67651] hover:bg-[#a05a3a] text-white"
              >
                {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <DatabaseBackup className="w-4 h-4 mr-2" />}
                {running ? "Running..." : "Run Now"}
              </Button>
            </div>

            {/* History */}
            <div>
              <Label className="text-xs text-slate-600">Backup History</Label>
              <div className="mt-2 rounded-xl border border-slate-200 overflow-hidden">
                {(settings.backup_history || []).length === 0 ? (
                  <div className="p-4 text-sm text-slate-500 text-center">No backups yet.</div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {(settings.backup_history || []).map((h, i) => (
                      <li key={i} className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50">
                        <span className="text-sm text-slate-700">{fmtDate(h.timestamp)}</span>
                        <a
                          href={h.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-[#b67651] hover:underline flex items-center gap-1"
                        >
                          Open <ExternalLink className="w-3 h-3" />
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}