import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Explicit list of entities to back up
const ENTITIES_TO_BACKUP = [
  "SupportTicket",
  "EmailMessage",
  "EmailTemplate",
  "BugReport",
  "User",
  "BackupSettings"
];

const FREQUENCY_MS = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000
};

function torontoTimestamp() {
  return new Date().toLocaleString("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false
  });
}

function flattenValue(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try { return JSON.stringify(v); } catch { return String(v); }
}

function collectHeaders(records) {
  const headers = new Set(["id", "created_date", "updated_date", "created_by"]);
  for (const r of records) {
    Object.keys(r || {}).forEach(k => headers.add(k));
  }
  return Array.from(headers);
}

async function gsFetch(url, accessToken, options = {}) {
  const resp = await fetch(url, {
    ...options,
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  if (resp.status === 401) {
    throw new Error("Integration 'googlesheets' has expired. Please reconnect the connector.");
  }
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Google API error (${resp.status}): ${txt}`);
  }
  return resp.json();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let payload = {};
    try { payload = await req.json(); } catch { /* ignore */ }
    const isManual = !!payload?.manual;

    // Auth: manual runs require admin; scheduled runs proceed
    if (isManual) {
      const user = await base44.auth.me();
      if (!user || user.role !== 'admin') {
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    }

    // Load or create BackupSettings (singleton)
    const allSettings = await base44.asServiceRole.entities.BackupSettings.list();
    let settings = allSettings[0];
    if (!settings) {
      settings = await base44.asServiceRole.entities.BackupSettings.create({
        frequency: "weekly",
        is_active: true,
        backup_history: []
      });
    }

    // Scheduled-only gating
    if (!isManual) {
      if (settings.is_active === false) {
        return Response.json({ skipped: true, reason: "Backups are disabled" });
      }
      if (settings.last_backup_date) {
        const last = new Date(settings.last_backup_date).getTime();
        const windowMs = FREQUENCY_MS[settings.frequency] || FREQUENCY_MS.weekly;
        if (Date.now() - last < windowMs) {
          return Response.json({ skipped: true, reason: "Within frequency window", last_backup_date: settings.last_backup_date });
        }
      }
    }

    // Get Google Sheets access token
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");
    if (!accessToken) {
      return Response.json({ error: "Integration 'googlesheets' has expired. Please reconnect the connector." }, { status: 500 });
    }

    const appName = Deno.env.get("BASE44_APP_NAME") || "PiPSupport";
    const title = `Backup - ${appName} - ${torontoTimestamp()}`;

    // Step 1: Create spreadsheet
    const createResp = await gsFetch(
      "https://sheets.googleapis.com/v4/spreadsheets",
      accessToken,
      {
        method: "POST",
        body: JSON.stringify({ properties: { title } })
      }
    );
    const spreadsheetId = createResp.spreadsheetId;
    const spreadsheetUrl = createResp.spreadsheetUrl;
    const defaultSheetId = createResp.sheets?.[0]?.properties?.sheetId;

    // Step 2: Move into Drive folder if configured
    if (settings.drive_folder_id) {
      try {
        await gsFetch(
          `https://www.googleapis.com/drive/v3/files/${spreadsheetId}?addParents=${encodeURIComponent(settings.drive_folder_id)}&removeParents=root&supportsAllDrives=true`,
          accessToken,
          { method: "PATCH", body: JSON.stringify({}) }
        );
      } catch (e) {
        console.error("Failed to move to Drive folder:", e.message);
      }
    }

    // Step 3: Add a tab per entity (batchUpdate to add sheets), then write data
    const addSheetRequests = ENTITIES_TO_BACKUP.map(name => ({
      addSheet: { properties: { title: name.substring(0, 99) } }
    }));
    const batchResp = await gsFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      accessToken,
      {
        method: "POST",
        body: JSON.stringify({ requests: addSheetRequests })
      }
    );

    // Delete the default "Sheet1" tab
    if (defaultSheetId !== undefined) {
      try {
        await gsFetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
          accessToken,
          {
            method: "POST",
            body: JSON.stringify({ requests: [{ deleteSheet: { sheetId: defaultSheetId } }] })
          }
        );
      } catch (e) {
        console.error("Failed to delete default sheet:", e.message);
      }
    }

    // Step 4: For each entity, fetch all records and write to its tab
    const entityResults = [];
    for (const entityName of ENTITIES_TO_BACKUP) {
      try {
        let records = [];
        try {
          records = await base44.asServiceRole.entities[entityName].list();
        } catch (e) {
          console.error(`Failed to list ${entityName}:`, e.message);
        }
        records = records || [];

        const headers = collectHeaders(records);
        const rows = records.map(r => headers.map(h => flattenValue(r?.[h])));
        const values = [headers, ...rows];

        const range = `${entityName}!A1`;
        await gsFetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
          accessToken,
          {
            method: "PUT",
            body: JSON.stringify({ values })
          }
        );
        entityResults.push({ entity: entityName, count: records.length });
      } catch (e) {
        console.error(`Backup failed for ${entityName}:`, e.message);
        entityResults.push({ entity: entityName, error: e.message });
      }
    }

    // Step 5: Update BackupSettings
    const nowIso = new Date().toISOString();
    const newHistory = [
      { timestamp: nowIso, url: spreadsheetUrl },
      ...((settings.backup_history) || [])
    ].slice(0, 10);

    await base44.asServiceRole.entities.BackupSettings.update(settings.id, {
      last_backup_date: nowIso,
      backup_history: newHistory
    });

    return Response.json({
      success: true,
      url: spreadsheetUrl,
      spreadsheetId,
      entities: entityResults
    });
  } catch (error) {
    console.error("runBackup error:", error?.message, error?.stack);
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});