"use client";

import React, { useEffect, useState } from "react";
import { Check, ShieldCheck } from "lucide-react";
import { toast } from "react-toastify";
import {
  fetchDmsShareSettingsAction,
  saveDmsShareSettingsAction,
  type DmsShareSettings,
} from "@/lib/actions/dms-groups";

const DEFAULT_DMS_SHARE_SETTINGS: DmsShareSettings = {
  folder: { userWise: true, groupWise: true, departmentWise: true },
  document: { userWise: true, groupWise: true, departmentWise: true },
  inheritByDefault: true,
  allowDocumentRestriction: true,
};

export function DmsShareSettingsView() {
  const [settings, setSettings] = useState<DmsShareSettings>(DEFAULT_DMS_SHARE_SETTINGS);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    fetchDmsShareSettingsAction().then((res) => {
      setLoading(false);
      if (!res.success) {
        setError(res.error || "Could not load share settings.");
        return;
      }
      if (res.settings) setSettings(res.settings);
      setCanManage(!!res.canManage);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await saveDmsShareSettingsAction(settings);
    setSaving(false);
    if (!res.success) return toast.error(res.error || "Could not save share settings.");
    if (res.settings) setSettings(res.settings);
    toast.success("DMS Share Settings saved.");
  };

  if (loading) {
    return <p className="py-8 text-center text-xs text-muted-foreground">Loading share settings…</p>;
  }

  return (
    <form onSubmit={handleSave} className="space-y-4 text-xs">
      {error && (
        <p className="p-2.5 rounded-lg border border-danger-border bg-danger-soft text-danger-text">{error}</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Folder Sharing Methods */}
        <div className="rounded-lg border border-border bg-sunken/40 p-4 space-y-3">
          <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>Folder Sharing Methods</span>
          </div>
          <div className="space-y-2.5">
            {(
              [
                ["userWise", "User-Wise Sharing", "Allow sharing folders with individual workspace users."],
                ["groupWise", "Group-Wise Sharing", "Allow sharing folders with DMS groups."],
                ["departmentWise", "Department-Wise Sharing", "Allow sharing folders with company departments."],
              ] as const
            ).map(([key, label, hint]) => (
              <label key={key} className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border bg-surface cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!canManage}
                  checked={settings.folder[key]}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      folder: { ...prev.folder, [key]: e.target.checked },
                    }))
                  }
                  className="mt-0.5"
                />
                <span>
                  <span className="font-semibold text-foreground block">{label}</span>
                  <span className="text-[11px] text-muted-foreground">{hint}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Document Sharing Methods */}
        <div className="rounded-lg border border-border bg-sunken/40 p-4 space-y-3">
          <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>Document Sharing Methods</span>
          </div>
          <div className="space-y-2.5">
            {(
              [
                ["userWise", "User-Wise Sharing", "Allow assigning individual users on document RBAC."],
                ["groupWise", "Group-Wise Sharing", "Allow assigning DMS groups on document RBAC."],
                ["departmentWise", "Department-Wise Sharing", "Allow assigning departments on document RBAC."],
              ] as const
            ).map(([key, label, hint]) => (
              <label key={key} className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border bg-surface cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!canManage}
                  checked={settings.document[key]}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      document: { ...prev.document, [key]: e.target.checked },
                    }))
                  }
                  className="mt-0.5"
                />
                <span>
                  <span className="font-semibold text-foreground block">{label}</span>
                  <span className="text-[11px] text-muted-foreground">{hint}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Inheritance & Restriction Policy */}
      <div className="rounded-lg border border-border bg-sunken/40 p-4 space-y-2.5">
        <div className="font-semibold text-sm text-foreground">Inheritance &amp; Document Restrictions</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border bg-surface cursor-pointer">
            <input
              type="checkbox"
              disabled={!canManage}
              checked={settings.inheritByDefault}
              onChange={(e) => setSettings((prev) => ({ ...prev, inheritByDefault: e.target.checked }))}
              className="mt-0.5"
            />
            <span>
              <span className="font-semibold text-foreground block">Inherit folder permissions by default</span>
              <span className="text-[11px] text-muted-foreground">New subfolders and documents inherit parent folder access unless overridden.</span>
            </span>
          </label>
          <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border bg-surface cursor-pointer">
            <input
              type="checkbox"
              disabled={!canManage}
              checked={settings.allowDocumentRestriction}
              onChange={(e) => setSettings((prev) => ({ ...prev, allowDocumentRestriction: e.target.checked }))}
              className="mt-0.5"
            />
            <span>
              <span className="font-semibold text-foreground block">Allow document-level restrictions</span>
              <span className="text-[11px] text-muted-foreground">Authorized users can narrow access on individual documents below folder access.</span>
            </span>
          </label>
        </div>
      </div>

      {canManage && (
        <div className="flex justify-end pt-2 border-t border-border">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-50 cursor-pointer"
          >
            <Check className="h-3.5 w-3.5" />
            <span>{saving ? "Saving…" : "Save Share Settings"}</span>
          </button>
        </div>
      )}
    </form>
  );
}
