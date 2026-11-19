"use client";
import { toast } from 'react-toastify';

import React, { useState, useEffect, Suspense } from "react";
import { AppCard, AppCardHeader, AppCardTitle, AppCardContent } from "@/components/ui/AppCard";
import { AppTable, AppTableHeader, AppTableRow, AppTableHead, AppTableBody, AppTableCell } from "@/components/ui/AppTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { AppBadge } from "@/components/ui/AppBadge";
import { Users, Plus, RefreshCw, ArrowLeft, ShieldAlert, Trash2, Paperclip, Eye, Download, CheckCircle, PauseCircle, XCircle, FilePlus, Save, Edit2, AlertTriangle, Briefcase, Server, Calendar, Shield, Clock, FileText, Target, Hourglass, ChevronDown, ChevronRight, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatDate, formatDateTime, formatCount, StatusBadge, PriorityIndicator } from "@/components/ui/data";

import { PageContainer } from "@/components/layout/PageContainer";
import { usePermissions } from "@/hooks/usePermissions";
import Link from "next/link";
import dynamic from "next/dynamic";

const TaskCreationWizard = dynamic(() => import("@/components/tasks/TaskCreationWizard"), {
  ssr: false
});

import SafeHtml from "@/components/ui/SafeHtml";
import { sanitizeErrorMessage } from "@/lib/utils";
import { LazyQuill } from "@/components/ui/LazyQuill";
import { EnterpriseUploader } from "@/components/ui/EnterpriseUploader";
import ChandakLoader from "@/components/ui/ChandakLoader";

const RequirementAnalyzePageContent = ({ params }: { params: Promise<{ id: string }> }) => {
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
  const [assetName, setAssetName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [currentUserDepartmentId, setCurrentUserDepartmentId] = useState<string | null>(null);
  const [isCurrentApprover, setIsCurrentApprover] = useState(false);
  const [showManualOverride, setShowManualOverride] = useState(false);
  const [isPendingForOther, setIsPendingForOther] = useState(false);
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [putToUseDate, setPutToUseDate] = useState("");
  const [submittingPutToUse, setSubmittingPutToUse] = useState(false);
  const [showReadyNotification, setShowReadyNotification] = useState(false);
  const [isRemarksHistoryMinimized, setIsRemarksHistoryMinimized] = useState(true);

  const [showAmendmentDialog, setShowAmendmentDialog] = useState(false);
  const [amendmentDetails, setAmendmentDetails] = useState("");
  const [needsReapproval, setNeedsReapproval] = useState(false);
  const [submittingAmendment, setSubmittingAmendment] = useState(false);
  const [amendmentFile, setAmendmentFile] = useState<File | null>(null);
  const [uatComment, setUatComment] = useState("");
  const [submittingUat, setSubmittingUat] = useState(false);
  const [showUatFailDialog, setShowUatFailDialog] = useState(false);
  const [selectedReopenTaskIds, setSelectedReopenTaskIds] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    objective: "",
    requirement_reason: "",
    requirement_details: "",
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
    signoff_approver_id: "",
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
       
       if (approvalFlow.length === 0) {
         setIsCurrentApprover(false);
         setIsPendingForOther(false);
       } else if (requirement.approval_status === 'Pending SignOff') {
         setIsCurrentApprover(isExplicitApprover);
         setIsPendingForOther((isAdmin || isSuperAdmin) && !isExplicitApprover);
       } else {
         const isPending = requirement.approval_status === 'Pending' || requirement.approval_status === 'Pending Approval';
         setIsCurrentApprover(!!isExplicitApprover && isPending);
         setIsPendingForOther(isSuperAdmin && !isExplicitApprover && isPending);
       }
    }
  }, [requirement, currentUserId, currentUserDepartmentId, isAdmin, isSuperAdmin, approvalFlow]);

  const showApprovalControls = isCurrentApprover || (isPendingForOther && showManualOverride);


  const loadData = async () => {
    if (!reqId) return;
    setLoading(true);
    try {
      const { fetchRequirement } = await import("@/lib/actions/requirements");
      const data = await fetchRequirement(reqId);
      setRequirement(data);
      if (data) {
        if (data.scope === 'INFRA' && data.custom_fields?.intake_snapshot?.assetId) {
          try {
            const { data: assetData } = await supabase.from('assets').select('name').eq('id', data.custom_fields.intake_snapshot.assetId).single();
            if (assetData) setAssetName(assetData.name);
          } catch (e) {
            console.error("Failed to fetch asset name", e);
          }
        }

        setFormData({
          objective: data.objective || "",
          requirement_reason: data.requirement_reason || data.custom_fields?.business_reason || data.custom_fields?.custom_fields?.business_reason || data.objective || "",
          requirement_details: data.requirement_details || data.custom_fields?.requirement_details || data.custom_fields?.requirement_description || data.custom_fields?.custom_fields?.requirement_description || data.functional_scope || "",
          business_impact: data.business_impact || data.custom_fields?.business_impact || "",
          business_value_id: data.custom_fields?.business_value || "",
          business_criticality_id: data.business_criticality_id || "",
          functional_scope: data.functional_scope || "",
          technical_scope: data.technical_scope || "",
          budget_impact: data.budget_impact || data.custom_fields?.budget_impact || "",
          estimated_effort: data.estimated_effort || "",
          estimated_cost: data.custom_fields?.estimated_cost || "",
          estimated_resources: data.estimated_resources || data.custom_fields?.estimated_resources || "",
          dependency_notes: data.dependency_notes || "",
          start_date: data.start_date ? data.start_date.slice(0, 10) : "",
          due_date: data.due_date ? data.due_date.slice(0, 10) : "",
          expected_completion_date: data.expected_completion_date ? data.expected_completion_date.slice(0, 10) : "",
          requirement_type_id: data.requirement_type_id || "",
          impacted_departments: data.custom_fields?.impacted_departments || [],
          department_approvers: data.custom_fields?.department_approvers || {},
          signoff_approver_id: data.custom_fields?.signoff_approver_id || "",
          analysis_remarks: ""
        });

        const { fetchAttachments } = await import("@/lib/actions/attachments");
        let allAttachments: any[] = [];
        
        const attRes = await fetchAttachments('requirement', data.id, Date.now());
        if (attRes) allAttachments = [...allAttachments, ...attRes];

        const { data: linkedTickets } = await supabase
          .from('ticket_requirements')
          .select('ticket_id')
          .eq('requirement_id', data.id);
          
        if (linkedTickets && linkedTickets.length > 0) {
          for (const link of linkedTickets) {
            const ticketAtts = await fetchAttachments('ticket', link.ticket_id, Date.now());
            if (ticketAtts) {
              allAttachments = [...allAttachments, ...ticketAtts];
            }
          }
        }
        
        const fetchFlow = async () => {
          try {
            const { data: approvalFlow } = await supabase
            .from('requirement_approval_flow')
            .select('*, approver:user_master!requirement_approval_flow_approver_id_fkey(id, full_name, profile_photo, designation:designations!fk_user_master_designation(name)), department:departments!requirement_approval_flow_department_id_fkey(name)')
            .eq('requirement_id', reqId)
            .order('level', { ascending: true });

            if (approvalFlow) setApprovalFlow(approvalFlow);
          } catch (err) {
            console.error(err);
          }
        }
        fetchFlow();
        setAttachments(allAttachments);
      }

      try {
        const { fetchRequirementAuditLogs } = await import("@/lib/actions/requirements");
        const logs = await fetchRequirementAuditLogs(reqId);
        setAuditLogs(logs || []);
      } catch(e) {
        console.error("Failed to fetch audit logs", e);
      }

      try {
        const { fetchLinkedTasks } = await import("@/lib/actions/requirements");
        const lTasks = await fetchLinkedTasks(reqId);
        setLinkedTasks(lTasks || []);
        
        const { fetchWorkspaces } = await import("@/lib/actions/workspaces");
        const allWs = await fetchWorkspaces();
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
        supabase.from('user_master').select('id, full_name, department_id, email, designation_id, designation:designations!fk_user_master_designation(name)').eq('is_active', true).eq('is_deleted', false),
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
      setError(sanitizeErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    if (!reqId) return;
    
    // Real-time subscription to ensure the UI updates instantly when another user modifies the requirement or its approval flow
    const channel = supabase
      .channel(`requirement-updates-${reqId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'requirements', filter: `id=eq.${reqId}` },
        () => {
          loadData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'requirement_approval_flow', filter: `requirement_id=eq.${reqId}` },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [reqId]);

  const allTasksResolvedOrClosed = linkedTasks && linkedTasks.length > 0 && linkedTasks.every(lt => {
    const statusName = lt.task?.status?.name || lt.task?.status?.status_name;
    return statusName === 'Resolved' || statusName === 'Closed';
  });

  const isReadyToPutToUse = requirement?.approval_status === 'Ready to Put to Use' || 
    (allTasksResolvedOrClosed && requirement?.approval_status !== 'Closed');

  useEffect(() => {
    if (isReadyToPutToUse) {
      const notifiedKey = `req-ready-notified-${requirement?.id}`;
      if (!localStorage.getItem(notifiedKey)) {
        setShowReadyNotification(true);
        localStorage.setItem(notifiedKey, 'true');
      }
    }
  }, [requirement, isReadyToPutToUse]);

  const handleUpdateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePutToUse = async () => {
    if (!putToUseDate) return toast.warning("Please select a put to use date");
    setSubmittingPutToUse(true);
    try {
      const { markRequirementPutToUse } = await import("@/lib/actions/requirements");
      const res = await markRequirementPutToUse(reqId, putToUseDate);
      if (res.error) throw new Error(res.error);
      setShowPutToUseDialog(false);
      loadData();
    } catch (e: any) {
      toast.error(sanitizeErrorMessage(e));
    } finally {
      setSubmittingPutToUse(false);
    }
  };

  const handleUAT = async (result: 'PASS' | 'FAIL', tasksToReopen?: string[]) => {
    if (result === 'FAIL' && !uatComment.trim()) return toast.warning("Please provide a reason for failing UAT.");
    setSubmittingUat(true);
    try {
      const { handleRequirementUAT } = await import("@/lib/actions/requirements");
      const res = await handleRequirementUAT(reqId as string, result, uatComment, currentUserId, tasksToReopen);
      if (res && (res as any).error) throw new Error((res as any).error);
      toast.success(`UAT ${result === 'PASS' ? 'Approved' : 'Failed'} Successfully`);
      setUatComment("");
      setShowUatFailDialog(false);
      setSelectedReopenTaskIds([]);
      loadData();
    } catch (e: any) {
      toast.error(sanitizeErrorMessage(e));
    } finally {
      setSubmittingUat(false);
    }
  };

  const handleAmendment = async () => {
    if (!amendmentDetails.trim()) return toast.warning("Please enter the revised details.");
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
      toast.error(sanitizeErrorMessage(e));
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
        newFormData.start_date = start.toISOString().slice(0, 10);
      }
      const due = new Date(start);
      due.setDate(due.getDate() + days);
      newFormData.due_date = due.toISOString().slice(0, 10);
    }
    setFormData(newFormData);
  };

  const handleDateChange = (field: 'start_date' | 'due_date', val: string) => {
    let newFormData = { ...formData, [field]: val };
    
    const start = newFormData.start_date ? new Date(newFormData.start_date) : null;
    const due = newFormData.due_date ? new Date(newFormData.due_date) : null;
    
    if (start && due && !isNaN(start.getTime()) && !isNaN(due.getTime())) {
      const diffTime = due.getTime() - start.getTime();
      let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 0) diffDays = 1;
      if (diffDays >= 0) {
        newFormData.estimated_effort = diffDays.toString();
      }
    }
    setFormData(newFormData);
  };

  const handleAction = async (action: 'ACCEPT' | 'HOLD' | 'CANCEL' | 'SAVE') => {
      const currentRemarks = approvalRemarks?.trim() || formData.analysis_remarks?.trim() || (action === 'SAVE' ? 'Draft saved.' : '');
      if (!currentRemarks && action !== 'SAVE') {
        toast.warning("Remarks are mandatory before submitting.");
        return;
      }
      
      const payload = { ...formData, analysis_remarks: currentRemarks };

      if (action === 'ACCEPT') {
        const missingFields = [];
        if (!payload.requirement_type_id) missingFields.push("Business Classification");
        if (!payload.business_criticality_id) missingFields.push("Business Criticality");
        if (!payload.dependency_notes?.trim()) missingFields.push("Dependency Notes");
        if (!payload.technical_scope?.trim()) missingFields.push("Technical Scope / Architecture");
        if (!payload.start_date) missingFields.push("Start Date");
        if (!payload.due_date) missingFields.push("Due Date");
        if (!payload.estimated_effort?.trim()) missingFields.push("Estimated Effort");
        if (!payload.impacted_departments || !payload.impacted_departments.length) missingFields.push("Impacted Departments");
        if (!payload.signoff_approver_id) missingFields.push("Sign-Off Approver");

        if (missingFields.length > 0) {
            toast.warning(`Please fill all mandatory fields: ${missingFields.join(", ")}`);
            return;
        }

        for (const deptId of payload.impacted_departments) {
            if (!payload.department_approvers[deptId] || payload.department_approvers[deptId].length === 0) {
                toast.warning("Please select at least one approver for each Impacted Department.");
                return;
            }
        }
      }

      if (action === 'ACCEPT') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const start = new Date(formData.start_date);
        start.setHours(0, 0, 0, 0);
        if ((requirement.approval_status === 'Draft' || !requirement.approval_status) && start < today) {
            toast.error("Start date cannot be less than today's date.");
            return;
        }
        const due = new Date(formData.due_date);
        due.setHours(0, 0, 0, 0);
        if (due < start) {
            toast.error("Due date cannot be less than start date.");
            return;
        }
      }

      setSaving(true);
      setError(null);
      try {
        const { submitRequirementAnalysis } = await import("@/lib/actions/requirements");
        const { data: { user } } = await supabase.auth.getUser();
        await submitRequirementAnalysis(requirement.id, payload, user!.id, action);
        toast.warning(`Requirement ${action.toLowerCase()} successfully!`);
        setApprovalRemarks("");
        await loadData();
      } catch (err: any) {
        setError(sanitizeErrorMessage(err));
      } finally {
        setSaving(false);
      }
  };

  const submitApproval = async (action: 'Approve' | 'Reject' | 'Hold' | 'SignOff') => {
    if (!approvalRemarks.trim()) {
      toast.warning("Please provide remarks for your decision.");
      return;
    }
    setSavingApproval(true);
    try {
      const { processApprovalAction } = await import("@/lib/actions/requirements");
      await processApprovalAction(requirement.id, action, approvalRemarks, currentUserId);
      setApprovalRemarks("");
      await loadData();
      toast.success(`Successfully processed as ${action}`);
      if (searchParams.get('from') === 'approvals') {
        router.push('/requirements/approvals');
      } else {
        router.push('/requirements');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(sanitizeErrorMessage(err));
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
      toast.warning("Please provide mandatory analysis remarks before proceeding.");
      return;
    }
    setSavingApproval(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const m = await import("@/lib/actions/requirements");
      await m.processApprovalAction(requirement.id, action, approvalRemarks, user!.id);
      setApprovalRemarks("");
      await loadData();
      router.push('/requirements/approvals');
    } catch (err: any) {
      toast.error(sanitizeErrorMessage(err));
    } finally {
      setSavingApproval(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { deleteRequirement } = await import("@/lib/actions/requirements");
      const { data: { user } } = await supabase.auth.getUser();
      await deleteRequirement(requirement.id, user!.id);
      router.push('/requirements');
    } catch (err: any) {
      toast.error(sanitizeErrorMessage(err));
    } finally {
      setShowDeleteConfirm(false);
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
      toast.error(`Failed to ${action} attachment: ` + sanitizeErrorMessage(e));
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
      toast.error("Failed to add master: " + sanitizeErrorMessage(e));
    } finally {
      setIsAddingMaster(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center">
        <ChandakLoader size="lg" title="Loading requirement…" />
      </div>
    );
  }

  if (!requirement) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center text-foreground">
        <h2 className="text-[17px] font-semibold text-heading">We couldn&apos;t find that requirement</h2>
        <p className="mt-1 text-[13.5px] text-muted">It may have been deleted, or you may not have access to it.</p>
        <AppButton variant="secondary" onClick={() => router.push('/requirements')} className="mt-4" leftIcon={<ArrowLeft className="h-4 w-4" />}>Back to requirements</AppButton>
      </div>
    );
  }

  const isViewMode = searchParams.get('mode') === 'view';
  const canManageRequirements = isSuperAdmin || isAdmin || hasPermission("REQUIREMENTS_UPDATE") || hasPermission("REQUIREMENTS_MANAGE") || hasPermission("REQUIREMENTS_EDIT");
  const isDraftOrReviewStatus = (
    !requirement.approval_status || 
    requirement.approval_status === 'Draft' || 
    requirement.approval_status === 'On Hold' || 
    requirement.approval_status === 'Clarification' ||
    requirement.approval_status === 'Rejected'
  );
  const isEditable = !isViewMode && (canManageRequirements || isDraftOrReviewStatus);
  const snap = requirement.intake_snapshot || {};

  return (
    <PageContainer strict={true} className="bg-background">
      <div className="flex-1 overflow-y-auto pb-12">
      <div className="mb-5 flex shrink-0 flex-col gap-3 border-b border-border pb-4">
        <button type="button" onClick={() => router.back()} className="inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-accent-soft-text hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back
        </button>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[12.5px] font-medium text-accent-soft-text">{requirement.code || reqId}</span>
              <StatusBadge status={requirement.approval_status || requirement.status?.name || "Draft"} />
              {requirement.amendment_version > 0 && (
                <span className="rounded bg-sunken px-1.5 text-[12px] leading-5 text-subtle" title="Amendment version">v{requirement.amendment_version}</span>
              )}
            </div>
            <h1 className="mt-1 break-words text-[20px] font-semibold leading-snug text-heading">
              {requirement.title || 'Untitled requirement'}
            </h1>
            <dl className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px]">
              <div className="flex items-center gap-1.5">
                <dt className="text-muted">Priority</dt>
                <dd>
                  {isEditable && masters.priority_master?.length > 0 ? (
                    <select
                      aria-label="Requirement Priority"
                      value={requirement.priority_id || requirement.priority?.id || ""}
                      onChange={async (e) => {
                        const newPrioId = e.target.value;
                        if (!newPrioId) return;
                        try {
                          const { updateRequirementIntake } = await import("@/lib/actions/requirements");
                          const { data: { user } } = await supabase.auth.getUser();
                          const res = await updateRequirementIntake(requirement.id, { priority_id: newPrioId }, user?.id || "");
                          if (res && (res as any).error) {
                            toast.error((res as any).error);
                          } else {
                            toast.success("Requirement priority updated successfully.");
                            await loadData();
                          }
                        } catch (err: any) {
                          toast.error(err.message || "Failed to update priority.");
                        }
                      }}
                      className="h-6 rounded border border-border bg-surface px-1.5 text-[12px] font-medium text-foreground outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                    >
                      {masters.priority_master.map((p: any) => (
                        <option key={p.id} value={p.id}>
                          {p.name || p.priority_name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <PriorityIndicator priority={requirement.priority?.name || requirement.priority?.priority_name || null} className="text-[13px]" />
                  )}
                </dd>
              </div>
              <div className="flex items-center gap-1.5">
                <dt className="text-muted">Raised</dt>
                <dd className="text-foreground tabular">{formatDate(requirement.created_at)}</dd>
              </div>
              {requirement.put_to_use_date && (
                <div className="flex items-center gap-1.5">
                  <dt className="text-muted">Put to use</dt>
                  <dd className="text-success-text tabular">{formatDate(requirement.put_to_use_date)}</dd>
                </div>
              )}
            </dl>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {!isViewMode && (isSuperAdmin || hasPermission('REQUIREMENTS_DELETE')) && (
              <AppButton variant="ghost" className="text-danger-text hover:bg-danger-soft" leftIcon={<Trash2 className="h-4 w-4"/>} onClick={() => setShowDeleteConfirm(true)}>
                Delete
              </AppButton>
            )}
            {!isViewMode && (requirement.approval_status === 'Approved' || requirement.approval_status === 'In Progress') && (isSuperAdmin || requirement.creator_id === currentUserId) && (
              <AppButton variant="secondary" leftIcon={<Edit2 className="h-4 w-4"/>} onClick={() => setShowAmendmentDialog(true)}>
                Change requirement
              </AppButton>
            )}
            {!isViewMode && (requirement.approval_status === 'Approved' || requirement.approval_status === 'In Progress') && (isSuperAdmin || hasPermission('TASKS_CREATE') || requirement.creator_id === currentUserId || requirement.current_assignee_id === currentUserId) && (
              <AppButton variant={isReadyToPutToUse ? "secondary" : "primary"} leftIcon={<FilePlus className="h-4 w-4"/>} onClick={() => setShowWorkspaceSelector(true)}>
                Assign task
              </AppButton>
            )}
            {!isViewMode && isReadyToPutToUse && (
              <AppButton variant="primary" leftIcon={<CheckCircle className="h-4 w-4"/>} onClick={() => setShowPutToUseDialog(true)}>
                Put to use
              </AppButton>
            )}
          </div>
        </div>
      </div>

      <Dialog open={showAmendmentDialog} onOpenChange={setShowAmendmentDialog}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-border">
            <DialogTitle>Amend requirement</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-subtle">What has changed <span className="text-danger-text" aria-hidden>*</span></label>
              <textarea 
                className="min-h-[100px] w-full resize-y px-3 py-2 text-[13.5px]"
                placeholder="Describe what has changed in the requirement…"
                value={amendmentDetails}
                onChange={(e) => setAmendmentDetails(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-subtle">Attachment (optional)</label>
              {!amendmentFile ? (
                <input 
                  type="file" 
                  className="w-full text-[13px] text-muted file:mr-3 file:h-8 file:rounded-md file:border file:border-border file:bg-surface file:px-3 file:text-[13px] file:font-medium file:text-foreground hover:file:bg-surface-hover"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setAmendmentFile(e.target.files[0]);
                    }
                  }}
                />
              ) : (
                <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                    <Paperclip className="h-4 w-4 text-theme-icon shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate text-foreground" title={amendmentFile.name}>
                        {amendmentFile.name}
                      </p>
                      <p className="text-[11px] text-muted">
                        {(amendmentFile.size / 1024).toFixed(1)} KB • staged for amendment
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <AppButton
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => {
                        const url = URL.createObjectURL(amendmentFile);
                        window.open(url, '_blank');
                      }}
                      className="px-2 py-1 text-xs text-accent hover:bg-accent-soft rounded flex items-center gap-1 font-semibold"
                      title="View document"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>View</span>
                    </AppButton>
                    <AppButton
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => {
                        const url = URL.createObjectURL(amendmentFile);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = amendmentFile.name;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      }}
                      className="px-2 py-1 text-xs text-theme-icon hover:bg-accent-soft rounded flex items-center gap-1 font-semibold"
                      title="Download document"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download</span>
                    </AppButton>
                    <AppButton aria-label="Remove file"
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => setAmendmentFile(null)}
                      className="p-1 h-7 w-7 text-muted hover:text-danger hover:bg-danger/10 rounded flex items-center justify-center"
                      title="Remove file"
                    >
                      <X className="h-3.5 w-3.5" />
                    </AppButton>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="needsReapproval" 
                checked={needsReapproval}
                onChange={(e) => setNeedsReapproval(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <label htmlFor="needsReapproval" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Send for re-approval
              </label>
            </div>
            <p className="text-[12.5px] text-muted">
              If ticked, the requirement goes back to pending approval and a new approval flow starts. If not, the change is approved straight away and everyone on the linked tasks is notified.
            </p>
          </div>
          <DialogFooter className="px-6 py-4 bg-surface border-t border-border">
            <AppButton variant="ghost" onClick={() => setShowAmendmentDialog(false)}>Cancel</AppButton>
            <AppButton variant="primary" onClick={handleAmendment} isLoading={submittingAmendment} disabled={!amendmentDetails.trim()}>Save change</AppButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showReadyNotification} onOpenChange={setShowReadyNotification}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <DialogHeader className="border-b border-border px-6 py-4">
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" aria-hidden />
              All linked tasks are complete
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <p className="text-sm text-subtle">
              Every task linked to this requirement is closed. It&apos;s now ready to put to use.
            </p>
          </div>
          <DialogFooter className="px-6 py-4 bg-surface border-t border-border">
            <AppButton variant="ghost" onClick={() => setShowReadyNotification(false)}>Later</AppButton>
            <AppButton variant="primary" onClick={() => {
              setShowReadyNotification(false);
              setShowPutToUseDialog(true);
            }}>
              Put to use
            </AppButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPutToUseDialog} onOpenChange={setShowPutToUseDialog}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-border">
            <DialogTitle>Put requirement to use</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-subtle">Put to use on <span className="text-danger-text" aria-hidden>*</span></label>
              <AppInput type="date" value={putToUseDate} onChange={(e) => setPutToUseDate(e.target.value)} />
            </div>
            <p className="text-[12.5px] text-muted">
              The requirement is marked as closed from this date.
            </p>
          </div>
          <DialogFooter className="px-6 py-4 bg-surface border-t border-border">
            <AppButton variant="ghost" onClick={() => setShowPutToUseDialog(false)}>Cancel</AppButton>
            <AppButton variant="primary" onClick={handlePutToUse} isLoading={submittingPutToUse} disabled={!putToUseDate}>Put to use</AppButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* UAT FAIL & SELECTIVE TASK REOPEN DIALOG (Item 3.3 & Decision D6) */}
      <Dialog open={showUatFailDialog} onOpenChange={setShowUatFailDialog}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-border">
            <DialogTitle className="flex items-center gap-2 text-danger">
              <XCircle className="w-5 h-5 text-danger" />
              Fail UAT & Select Tasks to Reopen
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-subtle">
                Feedback & Rejection Reason <span className="text-danger" aria-hidden>*</span>
              </label>
              <textarea
                className="w-full bg-surface border border-border rounded-xl p-3 text-sm text-foreground focus:outline-none focus:border-primary min-h-[90px]"
                placeholder="Describe the defect or reason for UAT failure (Required)…"
                value={uatComment}
                onChange={e => setUatComment(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-subtle">
                Tasks to Reopen (Decision D6: none pre-selected)
              </label>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {linkedTasks.length === 0 ? (
                  <p className="text-xs text-muted">No linked tasks found for this requirement.</p>
                ) : (
                  linkedTasks.map((item: any) => {
                    const task = item.task || item;
                    const taskId = task.id || item.task_id;
                    const isSelected = selectedReopenTaskIds.includes(taskId);
                    return (
                      <label
                        key={taskId}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected ? 'border-primary bg-primary/5' : 'border-border bg-surface hover:bg-elevated'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 rounded border-border text-primary focus:ring-primary h-4 w-4"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedReopenTaskIds(prev => [...prev, taskId]);
                            } else {
                              setSelectedReopenTaskIds(prev => prev.filter(id => id !== taskId));
                            }
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{task.subject || "Untitled Task"}</p>
                          <p className="text-xs text-muted">Current Status: {task.status?.name || "Unknown"}</p>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="px-6 py-4 bg-surface border-t border-border">
            <AppButton variant="ghost" onClick={() => setShowUatFailDialog(false)}>Cancel</AppButton>
            <AppButton
              variant="destructive"
              disabled={!uatComment.trim() || submittingUat}
              isLoading={submittingUat}
              onClick={() => handleUAT('FAIL', selectedReopenTaskIds)}
              leftIcon={<XCircle className="w-4 h-4" />}
            >
              {selectedReopenTaskIds.length > 0
                ? `Fail UAT & Reopen (${selectedReopenTaskIds.length} tasks)`
                : "Fail UAT (No tasks reopened)"}
            </AppButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showWorkspaceSelector} onOpenChange={setShowWorkspaceSelector}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-border">
            <DialogTitle>Where should the task go?</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-subtle">Workspace <span className="text-danger-text" aria-hidden>*</span></label>
              <select
                value={selectedWorkspaceId}
                onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                className="h-9 w-full px-3 text-[13.5px]"
              >
                <option value="">Select a workspace</option>
                {workspaces.map(w => <option key={w.id} value={w.id}>{w.workspace_name || w.name}</option>)}
              </select>
            </div>
            
            {selectedWorkspaceId && (
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-subtle">Sub-workspace (optional)</label>
                <select
                  value={selectedSubWorkspaceId}
                  onChange={(e) => setSelectedSubWorkspaceId(e.target.value)}
                  className="h-9 w-full px-3 text-[13.5px]"
                >
                  <option value="">None</option>
                  {subWorkspaces.filter(sw => sw.parent_workspace_id === selectedWorkspaceId).map(sw => (
                    <option key={sw.id} value={sw.id}>{sw.workspace_name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <DialogFooter className="px-6 py-4 border-t border-border bg-surface">
            <AppButton variant="ghost" onClick={() => setShowWorkspaceSelector(false)}>Cancel</AppButton>
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
           initialDescription={`Requirement Reason:\n${requirement.requirement_reason || requirement.custom_fields?.business_reason || requirement.custom_fields?.custom_fields?.business_reason || '-'}\n\nRequirement Details:\n${requirement.requirement_details || requirement.custom_fields?.requirement_details || requirement.custom_fields?.requirement_description || requirement.custom_fields?.custom_fields?.requirement_description || requirement.functional_scope || '-'}`}
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
               loadData(); 
             } catch (err: any) {
               toast.error(sanitizeErrorMessage(err));
             } finally {
               setSaving(false);
             }
           }}
        />
      )}

      <div className="flex flex-col flex-1 min-h-0 overflow-y-auto pb-12">
        {showApprovalControls && (
          <div role="region" aria-label="Your decision" className="mb-5 rounded-[10px] border border-warning-border bg-warning-soft p-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning-text" aria-hidden />
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-[14px] font-semibold text-warning-text">
                    {requirement.approval_status === 'Pending SignOff' ? 'Your sign-off is needed' : isPendingForOther ? 'Override approval as Super Admin' : 'Your approval is needed'}
                  </h3>
                  {isPendingForOther && (
                    <AppButton variant="ghost" size="sm" onClick={() => setShowManualOverride(false)}>Cancel override</AppButton>
                  )}
                </div>

                <div className="space-y-3 rounded-md bg-surface p-3">
                  <LazyQuill
                    value={approvalRemarks}
                    onChange={setApprovalRemarks}
                    placeholder={requirement.approval_status === 'Pending SignOff' ? "Sign-off remarks (required)" : "Remarks for your decision (required)"}
                  />
                  <div className="flex flex-wrap gap-2">
                    <AppButton variant="secondary" onClick={() => submitApproval('Hold')} isLoading={savingApproval} leftIcon={<PauseCircle className="h-4 w-4"/>}>Hold</AppButton>
                    <AppButton variant="destructive" onClick={() => submitApproval('Reject')} isLoading={savingApproval} leftIcon={<XCircle className="h-4 w-4"/>}>Reject</AppButton>
                    {requirement.approval_status === 'Pending SignOff' ? (
                      <AppButton variant="primary" onClick={() => submitApproval('SignOff' as any)} isLoading={savingApproval} leftIcon={<CheckCircle className="h-4 w-4"/>}>Sign off</AppButton>
                    ) : (
                      <AppButton variant="primary" onClick={() => submitApproval('Approve')} isLoading={savingApproval} leftIcon={<CheckCircle className="h-4 w-4"/>}>Approve</AppButton>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {isPendingForOther && !showManualOverride && (
           <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-[10px] border border-info-border bg-info-soft p-4">
             <div className="flex items-center gap-3">
               <ShieldAlert className="h-5 w-5 shrink-0 text-info-text" aria-hidden />
               <div>
                 <h3 className="text-[14px] font-semibold text-info-text">
                   Waiting for another approver
                 </h3>
                 <p className="mt-0.5 text-[13px] text-info-text">As a Super Admin, you can override and decide on their behalf.</p>
               </div>
             </div>
             <AppButton variant="secondary" onClick={() => setShowManualOverride(true)}>Override approval</AppButton>
           </div>
        )}

        <div role="tablist" aria-label="Requirement sections" className="mb-5 flex gap-1 overflow-x-auto border-b border-border no-scrollbar">
          {[
            { id: 'details', label: 'Details', icon: FileText },
            { id: 'analysis', label: 'Business analysis', icon: Target },
            { id: 'approval', label: 'Approvals', icon: Shield },
            { id: 'tasks', label: 'Tasks', icon: Briefcase, count: linkedTasks.length },
            { id: 'audit', label: 'History', icon: Clock, count: auditLogs.length }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`-mb-px inline-flex h-10 shrink-0 items-center gap-2 border-b-2 px-3 text-[13.5px] transition-colors ${
                  isActive ? "border-primary font-semibold text-foreground" : "border-transparent font-medium text-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="rounded bg-sunken px-1.5 text-[11.5px] leading-5 text-subtle tabular">{tab.count}</span>
                )}
              </button>
            );
          })}
        </div>

        {activeTab === 'details' && (
          <div className="flex flex-col space-y-6 pb-12 animate-in fade-in duration-300">
            {(requirement.requirement_reason || requirement.requirement_details || requirement.objective || requirement.functional_scope || requirement.custom_fields?.business_reason || requirement.custom_fields?.requirement_details) && (
            <AppCard className="overflow-hidden border border-border bg-surface p-0 mb-4">
              <div className="bg-surface px-5 py-3.5 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-accent" />
                  <h3 className="text-[14px] font-semibold text-heading">Requirement reason & details</h3>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  <div className="flex flex-col p-3.5 rounded-xl bg-surface border border-border">
                    <span className="theme-label mb-1.5 text-muted flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-accent" /> Issue description
                    </span>
                    <div className="theme-data-value text-foreground whitespace-pre-wrap leading-relaxed break-words">
                      {requirement.objective || requirement.custom_fields?.description || snap.description || '-'}
                    </div>
                  </div>

                  <div className="flex flex-col p-3.5 rounded-xl bg-surface border border-border">
                    <span className="theme-label mb-1.5 text-muted flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-accent" /> Requirement reason
                    </span>
                    <div className="theme-data-value text-foreground whitespace-pre-wrap leading-relaxed break-words">
                      {requirement.requirement_reason || requirement.custom_fields?.business_reason || requirement.custom_fields?.custom_fields?.business_reason || requirement.objective || '-'}
                    </div>
                  </div>

                  <div className="flex flex-col p-3.5 rounded-xl bg-surface border border-border">
                    <span className="theme-label mb-1.5 text-muted flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-accent" /> Requirement details
                    </span>
                    <div className="theme-data-value text-foreground whitespace-pre-wrap leading-relaxed break-words">
                      {requirement.requirement_details || requirement.custom_fields?.requirement_details || requirement.custom_fields?.requirement_description || requirement.custom_fields?.custom_fields?.requirement_description || requirement.functional_scope || '-'}
                    </div>
                  </div>
                </div>
              </div>
            </AppCard>
            )}

            {requirement.scope === 'INFRA' && snap.infraSpecifications && snap.infraSpecifications.length > 0 && (
            <AppCard className="overflow-hidden border border-border bg-surface p-0 mb-4 animate-in fade-in duration-500">
              <div className="bg-surface px-5 py-3.5 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Server className="w-4 h-4 text-theme-btn-primary" />
                  <h3 className="text-[14px] font-semibold text-heading">Infrastructure specifications</h3>
                </div>
              </div>
              <div className="p-0">
                <AppTable>
                  <AppTableHeader>
                    <AppTableRow>
                      <AppTableHead className="w-[50%]">Item description</AppTableHead>
                      <AppTableHead className="text-right">Unit cost</AppTableHead>
                      <AppTableHead className="text-right">Quantity</AppTableHead>
                      <AppTableHead className="text-right">Total</AppTableHead>
                    </AppTableRow>
                  </AppTableHeader>
                  <AppTableBody>
                    {snap.infraSpecifications.map((spec: any, idx: number) => (
                      <AppTableRow key={idx}>
                        <AppTableCell className="font-medium text-foreground">{spec.item}</AppTableCell>
                        <AppTableCell className="text-right">${formatCount(spec.cost || 0)}</AppTableCell>
                        <AppTableCell className="text-right">{spec.qty || 1}</AppTableCell>
                        <AppTableCell className="text-right font-semibold text-theme-btn-primary">
                          ${formatCount((spec.cost || 0) * (spec.qty || 1))}
                        </AppTableCell>
                      </AppTableRow>
                    ))}
                    <AppTableRow className="bg-elevated/30 border-t-2 border-theme-btn-primary/20">
                      <AppTableCell colSpan={3} className="text-right font-bold text-muted">Total estimated cost</AppTableCell>
                      <AppTableCell className="text-right font-bold text-lg text-theme-btn-primary">
                        ${formatCount(snap.infraSpecifications.reduce((sum: number, spec: any) => sum + ((spec.cost || 0) * (spec.qty || 1)), 0))}
                      </AppTableCell>
                    </AppTableRow>
                  </AppTableBody>
                </AppTable>
              </div>
            </AppCard>
            )}

            {(requirement.business_classification?.name || snap.business_classification || requirement.requirement_type?.name || requirement.business_criticality?.name || requirement.priority?.name || requirement.business_value?.name || requirement.custom_fields?.business_value || requirement.business_impact || requirement.custom_fields?.business_impact || requirement.dependency_notes || requirement.custom_fields?.dependency_notes || requirement.technical_scope || requirement.custom_fields?.technical_scope || snap.technical_scope) && (
            <AppCard className="overflow-hidden border border-border bg-surface p-0 mb-4">
              <div className="bg-surface px-5 py-3.5 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Target className="w-4 h-4 text-accent" />
                  <h3 className="text-[14px] font-semibold text-heading">Business classification</h3>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {((requirement.business_classification?.name || snap.business_classification || requirement.requirement_type?.name) ||
                  (requirement.business_criticality?.name || requirement.priority?.name) ||
                  (requirement.business_value?.name || masters.business_values?.find((b: any) => b.id === requirement.custom_fields?.business_value)?.name || requirement.custom_fields?.business_value) ||
                  (requirement.business_impact || requirement.custom_fields?.business_impact)) && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
                  {(requirement.business_classification?.name || snap.business_classification || requirement.requirement_type?.name) && (
                  <div className="flex flex-col p-3.5 rounded-xl bg-surface border border-border">
                    <span className="theme-label mb-2 text-muted flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-accent" /> Business classification
                    </span>
                    <div>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md theme-data-value bg-surface text-foreground border border-border/60">
                        {requirement.business_classification?.name || snap.business_classification || requirement.requirement_type?.name}
                      </span>
                    </div>
                  </div>
                  )}

                  {(requirement.business_criticality?.name || requirement.priority?.name) && (
                  <div className="flex flex-col p-3.5 rounded-xl bg-surface border border-border">
                    <span className="theme-label mb-2 text-muted flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-accent" /> Business criticality <span className="text-danger">*</span>
                    </span>
                    <div>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md theme-data-value bg-surface text-foreground border border-border/60">
                        {requirement.business_criticality?.name || requirement.priority?.name}
                      </span>
                    </div>
                  </div>
                  )}

                  {(requirement.business_value?.name || masters.business_values?.find((b: any) => b.id === requirement.custom_fields?.business_value)?.name || requirement.custom_fields?.business_value) && (
                  <div className="flex flex-col p-3.5 rounded-xl bg-surface border border-border">
                    <span className="theme-label mb-1.5 text-muted flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-accent" /> Business value
                    </span>
                    <span className="theme-data-value text-foreground break-all">
                      {requirement.business_value?.name || masters.business_values?.find((b: any) => b.id === requirement.custom_fields?.business_value)?.name || requirement.custom_fields?.business_value}
                    </span>
                  </div>
                  )}

                  {(requirement.business_impact || requirement.custom_fields?.business_impact) && (
                  <div className="flex flex-col p-3.5 rounded-xl bg-surface border border-border">
                    <span className="theme-label mb-1.5 text-muted flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-accent" /> Business impact
                    </span>
                    <span className="theme-data-value text-foreground break-all">
                      {requirement.business_impact || requirement.custom_fields?.business_impact}
                    </span>
                  </div>
                  )}
                </div>
                )}

                {((requirement.dependency_notes || requirement.custom_fields?.dependency_notes) || (requirement.technical_scope || requirement.custom_fields?.technical_scope || snap.technical_scope)) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {(requirement.dependency_notes || requirement.custom_fields?.dependency_notes) && (
                  <div className="flex flex-col p-3.5 rounded-xl bg-surface border border-border">
                    <span className="theme-label mb-1.5 text-muted flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-accent" /> Dependency notes <span className="text-danger">*</span>
                    </span>
                    <div className="theme-data-value text-foreground whitespace-pre-wrap leading-relaxed break-words">
                      {requirement.dependency_notes || requirement.custom_fields?.dependency_notes}
                    </div>
                  </div>
                  )}

                  {(requirement.technical_scope || requirement.custom_fields?.technical_scope || snap.technical_scope) && (
                  <div className="flex flex-col p-3.5 rounded-xl bg-surface border border-border">
                    <span className="theme-label mb-1.5 text-muted flex items-center gap-1.5">
                      <Server className="w-3.5 h-3.5 text-accent" /> Technical scope / architecture <span className="text-danger">*</span>
                    </span>
                    <div 
                      className="theme-data-value text-foreground leading-relaxed break-words quill-rendered-content"
                      dangerouslySetInnerHTML={{ __html: requirement.technical_scope || requirement.custom_fields?.technical_scope || snap.technical_scope }}
                    />
                  </div>
                  )}
                </div>
                )}
              </div>
            </AppCard>
            )}

            <AppCard className="overflow-hidden border border-border p-5 mb-4">
              <div className="text-xs font-semibold text-muted mb-3 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-accent" /> Scope & system classification
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
                <div className="flex flex-col p-3 rounded-xl bg-surface border border-border">
                  <span className="theme-label mb-1 text-muted flex items-center gap-1">
                    <Target className="w-3 h-3 text-theme-icon" /> Scope
                  </span>
                  <span className="theme-data-value text-foreground truncate" title={requirement.scope || '-'}>{requirement.scope || '-'}</span>
                </div>

                <div className="flex flex-col p-3 rounded-xl bg-surface border border-border">
                  <span className="theme-label mb-1 text-muted flex items-center gap-1">
                    <Server className="w-3 h-3 text-theme-icon" /> {requirement.scope === 'INFRA' ? 'Affected Asset' : 'System'}
                  </span>
                  <span className="theme-data-value text-foreground truncate" title={requirement.scope === 'INFRA' ? (assetName || snap.assetId || '-') : (requirement.software_system?.name || snap.system || '-')}>
                    {requirement.scope === 'INFRA' ? (assetName || snap.assetId || '-') : (requirement.software_system?.name || snap.system || '-')}
                  </span>
                </div>

                <div className="flex flex-col p-3 rounded-xl bg-surface border border-border">
                  <span className="theme-label mb-1 text-muted flex items-center gap-1">
                    <Briefcase className="w-3 h-3 text-theme-icon" /> Module
                  </span>
                  <span className="theme-data-value text-foreground truncate" title={requirement.module?.name || snap.module || '-'}>{requirement.module?.name || snap.module || '-'}</span>
                </div>

                <div className="flex flex-col p-3 rounded-xl bg-surface border border-border">
                  <span className="theme-label mb-1 text-muted flex items-center gap-1">
                    <FileText className="w-3 h-3 text-theme-icon" /> Submodule
                  </span>
                  <span className="theme-data-value text-foreground truncate" title={requirement.sub_module?.name || snap.submodule || '-'}>{requirement.sub_module?.name || snap.submodule || '-'}</span>
                </div>

                <div className="flex flex-col p-3 rounded-xl bg-surface border border-border">
                  <span className="theme-label mb-1 text-muted flex items-center gap-1">Category</span>
                  <span className="theme-data-value text-foreground truncate" title={requirement.category?.name || snap.category || '-'}>{requirement.category?.name || snap.category || '-'}</span>
                </div>

                <div className="flex flex-col p-3 rounded-xl bg-surface border border-border">
                  <span className="theme-label mb-1 text-muted flex items-center gap-1">Sub category</span>
                  <span className="theme-data-value text-foreground truncate" title={requirement.sub_category?.name || snap.subcategory || '-'}>{requirement.sub_category?.name || snap.subcategory || '-'}</span>
                </div>

                <div className="flex flex-col p-3 rounded-xl bg-surface border border-border">
                  <span className="theme-label mb-1 text-muted flex items-center gap-1">Created by</span>
                  <span className="theme-data-value text-foreground truncate" title={requirement.creator?.full_name || '-'}>{requirement.creator?.full_name || '-'}</span>
                </div>

                <div className="flex flex-col p-3 rounded-xl bg-surface border border-border">
                  <span className="theme-label mb-1 text-muted flex items-center gap-1">Department</span>
                  <span className="theme-data-value text-foreground truncate" title={requirement.department?.name || '-'}>{requirement.department?.name || '-'}</span>
                </div>
              </div>
            </AppCard>

            <AppCard className="overflow-hidden border border-border p-5 mb-4">
              <div className="text-xs font-semibold text-muted mb-3 flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-theme-icon" /> Associated files & attachments ({attachments.length})
              </div>
              <div className="mb-4">
                <EnterpriseUploader 
                  moduleType="requirement"
                  recordId={reqId as string}
                  onUploadComplete={() => {
                    loadData();
                    toast.success("Attachment uploaded successfully");
                  }}
                />
              </div>
            </AppCard>

            {requirement.status?.status_name === 'UAT' && (
              <section className="bg-warning-soft rounded-2xl p-6 border border-warning-border shadow-sm">
                <h3 className="theme-label text-warning mb-2 font-semibold text-base flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  User acceptance testing (UAT)
                </h3>
                <textarea 
                  className="w-full bg-surface border border-border rounded-xl p-3 text-sm text-foreground mb-4 focus:outline-none focus:border-primary min-h-[100px]"
                  placeholder="Enter UAT feedback or rejection reasons (Required for Failure)…"
                  value={uatComment}
                  onChange={e => setUatComment(e.target.value)}
                />
                <div className="flex gap-3">
                  <AppButton 
                    onClick={() => handleUAT('PASS')}
                    disabled={submittingUat}
                    isLoading={submittingUat}
                    variant="primary"
                    leftIcon={<CheckCircle className="w-4 h-4" />}
                  >
                    Approve & close requirement
                  </AppButton>
                  <AppButton 
                    onClick={() => { setSelectedReopenTaskIds([]); setShowUatFailDialog(true); }}
                    disabled={submittingUat}
                    isLoading={submittingUat}
                    variant="destructive"
                    leftIcon={<XCircle className="w-4 h-4" />}
                  >
                    Fail & reopen task
                  </AppButton>
                </div>
              </section>
            )}
          </div>
        )}

        {/* TAB 2: Business Analysis */}
        {activeTab === 'analysis' && (
          <div className="flex flex-col space-y-6 animate-in fade-in duration-300">
            {/* 1. CARD: Business Classification */}
            <AppCard className="overflow-hidden border border-border bg-surface p-0 mb-4">
              <div className="bg-surface px-5 py-3.5 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Target className="w-4 h-4 text-accent" />
                  <h3 className="text-[14px] font-semibold text-heading">Business classification</h3>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col space-y-1.5">
                    <label className="theme-label text-muted flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5 text-accent" /> Business classification <span className="text-danger">*</span></span>
                      {isEditable && (
                        <AppButton aria-label="Add" variant="ghost" type="button" onClick={() => { setMasterModalType('issue_type'); setShowAddMasterModal(true); }} className="text-accent hover:text-accent/80 p-0.5 rounded-full hover:bg-accent/10 h-auto min-h-0 min-w-0">
                          <Plus className="w-3.5 h-3.5" />
                        </AppButton>
                      )}
                    </label>
                    {isEditable ? (
                      <select
                        className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.requirement_type_id || ""}
                        onChange={(e) => handleUpdateField('requirement_type_id', e.target.value)}
                      >
                        <option value="">Select Classification…</option>
                        {masters.issue_types?.map((t: any) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="p-2.5 rounded-lg border border-border bg-surface text-foreground text-sm font-medium">
                        {masters.issue_types?.find((t: any) => t.id === formData.requirement_type_id)?.name || requirement.business_classification?.name || requirement.requirement_type?.name || '-'}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    <label className="theme-label text-muted flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-accent" /> Business criticality <span className="text-danger">*</span></span>
                    </label>
                    {isEditable ? (
                      <select
                        className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.business_criticality_id || ""}
                        onChange={(e) => handleUpdateField('business_criticality_id', e.target.value)}
                      >
                        <option value="">Select Criticality…</option>
                        {masters.priority_master?.map((p: any) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="p-2.5 rounded-lg border border-border bg-surface text-foreground text-sm font-medium">
                        {masters.priority_master?.find((p: any) => p.id === formData.business_criticality_id)?.name || requirement.business_criticality?.name || requirement.priority?.name || '-'}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    <label className="theme-label text-muted flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><Target className="w-3.5 h-3.5 text-accent" /> Business value</span>
                      {isEditable && (
                        <AppButton aria-label="Add" variant="ghost" type="button" onClick={() => { setMasterModalType('business_value'); setShowAddMasterModal(true); }} className="text-accent hover:text-accent/80 p-0.5 rounded-full hover:bg-accent/10 h-auto min-h-0 min-w-0">
                          <Plus className="w-3.5 h-3.5" />
                        </AppButton>
                      )}
                    </label>
                    {isEditable ? (
                      <select
                        className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.business_value_id || ""}
                        onChange={(e) => handleUpdateField('business_value_id', e.target.value)}
                      >
                        <option value="">Select Value…</option>
                        {masters.business_values?.map((bv: any) => (
                          <option key={bv.id} value={bv.id}>{bv.name}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="p-2.5 rounded-lg border border-border bg-surface text-foreground text-sm font-medium">
                        {masters.business_values?.find((b: any) => b.id === formData.business_value_id)?.name || requirement.business_value?.name || requirement.custom_fields?.business_value || '-'}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div className="flex flex-col space-y-1.5">
                    <label className="theme-label text-muted flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><Target className="w-3.5 h-3.5 text-accent" /> Business impact</span>
                    </label>
                    {isEditable ? (
                      <textarea
                        className="flex min-h-[80px] w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.business_impact}
                        onChange={(e) => handleUpdateField('business_impact', e.target.value)}
                        placeholder="Enter business impact details…"
                      />
                    ) : (
                      <div className="p-3 rounded-lg border border-border bg-surface text-foreground text-sm whitespace-pre-wrap">
                        {formData.business_impact || '-'}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    <label className="theme-label text-muted flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-accent" /> Dependency notes <span className="text-danger">*</span></span>
                    </label>
                    {isEditable ? (
                      <textarea
                        className="flex min-h-[80px] w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.dependency_notes}
                        onChange={(e) => handleUpdateField('dependency_notes', e.target.value)}
                        placeholder="Enter dependency notes…"
                      />
                    ) : (
                      <div className="p-3 rounded-lg border border-border bg-surface text-foreground text-sm whitespace-pre-wrap">
                        {formData.dependency_notes || '-'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </AppCard>

            {/* 2. CARD: Requirement Reason, Details & Technical Scope */}
            <AppCard className="overflow-hidden border border-border bg-surface p-0 mb-4">
              <div className="bg-surface px-5 py-3.5 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-accent" />
                  <h3 className="text-[14px] font-semibold text-heading">Requirement reason, details & technical scope</h3>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  <div className="flex flex-col space-y-1.5">
                    <label className="theme-label text-muted flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-accent" /> Issue description</span>
                    </label>
                    <div className="p-3.5 rounded-xl bg-surface border border-border h-full">
                      <div className="theme-data-value text-foreground whitespace-pre-wrap leading-relaxed break-words">
                        {requirement.objective || requirement.custom_fields?.description || snap.description || '-'}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    <label className="theme-label text-muted flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-accent" /> Requirement reason</span>
                    </label>
                    {isEditable ? (
                      <textarea
                        className="flex min-h-[80px] h-full w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.requirement_reason}
                        onChange={(e) => handleUpdateField('requirement_reason', e.target.value)}
                        placeholder="Enter requirement reason…"
                      />
                    ) : (
                      <div className="p-3.5 rounded-xl bg-surface border border-border h-full">
                        <div className="theme-data-value text-foreground whitespace-pre-wrap leading-relaxed break-words">
                          {formData.requirement_reason || '-'}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    <label className="theme-label text-muted flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-accent" /> Requirement details</span>
                    </label>
                    {isEditable ? (
                      <textarea
                        className="flex min-h-[80px] h-full w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.requirement_details}
                        onChange={(e) => handleUpdateField('requirement_details', e.target.value)}
                        placeholder="Enter requirement details…"
                      />
                    ) : (
                      <div className="p-3.5 rounded-xl bg-surface border border-border h-full">
                        <div className="theme-data-value text-foreground whitespace-pre-wrap leading-relaxed break-words">
                          {formData.requirement_details || '-'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col space-y-1.5 mt-4">
                  <label className="theme-label text-muted flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><Server className="w-3.5 h-3.5 text-accent" /> Technical scope / architecture details <span className="text-danger">*</span></span>
                  </label>
                  {isEditable ? (
                    <LazyQuill
                      value={formData.technical_scope}
                      onChange={(v) => handleUpdateField('technical_scope', v)}
                      placeholder="Enter architecture details…"
                    />
                  ) : (
                    <div className="p-3 rounded-lg border border-border bg-surface text-foreground text-sm prose dark:prose-invert max-w-none">
                      <SafeHtml html={formData.technical_scope || ''} />
                    </div>
                  )}
                </div>
              </div>
            </AppCard>

            
            {/* IT System Conditional Render */}
            {requirement.custom_fields?.requirement_domain === 'IT & Software System' && (
              <AppCard className="overflow-hidden border border-border bg-surface p-0 mb-4 animate-in fade-in zoom-in-95 duration-300">
                <div className="bg-surface px-5 py-3.5 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Server className="w-4 h-4 text-accent" />
                    <h3 className="text-[14px] font-semibold text-heading">IT & software scope</h3>
                  </div>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div className="flex flex-col p-3.5 rounded-xl bg-surface border border-border">
                      <span className="theme-label mb-1.5 text-muted">Target system / application</span>
                      <span className="theme-data-value text-foreground">{requirement.custom_fields?.target_system || '-'}</span>
                    </div>
                    <div className="flex flex-col p-3.5 rounded-xl bg-surface border border-border">
                      <span className="theme-label mb-1.5 text-muted">Data privacy & security</span>
                      <span className="theme-data-value text-foreground">{requirement.custom_fields?.data_privacy || '-'}</span>
                    </div>
                    <div className="flex flex-col p-3.5 rounded-xl bg-surface border border-border">
                      <span className="theme-label mb-1.5 text-muted">Software license cost</span>
                      <span className="theme-data-value text-foreground">{requirement.custom_fields?.software_cost ? `₹${requirement.custom_fields.software_cost}` : 'N/A'}</span>
                    </div>
                    <div className="flex flex-col p-3.5 rounded-xl bg-surface border border-border">
                      <span className="theme-label mb-1.5 text-muted">Development cost</span>
                      <span className="theme-data-value text-foreground">{requirement.custom_fields?.dev_cost ? `₹${requirement.custom_fields.dev_cost}` : 'N/A'}</span>
                    </div>
                  </div>
                  {requirement.custom_fields?.integrations && (
                    <div className="mt-3.5 flex flex-col p-3.5 rounded-xl bg-surface border border-border">
                      <span className="theme-label mb-1.5 text-muted">Integration dependencies</span>
                      <span className="theme-data-value text-foreground whitespace-pre-wrap">{requirement.custom_fields.integrations}</span>
                    </div>
                  )}
                </div>
              </AppCard>
            )}

            {/* Infrastructure Conditional Render */}
            {requirement.custom_fields?.requirement_domain === 'Infrastructure & Hardware' && (
              <AppCard className="overflow-hidden border border-border bg-surface p-0 mb-4 animate-in fade-in zoom-in-95 duration-300">
                <div className="bg-surface px-5 py-3.5 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Server className="w-4 h-4 text-accent" />
                    <h3 className="text-[14px] font-semibold text-heading">Infrastructure scope</h3>
                  </div>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div className="flex flex-col p-3.5 rounded-xl bg-surface border border-border">
                      <span className="theme-label mb-1.5 text-muted">Target environment</span>
                      <span className="theme-data-value text-foreground">{requirement.custom_fields?.target_environment || '-'}</span>
                    </div>
                    <div className="flex flex-col p-3.5 rounded-xl bg-surface border border-border">
                      <span className="theme-label mb-1.5 text-muted">Hardware & capacity needs</span>
                      <span className="theme-data-value text-foreground">{requirement.custom_fields?.hardware_needs || '-'}</span>
                    </div>
                    <div className="flex flex-col p-3.5 rounded-xl bg-surface border border-border">
                      <span className="theme-label mb-1.5 text-muted">CAPEX amount</span>
                      <span className="theme-data-value text-foreground">{requirement.custom_fields?.capex_amount ? `₹${requirement.custom_fields.capex_amount}` : 'N/A'}</span>
                    </div>
                    <div className="flex flex-col p-3.5 rounded-xl bg-surface border border-border">
                      <span className="theme-label mb-1.5 text-muted">OPEX amount</span>
                      <span className="theme-data-value text-foreground">{requirement.custom_fields?.opex_amount ? `₹${requirement.custom_fields.opex_amount}` : 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </AppCard>
            )}

            {/* 3. CARD: Timelines & Resources */}
            <AppCard className="overflow-hidden border border-border bg-surface p-0 mb-4">
              <div className="bg-surface px-5 py-3.5 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-accent" />
                  <h3 className="text-[14px] font-semibold text-heading">Timelines & resources</h3>
                </div>
              </div>

              <div className="p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                  <div className="flex flex-col p-3.5 rounded-xl bg-surface border border-border justify-center min-h-[76px]">
                    <span className="theme-label mb-1.5 text-muted flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-accent" /> Start date <span className="text-danger">*</span>
                    </span>
                    {isEditable ? (
                      <AppInput type="date" min={requirement.created_at?.slice(0, 10)} value={formData.start_date} onChange={(e) => handleDateChange('start_date', e.target.value)} className="w-full" />
                    ) : (
                      <span className="theme-data-value text-foreground truncate">
                        {formatDate(requirement.start_date || requirement.created_at, 'Not Set')}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col p-3.5 rounded-xl bg-surface border border-border justify-center min-h-[76px]">
                    <span className="theme-label mb-1.5 text-muted flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-accent" /> Due date <span className="text-danger">*</span>
                    </span>
                    {isEditable ? (
                      <AppInput type="date" min={formData.start_date || requirement.created_at?.slice(0, 10)} value={formData.due_date} onChange={(e) => handleDateChange('due_date', e.target.value)} className="w-full" />
                    ) : (
                      <span className="theme-data-value text-foreground truncate">
                        {formatDate(requirement.due_date || requirement.expected_completion_date, 'Not Set')}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col p-3.5 rounded-xl bg-surface border border-border justify-center min-h-[76px]">
                    <span className="theme-label mb-1.5 text-muted flex items-center gap-1.5">
                      <Hourglass className="w-3.5 h-3.5 text-accent" /> Estimated effort (days) <span className="text-danger">*</span>
                    </span>
                    {isEditable ? (
                      <AppInput type="number" min="1" value={formData.estimated_effort} onChange={handleEffortChange} className="w-full" placeholder="e.g. 5" />
                    ) : (
                      <span className="theme-data-value text-foreground truncate">
                        {requirement.estimated_effort || requirement.custom_fields?.estimated_effort || (requirement.start_date && requirement.due_date ? Math.max(1, Math.round((new Date(requirement.due_date).getTime() - new Date(requirement.start_date).getTime()) / (1000 * 60 * 60 * 24))) : '5 Days')}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col p-3.5 rounded-xl bg-surface border border-border justify-center min-h-[76px]">
                    <span className="theme-label mb-1.5 text-muted flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-accent" /> Estimated cost
                    </span>
                    {isEditable ? (
                      <AppInput type="number" placeholder="Amount (e.g. 50000)" value={formData.estimated_cost} onChange={(e) => setFormData({...formData, estimated_cost: e.target.value})} className="w-full" />
                    ) : (
                      <span className="theme-data-value text-foreground truncate">
                        {requirement.estimated_cost ? `₹${requirement.estimated_cost}` : (requirement.custom_fields?.estimated_cost ? `₹${requirement.custom_fields.estimated_cost}` : 'Standard Budget')}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col p-3.5 rounded-xl bg-surface border border-border justify-center min-h-[76px]">
                    <span className="theme-label mb-1.5 text-muted flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-accent" /> Estimated resources
                    </span>
                    {isEditable ? (
                      <AppInput placeholder="e.g. 2 Developers" value={formData.estimated_resources} onChange={(e) => setFormData({...formData, estimated_resources: e.target.value})} className="w-full" />
                    ) : (
                      <span className="theme-data-value text-foreground truncate">
                        {requirement.estimated_resources || requirement.custom_fields?.estimated_resources || '-'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </AppCard>


            {/* 4. CARD: Impacted Departments & Define Approval Sequence * */}
            <AppCard className="overflow-hidden border border-border bg-surface p-0 mb-4">
              <div className="bg-surface px-5 py-3.5 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Briefcase className="w-4 h-4 text-accent" />
                  <h3 className="text-[14px] font-semibold text-heading">Impacted departments & define approval sequence *</h3>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col p-3.5 rounded-xl bg-surface border border-border">
                    <span className="theme-label mb-1.5 text-accent">
                      Primary impacted department
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full theme-data-value bg-primary text-primary-foreground shadow-xs">
                        {requirement.department?.name || snap.department || '-'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col p-3.5 rounded-xl bg-surface border border-border">
                    <span className="theme-label mb-1.5 text-accent">
                      Department approvers & stakeholders (sequence configured)
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {approvalFlow && approvalFlow.length > 0 ? (
                        approvalFlow.map((flow: any, idx: number) => (
                          <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-surface border border-border text-foreground">
                            <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold flex items-center justify-center">{idx + 1}</span>
                            {flow.approver?.full_name || flow.user?.full_name || `Approver Level ${idx + 1}`} - {flow.department?.name || '-'} ({flow.approver?.designation?.name || '-'})
                          </span>
                        ))
                      ) : (formData.impacted_departments?.length > 0 && Object.values(formData.department_approvers).some((arr: any) => arr.length > 0)) ? (
                        formData.impacted_departments.flatMap((deptId: string) => {
                          const dept = masters.departments?.find((d: any) => d.id === deptId);
                          const approvers = formData.department_approvers[deptId] || [];
                          return approvers.map((userId: string) => {
                            const user = masters.users?.find((u: any) => u.id === userId);
                            return { approver: user, department: dept };
                          });
                        }).map((flow: any, idx: number) => (
                          <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-surface border border-border text-foreground">
                            <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold flex items-center justify-center">{idx + 1}</span>
                            {flow.approver?.full_name || `Approver Level ${idx + 1}`} - {flow.department?.name || '-'} ({flow.approver?.designation?.name || '-'})
                          </span>
                        ))
                      ) : (
                        <span className="text-xs font-medium text-muted italic">Department approver sequence configured</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Define Approval Sequence * Selector Matrix */}
                {(!approvalFlow || !approvalFlow.some((f: any) => f.status === 'Approved')) && isEditable && (
                <div className="p-4 rounded-xl bg-surface border border-border space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-muted flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-accent" /> Select impacted departments & define approval sequence <span className="text-danger">*</span>
                    </span>
                    <span className="text-[11px] text-muted font-medium">Click departments to select, then assign approver order (1st, 2nd, etc).</span>
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
                              ? "bg-theme-btn-primary border-transparent text-theme-btn-primary-text shadow-sm" 
                              : "bg-surface border-border text-muted hover:text-foreground hover:border-accent/40"
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full ${isSelected ? "bg-surface" : "bg-accent"}`} />
                          <span>{d.name}</span>
                          {isSelected && <span className="text-[11px] font-semibold bg-surface/20 px-1.5 py-0.2 rounded-full">Selected</span>}
                        </AppButton>
                      );
                    })}
                  </div>

                  {/* 2. Interactive Approval Sequence Builder per Selected Department */}
                  {formData.impacted_departments.length > 0 && (
                    <div className="mt-4 space-y-4 pt-3 border-t border-border">
                      <label className="block theme-label text-muted">
                        Configure department approval sequence <span className="text-danger">*</span>
                      </label>
                      {formData.impacted_departments.map((deptId: string) => {
                        const dept = masters.departments?.find((d: any) => d.id === deptId);
                        const deptName = dept?.name || '-';
                        
                        // Filter users for this department or fallback to all users if none found
                        let deptUsers = (masters.users || []).filter((u: any) => u.department_id === deptId || u.department === deptName);

                        const selectedApprovers = formData.department_approvers[deptId] || [];

                        return (
                          <div key={deptId} className="p-4 rounded-xl border border-border bg-surface space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="theme-data-value text-foreground flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-accent" />
                                {deptName} Approvers
                              </span>
                              <span className="theme-label text-muted">Select users in order (1st = Approver, 2nd = Executive, etc)</span>
                            </div>

                            <div className="flex flex-wrap gap-2 pt-1">
                              {deptUsers.length === 0 ? (
                                <div className="text-xs text-muted italic p-2 border border-border rounded-lg w-full text-center">
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
                                          : "bg-surface border-border text-foreground hover:border-accent/40"
                                      }`}
                                    >
                                      {isUserSelected && (
                                        <span className="bg-surface/25 w-4 h-4 rounded-full flex items-center justify-center text-[11px] font-semibold">
                                          {orderIndex}
                                        </span>
                                      )}
                                      <span>{u.full_name || u.name || 'User'} {u.designation?.name ? `(${u.designation.name})` : ''}</span>
                                    </AppButton>
                                  );
                                })
                              )}
                            </div>

                            {/* Approval Sequence Preview Strip */}
                            {selectedApprovers.length > 0 && (
                              <div className="mt-2 p-2.5 rounded-lg bg-surface border border-border">
                                <div className="theme-label text-foreground font-semibold mb-1">
                                  {deptName} - Configured approval sequence
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-foreground">
                                  {selectedApprovers.map((id: string, index: number) => {
                                    const user = (masters.users || []).find((u: any) => u.id === id);
                                    const roleLabel = index === 0 ? "1st (Approver)" : index === 1 ? "2nd (Executive)" : `${index + 1}th Level`;
                                    return (
                                      <div key={id} className="flex items-center gap-1.5">
                                        <span className="text-accent font-bold">{roleLabel}:</span>
                                        <span className="bg-surface px-2 py-0.5 rounded border border-border">{user?.full_name || user?.name || 'User'} {user?.designation?.name ? `(${user.designation.name})` : ''}</span>
                                        {index < selectedApprovers.length - 1 && <span className="text-muted font-bold">→</span>}
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

                  {/* 3. Sign-Off Approver Selection */}
                  <div className="mt-4 pt-4 border-t border-border">
                    <label className="block theme-label text-muted mb-2">
                      Designated sign-off approver <span className="text-danger">*</span>
                    </label>
                    <select 
                      className="flex h-10 w-full md:w-1/2 rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                      value={formData.signoff_approver_id}
                      onChange={(e) => setFormData({ ...formData, signoff_approver_id: e.target.value })}
                    >
                      <option value="" className="text-muted">-- Select sign-off approver --</option>
                      {(masters.users || []).map((u: any) => (
                        <option key={u.id} value={u.id} className="text-foreground">
                          {u.full_name || u.name || 'User'} {u.designation?.name ? `(${u.designation.name})` : ''}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-muted font-medium mt-1.5">
                      This user will be responsible for the final sign-off once all departmental approvals are complete.
                    </p>
                  </div>

                </div>
                )}
              </div>
            </AppCard>

            {/* 5. CARD: Add New Analysis Remarks (Mandatory for Approvers) & Remarks History */}
            <AppCard className="overflow-hidden border border-border bg-surface p-0 mb-4">
              {/* Card Header */}
              <div className="bg-surface px-5 py-3.5 border-b border-border flex items-center justify-between select-none">
                <div className="flex items-center gap-2.5">
                  <div className="w-1.5 h-4 rounded-full bg-accent shadow-xs animate-pulse" />
                  <FileText className="w-4 h-4 text-accent" />
                  <h3 className="text-[14px] font-semibold text-heading">Analysis remarks & approver history</h3>
                </div>
              </div>

              <div className="p-5 space-y-5">
                {/* SECTION 1: Add New Analysis Remarks (Always Visible & Accessible) */}
                <div className="flex flex-col space-y-2 p-4 rounded-2xl bg-surface border border-border">
                  <label className="theme-data-value text-warning flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-accent" /> Add new analysis remarks (mandatory for approvers) <span className="text-danger">*</span>
                  </label>
                  <LazyQuill
                    value={approvalRemarks}
                    onChange={setApprovalRemarks}
                    placeholder="Enter mandatory analysis remarks, technical recommendations, or approval feedback with rich text decorations…"
                  />
                  </div>

                {/* SECTION 2: Remarks History (Separated, Default Minimized) */}
                <div className="pt-3 border-t border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="theme-label flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-theme-icon" /> Remarks history ({auditLogs.length})
                    </h4>
                    
                    <AppButton
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsRemarksHistoryMinimized(!isRemarksHistoryMinimized)}
                      className="theme-data-value text-accent hover:bg-surface-hover flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all"
                    >
                      {isRemarksHistoryMinimized ? (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          <span>Show remarks history ({auditLogs.length})</span>
                        </>
                      ) : (
                        <>
                          <ChevronRight className="w-4 h-4" />
                          <span>Hide remarks history</span>
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
                              <div className="w-7 h-7 rounded-full bg-accent-soft text-theme-icon font-bold text-xs flex items-center justify-center shrink-0">
                                {log.user?.full_name?.substring(0, 2).toUpperCase() || 'U'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <span className="theme-data-value text-foreground truncate">{log.user?.full_name || log.actor_name || 'System Actor'}</span>
                                  <span className="theme-label text-muted">{formatDateTime(log.performed_at || log.created_at || log.timestamp)}</span>
                                </div>
                                <div className="theme-data-value text-muted-foreground leading-relaxed break-words">
                                  <SafeHtml html={log.new_value?.remarks || log.new_value?.message || log.action || log.remarks || log.message || '-'} />
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


          </div>
        )}



        <div className={`rounded-lg mb-10 ${['approval', 'tasks', 'audit'].includes(activeTab) ? 'bg-surface border border-border p-3 shadow-sm' : ''}`}>
          {activeTab === 'approval' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {approvalFlow.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 opacity-50 mt-4 border border-border rounded-lg">
                  <Shield className="h-8 w-8 mb-2 text-theme-icon" />
                  <p className="text-xs text-muted">No approval workflow has been initiated yet.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(
                    approvalFlow.reduce((acc, flow) => {
                      const deptName = flow.department?.name || '-';
                      if (!acc[deptName]) acc[deptName] = [];
                      acc[deptName].push(flow);
                      return acc;
                    }, {} as Record<string, any[]>)
                  ).map(([deptName, flows]: any) => (
                    <div key={deptName} className="p-4 bg-surface rounded-lg border border-border shadow-sm">
                      <h3 className="text-sm font-bold text-foreground mb-4 border-b border-border pb-2">
                        {deptName} Approvals
                      </h3>
                      <div className="relative">
                        {/* Connecting Line */}
                        <div className="absolute top-5 left-4 bottom-5 w-0.5 bg-muted" />
                        
                        <div className="space-y-6 relative z-10">
                          {flows.map((flow: any, index: number) => {
                            const isApproved = flow.status === 'Approved' || flow.status === 'Bypassed';
                            const isPending = flow.status === 'Pending';
                            const isRejected = flow.status === 'Rejected';
                            
                            let statusColor = "bg-surface border-border text-muted";
                            let icon = <Clock className="h-3.5 w-3.5" />;
                            
                            if (isApproved) {
                              statusColor = "bg-success-soft border-success-border text-success-text";
                              icon = <CheckCircle className="h-3.5 w-3.5" />;
                            } else if (isRejected) {
                              statusColor = "bg-danger-soft border-danger-border text-danger-text";
                              icon = <XCircle className="h-3.5 w-3.5" />;
                            } else if (isPending) {
                              statusColor = "bg-warning-soft border-warning-border text-warning-text";
                              icon = <AlertTriangle className="h-3.5 w-3.5" />;
                            }
                            
                            return (
                              <div key={flow.id} className="flex gap-4 items-start pl-2">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 shrink-0 bg-surface mt-1 z-10 ${isApproved ? 'border-success text-success' : isRejected ? 'border-danger text-danger' : isPending ? 'border-warning text-warning' : 'border-border text-muted'}`}>
                                  {isApproved ? <CheckCircle className="w-3 h-3" /> : isRejected ? <XCircle className="w-3 h-3" /> : <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                                </div>
                                <div className={`flex-1 p-3 rounded-lg border ${statusColor} transition-colors`}>
                                  <div className="flex justify-between items-start mb-1">
                                    <div className="font-semibold text-sm">Level {flow.level}: {flow.approver?.full_name || '-'}</div>
                                    <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider px-2 py-0.5 rounded-full bg-surface">
                                      {icon} {flow.status}
                                    </div>
                                  </div>
                                  {flow.actioned_at && (
                                    <div className="text-[11px] text-muted mb-2">
                                      {formatDateTime(flow.actioned_at)}
                                    </div>
                                  )}
                                  {flow.remarks && (
                                    <div className="text-xs bg-surface p-2 rounded text-subtle italic border border-border">
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
            

          </div>
        )}

        {activeTab === 'tasks' && (
            <div className="space-y-4 animate-in fade-in duration-300 pt-2 pb-10">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <Server className="h-5 w-5 text-theme-icon" />
                  <h2 className="text-sm font-bold text-foreground">Implementation tasks</h2>
                </div>
              </div>
              
              {linkedTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 opacity-50 mt-4">
                  <Server className="h-8 w-8 mb-2 text-theme-icon" />
                  <p className="text-xs text-muted">Generated implementation tasks will appear here.</p>
                </div>
              ) : (
                <AppTable>
                  <AppTableHeader>
                    <AppTableRow>
                      <AppTableHead>Task name</AppTableHead>
                      <AppTableHead>Assignee</AppTableHead>
                      <AppTableHead>Status</AppTableHead>
                      <AppTableHead>Due date</AppTableHead>
                      <AppTableHead>Linked on</AppTableHead>
                    </AppTableRow>
                  </AppTableHeader>
                  <AppTableBody>
                    {linkedTasks.map((link: any) => (
                      <AppTableRow key={link.task_id} className="hover:bg-surface-hover transition-colors cursor-pointer" onClick={() => router.push(`/tasks/${link.task_id}`)}>
                        <AppTableCell className="font-medium text-foreground">
                          {link.task?.subject || 'Untitled Task'}
                        </AppTableCell>
                        <AppTableCell className="text-subtle">
                          {link.task?.assigned_to_user?.full_name || 'Unassigned'}
                        </AppTableCell>
                        <AppTableCell>
                          <AppBadge
                            variant="custom"
                            customColor={link.task?.status?.status_color || 'var(--muted)'}
                            className="text-[11px]"
                          >
                            {link.task?.status?.name || 'New'}
                          </AppBadge>
                        </AppTableCell>
                        <AppTableCell className="text-subtle">
                          {link.task?.end_date ? formatDate(link.task.end_date) : '-'}
                        </AppTableCell>
                        <AppTableCell className="text-muted text-xs">
                          {formatDate(link.linked_at)}
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
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border">
                <Clock className="h-5 w-5 text-theme-icon" />
                <h2 className="text-sm font-bold text-foreground">Audit trail & lifecycle history</h2>
              </div>
              
              {auditLogs.length === 0 ? (
                <div className="p-8 text-center text-muted text-sm bg-surface rounded-lg border border-border">
                  No activity recorded yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {auditLogs.map((log: any) => (
                    <AppCard key={log.id} className="p-3 flex flex-col gap-1 shadow-sm">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-theme-icon">
                            <Clock className="w-3 h-3" />
                          </div>
                          <span className="font-bold text-sm text-foreground">{log.event_type.replace(/_/g, ' ')}</span>
                        </div>
                        <span className="text-xs text-muted">{formatDateTime(log.performed_at)}</span>
                      </div>
                      <div className="ml-8 text-xs text-subtle">
                        Performed by <span className="font-semibold text-foreground">{log.user?.full_name || 'System'}</span>
                      </div>
                      {log.new_value && (
                        <div className="ml-8 mt-2 p-3 bg-surface rounded-md text-xs text-subtle border border-border font-mono">
                          {typeof log.new_value === 'string' ? (
                            <span className="whitespace-pre-wrap">{log.new_value}</span>
                          ) : (
                            <ul className="space-y-1">
                              {Object.entries(log.new_value)
                                .filter(([key]) => !['task_id', 'workspace_id', 'sub_workspace_id', 'override'].includes(key.toLowerCase()))
                                .map(([key, value]) => (
                                <li key={key} className="flex gap-2">
                                  <span className="text-muted font-bold min-w-[100px] truncate">{key.replace(/_/g, ' ').toUpperCase()}:</span>
                                  <span className="flex-1 text-foreground whitespace-pre-wrap">{String(value)}</span>
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
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-border bg-surface shadow-lg">
          <DialogHeader className="px-6 py-4 border-b border-border bg-surface">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <FilePlus className="h-5 w-5 text-theme-icon" />
              Add {masterModalType === 'issue_type' ? 'Requirement Type' : 'Business Value'}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div>
              <label className="block theme-data-value text-muted mb-1">Name <span className="text-danger">*</span></label>
              <AppInput
                autoFocus
                placeholder="Enter name…"
                value={newMasterName}
                onChange={(e) => setNewMasterName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddMasterSubmit(); }}
              />
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t border-border bg-surface">
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
      </div> {/* End flex-1 scrollable area */}

      {/* GLOBAL STATIC FOOTERS */}
      <div className="shrink-0 bg-background/95 border-t border-border shadow-sm z-30 empty:hidden px-6 md:px-8">
        {activeTab === 'analysis' && (
          <div className="p-4 flex items-center justify-end gap-3">
            {((!isViewMode && (isEditable || canManageRequirements || isSuperAdmin)) || showApprovalControls) && (
              <>
                {showApprovalControls ? (
                  <>
                    <span className="text-sm font-semibold text-accent mr-auto flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      {isPendingForOther ? 'Manual Override Approval' : 'Pending Your Approval'}
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
                        Save draft
                      </AppButton>
                      
                      {requirement.approval_status !== 'On Hold' && (
                        <AppButton
                          type="button"
                          variant="secondary"
                          onClick={() => handleAction('HOLD')}
                          leftIcon={<PauseCircle className="w-4 h-4" />}
                        >
                          Hold requirement
                        </AppButton>
                      )}

                      <AppButton
                        type="button"
                        variant="destructive"
                        onClick={() => handleAction('CANCEL')}
                        leftIcon={<XCircle className="w-4 h-4" />}
                      >
                        Reject requirement
                      </AppButton>

                      <AppButton
                        type="button"
                        variant="primary"
                        onClick={() => handleAction('ACCEPT')}
                        leftIcon={<CheckCircle className="w-4 h-4" />}
                      >
                        Accept & initiate approval
                      </AppButton>
                    </>
                  ) : null
                )}
              </>
            )}
          </div>
        )}
        
        {activeTab === 'approval' && (
          <div className="p-4 flex items-center justify-end gap-3">
            {showApprovalControls && (
              <>
                <span className="text-sm font-semibold text-accent mr-auto flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {isPendingForOther ? 'Manual Override Approval' : 'Pending Your Approval'}
                </span>
                <AppButton variant="secondary" onClick={() => submitApproval('Hold')} isLoading={savingApproval} leftIcon={<PauseCircle className="h-4 w-4"/>}>Hold</AppButton>
                <AppButton variant="destructive" onClick={() => submitApproval('Reject')} isLoading={savingApproval} leftIcon={<XCircle className="h-4 w-4"/>}>Reject</AppButton>
                <AppButton variant="primary" onClick={() => submitApproval('Approve')} isLoading={savingApproval} leftIcon={<CheckCircle className="h-4 w-4"/>}>Approve</AppButton>
              </>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete requirement"
        description="Are you sure you want to permanently delete this requirement? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        tone="danger"
      />

    </PageContainer>
  );
}

export default function RequirementAnalyzePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <React.Suspense fallback={<div className="flex h-[calc(100vh-100px)] items-center justify-center"><ChandakLoader size="lg" title="Loading requirement…" /></div>}>
      <RequirementAnalyzePageContent params={params} />
    </React.Suspense>
  );
}
