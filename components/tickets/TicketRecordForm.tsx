"use client";

/**
 * Record standard for tickets and requirements: a saved record is shown in the same
 * intake form it was raised with (IT Infrastructure / ERP / Others), read-only in view
 * mode and pre-filled in edit mode. See docs/ui-standards/record-lifecycle.md.
 */
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Pencil } from "lucide-react";
import { AppButton } from "@/components/ui/AppButton";
import type { RecordMode } from "@/components/ui/record";
import { TicketFormInfra } from "./TicketFormInfra";
import { TicketFormERP } from "./TicketFormERP";
import { TicketFormOthers } from "./TicketFormOthers";

type IntakeMode = Exclude<RecordMode, "create">;
type ScopeCode = "INFRA" | "ERP" | "OTHERS" | "";

const str = (v: any) => (v === null || v === undefined ? "" : String(v));

/** "ERP/SOFTWARE" | "ERP" | "INFRA" | "OTHERS" → form code. */
export function scopeCodeOf(record: any): ScopeCode {
  const raw = String(record?.scope_type ?? record?.scope ?? "").toUpperCase();
  if (raw === "ERP/SOFTWARE" || raw === "ERP") return "ERP";
  if (raw === "INFRA") return "INFRA";
  if (raw === "OTHERS") return "OTHERS";
  return "";
}

/** Saved ticket row → the field names the intake forms use. */
export function ticketToFormData(ticket: any): Record<string, any> {
  const cf = ticket?.custom_fields || {};
  return {
    systemId: str(ticket.software_system_id),
    moduleId: str(ticket.module_id),
    submoduleId: str(ticket.sub_module_id),
    categoryId: str(ticket.category_id ?? cf.category_id),
    subcategoryId: str(ticket.sub_category_id ?? cf.subcategory_id),
    issueTypeId: str(ticket.issue_type_id ?? cf.issue_type_id),
    issueSubtypeId: str(ticket.issue_sub_type_id),
    assetId: str(ticket.asset_id),
    priorityId: str(ticket.priority_id),
    subject: str(ticket.title),
    remark: str(ticket.description),
    requirement_description: str(cf.requirement_description),
    business_reason: str(cf.business_reason),
  };
}

/** Requirement-only extra fields kept in custom_fields by the intake wizard. */
export const REQUIREMENT_EXTRA_FIELDS = [
  "requirement_domain", "target_system", "integrations", "data_privacy", "software_cost", "dev_cost",
  "target_environment", "hardware_needs", "capex_amount", "opex_amount", "budget_impact",
] as const;

/** Saved requirement row → the field names the intake forms use. */
export function requirementToFormData(req: any): Record<string, any> {
  const cf = req?.custom_fields || {};
  const nested = cf.custom_fields || {};
  const snap = req?.intake_snapshot || cf.intake_snapshot || {};
  const out: Record<string, any> = {
    systemId: str(req.software_system_id ?? snap.softwareSystem),
    moduleId: str(req.module_id ?? snap.module),
    submoduleId: str(req.sub_module_id ?? snap.submodule),
    categoryId: str(req.category_id ?? snap.category),
    subcategoryId: str(req.sub_category_id ?? snap.subCategory),
    issueTypeId: str(cf.issue_type_id ?? snap.issueTypeId),
    issueSubtypeId: str(cf.issue_sub_type_id ?? snap.issueSubtypeId),
    assetId: str(cf.asset_id ?? snap.assetId),
    priorityId: str(req.priority_id ?? snap.priority),
    subject: str(req.title),
    remark: str(req.objective ?? cf.description ?? snap.description),
    requirement_description: str(req.functional_scope || cf.requirement_details || nested.requirement_description || snap.requirementDescription),
    business_reason: str(req.requirement_reason || cf.business_reason || nested.business_reason || snap.businessReason),
  };
  for (const k of REQUIREMENT_EXTRA_FIELDS) if (cf[k] !== undefined && cf[k] !== null) out[k] = str(cf[k]);
  return out;
}

/** Generic: show / edit a record in the intake form of its scope. */
export function IntakeRecordForm({
  scopeCode,
  scope: scopeProp,
  initialData,
  version,
  canEdit,
  initialMode = "view",
  title,
  onSave,
}: {
  scopeCode: ScopeCode;
  /** Scope master row ({ id, code, name }); looked up from ticket_scopes when not given. */
  scope?: any;
  initialData: Record<string, any>;
  /** Changes when the saved record changes (e.g. updated_at), to re-seed the form. */
  version?: string;
  canEdit: boolean;
  initialMode?: IntakeMode;
  title: string;
  /** Persist the form's data. Throw to keep the form in edit mode. */
  onSave: (data: any) => Promise<void>;
}) {
  const [mode, setMode] = useState<IntakeMode>(canEdit ? initialMode : "view");
  const [scope, setScope] = useState<any>(scopeProp || null);

  useEffect(() => {
    if (scopeProp) { setScope(scopeProp); return; }
    if (!scopeCode) return;
    let cancelled = false;
    import("@/lib/actions/tickets")
      .then(({ fetchTicketScopes }) => fetchTicketScopes())
      .then((rows: any[]) => {
        if (cancelled) return;
        const row = (rows || []).find((s: any) => String(s.code || "").toUpperCase() === scopeCode);
        setScope(row || null);
      })
      .catch(() => { if (!cancelled) setScope(null); });
    return () => { cancelled = true; };
  }, [scopeProp, scopeCode]);

  if (!scopeCode || !scope?.id) return null;

  const handleSubmit = async (data: any) => {
    if (mode !== "edit") return;
    try {
      await onSave(data);
      setMode("view");
    } catch (err: any) {
      toast.error("Couldn't save: " + (err?.message || "unknown error"));
    }
  };

  const formKey = `${mode}-${version || ""}`;
  const formProps = { scope, initialData, recordMode: mode, onCancel: () => setMode("view"), onSubmit: handleSubmit };

  return (
    <section className="theme-card-structural">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-[14px] font-semibold text-heading">{title}</h2>
          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11.5px] font-medium ${mode === "view" ? "bg-sunken text-muted" : "bg-accent-soft text-accent-soft-text"}`}>
            {mode === "view" ? "As raised" : "Editing"}
          </span>
        </div>
        {mode === "view" && canEdit && (
          <AppButton variant="outline" size="sm" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setMode("edit")}>
            Edit
          </AppButton>
        )}
      </header>
      <div className="p-5">
        {scopeCode === "INFRA" && <TicketFormInfra key={formKey} {...formProps} />}
        {scopeCode === "ERP" && <TicketFormERP key={formKey} {...formProps} />}
        {scopeCode === "OTHERS" && <TicketFormOthers key={formKey} {...formProps} />}
      </div>
    </section>
  );
}

/** Ticket page: the ticket in its intake form, saved through updateTicketDetails. */
export function TicketRecordForm({
  ticket,
  scope,
  canEdit,
  initialMode = "view",
  onSaved,
}: {
  ticket: any;
  scope: any;
  canEdit: boolean;
  initialMode?: IntakeMode;
  onSaved: () => void;
}) {
  const save = async (data: any) => {
    const { updateTicketDetails } = await import("@/lib/actions/tickets");
    const res = await updateTicketDetails(ticket.id, {
      title: (data.subject || "").trim() || ticket.title,
      description: data.remark ?? "",
      priority_id: data.priorityId,
      category_id: data.categoryId ?? "",
      sub_category_id: data.subcategoryId ?? "",
      issue_type_id: data.issueTypeId ?? "",
      issue_sub_type_id: data.issueSubtypeId ?? "",
      asset_id: data.assetId ?? "",
      software_system_id: data.systemId ?? "",
      module_id: data.moduleId ?? "",
      sub_module_id: data.submoduleId ?? "",
      custom_fields: {
        ...(ticket.custom_fields || {}),
        requirement_description: data.requirement_description || null,
        business_reason: data.business_reason || null,
      },
    });
    if (!res?.success) throw new Error(res?.error || "Failed to save ticket");
    toast.success(`${ticket.code || "Ticket"} saved`);
    onSaved();
  };

  return (
    <IntakeRecordForm
      scopeCode={scopeCodeOf(ticket)}
      scope={scope}
      initialData={ticketToFormData(ticket)}
      version={ticket.updated_at}
      canEdit={canEdit}
      initialMode={initialMode}
      title="Ticket details"
      onSave={save}
    />
  );
}
