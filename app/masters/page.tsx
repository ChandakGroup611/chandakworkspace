"use client";
import { toast } from 'react-toastify';

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppCard, AppCardHeader, AppCardTitle, AppCardContent } from "@/components/ui/AppCard";
import { executeMasterMutation } from "@/lib/actions/masters";
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
import { sanitizeErrorMessage } from "@/lib/utils";
import ChandakLoader from "@/components/ui/ChandakLoader";
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
  Clock,
  FileSpreadsheet
} from "lucide-react";
import { SystemMasterBulkImportModal } from "@/components/masters/SystemMasterBulkImportModal";

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
  { id: "erp_software_systems", table: "software_systems", scopeId: "e2f8e8e8-e2e2-4e2e-a2e2-e2e2e2e2e2e2", label: "Software system", category: "ERP", icon: Server, desc: "Internal software applications and platforms", parentTable: null, parentKey: null, parentRequired: false },
  { id: "erp_software_modules", table: "software_modules", scopeId: "e2f8e8e8-e2e2-4e2e-a2e2-e2e2e2e2e2e2", label: "Module", category: "ERP", icon: Cpu, desc: "Features within a software system", parentTable: "software_systems", parentKey: "system_id", parentRequired: true },
  { id: "erp_software_submodules", table: "software_submodules", scopeId: "e2f8e8e8-e2e2-4e2e-a2e2-e2e2e2e2e2e2", label: "Sub Module", category: "ERP", icon: Database, desc: "Specific actions inside a module", parentTable: "software_modules", parentKey: "module_id", parentRequired: true },
  { id: "erp_ticket_categories", table: "ticket_categories", scopeId: "e2f8e8e8-e2e2-4e2e-a2e2-e2e2e2e2e2e2", label: "Issue Category", category: "ERP", icon: FolderTree, desc: "Main categories for software logging", parentTable: null, parentKey: null, parentRequired: false },
  { id: "erp_ticket_subcategories", table: "ticket_subcategories", scopeId: "e2f8e8e8-e2e2-4e2e-a2e2-e2e2e2e2e2e2", label: "Issue Sub Category", category: "ERP", icon: Box, desc: "Specific software topics under each category", parentTable: "ticket_categories", parentKey: "category_id", parentRequired: true },
  { id: "erp_workflow_states", table: "status_master", scopeId: "e2f8e8e8-e2e2-4e2e-a2e2-e2e2e2e2e2e2", label: "Status", category: "ERP", icon: Activity, desc: "Application stages for software tickets", parentTable: null, parentKey: null, parentRequired: false },
  { id: "erp_master_priorities", table: "priority_master", scopeId: "e2f8e8e8-e2e2-4e2e-a2e2-e2e2e2e2e2e2", label: "Priority", category: "ERP", icon: Hash, desc: "Software priority levels and SLA resolution times", parentTable: null, parentKey: null, parentRequired: false },

  // ── FLEET Category ──
  { id: "fleet_insurance_vendors", table: "fleet_insurance_vendors", scopeId: null, label: "Insurance Vendors", category: "FLEET", icon: ShieldCheck, desc: "Motor insurance companies & underwriters for corporate vehicles", parentTable: null, parentKey: null, parentRequired: false },

  // ── USERS Category ──
  { id: "departments", table: "departments", scopeId: null, label: "Department", category: "USERS", icon: Layers, desc: "Company departments and business units", parentTable: null, parentKey: null, parentRequired: false },
  { id: "designations", table: "designations", scopeId: null, label: "Job roles", category: "USERS", icon: UsersIcon, desc: "Employee job titles and designations", parentTable: "departments", parentKey: "department_id", parentRequired: true },

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
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><ChandakLoader size="lg" title="Loading masters directory…" /></div>}>
      <MastersPageContent />
    </Suspense>
  );
}

function MastersPageContent() {
  const supabase = createClient();
  const { hasPermission, loading: permsLoading } = usePermissions();
  let isLightMode = false;
  try {
    const themeCtx = useTheme();
    isLightMode = themeCtx.isLight;
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
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
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
  const [formColor, setFormColor] = useState<string>("#808080"); // ui-audit-ignore colour-picker default must be a hex value

  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams?.get("create") === "true") {
      setShowModal(true);
    }
  }, [searchParams]);

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
    setFormColor("#808080"); // ui-audit-ignore colour-picker default must be a hex value
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
    setFormColor("#808080"); // ui-audit-ignore colour-picker default must be a hex value
    setShowModal(true);
  };

  const openEditModal = (rec: any) => {
    setEditRecordId(rec.id);
    setFormCode(rec.code || rec.status_code || rec.priority_code || "");
    setFormName(rec.name || rec.status_name || rec.priority_name || "");
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
    setFormColor(rec.status_color || rec.priority_color || "#808080"); // ui-audit-ignore colour-picker default must be a hex value
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
        const res = await executeMasterMutation(currentConfig.table, payload, "UPDATE", editRecordId);
        if (!res.success) throw new Error(res.error);

        setSuccessAlert(`Successfully updated dynamic master record '${payload.code || payload.name}'.`);
        setShowModal(false);
        setEditRecordId(null);
        setFormCode("");
        setFormName("");
        setFormDesc("");
        setFormAssetTag("");
        fetchRecords();
      } catch (err: any) {
        console.warn("Master Update intercepted by sandbox state fallback:", err);
        toast.error("Database Error on Update: " + (err.message || err.details || JSON.stringify(err)));
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
      const res = await executeMasterMutation(currentConfig.table, payload, "CREATE");
      if (!res.success) throw new Error(res.error);

      setSuccessAlert(`Successfully provisioned dynamic master record '${payload.code || payload.name}'.`);
      setShowModal(false);
      setFormCode("");
      setFormName("");
      setFormDesc("");
      setFormAssetTag("");
      fetchRecords();
    } catch (err: any) {
      console.warn("Master Creation validation intercepted:", err);
      
      // ALERTS THE ACTUAL DATABASE ERROR SO THE USER SEES IT IMMEDIATELY
      toast.error(sanitizeErrorMessage(err));

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
      const action = updatedStatus ? "ACTIVATE" : "DEACTIVATE";
      const res = await executeMasterMutation(currentConfig.table, { is_active: updatedStatus }, action, record.id);
      if (!res.success) throw new Error(res.error);

      setRecords(records.map(r => r.id === record.id ? { ...r, is_active: updatedStatus } : r));
      setSuccessAlert(`Record status successfully updated.`);
    } catch (err: any) {
      console.warn("Status toggle backend verification filtered:", err);
      toast.error(sanitizeErrorMessage(err));
    }
  };

  const handleDelete = async (record: any) => {
    setErrorAlert(null);
    try {
      const res = await executeMasterMutation(currentConfig.table, null, "DELETE", record.id, record);
      if (!res.success) throw new Error(res.error);
      
      setSuccessAlert(`Record deleted successfully.`);
      fetchRecords();
    } catch (err: any) {
      console.warn("Hard delete blocked:", err);
      toast.error(sanitizeErrorMessage(err));
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
      <div className={`h-screen flex flex-col items-center justify-center transition-colors duration-300 ${
        "bg-surface text-foreground"
      }`}>
        <ChandakLoader
          size="lg"
          title="Verifying Credentials…"
          subtitle="Securing master directory access"
        />
      </div>
    );
  }

  if (!hasPermission("SYSTEM_MASTERS_VIEW")) {
    return (
      <div className={`h-screen flex flex-col items-center justify-center space-y-4 transition-colors duration-300 ${
        "bg-surface text-foreground"
      }`}>
        <div className="p-4 rounded-full bg-danger-soft border border-danger-border text-danger-text">
          <Lock className="h-10 w-10" />
        </div>
        <h2 className="text-xl font-semibold">Access denied</h2>
      </div>
    );
  }

  return (
    <PageContainer strict={true}>
      <PageHeader
        title="Master data configuration"
        icon={<Database className="h-6 w-6" />}
        actions={
          <>
            <AppButton 
              variant="outline" 
              size="sm" 
              leftIcon={<FileSpreadsheet className="h-3.5 w-3.5 text-success-text" />}
              onClick={() => setIsImportModalOpen(true)}
              disabled={!hasPermission("MASTERS_CREATE")}
            >
              Import Excel
            </AppButton>
            <AppButton 
              variant="outline" 
              size="sm" 
              leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-accent-soft-text' : ''}`} />}
              onClick={fetchRecords}
            >
              Refresh
            </AppButton>
            <AppButton 
              variant="primary" 
              size="sm" 
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={openCreateModal}
              disabled={!hasPermission("MASTERS_CREATE")}
            >
              Add record
            </AppButton>
          </>
        }
      />

      {/* Global Event Trigger Banners */}
      {errorAlert && (
        <div className="p-4 rounded-lg bg-danger-soft border border-danger-border flex items-start gap-3 animate-in fade-in-20">
          <AlertTriangle className="h-4 w-4 text-danger-text dark:text-danger-text shrink-0 mt-0.5" />
          <div className="flex-1 text-xs text-danger-text">
            {errorAlert}
          </div>
          <AppButton aria-label="Close" variant="secondary" onClick={() => setErrorAlert(null)} className="text-muted hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </AppButton>
        </div>
      )}

      {successAlert && (
        <div className="p-4 rounded-lg bg-success-soft border border-success-border flex items-center justify-between text-xs text-success-text animate-in fade-in-20">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success-text dark:text-success-text" />
            <span>{successAlert}</span>
          </div>
          <AppButton aria-label="Close" variant="secondary" onClick={() => setSuccessAlert(null)} className="text-muted hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </AppButton>
        </div>
      )}

      {/* Central Columns Workspace Framework */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 overflow-hidden">
        {/* Mobile Navigation Controller (<1024px) */}
        <div className="block lg:hidden space-y-3">
          <div className="p-1 rounded-lg grid grid-cols-3 sm:grid-cols-6 gap-1 text-xs font-semibold tracking-tight bg-sunken text-muted">
            {[
              { id: "ALL", label: "All" },
              { id: "IT INFRA", label: "IT Infra" },
              { id: "ERP", label: "Software" },
              { id: "FLEET", label: "Fleet" },
              { id: "USERS", label: "Users" },
              { id: "OTHERS", label: "Other" }
            ].map(tier => {
              const isSelected = activeCategoryFilter === tier.id;
              return (
                <AppButton variant="secondary"
                  key={tier.id}
                  type="button"
                  onClick={() => {
                    setActiveCategoryFilter(tier.id);
                    if (tier.id !== "ALL") {
                      const firstItem = MASTER_TABLES.find(t => t.category === tier.id);
                      if (firstItem) setActiveTab(firstItem.id);
                    }
                  }}
                  className={`py-1.5 px-2 rounded-lg text-center transition-all truncate text-xs ${
                    isSelected
                      ? "bg-surface text-accent-soft-text shadow-sm ring-1 ring-border/50 font-semibold"
                      : "hover:text-foreground hover:bg-surface/50"
                  }`}
                >
                  {tier.label}
                </AppButton>
              );
            })}
          </div>

          <div className="relative">
            <select
              value={activeTab}
              onChange={(e) => {
                setActiveTab(e.target.value);
                setSearchQuery("");
              }}
              className="w-full text-xs font-semibold p-2.5 rounded-lg border border-border bg-surface text-foreground focus:ring-2 focus:ring-ring outline-none cursor-pointer"
            >
              {MASTER_TABLES.filter(t => activeCategoryFilter === "ALL" || t.category === activeCategoryFilter).map(tab => (
                <option key={tab.id} value={tab.id}>
                  [{tab.category}] {tab.label} — {tab.desc}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Desktop Left Column Span 4: Navigational Tab Controller (>=1024px) */}
        <div className="hidden lg:flex lg:col-span-4 space-y-4 flex-col min-h-0">
          <AppCard className="flex-1 p-4 space-y-4 flex flex-col min-h-0 overflow-hidden border-none shadow-none bg-surface/50">
            
            {/* Category Tier Selector Tabs */}
            <div className={`p-1 rounded-lg grid grid-cols-2 sm:grid-cols-3 gap-1 text-xs font-semibold tracking-tight ${
              "bg-sunken text-muted"
            }`}>
              {[
                { id: "ALL", label: "All configs" },
                { id: "IT INFRA", label: "IT Infra" },
                { id: "ERP", label: "Software" },
                { id: "FLEET", label: "Fleet" },
                { id: "USERS", label: "Users" },
                { id: "OTHERS", label: "Other" }
              ].map(tier => {
                const isSelected = activeCategoryFilter === tier.id;
                return (
                  <AppButton variant="secondary"
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
                    className={`py-1.5 px-2 rounded-lg text-center transition-all truncate ${
                      isSelected
                        ? ("bg-surface text-accent-soft-text shadow-sm ring-1 ring-border/50")
                        : ("hover:text-foreground hover:bg-surface/50")
                    }`}
                  >
                    {tier.label}
                  </AppButton>
                );
              })}
            </div>

            <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin">
              {(["IT INFRA", "ERP", "FLEET", "USERS", "OTHERS"] as const).map((groupCategory) => {
                // If activeCategoryFilter is not "ALL", only show the requested tier
                if (activeCategoryFilter !== "ALL" && groupCategory !== activeCategoryFilter) return null;

                const groupItems = MASTER_TABLES.filter(t => t.category === groupCategory);
                if (groupItems.length === 0) return null;

                return (
                  <div key={groupCategory} className="space-y-1.5 mb-4">
                    <div className="flex items-center gap-2 px-1 pb-1">
                      <span className={`text-[11px] font-semibold ${
                        "text-accent-soft-text opacity-80"
                      }`}>
                        {groupCategory}
                      </span>
                    </div>

                    {groupItems.map((tab) => {
                      const IconComponent = tab.icon;
                      const isActive = activeTab === tab.id;
                      return (
                        <AppButton variant="secondary"
                          key={tab.id}
                          type="button"
                          onClick={() => {
                            setActiveTab(tab.id);
                            setSearchQuery("");
                          }}
                          className={`w-full p-3 rounded-lg border text-left transition-all duration-300 cursor-pointer flex items-start gap-3 group relative overflow-hidden ${
                            isActive 
                              ? "theme-card-structural border-border-active ring-1 ring-ring" 
                              : "bg-surface/40 border-transparent hover:bg-elevated hover:border-border/40 hover:shadow-sm"
                          }`}
                        >
                          {isActive && (
                            <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-theme-btn-primary to-theme-btn-secondary" />
                          )}
                          <div className={`p-2.5 rounded-lg mt-0.5 transition-colors ${
                            isActive 
                              ? "bg-accent-soft text-accent-soft-text" 
                              : "bg-sunken text-muted group-hover:text-foreground group-hover:bg-surface"
                          }`}>
                            <IconComponent className="h-4 w-4 shrink-0" />
                          </div>
                          <div className="space-y-1 flex-1 min-w-0 pr-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className={`text-[13px] font-semibold tracking-tight truncate block ${
                                isActive ? "text-foreground" : "text-muted group-hover:text-foreground"
                              }`}>
                                {tab.label}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted font-medium line-clamp-2 leading-relaxed opacity-80">{tab.desc}</p>
                            {tab.parentTable && (
                              <span className={`text-[11px] font-mono px-1.5 py-0.5 rounded-md border inline-flex items-center gap-1 mt-1.5 transition-colors ${
                                isActive
                                  ? "text-accent-soft-text bg-accent-soft border-border-active"
                                  : "text-muted bg-surface/50 border-border"
                              }`}>
                                <div className="w-1 h-1 rounded-full bg-current opacity-50" />
                                Depends on {tab.parentTable}
                              </span>
                            )}
                          </div>
                        </AppButton>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </AppCard>

        </div>

        {/* Right Column Span 8: Table Data Inspector */}
        <div className="lg:col-span-8 flex flex-col min-h-0 space-y-4">
          <AppCard className={`flex-1 flex flex-col justify-between overflow-hidden shadow-lg ${
            "border-border"
          }`}>
            {/* Unified Filter Box Header */}
            <div className="bg-surface dark:bg-surface/5 p-4 flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-foreground tracking-tight">
                    {currentConfig.label}
                  </h2>
                  <AppBadge variant="info" className="font-mono text-[11px] border border-border-active">
                    {activeTab.replace(/_/g, ' ')}
                  </AppBadge>
                </div>
                
                {/* Dynamic Quick Text Search bar */}
                <div className="w-full sm:w-64">
                  <AppInput 
                    placeholder="Search records…" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    leftIcon={<Search className="h-4 w-4 text-muted" />}
                    className="w-full h-9 bg-sunken border-none"
                  />
                </div>
              </div>
            </div>

            {/* Table / Mobile Cards Output Array Container */}
            <div className="p-4 flex-1 overflow-y-auto">
              {loading ? (
                <div className="py-16 flex flex-col items-center justify-center">
                  <ChandakLoader
                    size="md"
                    title="Loading master catalogue…"
                    subtitle="Resolving normalized records live from database schema"
                  />
                </div>
              ) : (
                <>
                  {records.length === 0 ? (
                    <div className="py-20 px-6 text-center flex flex-col items-center justify-center relative overflow-hidden rounded-lg theme-card-structural border border-border-active bg-surface/30 group">
                      <div className="absolute inset-0 bg-gradient-to-br from-theme-btn-primary/5 via-transparent to-theme-accent-raw/5 opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="relative z-10 space-y-6 flex flex-col items-center">
                        <div className="h-16 w-16 rounded-lg bg-gradient-to-br from-theme-btn-primary/20 to-theme-btn-primary/5 border border-border-active flex items-center justify-center group- transition-shadow duration-500">
                          <span className="text-2xl font-semibold text-accent-soft-text">!</span>
                        </div>
                        <div className="space-y-2 max-w-md">
                          <h4 className="text-lg font-semibold text-foreground tracking-tight">No master data configured</h4>
                          <p className="text-sm text-muted leading-relaxed">
                            No operational items are currently defined in this directory. Add your first record to make it available for workspace selection.
                          </p>
                        </div>
                        <AppButton 
                          variant="primary" 
                          size="md" 
                          leftIcon={<Plus className="h-4 w-4" />}
                          onClick={openCreateModal}
                          className=" transition-all duration-300"
                        >
                          Create initial record
                        </AppButton>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Mobile Card List (<1024px) */}
                      <div className="block lg:hidden space-y-3">
                        {filteredDataset.map((rec) => (
                          <div 
                            key={rec.id}
                            className="rounded-lg border border-border bg-surface/90 p-4 shadow-xs hover:border-border-active transition-all space-y-3 relative"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-xs font-semibold text-accent-soft-text bg-accent-soft px-2 py-0.5 rounded-md shrink-0">
                                {rec.code}
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <AppButton variant="secondary"
                                  type="button"
                                  onClick={() => toggleActive(rec)}
                                  disabled={!hasPermission("MASTERS_UPDATE")}
                                  className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                                    rec.is_active 
                                      ? "bg-success-soft border-success-border text-success-text hover:bg-success-soft"
                                      : "bg-elevated border-border text-muted line-through hover:bg-elevated"
                                  }`}
                                >
                                  {rec.is_active ? "Active" : "Disabled"}
                                </AppButton>
                              </div>
                            </div>

                            <div>
                              <h4 className="text-sm font-semibold text-foreground">
                                {rec.name}
                              </h4>
                              {rec.description && (
                                <p className="text-xs text-muted mt-0.5 line-clamp-2">
                                  {rec.description}
                                </p>
                              )}
                            </div>

                            {/* Additional metadata tags if available */}
                            <div className="flex items-center gap-2 text-xs text-muted flex-wrap">
                              {currentConfig.parentTable && (
                                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded border text-accent-soft-text bg-accent-soft border-border-active">
                                  Parent: {parentOptions.find((p: any) => p.id === rec[currentConfig.parentKey!])?.name || parentOptions.find((p: any) => p.id === rec[currentConfig.parentKey!])?.code || "Unmapped"}
                                </span>
                              )}
                              {activeTab === "master_priorities" && rec.max_sla_hours !== undefined && (
                                <span className="text-[11px] font-semibold text-warning-text bg-warning-soft px-2 py-0.5 rounded flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> {rec.max_sla_hours * 60}m SLA
                                </span>
                              )}
                              {activeTab === "assets" && rec.asset_tag && (
                                <span className="text-[11px] font-mono font-semibold text-success-text bg-success-soft px-2 py-0.5 rounded">
                                  Tag: {rec.asset_tag}
                                </span>
                              )}
                            </div>

                            {/* Bottom Row: Actions */}
                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40 text-xs">
                              <AppButton variant="secondary"
                                type="button"
                                onClick={() => openEditModal(rec)}
                                disabled={!hasPermission("MASTERS_UPDATE")}
                                className="px-2.5 py-1 rounded-lg border text-xs text-accent-soft-text bg-surface hover:bg-elevated border-border"
                              >
                                <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                              </AppButton>
                              <AppButton variant="secondary"
                                type="button"
                                onClick={() => handleDelete(rec)}
                                disabled={!hasPermission("MASTERS_DELETE")}
                                className="px-2.5 py-1 rounded-lg border text-xs text-danger-text bg-surface hover:bg-danger-soft border-border"
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                              </AppButton>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Desktop Table View (>=1024px) */}
                      <div className="hidden lg:block">
                        <AppTableContainer>
                          <AppTable>
                            <AppTableHeader>
                              <tr>
                                <AppTableHead>Short code</AppTableHead>
                                <AppTableHead>Display name</AppTableHead>
                                {currentConfig.parentTable && (
                                  <AppTableHead>Parent link</AppTableHead>
                                )}
                                {activeTab === "master_priorities" && (
                                  <AppTableHead>SLA target</AppTableHead>
                                )}
                                {activeTab === "assets" && (
                                  <AppTableHead>Asset tag</AppTableHead>
                                )}
                                {activeTab === "workflow_states" && (
                                  <AppTableHead>Module scope</AppTableHead>
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
                                      <span className={`font-mono text-xs font-semibold block text-accent-soft-text`}>{rec.code}</span>
                                    </div>
                                  </AppTableCell>
                                  <AppTableCell>
                                    <div className="space-y-0.5">
                                      <div className="flex items-center gap-2">
                                        <span className={`font-semibold text-xs block ${"text-foreground"}`}>{rec.name}</span>
                                        <span className={`text-[0.65rem] font-semibold px-1 rounded border tracking-tighter ${
                                          rec.scope_id === 'e2f8e8e8-e2e2-4e2e-a2e2-e2e2e2e2e2e2'
                                            ? "text-accent-soft-text border-border-active bg-accent-soft"
                                            : rec.scope_id === 'e3f8e8e8-e3e3-4e3e-a3e3-e3e3e3e3e3e3'
                                            ? "text-warning-text border-warning-border bg-warning-soft"
                                            : "text-accent-soft-text border-border-active bg-accent-soft"
                                        }`}>
                                          {rec.scope_id === 'e2f8e8e8-e2e2-4e2e-a2e2-e2e2e2e2e2e2'
                                            ? "FLAG 2 (ERP)"
                                            : rec.scope_id === 'e3f8e8e8-e3e3-4e3e-a3e3-e3e3e3e3e3e3'
                                            ? "FLAG 3 (OTHERS)"
                                            : "FLAG 1 (INFRA)"}
                                        </span>
                                      </div>
                                      {rec.description && (
                                        <span className={`text-xs block whitespace-normal break-words text-muted`}>{rec.description}</span>
                                      )}
                                    </div>
                                  </AppTableCell>

                                  {/* Dynamic Render based on specific column mappings */}
                                  {currentConfig.parentTable && (
                                    <AppTableCell>
                                      <span className={`text-xs font-mono font-medium px-2 py-0.5 rounded border inline-block whitespace-normal break-words ${
                                        "text-accent-soft-text bg-accent-soft border-border-active"
                                      }`} title={rec[currentConfig.parentKey!]}>
                                        {parentOptions.find((p: any) => p.id === rec[currentConfig.parentKey!])?.name || 
                                         parentOptions.find((p: any) => p.id === rec[currentConfig.parentKey!])?.code || 
                                         rec[currentConfig.parentKey!] || "Unmapped"}
                                      </span>
                                    </AppTableCell>
                                  )}

                                  {activeTab === "master_priorities" && (
                                    <AppTableCell>
                                      {rec.max_sla_hours !== undefined ? (
                                        <div className="flex items-center gap-2">
                                          <div className={`p-1 rounded-md bg-warning-soft`}>
                                            <Clock className="h-3 w-3 text-warning-text" />
                                          </div>
                                          <span className="font-semibold">{rec.max_sla_hours * 60}m target</span>
                                          <div className="flex gap-2 text-[0.65rem] opacity-60 font-semibold tracking-tighter">
                                            <span>Min: {rec.min_sla_hours || 0}h</span>
                                            <span>Max: {rec.max_sla_hours || 0}h</span>
                                          </div>
                                        </div>
                                      ) : (
                                        <span className="text-muted">-</span>
                                      )}
                                    </AppTableCell>
                                  )}

                                  {activeTab === "assets" && (
                                    <AppTableCell>
                                      <span className={`text-xs font-mono font-semibold text-success-text`}>
                                        {rec.asset_tag}
                                      </span>
                                    </AppTableCell>
                                  )}

                                  {activeTab === "workflow_states" && (
                                    <AppTableCell>
                                      <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded border ${
                                        "text-accent-soft-text bg-accent-soft border-border-active"
                                      }`}>
                                        {(rec.module || "Universal").replace(/_/g, ' ')}
                                      </span>
                                    </AppTableCell>
                                  )}

                                  <AppTableCell className="text-center">
                                    <AppButton variant="secondary"
                                      type="button"
                                      onClick={() => toggleActive(rec)}
                                      disabled={!hasPermission("MASTERS_UPDATE")}
                                      className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                                        rec.is_active 
                                          ? ("bg-success-soft border-success-border text-success-text hover:bg-success-soft")
                                          : ("bg-elevated border-border text-muted line-through hover:bg-elevated")
                                      }`}
                                    >
                                      {rec.is_active ? "Active" : "Disabled"}
                                    </AppButton>
                                  </AppTableCell>

                                  <AppTableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <AppButton aria-label="Edit record details" variant="secondary"
                                        type="button"
                                        onClick={() => openEditModal(rec)}
                                        disabled={!hasPermission("MASTERS_UPDATE")}
                                        className={`p-1.5 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                          "bg-surface border-border text-muted hover:text-accent-soft-text hover:border-border-active"
                                        }`}
                                        title="Edit record details"
                                      >
                                        <Edit className="h-3.5 w-3.5" />
                                      </AppButton>
                                      <AppButton aria-label="Delete record" variant="secondary"
                                        type="button"
                                        onClick={() => handleDelete(rec)}
                                        disabled={!hasPermission("MASTERS_DELETE")}
                                        className={`p-1.5 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                          "bg-surface border-border text-muted hover:text-danger-text hover:border-danger-border"
                                        }`}
                                        title="Delete record"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </AppButton>
                                    </div>
                                  </AppTableCell>
                                </AppTableRow>
                              ))}
                            </AppTableBody>
                          </AppTable>
                        </AppTableContainer>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Pagination / Context Footer */}
            <div className="p-4 bg-surface/[0.005] border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-3 w-3 text-success-text shrink-0" />
                <span>Auditing active: all status updates automatically export JSONB snapshots.</span>
              </div>
              <span className="text-muted font-mono">Visible entities: {filteredDataset.length} of {records.length}</span>
            </div>
          </AppCard>
        </div>
      </div>

      {/* ── Dynamic Overlay Append Modal ── */}
      {showModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center px-4 p-4 overflow-y-auto"
          style={{ backgroundColor: "var(--overlay)" }}
           role="presentation" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl theme-card-structural border border-border animate-in fade-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-5 border-b border-border bg-surface/80">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-foreground tracking-tight flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  {editRecordId ? "Edit Details:" : "Add New"} {currentConfig.label}
                </h3>
                <p className="text-xs text-muted font-medium">
                  {editRecordId ? "Modify specific attributes of this pre-existing record." : "Enter the specific details to create this record in the company directory."}
                </p>
              </div>
              <AppButton aria-label="Close" variant="secondary" 
                type="button" 
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg bg-sunken hover:bg-elevated border-transparent hover:border-border transition-all text-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </AppButton>
            </div>

            {/* Input elements form */}
            <form onSubmit={handleCreate} className="p-6 space-y-6">
              {/* Code */}
              <div className="space-y-1.5">
                <label className="text-[0.8rem] font-semibold text-muted block">
                  Short code <span className="text-danger-text">*</span>
                </label>
                <AppInput 
                  placeholder="e.g. SEC_INC"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  className="font-mono text-xs"
                  required
                />
                <span className="text-[0.7rem] text-muted block">A unique short abbreviation used to quickly reference this item.</span>
              </div>

              {/* Full Display Name */}
              <div className="space-y-1.5">
                <label className="text-[0.8rem] font-semibold text-muted block">
                  Display name <span className="text-danger-text">*</span>
                </label>
                <AppInput 
                  placeholder="e.g. Security incident"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>

              {/* Description Context */}
              <div className="space-y-1.5">
                <label className="text-[0.8rem] font-semibold text-muted block">
                  Description & internal notes
                </label>
                <textarea 
                  placeholder="Provide helpful context or guidelines for your team…"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  rows={2}
                  className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:border-border-active resize-none transition-all ${
                    "bg-surface border-border text-foreground"
                  }`}
                />
              </div>

              {/* Color Assignment */}
              {(currentConfig.table === "status_master" || currentConfig.table === "priority_master") && (
                <div className="space-y-1.5">
                  <label className="text-[0.8rem] font-semibold text-muted block">
                    Display colour <span className="text-danger-text">*</span>
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
                      className="font-mono text-xs w-32"
                    />
                  </div>
                  <span className="text-[0.7rem] text-muted block">Globally used to style this tag across all dashboards and boards.</span>
                </div>
              )}

              {/* Conditional Cascading Mapping dropmenus */}
              {currentConfig.parentTable && (
                <div className="space-y-1.5">
                  <label className="text-[0.8rem] font-semibold text-accent-soft-text block">
                    Parent record link <span className="text-danger-text">*</span>
                  </label>
                  <select
                    value={formParentId}
                    onChange={(e) => setFormParentId(e.target.value)}
                    className={`w-full h-9 px-3 rounded-lg border text-xs focus:outline-none focus:border-border-active cursor-pointer ${
                      "bg-surface border-border text-foreground"
                    }`}
                    required={currentConfig.parentRequired}
                  >
                    {!currentConfig.parentRequired && <option value="" className={"bg-surface text-muted"}>Optional (Global Scope)</option>}
                    {parentOptions.length === 0 ? (
                      currentConfig.parentRequired && <option value="" className="bg-surface text-muted">No available parent records</option>
                    ) : (
                      parentOptions.map(p => (
                        <option key={p.id} value={p.id} className={"bg-surface text-foreground"}>
                          {p.code} — {p.name}
                        </option>
                      ))
                    )}
                  </select>
                  <span className="text-[0.7rem] text-muted block">Select the top-level parent record this item falls under.</span>
                </div>
              )}

              {/* Target SLA target minutes input */}
              {currentConfig.table === "master_priorities" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 rounded-lg border border-success-border bg-success-soft">
                  <div className="space-y-1.5">
                    <label className="text-[0.8rem] font-semibold text-success-text block">
                      Min time (mins)
                    </label>
                    <AppInput 
                      type="number" 
                      value={formSlaMin}
                      onChange={(e) => setFormSlaMin(Number(e.target.value))}
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[0.8rem] font-semibold text-success-text block">
                      Standard time (mins)
                    </label>
                    <AppInput 
                      type="number" 
                      value={formSlaStandard}
                      onChange={(e) => setFormSlaStandard(Number(e.target.value))}
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[0.8rem] font-semibold text-success-text block">
                      Max time (mins)
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
              <div className="space-y-1.5 p-3 rounded-lg bg-surface/[0.02] border border-border">
                <label className="text-[0.8rem] font-semibold text-muted block">
                  Operational governance scope <span className="text-danger-text">*</span>
                </label>
                <select
                  value={formScopeId || ""}
                  onChange={(e) => setFormScopeId(e.target.value || null)}
                  className={`w-full h-9 px-3 rounded-lg border text-xs font-semibold focus:outline-none focus:border-border-active cursor-pointer ${
                    "bg-surface border-border text-foreground"
                  }`}
                  required
                >
                  <option value="e1f8e8e8-e1e1-4e1e-a1e1-e1e1e1e1e1e1" className={"bg-surface"}>[Flag 1] IT INFRASTRUCTURE</option>
                  <option value="e2f8e8e8-e2e2-4e2e-a2e2-e2e2e2e2e2e2" className={"bg-surface"}>[Flag 2] ERP / SOFTWARE</option>
                  <option value="e3f8e8e8-e3e3-4e3e-a3e3-e3e3e3e3e3e3" className={"bg-surface"}>[Flag 3] OTHERS / GENERAL</option>
                  <option value="" className={"bg-surface"}>[Flag 0] UNIVERSAL / SHARED</option>
                </select>
                <span className="text-[0.7rem] text-muted block">Determines which operational flow this master record appears in.</span>
              </div>
              {/* Custom asset tags */}
              {activeTab === "assets" && (
                <div className="space-y-1.5">
                  <label className="text-[0.8rem] font-semibold text-success-text block">
                    Hardware tag reference ID
                  </label>
                  <AppInput 
                    placeholder="e.g. TAG-SRV-9901"
                    value={formAssetTag}
                    onChange={(e) => setFormAssetTag(e.target.value)}
                    className="font-mono text-xs"
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
                  className="text-danger-text border-danger-border hover:bg-danger-soft hover:border-danger hover:text-danger-text"
                >
                  Discard
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

      {/* Bulk Excel Import Modal */}
      <SystemMasterBulkImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        masterTables={MASTER_TABLES}
        initialTabId={activeTab}
        existingRecords={records}
        onSuccess={fetchRecords}
      />
    </PageContainer>
  );
}

