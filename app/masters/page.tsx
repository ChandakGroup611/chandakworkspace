"use client";

import React, { useState, useEffect } from "react";
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
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { useTheme } from "@/components/theme/ThemeProvider";
import { usePermissions } from "@/hooks/usePermissions";
import { createClient } from "@/utils/supabase/client";
import { 
  Database, 
  Search, 
  Plus, 
  Layers, 
  CheckCircle2, 
  Hash, 
  FolderTree, 
  Activity, 
  FileText,
  Lock,
  RefreshCw,
  AlertTriangle,
  X,
  Trash2,
  Check,
  ChevronRight,
  ShieldCheck,
  Cpu,
  Server,
  Box,
  Edit,
  Clock
} from "lucide-react";

// List of all master tables mapped to labels and icons
const MASTER_TABLES = [
  // ── IT INFRA Category (Tier 1) ──
  { id: "infra_issue_types", table: "issue_types", scopeId: "e1f8e8e8-e1e1-4e1e-a1e1-e1e1e1e1e1e1", label: "Issue Type", category: "IT INFRA", icon: Activity, desc: "Infra fault types and support requests", parentTable: null, parentKey: null, parentRequired: false },
  { id: "infra_issue_subtypes", table: "issue_subtypes", scopeId: "e1f8e8e8-e1e1-4e1e-a1e1-e1e1e1e1e1e1", label: "Issue Sub Type", category: "IT INFRA", icon: FileText, desc: "Specific infra problem details", parentTable: "issue_types", parentKey: "issue_type_id", parentRequired: true },
  { id: "infra_ticket_categories", table: "ticket_categories", scopeId: "e1f8e8e8-e1e1-4e1e-a1e1-e1e1e1e1e1e1", label: "Issue Category", category: "IT INFRA", icon: FolderTree, desc: "Main categories for logging physical faults", parentTable: null, parentKey: null, parentRequired: false },
  { id: "infra_ticket_subcategories", table: "ticket_subcategories", scopeId: "e1f8e8e8-e1e1-4e1e-a1e1-e1e1e1e1e1e1", label: "Issue Sub Category", category: "IT INFRA", icon: Box, desc: "Specific infra topics under each category", parentTable: "ticket_categories", parentKey: "category_id", parentRequired: true },
  { id: "infra_workflow_states", table: "status_master", scopeId: "e1f8e8e8-e1e1-4e1e-a1e1-e1e1e1e1e1e1", label: "Status", category: "IT INFRA", icon: Activity, desc: "Application stages for infra tickets", parentTable: null, parentKey: null, parentRequired: false },
  { id: "infra_master_priorities", table: "priority_master", scopeId: "e1f8e8e8-e1e1-4e1e-a1e1-e1e1e1e1e1e1", label: "Priority", category: "IT INFRA", icon: Hash, desc: "Infra priority levels and SLA resolution times", parentTable: null, parentKey: null, parentRequired: false },
  { id: "assets", table: "assets", scopeId: "e1f8e8e8-e1e1-4e1e-a1e1-e1e1e1e1e1e1", label: "Assets", category: "IT INFRA", icon: ShieldCheck, desc: "Physical hardware devices and asset tags", parentTable: "departments", parentKey: "department_id", parentRequired: false },

  // ── ERP Category (Tier 2) ──
  { id: "erp_software_systems", table: "software_systems", scopeId: "e2f8e8e8-e2e2-4e2e-a2e2-e2e2e2e2e2e2", label: "Software System", category: "ERP", icon: Server, desc: "Internal software applications and platforms", parentTable: null, parentKey: null, parentRequired: false },
  { id: "erp_software_modules", table: "software_modules", scopeId: "e2f8e8e8-e2e2-4e2e-a2e2-e2e2e2e2e2e2", label: "Module", category: "ERP", icon: Cpu, desc: "Features within a software system", parentTable: "software_systems", parentKey: "system_id", parentRequired: true },
  { id: "erp_software_submodules", table: "software_submodules", scopeId: "e2f8e8e8-e2e2-4e2e-a2e2-e2e2e2e2e2e2", label: "Sub Module", category: "ERP", icon: Database, desc: "Specific actions inside a module", parentTable: "software_modules", parentKey: "module_id", parentRequired: true },
  { id: "erp_ticket_categories", table: "ticket_categories", scopeId: "e2f8e8e8-e2e2-4e2e-a2e2-e2e2e2e2e2e2", label: "Issue Category", category: "ERP", icon: FolderTree, desc: "Main categories for software logging", parentTable: null, parentKey: null, parentRequired: false },
  { id: "erp_ticket_subcategories", table: "ticket_subcategories", scopeId: "e2f8e8e8-e2e2-4e2e-a2e2-e2e2e2e2e2e2", label: "Issue Sub Category", category: "ERP", icon: Box, desc: "Specific software topics under each category", parentTable: "ticket_categories", parentKey: "category_id", parentRequired: true },
  { id: "erp_workflow_states", table: "status_master", scopeId: "e2f8e8e8-e2e2-4e2e-a2e2-e2e2e2e2e2e2", label: "Status", category: "ERP", icon: Activity, desc: "Application stages for software tickets", parentTable: null, parentKey: null, parentRequired: false },
  { id: "erp_master_priorities", table: "priority_master", scopeId: "e2f8e8e8-e2e2-4e2e-a2e2-e2e2e2e2e2e2", label: "Priority", category: "ERP", icon: Hash, desc: "Software priority levels and SLA resolution times", parentTable: null, parentKey: null, parentRequired: false },

  // ── USERS Category ──
  { id: "departments", table: "departments", scopeId: null, label: "Department", category: "USERS", icon: Layers, desc: "Company departments and business units", parentTable: null, parentKey: null, parentRequired: false },
  { id: "designations", table: "designations", scopeId: null, label: "Job Roles", category: "USERS", icon: UsersIcon, desc: "Employee job titles and designations", parentTable: "departments", parentKey: "department_id", parentRequired: true },

  // ── OTHERS Category (Tier 3) ──
  { id: "other_software_modules", table: "software_modules", scopeId: "e3f8e8e8-e3e3-4e3e-a3e3-e3e3e3e3e3e3", label: "Module", category: "OTHERS", icon: Cpu, desc: "General feature sets", parentTable: "software_systems", parentKey: "system_id", parentRequired: false },
  { id: "other_software_submodules", table: "software_submodules", scopeId: "e3f8e8e8-e3e3-4e3e-a3e3-e3e3e3e3e3e3", label: "Sub Module", category: "OTHERS", icon: Database, desc: "General sub-features", parentTable: "software_modules", parentKey: "module_id", parentRequired: false },
  { id: "other_issue_types", table: "issue_types", scopeId: "e3f8e8e8-e3e3-4e3e-a3e3-e3e3e3e3e3e3", label: "Issue Type", category: "OTHERS", icon: Activity, desc: "General fault types", parentTable: null, parentKey: null, parentRequired: false },
  { id: "other_issue_subtypes", table: "issue_subtypes", scopeId: "e3f8e8e8-e3e3-4e3e-a3e3-e3e3e3e3e3e3", label: "Issue Sub Type", category: "OTHERS", icon: FileText, desc: "General fault details", parentTable: "issue_types", parentKey: "issue_type_id", parentRequired: true },
  { id: "other_workflow_states", table: "status_master", scopeId: "e3f8e8e8-e3e3-4e3e-a3e3-e3e3e3e3e3e3", label: "Status", category: "OTHERS", icon: Activity, desc: "General workflow stages", parentTable: null, parentKey: null, parentRequired: false },
  { id: "other_master_priorities", table: "priority_master", scopeId: "e3f8e8e8-e3e3-4e3e-a3e3-e3e3e3e3e3e3", label: "Priority", category: "OTHERS", icon: Hash, desc: "General priority levels and SLA resolution times", parentTable: null, parentKey: null, parentRequired: false },
];

function UsersIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export default function MastersPage() {
  const supabase = createClient();
  const { hasPermission, loading: permsLoading } = usePermissions();
  let isLightMode = false;
  try {
    const { theme } = useTheme();
    isLightMode = ["executive-light", "material-ocean", "aurora-breeze", "pure-elegance", "pristine-white"].includes(theme);
  } catch (e) {}
  const [activeTab, setActiveTab] = useState("infra_issue_types");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>("ALL");
  const [records, setRecords] = useState<any[]>([]);
  const [parentOptions, setParentOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [errorAlert, setErrorAlert] = useState<string | null>(null);
  const [successAlert, setSuccessAlert] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editRecordId, setEditRecordId] = useState<string | null>(null);
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formParentId, setFormParentId] = useState("");
  const [formSlaMinutes, setFormSlaMinutes] = useState<number>(120);
  const [formSlaMin, setFormSlaMin] = useState<number>(60);
  const [formSlaMax, setFormSlaMax] = useState<number>(180);
  const [formSlaStandard, setFormSlaStandard] = useState<number>(120);
  const [formAssetTag, setFormAssetTag] = useState("");
  const [formModule, setFormModule] = useState("tickets");
  const [formScopeId, setFormScopeId] = useState<string | number | null>("e1f8e8e8-e1e1-4e1e-a1e1-e1e1e1e1e1e1");
  const [formColor, setFormColor] = useState<string>("#808080");

  const currentConfig = MASTER_TABLES.find(t => t.id === activeTab)!;

  const fetchRecords = async () => {
    setLoading(true);
    setErrorAlert(null);
    try {
      // Check if table has is_deleted column by querying directly
      let query = supabase.from(currentConfig.table).select('*');
      
      // Apply scope filtering if defined for this tab
      if (currentConfig.scopeId !== null && currentConfig.scopeId !== undefined) {
        query = query.eq('scope_id', currentConfig.scopeId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      let dbData = (data || []).filter((r: any) => r.is_deleted !== true);

      // Normalize specific tables to ensure generic grid/modal works seamlessly
      dbData = dbData.map((r: any) => {
        if (currentConfig.table === "status_master") {
          return { ...r, code: r.status_code, name: r.status_name };
        }
        if (currentConfig.table === "priority_master") {
          return { ...r, code: r.priority_code, name: r.priority_name };
        }
        return r;
      });

      setRecords(dbData);

      // Fetch parent lookup list if required
      if (currentConfig.parentTable) {
        let pData: any[] = [];
        try {
          // Attempt query directly without assuming is_deleted column existence
          let pQuery = supabase.from(currentConfig.parentTable).select('id, code, name');
          
          // Apply strict scope isolation for parent lookups if scope is defined and parent table itself is scope-restricted
          const parentConfig = MASTER_TABLES.find(t => t.table === currentConfig.parentTable && t.scopeId !== null);
          if (parentConfig && currentConfig.scopeId !== null && currentConfig.scopeId !== undefined) {
            pQuery = pQuery.eq('scope_id', currentConfig.scopeId);
          }
          
          const { data: pRes1, error: pErr1 } = await pQuery;
            
          if (pErr1) throw pErr1;
          pData = pRes1 || [];
        } catch (pError) {
          console.warn(`Parent reference lookup on relation ${currentConfig.parentTable} restricted. Using localized buffer memory sync:`, pError);
        }

        // HYBRID PERSISTENCE: Merge local sandbox parent records
        // Find the specific activeTab ID that corresponds to this parentTable and scope
        const parentConfigId = MASTER_TABLES.find(t => t.table === currentConfig.parentTable && t.scopeId === currentConfig.scopeId)?.id || currentConfig.parentTable;
        
        try {
          const pStored = localStorage.getItem(`demo_masters_cache_${parentConfigId}`);
          if (pStored) {
            const pLocal = JSON.parse(pStored);
            pLocal.forEach((pl: any) => {
              if (!pData.some(pd => pd.id === pl.id || pd.code === pl.code)) pData.push(pl);
            });
          }
        } catch (e) {}

        // If still no parents, seed some to unblock UI
        if (pData.length === 0) {
          pData = [
            { id: `p-seed-1`, code: `${currentConfig.parentTable.slice(0, 3).toUpperCase()}-P01`, name: `Baseline ${currentConfig.parentTable} (Seed)` },
            { id: `p-seed-2`, code: `${currentConfig.parentTable.slice(0, 3).toUpperCase()}-P02`, name: `Standard ${currentConfig.parentTable} (Seed)` }
          ];
        }
        
        const validParents = pData.filter((p: any) => p.is_deleted !== true);
        setParentOptions(validParents);
        if (validParents.length > 0) {
          setFormParentId(validParents[0].id);
        }
      } else {
        setParentOptions([]);
        setFormParentId("");
      }
    } catch (err: any) {
      console.warn("Master Table query restricted by strict RLS access schemas:", err);
      setRecords([]);

      // Hydrate parent configuration dropmenu lists similarly if parent constraint defined
      if (currentConfig.parentTable) {
        let pLocal: any[] = [];
        const parentConfigId = MASTER_TABLES.find(t => t.table === currentConfig.parentTable && t.scopeId === currentConfig.scopeId)?.id || currentConfig.parentTable;
        
        try {
          const pStored = localStorage.getItem(`demo_masters_cache_${parentConfigId}`);
          if (pStored) pLocal = JSON.parse(pStored);
        } catch (e) {}

        const pSeeds = [
          { id: `p-seed-1`, code: `${currentConfig.parentTable.slice(0, 3).toUpperCase()}-P01`, name: `Global Enterprise ${currentConfig.parentTable}`, is_active: true },
          { id: `p-seed-2`, code: `${currentConfig.parentTable.slice(0, 3).toUpperCase()}-P02`, name: `Standard Operations ${currentConfig.parentTable}`, is_active: true }
        ];

        const mergedP = [...pLocal];
        pSeeds.forEach(ps => {
          if (!mergedP.some(mp => mp.code === ps.code)) mergedP.push(ps);
        });

        const validParents = mergedP.filter((p: any) => !p.is_deleted);
        setParentOptions(validParents);
        if (validParents.length > 0) {
          setFormParentId(validParents[0].id);
        }
      }

      setErrorAlert(`Note: Remote table lookup requires migration sync. Loaded local persistence cache alongside sandbox starter seeds.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    // Clear forms
    setEditRecordId(null);
    setFormCode("");
    setFormName("");
    setFormDesc("");
    setFormAssetTag("");
    setFormSlaMinutes(120);
    setFormColor("#808080");
  }, [activeTab]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const search = window.location.search;
      if (search.includes("scope=IT_INFRA")) {
        setActiveTab("infra_ticket_categories");
      } else if (search.includes("scope=ERP_SOFTWARE")) {
        setActiveTab("erp_workflow_states");
      } else if (search.includes("scope=OTHER")) {
        setActiveTab("departments");
      }
    }
  }, []);

  // Alert Behavior: Auto-clear after 1s and close on random screen click
  useEffect(() => {
    if (successAlert || errorAlert) {
      const timer = setTimeout(() => {
        setSuccessAlert(null);
        setErrorAlert(null);
      }, 1000);

      const handleGlobalClick = () => {
        setSuccessAlert(null);
        setErrorAlert(null);
      };

      window.addEventListener("mousedown", handleGlobalClick);

      return () => {
        clearTimeout(timer);
        window.removeEventListener("mousedown", handleGlobalClick);
      };
    }
  }, [successAlert, errorAlert]);

  // Realtime subscription removed as per Enterprise Polling Governance (P4).
  // Masters change infrequently, rely on manual refresh.

  const openCreateModal = () => {
    setEditRecordId(null);
    setFormCode("");
    setFormName("");
    setFormDesc("");
    if (parentOptions.length > 0) {
      setFormParentId(parentOptions[0].id);
    } else {
      setFormParentId("");
    }
    setFormSlaMinutes(120);
    setFormSlaMin(60);
    setFormSlaMax(180);
    setFormSlaStandard(120);
    setFormAssetTag("");
    setFormModule("tickets");
    setFormScopeId(currentConfig.scopeId || null);
    setFormColor("#808080");
    setShowModal(true);
  };

  const openEditModal = (rec: any) => {
    setEditRecordId(rec.id);
    setFormCode(rec.code || "");
    setFormName(rec.name || "");
    setFormDesc(rec.description || "");
    if (currentConfig.parentKey && rec[currentConfig.parentKey]) {
      setFormParentId(rec[currentConfig.parentKey]);
    } else if (parentOptions.length > 0) {
      setFormParentId(parentOptions[0].id);
    }
    setFormSlaMinutes((rec.max_sla_hours * 60) || 120);
    setFormSlaMin((rec.min_sla_hours * 60) || 60);
    setFormSlaMax((rec.max_sla_hours * 60) || 180);
    setFormSlaStandard((rec.max_sla_hours * 60) || 120);
    setFormAssetTag(rec.asset_tag || "");
    setFormModule(rec.module || "tickets");
    setFormScopeId(rec.scope_id || null);
    setFormColor(rec.status_color || rec.priority_color || "#808080");
    setShowModal(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode.trim() || !formName.trim()) {
      setErrorAlert("Code and Name fields are strictly mandatory.");
      return;
    }

    setErrorAlert(null);
    setSuccessAlert(null);

    const payload: any = {
      code: formCode.trim().toUpperCase(),
      name: formName.trim(),
      description: formDesc.trim() || null,
      is_active: true,
      scope_id: formScopeId || null
    };

    // Table specific mappings
    if (currentConfig.table === "status_master") {
      payload.status_code = payload.code;
      payload.status_name = payload.name;
      payload.status_color = formColor;
      delete payload.code;
      delete payload.name;
    }
    
    if (currentConfig.table === "priority_master") {
      payload.priority_code = payload.code;
      payload.priority_name = payload.name;
      payload.priority_color = formColor;
      delete payload.code;
      delete payload.name;
    }

    if (currentConfig.parentKey && formParentId) {
      payload[currentConfig.parentKey] = formParentId;
    }
    if (currentConfig.table === "priority_master") {
      const standard = Number(formSlaStandard) || 120;
      payload.max_sla_hours = Math.ceil(standard / 60);
      payload.warning_sla_hours = Math.max(1, Math.floor(standard / 60));
      payload.min_sla_hours = Math.floor((Number(formSlaMin) || Math.floor(standard * 0.5)) / 60);
    }
    if (currentConfig.table === "assets") {
      payload.asset_tag = formAssetTag.trim().toUpperCase() || `TAG-${Date.now().toString().slice(-6)}`;
      payload.status = "OPERATIONAL";
    }
    if (currentConfig.table === "workflow_states" || currentConfig.table === "status_master") {
      // Automap module and scope_type based on the Operational Governance Scope selected
      if (formScopeId === 'e1f8e8e8-e1e1-4e1e-a1e1-e1e1e1e1e1e1') {
        payload.module = 'infra';
        payload.scope_type = 'INFRA';
      } else if (formScopeId === 'e2f8e8e8-e2e2-4e2e-a2e2-e2e2e2e2e2e2') {
        payload.module = 'erp';
        payload.scope_type = 'ERP';
      } else if (formScopeId === 'e3f8e8e8-e3e3-4e3e-a3e3-e3e3e3e3e3e3') {
        payload.module = 'workspaces';
        payload.scope_type = 'TASK';
      } else {
        payload.module = 'requirements';
        payload.scope_type = 'REQUIREMENT';
      }
    }

    if (editRecordId) {
      // Perform UPDATE workflow for master editing
      try {
        const { error } = await supabase
          .from(currentConfig.table)
          .update({
            ...payload,
            updated_at: new Date().toISOString()
          })
          .eq('id', editRecordId);

        if (error) throw error;

        // Log audit
        await supabase.from("master_audit_logs").insert([{
          master_table: currentConfig.table,
          record_id: editRecordId,
          operation: "UPDATE",
          after_values: payload
        }]);

        // Push global update notification broadcast
        await supabase.from("notification_queue").insert([{
          entity_type: currentConfig.table,
          entity_id: payload.code || payload.name || editRecordId,
          module: "masters",
          action_type: "update",
          actor: "System Administrator",
          target_user_id: "GLOBAL_OPS",
          payload: { message: `Master record '${payload.code || payload.name}' updated in relation '${currentConfig.table}'.`, values: payload },
          redirect_url: `/masters?scope=OTHER`,
          priority_level: "MEDIUM",
          is_read: false
        }]).then(() => {}, () => {});

        setSuccessAlert(`Successfully updated dynamic master record '${payload.code}'.`);
        setShowModal(false);
        setEditRecordId(null);
        setFormCode("");
        setFormName("");
        setFormDesc("");
        setFormAssetTag("");
        fetchRecords();
      } catch (err: any) {
        console.warn("Master Update intercepted by sandbox state fallback:", err);
        alert("Database Error on Update: " + (err.message || err.details || JSON.stringify(err)));
        setShowModal(false);
        setEditRecordId(null);
        setFormCode("");
        setFormName("");
        setFormDesc("");
        setFormAssetTag("");
      }
      return;
    }

    try {
      const { data, error } = await supabase
        .from(currentConfig.table)
        .insert([payload])
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Log master audit record
      await supabase.from("master_audit_logs").insert([{
        master_table: currentConfig.table,
        record_id: data?.id || "00000000-0000-0000-0000-000000000000",
        operation: "CREATE",
        after_values: payload
      }]);

      // Push global creation notification broadcast
      await supabase.from("notification_queue").insert([{
        entity_type: currentConfig.table,
        entity_id: payload.code || payload.name || data?.id || "00000000-0000-0000-0000-000000000000",
        module: "masters",
        action_type: "create",
        actor: "System Administrator",
        target_user_id: "GLOBAL_OPS",
        payload: { message: `Master record '${payload.code || payload.name}' created in relation '${currentConfig.table}'.`, values: payload },
        redirect_url: `/masters?scope=OTHER`,
        priority_level: "MEDIUM",
        is_read: false
      }]).then(() => {}, () => {});

      setSuccessAlert(`Successfully provisioned dynamic master record '${payload.code}'.`);
      setShowModal(false);
      setFormCode("");
      setFormName("");
      setFormDesc("");
      setFormAssetTag("");
      fetchRecords();
    } catch (err: any) {
      console.warn("Master Creation validation intercepted:", err);
      
      // ALERTS THE ACTUAL DATABASE ERROR SO THE USER SEES IT IMMEDIATELY
      alert("Database Error: " + (err.message || err.details || JSON.stringify(err)));

      setShowModal(false);
      setFormCode("");
      setFormName("");
      setFormDesc("");
      setFormAssetTag("");
    }
  };

  const toggleActive = async (record: any) => {
    setErrorAlert(null);
    setSuccessAlert(null);
    const updatedStatus = !record.is_active;

    try {
      const { error } = await supabase
        .from(currentConfig.table)
        .update({ is_active: updatedStatus, updated_at: new Date().toISOString() })
        .eq('id', record.id);

      if (error) throw error;

      // Log audit
      await supabase.from("master_audit_logs").insert([{
        master_table: currentConfig.table,
        record_id: record.id,
        operation: updatedStatus ? "ACTIVATE" : "DEACTIVATE",
        before_values: { is_active: record.is_active },
        after_values: { is_active: updatedStatus }
      }]);

      // Push global update notification broadcast
      await supabase.from("notification_queue").insert([{
        entity_type: currentConfig.table,
        entity_id: record.code || record.name || record.id,
        module: "masters",
        action_type: "update",
        actor: "System Administrator",
        target_user_id: "GLOBAL_OPS",
        payload: { message: `Master record status modified to '${updatedStatus ? "ACTIVE" : "DISABLED"}' on relation '${currentConfig.table}'.` },
        redirect_url: `/masters?scope=OTHER`,
        priority_level: "MEDIUM",
        is_read: false
      }]).then(() => {}, () => {});

      setRecords(records.map(r => r.id === record.id ? { ...r, is_active: updatedStatus } : r));
      setSuccessAlert(`Record status successfully updated.`);
    } catch (err: any) {
      console.warn("Status toggle backend verification filtered:", err);
      alert("Database Error on Toggle: " + (err.message || err.details || JSON.stringify(err)));
    }
  };

  const handleDelete = async (record: any) => {
    setErrorAlert(null);
    setSuccessAlert(null);
    
    try {
      // Hard delete from database. This guarantees constraint errors are thrown back to the user if the record is in use.
      const { data, error } = await supabase
        .from(currentConfig.table)
        .delete()
        .eq('id', record.id)
        .select();

      if (error) {
        throw error;
      }
      
      // If data is empty and there was no error, RLS blocked it (silent failure)
      if (!data || data.length === 0) {
        throw new Error("Deletion failed. It may have already been deleted, or you don't have permission.");
      }

      // Log audit
      await supabase.from("master_audit_logs").insert([{
        master_table: currentConfig.table,
        record_id: record.id,
        operation: "DELETE",
        before_values: record
      }]);

      // Push global deletion notification broadcast
      await supabase.from("notification_queue").insert([{
        entity_type: currentConfig.table,
        entity_id: record.code || record.name || record.id,
        module: "masters",
        action_type: "delete",
        actor: "System Administrator",
        target_user_id: "GLOBAL_OPS",
        payload: { message: `Master record '${record.code || record.name}' deleted from relation '${currentConfig.table}'.` },
        redirect_url: `/masters?scope=OTHER`,
        priority_level: "CRITICAL",
        is_read: false
      }]).then(() => {}, () => {});

      setRecords(records.filter(r => r.id !== record.id));
      setSuccessAlert(`Master entity successfully deleted.`);
    } catch (err: any) {
      console.warn("Deletion restricted by remote relation models:", err);
      alert("Database Error on Delete: " + (err.message || err.details || JSON.stringify(err)));
    }
  };

  const filteredDataset = records.filter(r => 
    (r.name && r.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (r.code && r.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (r.id && r.id.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (!mounted || permsLoading) {
    return (
      <div className={`h-screen flex flex-col items-center justify-center space-y-4 transition-colors duration-300 ${
        "bg-surface text-foreground"
      }`}>
        <div className="animate-spin h-10 w-10 border-2 border-indigo-500 border-t-transparent rounded-full shadow-lg shadow-indigo-500/20" />
        <span className="text-xs font-bold uppercase tracking-widest animate-pulse text-gray-500">
          Verifying Credentials...
        </span>
      </div>
    );
  }

  if (!hasPermission("SYSTEM_MASTERS_VIEW")) {
    return (
      <div className={`h-screen flex flex-col items-center justify-center space-y-4 transition-colors duration-300 ${
        "bg-surface text-foreground"
      }`}>
        <div className="p-4 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400">
          <Lock className="h-10 w-10" />
        </div>
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-xs text-gray-500">You do not have capabilities to view the Master Data Configuration Directory.</p>
      </div>
    );
  }

  return (
    <PageContainer strict={true}>
      <PageHeader
        title="Master Data Configuration Directory"
        description="Manage core business definitions, categories, and dropdown options utilized across the operational platform."
        icon={<Database className="h-6 w-6" />}
        badge={<AppBadge variant="success">Active Directory</AppBadge>}
        actions={
          <>
            <AppButton 
              variant="outline" 
              size="sm" 
              leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />}
              onClick={fetchRecords}
            >
              Refresh Data
            </AppButton>
            <AppButton 
              variant="primary" 
              size="sm" 
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={openCreateModal}
              disabled={!hasPermission("MASTERS_CREATE")}
            >
              Add New Record
            </AppButton>
          </>
        }
      />

      {/* Global Event Trigger Banners */}
      {errorAlert && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 animate-in fade-in-20">
          <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs text-rose-200">
            <strong className="font-semibold block text-rose-300">Governance Integrity Notice:</strong>
            {errorAlert}
          </div>
          <button onClick={() => setErrorAlert(null)} className="text-gray-500 hover:text-white">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {successAlert && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs text-emerald-300 animate-in fade-in-20">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>{successAlert}</span>
          </div>
          <button onClick={() => setSuccessAlert(null)} className="text-gray-500 hover:text-white">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Central Columns Workspace Framework */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 overflow-hidden">
        {/* Left Column Span 4: Navigational Tab Controller */}
        <div className="lg:col-span-4 space-y-4 flex flex-col min-h-0">
          <AppCard className="flex-1 p-4 space-y-3 flex flex-col min-h-0 overflow-hidden">
            <div className={`flex items-center justify-between pb-2 border-b ${
              "border-border"
            }`}>
              <span className={`text-[0.8rem] font-bold tracking-wider uppercase select-none ${
                isLightMode ? "text-gray-700" : "text-gray-400"
              }`}>
                Configuration Groups
              </span>
              <span className="text-xs text-gray-500 font-mono font-semibold">{MASTER_TABLES.length} Registered</span>
            </div>

            {/* Category Tier Selector Tabs */}
            <div className={`p-1.5 rounded-xl grid grid-cols-2 gap-1 text-xs font-bold tracking-tight ${
              isLightMode ? "bg-gray-100/80 text-gray-600" : "bg-white/[0.02] border border-white/5 text-gray-400"
            }`}>
              {[
                { id: "ALL", label: "All Tiers" },
                { id: "IT INFRA", label: "IT Infra" },
                { id: "ERP", label: "ERP/Soft" },
                { id: "USERS", label: "Users" },
                { id: "OTHERS", label: "Other" }
              ].map(tier => {
                const isSelected = activeCategoryFilter === tier.id;
                return (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => {
                      setActiveCategoryFilter(tier.id);
                      // Pre-select first item of the tier if switching to specific tier
                      if (tier.id !== "ALL") {
                        const firstItem = MASTER_TABLES.find(t => t.category === tier.id);
                        if (firstItem) setActiveTab(firstItem.id);
                      }
                    }}
                    className={`py-1 px-2 rounded-lg text-center transition-all truncate ${tier.id === "ALL" ? "col-span-2" : ""} ${
                      isSelected
                        ? (isLightMode ? "bg-white text-blue-700 shadow-sm" : "bg-white/10 text-white shadow")
                        : (isLightMode ? "hover:text-gray-900 hover:bg-white/50" : "hover:text-gray-200 hover:bg-white/5")
                    }`}
                  >
                    {tier.label}
                  </button>
                );
              })}
            </div>

            <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin">
              {(["IT INFRA", "ERP", "USERS", "OTHERS"] as const).map((groupCategory) => {
                // If activeCategoryFilter is not "ALL", only show the requested tier
                if (activeCategoryFilter !== "ALL" && groupCategory !== activeCategoryFilter) return null;

                const groupItems = MASTER_TABLES.filter(t => t.category === groupCategory);
                if (groupItems.length === 0) return null;

                return (
                  <div key={groupCategory} className="space-y-1.5">
                    <div className="flex items-center gap-2 px-1 pt-1">
                      <span className={`text-[0.7rem] font-bold tracking-widest uppercase font-mono ${
                        isLightMode ? "text-blue-700" : "text-blue-400"
                      }`}>
                        ■ {groupCategory} CATEGORY
                      </span>
                      <div className={`h-[1px] flex-1 ${isLightMode ? "bg-gray-200" : "bg-white/5"}`} />
                    </div>

                    {groupItems.map((tab) => {
                      const IconComponent = tab.icon;
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => {
                            setActiveTab(tab.id);
                            setSearchQuery("");
                          }}
                          className={`w-full p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer flex items-start gap-3 ${
                            isLightMode
                              ? (isActive ? "bg-blue-50 border-blue-300 shadow-sm" : "bg-white border-gray-100 hover:border-gray-300 hover:bg-gray-50")
                              : (isActive ? "bg-white/[0.06] border-blue-500/40 shadow-md" : "bg-white/[0.01] border-white/5 hover:border-white/10 hover:bg-white/[0.02]")
                          }`}
                        >
                          <div className={`p-2 rounded-lg mt-0.5 ${
                            isLightMode
                              ? (isActive ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500")
                              : (isActive ? "bg-blue-500/10 text-blue-400" : "bg-white/5 text-gray-400")
                          }`}>
                            <IconComponent className="h-4 w-4 shrink-0" />
                          </div>
                          <div className="space-y-0.5 flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className={`text-xs font-bold truncate block ${
                                isLightMode ? (isActive ? "text-gray-900" : "text-gray-700") : (isActive ? "text-white" : "text-gray-300")
                              }`}>
                                {tab.label}
                              </span>
                              {isActive && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
                            </div>
                            <p className="text-xs text-gray-500 font-medium line-clamp-1">{tab.desc}</p>
                            {tab.parentTable && (
                              <span className={`text-[0.65rem] font-mono px-1 py-0.2 rounded border inline-block mt-1 ${
                                isLightMode ? "text-purple-700 bg-purple-50 border-purple-200" : "text-purple-400/80 bg-purple-500/10 border-purple-500/20"
                              }`}>
                                ↳ Dependent on {tab.parentTable}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </AppCard>

        </div>

        {/* Right Column Span 8: Table Data Inspector */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          <AppCard className={`flex-1 flex flex-col justify-between overflow-hidden shadow-xl ${
            "border-border"
          }`}>
            {/* Unified Filter Box Header */}
            <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-t-xl border-b border-gray-200 dark:border-white/10 flex flex-col gap-3 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 md:gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                      {currentConfig.label}
                    </h2>
                    <AppBadge variant="info" className="uppercase font-mono text-[10px] tracking-wider py-0 px-1.5 h-4 min-h-0 border border-blue-200">
                      {activeTab.replace(/_/g, ' ')}
                    </AppBadge>
                  </div>
                  <p className="text-[10px] text-gray-500 font-medium">
                    Active configuration choices currently live for staff use across the platform.
                  </p>
                </div>
              </div>

              {/* Dynamic Quick Text Search bar */}
              <div className="flex items-center pt-2 mt-1 border-t border-gray-200 dark:border-white/10">
                <AppInput 
                  placeholder="Filter records by string parameters..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftIcon={<Search className="h-3.5 w-3.5" />}
                  className="w-full h-9 text-xs bg-white dark:bg-[#0f111a]"
                />
              </div>
            </div>

            {/* Table Output Array Container */}
            <div className="p-4 flex-1 overflow-y-auto">
              {loading ? (
                <div className="py-16 flex flex-col items-center justify-center space-y-3">
                  <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
                  <span className="text-xs text-gray-500 font-medium">Resolving normalized records live from database schema...</span>
                </div>
              ) : (
                <>
                  {records.length === 0 ? (
                    <div className={`py-16 px-4 text-center space-y-3 border border-dashed rounded-2xl ${
                      isLightMode ? "bg-gray-50 border-gray-200" : "bg-white/[0.005] border-white/5"
                    }`}>
                      <div className="h-10 w-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400 font-bold">
                        !
                      </div>
                      <div className="space-y-1 max-w-sm mx-auto">
                        <h4 className={`text-xs font-bold ${"text-foreground"}`}>No Master Data Configured</h4>
                        <p className={`text-[0.8rem] ${"text-muted"}`}>
                          No operational items are currently defined in this directory. Add your first record to make it available for workspace selection.
                        </p>
                      </div>
                      <AppButton 
                        variant="primary" 
                        size="sm" 
                        leftIcon={<Plus className="h-3 w-3" />}
                        onClick={openCreateModal}
                        className="mx-auto"
                      >
                        Create Initial Record
                      </AppButton>
                    </div>
                  ) : (
                    <AppTableContainer>
                      <AppTable>
                        <AppTableHeader>
                          <tr>
                            <AppTableHead>Short Code</AppTableHead>
                            <AppTableHead>Display Name</AppTableHead>
                            {currentConfig.parentTable && (
                              <AppTableHead>Parent Link</AppTableHead>
                            )}
                            {activeTab === "master_priorities" && (
                              <AppTableHead>SLA Target</AppTableHead>
                            )}
                            {activeTab === "assets" && (
                              <AppTableHead>Asset Tag</AppTableHead>
                            )}
                            {activeTab === "workflow_states" && (
                              <AppTableHead>Module Scope</AppTableHead>
                            )}
                            <AppTableHead className="text-center">Status</AppTableHead>
                            <AppTableHead className="text-right">Actions</AppTableHead>
                          </tr>
                        </AppTableHeader>
                        <AppTableBody>
                          {filteredDataset.map((rec) => (
                            <AppTableRow key={rec.id}>
                              <AppTableCell>
                                <div className="space-y-0.5">
                                  <span className={`font-mono text-xs font-bold block ${isLightMode ? "text-blue-700" : "text-blue-400"}`}>{rec.code}</span>
                                  <span className="text-[0.7rem] text-gray-500 font-mono block truncate max-w-[120px]">{rec.id}</span>
                                </div>
                              </AppTableCell>
                              <AppTableCell>
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className={`font-bold text-xs block ${"text-foreground"}`}>{rec.name}</span>
                                    <span className={`text-[0.65rem] font-bold px-1 rounded border tracking-tighter ${
                                      rec.scope_id === 'e2f8e8e8-e2e2-4e2e-a2e2-e2e2e2e2e2e2'
                                        ? "text-purple-400 border-purple-500/30 bg-purple-500/5"
                                        : rec.scope_id === 'e3f8e8e8-e3e3-4e3e-a3e3-e3e3e3e3e3e3'
                                        ? "text-amber-400 border-amber-500/30 bg-amber-500/5"
                                        : "text-blue-400 border-blue-500/30 bg-blue-500/5"
                                    }`}>
                                      {rec.scope_id === 'e2f8e8e8-e2e2-4e2e-a2e2-e2e2e2e2e2e2'
                                        ? "FLAG 2 (ERP)"
                                        : rec.scope_id === 'e3f8e8e8-e3e3-4e3e-a3e3-e3e3e3e3e3e3'
                                        ? "FLAG 3 (OTHERS)"
                                        : "FLAG 1 (INFRA)"}
                                    </span>
                                  </div>
                                  {rec.description && (
                                    <span className={`text-xs block line-clamp-1 max-w-[180px] ${"text-muted"}`}>{rec.description}</span>
                                  )}
                                </div>
                              </AppTableCell>

                              {/* Dynamic Render based on specific column mappings */}
                              {currentConfig.parentTable && (
                                <AppTableCell>
                                  <span className={`text-xs font-mono font-medium px-2 py-0.5 rounded border inline-block truncate max-w-[120px] ${
                                    isLightMode ? "text-purple-700 bg-purple-50 border-purple-200" : "text-purple-400 bg-purple-500/10 border-purple-500/20"
                                  }`}>
                                    {rec[currentConfig.parentKey!] || "Unmapped"}
                                  </span>
                                </AppTableCell>
                              )}

                              {activeTab === "master_priorities" && (
                                <AppTableCell>
                                  {rec.max_sla_hours !== undefined ? (
                                    <div className="flex items-center gap-2">
                                      <div className={`p-1 rounded-md ${isLightMode ? "bg-amber-100" : "bg-amber-500/10"}`}>
                                        <Clock className="h-3 w-3 text-amber-500" />
                                      </div>
                                      <span className="font-semibold">{rec.max_sla_hours * 60}m Target</span>
                                      <div className="flex gap-2 text-[0.65rem] opacity-60 uppercase font-bold tracking-tighter">
                                        <span>Min: {rec.min_sla_hours || 0}h</span>
                                        <span>Max: {rec.max_sla_hours || 0}h</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-gray-500">-</span>
                                  )}
                                </AppTableCell>
                              )}

                              {activeTab === "assets" && (
                                <AppTableCell>
                                  <span className={`text-xs font-mono font-bold ${isLightMode ? "text-emerald-700" : "text-emerald-400"}`}>
                                    {rec.asset_tag}
                                  </span>
                                </AppTableCell>
                              )}

                              {activeTab === "workflow_states" && (
                                <AppTableCell>
                                  <span className={`text-xs font-mono font-bold uppercase px-2 py-0.5 rounded border ${
                                    isLightMode ? "text-blue-700 bg-blue-50 border-blue-200" : "text-blue-400 bg-blue-500/10 border-blue-500/20"
                                  }`}>
                                    {(rec.module || "Universal").replace(/_/g, ' ')}
                                  </span>
                                </AppTableCell>
                              )}

                              <AppTableCell className="text-center">
                                <button
                                  type="button"
                                  onClick={() => toggleActive(rec)}
                                  disabled={!hasPermission("MASTERS_UPDATE")}
                                  className={`px-2.5 py-1 rounded-lg border text-xs font-bold uppercase transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                                    rec.is_active 
                                      ? (isLightMode ? "bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20")
                                      : (isLightMode ? "bg-gray-50 border-gray-200 text-gray-400 line-through hover:bg-gray-100" : "bg-white/[0.01] border-white/5 text-gray-600 line-through hover:bg-white/[0.03]")
                                  }`}
                                >
                                  {rec.is_active ? "Active" : "Disabled"}
                                </button>
                              </AppTableCell>

                              <AppTableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => openEditModal(rec)}
                                    disabled={!hasPermission("MASTERS_UPDATE")}
                                    className={`p-1.5 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                      isLightMode ? "bg-white border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300" : "bg-white/[0.01] border-white/5 text-gray-400 hover:text-blue-400 hover:border-blue-500/30"
                                    }`}
                                    title="Edit Record Details"
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(rec)}
                                    disabled={!hasPermission("MASTERS_DELETE")}
                                    className={`p-1.5 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                      isLightMode ? "bg-white border-gray-200 text-gray-400 hover:text-rose-600 hover:border-rose-300" : "bg-white/[0.01] border-white/5 text-gray-400 hover:text-rose-400 hover:border-rose-500/30"
                                    }`}
                                    title="Delete Record"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </AppTableCell>
                            </AppTableRow>
                          ))}
                        </AppTableBody>
                      </AppTable>
                    </AppTableContainer>
                  )}
                </>
              )}
            </div>

            {/* Pagination / Context Footer */}
            <div className="p-4 bg-white/[0.005] border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-gray-500">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-3 w-3 text-emerald-500 shrink-0" />
                <span>Auditing active: all status updates automatically export JSONB snapshots.</span>
              </div>
              <span className="text-gray-400 font-mono">Visible entities: {filteredDataset.length} of {records.length}</span>
            </div>
          </AppCard>
        </div>
      </div>

      {/* ── Dynamic Overlay Append Modal ── */}
      {showModal && (
        <div 
          className="fixed inset-0 z-50 flex items-start pt-24 pb-24 overflow-y-auto justify-center px-4 p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className={`relative w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200 ${
            isLightMode ? "bg-white border-gray-200 text-gray-900" : "bg-[#0A0D14] border-white/10 text-white"
          }`}>
            {/* Header */}
            <div className={`flex items-center justify-between px-6 py-4 border-b ${
              isLightMode ? "border-gray-100 bg-gray-50" : "border-white/10 bg-white/[0.01]"
            }`}>
              <div className="space-y-0.5">
                <h3 className={`text-sm font-bold ${"text-foreground"}`}>
                  {editRecordId ? "Edit Details:" : "Add New"} {currentConfig.label}
                </h3>
                <p className={`text-xs ${"text-muted"}`}>
                  {editRecordId ? "Modify specific attributes of this pre-existing record." : "Enter the specific details to create this record in the company directory."}
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-gray-500 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Input elements form */}
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {/* Code */}
              <div className="space-y-1.5">
                <label className="text-[0.8rem] font-bold text-gray-400 uppercase tracking-wider block">
                  Short Code <span className="text-rose-400">*</span>
                </label>
                <AppInput 
                  placeholder="e.g. SEC_INC"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  className="font-mono text-xs uppercase"
                  required
                />
                <span className="text-[0.7rem] text-gray-500 block">A unique short abbreviation used to quickly reference this item.</span>
              </div>

              {/* Full Display Name */}
              <div className="space-y-1.5">
                <label className="text-[0.8rem] font-bold text-gray-400 uppercase tracking-wider block">
                  Display Name <span className="text-rose-400">*</span>
                </label>
                <AppInput 
                  placeholder="e.g. Security Incident"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>

              {/* Description Context */}
              <div className="space-y-1.5">
                <label className="text-[0.8rem] font-bold text-gray-400 uppercase tracking-wider block">
                  Description & Internal Notes
                </label>
                <textarea 
                  placeholder="Provide helpful context or guidelines for your team..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  rows={2}
                  className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:border-blue-500/50 resize-none transition-all ${
                    isLightMode ? "bg-white border-gray-300 text-gray-900 placeholder-gray-400" : "bg-white/5 border-white/10 text-gray-200 placeholder-gray-500"
                  }`}
                />
              </div>

              {/* Color Assignment */}
              {(currentConfig.table === "status_master" || currentConfig.table === "priority_master") && (
                <div className="space-y-1.5">
                  <label className="text-[0.8rem] font-bold text-gray-400 uppercase tracking-wider block">
                    Display Color <span className="text-rose-400">*</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="color" 
                      value={formColor} 
                      onChange={(e) => setFormColor(e.target.value)} 
                      className="h-9 w-12 cursor-pointer rounded bg-transparent border-0 p-0"
                    />
                    <AppInput 
                      value={formColor.toUpperCase()}
                      onChange={(e) => setFormColor(e.target.value)}
                      className="font-mono text-xs w-32 uppercase"
                    />
                  </div>
                  <span className="text-[0.7rem] text-gray-500 block">Globally used to style this tag across all dashboards and boards.</span>
                </div>
              )}

              {/* Conditional Cascading Mapping dropmenus */}
              {currentConfig.parentTable && (
                <div className="space-y-1.5">
                  <label className="text-[0.8rem] font-bold text-purple-400 uppercase tracking-wider block">
                    Parent Record Link <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={formParentId}
                    onChange={(e) => setFormParentId(e.target.value)}
                    className={`w-full h-9 px-3 rounded-xl border text-xs focus:outline-none focus:border-purple-500/50 cursor-pointer ${
                      isLightMode ? "bg-white border-gray-300 text-gray-900" : "bg-white/5 border-white/10 text-purple-300"
                    }`}
                    required={currentConfig.parentRequired}
                  >
                    {!currentConfig.parentRequired && <option value="" className={isLightMode ? "bg-white text-gray-500" : "bg-[#0A0D14] text-gray-500"}>-- Optional (Global Scope) --</option>}
                    {parentOptions.length === 0 ? (
                      currentConfig.parentRequired && <option value="" className="bg-[#0A0D14] text-gray-500">-- No available parent records --</option>
                    ) : (
                      parentOptions.map(p => (
                        <option key={p.id} value={p.id} className={isLightMode ? "bg-white text-gray-900" : "bg-[#0A0D14]"}>
                          {p.code} — {p.name}
                        </option>
                      ))
                    )}
                  </select>
                  <span className="text-[0.7rem] text-gray-500 block">Select the top-level parent record this item falls under.</span>
                </div>
              )}

              {/* Target SLA target minutes input */}
              {currentConfig.table === "master_priorities" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                  <div className="space-y-1.5">
                    <label className="text-[0.8rem] font-bold text-emerald-400 uppercase tracking-wider block">
                      Min Time (Mins)
                    </label>
                    <AppInput 
                      type="number" 
                      value={formSlaMin}
                      onChange={(e) => setFormSlaMin(Number(e.target.value))}
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[0.8rem] font-bold text-emerald-400 uppercase tracking-wider block">
                      Standard Time (Mins)
                    </label>
                    <AppInput 
                      type="number" 
                      value={formSlaStandard}
                      onChange={(e) => setFormSlaStandard(Number(e.target.value))}
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[0.8rem] font-bold text-emerald-400 uppercase tracking-wider block">
                      Max Time (Mins)
                    </label>
                    <AppInput 
                      type="number" 
                      value={formSlaMax}
                      onChange={(e) => setFormSlaMax(Number(e.target.value))}
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Associated System Module dropdown removed - dynamically assigned based on Governance Scope */}

              {/* Operational Scope Flag (1=INFRA, 2=ERP) */}
              <div className="space-y-1.5 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <label className="text-[0.8rem] font-bold text-gray-400 uppercase tracking-wider block">
                  Operational Governance Scope <span className="text-rose-400">*</span>
                </label>
                <select
                  value={formScopeId || ""}
                  onChange={(e) => setFormScopeId(e.target.value || null)}
                  className={`w-full h-9 px-3 rounded-xl border text-xs font-bold focus:outline-none focus:border-indigo-500/50 cursor-pointer ${
                    isLightMode ? "bg-white border-gray-300 text-gray-900" : "bg-white/5 border-white/10 text-indigo-400"
                  }`}
                  required
                >
                  <option value="e1f8e8e8-e1e1-4e1e-a1e1-e1e1e1e1e1e1" className={isLightMode ? "bg-white" : "bg-[#0A0D14]"}>[Flag 1] IT INFRASTRUCTURE</option>
                  <option value="e2f8e8e8-e2e2-4e2e-a2e2-e2e2e2e2e2e2" className={isLightMode ? "bg-white" : "bg-[#0A0D14]"}>[Flag 2] ERP / SOFTWARE</option>
                  <option value="e3f8e8e8-e3e3-4e3e-a3e3-e3e3e3e3e3e3" className={isLightMode ? "bg-white" : "bg-[#0A0D14]"}>[Flag 3] OTHERS / GENERAL</option>
                  <option value="" className={isLightMode ? "bg-white" : "bg-[#0A0D14]"}>[Flag 0] UNIVERSAL / SHARED</option>
                </select>
                <span className="text-[0.7rem] text-gray-500 block">Determines which operational flow this master record appears in.</span>
              </div>
              {/* Custom asset tags */}
              {activeTab === "assets" && (
                <div className="space-y-1.5">
                  <label className="text-[0.8rem] font-bold text-emerald-400 uppercase tracking-wider block">
                    Hardware Tag Reference ID
                  </label>
                  <AppInput 
                    placeholder="e.g. TAG-SRV-9901"
                    value={formAssetTag}
                    onChange={(e) => setFormAssetTag(e.target.value)}
                    className="font-mono text-xs uppercase"
                  />
                </div>
              )}

              {/* Submit / Action buttons */}
              <div className={`flex items-center justify-end gap-2 pt-3 border-t ${
                "border-border"
              }`}>
                <AppButton 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </AppButton>
                <AppButton 
                  type="submit" 
                  variant="primary" 
                  size="sm"
                  leftIcon={<Plus className="h-3 w-3" />}
                >
                  {editRecordId ? "Update Record" : "Save Record"}
                </AppButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
