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
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Boxes,
  Plus,
  Trash2,
  Eye,
  Download,
  CreditCard,
  Layers,
  ArrowRight,
  ArrowLeft,
  FileText
} from "lucide-react";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { AppBadge } from "@/components/ui/AppBadge";
import { CustomPaymentMilestoneManager, PaymentMilestone } from "@/components/amc/CustomPaymentMilestoneManager";
import { createClient } from "@/utils/supabase/client";
import { saveAMCEntity } from "@/lib/actions/amc-client";
import { toast } from "react-toastify";

interface AttachmentEntry {
  id: string;
  docName: string;
  file: File | null;
}

interface SolutionLineItem {
  id: string;
  resolutionName: string;
  remark: string;
  qty: number;
  rate: number;
  cgstPercent: number;
  cgstAmount: number;
  sgstPercent: number;
  sgstAmount: number;
  igstPercent: number;
  igstAmount: number;
  discount: number;
  netAmount: number;
  purchaseDate?: string;
  putToUseDate?: string;
  renewalPeriodType?: string;
  expiryDate?: string;
  customRenewalDate?: string;
  licenseKey?: string;
  isLineItemWise?: boolean;
  additionalApi?: string;
  additionalApiAmount?: number;
}

interface AMCContractModalProps {
  /** "page": full-page create / edit screen (routes /amc/contracts/new, /amc/contracts/[id]/edit); "modal": overlay. */
  variant?: "modal" | "page";
  isOpen: boolean;
  onClose: () => void;
  onSaved: (newRecordId?: string) => void;
  initialRecord?: any;
  vendors: any[];
  departments: any[];
  users: any[];
  masterCities?: any[];
}

type ModalStep = "details" | "commercials" | "sla" | "documents";

export function AMCContractModal({
  variant = "modal",
  isOpen,
  onClose,
  onSaved,
  initialRecord,
  vendors,
  departments,
  users,
  masterCities = []
}: AMCContractModalProps) {
  const supabase = createClient();
  const [activeStep, setActiveStep] = useState<ModalStep>("details");

  // Step 1: Basic & Vendor Information
  const [softwareName, setSoftwareName] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [contractType, setContractType] = useState("AMC");
  const [status, setStatus] = useState("Active");

  // Vendor Profile Quick Display & Editable Fields
  const [showVendorDetails, setShowVendorDetails] = useState(false);
  const [vendorContactName, setVendorContactName] = useState("");
  const [vendorContactEmail, setVendorContactEmail] = useState("");
  const [vendorContactPhone, setVendorContactPhone] = useState("");
  const [taxGstNumber, setTaxGstNumber] = useState("");
  const [taxPanNumber, setTaxPanNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountNo, setBankAccountNo] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");

  // Step 2: Commercials & Line Items
  const [purchaseDate, setPurchaseDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [putToUseDate, setPutToUseDate] = useState("");
  const [renewalPeriodType, setRenewalPeriodType] = useState("Yearly");
  const [poNumber, setPoNumber] = useState("");
  const [poDate, setPoDate] = useState("");
  const [cost, setCost] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [costCenterId, setCostCenterId] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [paymentTermsCustomType, setPaymentTermsCustomType] = useState<'percent_wise' | 'phase_wise'>('phase_wise');
  const [paymentMilestones, setPaymentMilestones] = useState<PaymentMilestone[]>([]);
  const [isLineItemWise, setIsLineItemWise] = useState(false);
  const [solutionLineItems, setSolutionLineItems] = useState<SolutionLineItem[]>([]);
  const [additionalApi, setAdditionalApi] = useState("");
  const [additionalApiAmount, setAdditionalApiAmount] = useState("");

  // Step 3: SLA & Support
  const [supportTier, setSupportTier] = useState("Standard");
  const [slaUptime, setSlaUptime] = useState("99.5");
  const [slaTat, setSlaTat] = useState("4 Hours");
  const [specifications, setSpecifications] = useState("");
  const [notes, setNotes] = useState("");

  // Step 4: Attachments
  const [attachments, setAttachments] = useState<AttachmentEntry[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<any[]>([]);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync vendor contact when vendor is selected
  useEffect(() => {
    if (vendorId) {
      const v = vendors.find(x => x.id === vendorId);
      if (v) {
        if (!vendorContactName) setVendorContactName(v.contact_person || v.contact_name || "");
        if (!vendorContactEmail) setVendorContactEmail(v.email || "");
        if (!vendorContactPhone) setVendorContactPhone(v.phone || v.mobile || "");
        if (!taxGstNumber) setTaxGstNumber(v.gst_number || "");
        if (!taxPanNumber) setTaxPanNumber(v.pan_number || "");
      }
    }
  }, [vendorId, vendors]);

  // Populate when editing or initializing
  useEffect(() => {
    if (initialRecord) {
      setSoftwareName(initialRecord.software_name || "");
      setVendorId(initialRecord.vendor_id || "");
      setDepartmentId(initialRecord.department_id || "");
      setAssignedTo(initialRecord.assigned_to || "");
      setContractType(initialRecord.contract_type || "AMC");
      setStatus(initialRecord.status || "Active");

      const contact = initialRecord.vendor_contact_json || {};
      setVendorContactName(contact.name || "");
      setVendorContactEmail(contact.email || "");
      setVendorContactPhone(contact.phone || "");

      const taxation = initialRecord.taxation_json || {};
      setTaxGstNumber(taxation.gstNumber || "");
      setTaxPanNumber(taxation.panNumber || "");

      const bank = initialRecord.bank_details_json || {};
      setBankName(bank.bankName || "");
      setBankAccountNo(bank.accountNo || "");
      setBankIfsc(bank.ifsc || "");

      setPurchaseDate(initialRecord.purchase_date || "");
      setExpiryDate(initialRecord.expiry_date || "");
      setPutToUseDate(initialRecord.put_to_use_date || "");
      setRenewalPeriodType(initialRecord.renewal_period_type || "Yearly");
      setPoNumber(initialRecord.po_number || "");
      setPoDate(initialRecord.po_date || "");
      setCost(initialRecord.cost !== null && initialRecord.cost !== undefined ? String(initialRecord.cost) : "");
      setCurrency(initialRecord.currency || "INR");
      setCostCenterId(initialRecord.cost_center_id || "");
      setPaymentTerms(initialRecord.payment_terms || "");
      setSupportTier(initialRecord.support_tier || "Standard");
      setSlaUptime(initialRecord.sla_uptime !== null && initialRecord.sla_uptime !== undefined ? String(initialRecord.sla_uptime) : "99.5");
      setSlaTat(initialRecord.sla_tat || "4 Hours");
      setSpecifications(initialRecord.specifications || "");
      setNotes(initialRecord.notes || "");

      setAdditionalApi(initialRecord.additional_api || "");
      setAdditionalApiAmount(initialRecord.additional_api_amount !== null && initialRecord.additional_api_amount !== undefined ? String(initialRecord.additional_api_amount) : "");

      const pTerms = initialRecord.payment_terms_json;
      if (pTerms) {
        if (pTerms.customType) setPaymentTermsCustomType(pTerms.customType);
        if (Array.isArray(pTerms.milestones)) setPaymentMilestones(pTerms.milestones);
      } else {
        setPaymentMilestones([]);
      }

      const rawItems = Array.isArray(initialRecord.solution_line_items) ? initialRecord.solution_line_items : [];
      setSolutionLineItems(rawItems);
      setIsLineItemWise(initialRecord.is_line_item_wise ?? (rawItems.length > 0 && rawItems.some((i: any) => i.isLineItemWise)));

      // Fetch existing files
      if (initialRecord.id) {
        supabase.storage
          .from("amc-attachments")
          .list(initialRecord.id)
          .then(({ data }) => setExistingAttachments(data || []));
      }
    } else {
      // Defaults for new AMC
      setSoftwareName("");
      setVendorId("");
      setDepartmentId("");
      setAssignedTo("");
      setContractType("AMC");
      setStatus("Active");
      setVendorContactName("");
      setVendorContactEmail("");
      setVendorContactPhone("");
      setTaxGstNumber("");
      setTaxPanNumber("");
      setBankName("");
      setBankAccountNo("");
      setBankIfsc("");
      setPurchaseDate(new Date().toISOString().split("T")[0]);
      setExpiryDate("");
      setPutToUseDate("");
      setRenewalPeriodType("Yearly");
      setPoNumber("");
      setPoDate("");
      setCost("");
      setCurrency("INR");
      setCostCenterId("");
      setPaymentTerms("");
      setPaymentMilestones([]);
      setSupportTier("Standard");
      setSlaUptime("99.5");
      setSlaTat("4 Hours");
      setSpecifications("");
      setNotes("");
      setSolutionLineItems([]);
      setIsLineItemWise(false);
      setAdditionalApi("");
      setAdditionalApiAmount("");
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

  // Add line item
  const handleAddLineItem = () => {
    const newItem: SolutionLineItem = {
      id: Math.random().toString(36).substring(2, 9),
      resolutionName: `Resolution Item #${solutionLineItems.length + 1}`,
      remark: "",
      qty: 1,
      rate: 0,
      cgstPercent: 0,
      cgstAmount: 0,
      sgstPercent: 0,
      sgstAmount: 0,
      igstPercent: 0,
      igstAmount: 0,
      discount: 0,
      netAmount: 0,
      purchaseDate: purchaseDate,
      isLineItemWise: true
    };
    setSolutionLineItems(prev => [...prev, newItem]);
    setIsLineItemWise(true);
  };

  const handleUpdateLineItem = (id: string, field: keyof SolutionLineItem, val: any) => {
    setSolutionLineItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: val };
        const qty = parseFloat(String(updated.qty)) || 0;
        const rate = parseFloat(String(updated.rate)) || 0;
        const base = qty * rate;
        const discount = parseFloat(String(updated.discount)) || 0;
        const taxable = Math.max(0, base - discount);
        const cgst = taxable * ((parseFloat(String(updated.cgstPercent)) || 0) / 100);
        const sgst = taxable * ((parseFloat(String(updated.sgstPercent)) || 0) / 100);
        const igst = taxable * ((parseFloat(String(updated.igstPercent)) || 0) / 100);
        updated.cgstAmount = parseFloat(cgst.toFixed(2));
        updated.sgstAmount = parseFloat(sgst.toFixed(2));
        updated.igstAmount = parseFloat(igst.toFixed(2));
        updated.netAmount = parseFloat((taxable + cgst + sgst + igst).toFixed(2));
        return updated;
      }
      return item;
    }));
  };

  const handleRemoveLineItem = (id: string) => {
    setSolutionLineItems(prev => prev.filter(item => item.id !== id));
  };

  const computedTotalCost = isLineItemWise && solutionLineItems.length > 0
    ? solutionLineItems.reduce((sum, i) => sum + (Number(i.netAmount) || 0), 0).toFixed(2)
    : cost;

  // Milestone manager handlers
  const handleAddMilestone = () => {
    const newM: PaymentMilestone = {
      id: Math.random().toString(36).substring(2, 9),
      phaseName: `Milestone Phase ${paymentMilestones.length + 1}`,
      percentage: 0,
      amount: 0,
      amountReleased: 0,
      status: 'Pending',
      targetDate: ''
    };
    setPaymentMilestones(prev => [...prev, newM]);
  };

  const handleUpdateMilestone = (id: string, field: keyof PaymentMilestone, value: any) => {
    setPaymentMilestones(prev => prev.map(m => {
      if (m.id === id) {
        const updated = { ...m, [field]: value };
        const baseAmt = parseFloat(computedTotalCost) || 0;
        if (field === 'percentage' && baseAmt > 0) {
          updated.amount = parseFloat(((baseAmt * (parseFloat(value) || 0)) / 100).toFixed(2));
        } else if (field === 'amount' && baseAmt > 0) {
          updated.percentage = parseFloat((((parseFloat(value) || 0) / baseAmt) * 100).toFixed(2));
        }
        return updated;
      }
      return m;
    }));
  };

  const handleRemoveMilestone = (id: string) => {
    setPaymentMilestones(prev => prev.filter(m => m.id !== id));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Core Validations
    if (!softwareName.trim()) { setErrorMsg("Contract / System Name is mandatory."); setActiveStep("details"); return; }
    if (!vendorId) { setErrorMsg("Provider / Vendor is mandatory."); setActiveStep("details"); return; }
    if (!departmentId) { setErrorMsg("Department is mandatory."); setActiveStep("details"); return; }
    if (!assignedTo) { setErrorMsg("Assigned Owner is mandatory."); setActiveStep("details"); return; }
    if (!purchaseDate) { setErrorMsg("Purchase / Start Date is mandatory."); setActiveStep("commercials"); return; }

    // Contact details fallback validation
    if (!vendorContactName.trim()) {
      setErrorMsg("Vendor Contact Name is mandatory.");
      setActiveStep("details");
      return;
    }
    if (!vendorContactEmail.trim()) {
      setErrorMsg("Vendor Contact Email is mandatory.");
      setActiveStep("details");
      return;
    }

    // Attachment validation (PO and Agreement)
    const isPoDoc = (type: string) => /purchase\s*order|po\b/i.test(type);
    const isAgreementDoc = (type: string) => /agreement|contract|sign\s*off/i.test(type);

    const allDocs = [
      ...attachments.filter(a => a.file).map(a => a.docName),
      ...existingAttachments.map(f => f.name)
    ];

    const hasPo = allDocs.some(isPoDoc);
    const hasAgreement = allDocs.some(isAgreementDoc);

    if (!hasPo || !hasAgreement) {
      setErrorMsg("Both Purchase Order (PO) and signed Agreement documents are mandatory.");
      setActiveStep("documents");
      return;
    }

    const finalCostNum = parseFloat(computedTotalCost) || 0;

    const payload = {
      software_name: softwareName.trim(),
      solution_name: solutionLineItems.map(i => i.resolutionName).filter(Boolean).join(", ") || null,
      contract_type: contractType,
      vendor_id: vendorId,
      department_id: departmentId,
      assigned_to: assignedTo,
      status: status,
      purchase_date: purchaseDate,
      expiry_date: expiryDate || null,
      put_to_use_date: putToUseDate || null,
      renewal_period_type: renewalPeriodType || null,
      po_number: poNumber || null,
      po_date: poDate || null,
      cost: finalCostNum,
      currency: currency,
      cost_center_id: costCenterId || null,
      payment_terms: paymentTerms || null,
      payment_terms_json: {
        customType: paymentTermsCustomType,
        milestones: paymentMilestones
      },
      support_tier: supportTier || null,
      sla_uptime: parseFloat(slaUptime) || null,
      sla_tat: slaTat || null,
      specifications: specifications || null,
      notes: notes,
      is_line_item_wise: isLineItemWise,
      additional_api: additionalApi || null,
      additional_api_amount: additionalApiAmount ? parseFloat(additionalApiAmount) : null,
      solution_line_items: solutionLineItems.map(item => ({ ...item, isLineItemWise })),
      vendor_contact_json: {
        name: vendorContactName,
        email: vendorContactEmail,
        phone: vendorContactPhone
      },
      taxation_json: {
        gstNumber: taxGstNumber,
        panNumber: taxPanNumber
      },
      bank_details_json: {
        bankName,
        accountNo: bankAccountNo,
        ifsc: bankIfsc
      }
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

      toast.success(initialRecord ? "AMC contract updated successfully!" : "AMC contract created successfully!");
      onSaved(recordId);
      onClose();
    } catch (err: any) {
      console.error("Save AMC error:", err);
      setErrorMsg(err.message || "Failed to save contract.");
    } finally {
      setSaving(false);
    }
  };

  const stepsList: { id: ModalStep; label: string; icon: any }[] = [
    { id: "details", label: "1. Details & Vendor", icon: ShieldCheck },
    { id: "commercials", label: "2. Commercials & Line Items", icon: DollarSign },
    { id: "sla", label: "3. SLAs & Scope", icon: Boxes },
    { id: "documents", label: "4. Documents & Review", icon: Paperclip }
  ];

  return (
    <div className={variant === "page" ? "w-full" : "fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-3 sm:p-5 bg-[var(--overlay)] animate-in fade-in duration-200"}>
      <div className={variant === "page" ? "relative w-full flex flex-col rounded-xl border border-border bg-surface shadow-xs" : "relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-xl overflow-hidden border border-border bg-surface shadow-2xl"}>
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 px-6 border-b shrink-0 border-border bg-elevated">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                {initialRecord ? `Edit AMC Contract: ${initialRecord.software_name}` : "New Annual Maintenance Contract (AMC)"}
              </h2>
              <p className="text-xs text-muted">
                {initialRecord ? "Update contract details, line items, and commercials in the exact saved state." : "Register enterprise agreements, SLAs, itemwise solutions, and payment terms."}
              </p>
            </div>
          </div>
          <AppButton 
            variant="ghost" 
            size="icon-sm"
            aria-label="Close AMC modal"
            onClick={onClose} 
            className="text-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </AppButton>
        </div>

        {/* Step Navigation Bar */}
        <div className="border-b border-border bg-surface px-6">
          <div role="tablist" aria-label="AMC Form Steps" className="flex max-w-full gap-2 overflow-x-auto hide-scrollbar py-2">
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

          {/* STEP 1: Details & Vendor Profile */}
          {activeStep === "details" && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="space-y-4 rounded-lg border border-border bg-sunken/30 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-theme-icon" /> Contract Identification
                  </h3>
                  <AppButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowVendorDetails(prev => !prev)}
                    className="h-7 text-xs text-accent-soft-text gap-1"
                  >
                    {showVendorDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {showVendorDetails ? "Hide Vendor Profile" : "Show Full Vendor Profile"}
                  </AppButton>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-semibold text-foreground">
                      Contract / Software System Name <span className="text-danger">*</span>
                    </label>
                    <AppInput
                      placeholder="e.g. SAP ERP Enterprise AMC, Data Center Network AMC"
                      value={softwareName}
                      onChange={(e) => setSoftwareName(e.target.value)}
                      className="h-9 text-xs"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Vendor / Provider <span className="text-danger">*</span>
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
                      Contract Owner / Manager <span className="text-danger">*</span>
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
                      <option value="Draft">Draft</option>
                      <option value="Under Review">Under Review</option>
                      <option value="Expired">Expired</option>
                      <option value="Terminated">Terminated</option>
                    </select>
                  </div>
                </div>

                {/* Collapsible Vendor Profile (Contacts, Tax, Banking) */}
                {showVendorDetails && (
                  <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-muted">Contact Person *</label>
                      <AppInput
                        value={vendorContactName}
                        onChange={(e) => setVendorContactName(e.target.value)}
                        className="h-8 text-xs"
                        placeholder="Contact name"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-muted">Contact Email *</label>
                      <AppInput
                        type="email"
                        value={vendorContactEmail}
                        onChange={(e) => setVendorContactEmail(e.target.value)}
                        className="h-8 text-xs"
                        placeholder="Email"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-muted">Contact Phone</label>
                      <AppInput
                        value={vendorContactPhone}
                        onChange={(e) => setVendorContactPhone(e.target.value)}
                        className="h-8 text-xs"
                        placeholder="Phone"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-muted">GST Number</label>
                      <AppInput
                        value={taxGstNumber}
                        onChange={(e) => setTaxGstNumber(e.target.value)}
                        className="h-8 text-xs font-mono"
                        placeholder="GSTIN"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-muted">PAN Number</label>
                      <AppInput
                        value={taxPanNumber}
                        onChange={(e) => setTaxPanNumber(e.target.value)}
                        className="h-8 text-xs font-mono"
                        placeholder="PAN"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-muted">Bank IFSC</label>
                      <AppInput
                        value={bankIfsc}
                        onChange={(e) => setBankIfsc(e.target.value)}
                        className="h-8 text-xs font-mono"
                        placeholder="IFSC"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: Commercials & Line-Item Transactions */}
          {activeStep === "commercials" && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="space-y-4 rounded-lg border border-border bg-sunken/30 p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                  <DollarSign className="h-3.5 w-3.5 text-theme-icon" /> Commercial Terms & Dates
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">PO Number</label>
                    <AppInput
                      placeholder="e.g. PO-2026-0891"
                      value={poNumber}
                      onChange={(e) => setPoNumber(e.target.value)}
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">PO Date</label>
                    <AppInput
                      type="date"
                      value={poDate}
                      onChange={(e) => setPoDate(e.target.value)}
                      className="h-9 text-xs"
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
                    <label className="text-xs font-semibold text-foreground">Put to Use Date</label>
                    <AppInput
                      type="date"
                      value={putToUseDate}
                      onChange={(e) => setPutToUseDate(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Expiry Date</label>
                    <AppInput
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Renewal Duration</label>
                    <select
                      value={renewalPeriodType}
                      onChange={(e) => setRenewalPeriodType(e.target.value)}
                      className="h-9 w-full rounded-md border border-border bg-surface px-3 text-xs text-foreground outline-none"
                    >
                      <option value="Yearly">1 Year (Annual)</option>
                      <option value="Half-Yearly">6 Months</option>
                      <option value="Quarterly">3 Months</option>
                      <option value="Multi-Year">Multi-Year (Custom)</option>
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

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-semibold text-foreground">
                      Total Contract Value {isLineItemWise && "(Derived from Line Items)"}
                    </label>
                    <AppInput
                      type="number"
                      step="0.01"
                      placeholder="Total contract value"
                      value={computedTotalCost}
                      disabled={isLineItemWise}
                      onChange={(e) => setCost(e.target.value)}
                      className="h-9 text-xs tabular-nums font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Itemwise Solution Transactions */}
              <div className="space-y-4 rounded-lg border border-border bg-sunken/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                      <Boxes className="h-3.5 w-3.5 text-theme-icon" /> Solution Line-Items / Transactions
                    </h3>
                    <label className="flex items-center gap-1.5 text-xs text-foreground cursor-pointer ml-3 bg-surface px-2.5 py-1 rounded border border-border">
                      <input
                        type="checkbox"
                        checked={isLineItemWise}
                        onChange={(e) => setIsLineItemWise(e.target.checked)}
                        className="rounded border-border text-primary"
                      />
                      <span className="font-medium">Enable Line-Item Wise Pricing</span>
                    </label>
                  </div>
                  <AppButton
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddLineItem}
                    leftIcon={<Plus className="h-3.5 w-3.5" />}
                    className="h-7 text-xs"
                  >
                    Add Line Item
                  </AppButton>
                </div>

                {solutionLineItems.length > 0 ? (
                  <div className="space-y-3">
                    {solutionLineItems.map((item, idx) => (
                      <div key={item.id} className="p-3 rounded-lg border border-border bg-surface space-y-2.5 shadow-2xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-mono text-muted">Item #{idx + 1}</span>
                          <AppButton
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleRemoveLineItem(item.id)}
                            className="text-muted hover:text-danger-text"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </AppButton>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs items-center">
                          <div className="sm:col-span-5 space-y-1">
                            <label className="text-[11px] text-muted">Resolution / Item Name *</label>
                            <AppInput
                              placeholder="Item name"
                              value={item.resolutionName}
                              onChange={(e) => handleUpdateLineItem(item.id, "resolutionName", e.target.value)}
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="sm:col-span-2 space-y-1">
                            <label className="text-[11px] text-muted">Qty</label>
                            <AppInput
                              type="number"
                              placeholder="1"
                              value={item.qty}
                              onChange={(e) => handleUpdateLineItem(item.id, "qty", e.target.value)}
                              className="h-8 text-xs tabular-nums"
                            />
                          </div>
                          <div className="sm:col-span-2 space-y-1">
                            <label className="text-[11px] text-muted">Rate ({currency})</label>
                            <AppInput
                              type="number"
                              placeholder="Rate"
                              value={item.rate}
                              onChange={(e) => handleUpdateLineItem(item.id, "rate", e.target.value)}
                              className="h-8 text-xs tabular-nums"
                            />
                          </div>
                          <div className="sm:col-span-3 space-y-1 text-right">
                            <label className="text-[11px] text-muted">Net Amount</label>
                            <div className="h-8 flex items-center justify-end font-mono font-semibold text-foreground">
                              {currency} {Number(item.netAmount || 0).toLocaleString()}
                            </div>
                          </div>
                        </div>

                        {/* Tax Row */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/40 text-[11px]">
                          <div>
                            <span className="text-muted">Discount:</span>
                            <AppInput
                              type="number"
                              placeholder="0"
                              value={item.discount || ""}
                              onChange={(e) => handleUpdateLineItem(item.id, "discount", e.target.value)}
                              className="h-7 text-xs mt-0.5 tabular-nums"
                            />
                          </div>
                          <div>
                            <span className="text-muted">CGST %:</span>
                            <AppInput
                              type="number"
                              placeholder="9"
                              value={item.cgstPercent || ""}
                              onChange={(e) => handleUpdateLineItem(item.id, "cgstPercent", e.target.value)}
                              className="h-7 text-xs mt-0.5 tabular-nums"
                            />
                          </div>
                          <div>
                            <span className="text-muted">SGST %:</span>
                            <AppInput
                              type="number"
                              placeholder="9"
                              value={item.sgstPercent || ""}
                              onChange={(e) => handleUpdateLineItem(item.id, "sgstPercent", e.target.value)}
                              className="h-7 text-xs mt-0.5 tabular-nums"
                            />
                          </div>
                          <div>
                            <span className="text-muted">IGST %:</span>
                            <AppInput
                              type="number"
                              placeholder="18"
                              value={item.igstPercent || ""}
                              onChange={(e) => handleUpdateLineItem(item.id, "igstPercent", e.target.value)}
                              className="h-7 text-xs mt-0.5 tabular-nums"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted">No line items configured. Contract is billed at lump-sum total.</p>
                )}
              </div>

              {/* Payment Schedule Milestones */}
              <div className="space-y-4 rounded-lg border border-border bg-sunken/30 p-4">
                <CustomPaymentMilestoneManager
                  customType={paymentTermsCustomType}
                  onCustomTypeChange={setPaymentTermsCustomType}
                  milestones={paymentMilestones}
                  onAddMilestone={handleAddMilestone}
                  onUpdateMilestone={handleUpdateMilestone}
                  onRemoveMilestone={handleRemoveMilestone}
                  totalBaseAmount={parseFloat(computedTotalCost) || 0}
                  currencySymbol={currency === "USD" ? "$" : currency === "EUR" ? "€" : "₹"}
                />
              </div>
            </div>
          )}

          {/* STEP 3: SLAs & Service Levels */}
          {activeStep === "sla" && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="space-y-4 rounded-lg border border-border bg-sunken/30 p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                  <Boxes className="h-3.5 w-3.5 text-theme-icon" /> Service Level Commitments
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Support Tier</label>
                    <select
                      value={supportTier}
                      onChange={(e) => setSupportTier(e.target.value)}
                      className="h-9 w-full rounded-md border border-border bg-surface px-3 text-xs text-foreground outline-none"
                    >
                      <option value="Standard">Standard (9x5)</option>
                      <option value="Silver">Silver</option>
                      <option value="Gold">Gold</option>
                      <option value="24x7 Platinum">24x7 Platinum</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">SLA Uptime (%)</label>
                    <AppInput
                      type="number"
                      step="0.1"
                      value={slaUptime}
                      onChange={(e) => setSlaUptime(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Ticket TAT / Resolution</label>
                    <AppInput
                      placeholder="e.g. 4 Hours"
                      value={slaTat}
                      onChange={(e) => setSlaTat(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Scope Specifications & SLAs</label>
                  <textarea
                    rows={3}
                    placeholder="Describe maintenance scope, preventative maintenance visits, and escalation matrix."
                    value={specifications}
                    onChange={(e) => setSpecifications(e.target.value)}
                    className="w-full rounded-md border border-border bg-surface p-2.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Operational Notes</label>
                  <textarea
                    rows={2}
                    placeholder="General operational notes or internal vendor review remarks."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-md border border-border bg-surface p-2.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Mandatory Documents & Review */}
          {activeStep === "documents" && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="space-y-4 rounded-lg border border-border bg-sunken/30 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                    <Paperclip className="h-3.5 w-3.5 text-theme-icon" /> Mandatory Documents (PO & Agreement)
                  </h3>
                  <AppButton
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddAttachment}
                    leftIcon={<Plus className="h-3.5 w-3.5" />}
                    className="h-7 text-xs"
                  >
                    Add File
                  </AppButton>
                </div>

                <p className="text-[11.5px] text-muted">
                  Attach official Purchase Order (PO) and signed Agreement documents. Both are mandatory for governance compliance.
                </p>

                <div className="space-y-2">
                  {attachments.map((entry) => (
                    <div key={entry.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface p-2.5">
                      <input
                        type="text"
                        placeholder="Document Title (e.g. Purchase Order, Agreement)"
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
                  <div className="mt-4 pt-3 border-t border-border/40">
                    <span className="text-[11.5px] font-semibold text-foreground block mb-2">Existing Uploaded Documents:</span>
                    <div className="space-y-2">
                      {existingAttachments.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-lg border border-border bg-surface text-xs">
                          <div className="flex items-center gap-2 truncate">
                            <FileText className="h-4 w-4 text-primary shrink-0" />
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

          {/* Modal Footer */}
          <div className="flex items-center justify-between gap-3 pt-4 border-t border-border bg-surface">
            <div>
              {activeStep !== "details" ? (
                <AppButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (activeStep === "documents") setActiveStep("sla");
                    else if (activeStep === "sla") setActiveStep("commercials");
                    else if (activeStep === "commercials") setActiveStep("details");
                  }}
                  leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}
                  className="text-xs"
                >
                  Previous Step
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

              {activeStep !== "documents" ? (
                <AppButton
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (activeStep === "details") setActiveStep("commercials");
                    else if (activeStep === "commercials") setActiveStep("sla");
                    else if (activeStep === "sla") setActiveStep("documents");
                  }}
                  rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                  className="text-xs font-medium"
                >
                  Next Step
                </AppButton>
              ) : null}

              <AppButton
                type="submit"
                variant="primary"
                disabled={saving}
                leftIcon={saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                className="text-xs font-semibold"
              >
                {saving ? "Saving…" : initialRecord ? "Update AMC Contract" : "Create AMC Contract"}
              </AppButton>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
