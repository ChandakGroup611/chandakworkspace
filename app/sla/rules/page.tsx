"use client";

import React, { useState, useEffect } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { AppBadge } from "@/components/ui/AppBadge";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { fetchSLARules, saveSLARule, deleteSLARule } from "@/lib/actions/sla";
import { toast } from "react-toastify";
import { Loader2, Plus, Save, Trash2, ShieldAlert, Clock, Play, Shield, Eye, Pencil } from "lucide-react";
import { RecordModeProvider, RecordFieldset, useFlashHighlight } from "@/components/ui/record";
import ChandakLoader from "@/components/ui/ChandakLoader";
import { usePermissions } from "@/hooks/usePermissions";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/feedback/States";

export default function SLARuleBuilder() {
  const { hasPermission, roleCode, loading: permsLoading } = usePermissions();
  const isSuperAdmin = roleCode === "SUPER_ADMIN";
  const canView = isSuperAdmin || hasPermission("SLA_VIEW");
  const canCreate = isSuperAdmin || hasPermission("SLA_CREATE") || hasPermission("SLA_MANAGE");
  const canUpdate = isSuperAdmin || hasPermission("SLA_UPDATE") || hasPermission("SLA_MANAGE");
  const canDelete = isSuperAdmin || hasPermission("SLA_DELETE") || hasPermission("SLA_MANAGE");

  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  // Record standard: an open card is either viewed (read-only) or edited, in the same form.
  const [cardMode, setCardMode] = useState<"view" | "edit">("edit");
  const [highlightId, flashHighlight] = useFlashHighlight();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    id: "",
    code: "",
    name: "",
    response_target_minutes: 60,
    resolution_target_minutes: 240,
    working_hours_code: "24x7",
    escalation_level: "STANDARD"
  });

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    setLoading(true);
    try {
      const data = await fetchSLARules();
      setRules(data);
    } catch (err) {
      toast.error("Couldn't load SLA rules. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (rule: any) => {
    if (!canUpdate) {
      toast.error("You do not have permission to edit SLA rules.");
      return;
    }
    setEditingId(rule.id);
    setCardMode("edit");
    setForm({
      id: rule.id,
      code: rule.code,
      name: rule.name,
      response_target_minutes: rule.response_target_minutes,
      resolution_target_minutes: rule.resolution_target_minutes,
      working_hours_code: rule.working_hours_code,
      escalation_level: rule.escalation_level
    });
  };

  const handleView = (rule: any) => {
    setEditingId(rule.id);
    setCardMode("view");
    setForm({
      id: rule.id,
      code: rule.code,
      name: rule.name,
      response_target_minutes: rule.response_target_minutes,
      resolution_target_minutes: rule.resolution_target_minutes,
      working_hours_code: rule.working_hours_code,
      escalation_level: rule.escalation_level
    });
  };

  const handleCreateNew = () => {
    if (!canCreate) {
      toast.error("You do not have permission to create SLA rules.");
      return;
    }
    setEditingId("new");
    setCardMode("edit");
    setForm({
      id: "",
      code: "NEW_RULE_" + Date.now().toString().slice(-4),
      name: "",
      response_target_minutes: 60,
      resolution_target_minutes: 240,
      working_hours_code: "24x7",
      escalation_level: "STANDARD"
    });
  };

  const handleSave = async () => {
    if (!form.id && !canCreate) {
      toast.error("You do not have permission to create SLA rules.");
      return;
    }
    if (form.id && !canUpdate) {
      toast.error("You do not have permission to update SLA rules.");
      return;
    }
    if (!form.name || !form.code) {
      toast.error("Add a name and a code.");
      return;
    }
    setSaving(true);
    try {
      await saveSLARule(form);
      toast.success("SLA rule saved");
      setEditingId(null);
      await loadRules();
      // Record standard: highlight the rule just created / changed in the list.
      flashHighlight(form.id || form.code);
    } catch (err: any) {
      toast.error(err.message || "Couldn't save the SLA rule.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    if (!canDelete) {
      toast.error("You do not have permission to delete SLA rules.");
      return;
    }
    setDeleteConfirmId(id);
  };

  const executeDelete = async (id: string) => {
    try {
      await deleteSLARule(id);
      toast.success("SLA rule deleted");
      await loadRules();
    } catch (err: any) {
      toast.error(err.message || "Couldn't delete the SLA rule.");
    }
  };

  const fmtMinutes = (m: number) => {
    if (!m && m !== 0) return "—";
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60), r = m % 60;
    return r ? `${h} h ${r} min` : `${h} h`;
  };
  const HOURS_LABEL: Record<string, string> = { "24x7": "24×7", "9x5": "Business hours (9×5)" };
  const ESC_LABEL: Record<string, string> = { STANDARD: "Standard", PRIORITY: "Priority", URGENT: "Urgent" };
  const SELECT = "h-9 w-full rounded-md border border-border bg-surface px-3 text-[13.5px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring";
  const LABEL = "mb-1.5 block text-[13px] font-medium text-subtle";

  const renderForm = (isNew: boolean) => {
    const mode = isNew ? "create" : cardMode;
    return (
    <RecordModeProvider mode={mode}>
    <div className="space-y-4 p-5">
      <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
        <h3 className="text-[15px] font-semibold text-heading">{isNew ? "New SLA rule" : mode === "view" ? form.name || "SLA rule" : "Edit SLA rule"}</h3>
        <div className="flex gap-2">
          {mode === "view" ? (
            <>
              <AppButton size="sm" variant="ghost" onClick={() => setEditingId(null)}>Close</AppButton>
              {canUpdate && <AppButton size="sm" variant="primary" onClick={() => setCardMode("edit")} leftIcon={<Pencil className="w-4 h-4" />}>Edit</AppButton>}
            </>
          ) : (
            <>
              <AppButton size="sm" variant="ghost" onClick={() => (isNew ? setEditingId(null) : setCardMode("view"))}>Cancel</AppButton>
              <AppButton size="sm" variant="primary" onClick={handleSave} disabled={saving} isLoading={saving} leftIcon={<Save className="w-4 h-4"/>}>{isNew ? "Create rule" : "Save"}</AppButton>
            </>
          )}
        </div>
      </div>
      <RecordFieldset>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="sla-name" className={LABEL}>Name</label>
          <AppInput id="sla-name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder={isNew ? "For example, Critical outage" : "For example, High-priority issues"} />
        </div>
        <div>
          <label htmlFor="sla-code" className={LABEL}>Code</label>
          {isNew ? (
            <AppInput id="sla-code" value={form.code} onChange={e => setForm({...form, code: e.target.value.toUpperCase().replace(/\s+/g, '_')})} className="font-mono" />
          ) : (
            <AppInput id="sla-code" value={form.code} onChange={e => setForm({...form, code: e.target.value})} className="font-mono" />
          )}
        </div>
        <div>
          <label htmlFor="sla-resp" className={LABEL}>First response within (minutes)</label>
          <AppInput id="sla-resp" type="number" value={form.response_target_minutes} onChange={e => setForm({...form, response_target_minutes: parseInt(e.target.value) || 0})} />
        </div>
        <div>
          <label htmlFor="sla-res" className={LABEL}>Resolve within (minutes)</label>
          <AppInput id="sla-res" type="number" value={form.resolution_target_minutes} onChange={e => setForm({...form, resolution_target_minutes: parseInt(e.target.value) || 0})} />
        </div>
        <div>
          <label htmlFor="sla-hours" className={LABEL}>Working hours</label>
          <select id="sla-hours" className={SELECT} value={form.working_hours_code} onChange={e => setForm({...form, working_hours_code: e.target.value})}>
            <option value="24x7">24×7 (always running)</option>
            <option value="9x5">Business hours (9×5)</option>
          </select>
        </div>
        <div>
          <label htmlFor="sla-esc" className={LABEL}>Escalation</label>
          <select id="sla-esc" className={SELECT} value={form.escalation_level} onChange={e => setForm({...form, escalation_level: e.target.value})}>
            <option value="STANDARD">Standard</option>
            <option value="PRIORITY">Priority</option>
            <option value="URGENT">Urgent (leadership)</option>
          </select>
        </div>
      </div>
      </RecordFieldset>
    </div>
    </RecordModeProvider>
    );
  };

  if (loading || permsLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <ChandakLoader size="lg" title="Loading SLA rules…" />
      </div>
    );
  }

  if (!canView) {
    return (
      <PageContainer strict={true}>
        <EmptyState
          kind="error"
          title="You don't have access to SLA rules"
          description="Ask an administrator for SLA view access."
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer strict={true}>
      <PageHeader
        title="SLA rules"
        description="Response and resolution targets that are applied to tickets and tasks."
        breadcrumbs={[{ label: "SLA tracking", href: "/sla" }, { label: "Rules" }]}
        actions={
          canCreate ? (
            <AppButton variant="primary" onClick={handleCreateNew} leftIcon={<Plus className="w-4 h-4" />} disabled={editingId === "new"}>
              New rule
            </AppButton>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {editingId === "new" && (
            <AppCard className="border-border-active p-0">
              {renderForm(true)}
            </AppCard>
          )}

          {rules.length === 0 && editingId !== "new" && (
            <AppCard className="p-0">
              <EmptyState
                title="No SLA rules yet"
                description="Create a rule to start tracking response and resolution times."
                action={canCreate ? <AppButton variant="primary" size="sm" onClick={handleCreateNew} leftIcon={<Plus className="w-4 h-4" />}>New rule</AppButton> : undefined}
              />
            </AppCard>
          )}

          {rules.map(rule => (
            <AppCard key={rule.id} data-record-id={rule.id} data-highlight={highlightId === rule.id || highlightId === rule.code || undefined} className={`p-0 ${editingId === rule.id ? 'border-border-active' : ''}`}>
              {editingId === rule.id ? renderForm(false) : (
                <div
                  className="flex cursor-pointer flex-col items-start justify-between gap-4 p-4 sm:flex-row sm:items-center"
                  onClick={() => handleView(rule)}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[14.5px] font-semibold text-heading">{rule.name}</h3>
                      <AppBadge variant="neutral">{HOURS_LABEL[rule.working_hours_code] || rule.working_hours_code}</AppBadge>
                      {rule.escalation_level && rule.escalation_level !== "STANDARD" && (
                        <AppBadge variant={rule.escalation_level === "URGENT" ? "danger" : "warning"}>{ESC_LABEL[rule.escalation_level] || rule.escalation_level}</AppBadge>
                      )}
                    </div>
                    <div className="mt-0.5 font-mono text-[12px] text-muted">{rule.code}</div>

                    <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[13px]">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-muted" aria-hidden />
                        <dt className="text-muted">First response</dt>
                        <dd className="font-medium tabular-nums text-foreground">{fmtMinutes(rule.response_target_minutes)}</dd>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Play className="w-4 h-4 text-muted" aria-hidden />
                        <dt className="text-muted">Resolve</dt>
                        <dd className="font-medium tabular-nums text-foreground">{fmtMinutes(rule.resolution_target_minutes)}</dd>
                      </div>
                    </dl>
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <AppButton aria-label={`View ${rule.name}`} title="View" size="icon-sm" variant="ghost" className="text-muted hover:text-foreground" onClick={() => handleView(rule)}>
                      <Eye className="w-4 h-4" />
                    </AppButton>
                    {canUpdate && (
                      <AppButton aria-label={`Edit ${rule.name}`} title="Edit" size="icon-sm" variant="ghost" className="text-muted hover:text-foreground" onClick={() => handleEdit(rule)}>
                        <Pencil className="w-4 h-4" />
                      </AppButton>
                    )}
                    {canDelete && (
                      <AppButton aria-label={`Delete ${rule.name}`} title="Delete" size="icon-sm" variant="ghost" className="text-muted hover:bg-danger-soft hover:text-danger-text" onClick={() => handleDelete(rule.id)}>
                        <Trash2 className="w-4 h-4" />
                      </AppButton>
                    )}
                  </div>
                </div>
              )}
            </AppCard>
          ))}
        </div>

        <div className="space-y-5">
          <AppCard className="p-0">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-[14px] font-semibold text-heading">How SLA rules work</h2>
            </div>
            <div className="space-y-3 p-4 text-[13px] leading-relaxed text-subtle">
              <p>Rules are attached to tickets and tasks automatically, based on their priority.</p>
              <div className="rounded-md border border-info-border bg-info-soft p-3 text-info-text">
                <span className="font-medium">Example</span>
                <p className="mt-1">An urgent ticket gets the critical outage rule, so it must get a first response and be resolved within that rule&apos;s targets.</p>
              </div>
              <p>When a target is missed, the record is escalated and the right people are notified.</p>
            </div>
          </AppCard>
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={async () => {
          if (!deleteConfirmId) return;
          const id = deleteConfirmId;
          setDeleteConfirmId(null);
          await executeDelete(id);
        }}
        title={`Delete ${rules.find((r) => r.id === deleteConfirmId)?.name || "this SLA rule"}?`}
        description="Open records that use this rule will stop being tracked against it. This can't be undone."
        confirmLabel="Delete"
        tone="danger"
      />
    </PageContainer>
  );
}
