import React from "react";

export default function PublicFormField({ field, value, onChange, accent }) {
  const { label, type, required, options = [] } = field;
  const base =
    "w-full rounded-xl border border-pink-200 bg-white px-3.5 py-2.5 text-sm text-pink-900 focus:outline-none focus:ring-2";
  const ringStyle = { "--tw-ring-color": accent };

  const labelEl = (
    <label className="block text-sm font-semibold mb-1.5" style={{ color: accent }}>
      {label} {required && <span className="text-red-500">*</span>}
    </label>
  );

  if (type === "textarea") {
    return (<div>{labelEl}<textarea value={value || ""} onChange={(e) => onChange(e.target.value)} required={required} className={`${base} h-24`} style={ringStyle} /></div>);
  }

  if (type === "select") {
    return (
      <div>{labelEl}
        <select value={value || ""} onChange={(e) => onChange(e.target.value)} required={required} className={base} style={ringStyle}>
          <option value="" disabled>Choose…</option>
          {options.map((o, i) => <option key={i} value={o}>{o}</option>)}
        </select>
      </div>
    );
  }

  if (type === "checkbox") {
    const selected = Array.isArray(value) ? value : [];
    const toggle = (o) => onChange(selected.includes(o) ? selected.filter((x) => x !== o) : [...selected, o]);
    const opts = options.length ? options : ["Yes"];
    return (
      <div>{labelEl}
        <div className="space-y-2">
          {opts.map((o, i) => (
            <label key={i} className="flex items-center gap-2.5 text-sm text-pink-900 cursor-pointer">
              <input type="checkbox" checked={selected.includes(o)} onChange={() => toggle(o)} className="w-4 h-4 rounded" style={{ accentColor: accent }} />
              {o}
            </label>
          ))}
        </div>
      </div>
    );
  }

  const inputType = type === "email" ? "email" : type === "phone" ? "tel" : type === "number" ? "number" : type === "date" ? "date" : type === "time" ? "time" : "text";
  return (<div>{labelEl}<input type={inputType} value={value || ""} onChange={(e) => onChange(e.target.value)} required={required} className={base} style={ringStyle} /></div>);
}