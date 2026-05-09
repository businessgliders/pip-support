import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

export function fillTemplate(text, vars) {
  if (!text) return "";
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    return vars[key] != null ? String(vars[key]) : `{{${key}}}`;
  });
}

export default function TemplatePicker({ onSelect, vars }) {
  const { data: templates = [] } = useQuery({
    queryKey: ["email-templates"],
    queryFn: () => base44.entities.EmailTemplate.filter({ is_active: true }, "name", 100),
  });

  // Group by category
  const grouped = templates.reduce((acc, t) => {
    const cat = t.category || "General";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {});

  if (templates.length === 0) {
    return (
      <Button type="button" variant="outline" size="sm" disabled className="text-gray-400">
        <FileText className="w-3.5 h-3.5 mr-1.5" />
        No templates
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="bg-white hover:bg-amber-50 border-amber-300 text-amber-700">
          <FileText className="w-3.5 h-3.5 mr-1.5" />
          Templates
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-h-[400px] overflow-y-auto w-72">
        {Object.entries(grouped).map(([cat, list], i) => (
          <React.Fragment key={cat}>
            {i > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="text-xs text-gray-500">{cat}</DropdownMenuLabel>
            {list.map(t => (
              <DropdownMenuItem
                key={t.id}
                onClick={() => onSelect({
                  subject: fillTemplate(t.subject, vars),
                  body_html: fillTemplate(t.body_html, vars),
                })}
                className="flex flex-col items-start gap-0.5 py-2 cursor-pointer"
              >
                <span className="font-medium text-sm">{t.name}</span>
                <span className="text-xs text-gray-500 truncate w-full">{fillTemplate(t.subject, vars)}</span>
              </DropdownMenuItem>
            ))}
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}