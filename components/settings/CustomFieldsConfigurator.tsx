"use client";

import React, { useState } from "react";
import { AppCard, AppCardHeader, AppCardTitle, AppCardContent } from "@/components/ui/AppCard";
import { AppBadge } from "@/components/ui/AppBadge";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { 
  AppTableContainer, 
  AppTable, 
  AppTableHeader, 
  AppTableBody, 
  AppTableRow, 
  AppTableHead, 
  AppTableCell 
} from "@/components/ui/AppTable";
import { 
  Layers, 
  Plus, 
  Trash2, 
  Settings, 
  CheckCircle2, 
  Database, 
  Sliders, 
  FolderKanban, 
  Ticket, 
  FileCheck2,
  Check
} from "lucide-react";

interface CustomFieldDef {
  id: string;
  module: "tickets" | "tasks" | "requirements";
  field_key: string;
  field_label: string;
  field_type: "text" | "number" | "select" | "boolean";
  is_required: boolean;
  options: string[];
}

export default function CustomFieldsConfigurator() {
  const [activeModule, setActiveModule] = useState<"tickets" | "tasks" | "requirements">("tickets");
  
  const [fields, setFields] = useState<CustomFieldDef[]>([
    { id: "cf-1", module: "tickets", field_key: "affected_env", field_label: "Affected Infrastructure Env", field_type: "select", is_required: true, options: ["Production Cluster", "Staging Pods", "Dev Sandboxes", "CI Pipeline"] },
    { id: "cf-2", module: "tickets", field_key: "root_cause_id", field_label: "External Trace Reference ID", field_type: "text", is_required: false, options: [] },
    { id: "cf-3", module: "tasks", field_key: "sprint_velocity", field_label: "Estimated Story Points", field_type: "number", is_required: true, options: [] },
    { id: "cf-4", module: "tasks", field_key: "needs_peer_review", field_label: "Requires Multi-Tier Gate", field_type: "boolean", is_required: false, options: [] },
    { id: "cf-5", module: "requirements", field_key: "regulatory_scope", field_label: "Data Sovereignty Act", field_type: "select", is_required: true, options: ["GDPR Core", "HIPAA Shield", "SOC2 Certified", "ISO-27001 System"] },
    { id: "cf-6", module: "requirements", field_key: "budget_allocation_usd", field_label: "CAPEX Budget Allowance", field_type: "number", is_required: false, options: [] }
  ]);

  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState<"text" | "number" | "select" | "boolean">("text");
  const [newRequired, setNewRequired] = useState(false);
  const [newOptionsStr, setNewOptionsStr] = useState("");
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleAddField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newLabel.trim()) return;

    // Convert spaces to snake_case automatically for internal database keys
    const formattedKey = newKey.trim().toLowerCase().replace(/\s+/g, "_");

    const newField: CustomFieldDef = {
      id: `cf-${Date.now()}`,
      module: activeModule,
      field_key: formattedKey,
      field_label: newLabel.trim(),
      field_type: newType,
      is_required: newRequired,
      options: newType === "select" ? newOptionsStr.split(",").map(s => s.trim()).filter(Boolean) : []
    };

    setFields([...fields, newField]);
    setNewKey("");
    setNewLabel("");
    setNewOptionsStr("");
    setNewRequired(false);
    triggerToast(`Custom field '${newField.field_label}' mapped to schema.`);
  };

  const handleDeleteField = (id: string) => {
    const target = fields.find(f => f.id === id);
    setFields(fields.filter(f => f.id === id));
    if (target) {
      triggerToast(`Removed schema definition field: ${target.field_label}`);
    }
  };

  const filteredFields = fields.filter(f => f.module === activeModule);

  const moduleTabs = [
    { id: "tickets" as const, label: "ITSM ticketing fields", icon: Ticket, count: fields.filter(f => f.module === "tickets").length },
    { id: "tasks" as const, label: "Workspace task fields", icon: FolderKanban, count: fields.filter(f => f.module === "tasks").length },
    { id: "requirements" as const, label: "Requirement attributes", icon: FileCheck2, count: fields.filter(f => f.module === "requirements").length },
  ];

  return (
    <div className="space-y-6 pt-4 border-t border-border">
      {/* Toast alert notice */}
      {successToast && (
        <div id="cf-toast-notice" className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-theme-btn-primary text-theme-btn-primary-text px-4 py-3  animate-in slide-in-from-bottom-5 duration-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span className="text-xs font-semibold">{successToast}</span>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-theme-icon animate-pulse" />
            <h2 className="text-sm font-semibold text-muted">
              Global custom fields configuration engine
            </h2>
          </div>
          <p className="text-xs text-muted">
            Define typed schema extension dictionaries mapped to JSONB storage layers directly in PostgreSQL backend records.
          </p>
        </div>
        <AppBadge variant="success">End-to-end JSONB linked</AppBadge>
      </div>

      {/* Orchestrated grid rows */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side Span 4: Module selection tabs & form definition addition */}
        <div className="lg:col-span-4 space-y-6 flex flex-col">
          <AppCard className="p-4 space-y-3">
            <span className="text-xs font-bold text-muted block">
              Target entity scope
            </span>

            <div className="space-y-1.5">
              {moduleTabs.map((tab) => {
                const IconComponent = tab.icon;
                const isActive = activeModule === tab.id;
                return (
                  <AppButton variant="secondary"
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveModule(tab.id)}
                    className={`w-full p-3 rounded-xl text-left transition-all duration-200 cursor-pointer flex items-center justify-between ${ isActive ? "theme-card-structural border-theme-btn-primary/40 text-white shadow-md font-bold" : "border-border hover:border-border text-muted hover:text-muted" }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div className={`p-1.5 rounded-lg ${isActive ? "bg-theme-btn-primary text-theme-btn-primary-text" : "bg-surface/5 text-muted"}`}>
                        <IconComponent className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-xs truncate">{tab.label}</span>
                    </div>
                    <span className="text-xs font-mono px-2 py-0.5 rounded theme-card-structural text-muted border-border">
                      {tab.count} fields
                    </span>
                  </AppButton>
                );
              })}
            </div>
          </AppCard>

          {/* New field definition append form */}
          <AppCard className="p-5 space-y-4 border-theme-btn-primary/20 bg-gradient-to-b from-info-soft via-transparent to-transparent">
            <span className="text-xs font-semibold text-foreground block pb-2 border-b border-border">
              Append schema definition
            </span>

            <form onSubmit={handleAddField} className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-bold text-muted block">Field display label</label>
                <AppInput 
                  placeholder="e.g. Server kernel patch ID" 
                  value={newLabel}
                  onChange={(e) => {
                    setNewLabel(e.target.value);
                    if (!newKey) {
                      setNewKey(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "_"));
                    }
                  }}
                  className="h-10 text-[14px]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-bold text-muted block">Internal mapping key</label>
                <AppInput 
                  placeholder="e.g. kernel_patch_id" 
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  className="h-10 font-mono text-[14px] text-theme-icon"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-sm font-bold text-muted block">Payload type</label>
                  <select 
                    value={newType}
                    onChange={(e: any) => setNewType(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg theme-card-structural border-border text-[14px] text-muted focus:outline-none focus:border-theme-btn-primary/50"
                  >
                    <option value="text" className="bg-background">Text string</option>
                    <option value="number" className="bg-background">Numeric scalar</option>
                    <option value="select" className="bg-background">Dropdown menu</option>
                    <option value="boolean" className="bg-background">True / false switch</option>
                  </select>
                </div>

                <div className="space-y-1 flex flex-col justify-end">
                  <label className="flex items-center gap-2 h-10 px-3 rounded-lg theme-card-structural border-border cursor-pointer select-none hover:/5">
                    <input 
                      type="checkbox" 
                      checked={newRequired}
                      onChange={(e) => setNewRequired(e.target.checked)}
                      className="rounded accent-primary" 
                    />
                    <span className="text-[0.8rem] font-bold text-muted">Mandatory</span>
                  </label>
                </div>
              </div>

              {newType === "select" && (
                <div className="space-y-1 animate-in fade-in duration-200">
                  <label className="text-sm font-bold text-muted block">Dropdown options string array</label>
                  <AppInput 
                    placeholder="Comma-separated items…" 
                    value={newOptionsStr}
                    onChange={(e) => setNewOptionsStr(e.target.value)}
                    className="h-10 text-[14px]"
                  />
                  <span className="text-[0.7rem] text-muted block">Separate multiple lookup keys using standard commas.</span>
                </div>
              )}

              <AppButton variant="primary" size="md" type="submit" className="w-full mt-2 font-bold">
                <Plus className="h-3.5 w-3.5 mr-1" />
                <span>Inject field mapping</span>
              </AppButton>
            </form>
          </AppCard>
        </div>

        {/* Right Side Span 8: Entity Normalized List Layout */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          <AppCard className="flex-1 flex flex-col justify-between overflow-hidden">
            <AppCardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border">
              <div className="space-y-0.5">
                <AppCardTitle className="text-foreground">
                  Active Dictionaries: <strong className="text-theme-icon capitalize">{activeModule}</strong>
                </AppCardTitle>
                </div>
              <span className="text-xs font-mono font-bold theme-card-structural px-2 py-0.5 rounded text-muted border-border">
                Target schema: JSONB map
              </span>
            </AppCardHeader>

            <div className="p-4 flex-1">
              <AppTableContainer>
                <AppTable>
                  <AppTableHeader>
                    <tr>
                      <AppTableHead>Field descriptor label</AppTableHead>
                      <AppTableHead>Internal JSONB key</AppTableHead>
                      <AppTableHead>Data type</AppTableHead>
                      <AppTableHead className="text-center">Constraints</AppTableHead>
                      <AppTableHead className="text-right">Mutator</AppTableHead>
                    </tr>
                  </AppTableHeader>
                  <AppTableBody>
                    {filteredFields.map((fItem) => (
                      <AppTableRow key={fItem.id}>
                        <AppTableCell>
                          <div className="space-y-0.5">
                            <span className="font-bold text-xs text-foreground block">{fItem.field_label}</span>
                            {fItem.field_type === "select" && fItem.options.length > 0 && (
                              <span className="text-xs text-muted italic block truncate max-w-[180px]">
                                Ops: {fItem.options.join(", ")}
                              </span>
                            )}
                          </div>
                        </AppTableCell>
                        <AppTableCell className="font-mono text-xs text-theme-icon font-semibold">
                          {fItem.field_key}
                        </AppTableCell>
                        <AppTableCell>
                          <span className="text-xs font-mono px-2 py-0.5 rounded theme-card-structural text-muted border-border capitalize">
                            {fItem.field_type}
                          </span>
                        </AppTableCell>
                        <AppTableCell className="text-center">
                          <AppBadge variant={fItem.is_required ? "warning" : "info"}>
                            {fItem.is_required ? "Required" : "Optional"}
                          </AppBadge>
                        </AppTableCell>
                        <AppTableCell className="text-right">
                          <AppButton aria-label="Drop field dictionary key" variant="secondary"
                            type="button"
                            onClick={() => handleDeleteField(fItem.id)}
                            className="p-1 rounded text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                            title="Drop field dictionary key"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </AppButton>
                        </AppTableCell>
                      </AppTableRow>
                    ))}
                  </AppTableBody>
                </AppTable>
              </AppTableContainer>

              {filteredFields.length === 0 && (
                <div className="text-center py-12 text-xs text-muted">
                  Zero customized field definitions allocated to <strong className="text-muted">{activeModule}</strong> schemas.
                </div>
              )}
            </div>

            <div className="p-4 theme-card-structural border-t border-border space-y-2">
              <span className="text-xs font-bold text-muted block">End-to-end JSONB data capture simulation</span>
              <p className="text-[0.8rem] text-muted leading-snug">
                Records inside the active view render dynamic input strips matching these declared payload parameters. Storage calls append directly to PostgreSQL database tuples automatically.
              </p>
            </div>
          </AppCard>
        </div>
      </div>
    </div>
  );
}
