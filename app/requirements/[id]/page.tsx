"use client";

import React, { useState, useEffect } from "react";
import { AppCard, AppCardHeader, AppCardTitle, AppCardContent } from "@/components/ui/AppCard";
import { AppTable, AppTableHeader, AppTableRow, AppTableHead, AppTableBody, AppTableCell } from "@/components/ui/AppTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { AppBadge } from "@/components/ui/AppBadge";
import { Users, Plus, RefreshCw, ArrowLeft, ShieldAlert, Trash2, Paperclip, Eye, Download, CheckCircle, PauseCircle, XCircle, FilePlus, Save, Edit2, AlertTriangle, Briefcase, Server, Calendar, Shield, Clock, FileText, Target, Hourglass, ChevronDown, ChevronRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { PageContainer } from "@/components/layout/PageContainer";
import { usePermissions } from "@/hooks/usePermissions";
import Link from "next/link";
import TaskCreationWizard from "@/components/tasks/TaskCreationWizard";
import dynamic from "next/dynamic";
import SafeHtml from "@/components/ui/SafeHtml";
import { sanitizeErrorMessage } from "@/lib/utils";
const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });
import 'react-quill-new/dist/quill.snow.css';

const RichTextEditor = ({ value, onChange, readOnly = false, placeholder = "" }: { value: string, onChange: (val: string) => void, readOnly?: boolean, placeholder?: string }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="p-4 border rounded-xl animate-pulse bg-surface dark:bg-elevated/40 h-32 text-xs font-semibold text-muted flex items-center justify-center">Loading editor...</div>;
  }

  return (
    <div className="quill-wrapper rounded-xl border border-border/60 bg-surface dark:bg-[#0B0F19] text-foreground overflow-hidden shadow-xs">
      <style>{`
        .quill-wrapper .ql-toolbar.ql-snow {
          border: none;
          border-bottom: 1px solid rgba(156, 163, 175, 0.2);
          background: rgba(243, 244, 246, 0.5);
          border-top-left-radius: 0.75rem;
          border-top-right-radius: 0.75rem;
        }
        .dark .quill-wrapper .ql-toolbar.ql-snow {
          background: rgba(17, 24, 39, 0.8);
        }
        .dark .quill-wrapper .ql-stroke {
          stroke: #9CA3AF !important;
        }
        .dark .quill-wrapper .ql-fill {
          fill: #9CA3AF !important;
        }
        .dark .quill-wrapper .ql-picker {
          color: #9CA3AF !important;
        }
        .dark .quill-wrapper .ql-picker-options {
          background-color: #1F2937 !important;
          border-color: #374151 !important;
        }
        .quill-wrapper .ql-container.ql-snow {
          border: none;
          min-height: 110px;
          font-size: 0.875rem;
        }
        .quill-wrapper .ql-editor {
          min-height: 110px;
        }
      `}</style>
      <ReactQuill 
        theme="snow" 
        value={value} 
        onChange={onChange}
        readOnly={readOnly}
        placeholder={placeholder}
        modules={{
          toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            ['clean']
          ]
        }}
      />
    </div>
  );
};

export default function RequirementAnalyzePage({ params }: { params: Promise<{ id: string }> }) {
  const [reqId, setReqId] = useState<string>("");
  const router = useRouter();
  const supabase = createClient();
  
  useEffect(() => {
    if (params && typeof (params as any).then === 'function') {
      (params as any).then((p: any) => setReqId(p.id));
    } else {
      setReqId((params as any).id);
    }
  }, [params]);
  
  const [requirement, setRequirement] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [currentUserDepartmentId, setCurrentUserDepartmentId] = useState<string | null>(null);
  const [isCurrentApprover, setIsCurrentApprover] = useState(false);
  const [approvalRemarks, setApprovalRemarks] = useState("");
  const [savingApproval, setSavingApproval] = useState(false);
  const [showTaskWizard, setShowTaskWizard] = useState(false);
  const { hasPermission } = usePermissions();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || "details");

  useEffect(() => {
    if (requirement && isSuperAdmin && (requirement.approval_status === 'Pending' || requirement.approval_status === 'Draft' || !requirement.approval_status) && !searchParams.get('tab')) {
      setActiveTab("analysis");
    }
  }, [requirement, isSuperAdmin, searchParams]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [showRemarksHistory, setShowRemarksHistory] = useState(false);
  const [approvalFlow, setApprovalFlow] = useState<any[]>([]);
  const [linkedTasks, setLinkedTasks] = useState<any[]>([]);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [subWorkspaces, setSubWorkspaces] = useState<any[]>([]);
  const [showWorkspaceSelector, setShowWorkspaceSelector] = useState(false);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");
  const [selectedSubWorkspaceId, setSelectedSubWorkspaceId] = useState<string>("");

  const [showPutToUseDialog, setShowPutToUseDialog] = useState(false);
  const [putToUseDate, setPutToUseDate] = useState("");
  const [submittingPutToUse, setSubmittingPutToUse] = useState(false);
  const [showReadyNotification, setShowReadyNotification] = useState(false);
  const [isRemarksHistoryMinimized, setIsRemarksHistoryMinimized] = useState(true);

  const [showAmendmentDialog, setShowAmendmentDialog] = useState(false);
  const [amendmentDetails, setAmendmentDetails] = useState("");
  const [needsReapproval, setNeedsReapproval] = useState(false);
  const [submittingAmendment, setSubmittingAmendment] = useState(false);
  const [amendmentFile, setAmendmentFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    objective: "",
    business_impact: "",
    business_value_id: "",
    business_criticality_id: "",
    functional_scope: "",
    technical_scope: "",
    budget_impact: "",
    estimated_effort: "",
    estimated_cost: "",
    estimated_resources: "",
    dependency_notes: "",
    start_date: "",
    due_date: "",
    expected_completion_date: "",
    requirement_type_id: "",
    impacted_departments: [] as string[],
    department_approvers: {} as Record<string, string[]>,
    analysis_remarks: ""
  });

  const [masters, setMasters] = useState<any>({
    departments: [],
    issue_types: [],
    priority_master: [],
    users: [],
    business_values: []
  });

  const [showAddMasterModal, setShowAddMasterModal] = useState(false);
  const [masterModalType, setMasterModalType] = useState<"issue_type" | "business_value">("issue_type");
  const [newMasterName, setNewMasterName] = useState("");
  const [isAddingMaster, setIsAddingMaster] = useState(false);

  // reqId is derived directly from params, no need for effect

  useEffect(() => {
    const fetchUserRole = async () => {
       const { data: { user } } = await supabase.auth.getUser();
       if (!user) return;
       const { data: userRoles } = await supabase
         .from('user_roles')
         .select('roles(code)')
         .eq('user_id', user.id);
       
       const { data: userData } = await supabase.from('user_master').select('department_id, role:roles(code)').eq('id', user.id).single();

       const primaryRoleCode = (userData as any)?.role?.code;
       
       const isSuper = primaryRoleCode === 'SUPER_ADMIN' || primaryRoleCode === 'ROLE_SUPER_ADMIN' || 
                       (userRoles?.some((ur: any) => ur.roles?.code === 'SUPER_ADMIN' || ur.roles?.code === 'ROLE_SUPER_ADMIN') ?? false);
       
       const isAdminRole = primaryRoleCode === 'ADMIN_ROLE' || primaryRoleCode === 'ROLE_ADMIN' || 
                           (userRoles?.some((ur: any) => ur.roles?.code === 'ADMIN_ROLE' || ur.roles?.code === 'ROLE_ADMIN') ?? false);
       
       setIsAdmin(isSuper || isAdminRole);
       setIsSuperAdmin(isSuper);
       setCurrentUserId(user.id);

       if (userData) {
           setCurrentUserDepartmentId(userData.department_id);
       }
    };
    fetchUserRole();
  }, []);

  useEffect(() => {
    if (requirement && currentUserId) {
       const pendingFlows = approvalFlow.filter(f => f.status === 'Pending');
       const isApproverInFlow = pendingFlows.some(f => f.approver_id === currentUserId);
       
       const isExplicitApprover = requirement.current_assignee_id === currentUserId || (currentUserDepartmentId && requirement.current_assignee_id === currentUserDepartmentId) || isApproverInFlow;
       const isApproverCtx = isExplicitApprover || isAdmin || isSuperAdmin;
       
       if (approvalFlow.length === 0) {
         setIsCurrentApprover(false);
       } else if (requirement.approval_status === 'Pending SignOff') {
         setIsCurrentApprover(isAdmin || isSuperAdmin);
       } else {
         setIsCurrentApprover(!!isApproverCtx && (requirement.approval_status === 'Pending' || requirement.approval_status === 'Pending Approval'));
       }
    }
  }, [requirement, currentUserId, currentUserDepartmentId, isAdmin, isSuperAdmin, approvalFlow]);

  const loadData = async () => {
    if (!reqId) return;
    setLoading(true);
    try {
      const { fetchRequirement } = await import("@/lib/actions/requirements");
      const data = await fetchRequirement(reqId);
      setRequirement(data);
      if (data) {
        setFormData({
          objective: data.objective || "",
          business_impact: data.business_impact || "",
          business_value_id: data.custom_fields?.business_value || "",
          business_criticality_id: data.business_criticality_id || "",
          functional_scope: data.functional_scope || "",
          technical_scope: data.technical_scope || "",
          budget_impact: data.budget_impact || "",
          estimated_effort: data.estimated_effort || "",
          estimated_cost: data.estimated_cost || "",
          estimated_resources: data.estimated_resources || "",
          dependency_notes: data.dependency_notes || "",
          start_date: data.start_date ? data.start_date.split('T')[0] : "",
          due_date: data.due_date ? data.due_date.split('T')[0] : "",
          expected_completion_date: data.expected_completion_date ? data.expected_completion_date.split('T')[0] : "",
          requirement_type_id: data.requirement_type_id || "",
          impacted_departments: data.custom_fields?.impacted_departments || [],
          department_approvers: data.custom_fields?.department_approvers || {},
          analysis_remarks: ""
        });

        const { fetchAttachments } = await import("@/lib/actions/attachments");
        const attRes = await fetchAttachments('requirement', data.id);
        
        const { data: approvalFlow } = await supabase
        .from('requirement_approval_flow')
        .select('*, approver:user_master!requirement_approval_flow_approver_id_fkey(id, full_name, role:user_roles(role_master(role_name))), department:departments!requirement_approval_flow_department_id_fkey(name)')
        .eq('requirement_id', reqId)
        .order('level', { ascending: true });
        
        setApprovalFlow(approvalFlow || []);
        setAttachments(attRes || []);
      }

      // Fetch audit logs
      try {
        const { fetchRequirementAuditLogs } = await import("@/lib/actions/requirements");
        const logs = await fetchRequirementAuditLogs(reqId);
        setAuditLogs(logs || []);
      } catch(e) {
        console.error("Failed to fetch audit logs", e);
      }

      // Fetch approval flow
      try {
        const { fetchRequirementApprovalFlow } = await import("@/lib/actions/requirements");
        const flow = await fetchRequirementApprovalFlow(reqId);
        setApprovalFlow(flow || []);
      } catch(e) {
        console.error("Failed to fetch approval flow", e);
      }

      // Fetch workspaces, subWorkspaces, and linked tasks
      try {
        const { fetchLinkedTasks } = await import("@/lib/actions/requirements");
        const lTasks = await fetchLinkedTasks(reqId);
        setLinkedTasks(lTasks || []);
        
        const wsRes = await supabase.from('workspaces').select('id, workspace_name, parent_workspace_id').eq('is_deleted', false);
        const allWs = wsRes.data || [];
        setWorkspaces(allWs.filter((w: any) => !w.parent_workspace_id));
        setSubWorkspaces(allWs.filter((w: any) => w.parent_workspace_id));
      } catch(e) {
        console.error("Failed to fetch workspaces or linked tasks", e);
      }

      const scopeMap: Record<string, string> = {
        'IT INFRA': 'e1f8e8e8-e1e1-4e1e-a1e1-e1e1e1e1e1e1',
        'ERP/SOFTWARE': 'e2f8e8e8-e2e2-4e2e-a2e2-e2e2e2e2e2e2',
        'OTHERS': 'e3f8e8e8-e3e3-4e3e-a3e3-e3e3e3e3e3e3'
      };
      const scopeIdToUse = data?.scope ? scopeMap[data.scope] : null;
      let priQuery = supabase.from('priority_master').select('id, name:priority_name').eq('is_deleted', false);
      if (scopeIdToUse) {
        priQuery = priQuery.eq('scope_id', scopeIdToUse);
      } else {
        priQuery = priQuery.is('scope_id', null);
      }

      let issueQuery = supabase.from('issue_types').select('id, name').eq('is_deleted', false);
      if (scopeIdToUse) {
        issueQuery = issueQuery.eq('scope_id', scopeIdToUse);
      } else {
        issueQuery = issueQuery.is('scope_id', null);
      }

      const [deptRes, issueRes, priRes, userRes, bvRes] = await Promise.all([
        supabase.from('departments').select('id, name').eq('is_deleted', false),
        issueQuery,
        priQuery,
        supabase.from('user_master').select('id, full_name, department_id, email, designation_id').eq('is_active', true).eq('is_deleted', false),
        supabase.from('business_values').select('id, name').eq('is_deleted', false).order('name')
      ]);

      setMasters({
        departments: deptRes.data || [],
        issue_types: issueRes.data || [],
        priority_master: priRes.data || [],
        users: userRes.data || [],
        business_values: bvRes.data || []
      });
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load requirement details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [reqId]);

  useEffect(() => {
    if (requirement?.approval_status === 'Ready to Put to Use') {
      const notifiedKey = `req-ready-notified-${requirement.id}`;
      if (!localStorage.getItem(notifiedKey)) {
        setShowReadyNotification(true);
        localStorage.setItem(notifiedKey, 'true');
      }
    }
  }, [requirement]);

  const handleUpdateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePutToUse = async () => {
    if (!putToUseDate) return alert("Please select a put to use date");
    setSubmittingPutToUse(true);
    try {
      const { markRequirementPutToUse } = await import("@/lib/actions/requirements");
      const res = await markRequirementPutToUse(reqId, putToUseDate);
      if (res.error) throw new Error(res.error);
      setShowPutToUseDialog(false);
      loadData();
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setSubmittingPutToUse(false);
    }
  };

  const handleAmendment = async () => {
    if (!amendmentDetails.trim()) return alert("Please enter the revised details.");
    setSubmittingAmendment(true);
    try {
      let attachmentData = undefined;
      if (amendmentFile) {
        const { initializeAttachmentUpload } = await import("@/lib/actions/attachments");
        const uploadRes = await initializeAttachmentUpload({
          module_type: 'requirement',
          record_id: reqId,
          file_name: amendmentFile.name,
          mime_type: amendmentFile.type || 'application/octet-stream',
          file_size: amendmentFile.size
        });

        const { error: uploadError } = await supabase.storage
          .from('requirement-files')
          .uploadToSignedUrl(uploadRes.path, uploadRes.token, amendmentFile);

        if (uploadError) throw new Error("Failed to upload attachment: " + uploadError.message);
        
        attachmentData = {
          file_name: amendmentFile.name,
          file_size: amendmentFile.size,
          mime_type: amendmentFile.type,
          storage_path: uploadRes.path
        };
      }

      const { amendRequirement } = await import("@/lib/actions/requirements");
      const res = await amendRequirement(reqId, amendmentDetails, needsReapproval, attachmentData);
      if (res.error) throw new Error(res.error);
      setShowAmendmentDialog(false);
      setAmendmentDetails("");
      setNeedsReapproval(false);
      setAmendmentFile(null);
      loadData();
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setSubmittingAmendment(false);
    }
  };

  const handleEffortChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    let newFormData = { ...formData, estimated_effort: val };
    
    const days = parseInt(val, 10);
    if (!isNaN(days) && days > 0) {
      let start = formData.start_date ? new Date(formData.start_date) : new Date();
      if (!formData.start_date) {
        newFormData.start_date = start.toISOString().split('T')[0];
      }
      const due = new Date(start);
      due.setDate(due.getDate() + days);
      newFormData.due_date = due.toISOString().split('T')[0];
    }
    setFormData(newFormData);
  };

  const handleDateChange = (field: 'start_date' | 'due_date', val: string) => {
    let newFormData = { ...formData, [field]: val };
    
    const start = newFormData.start_date ? new Date(newFormData.start_date) : null;
    const due = newFormData.due_date ? new Date(newFormData.due_date) : null;
    
    if (start && due && !isNaN(start.getTime()) && !isNaN(due.getTime())) {
      const diffTime = due.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 0) {
        newFormData.estimated_effort = diffDays.toString();
      }
    }
    setFormData(newFormData);
  };

  const handleAction = async (action: 'ACCEPT' | 'HOLD' | 'CANCEL' | 'SAVE') => {
      const currentRemarks = approvalRemarks?.trim() || formData.analysis_remarks?.trim();
      if (!currentRemarks) {
        alert("Remarks are mandatory before saving or submitting.");
        return;
      }
      
      const payload = { ...formData, analysis_remarks: currentRemarks };

      if (action === 'ACCEPT') {
        if (!payload.impacted_departments.length || !payload.due_date || !payload.dependency_notes?.trim() || !payload.technical_scope?.trim() || !payload.estimated_effort?.trim()) {
            alert("Impacted Departments, Due Date, Dependency Notes, Technical Scope, and Estimated Effort are mandatory to Accept.");
            return;
        }
        for (const deptId of payload.impacted_departments) {
            if (!payload.department_approvers[deptId] || payload.department_approvers[deptId].length === 0) {
                alert("Please select at least one approver for each Impacted Department.");
                return;
            }
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const start = new Date(formData.start_date);
        start.setHours(0, 0, 0, 0);
        if ((requirement.approval_status === 'Draft' || !requirement.approval_status) && start < today) {
            alert("Start Date cannot be less than today's date.");
            return;
        }
        const due = new Date(formData.due_date);
        due.setHours(0, 0, 0, 0);
        if (due < start) {
            alert("Due Date cannot be less than Start Date.");
            return;
        }
      }

      setSaving(true);
      setError(null);
      try {
        const { submitRequirementAnalysis } = await import("@/lib/actions/requirements");
        const { data: { user } } = await supabase.auth.getUser();
        await submitRequirementAnalysis(requirement.id, payload, user!.id, action);
        alert(`Requirement ${action.toLowerCase()} successfully!`);
        await loadData();
      } catch (err: any) {
        setError(err.message || "An error occurred");
      } finally {
        setSaving(false);
      }
  };

  const submitApproval = async (action: 'Approve' | 'Reject' | 'Hold' | 'SignOff') => {
    if ((action === 'Reject' || action === 'Hold') && !approvalRemarks.trim()) {
      alert("Please provide remarks for your decision.");
      return;
    }
    setSavingApproval(true);
    try {
      const { processApprovalAction } = await import("@/lib/actions/requirements");
      await processApprovalAction(requirement.id, action, approvalRemarks, currentUserId);
      setApprovalRemarks("");
      await loadData();
      alert(`Successfully processed as ${action}`);
      if (searchParams.get('from') === 'approvals') {
        router.push('/requirements/approvals');
      } else {
        router.push('/requirements');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to process approval.");
    } finally {
      setSavingApproval(false);
    }
  };

  const isApprovalFlowChanged = () => {
    if (!requirement || !requirement.custom_fields) return false;
    const oldDepts = requirement.custom_fields.impacted_departments || [];
    const newDepts = formData.impacted_departments || [];
    if (oldDepts.length !== newDepts.length) return true;
    for (let d of newDepts) {
      if (!oldDepts.includes(d)) return true;
    }
    
    const oldApprovers = requirement.custom_fields.department_approvers || {};
    const newApprovers = formData.department_approvers || {};
    
    const allKeys = new Set([...Object.keys(oldApprovers), ...Object.keys(newApprovers)]);
    for (let key of allKeys) {
      const oldArr = oldApprovers[key] || [];
      const newArr = newApprovers[key] || [];
      if (oldArr.length !== newArr.length) return true;
      for (let i = 0; i < oldArr.length; i++) {
        if (oldArr[i] !== newArr[i]) return true;
      }
    }
    return false;
  };

  const handleDepartmentToggle = (id: string) => {
    setFormData(prev => {
      const exists = prev.impacted_departments.includes(id);
      if (exists) {
        const newApprovers = { ...prev.department_approvers };
        delete newApprovers[id];
        return { ...prev, impacted_departments: prev.impacted_departments.filter(d => d !== id), department_approvers: newApprovers };
      } else {
        return { ...prev, impacted_departments: [...prev.impacted_departments, id] };
      }
    });
  };

  const handleApprovalAction = async (action: 'Approve' | 'Reject' | 'Hold') => {
    if (!approvalRemarks.trim()) {
      alert("Please provide mandatory analysis remarks before proceeding.");
      return;
    }
    setSavingApproval(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const m = await import("@/lib/actions/requirements");
      await m.processApprovalAction(requirement.id, action, approvalRemarks, user!.id);
      setApprovalRemarks("");
      await loadData();
      // Also go back to approvals page after processing
      router.push('/requirements/approvals');
    } catch (err: any) {
      alert(err.message || "Failed to process approval action.");
    } finally {
      setSavingApproval(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to permanently delete this requirement? This action cannot be undone.")) return;
    try {
      const { deleteRequirement } = await import("@/lib/actions/requirements");
      const { data: { user } } = await supabase.auth.getUser();
      await deleteRequirement(requirement.id, user!.id);
      router.push('/requirements');
    } catch (err: any) {
      alert(err.message || "Failed to delete requirement.");
    }
  };

  const handleAttachmentAction = (attId: string, action: 'view' | 'download') => {
    try {
      const isDownload = action === 'download';
      const targetUrl = isDownload 
        ? `/api/proxy-attachment/${attId}?download=1` 
        : `/api/proxy-attachment/${attId}`;
      
      if (isDownload) {
        const link = document.createElement('a');
        link.href = targetUrl;
        link.setAttribute('download', '');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (e: any) {
      alert(`Failed to ${action} attachment: ` + (e.message || "Unknown error"));
    }
  };

  const handleAddMasterSubmit = async () => {
    if (!newMasterName.trim()) return;
    setIsAddingMaster(true);
    try {
      if (masterModalType === 'issue_type') {
        const { createIssueType } = await import("@/lib/actions/masters");
        const newIssue = await createIssueType(newMasterName.trim());
        setMasters((prev: any) => ({ ...prev, issue_types: [...prev.issue_types, newIssue] }));
        setFormData(prev => ({ ...prev, requirement_type_id: newIssue.id }));
      } else {
        const { createBusinessValue } = await import("@/lib/actions/masters");
        const newBV = await createBusinessValue(newMasterName.trim());
        setMasters((prev: any) => ({ ...prev, business_values: [...prev.business_values, newBV].sort((a,b) => a.name.localeCompare(b.name)) }));
        setFormData(prev => ({ ...prev, business_value_id: newBV.id }));
      }
      setShowAddMasterModal(false);
      setNewMasterName("");
    } catch (e: any) {
      alert("Failed to add master: " + e.message);
    } finally {
      setIsAddingMaster(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-surface dark:bg-[#050505]">
        <div className="animate-spin h-10 w-10 border-2 border-theme-btn-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!requirement) {
    return (
      <div className="h-screen flex flex-col items-center justify-center text-foreground dark:text-white bg-surface dark:bg-[#050505]">
        <h2>Requirement not found.</h2>
        <AppButton onClick={() => router.push('/requirements')} className="mt-4">Back to List</AppButton>
      </div>
    );
  }

  const isViewMode = searchParams.get('mode') === 'view';
  const isEditable = !isViewMode && (!requirement.approval_status || requirement.approval_status === 'Draft' || requirement.approval_status === 'Pending' || requirement.approval_status === 'On Hold' || requirement.approval_status === 'Clarification');
  const snap = requirement.intake_snapshot || {};

  return (
    <PageContainer strict={false} className="px-4 pb-12 pt-2 min-h-screen overflow-y-auto">
      <div className="flex items-center justify-between pb-2 mb-2 shrink-0 border-b border-border dark:border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex items-baseline gap-2">
            <h1 className="text-[1.1rem] font-bold text-foreground dark:text-white truncate max-w-2xl leading-tight">
              <span className="text-muted mr-2 uppercase text-sm tracking-wider">{requirement.code || reqId}</span>
              {requirement.title || 'Untitled Subject'}
            </h1>
          </div>
          <AppBadge variant="info">{requirement.approval_status || requirement.status?.name || "Draft"}</AppBadge>
          <div className="flex items-center gap-2 ml-2 border-l border-border dark:border-white/10 pl-3 hidden md:flex">
            <span className="theme-label text-muted">Priority:</span>
            <span className="theme-data-value px-2.5 py-0.5 rounded-full text-foreground tracking-wide shadow-sm" style={{ backgroundColor: requirement.priority?.priority_color || '#ef4444' }}>
              {requirement.priority?.name || requirement.priority?.priority_name || '-'}
            </span>
            <span className="theme-label text-muted ml-2">Created:</span>
            <span className="text-xs font-semibold text-foreground dark:text-muted">
              {new Date(requirement.created_at).toLocaleDateString()}
            </span>
            {requirement.put_to_use_date && (
              <>
                <span className="theme-label text-emerald-500 ml-2">Put to Use:</span>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  {new Date(requirement.put_to_use_date).toLocaleDateString()}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AppButton variant="outline" size="sm" onClick={() => router.back()} leftIcon={<ArrowLeft className="h-3.5 w-3.5"/>}>
            Back
          </AppButton>
          {!isViewMode && (isSuperAdmin || hasPermission('REQUIREMENTS_DELETE')) && (
            <AppButton variant="destructive" size="sm" leftIcon={<Trash2 className="h-4 w-4"/>} onClick={handleDelete}>
              Delete
            </AppButton>
          )}
          {!isViewMode && (requirement.approval_status === 'Approved' || requirement.approval_status === 'In Progress') && (
            <AppButton variant="primary" size="sm" leftIcon={<FilePlus className="h-4 w-4"/>} onClick={() => setShowWorkspaceSelector(true)}>
              Assign Task
            </AppButton>
          )}
          {!isViewMode && (requirement.approval_status === 'Approved' || requirement.approval_status === 'In Progress') && (isSuperAdmin || requirement.creator_id === currentUserId) && (
            <AppButton variant="secondary" size="sm" leftIcon={<Edit2 className="h-4 w-4"/>} onClick={() => setShowAmendmentDialog(true)}>
              Change Requirement
            </AppButton>
          )}
          {!isViewMode && (requirement.approval_status === 'Ready to Put to Use') && (
            <AppButton variant="primary" size="sm" leftIcon={<CheckCircle className="h-4 w-4"/>} onClick={() => setShowPutToUseDialog(true)}>
              Put to Use
            </AppButton>
          )}
        </div>
      </div>

      <Dialog open={showAmendmentDialog} onOpenChange={setShowAmendmentDialog}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-border/50 dark:border-white/5">
            <DialogTitle>Amend Requirement</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div>
              <label className="block theme-data-value text-subtle dark:text-muted mb-1.5 uppercase tracking-wider">Revised Details of Requirement</label>
              <textarea 
                className="w-full flex min-h-[100px] rounded-md border border-border bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-border dark:focus-visible:ring-gray-300" 
                placeholder="Describe what has changed in the requirement..."
                value={amendmentDetails}
                onChange={(e) => setAmendmentDetails(e.target.value)}
              />
            </div>
            <div>
              <label className="block theme-data-value text-subtle dark:text-muted mb-1.5 uppercase tracking-wider">Attachment (Optional)</label>
              <input 
                type="file" 
                className="w-full text-sm text-muted file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-theme-btn-primary file:text-white hover:file:bg-theme-btn-primary-secondary transition-all"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    setAmendmentFile(e.target.files[0]);
                  }
                }}
              />
              {amendmentFile && <p className="text-xs text-muted mt-1">Selected: {amendmentFile.name}</p>}
            </div>
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="needsReapproval" 
                checked={needsReapproval}
                onChange={(e) => setNeedsReapproval(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary dark:border-border dark:bg-surface dark:ring-offset-gray-900"
              />
              <label htmlFor="needsReapproval" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 dark:text-muted">
                Needs Re-Approval Flow?
              </label>
            </div>
            <p className="text-[11px] text-muted">
              If checked, the requirement will go back to Pending and a new approval flow will be triggered. If unchecked, the changes are auto-approved and will instantly push notifications to any active tasks linked to this requirement.
            </p>
          </div>
          <DialogFooter className="px-6 py-4 bg-surface border-t border-border/50 dark:bg-slate-950 dark:border-white/5">
            <AppButton variant="outline" onClick={() => setShowAmendmentDialog(false)}>Cancel</AppButton>
            <AppButton variant="primary" onClick={handleAmendment} isLoading={submittingAmendment} disabled={!amendmentDetails.trim()}>Submit Amendment</AppButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showReadyNotification} onOpenChange={setShowReadyNotification}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-border/50 dark:border-white/5 bg-theme-btn-primary/5">
            <DialogTitle className="flex items-center gap-2 text-theme-icon">
              <CheckCircle className="h-5 w-5" />
              Tasks Completed
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <p className="text-sm text-subtle dark:text-muted">
              All linked tasks for this requirement have been successfully closed. The requirement is now <strong>Ready to Put to Use</strong>.
            </p>
          </div>
          <DialogFooter className="px-6 py-4 bg-surface border-t border-border/50 dark:bg-slate-950 dark:border-white/5">
            <AppButton variant="outline" onClick={() => setShowReadyNotification(false)}>Close</AppButton>
            <AppButton variant="primary" onClick={() => {
              setShowReadyNotification(false);
              setShowPutToUseDialog(true);
            }}>
              Proceed to Put to Use
            </AppButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPutToUseDialog} onOpenChange={setShowPutToUseDialog}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-border/50 dark:border-white/5">
            <DialogTitle>Put Requirement to Use</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div>
              <label className="block theme-data-value text-subtle dark:text-muted mb-1.5 uppercase tracking-wider">Select Put to Use Date</label>
              <AppInput type="date" value={putToUseDate} onChange={(e) => setPutToUseDate(e.target.value)} />
            </div>
            <p className="text-xs text-muted">
              Setting this date will officially mark the requirement as Closed.
            </p>
          </div>
          <DialogFooter className="px-6 py-4 bg-surface border-t border-border/50 dark:bg-slate-950 dark:border-white/5">
            <AppButton variant="outline" onClick={() => setShowPutToUseDialog(false)}>Cancel</AppButton>
            <AppButton variant="primary" onClick={handlePutToUse} isLoading={submittingPutToUse} disabled={!putToUseDate}>Confirm</AppButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showWorkspaceSelector} onOpenChange={setShowWorkspaceSelector}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-border/50 dark:border-white/5">
            <DialogTitle>Select Workspace for Task</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div>
              <label className="block theme-data-value text-subtle dark:text-muted mb-1">Target Workspace <span className="text-red-500">*</span></label>
              <select
                value={selectedWorkspaceId}
                onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                className="w-full text-sm p-2.5 border border-border dark:border-white/10 rounded-md bg-surface dark:bg-[#0a0d14] text-foreground dark:text-white focus:ring-theme-btn-primary focus:border-theme-btn-primary"
              >
                <option value="">-- Select Workspace --</option>
                {workspaces.map(w => <option key={w.id} value={w.id}>{w.workspace_name || w.name}</option>)}
              </select>
            </div>
            
            {selectedWorkspaceId && (
              <div>
                <label className="block theme-data-value text-subtle dark:text-muted mb-1">Sub-Workspace (Optional)</label>
                <select
                  value={selectedSubWorkspaceId}
                  onChange={(e) => setSelectedSubWorkspaceId(e.target.value)}
                  className="w-full text-sm p-2.5 border border-border dark:border-white/10 rounded-md bg-surface dark:bg-[#0a0d14] text-foreground dark:text-white focus:ring-theme-btn-primary focus:border-theme-btn-primary"
                >
                  <option value="">-- None --</option>
                  {subWorkspaces.filter(sw => sw.parent_workspace_id === selectedWorkspaceId).map(sw => (
                    <option key={sw.id} value={sw.id}>{sw.workspace_name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <DialogFooter className="px-6 py-4 border-t border-border/50 dark:border-white/5 bg-surface dark:bg-surface/5">
            <AppButton variant="outline" onClick={() => setShowWorkspaceSelector(false)}>Cancel</AppButton>
            <AppButton 
              variant="primary" 
              disabled={!selectedWorkspaceId} 
              onClick={() => {
                setShowWorkspaceSelector(false);
                setShowTaskWizard(true);
              }}
            >
              Continue
            </AppButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showTaskWizard && (
        <TaskCreationWizard 
           workspaceId={selectedSubWorkspaceId || selectedWorkspaceId}
           initialTaskName={requirement.title || requirement.code}
           initialDescription={`Requirement Reason:\n${requirement.requirement_reason || requirement.custom_fields?.business_reason || '-'}\n\nRequirement Details:\n${requirement.requirement_details || requirement.functional_scope || '-'}`}
           initialAttachments={attachments.map(att => ({
             file_name: att.original_file_name || att.file_name,
             file_url: "storage:requirement-files:" + (att.storage_path || att.file_name),
             file_type: att.mime_type || "file",
             size: att.file_size || 0
           }))}
           onClose={() => setShowTaskWizard(false)}
           onSuccess={async (data) => {
             setShowTaskWizard(false);
             setSaving(true);
             try {
               const { createTaskFromRequirement } = await import("@/lib/actions/requirements");
               await createTaskFromRequirement(reqId, selectedWorkspaceId, selectedSubWorkspaceId || null, data);
               loadData(); // Refresh to show newly linked tasks and status update
             } catch (err: any) {
               alert(err.message || "Failed to create task");
             } finally {
               setSaving(false);
             }
           }}
        />
      )}

      <div className="flex flex-col flex-1 min-h-0 overflow-y-auto pb-12">
        {/* Action Required Panel */}
        {isCurrentApprover && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-4 mb-6 rounded-r-md shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-6 w-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-100">Action Required: Your Approval is Pending</h3>

                <div className="space-y-3">
                  <RichTextEditor
                    value={approvalRemarks}
                    onChange={setApprovalRemarks}
                    placeholder="Enter your mandatory approval or rejection remarks here..."
                  />
                  <div className="flex flex-wrap gap-2">
                    <AppButton variant="secondary" onClick={() => submitApproval('Hold')} isLoading={savingApproval} leftIcon={<PauseCircle className="h-4 w-4"/>}>Hold</AppButton>
                    <AppButton variant="destructive" onClick={() => submitApproval('Reject')} isLoading={savingApproval} leftIcon={<XCircle className="h-4 w-4"/>}>Reject</AppButton>
                    {requirement.approval_status === 'Pending SignOff' ? (
                      <AppButton variant="primary" onClick={() => submitApproval('SignOff' as any)} isLoading={savingApproval} leftIcon={<CheckCircle className="h-4 w-4"/>}>Sign Off</AppButton>
                    ) : (
                      <AppButton variant="primary" onClick={() => submitApproval('Approve')} isLoading={savingApproval} leftIcon={<CheckCircle className="h-4 w-4"/>}>Approve</AppButton>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

                {/* Tab Navigation */}
        <div className="flex flex-wrap items-center gap-2 p-2 rounded-2xl bg-surface/80 dark:bg-elevated/40 border border-border/80 mb-6 shadow-xs select-none">
          {[
            { id: 'details', label: 'Requirement Details', icon: FileText, color: 'text-blue-500', activeBg: 'bg-blue-600' },
            { id: 'analysis', label: 'Business Analysis', icon: Target, color: 'text-purple-500', activeBg: 'bg-purple-600' },
            { id: 'approval', label: 'Approval Workflow', icon: Shield, color: 'text-amber-500', activeBg: 'bg-amber-600' },
            { id: 'tasks', label: 'Tasks', icon: Briefcase, count: linkedTasks.length, color: 'text-emerald-500', activeBg: 'bg-emerald-600' },
            { id: 'audit', label: 'Audit Trail', icon: Clock, count: auditLogs.length, color: 'text-cyan-500', activeBg: 'bg-cyan-600' }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <AppButton
                key={tab.id}
                type="button"
                variant={isActive ? "primary" : "ghost"}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer select-none ${
                  isActive ? "shadow-md scale-[1.02] border-transparent" : "border border-transparent hover:border-border/60"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : tab.color}`} />
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`ml-1 px-1.5 py-0.2 text-[10px] font-extrabold rounded-full ${
                    isActive 
                      ? "bg-surface/25 text-white" 
                      : `bg-surface ${tab.color} border border-current/30`
                  }`}>
                    {tab.count}
                  </span>
                )}
              </AppButton>
            );
          })}
        </div>

        {/* TAB 1: Requirement Details */}
        {activeTab === 'details' && (
          <div className="flex flex-col space-y-6 pb-12 animate-in fade-in duration-300">
            {/* DEDICATED CARD: Business Classification */}
            <AppCard className="overflow-hidden border border-border/50 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-500 bg-surface/40 backdrop-blur-xl p-0 mb-4">
              <div className="bg-gradient-to-r from-purple-500/15 via-surface/90 to-surface/40 dark:from-purple-600/30 dark:via-elevated/90 dark:to-elevated/40 px-5 py-3.5 border-b border-border/80 flex items-center justify-between rounded-t-2xl">
                <div className="flex items-center gap-2.5">
                  <div className="w-1.5 h-4 rounded-full bg-purple-500 shadow-xs" />
                  <Target className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <h3 className="font-bold text-sm tracking-wide text-foreground">Business Classification</h3>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
                  <div className="flex flex-col p-3.5 rounded-xl bg-surface/80 dark:bg-elevated/40 backdrop-blur-md border border-border/50 hover:border-border/80 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300">
                    <span className="theme-label mb-2 text-muted flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-purple-500" /> Business Classification
                    </span>
                    <div>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md theme-data-value bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                        {requirement.business_classification?.name || snap.business_classification || requirement.requirement_type?.name || 'Standard Business Request'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col p-3.5 rounded-xl bg-surface/80 dark:bg-elevated/40 backdrop-blur-md border border-border/50 hover:border-border/80 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300">
                    <span className="theme-label mb-2 text-muted flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> Business Criticality <span className="text-red-500">*</span>
                    </span>
                    <div>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md theme-data-value bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                        {requirement.business_criticality?.name || requirement.priority?.name || 'HIGH'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col p-3.5 rounded-xl bg-surface/80 dark:bg-elevated/40 backdrop-blur-md border border-border/50 hover:border-border/80 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300">
                    <span className="theme-label mb-1.5 text-muted flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-indigo-500" /> Business Value
                    </span>
                    <span className="theme-data-value text-foreground break-all">
                      {requirement.business_value?.name || requirement.custom_fields?.business_value || 'Cost Optimization & Efficiency'}
                    </span>
                  </div>

                  <div className="flex flex-col p-3.5 rounded-xl bg-surface/80 dark:bg-elevated/40 backdrop-blur-md border border-border/50 hover:border-border/80 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300">
                    <span className="theme-label mb-1.5 text-muted flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-fuchsia-500" /> Business Impact
                    </span>
                    <span className="theme-data-value text-foreground break-all">
                      {requirement.business_impact || requirement.custom_fields?.business_impact || 'No immediate impact details provided.'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div className="flex flex-col p-3.5 rounded-xl bg-surface/80 dark:bg-elevated/40 backdrop-blur-md border border-border/50 hover:border-border/80 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300">
                    <span className="theme-label mb-1.5 text-muted flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-cyan-500" /> Dependency Notes <span className="text-red-500">*</span>
                    </span>
                    <div className="theme-data-value text-foreground whitespace-pre-wrap leading-relaxed break-words">
                      {requirement.dependency_notes || requirement.custom_fields?.dependency_notes || 'Requires integration approval and system setup verification.'}
                    </div>
                  </div>

                  <div className="flex flex-col p-3.5 rounded-xl bg-surface/80 dark:bg-elevated/40 backdrop-blur-md border border-border/50 hover:border-border/80 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300">
                    <span className="theme-label mb-1.5 text-muted flex items-center gap-1.5">
                      <Server className="w-3.5 h-3.5 text-emerald-500" /> Technical Scope / Architecture <span className="text-red-500">*</span>
                    </span>
                    <div className="theme-data-value text-foreground whitespace-pre-wrap leading-relaxed break-words">
                      {requirement.technical_scope || requirement.custom_fields?.technical_scope || snap.technical_scope || 'Technical architecture, schema specifications, and API integration scope.'}
                    </div>
                  </div>
                </div>
              </div>
            </AppCard>

            {/* DEDICATED CARD: Scope & Classification Grid */}
            <AppCard className="overflow-hidden border border-border/60 shadow-md p-5 mb-4">
              <div className="text-xs font-extrabold uppercase tracking-wider text-muted mb-3 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-emerald-500" /> Scope & System Classification
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
                <div className="flex flex-col p-3 rounded-xl bg-surface/80 dark:bg-elevated/40 backdrop-blur-md border border-border/50 hover:border-border/80 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300">
                  <span className="theme-label mb-1 text-muted flex items-center gap-1">
                    <Target className="w-3 h-3 text-theme-icon" /> Scope
                  </span>
                  <span className="theme-data-value text-foreground truncate" title={requirement.scope || '-'}>{requirement.scope || '-'}</span>
                </div>

                <div className="flex flex-col p-3 rounded-xl bg-surface/80 dark:bg-elevated/40 backdrop-blur-md border border-border/50 hover:border-border/80 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300">
                  <span className="theme-label mb-1 text-muted flex items-center gap-1">
                    <Server className="w-3 h-3 text-purple-500" /> System
                  </span>
                  <span className="theme-data-value text-foreground truncate" title={requirement.software_system?.name || snap.system || '-'}>{requirement.software_system?.name || snap.system || '-'}</span>
                </div>

                <div className="flex flex-col p-3 rounded-xl bg-surface/80 dark:bg-elevated/40 backdrop-blur-md border border-border/50 hover:border-border/80 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300">
                  <span className="theme-label mb-1 text-muted flex items-center gap-1">
                    <Briefcase className="w-3 h-3 text-emerald-500" /> Module
                  </span>
                  <span className="theme-data-value text-foreground truncate" title={requirement.module?.name || snap.module || '-'}>{requirement.module?.name || snap.module || '-'}</span>
                </div>

                <div className="flex flex-col p-3 rounded-xl bg-surface/80 dark:bg-elevated/40 backdrop-blur-md border border-border/50 hover:border-border/80 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300">
                  <span className="theme-label mb-1 text-muted flex items-center gap-1">
                    <FileText className="w-3 h-3 text-cyan-500" /> Submodule
                  </span>
                  <span className="theme-data-value text-foreground truncate" title={requirement.sub_module?.name || snap.submodule || '-'}>{requirement.sub_module?.name || snap.submodule || '-'}</span>
                </div>

                <div className="flex flex-col p-3 rounded-xl bg-surface/80 dark:bg-elevated/40 backdrop-blur-md border border-border/50 hover:border-border/80 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300">
                  <span className="theme-label mb-1 text-muted flex items-center gap-1">Category</span>
                  <span className="theme-data-value text-foreground truncate" title={requirement.category?.name || snap.category || '-'}>{requirement.category?.name || snap.category || '-'}</span>
                </div>

                <div className="flex flex-col p-3 rounded-xl bg-surface/80 dark:bg-elevated/40 backdrop-blur-md border border-border/50 hover:border-border/80 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300">
                  <span className="theme-label mb-1 text-muted flex items-center gap-1">Sub Category</span>
                  <span className="theme-data-value text-foreground truncate" title={requirement.sub_category?.name || snap.subcategory || '-'}>{requirement.sub_category?.name || snap.subcategory || '-'}</span>
                </div>

                <div className="flex flex-col p-3 rounded-xl bg-surface/80 dark:bg-elevated/40 backdrop-blur-md border border-border/50 hover:border-border/80 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300">
                  <span className="theme-label mb-1 text-muted flex items-center gap-1">Created By</span>
                  <span className="theme-data-value text-foreground truncate" title={requirement.creator?.full_name || '-'}>{requirement.creator?.full_name || '-'}</span>
                </div>

                <div className="flex flex-col p-3 rounded-xl bg-surface/80 dark:bg-elevated/40 backdrop-blur-md border border-border/50 hover:border-border/80 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300">
                  <span className="theme-label mb-1 text-muted flex items-center gap-1">Department</span>
                  <span className="theme-data-value text-foreground truncate" title={requirement.department?.name || '-'}>{requirement.department?.name || '-'}</span>
                </div>
              </div>
            </AppCard>

            {/* DEDICATED CARD: Attachments */}
            {attachments.length > 0 && (
              <AppCard className="overflow-hidden border border-border/60 shadow-md p-5">
                <div className="text-xs font-extrabold uppercase tracking-wider text-muted mb-3 flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-theme-icon" /> Associated Files & Attachments ({attachments.length})
                </div>
                <div className="flex gap-3 flex-wrap">
                  {attachments.map(att => (
                    <div
                      key={att.id}
                      className="flex items-center gap-2 pl-3 pr-1 py-1.5 bg-surface dark:bg-elevated/40 border border-border/60 rounded-xl text-xs shadow-2xs hover:border-border transition-all"
                    >
                      <Paperclip className="h-4 w-4 text-theme-icon" />
                      <span className="text-foreground font-semibold truncate max-w-[200px]" title={att.original_file_name || att.file_name}>{att.original_file_name || att.file_name}</span>
                      <span className="text-[10px] text-muted mr-2">{(att.file_size / 1024).toFixed(1)} KB</span>
                      <div className="flex items-center gap-1 border-l border-border/60 pl-2">
                        <AppButton 
                          variant="ghost" size="sm"
                          onClick={() => handleAttachmentAction(att.id, 'view')}
                          className="p-1.5 text-muted hover:text-theme-icon hover:bg-theme-btn-primary/10 rounded-lg transition-colors"
                          title="View Attachment"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </AppButton>
                        <AppButton 
                          variant="ghost" size="sm"
                          onClick={() => handleAttachmentAction(att.id, 'download')}
                          className="p-1.5 text-muted hover:text-theme-icon hover:bg-theme-btn-primary/10 rounded-lg transition-colors"
                          title="Download Attachment"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </AppButton>
                      </div>
                    </div>
                  ))}
                </div>
              </AppCard>
            )}
          </div>
        )}

        {/* TAB 2: Business Analysis */}
        {activeTab === 'analysis' && (
          <div className="flex flex-col space-y-6 animate-in fade-in duration-300">
            {/* 1. CARD: Business Classification */}
            <AppCard className="overflow-hidden border border-border/50 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-500 bg-surface/40 backdrop-blur-xl p-0 mb-4">
              <div className="bg-gradient-to-r from-purple-500/15 via-surface/90 to-surface/40 dark:from-purple-600/30 dark:via-elevated/90 dark:to-elevated/40 px-5 py-3.5 border-b border-border/80 flex items-center justify-between rounded-t-2xl">
                <div className="flex items-center gap-2.5">
                  <div className="w-1.5 h-4 rounded-full bg-purple-500 shadow-xs" />
                  <Target className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <h3 className="font-bold text-sm tracking-wide text-foreground">Business Classification</h3>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col space-y-1.5">
                    <label className="theme-label text-muted flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5 text-purple-500" /> Business Classification <span className="text-red-500">*</span></span>
                      {isEditable && (
                        <button type="button" onClick={() => { setMasterModalType('issue_type'); setShowAddMasterModal(true); }} className="text-purple-500 hover:text-purple-600 p-0.5 rounded-full hover:bg-purple-500/10">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </label>
                    {isEditable ? (
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.requirement_type_id || ""}
                        onChange={(e) => handleUpdateField('requirement_type_id', e.target.value)}
                      >
                        <option value="">Select Classification...</option>
                        {masters.issue_types?.map((t: any) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="p-2.5 rounded-lg border border-border/50 bg-surface dark:bg-elevated/20 text-foreground text-sm font-medium">
                        {masters.issue_types?.find((t: any) => t.id === formData.requirement_type_id)?.name || requirement.business_classification?.name || requirement.requirement_type?.name || 'Standard Business Request'}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    <label className="theme-label text-muted flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> Business Criticality <span className="text-red-500">*</span></span>
                    </label>
                    {isEditable ? (
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.business_criticality_id || ""}
                        onChange={(e) => handleUpdateField('business_criticality_id', e.target.value)}
                      >
                        <option value="">Select Criticality...</option>
                        {masters.priority_master?.map((p: any) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="p-2.5 rounded-lg border border-border/50 bg-surface dark:bg-elevated/20 text-foreground text-sm font-medium">
                        {masters.priority_master?.find((p: any) => p.id === formData.business_criticality_id)?.name || requirement.business_criticality?.name || requirement.priority?.name || 'Not specified'}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    <label className="theme-label text-muted flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><Target className="w-3.5 h-3.5 text-indigo-500" /> Business Value</span>
                      {isEditable && (
                        <button type="button" onClick={() => { setMasterModalType('business_value'); setShowAddMasterModal(true); }} className="text-indigo-500 hover:text-indigo-600 p-0.5 rounded-full hover:bg-indigo-500/10">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </label>
                    {isEditable ? (
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.business_value_id || ""}
                        onChange={(e) => handleUpdateField('business_value_id', e.target.value)}
                      >
                        <option value="">Select Value...</option>
                        {masters.business_values?.map((bv: any) => (
                          <option key={bv.id} value={bv.id}>{bv.name}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="p-2.5 rounded-lg border border-border/50 bg-surface dark:bg-elevated/20 text-foreground text-sm font-medium">
                        {masters.business_values?.find((b: any) => b.id === formData.business_value_id)?.name || requirement.business_value?.name || requirement.custom_fields?.business_value || 'Not specified'}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 mt-2">
                  <div className="flex flex-col space-y-1.5">
                    <label className="theme-label text-muted flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-cyan-500" /> Dependency Notes <span className="text-red-500">*</span></span>
                    </label>
                    {isEditable ? (
                      <textarea
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.dependency_notes}
                        onChange={(e) => handleUpdateField('dependency_notes', e.target.value)}
                        placeholder="Enter dependency notes..."
                      />
                    ) : (
                      <div className="p-3 rounded-lg border border-border/50 bg-surface dark:bg-elevated/20 text-foreground text-sm whitespace-pre-wrap">
                        {formData.dependency_notes || 'No dependency notes.'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </AppCard>

            {/* 2. CARD: Requirement Reason, Details & Technical Scope */}
            <AppCard className="overflow-hidden border border-border/50 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-500 bg-surface/40 backdrop-blur-xl p-0 mb-4">
              <div className="bg-gradient-to-r from-emerald-500/15 via-surface/90 to-surface/40 dark:from-emerald-600/30 dark:via-elevated/90 dark:to-elevated/40 px-5 py-3.5 border-b border-border/80 flex items-center justify-between rounded-t-2xl">
                <div className="flex items-center gap-2.5">
                  <div className="w-1.5 h-4 rounded-full bg-emerald-500 shadow-xs" />
                  <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="font-bold text-sm tracking-wide text-foreground">Requirement Reason, Details & Technical Scope</h3>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div className="flex flex-col p-3.5 rounded-xl bg-surface/80 dark:bg-elevated/40 backdrop-blur-md border border-border/50 hover:border-border/80 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300">
                    <span className="theme-label mb-1.5 text-muted flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-amber-500" /> Requirement Reason
                    </span>
                    <div className="theme-data-value text-foreground whitespace-pre-wrap leading-relaxed break-words">
                      {requirement.requirement_reason || requirement.custom_fields?.business_reason || requirement.objective || 'Provide operational justification for requirement execution.'}
                    </div>
                  </div>

                  <div className="flex flex-col p-3.5 rounded-xl bg-surface/80 dark:bg-elevated/40 backdrop-blur-md border border-border/50 hover:border-border/80 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300">
                    <span className="theme-label mb-1.5 text-muted flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-500" /> Requirement Details
                    </span>
                    <div className="theme-data-value text-foreground whitespace-pre-wrap leading-relaxed break-words">
                      {requirement.requirement_details || requirement.custom_fields?.requirement_details || 'Detailed requirement workflow description.'}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col space-y-1.5 mt-4">
                  <label className="theme-label text-muted flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><Server className="w-3.5 h-3.5 text-emerald-500" /> Technical Scope / Architecture Details <span className="text-red-500">*</span></span>
                  </label>
                  {isEditable ? (
                    <RichTextEditor
                      value={formData.technical_scope}
                      onChange={(v) => handleUpdateField('technical_scope', v)}
                      placeholder="Enter architecture details..."
                    />
                  ) : (
                    <div className="p-3 rounded-lg border border-border/50 bg-surface dark:bg-elevated/20 text-foreground text-sm prose dark:prose-invert max-w-none">
                      <SafeHtml html={formData.technical_scope || ''} />
                    </div>
                  )}
                </div>
              </div>
            </AppCard>

            
            {/* IT System Conditional Render */}
            {requirement.custom_fields?.requirement_domain === 'IT & Software System' && (
              <AppCard className="overflow-hidden border border-border/50 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-500 bg-surface/40 backdrop-blur-xl p-0 mb-4 animate-in fade-in zoom-in-95 duration-300">
                <div className="bg-gradient-to-r from-blue-500/15 via-surface/90 to-surface/40 dark:from-blue-600/30 dark:via-elevated/90 dark:to-elevated/40 px-5 py-3.5 border-b border-border/80 flex items-center justify-between rounded-t-2xl">
                  <div className="flex items-center gap-2.5">
                    <div className="w-1.5 h-4 rounded-full bg-blue-500 shadow-xs" />
                    <Server className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <h3 className="font-bold text-sm tracking-wide text-foreground">IT & Software Scope</h3>
                  </div>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div className="flex flex-col p-3.5 rounded-xl bg-surface/80 dark:bg-elevated/40 backdrop-blur-md border border-border/50 hover:border-border/80 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300">
                      <span className="theme-label mb-1.5 text-muted">Target System / Application</span>
                      <span className="theme-data-value text-foreground">{requirement.custom_fields?.target_system || 'Not specified'}</span>
                    </div>
                    <div className="flex flex-col p-3.5 rounded-xl bg-surface/80 dark:bg-elevated/40 backdrop-blur-md border border-border/50 hover:border-border/80 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300">
                      <span className="theme-label mb-1.5 text-muted">Data Privacy & Security</span>
                      <span className="theme-data-value text-foreground">{requirement.custom_fields?.data_privacy || 'Not specified'}</span>
                    </div>
                    <div className="flex flex-col p-3.5 rounded-xl bg-surface/80 dark:bg-elevated/40 backdrop-blur-md border border-border/50 hover:border-border/80 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300">
                      <span className="theme-label mb-1.5 text-muted">Software License Cost</span>
                      <span className="theme-data-value text-foreground">{requirement.custom_fields?.software_cost ? `₹${requirement.custom_fields.software_cost}` : 'N/A'}</span>
                    </div>
                    <div className="flex flex-col p-3.5 rounded-xl bg-surface/80 dark:bg-elevated/40 backdrop-blur-md border border-border/50 hover:border-border/80 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300">
                      <span className="theme-label mb-1.5 text-muted">Development Cost</span>
                      <span className="theme-data-value text-foreground">{requirement.custom_fields?.dev_cost ? `₹${requirement.custom_fields.dev_cost}` : 'N/A'}</span>
                    </div>
                  </div>
                  {requirement.custom_fields?.integrations && (
                    <div className="mt-3.5 flex flex-col p-3.5 rounded-xl bg-surface/80 dark:bg-elevated/40 backdrop-blur-md border border-border/50 hover:border-border/80 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300">
                      <span className="theme-label mb-1.5 text-muted">Integration Dependencies</span>
                      <span className="theme-data-value text-foreground whitespace-pre-wrap">{requirement.custom_fields.integrations}</span>
                    </div>
                  )}
                </div>
              </AppCard>
            )}

            {/* Infrastructure Conditional Render */}
            {requirement.custom_fields?.requirement_domain === 'Infrastructure & Hardware' && (
              <AppCard className="overflow-hidden border border-border/50 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-500 bg-surface/40 backdrop-blur-xl p-0 mb-4 animate-in fade-in zoom-in-95 duration-300">
                <div className="bg-gradient-to-r from-indigo-500/15 via-surface/90 to-surface/40 dark:from-indigo-600/30 dark:via-elevated/90 dark:to-elevated/40 px-5 py-3.5 border-b border-border/80 flex items-center justify-between rounded-t-2xl">
                  <div className="flex items-center gap-2.5">
                    <div className="w-1.5 h-4 rounded-full bg-indigo-500 shadow-xs" />
                    <Server className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="font-bold text-sm tracking-wide text-foreground">Infrastructure Scope</h3>
                  </div>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div className="flex flex-col p-3.5 rounded-xl bg-surface/80 dark:bg-elevated/40 backdrop-blur-md border border-border/50 hover:border-border/80 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300">
                      <span className="theme-label mb-1.5 text-muted">Target Environment</span>
                      <span className="theme-data-value text-foreground">{requirement.custom_fields?.target_environment || 'Not specified'}</span>
                    </div>
                    <div className="flex flex-col p-3.5 rounded-xl bg-surface/80 dark:bg-elevated/40 backdrop-blur-md border border-border/50 hover:border-border/80 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300">
                      <span className="theme-label mb-1.5 text-muted">Hardware & Capacity Needs</span>
                      <span className="theme-data-value text-foreground">{requirement.custom_fields?.hardware_needs || 'Not specified'}</span>
                    </div>
                    <div className="flex flex-col p-3.5 rounded-xl bg-surface/80 dark:bg-elevated/40 backdrop-blur-md border border-border/50 hover:border-border/80 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300">
                      <span className="theme-label mb-1.5 text-muted">CAPEX Amount</span>
                      <span className="theme-data-value text-foreground">{requirement.custom_fields?.capex_amount ? `₹${requirement.custom_fields.capex_amount}` : 'N/A'}</span>
                    </div>
                    <div className="flex flex-col p-3.5 rounded-xl bg-surface/80 dark:bg-elevated/40 backdrop-blur-md border border-border/50 hover:border-border/80 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300">
                      <span className="theme-label mb-1.5 text-muted">OPEX Amount</span>
                      <span className="theme-data-value text-foreground">{requirement.custom_fields?.opex_amount ? `₹${requirement.custom_fields.opex_amount}` : 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </AppCard>
            )}

            {/* 3. CARD: Timelines & Resources */}
            <AppCard className="overflow-hidden border border-border/50 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-500 bg-surface/40 backdrop-blur-xl p-0 mb-4">
              <div className="bg-gradient-to-r from-cyan-500/15 via-surface/90 to-surface/40 dark:from-cyan-600/30 dark:via-elevated/90 dark:to-elevated/40 px-5 py-3.5 border-b border-border/80 flex items-center justify-between rounded-t-2xl">
                <div className="flex items-center gap-2.5">
                  <div className="w-1.5 h-4 rounded-full bg-cyan-500 shadow-xs" />
                  <Clock className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  <h3 className="font-bold text-sm tracking-wide text-foreground">Timelines & Resources</h3>
                </div>
              </div>

              <div className="p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                  <div className="flex flex-col p-3.5 rounded-xl bg-surface/80 dark:bg-elevated/40 backdrop-blur-md border border-border/50 hover:border-border/80 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300 justify-center min-h-[76px]">
                    <span className="theme-label mb-1.5 text-muted flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-emerald-500" /> Start Date <span className="text-red-500">*</span>
                    </span>
                    {isEditable ? (
                      <AppInput type="date" min={requirement.created_at?.split('T')[0]} value={formData.start_date} onChange={(e) => handleDateChange('start_date', e.target.value)} className="w-full" />
                    ) : (
                      <span className="theme-data-value text-foreground truncate">
                        {requirement.start_date ? new Date(requirement.start_date).toLocaleDateString() : (requirement.created_at ? new Date(requirement.created_at).toLocaleDateString() : 'Not Set')}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col p-3.5 rounded-xl bg-surface/80 dark:bg-elevated/40 backdrop-blur-md border border-border/50 hover:border-border/80 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300 justify-center min-h-[76px]">
                    <span className="theme-label mb-1.5 text-muted flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-500" /> Due Date <span className="text-red-500">*</span>
                    </span>
                    {isEditable ? (
                      <AppInput type="date" min={formData.start_date || requirement.created_at?.split('T')[0]} value={formData.due_date} onChange={(e) => handleDateChange('due_date', e.target.value)} className="w-full" />
                    ) : (
                      <span className="theme-data-value text-foreground truncate">
                        {requirement.due_date || requirement.expected_completion_date ? new Date(requirement.due_date || requirement.expected_completion_date).toLocaleDateString() : 'Not Set'}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col p-3.5 rounded-xl bg-surface/80 dark:bg-elevated/40 backdrop-blur-md border border-border/50 hover:border-border/80 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300 justify-center min-h-[76px]">
                    <span className="theme-label mb-1.5 text-muted flex items-center gap-1.5">
                      <Hourglass className="w-3.5 h-3.5 text-cyan-500" /> Estimated Effort (Days) <span className="text-red-500">*</span>
                    </span>
                    {isEditable ? (
                      <AppInput type="number" min="1" value={formData.estimated_effort} onChange={handleEffortChange} className="w-full" placeholder="e.g. 5" />
                    ) : (
                      <span className="theme-data-value text-foreground truncate">
                        {requirement.estimated_effort || requirement.custom_fields?.estimated_effort || (requirement.start_date && requirement.due_date ? Math.max(1, Math.round((new Date(requirement.due_date).getTime() - new Date(requirement.start_date).getTime()) / (1000 * 60 * 60 * 24))) : '5 Days')}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col p-3.5 rounded-xl bg-surface/80 dark:bg-elevated/40 backdrop-blur-md border border-border/50 hover:border-border/80 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300 justify-center min-h-[76px]">
                    <span className="theme-label mb-1.5 text-muted flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-indigo-500" /> Estimated Cost
                    </span>
                    {isEditable || isSuperAdmin ? (
                      <AppInput type="number" placeholder="Amount (e.g. 50000)" value={formData.estimated_cost} onChange={(e) => setFormData({...formData, estimated_cost: e.target.value})} className="w-full" />
                    ) : (
                      <span className="theme-data-value text-foreground truncate">
                        {requirement.estimated_cost ? `₹${requirement.estimated_cost}` : (requirement.custom_fields?.estimated_cost ? `₹${requirement.custom_fields.estimated_cost}` : 'Standard Budget')}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col p-3.5 rounded-xl bg-surface/80 dark:bg-elevated/40 backdrop-blur-md border border-border/50 hover:border-border/80 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300 justify-center min-h-[76px]">
                    <span className="theme-label mb-1.5 text-muted flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-pink-500" /> Estimated Resources
                    </span>
                    {isEditable ? (
                      <AppInput placeholder="e.g. 2 Developers" value={formData.estimated_resources} onChange={(e) => setFormData({...formData, estimated_resources: e.target.value})} className="w-full" />
                    ) : (
                      <span className="theme-data-value text-foreground truncate">
                        {requirement.estimated_resources || requirement.custom_fields?.estimated_resources || 'Standard Team'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </AppCard>


            {/* 4. CARD: Impacted Departments & Define Approval Sequence * */}
            <AppCard className="overflow-hidden border border-border/50 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-500 bg-surface/40 backdrop-blur-xl p-0 mb-4">
              <div className="bg-gradient-to-r from-indigo-500/15 via-surface/90 to-surface/40 dark:from-indigo-600/30 dark:via-elevated/90 dark:to-elevated/40 px-5 py-3.5 border-b border-border/80 flex items-center justify-between rounded-t-2xl">
                <div className="flex items-center gap-2.5">
                  <div className="w-1.5 h-4 rounded-full bg-indigo-500 shadow-xs" />
                  <Briefcase className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="font-bold text-sm tracking-wide text-foreground">Impacted Departments & Define Approval Sequence *</h3>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col p-3.5 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-800/60">
                    <span className="theme-label mb-1.5 text-indigo-600 dark:text-indigo-400">
                      Primary Impacted Department
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full theme-data-value bg-indigo-600 text-white shadow-xs">
                        {requirement.department?.name || snap.department || 'IT & Digital Transformation'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col p-3.5 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 border border-purple-200 dark:border-purple-800/60">
                    <span className="theme-label mb-1.5 text-purple-600 dark:text-purple-400">
                      Department Approvers & Stakeholders (Sequence Configured)
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {approvalFlow && approvalFlow.length > 0 ? (
                        approvalFlow.map((flow: any, idx: number) => (
                          <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-surface dark:bg-elevated border border-border text-foreground">
                            <span className="w-4 h-4 rounded-full bg-purple-600 text-white text-[10px] font-extrabold flex items-center justify-center">{idx + 1}</span>
                            {flow.approver?.full_name || flow.user?.full_name || `Approver Level ${idx + 1}`}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs font-medium text-muted italic">Department Approver Sequence Configured</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Define Approval Sequence * Selector Matrix */}
                <div className="p-4 rounded-xl bg-surface/80 dark:bg-elevated/40 border border-border/60 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-accent" /> Select Impacted Departments & Define Approval Sequence <span className="text-red-500">*</span>
                    </span>
                    <span className="text-[10px] text-muted font-medium">Click departments to select, then assign approver order (1st, 2nd, etc).</span>
                  </div>

                  {/* 1. Impacted Department Buttons */}
                  <div className="flex flex-wrap gap-2">
                    {(masters.departments || []).map((d: any) => {
                      const isSelected = formData.impacted_departments.includes(d.id);
                      return (
                        <AppButton
                          type="button"
                          variant="ghost"
                          size="sm"
                          key={d.id}
                          onClick={() => handleDepartmentToggle(d.id)}
                          className={`px-2 py-1 rounded-xl text-[11px] font-semibold transition-all border flex items-center gap-1.5 cursor-pointer ${
                            isSelected 
                              ? "bg-theme-btn-primary border-transparent text-theme-btn-primary-text shadow-sm scale-[1.02]" 
                              : "bg-surface dark:bg-elevated/30 border-border text-muted hover:text-foreground hover:border-accent/40"
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full ${isSelected ? "bg-surface" : "bg-accent"}`} />
                          <span>{d.name}</span>
                          {isSelected && <span className="text-[10px] font-extrabold bg-surface/20 px-1.5 py-0.2 rounded-full">Selected</span>}
                        </AppButton>
                      );
                    })}
                  </div>

                  {/* 2. Interactive Approval Sequence Builder per Selected Department */}
                  {formData.impacted_departments.length > 0 && (
                    <div className="mt-4 space-y-4 pt-3 border-t border-border/60">
                      <label className="block theme-label text-muted">
                        Configure Department Approval Sequence <span className="text-red-500">*</span>
                      </label>
                      {formData.impacted_departments.map((deptId: string) => {
                        const dept = masters.departments?.find((d: any) => d.id === deptId);
                        const deptName = dept?.name || 'Department';
                        
                        // Filter users for this department or fallback to all users if none found
                        let deptUsers = (masters.users || []).filter((u: any) => u.department_id === deptId || u.department === deptName);

                        const selectedApprovers = formData.department_approvers[deptId] || [];

                        return (
                          <div key={deptId} className="p-4 rounded-xl border border-accent/30 bg-accent/5 dark:bg-accent/10 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="theme-data-value text-accent flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-accent" />
                                {deptName} Approvers
                              </span>
                              <span className="theme-label text-muted">Select users in order (1st = Approver, 2nd = Executive, etc)</span>
                            </div>

                            <div className="flex flex-wrap gap-2 pt-1">
                              {deptUsers.length === 0 ? (
                                <div className="text-xs text-muted italic p-2 border border-dashed border-border dark:border-white/10 rounded-lg w-full text-center">
                                  No users assigned to the {deptName} department.
                                </div>
                              ) : (
                                deptUsers.map((u: any) => {
                                  const isUserSelected = selectedApprovers.includes(u.id);
                                  const orderIndex = selectedApprovers.indexOf(u.id) + 1;

                                  return (
                                    <AppButton
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      key={u.id}
                                      onClick={() => {
                                        setFormData((prev: any) => {
                                          const current = prev.department_approvers[deptId] || [];
                                          if (current.includes(u.id)) {
                                            return { 
                                              ...prev, 
                                              department_approvers: { 
                                                ...prev.department_approvers, 
                                                [deptId]: current.filter((id: string) => id !== u.id) 
                                              } 
                                            };
                                          } else {
                                            return { 
                                              ...prev, 
                                              department_approvers: { 
                                                ...prev.department_approvers, 
                                                [deptId]: [...current, u.id] 
                                              } 
                                            };
                                          }
                                        });
                                      }}
                                      className={`px-2 py-1 rounded-lg text-[11px] font-semibold border flex items-center gap-2 cursor-pointer transition-all ${
                                        isUserSelected 
                                          ? "bg-theme-btn-primary border-transparent text-theme-btn-primary-text shadow-xs" 
                                          : "bg-surface dark:bg-elevated/40 border-border text-foreground hover:border-accent/40"
                                      }`}
                                    >
                                      {isUserSelected && (
                                        <span className="bg-surface/25 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-extrabold">
                                          {orderIndex}
                                        </span>
                                      )}
                                      <span>{u.full_name || u.name || 'User'}</span>
                                    </AppButton>
                                  );
                                })
                              )}
                            </div>

                            {/* Approval Sequence Preview Strip */}
                            {selectedApprovers.length > 0 && (
                              <div className="mt-2 p-2.5 rounded-lg bg-surface/90 dark:bg-elevated/60 border border-accent/20">
                                <div className="theme-label text-accent mb-1">
                                  {deptName} - Configured Approval Sequence
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-foreground">
                                  {selectedApprovers.map((id: string, index: number) => {
                                    const user = (masters.users || []).find((u: any) => u.id === id);
                                    const roleLabel = index === 0 ? "1st (Approver)" : index === 1 ? "2nd (Executive)" : `${index + 1}th Level`;
                                    return (
                                      <div key={id} className="flex items-center gap-1.5">
                                        <span className="text-accent font-bold">{roleLabel}:</span>
                                        <span className="bg-surface dark:bg-elevated px-2 py-0.5 rounded border border-border">{user?.full_name || user?.name || 'User'}</span>
                                        {index < selectedApprovers.length - 1 && <span className="text-accent font-bold">→</span>}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </AppCard>

            {/* 5. CARD: Add New Analysis Remarks (Mandatory for Approvers) & Remarks History */}
            <AppCard className="overflow-hidden border border-border/50 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-500 bg-surface/40 backdrop-blur-xl p-0 mb-4">
              {/* Card Header */}
              <div className="bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-surface/40 dark:from-amber-600/30 dark:via-rose-900/20 dark:to-elevated/40 px-5 py-3.5 border-b border-border/80 flex items-center justify-between rounded-t-2xl select-none">
                <div className="flex items-center gap-2.5">
                  <div className="w-1.5 h-4 rounded-full bg-amber-500 shadow-xs animate-pulse" />
                  <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <h3 className="font-bold text-sm tracking-wide text-foreground">Analysis Remarks & Approver History</h3>
                </div>
              </div>

              <div className="p-5 space-y-5">
                {/* SECTION 1: Add New Analysis Remarks (Always Visible & Accessible) */}
                <div className="flex flex-col space-y-2 p-4 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-800/60">
                  <label className="theme-data-value uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Add New Analysis Remarks (Mandatory for Approvers) <span className="text-red-500">*</span>
                  </label>
                  <RichTextEditor
                    value={approvalRemarks}
                    onChange={setApprovalRemarks}
                    placeholder="Enter mandatory analysis remarks, technical recommendations, or approval feedback with rich text decorations..."
                  />
                    <span className="theme-label text-muted">Mandatory entry for workflow signoff and audit trail logging.</span>
                  </div>

                {/* SECTION 2: Remarks History (Separated, Default Minimized) */}
                <div className="pt-3 border-t border-border/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="theme-label flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-theme-icon" /> Remarks History ({auditLogs.length})
                    </h4>
                    
                    <AppButton
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsRemarksHistoryMinimized(!isRemarksHistoryMinimized)}
                      className="theme-data-value text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all"
                    >
                      {isRemarksHistoryMinimized ? (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          <span>Show Remarks History ({auditLogs.length})</span>
                        </>
                      ) : (
                        <>
                          <ChevronRight className="w-4 h-4" />
                          <span>Hide Remarks History</span>
                        </>
                      )}
                    </AppButton>
                  </div>

                  {!isRemarksHistoryMinimized && (
                    <div className="transition-all duration-300 animate-in fade-in slide-in-from-top-2">
                      {auditLogs.length > 0 ? (
                        <div className="space-y-2.5 max-h-60 overflow-y-auto scrollbar-thin pr-1">
                          {auditLogs.map((log: any, idx: number) => (
                            <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-surface border border-border/60 hover:border-border transition-all">
                              <div className="w-7 h-7 rounded-full bg-theme-btn-primary/20 text-theme-icon font-bold text-xs flex items-center justify-center shrink-0">
                                {log.user?.full_name?.substring(0, 2).toUpperCase() || 'U'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <span className="theme-data-value text-foreground truncate">{log.user?.full_name || log.actor_name || 'System Actor'}</span>
                                  <span className="theme-label text-muted">{new Date(log.created_at || log.timestamp).toLocaleString()}</span>
                                </div>
                                <div className="theme-data-value text-muted-foreground leading-relaxed break-words">
                                  <SafeHtml html={log.action || log.remarks || log.message || 'Updated requirement parameters.'} />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl bg-surface border border-border/50 text-center text-xs text-muted font-medium italic">
                          No previous remarks recorded. New entries will appear in the audit trail.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </AppCard>

            {/* Analysis Action Buttons (Frozen Footer) */}
            {((isSuperAdmin && !isViewMode) || isCurrentApprover) && (
              <div className="sticky bottom-0 z-[100] -mx-4 p-4 mt-6 bg-background/95 dark:bg-background/90 backdrop-blur-md border-t border-border/80 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] flex items-center justify-end gap-3 rounded-t-2xl">
                {isCurrentApprover ? (
                  <>
                    <span className="text-sm font-semibold text-amber-600 dark:text-amber-400 mr-auto flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Pending Your Approval
                    </span>
                    <AppButton variant="secondary" onClick={() => submitApproval('Hold')} isLoading={savingApproval} leftIcon={<PauseCircle className="h-4 w-4"/>}>Hold</AppButton>
                    <AppButton variant="destructive" onClick={() => submitApproval('Reject')} isLoading={savingApproval} leftIcon={<XCircle className="h-4 w-4"/>}>Reject</AppButton>
                    <AppButton variant="primary" onClick={() => submitApproval('Approve')} isLoading={savingApproval} leftIcon={<CheckCircle className="h-4 w-4"/>}>Approve</AppButton>
                  </>
                ) : (
                  isEditable ? (
                    <>
                      <AppButton
                        type="button"
                        variant="outline"
                        onClick={() => handleAction('SAVE')}
                        leftIcon={<Save className="w-4 h-4" />}
                      >
                        Save Draft
                      </AppButton>
                      
                      {requirement.approval_status !== 'On Hold' && (
                        <AppButton
                          type="button"
                          variant="secondary"
                          onClick={() => handleAction('HOLD')}
                          leftIcon={<PauseCircle className="w-4 h-4" />}
                        >
                          Hold Requirement
                        </AppButton>
                      )}

                      <AppButton
                        type="button"
                        variant="destructive"
                        onClick={() => handleAction('CANCEL')}
                        leftIcon={<XCircle className="w-4 h-4" />}
                      >
                        Reject Requirement
                      </AppButton>

                      <AppButton
                        type="button"
                        variant="primary"
                        onClick={() => handleAction('ACCEPT')}
                        leftIcon={<CheckCircle className="w-4 h-4" />}
                      >
                        Accept & Initiate Approval
                      </AppButton>
                    </>
                  ) : (
                    <AppButton
                      type="button"
                      variant="outline"
                      onClick={() => handleAction('SAVE')}
                      leftIcon={<Save className="w-4 h-4" />}
                    >
                      Update Details
                    </AppButton>
                  )
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Approval Workflow */}
        {activeTab === 'approval' && (
          <div className="flex flex-col space-y-6 pb-12 animate-in fade-in duration-300">
            {/* DEDICATED CARD: Analysis Remarks & Approver History */}
            <AppCard className="overflow-hidden border border-border/50 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-500 bg-surface/40 backdrop-blur-xl p-0 mb-4">
              <div className="bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-surface/40 dark:from-amber-600/30 dark:via-rose-900/20 dark:to-elevated/40 px-5 py-3.5 border-b border-border/80 flex items-center justify-between rounded-t-2xl select-none">
                <div className="flex items-center gap-2.5">
                  <div className="w-1.5 h-4 rounded-full bg-amber-500 shadow-xs animate-pulse" />
                  <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <h3 className="font-bold text-sm tracking-wide text-foreground">Add New Analysis Remarks (Mandatory for Approvers) & History</h3>
                  {auditLogs.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full theme-label bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      {auditLogs.length} Entries
                    </span>
                  )}
                </div>

                <AppButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsRemarksHistoryMinimized(!isRemarksHistoryMinimized)}
                  className="theme-data-value text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all"
                >
                  {isRemarksHistoryMinimized ? (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      <span>Maximize</span>
                    </>
                  ) : (
                    <>
                      <ChevronRight className="w-4 h-4" />
                      <span>Minimize</span>
                    </>
                  )}
                </AppButton>
              </div>

              {!isRemarksHistoryMinimized && (
                <div className="p-5 space-y-5 transition-all duration-300">
                  <div className="flex flex-col space-y-2 p-4 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-800/60">
                    <label className="theme-data-value uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> New Analysis Remarks / Approver Feedback <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={approvalRemarks}
                      onChange={(e) => setApprovalRemarks(e.target.value)}
                      className="w-full text-xs font-medium p-3.5 rounded-xl border border-border bg-surface text-foreground placeholder:text-muted focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all leading-relaxed"
                      rows={3}
                      placeholder="Enter mandatory analysis remarks, technical recommendations, or approval feedback..."
                    />
                    <span className="theme-label text-muted">Mandatory entry for workflow signoff and audit trail logging.</span>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="theme-label flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-theme-icon" /> Remark & Audit History ({auditLogs.length})
                    </h4>
                    
                    {auditLogs.length > 0 ? (
                      <div className="space-y-2.5 max-h-60 overflow-y-auto scrollbar-thin pr-1">
                        {auditLogs.map((log: any, idx: number) => (
                          <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-surface border border-border/60 hover:border-border transition-all">
                            <div className="w-7 h-7 rounded-full bg-theme-btn-primary/20 text-theme-icon font-bold text-xs flex items-center justify-center shrink-0">
                              {log.user?.full_name?.substring(0, 2).toUpperCase() || 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="theme-data-value text-foreground truncate">{log.user?.full_name || log.actor_name || 'System Actor'}</span>
                                <span className="theme-label text-muted">{new Date(log.created_at || log.timestamp).toLocaleString()}</span>
                              </div>
                              <div 
                                className="text-xs text-muted-foreground leading-relaxed break-words quill-rendered-content"
                                dangerouslySetInnerHTML={{ __html: log.action || log.remarks || log.message || 'Updated requirement parameters.' }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-surface border border-border/50 text-center text-xs text-muted font-medium italic">
                        No previous remarks recorded. New entries will appear in the audit trail.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </AppCard>
          </div>
        )}

        <div className={`rounded-lg mb-10 ${activeTab !== 'analysis' ? 'bg-surface dark:bg-[#050505] border border-border/50 dark:border-white/5 p-3 shadow-sm' : ''}`}>
          {activeTab === 'details' && (
            <div className="flex flex-col h-full animate-in fade-in duration-300 gap-4 p-2">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-theme-icon" /> Associated Files & Attachments ({attachments.length})
                </h3>
              </div>

              {attachments.length > 0 ? (
                <div className="flex gap-3 flex-wrap">
                  {attachments.map(att => (
                    <div
                      key={att.id}
                      className="flex items-center gap-2 pl-3 pr-1 py-1.5 bg-surface dark:bg-elevated/40 border border-border/60 rounded-xl text-xs shadow-2xs hover:border-border transition-all"
                    >
                      <Paperclip className="h-4 w-4 text-theme-icon" />
                      <span className="text-foreground font-semibold truncate max-w-[200px]" title={att.original_file_name || att.file_name}>{att.original_file_name || att.file_name}</span>
                      <span className="text-[10px] text-muted mr-2">{(att.file_size / 1024).toFixed(1)} KB</span>
                      <div className="flex items-center gap-1 border-l border-border/60 pl-2">
                        <AppButton 
                          variant="ghost" size="sm"
                          onClick={() => handleAttachmentAction(att.id, 'view')}
                          className="p-1.5 text-muted hover:text-theme-icon hover:bg-theme-btn-primary/10 rounded-lg transition-colors"
                          title="View Attachment"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </AppButton>
                        <AppButton 
                          variant="ghost" size="sm"
                          onClick={() => handleAttachmentAction(att.id, 'download')}
                          className="p-1.5 text-muted hover:text-theme-icon hover:bg-theme-btn-primary/10 rounded-lg transition-colors"
                          title="Download Attachment"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </AppButton>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-xl bg-surface/50 border border-border/50 text-center text-xs text-muted font-medium italic">
                  No attachments associated with this requirement.
                </div>
              )}
            </div>
          )}

          

          {activeTab === 'approval' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {approvalFlow.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 opacity-50 mt-4 border border-dashed border-border dark:border-white/10 rounded-lg">
                  <Shield className="h-8 w-8 mb-2 text-theme-icon" />
                  <p className="text-xs text-muted dark:text-muted">No approval workflow has been initiated yet.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(
                    approvalFlow.reduce((acc, flow) => {
                      const deptName = flow.department?.name || 'Unknown Department';
                      if (!acc[deptName]) acc[deptName] = [];
                      acc[deptName].push(flow);
                      return acc;
                    }, {} as Record<string, any[]>)
                  ).map(([deptName, flows]: any) => (
                    <div key={deptName} className="p-4 bg-surface dark:bg-[#0a0d14] rounded-lg border border-border dark:border-white/10 shadow-sm">
                      <h3 className="text-sm font-bold text-foreground dark:text-muted mb-4 border-b border-border/50 dark:border-white/5 pb-2">
                        {deptName} Approvals
                      </h3>
                      <div className="relative">
                        {/* Connecting Line */}
                        <div className="absolute top-5 left-4 bottom-5 w-0.5 bg-elevated dark:bg-surface/10" />
                        
                        <div className="space-y-6 relative z-10">
                          {flows.map((flow: any, index: number) => {
                            const isApproved = flow.status === 'Approved' || flow.status === 'Bypassed';
                            const isPending = flow.status === 'Pending';
                            const isRejected = flow.status === 'Rejected';
                            
                            let statusColor = "bg-surface dark:bg-surface/5 border-border dark:border-white/10 text-muted";
                            let icon = <Clock className="h-3.5 w-3.5" />;
                            
                            if (isApproved) {
                              statusColor = "bg-green-100 dark:bg-green-900/30 border-green-500 text-green-700 dark:text-green-400";
                              icon = <CheckCircle className="h-3.5 w-3.5" />;
                            } else if (isRejected) {
                              statusColor = "bg-red-100 dark:bg-red-900/30 border-red-500 text-red-700 dark:text-red-400";
                              icon = <XCircle className="h-3.5 w-3.5" />;
                            } else if (isPending) {
                              statusColor = "bg-amber-100 dark:bg-amber-900/30 border-amber-500 text-amber-700 dark:text-amber-400";
                              icon = <AlertTriangle className="h-3.5 w-3.5" />;
                            }
                            
                            return (
                              <div key={flow.id} className="flex gap-4 items-start pl-2">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 shrink-0 bg-surface dark:bg-[#050505] mt-1 z-10 ${isApproved ? 'border-green-500 text-green-500' : isRejected ? 'border-red-500 text-red-500' : isPending ? 'border-amber-500 text-amber-500' : 'border-border dark:border-border text-muted'}`}>
                                  {isApproved ? <CheckCircle className="w-3 h-3" /> : isRejected ? <XCircle className="w-3 h-3" /> : <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                                </div>
                                <div className={`flex-1 p-3 rounded-lg border ${statusColor} transition-colors`}>
                                  <div className="flex justify-between items-start mb-1">
                                    <div className="font-semibold text-sm">Level {flow.level}: {flow.approver?.full_name || 'Unknown User'}</div>
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface/50 dark:bg-surface/20">
                                      {icon} {flow.status}
                                    </div>
                                  </div>
                                  {flow.actioned_at && (
                                    <div className="text-[10px] text-muted dark:text-muted mb-2">
                                      {new Date(flow.actioned_at).toLocaleString()}
                                    </div>
                                  )}
                                  {flow.remarks && (
                                    <div className="text-xs bg-surface/60 dark:bg-surface/30 p-2 rounded text-subtle dark:text-muted italic border border-black/5 dark:border-white/5">
                                      <SafeHtml html={flow.remarks} />
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            
            {/* Approval Action Buttons (Frozen Footer) */}
            {isCurrentApprover && (
              <div className="sticky bottom-0 z-[100] -mx-4 p-4 mt-6 bg-background/95 dark:bg-background/90 backdrop-blur-md border-t border-border/80 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] flex items-center justify-end gap-3 rounded-t-2xl">
                <span className="text-sm font-semibold text-amber-600 dark:text-amber-400 mr-auto flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Pending Your Approval
                </span>
                <AppButton variant="secondary" onClick={() => submitApproval('Hold')} isLoading={savingApproval} leftIcon={<PauseCircle className="h-4 w-4"/>}>Hold</AppButton>
                <AppButton variant="destructive" onClick={() => submitApproval('Reject')} isLoading={savingApproval} leftIcon={<XCircle className="h-4 w-4"/>}>Reject</AppButton>
                <AppButton variant="primary" onClick={() => submitApproval('Approve')} isLoading={savingApproval} leftIcon={<CheckCircle className="h-4 w-4"/>}>Approve</AppButton>
              </div>
            )}
          </div>
        )}

        {activeTab === 'tasks' && (
            <div className="space-y-4 animate-in fade-in duration-300 pt-2 pb-10">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-border dark:border-white/10">
                <div className="flex items-center gap-2">
                  <Server className="h-5 w-5 text-emerald-500" />
                  <h2 className="text-sm font-bold text-foreground dark:text-white">Implementation Tasks</h2>
                </div>
              </div>
              
              {linkedTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 opacity-50 mt-4">
                  <Server className="h-8 w-8 mb-2 text-emerald-500" />
                  <p className="text-xs text-muted dark:text-muted">Generated implementation tasks will appear here.</p>
                </div>
              ) : (
                <AppTable>
                  <AppTableHeader>
                    <AppTableRow>
                      <AppTableHead>Task Name</AppTableHead>
                      <AppTableHead>Assignee</AppTableHead>
                      <AppTableHead>Status</AppTableHead>
                      <AppTableHead>Due Date</AppTableHead>
                      <AppTableHead>Linked On</AppTableHead>
                    </AppTableRow>
                  </AppTableHeader>
                  <AppTableBody>
                    {linkedTasks.map((link: any) => (
                      <AppTableRow key={link.task_id} className="hover:bg-surface dark:hover:bg-surface/5 transition-colors cursor-pointer" onClick={() => router.push(`/tasks/${link.task_id}`)}>
                        <AppTableCell className="font-medium text-foreground dark:text-white">
                          {link.task?.subject || 'Untitled Task'}
                        </AppTableCell>
                        <AppTableCell className="text-subtle dark:text-muted">
                          {link.task?.assigned_to_user?.full_name || 'Unassigned'}
                        </AppTableCell>
                        <AppTableCell>
                          <span 
                            className="px-2 py-1 text-[10px] font-bold uppercase rounded-full tracking-wider"
                            style={{ 
                              backgroundColor: link.task?.status?.status_color ? `${link.task.status.status_color}20` : '#e5e7eb',
                              color: link.task?.status?.status_color || '#374151'
                            }}
                          >
                            {link.task?.status?.name || 'New'}
                          </span>
                        </AppTableCell>
                        <AppTableCell className="text-subtle dark:text-muted">
                          {link.task?.end_date ? new Date(link.task.end_date).toLocaleDateString() : '-'}
                        </AppTableCell>
                        <AppTableCell className="text-muted dark:text-muted text-xs">
                          {new Date(link.linked_at).toLocaleDateString()}
                        </AppTableCell>
                      </AppTableRow>
                    ))}
                  </AppTableBody>
                </AppTable>
              )}
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-4 animate-in fade-in duration-300 pt-2 pb-10">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border dark:border-white/10">
                <Clock className="h-5 w-5 text-theme-icon" />
                <h2 className="text-sm font-bold text-foreground dark:text-white">Audit Trail & Lifecycle History</h2>
              </div>
              
              {auditLogs.length === 0 ? (
                <div className="p-8 text-center text-muted text-sm bg-surface dark:bg-surface/5 rounded-lg border border-border/50 dark:border-white/10">
                  No activity recorded yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {auditLogs.map((log: any) => (
                    <AppCard key={log.id} className="p-3 flex flex-col gap-1 shadow-sm">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-theme-btn-primary/10 dark:bg-theme-btn-primary/20 flex items-center justify-center text-theme-icon dark:text-theme-icon">
                            <Clock className="w-3 h-3" />
                          </div>
                          <span className="font-bold text-sm text-foreground dark:text-white">{log.event_type.replace(/_/g, ' ')}</span>
                        </div>
                        <span className="text-xs text-muted">{new Date(log.performed_at).toLocaleString()}</span>
                      </div>
                      <div className="ml-8 text-xs text-subtle dark:text-muted">
                        Performed by <span className="font-semibold text-foreground dark:text-muted">{log.user?.full_name || 'System'}</span>
                      </div>
                      {log.new_value && (
                        <div className="ml-8 mt-2 p-3 bg-surface dark:bg-[#0a0d14] rounded-md text-xs text-subtle dark:text-muted border border-border/50 dark:border-white/5 font-mono">
                          {typeof log.new_value === 'string' ? (
                            <span className="whitespace-pre-wrap">{log.new_value}</span>
                          ) : (
                            <ul className="space-y-1">
                              {Object.entries(log.new_value)
                                .filter(([key]) => !['task_id', 'workspace_id', 'sub_workspace_id', 'override'].includes(key.toLowerCase()))
                                .map(([key, value]) => (
                                <li key={key} className="flex gap-2">
                                  <span className="text-muted font-bold min-w-[100px] truncate">{key.replace(/_/g, ' ').toUpperCase()}:</span>
                                  <span className="flex-1 text-foreground dark:text-gray-100 whitespace-pre-wrap">{String(value)}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </AppCard>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Dialog open={showAddMasterModal} onOpenChange={setShowAddMasterModal}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-border dark:border-white/10 shadow-2xl rounded-xl bg-surface dark:bg-[#0a0d14]">
          <DialogHeader className="px-6 py-4 border-b border-border/50 dark:border-white/5 bg-surface/50 dark:bg-surface/30">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <FilePlus className="h-5 w-5 text-theme-icon" />
              Add {masterModalType === 'issue_type' ? 'Requirement Type' : 'Business Value'}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div>
              <label className="block theme-data-value text-subtle dark:text-muted mb-1">Name <span className="text-red-500">*</span></label>
              <AppInput
                autoFocus
                placeholder="Enter name..."
                value={newMasterName}
                onChange={(e) => setNewMasterName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddMasterSubmit(); }}
              />
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t border-border/50 dark:border-white/5 bg-surface dark:bg-surface/5">
            <AppButton variant="outline" onClick={() => setShowAddMasterModal(false)}>Cancel</AppButton>
            <AppButton 
              variant="primary" 
              disabled={!newMasterName.trim() || isAddingMaster} 
              isLoading={isAddingMaster}
              onClick={handleAddMasterSubmit}
            >
              Add
            </AppButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
