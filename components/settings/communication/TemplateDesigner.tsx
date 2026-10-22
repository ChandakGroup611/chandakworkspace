"use client";

/* ui-audit-allow emoji: sample email subjects and bodies, not app UI */
import React, { useState, useEffect } from "react";
import { AppTable } from "@/components/ui/AppTable";
import { AppButton } from '@/components/ui/AppButton';
import DOMPurify from 'dompurify';
import { Save, Loader2, Play, Plus, Trash2, Code2, Eye, LayoutTemplate, ArrowLeft, Edit2 } from "lucide-react";
import { saveSettingsEntity, deleteSettingsEntity, getTemplates, saveTemplateAndRules } from "@/lib/actions/settings";
import { previewEmailTemplate } from "@/lib/actions/email-config";
import { confirmAction } from "@/components/ui/feedback/confirm";

const RECIPIENT_OPTIONS = [
  "Creator",
  "Assigned User",
  "Assigned Driver",
  "Fleet Manager / Admin",
  "Vehicle Owner",
  "Executors",
  "Watchers",
  "Workspace Owner",
  "Department Admin",
  "Specific Approver",
  "Requester"
];

export const VEHICLE_RECIPIENT_OPTIONS = [
  "Assigned Driver",
  "Fleet Manager / Admin",
  "Vehicle Owner",
  "Creator",
  "Department Admin"
];

const MODULES = [
  "Task", 
  "Workspace", 
  "Ticket", 
  "Requirement", 
  "Approval",
  "Vehicle (FleetDesk)",
  "AMC (Contracts)",
  "SLA Management",
  "IAM (Users/Roles)",
  "Knowledge Base",
  "Learning (Courses)",
  "System/Compliance",
  "Masters (Vendors/Companies)"
];

export const VEHICLE_EVENTS = [
  "Insurance Expiring Soon (30 Days)",
  "Insurance Expiring Urgent (7 Days)",
  "Insurance Expired",
  "RC Expiring Soon (30 Days)",
  "RC Expired",
  "PUC Expiring Soon (30 Days)",
  "PUC Expired",
  "Fitness Certificate Expiring Soon",
  "Fitness Certificate Expired",
  "Driver License Expiring Soon",
  "Driver License Expired",
  "Vehicle Service Due",
  "Vehicle Service Overdue",
  "Vehicle Registered",
  "Vehicle Driver Assigned",
  "Created", 
  "Updated", 
  "Deleted/Archived",
  "Comment Added"
];

const EVENTS = [
  // Vehicle & Fleet Expiry Events (Statutory Compliance)
  ...VEHICLE_EVENTS,

  // General Lifecycle
  "Created", 
  "Updated", 
  "Deleted/Archived",
  "Transferred",
  
  // Assignment & Team
  "Assigned (Primary)", 
  "Reassigned",
  "Executors Changed",
  "Watchers Changed",
  
  // Status & Progress
  "Status Changed", 
  "Priority Changed",
  "Due Date Changed",
  "Delayed", 
  "Completed", 
  "Closed",
  "Reopened",
  
  // Collaboration
  "Comment Added",
  "Attachment Added",
  "Mentioned",
  "Checklist Updated",
  
  // Approvals & Governance
  "Approval Requested",
  "Approved",
  "Rejected",
  "Amended",
  
  // SLA Specific
  "SLA Warning",
  "SLA Breached",
  
  // AMC Specific
  "Payment Received",
  "Payment Overdue",
  "Contract Expiring",
  "Contract Renewed",
  
  // IAM / Identity Specific
  "User Onboarded",
  "Role Changed",
  "Password Reset Requested",
  
  // Learning / Knowledge
  "Course Assigned",
  "Course Completed",
  "Article Published"
];

export const VEHICLE_MERGE_TAGS = [
  "{{registration_number}}",
  "{{vehicle_name}}",
  "{{doc_type}}",
  "{{expiry_date}}",
  "{{days_remaining}}",
  "{{insurance_vendor}}",
  "{{insurance_policy_number}}",
  "{{puc_certificate_number}}",
  "{{driver_name}}",
  "{{driver_phone}}",
  "{{rto_office}}",
  "{{odometer_km}}",
  "{{service_type}}",
  "{{service_due_date}}",
  "{{creator_name}}",
  "{{remarks}}",
  "{{link}}"
];

export const WORKSPACE_MERGE_TAGS = [
  "{{workspace_name}}",
  "{{workspace_code}}",
  "{{description}}",
  "{{status}}",
  "{{company_name}}",
  "{{start_date}}",
  "{{end_date}}",
  "{{due_date}}",
  "{{workspace_owner}}",
  "{{owner_name}}",
  "{{assigned_user}}",
  "{{creator_name}}",
  "{{parent_workspace}}",
  "{{parent_workspace_name}}",
  "{{type}}",
  "{{role}}",
  "{{priority}}",
  "{{remarks}}",
  "{{recipient_name}}",
  "{{link}}"
];

export const TASK_MERGE_TAGS = [
  "{{task_name}}",
  "{{task_code}}",
  "{{ticket_no}}",
  "{{description}}",
  "{{status}}",
  "{{priority}}",
  "{{start_date}}",
  "{{due_date}}",
  "{{end_date}}",
  "{{assigned_user}}",
  "{{creator_name}}",
  "{{workspace_name}}",
  "{{workspace_code}}",
  "{{task_type}}",
  "{{parent_task_name}}",
  "{{remarks}}",
  "{{recipient_name}}",
  "{{link}}"
];

export const TICKET_MERGE_TAGS = [
  "{{ticket_no}}",
  "{{ticket_title}}",
  "{{description}}",
  "{{status}}",
  "{{priority}}",
  "{{category}}",
  "{{subcategory}}",
  "{{assigned_user}}",
  "{{creator_name}}",
  "{{remarks}}",
  "{{recipient_name}}",
  "{{link}}"
];

export const REQUIREMENT_MERGE_TAGS = [
  "{{req_code}}",
  "{{req_name}}",
  "{{description}}",
  "{{status}}",
  "{{approval_status}}",
  "{{assigned_user}}",
  "{{creator_name}}",
  "{{due_date}}",
  "{{remarks}}",
  "{{recipient_name}}",
  "{{link}}"
];

const MERGE_TAGS = [
  "{{ticket_no}}",
  "{{ticket_title}}",
  "{{task_name}}",
  "{{workspace_name}}",
  "{{workspace_code}}",
  "{{description}}",
  "{{company_name}}",
  "{{req_code}}",
  "{{req_name}}",
  "{{assigned_user}}",
  "{{creator_name}}",
  "{{workspace_owner}}",
  "{{status}}",
  "{{priority}}",
  "{{due_date}}",
  "{{role}}",
  "{{remarks}}",
  "{{link}}",
  ...VEHICLE_MERGE_TAGS
];

export function getAvailableMergeTags(moduleName?: string): string[] {
  if (moduleName === "Vehicle" || moduleName === "Vehicle (FleetDesk)") {
    return VEHICLE_MERGE_TAGS;
  }
  if (moduleName === "Workspace") {
    return WORKSPACE_MERGE_TAGS;
  }
  if (moduleName === "Task") {
    return TASK_MERGE_TAGS;
  }
  if (moduleName === "Ticket") {
    return TICKET_MERGE_TAGS;
  }
  if (moduleName === "Requirement" || moduleName === "Approval") {
    return REQUIREMENT_MERGE_TAGS;
  }
  return MERGE_TAGS;
}

interface TemplateDesignerProps {
  initialModule?: string;
}

export default function TemplateDesigner({ initialModule }: TemplateDesignerProps = {}) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<{type: "success" | "error", text: string} | null>(null);
  const [moduleFilter, setModuleFilter] = useState<string>(() => initialModule || "ALL");
  
  // New Master-Detail state
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Record<string, "code" | "preview">>({});
  const [previewContent, setPreviewContent] = useState<Record<string, string>>({});

  const triggerToast = (text: string, type: "success" | "error" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3000);
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await getTemplates();
      if (!res.success) throw new Error(res.error);
      setTemplates(res.data || []);
      
      const tabs: any = {};
      (res.data || []).forEach((t: any) => tabs[t.id] = "code");
      setActiveTab(tabs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTemplate = () => {
    const newId = "temp_" + Date.now();
    const isVeh = moduleFilter === "Vehicle (FleetDesk)" || initialModule === "Vehicle (FleetDesk)";
    const isWs = moduleFilter === "Workspace";

    const workspaceStarter = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
  <h2 style="color: #1e293b; margin-top: 0; margin-bottom: 16px; font-size: 20px; font-weight: 700;">Workspace Notification</h2>
  <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 16px 20px; margin: 20px 0; border-radius: 4px;">
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">Workspace:</strong> {{workspace_name}} ({{workspace_code}})</p>
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">Status:</strong> {{status}}</p>
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">Company:</strong> {{company_name}}</p>
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">Owner:</strong> {{workspace_owner}}</p>
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">Description:</strong> {{description}}</p>
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">Target Date:</strong> {{due_date}}</p>
  </div>
  <div style="margin-top: 24px;">
    <a href="{{link}}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">Open Workspace</a>
  </div>
</div>`;

    const vehicleStarter = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
  <div style="border-bottom: 2px solid #ef4444; padding-bottom: 12px; margin-bottom: 16px;">
    <h2 style="color: #0f172a; margin: 0; font-size: 18px; font-weight: 700;">⚠️ Vehicle Statutory Expiry Alert</h2>
    <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">Automated Fleet Compliance Expiry Notice</p>
  </div>
  <p style="font-size: 14px; color: #334155; margin-bottom: 16px;">
    This is an automated compliance alert regarding vehicle <strong>{{registration_number}}</strong> ({{vehicle_name}}).
  </p>
  <div style="background-color: #f8fafc; border-left: 4px solid #ef4444; padding: 16px 20px; margin: 16px 0; border-radius: 4px;">
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">Document / Item:</strong> {{doc_type}}</p>
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">Expiry Date:</strong> {{expiry_date}} ({{days_remaining}})</p>
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">Assigned Chauffeur:</strong> {{driver_name}} ({{driver_phone}})</p>
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">RTO Passing Authority:</strong> {{rto_office}}</p>
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">Insurance Vendor:</strong> {{insurance_vendor}} (Policy #{{insurance_policy_number}})</p>
  </div>
  <div style="margin-top: 24px;">
    <a href="{{link}}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">Open Fleet Desk & Renew</a>
  </div>
</div>`;

    const standardStarter = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
  <h2 style="color: #1e293b; margin-top: 0; margin-bottom: 16px; font-size: 20px; font-weight: 700;">Task Updated</h2>
  <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 16px 20px; margin: 20px 0; border-radius: 4px;">
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">Task:</strong> {{task_name}}</p>
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">Status:</strong> {{status}}</p>
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">Updated By:</strong> {{creator_name}}</p>
  </div>
  <div style="margin-top: 24px;">
    <a href="{{link}}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">View Task</a>
  </div>
</div>`;

    let initialHtml = standardStarter;
    let initialSubject = "Task Updated: {{task_name}}";
    let initialName = "Task Updated";
    let initialRecipients = ["Assigned User", "Creator"];

    if (isVeh) {
      initialHtml = vehicleStarter;
      initialSubject = "⚠️ Expiry Warning: {{doc_type}} for {{registration_number}} ({{days_remaining}})";
      initialName = "Vehicle Expiry Notice";
      initialRecipients = ["Assigned Driver", "Fleet Manager / Admin"];
    } else if (isWs) {
      initialHtml = workspaceStarter;
      initialSubject = "Workspace Alert: {{workspace_name}}";
      initialName = "Workspace Updated";
      initialRecipients = ["Workspace Owner", "Creator", "Assigned User"];
    }

    setTemplates(prev => [
      {
        id: newId,
        module: isVeh ? "Vehicle (FleetDesk)" : (moduleFilter !== "ALL" ? moduleFilter : "Task"),
        event: isVeh ? "Insurance Expiring Soon (30 Days)" : (isWs ? "Updated" : "Updated"),
        template_name: initialName,
        subject: initialSubject,
        html_body: initialHtml,
        is_active: true,
        is_new: true,
        recipient_types: initialRecipients
      },
      ...prev
    ]);
    setActiveTab(prevTab => ({ ...prevTab, [newId]: "code" }));
    setEditingTemplateId(newId); // Instantly open editor
  };

  const updateLocal = (id: string, field: string, value: any) => {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handleSave = async (template: any) => {
    try {
      const payload = {
        module: template.module,
        event: template.event,
        template_name: template.template_name,
        subject: template.subject,
        html_body: template.html_body,
        is_active: template.is_active,
        recipient_types: template.recipient_types || []
      };

      if (template.is_new) {
        const res = await saveTemplateAndRules(payload);
        if (!res.success) throw new Error(res.error);
        triggerToast("Template created successfully");
      } else {
        const res = await saveTemplateAndRules(payload, template.id);
        if (!res.success) throw new Error(res.error);
        triggerToast("Template updated successfully");
      }
      
      // Go back to list upon successful save
      setEditingTemplateId(null);
      await fetchTemplates();
    } catch (err: any) {
      triggerToast(err.message || "Failed to save template", "error");
    }
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    if (id.startsWith("temp_")) {
      setTemplates(prev => prev.filter(t => t.id !== id));
      if (editingTemplateId === id) setEditingTemplateId(null);
      return;
    }
    if (!(await confirmAction("Delete this template?"))) return;
    try {
      const res = await deleteSettingsEntity("email_templates", id, true, "/settings/communication/templates");
      if (!res.success) throw new Error(res.error);
      triggerToast("Template deleted");
      if (editingTemplateId === id) setEditingTemplateId(null);
      fetchTemplates();
    } catch (err: any) {
      triggerToast(err.message, "error");
    }
  };

  const handleTabSwitch = async (id: string, tab: "code" | "preview") => {
    setActiveTab(p => ({ ...p, [id]: tab }));
    if (tab === "preview") {
      const tpl = templates.find(t => t.id === id);
      if (tpl) {
        setPreviewContent(p => ({ ...p, [id]: "Loading preview with real data..." }));
        try {
          const html = await previewEmailTemplate(tpl.module, tpl.html_body);
          setPreviewContent(p => ({ ...p, [id]: html }));
        } catch (e) {
          setPreviewContent(p => ({ ...p, [id]: "Failed to render preview." }));
        }
      }
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-accent-soft-text" /></div>;

  // Active Template for Editor View
  const tpl = editingTemplateId ? templates.find(t => t.id === editingTemplateId) : null;
  const isLockedToModule = Boolean(initialModule);
  const isVeh = moduleFilter === "Vehicle (FleetDesk)" || initialModule === "Vehicle (FleetDesk)";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Dynamic Header */}
      <div className="flex justify-between items-center bg-background border border-border p-4 rounded-lg shadow-xs">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {editingTemplateId 
              ? (isVeh ? "Edit Vehicle Notification Template" : "Edit Template") 
              : (isVeh ? "Vehicle Notification & Expiry Templates" : "Dynamic Template Designer")}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {editingTemplateId 
              ? "Modify HTML layout and recipient trigger configuration." 
              : (isVeh 
                  ? "Configure automated statutory expiry warnings (Insurance, RC, PUC, Fitness) and fleet reminder emails." 
                  : "Construct HTML payloads with runtime merge tag hydration.")}
          </p>
        </div>
        
        {editingTemplateId ? (
          <AppButton
            onClick={() => {
              // If it's a new unsaved template and we back out, we should probably remove it
              if (tpl?.is_new) {
                setTemplates(prev => prev.filter(t => t.id !== editingTemplateId));
              }
              setEditingTemplateId(null);
            }}
            className="flex items-center gap-2 theme-card-structural hover:bg-surface text-foreground px-4 py-2 rounded-lg text-sm font-semibold shadow-xs transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Back to list
          </AppButton>
        ) : (
          <AppButton
            onClick={handleAddTemplate}
            className="flex items-center gap-2 bg-primary hover:bg-theme-btn-primary-secondary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" /> {isVeh ? "Add Vehicle Template" : "Add Template"}
          </AppButton>
        )}
      </div>

      {/* View Router */}
      <div className="space-y-6">
        
        {/* LIST VIEW */}
        {!editingTemplateId && (
          <div className="space-y-4">
            {/* Filter Pills - only shown in global communication settings */}
            {!isLockedToModule && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
                <span className="font-semibold text-muted-foreground shrink-0 mr-1">Module:</span>
                {["ALL", ...MODULES].map((mod) => (
                  <button
                    key={mod}
                    type="button"
                    onClick={() => setModuleFilter(mod)}
                    className={`px-3 py-1.5 rounded-lg font-semibold shrink-0 transition-all cursor-pointer ${
                      moduleFilter === mod
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-surface hover:bg-surface-elevated text-muted-foreground hover:text-foreground border border-border"
                    }`}
                  >
                    {mod === "ALL" ? "All Modules" : mod}
                    <span className="ml-1.5 text-[11px] font-mono font-semibold opacity-75">
                      ({mod === "ALL" ? templates.length : templates.filter(t => t.module === mod || (mod === "Vehicle (FleetDesk)" && (t.module === "Vehicle" || t.module === "Vehicle (FleetDesk)"))).length})
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="theme-card-structural rounded-lg overflow-hidden border border-border">
            {(() => {
              const visibleTemplates = moduleFilter === "ALL"
                ? templates
                : templates.filter(t => t.module === moduleFilter || (moduleFilter === "Vehicle (FleetDesk)" && (t.module === "Vehicle" || t.module === "Vehicle (FleetDesk)")));

              return visibleTemplates.length === 0 ? (
                <div className="text-center py-12">
                  <LayoutTemplate className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground">No templates for {isVeh ? "Vehicle Desk" : (moduleFilter === "ALL" ? "System" : moduleFilter)}</h3>
                  <p className="text-xs text-muted-foreground mt-1">Click "{isVeh ? "Add Vehicle Template" : "Add Template"}" to construct a new notification payload.</p>
                </div>
              ) : (
                <AppTable className="w-full text-left text-sm">
                  <thead className="bg-background border-b border-border">
                    <tr>
                      <th className="px-6 py-4 font-semibold text-muted">Template name</th>
                      <th className="px-6 py-4 font-semibold text-muted">Module</th>
                      <th className="px-6 py-4 font-semibold text-muted">Event</th>
                      <th className="px-6 py-4 font-semibold text-muted text-center">Status</th>
                      <th className="px-6 py-4 font-semibold text-muted text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {visibleTemplates.map((item) => (
                      <tr 
                        key={item.id} 
                        className="hover:bg-background/50 transition-colors cursor-pointer group"
                        onClick={() => setEditingTemplateId(item.id)}
                      >
                        <td className="px-6 py-4 font-medium text-foreground">{item.template_name}</td>
                        <td className="px-6 py-4 text-muted">{item.module}</td>
                        <td className="px-6 py-4 text-muted">{item.event}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${item.is_active ? 'bg-success-soft text-success-text' : 'bg-danger-soft text-danger-text'}`}>
                            {item.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <AppButton aria-label="Edit" 
                            onClick={(e) => { e.stopPropagation(); setEditingTemplateId(item.id); }}
                            className="p-2 text-muted hover:text-accent-soft-text bg-background rounded-md border border-border shadow-sm"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </AppButton>
                          <AppButton aria-label="Delete" 
                            onClick={(e) => handleDelete(item.id, e)} 
                            className="p-2 text-muted hover:text-danger-text bg-background rounded-md border border-border shadow-sm"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </AppButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </AppTable>
            );
          })()}
            </div>
          </div>
        )}

        {/* EDITOR VIEW */}
        {editingTemplateId && tpl && (
          <div className="theme-card-structural rounded-lg overflow-hidden  flex flex-col animate-in slide-in-from-right-4 duration-300">
            {/* Header Configuration */}
            <div className="p-6 border-b grid grid-cols-1 md:grid-cols-3 gap-6 theme-card-structural">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-muted">Template name</label>
                <input 
                  type="text" 
                  value={tpl.template_name || ''}
                  onChange={(e) => updateLocal(tpl.id, "template_name", e.target.value)}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-muted">Trigger module</label>
                {isLockedToModule ? (
                  <div className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-foreground font-semibold flex items-center justify-between">
                    <span>{tpl.module || initialModule}</span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-info-soft text-info-text border border-info-border font-semibold">
                      Vehicle scoped
                    </span>
                  </div>
                ) : (
                  <select 
                    value={tpl.module || ''}
                    onChange={(e) => updateLocal(tpl.id, "module", e.target.value)}
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                  >
                    {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-muted">Trigger event</label>
                <select 
                  value={tpl.event || ''}
                  onChange={(e) => updateLocal(tpl.id, "event", e.target.value)}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                >
                  {(isVeh ? VEHICLE_EVENTS : EVENTS).map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div className="md:col-span-3 space-y-2">
                <label className="text-sm font-semibold text-muted">Email subject line</label>
                <input 
                  type="text" 
                  value={tpl.subject || ''}
                  onChange={(e) => updateLocal(tpl.id, "subject", e.target.value)}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary font-mono"
                  placeholder="e.g. Action Required: {{registration_number}}"
                />
              </div>

              {/* Target Recipients Checkboxes */}
              <div className="md:col-span-3 space-y-2 mt-2">
                <label className="text-sm font-semibold text-muted">Target recipients (dynamic)</label>
                <div className="flex flex-wrap gap-3">
                  {(isVeh ? VEHICLE_RECIPIENT_OPTIONS : RECIPIENT_OPTIONS).map(opt => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer px-3 py-2 border border-border rounded-md bg-background hover:border-primary transition-colors select-none">
                      <input 
                        type="checkbox"
                        checked={tpl.recipient_types?.includes(opt) || false}
                        onChange={(e) => {
                          const current = tpl.recipient_types || [];
                          if (e.target.checked) {
                            updateLocal(tpl.id, "recipient_types", [...current, opt]);
                          } else {
                            updateLocal(tpl.id, "recipient_types", current.filter((r: string) => r !== opt));
                          }
                        }}
                        className="accent-theme-btn-primary w-4 h-4"
                      />
                      <span className="text-sm font-medium text-foreground">{opt}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted">Select which dynamic roles should receive this email when the event triggers.</p>
              </div>
            </div>

            {/* Merge Tags Helper */}
            <div className="px-6 py-3 border-b border-border bg-background flex flex-wrap gap-2 items-center">
              <span className="text-xs font-semibold text-muted mr-2">Available tags:</span>
              {getAvailableMergeTags(tpl.module).map(tag => (
                <AppButton 
                  key={tag} 
                  type="button"
                  onClick={() => {
                    const el = document.getElementById(`editor_${tpl.id}`) as HTMLTextAreaElement;
                    if (el) {
                      const start = el.selectionStart;
                      const end = el.selectionEnd;
                      const bodyStr = tpl.html_body || '';
                      const newBody = bodyStr.substring(0, start) + tag + bodyStr.substring(end);
                      updateLocal(tpl.id, "html_body", newBody);
                    }
                  }}
                  className="px-2 py-1 bg-primary text-primary-foreground hover:bg-theme-btn-primary-secondary text-xs font-mono rounded transition-colors shadow-2xs cursor-pointer"
                >
                  {tag}
                </AppButton>
              ))}
            </div>

            {/* Editor vs Preview Tab */}
            <div className="flex border-b border-border bg-background">
              <AppButton 
                onClick={() => handleTabSwitch(tpl.id, "code")}
                className={`theme-tab-standard border-b-2 ${activeTab[tpl.id] === 'code' ? 'border-primary text-accent-soft-text theme-card-structural ' : 'border-transparent text-muted hover:text-foreground'}`}
              >
                <Code2 className="w-4 h-4" /> HTML source
              </AppButton>
              <AppButton 
                onClick={() => handleTabSwitch(tpl.id, "preview")}
                className={`theme-tab-standard border-b-2 ${activeTab[tpl.id] === 'preview' ? 'border-primary text-accent-soft-text theme-card-structural ' : 'border-transparent text-muted hover:text-foreground'}`}
              >
                <Eye className="w-4 h-4" /> Live preview (dynamic)
              </AppButton>
            </div>

            {/* Content Area */}
            {activeTab[tpl.id] === 'code' ? (
              <textarea
                id={`editor_${tpl.id}`}
                value={tpl.html_body || ''}
                onChange={(e) => updateLocal(tpl.id, "html_body", e.target.value)}
                className="w-full h-64 bg-background text-success-text dark:text-success-text font-mono text-sm p-6 focus:outline-none focus:ring-inset focus:ring-2 focus:ring-ring resize-y"
                spellCheck={false}
              />
            ) : (
              <div 
                className="w-full h-64 bg-surface text-foreground p-6 overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewContent[tpl.id] || "Loading preview...") }}
              />
            )}

            {/* Footer Actions */}
            <div className="bg-background px-6 py-3 border-t border-border flex justify-between items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${tpl.is_active ? 'bg-primary' : 'bg-border-active'}`}>
                  <span className={`inline-block h-3 w-3 transform rounded-full bg-surface transition-transform ${tpl.is_active ? 'translate-x-5' : 'translate-x-1'}`} />
                </div>
                <input 
                  type="checkbox" 
                  className="hidden" 
                  checked={tpl.is_active} 
                  onChange={(e) => updateLocal(tpl.id, "is_active", e.target.checked)}
                />
                <span className="text-xs font-semibold text-muted">Template active</span>
              </label>

              <div className="flex items-center gap-3">
                <AppButton aria-label="Delete" onClick={(e) => handleDelete(tpl.id, e)} className="text-muted hover:text-danger-text transition-colors mr-2">
                  <Trash2 className="w-4 h-4" />
                </AppButton>
                <AppButton 
                  onClick={() => {
                    if (tpl?.is_new) {
                      setTemplates(prev => prev.filter(t => t.id !== editingTemplateId));
                    }
                    setEditingTemplateId(null);
                  }}
                  className="bg-transparent hover:bg-surface text-muted px-4 py-1.5 rounded text-sm font-semibold transition-colors"
                >
                  Cancel
                </AppButton>
                <AppButton 
                  onClick={() => handleSave(tpl)}
                  className="flex items-center gap-2 bg-primary hover:opacity-90/90 text-primary-foreground px-6 py-1.5 rounded text-sm font-semibold transition-colors shadow-lg shadow-theme-btn-primary/20"
                >
                  <Save className="w-4 h-4" /> Save template
                </AppButton>
              </div>
            </div>
          </div>
        )}

      </div>

      {toastMsg && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg px-4 py-3  animate-in slide-in-from-bottom-5 duration-300 ${toastMsg.type === 'error' ? 'bg-danger' : 'bg-success'} text-white`}>
          <span className="text-xs font-semibold">{toastMsg.text}</span>
        </div>
      )}
    </div>
  );
}
