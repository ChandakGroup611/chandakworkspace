"use client";

import React, { useState, useEffect } from "react";
import { 
  X, 
  Check, 
  Calendar, 
  DollarSign, 
  User, 
  Building2, 
  Lock, 
  Paperclip, 
  AlertTriangle, 
  Loader2, 
  CheckCircle2,
  Zap,
  ShieldCheck,
  Users,
  Eye,
  Download,
  FileText,
  ArrowRight,
  ArrowLeft
} from "lucide-react";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { AppBadge } from "@/components/ui/AppBadge";
import { createClient } from "@/utils/supabase/client";
import { saveAMCEntity } from "@/lib/actions/amc-client";
import { toast } from "react-toastify";

interface AttachmentEntry {
  id: string;
  docName: string;
  file: File | null;
}

interface SubscriptionContractModalProps {
  /** "page": full-page create / edit screen; "modal": overlay. */
  variant?: "modal" | "page";
  isOpen: boolean;
  onClose: () => void;
  onSaved: (newRecordId?: string) => void;
  initialRecord?: any;
  vendors: any[];
  departments: any[];
  users: any[];
}

type SubModalStep = "details" | "billing" | "compliance";

export function SubscriptionContractModal({
  variant = "modal",
  isOpen,
  onClose,
  onSaved,
  initialRecord,
  vendors,
  departments,
  users
}: SubscriptionContractModalProps) {
  const supabase = createClient();
  const [activeStep, setActiveStep] = useState<SubModalStep>("details");
  // On the full-page form (/new, /edit) every section shows at once, with a live summary.
  const onePage = variant === "page";

  // Step 1: Details & Ownership
  const [softwareName, setSoftwareName] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [status, setStatus] = useState("Active");

  // Step 2: Plan & Commercials
  const [billingFrequency, setBillingFrequency] = useState("Yearly");
  const [totalCost, setTotalCost] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [autoRenewal, setAutoRenewal] = useState(false);
  const [notifyBeforeDays, setNotifyBeforeDays] = useState("30");

  // Seats
  const [totalLicenses, setTotalLicenses] = useState("");
  const [usedLicenses, setUsedLicenses] = useState("");

  // Step 3: Compliance & Security
  const [licenseKey, setLicenseKey] = useState("");
  const [dataClassification, setDataClassification] = useState("Internal");
  const [complianceStatus, setComplianceStatus] = useState<string[]>([]);
  const [dpaSigned, setDpaSigned] = useState(false);
  const [notes, setNotes] = useState("");

  // Attachments
  const [attachments, setAttachments] = useState<AttachmentEntry[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<any[]>([]);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Populate when editing
  useEffect(() => {
    if (initialRecord) {
      setSoftwareName(initialRecord.software_name || "");
      setVendorId(initialRecord.vendor_id || "");
      setDepartmentId(initialRecord.department_id || "");
      setAssignedTo(initialRecord.assigned_to || "");
      setStatus(initialRecord.status || "Active");
      setBillingFrequency(initialRecord.billing_frequency || "Yearly");
      setTotalCost(initialRecord.cost !== null && initialRecord.cost !== undefined ? String(initialRecord.cost) : "");
      setCurrency(initialRecord.currency || "INR");
      setPurchaseDate(initialRecord.purchase_date || "");
      setExpiryDate(initialRecord.expiry_date || "");
      setAutoRenewal(!!initialRecord.auto_renewal);
      setNotifyBeforeDays(initialRecord.notify_before_days ? String(initialRecord.notify_before_days) : "30");
      setTotalLicenses(initialRecord.total_licenses !== null && initialRecord.total_licenses !== undefined ? String(initialRecord.total_licenses) : "");
      setUsedLicenses(initialRecord.used_licenses !== null && initialRecord.used_licenses !== undefined ? String(initialRecord.used_licenses) : "");
      setLicenseKey(initialRecord.license_key || "");
      setDataClassification(initialRecord.data_classification || "Internal");
      setComplianceStatus(Array.isArray(initialRecord.compliance_status) ? initialRecord.compliance_status : []);
      setDpaSigned(!!initialRecord.dpa_signed);
      setNotes(initialRecord.notes || "");

      // Fetch existing files
      if (initialRecord.id) {
        supabase.storage
          .from("amc-attachments")
          .list(initialRecord.id)
          .then(({ data }) => setExistingAttachments(data || []));
      }
    } else {
      // Defaults for new subscription
      setSoftwareName("");
      setVendorId("");
      setDepartmentId("");
      setAssignedTo("");
      setStatus("Active");
      setBillingFrequency("Yearly");
      setTotalCost("");
      setCurrency("INR");
      setPurchaseDate(new Date().toISOString().split("T")[0]);
      setExpiryDate("");
      setAutoRenewal(false);
      setNotifyBeforeDays("30");
      setTotalLicenses("");
      setUsedLicenses("");
      setLicenseKey("");
      setDataClassification("Internal");
      setComplianceStatus([]);
      setDpaSigned(false);
      setNotes("");
      setAttachments([
        { id: "1", docName: "Purchase Order", file: null },
        { id: "2", docName: "Agreement", file: null }
      ]);
      setExistingAttachments([]);
    }
    setActiveStep("details");
    setErrorMsg(null);
  }, [initialRecord, isOpen, supabase]);

  if (!isOpen) return null;

  const handleAddAttachment = () => {
    setAttachments(prev => [
      ...prev,
      { id: Math.random().toString(36).substring(2, 9), docName: "Contract Document", file: null }
    ]);
  };

  const handleFileChange = (id: string, file: File | null) => {
    setAttachments(prev => prev.map(a => a.id === id ? { ...a, file } : a));
  };

  const handleDocNameChange = (id: string, docName: string) => {
    setAttachments(prev => prev.map(a => a.id === id ? { ...a, docName } : a));
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleToggleCompliance = (standard: string) => {
    setComplianceStatus(prev => 
      prev.includes(standard) ? prev.filter(s => s !== standard) : [...prev, standard]
    );
  };

  // Preview existing file
  const handleViewExistingAttachment = async (fileName: string) => {
    try {
      const filePath = initialRecord?.id ? `${initialRecord.id}/${fileName}` : fileName;
      const { data, error } = await supabase.storage.from("amc-attachments").createSignedUrl(filePath, 3600);
      if (error || !data?.signedUrl) throw error || new Error("Failed to get preview URL");
      window.open(data.signedUrl, "_blank");
    } catch (err: any) {
      toast.error("Could not open attachment: " + (err.message || "File not found"));
    }
  };

  const handleDownloadExistingAttachment = async (fileName: string) => {
    try {
      const filePath = initialRecord?.id ? `${initialRecord.id}/${fileName}` : fileName;
      const { data, error } = await supabase.storage.from("amc-attachments").download(filePath);
      if (error || !data) throw error || new Error("Failed to download file");
      const blobUrl = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      toast.error("Could not download attachment: " + (err.message || "File not found"));
    }
  };

  const costNum = parseFloat(totalCost) || 0;
  const totalLicNum = parseInt(totalLicenses) || 0;
  const usedLicNum = parseInt(usedLicenses) || 0;

  const costPerSeat = totalLicNum > 0 && costNum > 0 ? (costNum / totalLicNum).toFixed(2) : null;
  const monthlyBurn = costNum > 0
    ? (billingFrequency === "Monthly" ? costNum : parseFloat((costNum / 12).toFixed(2)))
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validation
    if (!softwareName.trim()) {
      setErrorMsg("Software / Tool Name is mandatory.");
      setActiveStep("details");
      return;
    }
    if (!vendorId) {
      setErrorMsg("Provider / Vendor is mandatory.");
      setActiveStep("details");
      return;
    }
    if (!departmentId) {
      setErrorMsg("Department is mandatory.");
      setActiveStep("details");
      return;
    }
    if (!assignedTo) {
      setErrorMsg("Subscription Owner is mandatory.");
      setActiveStep("details");
      return;
    }
    if (!purchaseDate) {
      setErrorMsg("Purchase / Start Date is mandatory.");
      setActiveStep("billing");
      return;
    }

    // Attachment validation (PO and Agreement)
    const isPoDoc = (type: string) => /purchase\s*order|po\b/i.test(type);
    const isAgreementDoc = (type: string) => /agreement|contract|sign\s*off|invoice/i.test(type);

    const allDocs = [
      ...attachments.filter(a => a.file).map(a => a.docName),
      ...existingAttachments.map(f => f.name)
    ];

    const hasPo = allDocs.some(isPoDoc);
    const hasAgreement = allDocs.some(isAgreementDoc);

    if (!hasPo || !hasAgreement) {
      setErrorMsg("Both Purchase Order (PO) and Agreement / Invoice documents are mandatory.");
      setActiveStep("compliance");
      return;
    }

    const payload = {
      software_name: softwareName.trim(),
      contract_type: "Subscription",
      vendor_id: vendorId,
      department_id: departmentId,
      assigned_to: assignedTo,
      status: status,
      billing_frequency: billingFrequency,
      cost: costNum,
      currency: currency,
      purchase_date: purchaseDate,
      expiry_date: expiryDate || null,
      auto_renewal: autoRenewal,
      notify_before_days: parseInt(notifyBeforeDays) || 30,
      total_licenses: totalLicNum || null,
      used_licenses: usedLicNum || null,
      cost_per_license: costPerSeat ? parseFloat(costPerSeat) : null,
      license_key: licenseKey || null,
      data_classification: dataClassification || null,
      compliance_status: complianceStatus,
      dpa_signed: dpaSigned,
      notes: notes,
      monthly_amortized_cost: monthlyBurn
    };

    setSaving(true);
    try {
      let recordId = initialRecord?.id;
      if (recordId) {
        const res = await saveAMCEntity("software_amc", payload, recordId);
        if (!res.success) throw new Error(res.error);
      } else {
        const res = await saveAMCEntity("software_amc", payload);
        if (!res.success) throw new Error(res.error);
        recordId = res.data?.id;
      }

      // Upload newly staged files
      if (recordId && attachments.length > 0) {
        for (const entry of attachments) {
          if (!entry.file) continue;
          const safeName = (entry.docName || "Document").replace(/[^a-zA-Z0-9 -]/g, "");
          const fileName = `${recordId}/[HEAD_${safeName}]_${Math.random().toString(36).substring(2, 8)}_${entry.file.name}`;
          await supabase.storage.from("amc-attachments").upload(fileName, entry.file);
        }
      }

      toast.success(initialRecord ? "Subscription updated successfully!" : "Subscription created successfully!");
      onSaved(recordId);
      onClose();
    } catch (err: any) {
      console.error("Save subscription error:", err);
      setErrorMsg(err.message || "Failed to save subscription.");
    } finally {
      setSaving(false);
    }
  };

  const stepsList: { id: SubModalStep; label: string; icon: any }[] = [
    { id: "details", label: "1. Tool & Ownership", icon: Zap },
    { id: "billing", label: "2. Plan, Billing & Seats", icon: DollarSign },
    { id: "compliance", label: "3. Compliance & Documents", icon: ShieldCheck }
  ];

  return (
    <div className={variant === "page" ? "w-full" : "fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-3 sm:p-5 bg-[var(--overlay)] animate-in fade-in duration-200"}>
      <div className={variant === "page" ? "relative w-full flex flex-col rounded-xl border border-border bg-surface shadow-xs" : "relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-xl overflow-hidden border border-border bg-surface shadow-2xl"}>
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 px-6 border-b shrink-0 border-border bg-elevated">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning-soft text-warning-text border border-warning-border">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                {initialRecord ? `Edit Subscription: ${initialRecord.software_name}` : "New Software Subscription"}
              </h2>
              <p className="text-xs text-muted">
                {initialRecord ? "Update recurring SaaS tool, seat allocations, and compliance in exact saved state." : "Track recurring SaaS tools, seat counts, and automatic renewal dates."}
              </p>
            </div>
          </div>
          {!onePage && (
          <AppButton 
            variant="ghost" 
            size="icon-sm"
            aria-label="Close subscription modal"
            onClick={onClose} 
            className="text-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </AppButton>
          )}
        </div>

        {/* Step Navigation Bar (modal only) */}
        <div className={onePage ? "hidden" : "border-b border-border bg-surface px-6"}>
          <div role="tablist" aria-label="Subscription Form Steps" className="flex max-w-full gap-2 overflow-x-auto hide-scrollbar py-2">
            {stepsList.map(step => {
              const isActive = activeStep === step.id;
              const Icon = step.icon;
              return (
                <AppButton
                  key={step.id}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveStep(step.id)}
                  className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    isActive
                      ? "bg-primary text-primary-contrast font-semibold shadow-xs hover:bg-primary"
                      : "text-muted hover:text-foreground hover:bg-surface-hover"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{step.label}</span>
                </AppButton>
              );
            })}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-danger-border bg-danger-soft p-3 text-xs text-danger-text">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: Details & Ownership */}
          {onePage && <h3 className="flex items-center gap-2 border-b border-border pb-2 pt-2 text-[16px] font-semibold text-heading">1. What is it</h3>}
          {(onePage || activeStep === "details") && (
            <div className="space-y-4 rounded-lg border border-border bg-sunken/30 p-4 animate-in fade-in duration-150">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-warning-text" /> Basics
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-foreground">
                    Name <span className="text-danger">*</span>
                  </label>
                  <AppInput
                    placeholder="e.g. Figma Enterprise, Slack, Zoom Pro, AWS Cloud"
                    value={softwareName}
                    onChange={(e) => setSoftwareName(e.target.value)}
                    className="h-9 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Provider / Vendor <span className="text-danger">*</span>
                  </label>
                  <select
                    value={vendorId}
                    onChange={(e) => setVendorId(e.target.value)}
                    className="h-9 w-full rounded-md border border-border bg-surface px-3 text-xs text-foreground outline-none"
                    required
                  >
                    <option value="">Select Vendor…</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.vendor_name || v.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Department <span className="text-danger">*</span>
                  </label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="h-9 w-full rounded-md border border-border bg-surface px-3 text-xs text-foreground outline-none"
                    required
                  >
                    <option value="">Select Department…</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name || d.department_name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Subscription Owner <span className="text-danger">*</span>
                  </label>
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="h-9 w-full rounded-md border border-border bg-surface px-3 text-xs text-foreground outline-none"
                    required
                  >
                    <option value="">Select Owner…</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="h-9 w-full rounded-md border border-border bg-surface px-3 text-xs text-foreground outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Trial">Trial / Evaluating</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Expired">Expired</option>
                    <option value="Terminated">Terminated / Cancelled</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Plan, Billing & Seats */}
          {onePage && <h3 className="flex items-center gap-2 border-b border-border pb-2 pt-2 text-[16px] font-semibold text-heading">2. Plan, cost and seats</h3>}
          {(onePage || activeStep === "billing") && (
            <div className="space-y-4 rounded-lg border border-border bg-sunken/30 p-4 animate-in fade-in duration-150">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                <DollarSign className="h-3.5 w-3.5 text-theme-icon" /> Plan, cost and seats
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Billing Frequency</label>
                  <select
                    value={billingFrequency}
                    onChange={(e) => setBillingFrequency(e.target.value)}
                    className="h-9 w-full rounded-md border border-border bg-surface px-3 text-xs text-foreground outline-none"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Half-Yearly">Half-Yearly</option>
                    <option value="Yearly">Annual / Yearly</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="h-9 w-full rounded-md border border-border bg-surface px-3 text-xs text-foreground outline-none"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Total Cost / Commitment
                  </label>
                  <AppInput
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={totalCost}
                    onChange={(e) => setTotalCost(e.target.value)}
                    className="h-9 text-xs tabular-nums"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Purchase / Start Date <span className="text-danger">*</span>
                  </label>
                  <AppInput
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="h-9 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Next Renewal / Expiry Date</label>
                  <AppInput
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Remind me before (days)</label>
                  <AppInput
                    type="number"
                    value={notifyBeforeDays}
                    onChange={(e) => setNotifyBeforeDays(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Total Licenses / Seats</label>
                  <AppInput
                    type="number"
                    placeholder="e.g. 50"
                    value={totalLicenses}
                    onChange={(e) => setTotalLicenses(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Assigned / Used Seats</label>
                  <AppInput
                    type="number"
                    placeholder="e.g. 35"
                    value={usedLicenses}
                    onChange={(e) => setUsedLicenses(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="flex items-center space-x-2 pt-6">
                  <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoRenewal}
                      onChange={(e) => setAutoRenewal(e.target.checked)}
                      className="rounded border-border text-primary"
                    />
                    <span>Renews automatically</span>
                  </label>
                </div>
              </div>

              {/* Dynamic Financial Overview */}
              {(costPerSeat || monthlyBurn) && (
                <div className="mt-3 p-3 rounded-lg border border-border bg-surface flex flex-wrap gap-4 text-xs">
                  {costPerSeat && (
                    <div className="flex items-center gap-1.5 text-muted">
                      <span>Cost per seat:</span>
                      <span className="font-mono font-semibold text-foreground">
                        {currency} {Number(costPerSeat).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {monthlyBurn && (
                    <div className="flex items-center gap-1.5 text-muted">
                      <span>Cost per month:</span>
                      <span className="font-mono font-semibold text-foreground">
                        {currency} {Number(monthlyBurn).toLocaleString()} / month
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Compliance & Documents */}
          {onePage && <h3 className="flex items-center gap-2 border-b border-border pb-2 pt-2 text-[16px] font-semibold text-heading">3. Security and documents</h3>}
          {(onePage || activeStep === "compliance") && (
            <div className="space-y-4 rounded-lg border border-border bg-sunken/30 p-4 animate-in fade-in duration-150">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-theme-icon" /> Security & Mandatory Documents
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">License Key / Account ID</label>
                  <AppInput
                    placeholder="License key or account identifier"
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Data Classification</label>
                  <select
                    value={dataClassification}
                    onChange={(e) => setDataClassification(e.target.value)}
                    className="h-9 w-full rounded-md border border-border bg-surface px-3 text-xs text-foreground outline-none"
                  >
                    <option value="Public">Public</option>
                    <option value="Internal">Internal (Standard)</option>
                    <option value="Confidential">Confidential</option>
                    <option value="Restricted">Restricted / PII</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Security Certifications & Compliance</label>
                <div className="flex flex-wrap gap-2">
                  {["SOC 2 Type II", "ISO 27001", "GDPR Compliant", "HIPAA"].map(standard => {
                    const isSelected = complianceStatus.includes(standard);
                    return (
                      <AppButton
                        key={standard}
                        type="button"
                        variant={isSelected ? "primary" : "outline"}
                        size="sm"
                        onClick={() => handleToggleCompliance(standard)}
                        className="text-xs h-7"
                      >
                        {standard}
                      </AppButton>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Operational Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Notes on seat reassignment policies, admin portals, or contract terms."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-md border border-border bg-surface p-2.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Attachments Section */}
              <div className="mt-4 pt-3 border-t border-border/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">Mandatory Documents (PO & Agreement / Invoice)</span>
                  <AppButton
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddAttachment}
                    leftIcon={<Paperclip className="h-3 w-3" />}
                    className="h-7 text-xs"
                  >
                    Add File
                  </AppButton>
                </div>

                <div className="space-y-2">
                  {attachments.map((entry) => (
                    <div key={entry.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface p-2.5">
                      <input
                        type="text"
                        placeholder="Document Title (e.g. Purchase Order, Invoice)"
                        value={entry.docName}
                        onChange={(e) => handleDocNameChange(entry.id, e.target.value)}
                        className="h-8 flex-1 rounded border border-border bg-surface px-2.5 text-xs text-foreground min-w-[160px]"
                      />
                      <input
                        type="file"
                        onChange={(e) => handleFileChange(entry.id, e.target.files?.[0] || null)}
                        className="text-xs text-muted file:mr-2 file:h-7 file:rounded file:border-0 file:bg-sunken file:px-2.5 file:text-xs file:font-semibold file:text-foreground"
                      />
                      {attachments.length > 2 && (
                        <AppButton
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleRemoveAttachment(entry.id)}
                          className="text-muted hover:text-danger-text"
                        >
                          <X className="h-3.5 w-3.5" />
                        </AppButton>
                      )}
                    </div>
                  ))}
                </div>

                {/* Existing Attachments with View & Download */}
                {existingAttachments.length > 0 && (
                  <div className="mt-3 pt-2">
                    <span className="text-[11.5px] font-semibold text-foreground block mb-2">Existing Uploaded Documents:</span>
                    <div className="space-y-2">
                      {existingAttachments.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-lg border border-border bg-surface text-xs">
                          <div className="flex items-center gap-2 truncate">
                            <FileText className="h-4 w-4 text-warning-text shrink-0" />
                            <span className="font-mono truncate">{file.name}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <AppButton
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewExistingAttachment(file.name)}
                              leftIcon={<Eye className="h-3 w-3" />}
                              className="h-6 px-2 text-[11px]"
                            >
                              View
                            </AppButton>
                            <AppButton
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadExistingAttachment(file.name)}
                              leftIcon={<Download className="h-3 w-3" />}
                              className="h-6 px-2 text-[11px]"
                            >
                              Download
                            </AppButton>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {onePage && (
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-sunken p-4 sm:grid-cols-4" aria-label="Summary">
              <div><div className="text-[12px] text-muted">Total cost</div><div className="text-[16px] font-bold tabular-nums text-heading">{currency} {(Number(totalCost) || 0).toLocaleString("en-IN")}</div></div>
              <div><div className="text-[12px] text-muted">Per seat</div><div className="text-[16px] font-bold tabular-nums text-heading">{Number(totalLicenses) > 0 ? `${currency} ${Math.round((Number(totalCost) || 0) / Number(totalLicenses)).toLocaleString("en-IN")}` : "—"}</div></div>
              <div><div className="text-[12px] text-muted">Owner reminded on</div><div className="text-[16px] font-bold text-heading">{expiryDate ? new Date(new Date(expiryDate).getTime() - (parseInt(notifyBeforeDays) || 30) * 86400000).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Set an end date"}</div></div>
              <div><div className="text-[12px] text-muted">Seats used</div><div className="text-[16px] font-bold text-heading">{Number(totalLicenses) > 0 ? `${Number(usedLicenses) || 0} of ${Number(totalLicenses)}` : "—"}</div></div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="flex items-center justify-between gap-3 pt-4 border-t border-border bg-surface">
            <div>
              {!onePage && activeStep !== "details" ? (
                <AppButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (activeStep === "compliance") setActiveStep("billing");
                    else if (activeStep === "billing") setActiveStep("details");
                  }}
                  leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}
                  className="text-xs"
                >
                  Back
                </AppButton>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <AppButton
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={saving}
                className="text-xs"
              >
                Cancel
              </AppButton>

              {!onePage && activeStep !== "compliance" ? (
                <AppButton
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (activeStep === "details") setActiveStep("billing");
                    else if (activeStep === "billing") setActiveStep("compliance");
                  }}
                  rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                  className="text-xs font-medium"
                >
                  Next
                </AppButton>
              ) : null}

              <AppButton
                type="submit"
                variant="primary"
                disabled={saving}
                leftIcon={saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                className="text-xs font-semibold"
              >
                {saving ? "Saving…" : initialRecord ? "Update Subscription" : "Create Subscription"}
              </AppButton>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
