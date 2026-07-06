"use client";

import React, { useState, useEffect } from "react";
import { AppCard, AppCardHeader, AppCardTitle, AppCardContent } from "@/components/ui/AppCard";
import { AppTable, AppTableHeader, AppTableRow, AppTableHead, AppTableBody, AppTableCell } from "@/components/ui/AppTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { AppBadge } from "@/components/ui/AppBadge";
import { Plus, RefreshCw, ArrowLeft, ShieldAlert, Trash2, Paperclip, Eye, Download, CheckCircle, PauseCircle, XCircle, FilePlus, Save, Edit2, AlertTriangle, Briefcase, Server, Calendar, Shield, Clock, FileText, Target } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { PageContainer } from "@/components/layout/PageContainer";
import { usePermissions } from "@/hooks/usePermissions";
import Link from "next/link";
import TaskCreationWizard from "@/components/tasks/TaskCreationWizard";

export default function RequirementAnalyzePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const supabase = createClient();
  const [reqId, setReqId] = useState<string>("");
  
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

  const [showAmendmentDialog, setShowAmendmentDialog] = useState(false);
  const [amendmentDetails, setAmendmentDetails] = useState("");
  const [needsReapproval, setNeedsReapproval] = useState(false);
  const [submittingAmendment, setSubmittingAmendment] = useState(false);
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
    users: []
  });

  useEffect(() => {
    params.then(p => {
      setReqId(p.id);
    });
  }, [params]);

  useEffect(() => {
    const fetchUserRole = async () => {
       const { data: { user } } = await supabase.auth.getUser();
       if (!user) return;
       const { data: userRoles } = await supabase
         .from('user_roles')
         .select('roles(code)')
         .eq('user_id', user.id);
       const isSuper = userRoles?.some((ur: any) => ur.roles?.code === 'SUPER_ADMIN' || ur.roles?.code === 'ROLE_SUPER_ADMIN') ?? false;
       const isAdminRole = userRoles?.some((ur: any) => ur.roles?.code === 'ADMIN_ROLE' || ur.roles?.code === 'ROLE_ADMIN') ?? false;
       setIsAdmin(isSuper || isAdminRole);
       setIsSuperAdmin(isSuper);
       setCurrentUserId(user.id);

       const { data: userData } = await supabase.from('user_master').select('department_id').eq('id', user.id).single();
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

        const attRes = await supabase.from('attachments').select('*').eq('module_type', 'requirement').eq('record_id', data.id);
        const { data: approvalFlow } = await supabase
        .from('requirement_approval_flow')
        .select('*, approver:user_master!requirement_approval_flow_approver_id_fkey(id, full_name, role:user_roles(role_master(role_name))), department:departments!requirement_approval_flow_department_id_fkey(name)')
        .eq('requirement_id', reqId)
        .order('level', { ascending: true });
        
        setApprovalFlow(approvalFlow || []);
        setAttachments(attRes.data || []);
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

      const [deptRes, issueRes, priRes, userRes] = await Promise.all([
        supabase.from('departments').select('id, name').eq('is_deleted', false),
        issueQuery,
        priQuery,
        supabase.from('user_master').select('id, full_name, department_id, email, designation_id').eq('is_active', true).eq('is_deleted', false)
      ]);

      setMasters({
        departments: deptRes.data || [],
        issue_types: issueRes.data || [],
        priority_master: priRes.data || [],
        users: userRes.data || []
      });

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (reqId) {
      loadData();
    }
  }, [reqId]);

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
      const { amendRequirement } = await import("@/lib/actions/requirements");
      const res = await amendRequirement(reqId, amendmentDetails, needsReapproval);
      if (res.error) throw new Error(res.error);
      setShowAmendmentDialog(false);
      setAmendmentDetails("");
      setNeedsReapproval(false);
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
      if (!formData.analysis_remarks?.trim()) {
        alert("Remarks are mandatory before saving or submitting.");
        return;
      }

      if (action === 'ACCEPT') {
        if (!formData.impacted_departments.length || !formData.due_date || !formData.dependency_notes?.trim() || !formData.technical_scope?.trim() || !formData.estimated_effort?.trim()) {
            alert("Impacted Departments, Due Date, Dependency Notes, Technical Scope, and Estimated Effort are mandatory to Accept.");
            return;
        }
        for (const deptId of formData.impacted_departments) {
            if (!formData.department_approvers[deptId] || formData.department_approvers[deptId].length === 0) {
                alert("Please select at least one approver for each Impacted Department.");
                return;
            }
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const start = new Date(formData.start_date);
        start.setHours(0, 0, 0, 0);
        if (start < today) {
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
        await submitRequirementAnalysis(requirement.id, formData, user!.id, action);
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

  const handleAttachmentAction = async (attId: string, action: 'view' | 'download') => {
    try {
      const { getAttachmentDownloadUrl } = await import("@/lib/actions/attachments");
      const { signedUrl } = await getAttachmentDownloadUrl(attId, action === 'download');
      
      if (action === 'download') {
        const link = document.createElement('a');
        link.href = signedUrl;
        link.download = ''; // Supabase backend logic will inject the attachment's filename into the Content-Disposition headers via createSignedUrl
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        window.open(signedUrl, '_blank');
      }
    } catch (e: any) {
      alert(`Failed to ${action} attachment: ` + (e.message || "Unknown error"));
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white dark:bg-[#050505]">
        <div className="animate-spin h-10 w-10 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!requirement) {
    return (
      <div className="h-screen flex flex-col items-center justify-center text-gray-900 dark:text-white bg-white dark:bg-[#050505]">
        <h2>Requirement not found.</h2>
        <AppButton onClick={() => router.push('/requirements')} className="mt-4">Back to List</AppButton>
      </div>
    );
  }

  const isViewMode = searchParams.get('mode') === 'view';
  const isEditable = !isViewMode && (!requirement.approval_status || requirement.approval_status === 'Draft' || requirement.approval_status === 'Pending' || requirement.approval_status === 'On Hold' || requirement.approval_status === 'Rejected' || requirement.approval_status === 'Clarification');
  const snap = requirement.intake_snapshot || {};

  return (
    <PageContainer strict={false} className="px-4 pb-4 pt-2">
      <div className="flex items-center justify-between pb-2 mb-2 shrink-0 border-b border-gray-200 dark:border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex items-baseline gap-2">
            <h1 className="text-[1.1rem] font-bold text-gray-900 dark:text-white truncate max-w-2xl leading-tight">
              <span className="text-gray-500 mr-2 uppercase text-sm tracking-wider">{requirement.code || reqId}</span>
              {requirement.title || 'Untitled Subject'}
            </h1>
          </div>
          <AppBadge variant="info">{requirement.approval_status || requirement.status?.name || "Draft"}</AppBadge>
          <div className="flex items-center gap-2 ml-2 border-l border-gray-300 dark:border-white/10 pl-3 hidden md:flex">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Priority:</span>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full text-foreground tracking-wide shadow-sm" style={{ backgroundColor: requirement.priority?.priority_color || '#ef4444' }}>
              {requirement.priority?.name || requirement.priority?.priority_name || '-'}
            </span>
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider ml-2">Created:</span>
            <span className="text-xs font-semibold text-gray-900 dark:text-gray-200">
              {new Date(requirement.created_at).toLocaleDateString()}
            </span>
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
          <DialogHeader className="px-6 py-4 border-b border-gray-100 dark:border-white/5">
            <DialogTitle>Amend Requirement</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">Revised Details of Requirement</label>
              <textarea 
                className="w-full flex min-h-[100px] rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:focus-visible:ring-gray-300" 
                placeholder="Describe what has changed in the requirement..."
                value={amendmentDetails}
                onChange={(e) => setAmendmentDetails(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="needsReapproval" 
                checked={needsReapproval}
                onChange={(e) => setNeedsReapproval(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:ring-offset-gray-900"
              />
              <label htmlFor="needsReapproval" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 dark:text-gray-300">
                Needs Re-Approval Flow?
              </label>
            </div>
            <p className="text-[11px] text-gray-500">
              If checked, the requirement will go back to Pending and a new approval flow will be triggered. If unchecked, the changes are auto-approved and will instantly push notifications to any active tasks linked to this requirement.
            </p>
          </div>
          <DialogFooter className="px-6 py-4 bg-gray-50 border-t border-gray-100 dark:bg-slate-950 dark:border-white/5">
            <AppButton variant="outline" onClick={() => setShowAmendmentDialog(false)}>Cancel</AppButton>
            <AppButton variant="primary" onClick={handleAmendment} isLoading={submittingAmendment} disabled={!amendmentDetails.trim()}>Submit Amendment</AppButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPutToUseDialog} onOpenChange={setShowPutToUseDialog}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-gray-100 dark:border-white/5">
            <DialogTitle>Put Requirement to Use</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">Select Put to Use Date</label>
              <AppInput type="date" value={putToUseDate} onChange={(e) => setPutToUseDate(e.target.value)} />
            </div>
            <p className="text-xs text-gray-500">
              Setting this date will officially mark the requirement as Closed.
            </p>
          </div>
          <DialogFooter className="px-6 py-4 bg-gray-50 border-t border-gray-100 dark:bg-slate-950 dark:border-white/5">
            <AppButton variant="outline" onClick={() => setShowPutToUseDialog(false)}>Cancel</AppButton>
            <AppButton variant="primary" onClick={handlePutToUse} isLoading={submittingPutToUse} disabled={!putToUseDate}>Confirm</AppButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showWorkspaceSelector} onOpenChange={setShowWorkspaceSelector}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-gray-100 dark:border-white/5">
            <DialogTitle>Select Workspace for Task</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Target Workspace <span className="text-red-500">*</span></label>
              <select
                value={selectedWorkspaceId}
                onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                className="w-full text-sm p-2.5 border border-gray-200 dark:border-white/10 rounded-md bg-white dark:bg-[#0a0d14] text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">-- Select Workspace --</option>
                {workspaces.map(w => <option key={w.id} value={w.id}>{w.workspace_name || w.name}</option>)}
              </select>
            </div>
            
            {selectedWorkspaceId && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Sub-Workspace (Optional)</label>
                <select
                  value={selectedSubWorkspaceId}
                  onChange={(e) => setSelectedSubWorkspaceId(e.target.value)}
                  className="w-full text-sm p-2.5 border border-gray-200 dark:border-white/10 rounded-md bg-white dark:bg-[#0a0d14] text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">-- None --</option>
                  {subWorkspaces.filter(sw => sw.parent_workspace_id === selectedWorkspaceId).map(sw => (
                    <option key={sw.id} value={sw.id}>{sw.workspace_name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <DialogFooter className="px-6 py-4 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5">
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

      <div className="flex flex-col flex-1">
        {/* Action Required Panel */}
        {isCurrentApprover && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-4 mb-6 rounded-r-md shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-6 w-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-100">Action Required: Your Approval is Pending</h3>
                <p className="text-xs text-amber-700 dark:text-amber-300 mb-3 mt-1">
                  This requirement is currently awaiting your review in the workflow sequence. Please provide your mandatory remarks and select an action below.
                </p>
                <div className="space-y-3">
                  <textarea
                    value={approvalRemarks}
                    onChange={(e) => setApprovalRemarks(e.target.value)}
                    className="w-full text-sm p-3 border border-amber-200 dark:border-amber-700/50 rounded-md bg-white dark:bg-[#0a0d14] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:ring-amber-500 focus:border-amber-500"
                    rows={2}
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
        <div className="flex border-b border-gray-200 dark:border-white/10 shrink-0 mb-4">
          {[
            { id: 'details', label: 'Requirement Details' },
            { id: 'analysis', label: 'Business Analysis' },
            { id: 'approval', label: 'Approval Workflow' },
            { id: 'tasks', label: 'Tasks' },
            { id: 'audit', label: 'Audit Trail' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === tab.id 
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:text-gray-200 hover:border-gray-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-white dark:bg-[#050505] rounded-lg border border-gray-100 dark:border-white/5 p-3 shadow-sm mb-10">
          {activeTab === 'details' && (
            <div className="flex flex-col h-full animate-in fade-in duration-300 gap-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
                <div>
                  <div className="text-xs text-gray-500 uppercase font-bold mb-1 tracking-wider">Scope</div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-200">{requirement.scope || '-'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase font-bold mb-0.5">Software System</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{requirement.software_system?.name || snap.system || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase font-bold mb-1 tracking-wider">Module</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{requirement.module?.name || snap.module || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase font-bold mb-1 tracking-wider">Submodule</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{requirement.sub_module?.name || snap.submodule || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase font-bold mb-1 tracking-wider">Category</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{requirement.category?.name || snap.category || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase font-bold mb-1 tracking-wider">Sub Category</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{requirement.sub_category?.name || snap.subcategory || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase font-bold mb-1 tracking-wider">Created By</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{requirement.creator?.full_name || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase font-bold mb-1 tracking-wider">Department</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{requirement.department?.name || '-'}</div>
                </div>
              </div>
              
              <div className="pt-2 border-t border-gray-100 dark:border-white/10 flex flex-col flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                  <div className="md:col-span-2 flex flex-col">
                    <div className="text-[10px] text-gray-500 uppercase font-bold mb-1 tracking-wider shrink-0">Description</div>
                    <div className="text-sm p-3 rounded-xl whitespace-pre-wrap bg-gray-50 dark:bg-white/5 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-white/10 shadow-sm flex-1 break-words">
                      {requirement.objective || '-'}
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <div className="text-[10px] text-gray-500 uppercase font-bold mb-1 tracking-wider shrink-0">Requirement Reason</div>
                    <div className="text-sm p-3 rounded-xl whitespace-pre-wrap bg-gray-50 dark:bg-white/5 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-white/10 shadow-sm flex-1 break-words">
                      {requirement.requirement_reason || requirement.custom_fields?.business_reason || '-'}
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <div className="text-[10px] text-gray-500 uppercase font-bold mb-1 tracking-wider shrink-0">Requirement Details</div>
                    <div className="text-sm p-3 rounded-xl whitespace-pre-wrap bg-gray-50 dark:bg-white/5 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-white/10 shadow-sm flex-1 break-words">
                      {requirement.requirement_details || requirement.functional_scope || '-'}
                    </div>
                  </div>
                </div>
              </div>

              {attachments.length > 0 && (
                <div className="pt-3 border-t border-gray-100 dark:border-white/10 shrink-0">
                  <div className="text-xs text-gray-500 uppercase font-bold mb-2 tracking-wider">Attachments</div>
                  <div className="flex gap-3 flex-wrap">
                    {attachments.map(att => (
                      <div
                        key={att.id}
                        className="flex items-center gap-2 pl-3 pr-1 py-1 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-md text-sm shadow-sm"
                      >
                        <Paperclip className="h-4 w-4 text-indigo-500" />
                        <span className="text-gray-700 dark:text-gray-300 font-medium truncate max-w-[200px]" title={att.file_name}>{att.file_name}</span>
                        <span className="text-xs text-gray-400 mr-2">{(att.file_size / 1024).toFixed(1)} KB</span>
                        <div className="flex items-center gap-1 border-l border-gray-200 dark:border-white/10 pl-2">
                          <AppButton 
                            variant="ghost" size="sm"
                            onClick={() => handleAttachmentAction(att.id, 'view')}
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded transition-colors"
                            title="View Attachment"
                          >
                            <Eye className="h-4 w-4" />
                          </AppButton>
                          <AppButton 
                            variant="ghost" size="sm"
                            onClick={() => handleAttachmentAction(att.id, 'download')}
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded transition-colors"
                            title="Download Attachment"
                          >
                            <Download className="h-4 w-4" />
                          </AppButton>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'analysis' && (
            <div className="space-y-4 animate-in fade-in duration-300 pt-2 pb-10">
              {error && (
                <div className="p-3 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm font-bold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  {error}
                </div>
              )}
              
              <div className="p-0 space-y-4">
                <div className="space-y-2">
                  <h3 className="text-xs font-bold flex items-center gap-2 pb-1 border-b text-indigo-500 dark:text-indigo-400 border-gray-200 dark:border-white/10">
                    <Briefcase className="h-3 w-3" /> Business Classification
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold mb-1 uppercase tracking-wider text-gray-500">Requirement Type <span className="text-red-500">*</span></label>
                      <select 
                         className="w-full h-9 px-3 rounded-md border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 bg-white dark:bg-[#0a0d14] border-gray-200 dark:border-white/10 text-gray-900 dark:text-white" 
                         value={formData.requirement_type_id} 
                         onChange={e => setFormData({...formData, requirement_type_id: e.target.value})} 
                         disabled={!(isAdmin && (isEditable || isSuperAdmin))}
                      >
                        <option value="">Select Type</option>
                        {masters.issue_types.map((t: any) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold mb-1 uppercase tracking-wider text-gray-500">Business Criticality <span className="text-red-500">*</span></label>
                      <select 
                         className="w-full h-9 px-3 rounded-md border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 bg-white dark:bg-[#0a0d14] border-gray-200 dark:border-white/10 text-gray-900 dark:text-white" 
                         value={formData.business_criticality_id} 
                         onChange={e => setFormData({...formData, business_criticality_id: e.target.value})} 
                         disabled={!(isAdmin && (isEditable || isSuperAdmin))}
                      >
                        <option value="">Select Criticality</option>
                        {masters.priority_master.map((p: any) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold mb-1 uppercase tracking-wider text-gray-500">Business Value</label>
                      <select 
                         className="w-full h-9 px-3 rounded-md border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 bg-white dark:bg-[#0a0d14] border-gray-200 dark:border-white/10 text-gray-900 dark:text-white" 
                         value={formData.business_value_id} 
                         onChange={e => setFormData({...formData, business_value_id: e.target.value})} 
                         disabled={!(isAdmin && (isEditable || isSuperAdmin))}
                      >
                        <option value="">Select Business Value</option>
                        <option value="Revenue Generation">Revenue Generation</option>
                        <option value="Cost Reduction / Savings">Cost Reduction / Savings</option>
                        <option value="Operational Efficiency">Operational Efficiency</option>
                        <option value="Customer Experience / Satisfaction">Customer Experience / Satisfaction</option>
                        <option value="Risk Mitigation & Security">Risk Mitigation & Security</option>
                        <option value="Regulatory & Compliance">Regulatory & Compliance</option>
                        <option value="Strategic Alignment">Strategic Alignment</option>
                        <option value="Technical Debt Reduction">Technical Debt Reduction</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold mb-1 uppercase tracking-wider text-gray-500">Requirement Reason</label>
                      <div className="text-sm p-3 rounded-md bg-gray-50 dark:bg-[#0a0d14] border border-gray-200 dark:border-white/10 text-gray-800 dark:text-gray-200 min-h-[60px] whitespace-pre-wrap">
                        {requirement.requirement_reason || requirement.custom_fields?.business_reason || '-'}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold mb-1 uppercase tracking-wider text-gray-500">Requirement Details</label>
                      <div className="text-sm p-3 rounded-md bg-gray-50 dark:bg-[#0a0d14] border border-gray-200 dark:border-white/10 text-gray-800 dark:text-gray-200 min-h-[60px] whitespace-pre-wrap">
                        {requirement.requirement_details || requirement.functional_scope || '-'}
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold mb-1 uppercase tracking-wider text-gray-500">Dependency Notes <span className="text-red-500">*</span></label>
                      <textarea 
                         className="w-full p-2 rounded-md border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 min-h-[60px] bg-white dark:bg-[#0a0d14] border-gray-200 dark:border-white/10 text-gray-900 dark:text-white" 
                         value={formData.dependency_notes} 
                         onChange={e => setFormData({...formData, dependency_notes: e.target.value})} 
                         disabled={!(isAdmin && (isEditable || isSuperAdmin))}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs font-bold flex items-center gap-2 pb-1 border-b text-emerald-500 dark:text-emerald-400 border-gray-200 dark:border-white/10">
                    <Server className="h-3 w-3" /> Technical & Execution Scope
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold mb-1 uppercase tracking-wider text-gray-500">Technical Scope / Architecture <span className="text-red-500">*</span></label>
                      <textarea 
                         className="w-full p-2 rounded-md border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 min-h-[80px] bg-white dark:bg-[#0a0d14] border-gray-200 dark:border-white/10 text-gray-900 dark:text-white" 
                         value={formData.technical_scope} 
                         onChange={e => setFormData({...formData, technical_scope: e.target.value})} 
                         disabled={!(isAdmin && (isEditable || isSuperAdmin))}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs font-bold flex items-center gap-2 pb-1 border-b text-amber-500 dark:text-amber-400 border-gray-200 dark:border-white/10">
                    <Calendar className="h-3 w-3" /> Timelines & Resources
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold mb-1 uppercase tracking-wider text-gray-500">Start Date <span className="text-red-500">*</span></label>
                      <AppInput 
                         type="date" 
                         value={formData.start_date ? formData.start_date.split('T')[0] : ''} 
                         min={new Date().toISOString().split('T')[0]}
                         onChange={e => handleDateChange('start_date', e.target.value)} 
                         disabled={!(isAdmin && (isEditable || isSuperAdmin))}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold mb-1 uppercase tracking-wider text-gray-500">Due Date <span className="text-red-500">*</span></label>
                      <AppInput 
                         type="date" 
                         value={formData.due_date ? formData.due_date.split('T')[0] : ''} 
                         min={formData.start_date ? formData.start_date.split('T')[0] : new Date().toISOString().split('T')[0]}
                         onChange={e => handleDateChange('due_date', e.target.value)} 
                         disabled={!(isAdmin && (isEditable || isSuperAdmin))}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold mb-1 uppercase tracking-wider text-gray-500">Estimated Effort (Days) <span className="text-red-500">*</span></label>
                      <AppInput 
                         type="number"
                         placeholder="e.g. 10" 
                         value={formData.estimated_effort} 
                         onChange={handleEffortChange} 
                         disabled={!(isAdmin && (isEditable || isSuperAdmin))}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold mb-1 uppercase tracking-wider text-gray-500">Estimated Cost</label>
                      <AppInput 
                         type="number" 
                         placeholder="Amount" 
                         value={formData.estimated_cost} 
                         onChange={e => setFormData({...formData, estimated_cost: e.target.value})} 
                         disabled={!(isAdmin && (isEditable || isSuperAdmin))}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs font-bold flex items-center gap-2 pb-1 border-b text-rose-500 dark:text-rose-400 border-gray-200 dark:border-white/10">
                    <Shield className="h-3 w-3" /> Impacted Departments
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold mb-1 uppercase tracking-wider text-gray-500">Select Impacted Departments (For Matrix Approval) <span className="text-red-500">*</span></label>
                      <div className="mt-1 grid grid-cols-2 md:grid-cols-4 gap-2">
                        {(masters.departments || []).map((d: any) => {
                          const isSelected = formData.impacted_departments.includes(d.id);
                          return (
                            <label key={d.id} className={`flex items-center p-2 rounded-md border cursor-pointer transition-all ${isSelected ? 'bg-indigo-500/10 border-indigo-500/30 shadow-inner' : 'bg-white dark:bg-[#0a0d14] border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/[0.02]'}`}>
                              <input 
                                type="checkbox" 
                                className="sr-only"
                                checked={isSelected}
                                onChange={() => handleDepartmentToggle(d.id)}
                                disabled={!(isAdmin && (isEditable || isSuperAdmin))}
                              />
                              <div className={`w-4 h-4 rounded border mr-2 flex items-center justify-center ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300 dark:border-gray-600'}`}>
                                {isSelected && <svg className="w-3 h-3 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                              </div>
                              <span className={`text-xs font-medium ${isSelected ? 'text-indigo-600 dark:text-indigo-300' : 'text-gray-600 dark:text-gray-400'}`}>{d.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  
                  {formData.impacted_departments.length > 0 && (
                    <div className="mt-4 space-y-3">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">Define Approval Sequence <span className="text-red-500">*</span></label>
                      {formData.impacted_departments.map((deptId) => {
                        const deptName = masters.departments?.find((d: any) => d.id === deptId)?.name;
                        const deptUsers = masters.users?.filter((u: any) => u.department_id === deptId) || [];
                        const selectedApprovers = formData.department_approvers[deptId] || [];
                        
                        return (
                          <div key={deptId} className="p-3 border rounded-md border-indigo-500/20 bg-indigo-50/30 dark:bg-indigo-500/5">
                            <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-2">{deptName} Approvers</div>
                            <div className="flex flex-wrap gap-2">
                              {deptUsers.map((u: any) => {
                                const isUserSelected = selectedApprovers.includes(u.id);
                                const orderIndex = selectedApprovers.indexOf(u.id) + 1;
                                
                                return (
                                  <AppButton
                                    type="button"
                                    key={u.id}
                                    onClick={() => {
                                      setFormData(prev => {
                                        const current = prev.department_approvers[deptId] || [];
                                        if (current.includes(u.id)) {
                                          return { ...prev, department_approvers: { ...prev.department_approvers, [deptId]: current.filter(id => id !== u.id) } };
                                        } else {
                                          return { ...prev, department_approvers: { ...prev.department_approvers, [deptId]: [...current, u.id] } };
                                        }
                                      });
                                    }}
                                    variant={isUserSelected ? "primary" : "outline"}
                                    size="sm"
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-2 ${
                                      isUserSelected 
                                        ? "bg-indigo-600 border-indigo-600 text-white" 
                                        : "bg-white dark:bg-[#0a0d14] border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                                    }`}
                                    disabled={!(isAdmin && (isEditable || isSuperAdmin))}
                                  >
                                    {isUserSelected && <span className="bg-white/20 w-4 h-4 rounded-full flex items-center justify-center text-[10px]">{orderIndex}</span>}
                                    {u.full_name}
                                  </AppButton>
                                );
                              })}
                              {deptUsers.length === 0 && <span className="text-xs text-gray-500">No users found in this department.</span>}
                            </div>
                            <p className="text-[9px] text-gray-400 mt-2">Select users in the order they should approve (1st = Approver, 2nd = Executive, etc).</p>
                            {selectedApprovers.length > 0 && (
                              <div className="mt-3 p-2 bg-indigo-100/50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/30 rounded-md">
                                <div className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider mb-1">
                                  {deptName} - Approval Sequence
                                </div>
                                <div className="text-xs text-indigo-900 dark:text-indigo-200">
                                  {selectedApprovers.map((id: string, index: number) => {
                                    const user = deptUsers.find((u: any) => u.id === id);
                                    const roleLabel = index === 0 ? "Approver" : index === 1 ? "Executive" : `Level ${index + 1}`;
                                    return (
                                      <span key={id} className="inline-flex items-center">
                                        <span className="font-semibold">{roleLabel}:</span>&nbsp;{user?.full_name || 'Unknown'}
                                        {index < selectedApprovers.length - 1 && <span className="mx-2 text-indigo-400">→</span>}
                                      </span>
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

                {/* Analysis Remarks (Mandatory) */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/10">
                  {auditLogs.filter((log: any) => log.new_value?.remarks).length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                          Remarks History
                        </label>
                        <AppButton 
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowRemarksHistory(!showRemarksHistory)}
                          className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 px-2 py-1 rounded transition-colors"
                        >
                          {showRemarksHistory ? 'Hide History ▲' : 'Show History ▼'}
                        </AppButton>
                      </div>
                      
                      {showRemarksHistory && (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1 animate-in slide-in-from-top-2 fade-in duration-200">
                          {auditLogs.filter((log: any) => log.new_value?.remarks).map((log: any) => (
                            <div key={log.id} className="p-3 bg-gray-50 dark:bg-white/5 rounded-md border border-gray-200 dark:border-white/10 text-xs">
                              <div className="flex justify-between items-center mb-1.5 text-gray-500">
                                <span className="font-semibold text-gray-800 dark:text-gray-200">{log.user?.full_name || 'System'}</span>
                                <span>{new Date(log.performed_at).toLocaleString()}</span>
                              </div>
                              <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                {log.new_value.remarks}
                              </div>
                              <div className="mt-1.5 pt-1.5 border-t border-gray-200/50 dark:border-white/5 text-[9px] text-gray-400 italic">
                                Action: {log.event_type.replace(/_/g, ' ')}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Add New Analysis Remarks (Mandatory for Approvers)
                  </label>
                  <textarea
                    className="w-full text-sm px-3 py-2 border rounded-md bg-white dark:bg-[#0a0d14] border-gray-200 dark:border-white/10 focus:ring-1 focus:ring-indigo-500 min-h-[80px]"
                    placeholder="Enter your remarks or justification here before saving or approving..."
                    value={formData.analysis_remarks}
                    onChange={(e) => {
                      setFormData({ ...formData, analysis_remarks: e.target.value });
                      setApprovalRemarks(e.target.value);
                    }}
                    disabled={!isAdmin && !isCurrentApprover}
                  />
                </div>

                {/* Approver Actions */}
                {isCurrentApprover && (
                  <div className="flex items-center justify-end pt-4 gap-2 border-t border-gray-200 dark:border-white/10 mt-4">
                    <div className="text-xs text-amber-600 dark:text-amber-400 font-bold mr-auto">
                      Pending Your Approval
                    </div>
                    <AppButton 
                      variant="destructive" 
                      onClick={() => handleApprovalAction('Reject')} 
                      disabled={savingApproval || !approvalRemarks.trim()}
                      leftIcon={<XCircle className="h-4 w-4"/>}
                    >
                      Reject
                    </AppButton>
                    <AppButton 
                      variant="secondary" 
                      onClick={() => handleApprovalAction('Hold')} 
                      disabled={savingApproval || !approvalRemarks.trim()}
                      leftIcon={<PauseCircle className="h-4 w-4"/>}
                    >
                      Hold
                    </AppButton>
                    <AppButton 
                      variant="primary" 
                      onClick={() => handleApprovalAction('Approve')} 
                      disabled={savingApproval || !approvalRemarks.trim()}
                      leftIcon={<CheckCircle className="h-4 w-4"/>}
                    >
                      Approve
                    </AppButton>
                  </div>
                )}

                {isAdmin && (!isCurrentApprover && searchParams.get('from') !== 'approvals') && (
                  <div className="flex items-center justify-end pt-4 gap-2">
                    {['Draft', 'On Hold', 'Cancelled', 'Pending', 'Rejected', 'Clarification'].includes(requirement.approval_status || 'Draft') && (
                      <AppButton 
                        variant="primary" 
                        onClick={() => handleAction('ACCEPT')} 
                        isLoading={saving}
                        leftIcon={<CheckCircle className="h-4 w-4"/>}
                      >
                        Accept Requirement
                      </AppButton>
                    )}
                    <AppButton 
                      variant="outline" 
                      onClick={() => handleAction('SAVE')} 
                      disabled={saving}
                      leftIcon={<Save className="h-4 w-4"/>}
                    >
                      Save Draft
                    </AppButton>
                    {(requirement.approval_status !== 'On Hold' && requirement.approval_status !== 'Cancelled') && (
                      <AppButton 
                        variant="secondary" 
                        onClick={() => handleAction('HOLD')} 
                        disabled={saving}
                        leftIcon={<PauseCircle className="h-4 w-4"/>}
                      >
                        Hold Requirement
                      </AppButton>
                    )}
                    {requirement.approval_status !== 'Cancelled' && (
                      <AppButton 
                        variant="destructive" 
                        onClick={() => handleAction('CANCEL')} 
                        disabled={saving}
                        leftIcon={<XCircle className="h-4 w-4"/>}
                      >
                        Cancel Requirement
                      </AppButton>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'approval' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {approvalFlow.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 opacity-50 mt-4 border border-dashed border-gray-300 dark:border-white/10 rounded-lg">
                  <Shield className="h-8 w-8 mb-2 text-indigo-500" />
                  <p className="text-xs text-gray-500 dark:text-gray-400">No approval workflow has been initiated yet.</p>
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
                    <div key={deptName} className="p-4 bg-white dark:bg-[#0a0d14] rounded-lg border border-gray-200 dark:border-white/10 shadow-sm">
                      <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-4 border-b border-gray-100 dark:border-white/5 pb-2">
                        {deptName} Approvals
                      </h3>
                      <div className="relative">
                        {/* Connecting Line */}
                        <div className="absolute top-5 left-4 bottom-5 w-0.5 bg-gray-200 dark:bg-white/10" />
                        
                        <div className="space-y-6 relative z-10">
                          {flows.map((flow: any, index: number) => {
                            const isApproved = flow.status === 'Approved' || flow.status === 'Bypassed';
                            const isPending = flow.status === 'Pending';
                            const isRejected = flow.status === 'Rejected';
                            
                            let statusColor = "bg-gray-100 dark:bg-white/5 border-gray-300 dark:border-white/10 text-gray-500";
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
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 shrink-0 bg-white dark:bg-[#050505] mt-1 z-10 ${isApproved ? 'border-green-500 text-green-500' : isRejected ? 'border-red-500 text-red-500' : isPending ? 'border-amber-500 text-amber-500' : 'border-gray-300 dark:border-gray-600 text-gray-300'}`}>
                                  {isApproved ? <CheckCircle className="w-3 h-3" /> : isRejected ? <XCircle className="w-3 h-3" /> : <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                                </div>
                                <div className={`flex-1 p-3 rounded-lg border ${statusColor} transition-colors`}>
                                  <div className="flex justify-between items-start mb-1">
                                    <div className="font-semibold text-sm">Level {flow.level}: {flow.approver?.full_name || 'Unknown User'}</div>
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/50 dark:bg-black/20">
                                      {icon} {flow.status}
                                    </div>
                                  </div>
                                  {flow.actioned_at && (
                                    <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-2">
                                      {new Date(flow.actioned_at).toLocaleString()}
                                    </div>
                                  )}
                                  {flow.remarks && (
                                    <div className="text-xs bg-white/60 dark:bg-black/30 p-2 rounded text-gray-700 dark:text-gray-300 italic border border-black/5 dark:border-white/5">
                                      "{flow.remarks}"
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
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="space-y-4 animate-in fade-in duration-300 pt-2 pb-10">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <Server className="h-5 w-5 text-emerald-500" />
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white">Implementation Tasks</h2>
                </div>
              </div>
              
              {linkedTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 opacity-50 mt-4">
                  <Server className="h-8 w-8 mb-2 text-emerald-500" />
                  <p className="text-xs text-gray-500 dark:text-gray-400">Generated implementation tasks will appear here.</p>
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
                      <AppTableRow key={link.task_id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer" onClick={() => router.push(`/tasks/${link.task_id}`)}>
                        <AppTableCell className="font-medium text-gray-900 dark:text-white">
                          {link.task?.subject || 'Untitled Task'}
                        </AppTableCell>
                        <AppTableCell className="text-gray-600 dark:text-gray-400">
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
                        <AppTableCell className="text-gray-600 dark:text-gray-400">
                          {link.task?.end_date ? new Date(link.task.end_date).toLocaleDateString() : '-'}
                        </AppTableCell>
                        <AppTableCell className="text-gray-500 dark:text-gray-400 text-xs">
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
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200 dark:border-white/10">
                <Clock className="h-5 w-5 text-indigo-500" />
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">Audit Trail & Lifecycle History</h2>
              </div>
              
              {auditLogs.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-100 dark:border-white/10">
                  No activity recorded yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {auditLogs.map((log: any) => (
                    <AppCard key={log.id} className="p-3 flex flex-col gap-1 shadow-sm">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <Clock className="w-3 h-3" />
                          </div>
                          <span className="font-bold text-sm text-gray-900 dark:text-white">{log.event_type.replace(/_/g, ' ')}</span>
                        </div>
                        <span className="text-xs text-gray-500">{new Date(log.performed_at).toLocaleString()}</span>
                      </div>
                      <div className="ml-8 text-xs text-gray-600 dark:text-gray-400">
                        Performed by <span className="font-semibold text-gray-900 dark:text-gray-300">{log.user?.full_name || 'System'}</span>
                      </div>
                      {log.new_value && (
                        <div className="ml-8 mt-2 p-3 bg-gray-50 dark:bg-[#0a0d14] rounded-md text-xs text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-white/5 font-mono">
                          {typeof log.new_value === 'string' ? (
                            <span className="whitespace-pre-wrap">{log.new_value}</span>
                          ) : (
                            <ul className="space-y-1">
                              {Object.entries(log.new_value)
                                .filter(([key]) => !['task_id', 'workspace_id', 'sub_workspace_id', 'override'].includes(key.toLowerCase()))
                                .map(([key, value]) => (
                                <li key={key} className="flex gap-2">
                                  <span className="text-gray-400 font-bold min-w-[100px] truncate">{key.replace(/_/g, ' ').toUpperCase()}:</span>
                                  <span className="flex-1 text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{String(value)}</span>
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
    </PageContainer>
  );
}
