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
    { id: "tickets" as const, label: "ITSM Ticketing Fields", icon: Ticket, count: fields.filter(f => f.module === "tickets").length },
    { id: "tasks" as const, label: "Workspace Task Fields", icon: FolderKanban, count: fields.filter(f => f.module === "tasks").length },
    { id: "requirements" as const, label: "Requirement Attributes", icon: FileCheck2, count: fields.filter(f => f.module === "requirements").length },
  ];

  return (
    <div className="space-y-6 pt-4 border-t border-white/5">
      {/* Toast alert notice */}
      {successToast && (
        <div id="cf-toast-notice" className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-accent text-white px-4 py-3 shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span className="text-xs font-semibold">{successToast}</span>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-accent animate-pulse" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-300">
              Global Custom Fields Configuration Engine
            </h2>
          </div>
          <p className="text-xs text-gray-500">
            Define typed schema extension dictionaries mapped to JSONB storage layers directly in PostgreSQL backend records.
          </p>
        </div>
        <AppBadge variant="success">End-to-End JSONB Linked</AppBadge>
      </div>

      {/* Orchestrated grid rows */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side Span 4: Module selection tabs & form definition addition */}
        <div className="lg:col-span-4 space-y-6 flex flex-col">
          <AppCard className="p-4 space-y-3">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
              Target Entity Scope
            </span>

            <div className="space-y-1.5">
              {moduleTabs.map((tab) => {
                const IconComponent = tab.icon;
                const isActive = activeModule === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveModule(tab.id)}
                    className={`w-full p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer flex items-center justify-between ${
                      isActive 
                        ? "bg-white/[0.06] border-accent/40 text-white shadow-md font-bold" 
                        : "bg-white/[0.01] border-white/5 hover:border-white/10 text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div className={`p-1.5 rounded-lg ${isActive ? "bg-accent text-white" : "bg-white/5 text-gray-500"}`}>
                        <IconComponent className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-xs truncate">{tab.label}</span>
                    </div>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/5 text-gray-400 border border-white/5">
                      {tab.count} fields
                    </span>
                  </button>
                );
              })}
            </div>
          </AppCard>

          {/* New field definition append form */}
          <AppCard className="p-5 space-y-4 border-accent/20 bg-gradient-to-b from-blue-950/10 via-transparent to-transparent">
            <span className="text-xs font-semibold text-foreground block pb-2 border-b border-white/5">
              Append Schema Definition
            </span>

            <form onSubmit={handleAddField} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 block uppercase">Field Display Label</label>
                <AppInput 
                  placeholder="e.g. Server Kernel Patch ID" 
                  value={newLabel}
                  onChange={(e) => {
                    setNewLabel(e.target.value);
                    if (!newKey) {
                      setNewKey(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "_"));
                    }
                  }}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 block uppercase">Internal Mapping Key</label>
                <AppInput 
                  placeholder="e.g. kernel_patch_id" 
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  className="h-8 font-mono text-xs text-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 block uppercase">Payload Type</label>
                  <select 
                    value={newType}
                    onChange={(e: any) => setNewType(e.target.value)}
                    className="w-full h-8 px-2 rounded-lg bg-white/5 border border-white/5 text-xs text-gray-200 focus:outline-none focus:border-accent/50"
                  >
                    <option value="text" className="bg-[#0f172a]">Text String</option>
                    <option value="number" className="bg-[#0f172a]">Numeric Scalar</option>
                    <option value="select" className="bg-[#0f172a]">Dropdown Menu</option>
                    <option value="boolean" className="bg-[#0f172a]">True / False Switch</option>
                  </select>
                </div>

                <div className="space-y-1 flex flex-col justify-end">
                  <label className="flex items-center gap-2 h-8 px-2 rounded-lg bg-white/[0.02] border border-white/5 cursor-pointer select-none hover:bg-white/5">
                    <input 
                      type="checkbox" 
                      checked={newRequired}
                      onChange={(e) => setNewRequired(e.target.checked)}
                      className="rounded accent-blue-500" 
                    />
                    <span className="text-[0.8rem] font-bold text-gray-300">Mandatory</span>
                  </label>
                </div>
              </div>

              {newType === "select" && (
                <div className="space-y-1 animate-in fade-in duration-200">
                  <label className="text-xs font-bold text-gray-400 block uppercase">Dropdown Options String Array</label>
                  <AppInput 
                    placeholder="Comma-separated items..." 
                    value={newOptionsStr}
                    onChange={(e) => setNewOptionsStr(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <span className="text-[0.7rem] text-gray-500 block">Separate multiple lookup keys using standard commas.</span>
                </div>
              )}

              <AppButton variant="primary" size="sm" type="submit" className="w-full mt-2 h-8 text-xs font-bold">
                <Plus className="h-3.5 w-3.5 mr-1" />
                <span>Inject Field Mapping</span>
              </AppButton>
            </form>
          </AppCard>
        </div>

        {/* Right Side Span 8: Entity Normalized List Layout */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          <AppCard className="flex-1 flex flex-col justify-between overflow-hidden">
            <AppCardHeader className="flex flex-row items-center justify-between pb-3 border-b border-white/5">
              <div className="space-y-0.5">
                <AppCardTitle className="text-foreground">
                  Active Dictionaries: <strong className="text-accent capitalize">{activeModule}</strong>
                </AppCardTitle>
                <p className="text-[0.8rem] text-gray-400">Values ingest seamlessly via runtime custom form mutators.</p>
              </div>
              <span className="text-xs font-mono font-bold bg-white/5 px-2 py-0.5 rounded text-gray-400 border border-white/5">
                Target Schema: JSONB Map
              </span>
            </AppCardHeader>

            <div className="p-4 flex-1">
              <AppTableContainer>
                <AppTable>
                  <AppTableHeader>
                    <tr>
                      <AppTableHead>Field Descriptor Label</AppTableHead>
                      <AppTableHead>Internal JSONB Key</AppTableHead>
                      <AppTableHead>Data Type</AppTableHead>
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
                              <span className="text-xs text-gray-500 italic block truncate max-w-[180px]">
                                Ops: {fItem.options.join(", ")}
                              </span>
                            )}
                          </div>
                        </AppTableCell>
                        <AppTableCell className="font-mono text-xs text-accent font-semibold">
                          {fItem.field_key}
                        </AppTableCell>
                        <AppTableCell>
                          <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/[0.03] text-gray-300 border border-white/5 capitalize">
                            {fItem.field_type}
                          </span>
                        </AppTableCell>
                        <AppTableCell className="text-center">
                          <AppBadge variant={fItem.is_required ? "warning" : "info"}>
                            {fItem.is_required ? "Required" : "Optional"}
                          </AppBadge>
                        </AppTableCell>
                        <AppTableCell className="text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteField(fItem.id)}
                            className="p-1 rounded text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Drop field dictionary key"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </AppTableCell>
                      </AppTableRow>
                    ))}
                  </AppTableBody>
                </AppTable>
              </AppTableContainer>

              {filteredFields.length === 0 && (
                <div className="text-center py-12 text-xs text-gray-500">
                  Zero customized field definitions allocated to <strong className="text-gray-400">{activeModule}</strong> schemas.
                </div>
              )}
            </div>

            <div className="p-4 bg-white/[0.01] border-t border-white/5 space-y-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">End-to-End JSONB Data Capture Simulation</span>
              <p className="text-[0.8rem] text-gray-500 leading-snug">
                Records inside the active view render dynamic input strips matching these declared payload parameters. Storage calls append directly to PostgreSQL database tuples automatically.
              </p>
            </div>
          </AppCard>
        </div>
      </div>
    </div>
  );
}
