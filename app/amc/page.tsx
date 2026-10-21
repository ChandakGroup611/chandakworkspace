/* eslint-disable */
"use client";
import { toast } from 'react-toastify';

import React, { useState, useEffect } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { AppBadge } from "@/components/ui/AppBadge";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { useTheme } from "@/components/theme/ThemeProvider";
import { usePermissions } from "@/hooks/usePermissions";
import { AMCHistoryModal } from "@/components/amc/AMCHistoryModal";
import { AMCTransactionsTab } from "@/components/amc/AMCTransactionsTab";
import { AMCRenewalsTab } from "@/components/amc/AMCRenewalsTab";
import { AMCAllocationsTab } from "@/components/amc/AMCAllocationsTab";
import { AMCAttachmentsTab } from "@/components/amc/AMCAttachmentsTab";
import { AMCPaymentsTab } from "@/components/amc/AMCPaymentsTab";
import { AMCImplementationTab } from "@/components/amc/AMCImplementationTab";
import { AMCTCOSpendHistoryTab } from "@/components/amc/AMCTCOSpendHistoryTab";
import { AMCExecutiveDashboard } from "@/components/amc/AMCExecutiveDashboard";
import { CustomPaymentMilestoneManager, PaymentMilestone } from "@/components/amc/CustomPaymentMilestoneManager";
import { createClient } from "@/utils/supabase/client";
import { saveAMCEntity, deleteAMCEntity } from "@/lib/actions/amc-client";
import { saveMasterEntity } from "@/lib/actions/masters";
import { FormMultiSelect } from "@/components/ui/FormMultiSelect";
import { formatDate, formatDateTime } from "@/components/ui/data";
import { EmptyState } from "@/components/ui/feedback/States";
import { MasterOptionsManager } from "@/components/shared/MasterOptionsManager";
import Link from "next/link";
import ChandakLoader from "@/components/ui/ChandakLoader";
import { 
  ShieldCheck, 
  Plus, 
  RefreshCw, 
  AlertTriangle, 
  X, 
  CheckCircle2, 
  Lock, 
  Edit, 
  Trash2, 
  Calendar, 
  DollarSign, 
  User, 
  Users, 
  Paperclip, 
  Download, 
  Loader2, 
  Clock, 
  Eye, 
  EyeOff, 
  BarChart2, 
  BarChart3,
  PieChart, 
  Check, 
  Settings,
  Building2,
  ChevronDown,
  ChevronUp,
  FileText,
  Layers,
  Boxes,
  ClipboardCheck,
  FileCheck,
  Sparkles,
  TrendingUp,
  Star
} from "lucide-react";
import { AppTable, AppTableHeader, AppTableBody, AppTableRow, AppTableHead, AppTableCell } from "@/components/ui/AppTable";


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
  paymentTerms?: string;
  paymentTermsCustomType?: 'percent_wise' | 'phase_wise';
  paymentMilestones?: PaymentMilestone[];
}

export default function AMCPage() {
  const supabase = createClient();
  const { hasPermission, loading: permsLoading, roleCode } = usePermissions();
  let isLightMode = false;
  try {
    const themeCtx = useTheme();
    isLightMode = themeCtx.isLight;
  } catch (e) {}

  const [records, setRecords] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [masterContractTypes, setMasterContractTypes] = useState<string[]>(['AMC', 'Subscription', 'Perpetual License', 'Other']);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [errorAlert, setErrorAlert] = useState<string | null>(null);
  const [successAlert, setSuccessAlert] = useState<string | null>(null);
  const [amcData, setAmcData] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [editRecordId, setEditRecordId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("Master");
  const [viewMode, setViewMode] = useState<'dashboard' | 'table'>('dashboard');
  const [mounted, setMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showVendorDetails, setShowVendorDetails] = useState(false);
  
  // Phase 1 Fields
  const [formSoftwareName, setFormSoftwareName] = useState("");
  const [formVendorId, setFormVendorId] = useState("");
  const [formContractType, setFormContractType] = useState("AMC");
  const [formPurchaseDate, setFormPurchaseDate] = useState("");
  const [formExpiryDate, setFormExpiryDate] = useState("");
  const [formCost, setFormCost] = useState("");
  const [formAssignedTo, setFormAssignedTo] = useState("");
  const [formDepartmentId, setFormDepartmentId] = useState("");
  const [formStatus, setFormStatus] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const [formCurrency, setFormCurrency] = useState("INR");
  const [formTotalLicenses, setFormTotalLicenses] = useState("");
  const [formUsedLicenses, setFormUsedLicenses] = useState("");
  const [formCostPerLicense, setFormCostPerLicense] = useState("");
  const [formPaymentTerms, setFormPaymentTerms] = useState("");
  const [formPaymentTermsCustomType, setFormPaymentTermsCustomType] = useState<'percent_wise' | 'phase_wise'>('phase_wise');
  const [formPaymentMilestones, setFormPaymentMilestones] = useState<PaymentMilestone[]>([]);
  const [formSupportTier, setFormSupportTier] = useState("");
  const [formSlaUptime, setFormSlaUptime] = useState("");
  const [formSlaTat, setFormSlaTat] = useState("");
  const [formCostCenterId, setFormCostCenterId] = useState("");
  const [formNotifyBeforeDays, setFormNotifyBeforeDays] = useState("30");

  const [formDataClassification, setFormDataClassification] = useState("");
  const [formComplianceStatus, setFormComplianceStatus] = useState<string[]>([]);
  const [formInfosecApprovedDate, setFormInfosecApprovedDate] = useState("");
  const [formDpaSigned, setFormDpaSigned] = useState(false);
  const [formDpaSignedDate, setFormDpaSignedDate] = useState("");

  // Enterprise Amortization, Risk & Vendor Evaluation States
  const [formVendorRating, setFormVendorRating] = useState("5.0");
  const [formVendorEvaluationNotes, setFormVendorEvaluationNotes] = useState("");
  const [formRiskLevel, setFormRiskLevel] = useState("Low");
  const [formSlaAdherencePercent, setFormSlaAdherencePercent] = useState("100.0");
  const [tableRiskFilter, setTableRiskFilter] = useState<'all' | 'active' | 'expiring30' | 'expiring60' | 'critical_high' | 'pending'>('all');


  const [revealedLicenseKeys, setRevealedLicenseKeys] = useState<Record<string, boolean>>({});
  const [revealLicenseModal, setRevealLicenseModal] = useState<{ show: boolean, lineItemId: string, amcId: string } | null>(null);
  const [revealLicenseRemark, setRevealLicenseRemark] = useState("");

  const handleRevealLicenseSubmit = async () => {
    if (!revealLicenseRemark.trim()) {
      toast.error("Please provide a remark/reason to view the license key.");
      return;
    }
    if (revealLicenseModal) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
           await supabase.from('amc_license_views').insert([{
             amc_id: revealLicenseModal.amcId || editRecordId || "00000000-0000-0000-0000-000000000000",
             user_id: user.id,
             line_item_id: revealLicenseModal.lineItemId,
             remark: revealLicenseRemark
           }]);
        }
        setRevealedLicenseKeys(prev => ({ ...prev, [revealLicenseModal.lineItemId]: true }));
        setRevealLicenseModal(null);
        setRevealLicenseRemark("");
      } catch(e) { 
        console.error("Failed to log view", e); 
        toast.error("Failed to log view and reveal key.");
      }
    }
  };

  // Phase 2 Fields - Structured
  const [solutionLineItems, setSolutionLineItems] = useState<SolutionLineItem[]>([]);

  // Linewise vs Headwise Cost Calculation
  const [isLineItemWise, setIsLineItemWise] = useState<boolean>(false);
  const [showLinewiseConfirmModal, setShowLinewiseConfirmModal] = useState<boolean>(false);

  // Additional API / Support Software (Headwise)
  const [formAdditionalApi, setFormAdditionalApi] = useState("");
  const [formAdditionalApiAmount, setFormAdditionalApiAmount] = useState("");

  // Line-Item Attachments Staging: record lineItemId -> AttachmentEntry[]
  const [lineItemAttachments, setLineItemAttachments] = useState<Record<string, AttachmentEntry[]>>({});

  const addLineItemAttachment = (lineItemId: string) => {
    setLineItemAttachments(prev => ({
      ...prev,
      [lineItemId]: [
        ...(prev[lineItemId] || []),
        { id: Math.random().toString(36).substring(2, 9), docName: "Purchase Order", file: null }
      ]
    }));
  };

  const updateLineItemAttachment = (lineItemId: string, entryId: string, field: 'docName' | 'file', value: any) => {
    setLineItemAttachments(prev => ({
      ...prev,
      [lineItemId]: (prev[lineItemId] || []).map(a => a.id === entryId ? { ...a, [field]: value } : a)
    }));
  };

  const removeLineItemAttachment = (lineItemId: string, entryId: string) => {
    setLineItemAttachments(prev => ({
      ...prev,
      [lineItemId]: (prev[lineItemId] || []).filter(a => a.id !== entryId)
    }));
  };

  const getLineItemIdFromFileName = (rawName: string): string | null => {
    const match = rawName.match(/^\[ITEM_([^_]+)_.*?\]_/);
    return match ? match[1] : null;
  };

  const formatFileName = (rawName: string) => {
    const itemMatch = rawName.match(/^\[ITEM_[^_]+_(.*?)\]_[^_]+_(.*)$/);
    if (itemMatch) {
      return `${itemMatch[1]}: ${itemMatch[2]}`;
    }
    const headMatch = rawName.match(/^\[(HEAD_)?(.*?)\]_[^_]+_(.*)$/);
    if (headMatch) {
      return `${headMatch[2]}: ${headMatch[3]}`;
    }
    return rawName;
  };

  // Derive computed values dynamically during render instead of useEffect loops
  const computedTotalCost = isLineItemWise
    ? (solutionLineItems.length > 0 
        ? solutionLineItems.reduce((sum, i) => sum + (Number(i.netAmount) || 0), 0).toFixed(2)
        : "0.00")
    : formCost;

  const parsedTotalCost = parseFloat(computedTotalCost);
  const parsedLicenses = parseInt(formTotalLicenses);
  const computedCostPerLicense = (parsedLicenses > 0 && !isNaN(parsedTotalCost))
    ? (parsedTotalCost / parsedLicenses).toFixed(2)
    : formCostPerLicense;

  const handleToggleLineItemWise = (targetChecked: boolean) => {
    if (targetChecked) {
      const parsedHeadwise = parseFloat(formCost);
      if (!isLineItemWise && !isNaN(parsedHeadwise) && parsedHeadwise > 0) {
        setShowLinewiseConfirmModal(true);
        return;
      }
      setIsLineItemWise(true);
    } else {
      if (solutionLineItems.length > 0) {
        const currentSum = solutionLineItems.reduce((sum, i) => sum + (Number(i.netAmount) || 0), 0).toFixed(2);
        if (parseFloat(currentSum) > 0) {
          setFormCost(currentSum);
        }
      }
      setIsLineItemWise(false);
    }
  };

  const confirmSwitchToLinewise = () => {
    setIsLineItemWise(true);
    setShowLinewiseConfirmModal(false);
  };

  const cancelSwitchToLinewise = () => {
    setShowLinewiseConfirmModal(false);
  };

  const [formPoNumber, setFormPoNumber] = useState("");
  const [formPoDate, setFormPoDate] = useState("");
  const [formPutToUseDate, setFormPutToUseDate] = useState("");
  const [formRenewalPeriodType, setFormRenewalPeriodType] = useState("");

  const calculateExpiryDate = (periodType: string, baseDateStr: string): string => {
    if (!periodType || periodType === "Custom" || !baseDateStr) return "";
    const d = new Date(baseDateStr);
    if (isNaN(d.getTime())) return "";
    switch (periodType) {
      case "Yearly": d.setFullYear(d.getFullYear() + 1); break;
      case "Half-Yearly": d.setMonth(d.getMonth() + 6); break;
      case "Quarterly": d.setMonth(d.getMonth() + 3); break;
      case "Monthly": d.setMonth(d.getMonth() + 1); break;
      default: return "";
    }
    d.setDate(d.getDate() - 1);
    // ui-audit-ignore-next-line html-date-input
    return d.toISOString().split('T')[0];
  };

  const handleRenewalChange = (periodType: string, baseDateStr: string) => {
    setFormRenewalPeriodType(periodType);
    if (periodType && periodType !== "Custom" && baseDateStr) {
      const calc = calculateExpiryDate(periodType, baseDateStr);
      if (calc) setFormExpiryDate(calc);
    }
  };

  // Custom Payment Terms Milestone Helpers (Headwise)
  const addHeadPaymentMilestone = () => {
    const nextIdx = (formPaymentMilestones.length || 0) + 1;
    const totalCost = parseFloat(computedTotalCost) || 0;
    const newMilestone: PaymentMilestone = {
      id: Math.random().toString(36).substring(2, 9),
      phaseName: `Phase ${nextIdx}`,
      percentage: 0,
      amount: 0,
      amountReleased: 0,
      status: '',
      targetDate: '',
      releaseDate: '',
      remark: ''
    };
    setFormPaymentMilestones(prev => [...prev, newMilestone]);
  };

  const updateHeadPaymentMilestone = (milestoneId: string, field: keyof PaymentMilestone, value: any) => {
    const totalCost = parseFloat(computedTotalCost) || 0;
    setFormPaymentMilestones(prev => prev.map(m => {
      if (m.id === milestoneId) {
        const updated = { ...m, [field]: value };
        if (field === 'percentage' && totalCost > 0) {
          const pct = parseFloat(value) || 0;
          updated.amount = parseFloat(((totalCost * pct) / 100).toFixed(2));
        } else if (field === 'amount' && totalCost > 0) {
          const amt = parseFloat(value) || 0;
          updated.percentage = parseFloat(((amt / totalCost) * 100).toFixed(2));
        } else if (field === 'status') {
          if (value === 'Amount Released' || value === 'Completed') {
            if (!updated.amountReleased || updated.amountReleased === 0) {
              updated.amountReleased = updated.amount || 0;
            }
            if (!updated.releaseDate) {
              // ui-audit-ignore-next-line html-date-input
              updated.releaseDate = new Date().toISOString().split('T')[0];
            }
          }
        }
        return updated;
      }
      return m;
    }));
  };

  const removeHeadPaymentMilestone = (milestoneId: string) => {
    setFormPaymentMilestones(prev => prev.filter(m => m.id !== milestoneId));
  };

  const setHeadCustomType = (type: 'percent_wise' | 'phase_wise') => {
    setFormPaymentTermsCustomType(type);
    const totalCost = parseFloat(computedTotalCost) || 0;
    if (totalCost > 0) {
      setFormPaymentMilestones(prev => prev.map(m => {
        if (type === 'percent_wise' && m.percentage) {
          return { ...m, amount: parseFloat(((totalCost * m.percentage) / 100).toFixed(2)) };
        } else if (type === 'phase_wise' && m.amount) {
          return { ...m, percentage: parseFloat(((m.amount / totalCost) * 100).toFixed(2)) };
        }
        return m;
      }));
    }
  };

  // Custom Payment Terms Milestone Helpers (Line Items)
  const addLineItemPaymentMilestone = (lineItemId: string) => {
    setSolutionLineItems(prev => prev.map(item => {
      if (item.id === lineItemId) {
        const existing = item.paymentMilestones || [];
        const nextIdx = existing.length + 1;
        const newMilestone: PaymentMilestone = {
          id: Math.random().toString(36).substring(2, 9),
          phaseName: `Phase ${nextIdx}`,
          percentage: 0,
          amount: 0,
          amountReleased: 0,
          status: '',
          targetDate: '',
          releaseDate: '',
          remark: ''
        };
        return {
          ...item,
          paymentMilestones: [...existing, newMilestone]
        };
      }
      return item;
    }));
  };

  const updateLineItemPaymentMilestone = (lineItemId: string, milestoneId: string, field: keyof PaymentMilestone, value: any) => {
    setSolutionLineItems(prev => prev.map(item => {
      if (item.id === lineItemId) {
        const baseAmt = Number(item.netAmount) || 0;
        const updatedMilestones = (item.paymentMilestones || []).map(m => {
          if (m.id === milestoneId) {
            const updated = { ...m, [field]: value };
            if (field === 'percentage' && baseAmt > 0) {
              const pct = parseFloat(value) || 0;
              updated.amount = parseFloat(((baseAmt * pct) / 100).toFixed(2));
            } else if (field === 'amount' && baseAmt > 0) {
              const amt = parseFloat(value) || 0;
              updated.percentage = parseFloat(((amt / baseAmt) * 100).toFixed(2));
            } else if (field === 'status') {
              if (value === 'Amount Released' || value === 'Completed') {
                if (!updated.amountReleased || updated.amountReleased === 0) {
                  updated.amountReleased = updated.amount || 0;
                }
                if (!updated.releaseDate) {
                  // ui-audit-ignore-next-line html-date-input
                  updated.releaseDate = new Date().toISOString().split('T')[0];
                }
              }
            }
            return updated;
          }
          return m;
        });
        return { ...item, paymentMilestones: updatedMilestones };
      }
      return item;
    }));
  };

  const removeLineItemPaymentMilestone = (lineItemId: string, milestoneId: string) => {
    setSolutionLineItems(prev => prev.map(item => {
      if (item.id === lineItemId) {
        return {
          ...item,
          paymentMilestones: (item.paymentMilestones || []).filter(m => m.id !== milestoneId)
        };
      }
      return item;
    }));
  };

  const setLineItemCustomType = (lineItemId: string, type: 'percent_wise' | 'phase_wise') => {
    setSolutionLineItems(prev => prev.map(item => {
      if (item.id === lineItemId) {
        const baseAmt = Number(item.netAmount) || 0;
        const updatedMilestones = (item.paymentMilestones || []).map(m => {
          if (type === 'percent_wise' && m.percentage && baseAmt > 0) {
            return { ...m, amount: parseFloat(((baseAmt * m.percentage) / 100).toFixed(2)) };
          } else if (type === 'phase_wise' && m.amount && baseAmt > 0) {
            return { ...m, percentage: parseFloat(((m.amount / baseAmt) * 100).toFixed(2)) };
          }
          return m;
        });
        return { ...item, paymentTermsCustomType: type, paymentMilestones: updatedMilestones };
      }
      return item;
    }));
  };

  
  const [vendorContactName, setVendorContactName] = useState("");
  const [vendorContactEmail, setVendorContactEmail] = useState("");
  const [vendorContactPhone, setVendorContactPhone] = useState("");
  
  const [taxGstNumber, setTaxGstNumber] = useState("");
  const [taxPanNumber, setTaxPanNumber] = useState("");
  
  const [bankName, setBankName] = useState("");
  const [bankAccountNo, setBankAccountNo] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [bankBranch, setBankBranch] = useState("");
  const [bankState, setBankState] = useState("");
  const [bankCity, setBankCity] = useState("");
  
  const [formIndustryType, setFormIndustryType] = useState<string[]>([]);
  const [formVendorType, setFormVendorType] = useState<string[]>([]);
  
  const [masterIndustryTypes, setMasterIndustryTypes] = useState<any[]>([]);
  const [masterVendorTypes, setMasterVendorTypes] = useState<any[]>([]);

  const [manageModalType, setManageModalType] = useState<"industry" | "vendor" | null>(null);

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: "", description: "", onConfirm: () => {} });

  const [promptState, setPromptState] = useState<{
    isOpen: boolean;
    title: string;
    description?: string;
    placeholder?: string;
    defaultValue?: string;
    onSubmit: (value: string) => Promise<void> | void;
  }>({
    isOpen: false,
    title: "",
    description: "",
    placeholder: "",
    defaultValue: "",
    onSubmit: () => {},
  });
  const [promptValue, setPromptValue] = useState("");

  const openPrompt = (opts: {
    title: string;
    description?: string;
    placeholder?: string;
    defaultValue?: string;
    onSubmit: (val: string) => Promise<void> | void;
  }) => {
    setPromptValue(opts.defaultValue || "");
    setPromptState({
      isOpen: true,
      title: opts.title,
      description: opts.description,
      placeholder: opts.placeholder,
      defaultValue: opts.defaultValue,
      onSubmit: opts.onSubmit,
    });
  };
  
  const [vendorAddrLine1, setVendorAddrLine1] = useState("");
  const [vendorAddrLine2, setVendorAddrLine2] = useState("");
  const [vendorAddrCity, setVendorAddrCity] = useState("");
  const [vendorAddrState, setVendorAddrState] = useState("");
  const [vendorAddrPincode, setVendorAddrPincode] = useState("");
  
  const [formMsmeNumber, setFormMsmeNumber] = useState("");
  const [formSpecifications, setFormSpecifications] = useState("");

  const INDIAN_STATES = [
    "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam",
    "Bihar", "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu",
    "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir",
    "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh",
    "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha",
    "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
    "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
  ];

  const [masterCities, setMasterCities] = useState<{id:string, state_name:string, city_name:string}[]>([]);

  // Attachments State
  const [attachments, setAttachments] = useState<AttachmentEntry[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleAddCity = (stateName: string, setter: (city: string) => void) => {
    if (!stateName) {
      toast.warning("Please select a state first before adding a city.");
      return;
    }
    openPrompt({
      title: `Add City for ${stateName}`,
      placeholder: "Enter new city name…",
      onSubmit: async (newCity) => {
        const cityName = newCity.trim();
        if (!cityName) return;
        try {
          const { data, error } = await supabase.from('master_cities').insert({ state_name: stateName, city_name: cityName }).select().single();
          if (error) {
            if (error.code === '23505') {
               toast.warning("That city already exists in this state.");
               setter(cityName);
            } else throw error;
          }
          if (data) {
            setMasterCities(prev => [...prev, data]);
            setter(cityName);
          }
        } catch(e) {
          console.error(e);
          toast.error("Failed to add city.");
        }
      }
    });
  };

  const handleAddContractType = () => {
    openPrompt({
      title: "New contract type",
      placeholder: "Enter new contract type name…",
      onSubmit: async (newType) => {
        const typeName = newType.trim();
        if (!typeName) return;

        if (masterContractTypes.includes(typeName)) {
          toast.warning("That contract type already exists.");
          setFormContractType(typeName);
          return;
        }

        try {
          const { data, error } = await supabase.from('master_contract_types').insert({ name: typeName }).select().single();
          if (error) {
            if (error.code === '42P01') {
              // Table doesn't exist yet (migration pending)
              toast.warning("Database migration for Contract Types is pending. Please run the migration first.");
            } else {
              toast.error("Failed to add Contract Type: " + error.message);
            }
            return;
          }
          setMasterContractTypes(prev => [...prev, typeName]);
          setFormContractType(typeName);
          setSuccessAlert(`Contract Type '${typeName}' added successfully.`);
        } catch(e) {
          console.error(e);
          toast.error("Failed to add contract type.");
        }
      }
    });
  };

  useEffect(() => {
    setMounted(true);
    fetchDependencies();
    fetchRecords();
  }, []);

  const fetchDependencies = async () => {
    try {
      const [{ data: usersData }, { data: deptsData }, { data: citiesData }, { data: vendorsData }, { data: contractTypesData }, { data: indData }, { data: venData }] = await Promise.all([
        supabase.from("user_master").select("id, full_name, email").eq("is_active", true),
        supabase.from("departments").select("id, name").eq("is_active", true),
        supabase.from("master_cities").select("*").order("city_name"),
        supabase.from("vendor_master").select("*").order("name"),
        supabase.from("master_contract_types").select("name").eq("is_active", true).order("name"),
        supabase.from("master_industry_types").select("*").eq("is_active", true).order("name"),
        supabase.from("master_vendor_types").select("*").eq("is_active", true).order("name")
      ]);
      if (usersData) setUsers(usersData);
      if (deptsData) setDepartments(deptsData);
      if (citiesData) setMasterCities(citiesData);
      if (vendorsData) setVendors(vendorsData);
      if (contractTypesData) {
        const uniqueTypes = Array.from(new Set([
          ...contractTypesData.map(c => c.name),
          'AMC', 'Subscription', 'Perpetual License', 'Other'
        ]));
        setMasterContractTypes(uniqueTypes);
      }
      if (indData) setMasterIndustryTypes(indData);
      if (venData) setMasterVendorTypes(venData);
    } catch (e) {
      console.error("Failed to load dependencies", e);
    }
  };

  const fetchRecords = async () => {
    setLoading(true);
    setErrorAlert(null);
    try {
      const { data, error } = await supabase
        .from("software_amc")
        .select(`
          *,
          user_master:assigned_to (id, full_name, email),
          departments:department_id (id, name),
          vendor_master:vendor_id (id, name)
        `)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (err: any) {
      setErrorAlert("Failed to load records. " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttachments = async (recordId: string) => {
    try {
      const { data, error } = await supabase.storage.from('amc-attachments').list(recordId);
      if (data) {
        setExistingAttachments(data.filter(f => f.name !== '.emptyFolderPlaceholder'));
      } else {
        setExistingAttachments([]);
      }
    } catch (e) {
      console.error("Could not fetch attachments");
    }
  };

  useEffect(() => {
    if (successAlert || errorAlert) {
      const timer = setTimeout(() => {
        setSuccessAlert(null);
        setErrorAlert(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successAlert, errorAlert]);

  const resetForm = () => {
    setEditRecordId(null);
    setFormSoftwareName("");
    setFormVendorId("");
    setFormContractType("AMC");
    setFormPurchaseDate("");
    setFormExpiryDate("");
    setFormCost("");
    setFormAssignedTo("");
    setFormDepartmentId("");
    setFormStatus("");
    setFormNotes("");
    
    setFormCurrency("INR");
    setFormTotalLicenses("");
    setFormUsedLicenses("");
    setFormCostPerLicense("");
    setFormPaymentTerms("");
    setFormPaymentTermsCustomType('phase_wise');
    setFormPaymentMilestones([]);

    setFormDataClassification("");
    setFormComplianceStatus([]);
    setFormInfosecApprovedDate("");
    setFormDpaSigned(false);
    setFormDpaSignedDate("");
    setFormSupportTier("");
    setFormSlaUptime("");
    setFormSlaTat("");
    setFormCostCenterId("");
    setFormNotifyBeforeDays("30");
    setRevealedLicenseKeys({});
    
    setSolutionLineItems([]);
    setFormPoNumber("");
    setFormPoDate("");
    setFormPutToUseDate("");
    setFormRenewalPeriodType("");
    
    setVendorContactName("");
    setVendorContactEmail("");
    setVendorContactPhone("");
    
    setTaxGstNumber("");
    setTaxPanNumber("");
    
    setBankName("");
    setBankAccountNo("");
    setBankIfsc("");
    setBankBranch("");
    setBankState("");
    setBankCity("");
    
    setFormIndustryType([]);
    setFormVendorType([]);
    
    setVendorAddrLine1("");
    setVendorAddrLine2("");
    setVendorAddrCity("");
    setVendorAddrState("");
    setVendorAddrPincode("");
    
    setFormMsmeNumber("");
    setFormSpecifications("");
    setFormVendorRating("5.0");
    setFormVendorEvaluationNotes("");
    setFormRiskLevel("Low");
    setFormSlaAdherencePercent("100.0");
    
    setAttachments([]);
    setExistingAttachments([]);
    setIsLineItemWise(false);
    setShowLinewiseConfirmModal(false);
    setFormAdditionalApi("");
    setFormAdditionalApiAmount("");
    setLineItemAttachments({});
    setShowVendorDetails(false);
    setCurrentStep(1);
  };

  const handleVendorChange = (vendorId: string) => {
    setFormVendorId(vendorId);
    if (!vendorId) return;
    const vendor = vendors.find(v => v.id === vendorId);
    if (vendor) {
      setVendorContactName(vendor.contact_name || "");
      setVendorContactEmail(vendor.contact_email || "");
      setVendorContactPhone(vendor.phone || "");
      setVendorAddrLine1(vendor.address_line1 || "");
      setVendorAddrLine2(vendor.address_line2 || "");
      setVendorAddrCity(vendor.city || "");
      setVendorAddrState(vendor.state || "");
      setVendorAddrPincode(vendor.pincode || "");
      setTaxGstNumber(vendor.tax_gstin || "");
      setTaxPanNumber(vendor.tax_pan || "");
      setFormMsmeNumber(vendor.tax_code || "");
      setBankName(vendor.bank_name || "");
      setBankAccountNo(vendor.bank_account_number || "");
      setBankIfsc(vendor.bank_ifsc || "");
      setBankBranch(vendor.bank_branch || "");
      setBankState(vendor.bank_state || "");
      setBankCity(vendor.bank_city || "");
      setFormIndustryType(vendor.industry_type ? vendor.industry_type.split(",").map((s: string) => s.trim()) : []);
      setFormVendorType(vendor.vendor_type ? vendor.vendor_type.split(",").map((s: string) => s.trim()) : []);
    }
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (rec: any, initialTab: string = "Master") => {
    resetForm();
    setEditRecordId(rec.id);
    setActiveTab(initialTab);
    setFormSoftwareName(rec.software_name || "");
    setFormVendorId(rec.vendor_id || "");
    setFormContractType(rec.contract_type || "AMC");
    setFormPurchaseDate(rec.purchase_date || "");
    setFormExpiryDate(rec.expiry_date || "");
    setFormCost(rec.cost?.toString() || "");
    setFormAssignedTo(rec.assigned_to || "");
    setFormDepartmentId(rec.department_id || "");
    setFormStatus(rec.status || "");
    setFormNotes(rec.notes || "");

    setFormCurrency(rec.currency || "INR");
    setFormTotalLicenses(rec.total_licenses?.toString() || "");
    setFormUsedLicenses(rec.used_licenses?.toString() || "");
    setFormCostPerLicense(rec.cost_per_license?.toString() || "");
    setFormPaymentTerms(rec.payment_terms || "");
    const paymentJson = rec.payment_terms_json || {};
    setFormPaymentTermsCustomType(paymentJson.customType || 'phase_wise');
    setFormPaymentMilestones(Array.isArray(paymentJson.milestones) ? paymentJson.milestones : []);
    setFormSupportTier(rec.support_tier || "");
    setFormSlaUptime(rec.sla_uptime?.toString() || "");
    setFormSlaTat(rec.sla_tat || "");
    setFormCostCenterId(rec.cost_center_id || "");
    setFormNotifyBeforeDays(rec.notify_before_days?.toString() || "30");
    setFormDataClassification(rec.data_classification || "");
    setFormComplianceStatus(rec.compliance_status || []);
    // ui-audit-ignore-next-line html-date-input
    setFormInfosecApprovedDate(rec.infosec_approved_date ? new Date(rec.infosec_approved_date).toISOString().split('T')[0] : "");
    setFormDpaSigned(rec.dpa_signed || false);
    // ui-audit-ignore-next-line html-date-input
    setFormDpaSignedDate(rec.dpa_signed_date ? new Date(rec.dpa_signed_date).toISOString().split('T')[0] : "");
    setRevealedLicenseKeys({});

    const linewiseDetected = rec.is_line_item_wise !== undefined
      ? !!rec.is_line_item_wise
      : (Array.isArray(rec.solution_line_items) && rec.solution_line_items.some((i: any) => i.isLineItemWise || Number(i.rate) > 0));
    setIsLineItemWise(linewiseDetected);
    setShowLinewiseConfirmModal(false);

    const mappedItems: SolutionLineItem[] = (rec.solution_line_items || []).map((i: any) => ({
      ...i,
      purchaseDate: i.purchaseDate || rec.purchase_date || "",
      putToUseDate: i.putToUseDate || rec.put_to_use_date || "",
      renewalPeriodType: i.renewalPeriodType || rec.renewal_period_type || "",
      expiryDate: i.expiryDate || i.customRenewalDate || rec.expiry_date || "",
      paymentTerms: i.paymentTerms || "",
      paymentTermsCustomType: i.paymentTermsCustomType || 'phase_wise',
      paymentMilestones: Array.isArray(i.paymentMilestones) ? i.paymentMilestones : []
    }));
    setSolutionLineItems(mappedItems);
    setFormPoNumber(rec.po_number || "");
    setFormPoDate(rec.po_date || "");
    setFormPutToUseDate(rec.put_to_use_date || "");
    setFormRenewalPeriodType(rec.renewal_period_type || "");
    
    setVendorContactName(rec.vendor_contact_json?.name || "");
    setVendorContactEmail(rec.vendor_contact_json?.email || "");
    setVendorContactPhone(rec.vendor_contact_json?.phone || "");
    
    setTaxGstNumber(rec.taxation_json?.gstNumber || "");
    setTaxPanNumber(rec.taxation_json?.panNumber || "");
    
    setBankName(rec.bank_details_json?.bankName || "");
    setBankAccountNo(rec.bank_details_json?.accountNo || "");
    setBankIfsc(rec.bank_details_json?.ifsc || "");
    setBankBranch(rec.bank_details_json?.branchName || "");
    setBankState(rec.bank_details_json?.state || "");
    setBankCity(rec.bank_details_json?.city || "");
    
    setFormIndustryType(rec.industry_type ? rec.industry_type.split(",").map((s: string) => s.trim()) : []);
    setFormVendorType(rec.vendor_type ? rec.vendor_type.split(",").map((s: string) => s.trim()) : []);
    
    setVendorAddrLine1(rec.vendor_address_json?.line1 || "");
    setVendorAddrLine2(rec.vendor_address_json?.line2 || "");
    setVendorAddrCity(rec.vendor_address_json?.city || "");
    setVendorAddrState(rec.vendor_address_json?.state || "");
    setVendorAddrPincode(rec.vendor_address_json?.pincode || "");
    
    setFormMsmeNumber(rec.msme_number || "");
    setFormSpecifications(rec.specifications || "");
    setFormVendorRating(rec.vendor_rating ? rec.vendor_rating.toString() : "5.0");
    setFormVendorEvaluationNotes(rec.vendor_evaluation_notes || "");
    setFormRiskLevel(rec.risk_level || "Low");
    setFormSlaAdherencePercent(rec.sla_adherence_percent ? rec.sla_adherence_percent.toString() : "100.0");
    setFormAdditionalApi(rec.additional_api || "");
    setFormAdditionalApiAmount(rec.additional_api_amount?.toString() || "");
    setLineItemAttachments({});

    fetchAttachments(rec.id);
    setShowModal(true);
  };

  const handleLineItemChange = (id: string, field: keyof SolutionLineItem, value: any) => {
    setSolutionLineItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };

        // Handle date calculations on line items
        if (field === 'renewalPeriodType') {
          const baseDate = updated.putToUseDate || updated.purchaseDate;
          if (value && value !== 'Custom' && baseDate) {
            const calcExpiry = calculateExpiryDate(value, baseDate);
            if (calcExpiry) {
              updated.expiryDate = calcExpiry;
              updated.customRenewalDate = calcExpiry;
            }
          }
        } else if (field === 'putToUseDate' || field === 'purchaseDate') {
          if (updated.renewalPeriodType && updated.renewalPeriodType !== 'Custom') {
            const baseDate = updated.putToUseDate || updated.purchaseDate;
            if (baseDate) {
              const calcExpiry = calculateExpiryDate(updated.renewalPeriodType, baseDate);
              if (calcExpiry) {
                updated.expiryDate = calcExpiry;
                updated.customRenewalDate = calcExpiry;
              }
            }
          }
        } else if (field === 'expiryDate') {
          updated.customRenewalDate = value;
        }

        // Parse numerical values
        const qty = parseFloat(updated.qty?.toString() || "0") || 0;
        const rate = parseFloat(updated.rate?.toString() || "0") || 0;
        const base = qty * rate;
        
        const cgstPct = parseFloat(updated.cgstPercent?.toString() || "0") || 0;
        const sgstPct = parseFloat(updated.sgstPercent?.toString() || "0") || 0;
        const igstPct = parseFloat(updated.igstPercent?.toString() || "0") || 0;
        const discount = parseFloat(updated.discount?.toString() || "0") || 0;
        const apiAmt = parseFloat(updated.additionalApiAmount?.toString() || "0") || 0;
        
        updated.cgstAmount = parseFloat((base * (cgstPct / 100)).toFixed(2));
        updated.sgstAmount = parseFloat((base * (sgstPct / 100)).toFixed(2));
        updated.igstAmount = parseFloat((base * (igstPct / 100)).toFixed(2));
        updated.netAmount = parseFloat((base + updated.cgstAmount + updated.sgstAmount + updated.igstAmount - discount + apiAmt).toFixed(2));
        
        return updated;
      }
      return item;
    }));
  };

  const addLineItem = () => {
    setSolutionLineItems(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substr(2, 9),
        resolutionName: "",
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
        purchaseDate: formPurchaseDate || "",
        putToUseDate: formPutToUseDate || "",
        renewalPeriodType: formRenewalPeriodType || "",
        expiryDate: formExpiryDate || "",
        customRenewalDate: formExpiryDate || "",
        licenseKey: "",
        isLineItemWise: isLineItemWise,
        additionalApi: "",
        additionalApiAmount: 0,
        paymentTerms: formPaymentTerms || "",
        paymentTermsCustomType: formPaymentTermsCustomType || 'phase_wise',
        paymentMilestones: []
      }
    ]);
  };

  const removeLineItem = (id: string) => {
    setSolutionLineItems(prev => prev.filter(item => item.id !== id));
  };

  const handleSave = async (e?: React.FormEvent, isDraftAndNext = false) => {
    if (e) e.preventDefault();
    
    // Step 1 Validation (General & Vendor)
    if (currentStep === 1 || !editRecordId || !isDraftAndNext) {
      if (!formVendorId.trim()) { setErrorAlert("Provider / Vendor Name is mandatory."); return; }
      if (!formContractType) { setErrorAlert("Contract Type is mandatory."); return; }
      if (!formStatus) { setErrorAlert("Status is mandatory."); return; }
      if (!formAssignedTo) { setErrorAlert("Assigned To (Owner) is mandatory."); return; }
      if (!formDepartmentId) { setErrorAlert("Department is mandatory."); return; }
      if (!vendorContactName.trim()) { setErrorAlert("Contact Name is mandatory. Please update the Vendor Master profile to include a Contact Name."); return; }
      if (!vendorContactEmail.trim()) { setErrorAlert("Contact Email is mandatory. Please update the Vendor Master profile to include a Contact Email."); return; }
      if (!vendorContactPhone.trim()) { setErrorAlert("Contact Phone / Ext is mandatory. Please update the Vendor Master profile to include a Phone Number."); return; }
    }

    // Step 2 Validation (PO Details)
    if (currentStep === 2 || (!isDraftAndNext && currentStep >= 2)) {
      if (!formPurchaseDate) { setErrorAlert("Purchase Date is mandatory in PO Details."); return; }
    }

    // Step 3 Validation (Software Details)
    if (currentStep === 3 || (!isDraftAndNext && currentStep >= 3)) {
      if (!formSoftwareName.trim()) { setErrorAlert("Software Name is mandatory."); return; }
    }

    // Step 4 Validation (Line Items)
    if (currentStep === 4 || (!isDraftAndNext && currentStep >= 4)) {
      if (solutionLineItems.length > 0) {
        for (let idx = 0; idx < solutionLineItems.length; idx++) {
          const item = solutionLineItems[idx];
          const itemLabel = item.resolutionName?.trim() || `Line item #${idx + 1}`;
          if (!item.purchaseDate) {
            setErrorAlert(`"${itemLabel}": Purchase Date is mandatory.`);
            return;
          }
        }
      }

      if (isLineItemWise && solutionLineItems.length > 0) {
        for (let idx = 0; idx < solutionLineItems.length; idx++) {
          const item = solutionLineItems[idx];
          const itemLabel = item.resolutionName?.trim() || `Line item #${idx + 1}`;
          if (!item.resolutionName?.trim()) {
            setErrorAlert(`Line item #${idx + 1}: Resolution Name is mandatory.`);
            return;
          }
          const parsedQty = parseFloat(item.qty?.toString() || "0");
          if (isNaN(parsedQty) || parsedQty <= 0) {
            setErrorAlert(`"${itemLabel}": Quantity must be at least 1.`);
            return;
          }
          const parsedRate = parseFloat(item.rate?.toString() || "");
          if (isNaN(parsedRate) || parsedRate < 0) {
            setErrorAlert(`"${itemLabel}": Rate is mandatory and cannot be negative when Line-Item Wise calculation is enabled.`);
            return;
          }
        }
      }
    }

    // Step 5 Validation (Mandatory PO and Agreement Attachments before completing)
    const isPoDoc = (type: string) => /purchase\s*order|po\b/i.test(type);
    const isAgreementDoc = (type: string) => /agreement|contract|sign\s*off/i.test(type);

    if (!isDraftAndNext || currentStep === 5) {
      if (!formSoftwareName.trim()) { setErrorAlert("Software Name is mandatory."); return; }
      if (!formPurchaseDate) { setErrorAlert("Purchase Date is mandatory."); return; }

      // 1. Validate Head-level documents
      const allHeadDocTypes = [
        ...attachments.filter(a => a.file).map(a => a.docName),
        ...existingAttachments.filter(f => !getLineItemIdFromFileName(f.name)).map(f => {
          const m = f.name.match(/^\[(HEAD_)?(.*?)\]_/);
          return m ? m[2] : f.name;
        })
      ];
      const hasHeadPo = allHeadDocTypes.some(isPoDoc);
      const hasHeadAgreement = allHeadDocTypes.some(isAgreementDoc);

      if (!hasHeadPo || !hasHeadAgreement) {
        setErrorAlert("Purchase Order (PO) and Agreement documents are mandatory at the contract level. Please attach both in Step 5.");
        return;
      }

      // 2. Validate Line-Item documents if line items exist
      if (solutionLineItems.length > 0) {
        for (let idx = 0; idx < solutionLineItems.length; idx++) {
          const item = solutionLineItems[idx];
          const itemLabel = item.resolutionName?.trim() || `Line item #${idx + 1}`;
          const itemStaged = (lineItemAttachments[item.id] || []).filter(a => a.file);
          const itemExisting = existingAttachments.filter(f => getLineItemIdFromFileName(f.name) === item.id);
          const allItemDocTypes = [
            ...itemStaged.map(a => a.docName),
            ...itemExisting.map(f => {
              const m = f.name.match(/^\[ITEM_[^_]+_(.*?)\]_/);
              return m ? m[1] : f.name;
            })
          ];
          const hasItemPo = allItemDocTypes.some(isPoDoc);
          const hasItemAgreement = allItemDocTypes.some(isAgreementDoc);

          if (!hasItemPo || !hasItemAgreement) {
            setErrorAlert(`"${itemLabel}": Purchase Order (PO) and Agreement documents are mandatory for this line item. Please attach both documents.`);
            return;
          }
        }
      }
    }

    let finalLineItems = solutionLineItems.map(item => ({
      ...item,
      isLineItemWise: isLineItemWise
    }));

    if (finalLineItems.length === 0) {
      finalLineItems = [{
        id: Math.random().toString(36).substr(2, 9),
        resolutionName: formSoftwareName,
        remark: formSpecifications || "",
        qty: formTotalLicenses ? parseInt(formTotalLicenses) : 1,
        rate: computedTotalCost ? (parseFloat(computedTotalCost) || 0) : 0,
        cgstPercent: 0,
        cgstAmount: 0,
        sgstPercent: 0,
        sgstAmount: 0,
        igstPercent: 0,
        igstAmount: 0,
        discount: 0,
        netAmount: computedTotalCost ? (parseFloat(computedTotalCost) || 0) : 0,
        purchaseDate: formPurchaseDate || "",
        putToUseDate: formPutToUseDate || "",
        renewalPeriodType: formRenewalPeriodType || "",
        expiryDate: formExpiryDate || "",
        customRenewalDate: formExpiryDate || "",
        isLineItemWise: isLineItemWise,
        additionalApi: formAdditionalApi || "",
        additionalApiAmount: formAdditionalApiAmount ? (parseFloat(formAdditionalApiAmount) || 0) : 0,
        paymentTerms: formPaymentTerms || "",
        paymentTermsCustomType: formPaymentTermsCustomType,
        paymentMilestones: formPaymentMilestones
      }];
    } else if (finalLineItems[0]) {
      finalLineItems[0] = {
        ...finalLineItems[0],
        additionalApi: finalLineItems[0].additionalApi || formAdditionalApi || "",
        additionalApiAmount: finalLineItems[0].additionalApiAmount || (formAdditionalApiAmount ? parseFloat(formAdditionalApiAmount) : 0),
        paymentTerms: finalLineItems[0].paymentTerms || formPaymentTerms || "",
        paymentTermsCustomType: finalLineItems[0].paymentTermsCustomType || formPaymentTermsCustomType,
        paymentMilestones: (finalLineItems[0].paymentMilestones && finalLineItems[0].paymentMilestones.length > 0) ? finalLineItems[0].paymentMilestones : formPaymentMilestones
      };
    }

    const finalCostValue = isLineItemWise
      ? (solutionLineItems.length > 0 
          ? parseFloat(solutionLineItems.reduce((sum, i) => sum + (Number(i.netAmount) || 0), 0).toFixed(2)) 
          : (parseFloat(formCost) || 0))
      : (formCost ? parseFloat(formCost) : null);

    const payload = {
      software_name: formSoftwareName,
      solution_name: finalLineItems.map(item => item.resolutionName).filter(Boolean).join(", ") || null,
      vendor_id: formVendorId,
      contract_type: formContractType,
      purchase_date: formPurchaseDate || null,
      expiry_date: formExpiryDate || null,
      put_to_use_date: formPutToUseDate || null,
      renewal_period_type: formRenewalPeriodType || null,
      cost: finalCostValue,
      assigned_to: formAssignedTo || null,
      department_id: formDepartmentId || null,
      status: formStatus,
      po_number: formPoNumber || null,
      po_date: formPoDate || null,
      industry_type: formIndustryType.length > 0 ? formIndustryType.join(", ") : null,
      vendor_type: formVendorType.length > 0 ? formVendorType.join(", ") : null,
      msme_number: formMsmeNumber || null,
      specifications: formSpecifications || null,
      notes: formNotes,
      
      currency: formCurrency,
      total_licenses: formTotalLicenses ? parseInt(formTotalLicenses) : null,
      used_licenses: formUsedLicenses ? parseInt(formUsedLicenses) : null,
      cost_per_license: computedCostPerLicense ? parseFloat(computedCostPerLicense) : null,
      payment_terms: formPaymentTerms || null,
      support_tier: formSupportTier || null,
      sla_uptime: formSlaUptime ? parseFloat(formSlaUptime) : null,
      sla_tat: formSlaTat || null,
      cost_center_id: formCostCenterId || null,
      notify_before_days: formNotifyBeforeDays ? parseInt(formNotifyBeforeDays) : 30,
      data_classification: formDataClassification || null,
      compliance_status: formComplianceStatus,
      infosec_approved_date: formInfosecApprovedDate || null,
      dpa_signed: formDpaSigned,
      dpa_signed_date: formDpaSignedDate || null,
      
      // Enterprise additions
      vendor_rating: parseFloat(formVendorRating) || 5.0,
      vendor_evaluation_notes: formVendorEvaluationNotes || null,
      monthly_amortized_cost: (finalCostValue && finalCostValue > 0)
        ? (formPurchaseDate && formExpiryDate
            ? parseFloat((finalCostValue / Math.max(1, (new Date(formExpiryDate).getFullYear() - new Date(formPurchaseDate).getFullYear()) * 12 + (new Date(formExpiryDate).getMonth() - new Date(formPurchaseDate).getMonth()))).toFixed(2))
            : parseFloat((finalCostValue / 12).toFixed(2)))
        : null,
      sla_adherence_percent: parseFloat(formSlaAdherencePercent) || 100.0,
      risk_level: formRiskLevel || 'Low',
      
      // JSON fields
      solution_line_items: finalLineItems,
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
        ifsc: bankIfsc,
        branchName: bankBranch,
        state: bankState,
        city: bankCity
      },
      vendor_address_json: {
        line1: vendorAddrLine1,
        line2: vendorAddrLine2,
        city: vendorAddrCity,
        state: vendorAddrState,
        pincode: vendorAddrPincode
      }
    };

    setUploading(true);
    try {
      let currentEditId = editRecordId;

      if (editRecordId) {
        const res = await saveAMCEntity("software_amc", payload, editRecordId);
        if (!res.success) throw new Error(res.error);
        if (!isDraftAndNext) setSuccessAlert("Subscription updated successfully.");
      } else {
        const res = await saveAMCEntity("software_amc", payload);
        if (!res.success) throw new Error(res.error);
        currentEditId = res.data?.id;
        setEditRecordId(currentEditId);
        if (!isDraftAndNext) setSuccessAlert("Subscription created successfully.");
      }

      // Handle Head Attachments Upload
      if (attachments.length > 0 && currentEditId) {
        for (const entry of attachments) {
          if (!entry.file) continue;
          const safeDocName = (entry.docName || 'Document').replace(/[^a-zA-Z0-9 -]/g, '');
          const fileName = `${currentEditId}/[HEAD_${safeDocName}]_${Math.random().toString(36).substring(2, 8)}_${entry.file.name}`;
          await supabase.storage.from('amc-attachments').upload(fileName, entry.file);
        }
      }

      // Handle Line Item Attachments Upload
      if (currentEditId) {
        for (const [itemId, entries] of Object.entries(lineItemAttachments)) {
          for (const entry of entries) {
            if (!entry.file) continue;
            const safeDocName = (entry.docName || 'Document').replace(/[^a-zA-Z0-9 -]/g, '');
            const fileName = `${currentEditId}/[ITEM_${itemId}_${safeDocName}]_${Math.random().toString(36).substring(2, 8)}_${entry.file.name}`;
            await supabase.storage.from('amc-attachments').upload(fileName, entry.file);
          }
        }
      }

      if (isDraftAndNext) {
        setSuccessAlert("Draft saved successfully.");
        setCurrentStep(prev => prev + 1);
        setTimeout(() => setSuccessAlert(null), 2000);
      } else {
        const isNewCreation = !editRecordId;
        if (isNewCreation && currentEditId) {
          setEditRecordId(currentEditId);
          setActiveTab('Implementation');
          setSuccessAlert("Subscription created successfully! Now tracking onboarding & implementation lifecycle.");
          fetchRecords();
          fetchAttachments(currentEditId);
        } else {
          setSuccessAlert("Subscription updated successfully.");
          fetchRecords();
          if (currentEditId) fetchAttachments(currentEditId);
          setShowModal(false);
        }
      }
    } catch (err: any) {
      setErrorAlert("Failed to save record: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleApprove = async (id: string, status: string) => {
    try {
      const res = await saveAMCEntity("software_amc", { approval_status: status }, id);
      if (!res.success) throw new Error(res.error);
      setSuccessAlert(`AMC marked as ${status}`);
      await fetchRecords();
    } catch (err: any) {
      setErrorAlert(`Failed to update status: ${err.message}`);
    }
  };

  const handleDelete = (id: string) => {
    setConfirmState({
      isOpen: true,
      title: "Delete AMC record",
      description: "Are you sure you want to delete this record? This action cannot be undone.",
      onConfirm: async () => {
        try {
          const res = await deleteAMCEntity("software_amc", id, false);
          if (!res.success) throw new Error(res.error);
          setSuccessAlert("Record deleted.");
          fetchRecords();
        } catch (err: any) {
          toast.error("Error: " + err.message);
        }
      }
    });
  };

  const deleteAttachment = (fileName: string) => {
    if (!editRecordId) return;
    setConfirmState({
      isOpen: true,
      title: "Remove attachment",
      description: "Are you sure you want to remove this attachment?",
      onConfirm: async () => {
        try {
          await supabase.storage.from('amc-attachments').remove([`${editRecordId}/${fileName}`]);
          fetchAttachments(editRecordId);
        } catch(e) {
          console.error(e);
        }
      }
    });
  };

  const handleExportDossier = () => {
    if (!editRecordId) return;
    const vendor = vendors.find(v => v.id === formVendorId);
    const user = users.find(u => u.id === formAssignedTo);
    const dept = departments.find(d => d.id === formDepartmentId);

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Please allow popups to export the contract dossier.");
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Contract Dossier - ${formSoftwareName || 'Subscription'}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; font-size: 13px; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 25px; }
            .title { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0 0 4px 0; }
            .subtitle { font-size: 13px; color: #64748b; margin: 0; }
            .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; }
            .section { margin-bottom: 24px; }
            .section-title { font-size: 13px; font-weight: 700; letter-spacing: 0.05em; color: #2563eb; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 12px; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
            .field { margin-bottom: 8px; }
            .field-label { font-size: 11px; font-weight: 600; color: #64748b; }
            .field-value { font-size: 13px; font-weight: 600; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
            th { background: #f8fafc; font-weight: 700; color: #475569; font-size: 11px; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between; }
            @media print { body { padding: 0; } .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="title">${formSoftwareName || 'Subscription Contract'}</h1>
              <p class="subtitle">Contract Dossier & Governance Portfolio Summary</p>
            </div>
            <div style="text-align: right;">
              <div class="badge">${formContractType} • ${formStatus}</div>
              <div style="margin-top: 6px; font-size: 18px; font-weight: 800; color: #059669;">${formCurrency} ${computedTotalCost || formCost || '0.00'}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Contract & Vendor Profile</div>
            <div class="grid">
              <div class="field"><div class="field-label">Vendor / Provider</div><div class="field-value">${vendor?.name || 'N/A'}</div></div>
              <div class="field"><div class="field-label">Contact Person</div><div class="field-value">${vendorContactName || 'N/A'} (${vendorContactPhone || 'N/A'})</div></div>
              <div class="field"><div class="field-label">Contact Email</div><div class="field-value">${vendorContactEmail || 'N/A'}</div></div>
              <div class="field"><div class="field-label">PO Number / Received Date</div><div class="field-value">${formPoNumber || '—'} ${formPoDate ? `(${formPoDate})` : ''}</div></div>
              <div class="field"><div class="field-label">Purchase Date</div><div class="field-value">${formPurchaseDate || 'N/A'}</div></div>
              <div class="field"><div class="field-label">Expiry Date</div><div class="field-value">${formExpiryDate || 'N/A'}</div></div>
              <div class="field"><div class="field-label">Put to Use Date</div><div class="field-value">${formPutToUseDate || 'N/A'}</div></div>
              <div class="field"><div class="field-label">Owner (Assigned To)</div><div class="field-value">${user?.full_name || 'N/A'}</div></div>
              <div class="field"><div class="field-label">Department</div><div class="field-value">${dept?.name || 'N/A'}</div></div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Solution Line Items & Commercials</div>
            <table>
              <thead>
                <tr>
                  <th>Item #</th>
                  <th>Resolution / Solution Name</th>
                  <th>Qty</th>
                  <th>Rate</th>
                  <th>Taxes & Discount</th>
                  <th>Net Amount</th>
                </tr>
              </thead>
              <tbody>
                ${solutionLineItems.length > 0 ? solutionLineItems.map((item, idx) => `
                  <tr>
                    <td>${idx + 1}</td>
                    <td><strong>${item.resolutionName || formSoftwareName}</strong></td>
                    <td>${item.qty || 1}</td>
                    <td>${formCurrency} ${(item.rate || 0).toFixed(2)}</td>
                    <td>CGST: ${item.cgstPercent || 0}% | SGST: ${item.sgstPercent || 0}% | Disc: ${item.discount || 0}</td>
                    <td><strong>${formCurrency} ${(item.netAmount || 0).toFixed(2)}</strong></td>
                  </tr>
                `).join('') : `
                  <tr>
                    <td>1</td>
                    <td><strong>${formSoftwareName}</strong></td>
                    <td>${formTotalLicenses || 1}</td>
                    <td>${formCurrency} ${computedTotalCost || formCost || '0.00'}</td>
                    <td>Headwise Commercial</td>
                    <td><strong>${formCurrency} ${computedTotalCost || formCost || '0.00'}</strong></td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="section-title">Governance, SLA & Payment Terms</div>
            <div class="grid">
              <div class="field"><div class="field-label">Payment Terms</div><div class="field-value">${formPaymentTerms || 'Standard'}</div></div>
              <div class="field"><div class="field-label">Support Tier</div><div class="field-value">${formSupportTier || 'Standard'}</div></div>
              <div class="field"><div class="field-label">SLA Guaranteed Uptime</div><div class="field-value">${formSlaUptime ? `${formSlaUptime}%` : 'N/A'}</div></div>
              <div class="field"><div class="field-label">Data Classification</div><div class="field-value">${formDataClassification || 'Internal'}</div></div>
              <div class="field"><div class="field-label">InfoSec Approved Date</div><div class="field-value">${formInfosecApprovedDate || 'Pending'}</div></div>
              <div class="field"><div class="field-label">DPA Signed</div><div class="field-value">${formDpaSigned ? `Yes (${formDpaSignedDate || ''})` : 'No'}</div></div>
            </div>
          </div>

          <div class="footer">
            <div>Generated by Enterprise Operations Portal on ${formatDateTime(new Date())}</div>
            <div>Page 1 of 1</div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 350);
  };

  const filteredDataset = records.filter(r => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      !query ||
      r.software_name?.toLowerCase().includes(query) ||
      r.vendor_master?.name?.toLowerCase().includes(query) ||
      r.solution_name?.toLowerCase().includes(query);
    
    if (!matchesSearch) return false;

    if (tableRiskFilter === 'all') return true;
    if (tableRiskFilter === 'active') return r.status === 'Active' && r.approval_status !== 'Pending Approval';
    if (tableRiskFilter === 'pending') return r.approval_status === 'Pending Approval';

    const today = new Date();
    let diffDays = 999;
    if (r.expiry_date) {
      const exp = new Date(r.expiry_date);
      diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    }

    if (tableRiskFilter === 'expiring30') return diffDays >= 0 && diffDays <= 30;
    if (tableRiskFilter === 'expiring60') return diffDays >= 0 && diffDays <= 60;
    if (tableRiskFilter === 'critical_high') {
      return diffDays <= 30 || r.status === 'Expired' || r.risk_level === 'Critical' || r.risk_level === 'High';
    }

    return true;
  });

  if (!mounted || permsLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <ChandakLoader
          size="lg"
          title="Chandak AMC management"
          subtitle="Initializing contracts, vendors and assets…"
        />
      </div>
    );
  }

  const isSuperAdmin = roleCode === "SUPER_ADMIN";

  if (!isSuperAdmin && !hasPermission("AMC_VIEW")) {
    return (
      <div className="h-screen flex flex-col items-center justify-center text-muted">
        <Lock className="h-12 w-12 mb-4 opacity-50" />
        <h2 className="text-xl font-semibold text-foreground">Access denied</h2>
        <p className="text-sm mt-2 text-muted">You do not have permission to view the AMC module.</p>
        <Link href="/" className="mt-4">
          <AppButton variant="primary" size="sm">Return to dashboard</AppButton>
        </Link>
      </div>
    );
  }

  return (
    <PageContainer strict={true}>
      <PageHeader
        title="Annual maintenance contracts"
        description="Software subscriptions and AMCs, their cost, owners and renewal dates."
        actions={
          <>
            <div className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-sunken p-0.5" role="radiogroup" aria-label="View">
              {([['dashboard', 'Overview', BarChart3], ['table', 'Contracts', Layers]] as const).map(([mode, label, Icon]) => (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={viewMode === mode}
                  onClick={() => setViewMode(mode)}
                  className={`inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-[13px] font-medium transition-colors ${viewMode === mode ? 'bg-surface font-semibold text-foreground shadow-sm' : 'text-muted hover:text-foreground'}`}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden /> {label}
                </button>
              ))}
            </div>
            <Link href="/amc/reports" className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-surface-hover">
              <PieChart className="h-3.5 w-3.5" aria-hidden /> Reports
            </Link>
            <Link href="/amc/analytics" className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-surface-hover">
              <BarChart2 className="h-3.5 w-3.5" aria-hidden /> Analytics
            </Link>
            <AppButton variant="secondary" size="icon-sm" aria-label="Refresh" title="Refresh" onClick={fetchRecords}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </AppButton>
            {hasPermission("AMC_CREATE") && (
              <AppButton variant="primary" size="sm" onClick={openCreateModal} leftIcon={<Plus className="h-3.5 w-3.5" />}>
                Add subscription
              </AppButton>
            )}
          </>
        }
      />

      {errorAlert && (
        <div role="alert" className="mb-4 flex items-start gap-2.5 rounded-md border border-danger-border bg-danger-soft p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger-text" aria-hidden />
          <div className="flex-1 text-[13px] text-danger-text">{errorAlert}</div>
        </div>
      )}

      {successAlert && (
        <div role="status" className="mb-4 flex items-center gap-2 rounded-md border border-success-border bg-success-soft p-3 text-[13px] text-success-text">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
          <span>{successAlert}</span>
        </div>
      )}

      {viewMode === 'dashboard' ? (
        <div className="flex-1 overflow-y-auto">
          <AMCExecutiveDashboard 
            records={records}
            departments={departments}
            vendors={vendors}
            isLightMode={isLightMode}
            onSelectRecord={openEditModal}
            onRefresh={fetchRecords}
          />
        </div>
      ) : (
        <AppCard className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
          <div className="flex flex-col justify-between gap-3 border-b border-border bg-surface p-3 sm:flex-row sm:items-center">
            <div className="flex flex-wrap items-center gap-2">
              <AppInput 
                placeholder="Search software, vendor or solution…" 
                aria-label="Search contracts"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full sm:w-72"
              />
              
              {/* Quick Filter Pills */}
              <div className="inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-lg border border-border bg-sunken p-0.5 no-scrollbar" role="radiogroup" aria-label="Filter contracts">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'active', label: 'Active' },
                  { key: 'expiring30', label: 'Expiring in 30 days' },
                  { key: 'expiring60', label: 'Expiring in 60 days' },
                  { key: 'critical_high', label: 'High risk' },
                  { key: 'pending', label: 'Awaiting approval' }
                ].map(item => (
                  <button
                    key={item.key}
                    type="button"
                    role="radio"
                    aria-checked={tableRiskFilter === item.key}
                    onClick={() => setTableRiskFilter(item.key as any)}
                    className={`inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-md px-3 text-[13px] font-medium transition-colors ${tableRiskFilter === item.key ? 'bg-surface font-semibold text-foreground shadow-sm' : 'text-muted hover:text-foreground'}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="shrink-0 text-[12.5px] text-muted">
              <span className="font-medium tabular-nums text-foreground">{filteredDataset.length}</span> of {records.length}
            </div>
          </div>
          
          <div className="flex-1 overflow-auto">
            <AppTable className="w-full whitespace-nowrap text-left">
              <AppTableHeader className="sticky top-0 z-[var(--z-sticky)] bg-surface">
                <AppTableRow>
                  <AppTableHead>Software</AppTableHead>
                  <AppTableHead>Solution</AppTableHead>
                  <AppTableHead>Vendor</AppTableHead>
                  <AppTableHead>Type</AppTableHead>
                  <AppTableHead>Contract value</AppTableHead>
                  <AppTableHead>Per month</AppTableHead>
                  <AppTableHead>Owner</AppTableHead>
                  <AppTableHead>Expires</AppTableHead>
                  <AppTableHead>Approval</AppTableHead>
                  <AppTableHead>Status</AppTableHead>
                  <AppTableHead className="text-right">Actions</AppTableHead>
                </AppTableRow>
              </AppTableHeader>
              <AppTableBody>
                {filteredDataset.length === 0 ? (
                  <AppTableRow>
                    <AppTableCell colSpan={11} className="p-0">
                      <EmptyState
                        kind={records.length === 0 ? "empty" : "no-results"}
                        compact
                        title={records.length === 0 ? "No contracts yet" : "No contracts match these filters"}
                        description={records.length === 0 ? "Add a subscription or AMC to start tracking cost and renewals." : "Try a different search or filter."}
                        action={records.length > 0 ? <AppButton variant="secondary" size="sm" onClick={() => { setSearchQuery(""); setTableRiskFilter('all' as any); }}>Clear filters</AppButton> : undefined}
                      />
                    </AppTableCell>
                  </AppTableRow>
                ) : (
                  filteredDataset.map((rec) => {
                    const today = new Date();
                    let diffDays = 999;
                    if (rec.expiry_date) {
                      const exp = new Date(rec.expiry_date);
                      diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    }
                    let dynamicRisk = rec.risk_level || 'Low';
                    if (diffDays < 0 || rec.status === 'Expired') dynamicRisk = 'Critical';
                    else if (diffDays <= 30) dynamicRisk = 'High';
                    else if (diffDays <= 90) dynamicRisk = 'Medium';

                    const costVal = parseFloat(rec.cost) || 0;
                    const monthlyBurn = rec.monthly_amortized_cost ? parseFloat(rec.monthly_amortized_cost) : (costVal > 0 ? (costVal / 12) : 0);

                    return (
                      <AppTableRow key={rec.id}>
                        <AppTableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 font-medium text-foreground">
                              <span>{rec.software_name}</span>
                              <AppBadge variant={dynamicRisk === 'Critical' ? 'danger' : dynamicRisk === 'High' ? 'warning' : dynamicRisk === 'Medium' ? 'info' : 'neutral'}>
                                {dynamicRisk} risk
                              </AppBadge>
                            </div>
                            {rec.implementation_status && (
                              <div className="text-[12.5px] text-muted">{rec.implementation_status}</div>
                            )}
                          </div>
                        </AppTableCell>
                        <AppTableCell className="text-muted">{rec.solution_name || '—'}</AppTableCell>
                        <AppTableCell>
                          <div className="space-y-0.5">
                            <div className="text-foreground">{rec.vendor_master?.name || '—'}</div>
                            {rec.vendor_rating && (
                              <div className="flex items-center gap-1 text-[12.5px] text-muted">
                                <Star className="h-3 w-3 fill-current text-warning-text" aria-hidden />
                                <span className="tabular-nums">{rec.vendor_rating}</span>
                              </div>
                            )}
                          </div>
                        </AppTableCell>
                        <AppTableCell>
                          <AppBadge variant={rec.contract_type === 'AMC' ? 'accent' : rec.contract_type === 'Subscription' ? 'warning' : 'neutral'}>
                            {rec.contract_type}
                          </AppBadge>
                        </AppTableCell>
                        <AppTableCell>
                          <div className="font-medium tabular-nums text-foreground">
                            ₹ {rec.cost ? Number(rec.cost).toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '0.00'}
                          </div>
                        </AppTableCell>
                        <AppTableCell>
                          <div className="tabular-nums text-foreground">
                            ₹ {monthlyBurn.toLocaleString('en-IN', { maximumFractionDigits: 0 })}<span className="text-[12px] text-muted">/mo</span>
                          </div>
                        </AppTableCell>
                        <AppTableCell>
                          <div className="text-foreground">
                            {rec.user_master?.full_name || <span className="text-muted">Unassigned</span>}
                          </div>
                        </AppTableCell>
                        <AppTableCell>
                          {rec.expiry_date ? (
                            <div className="flex items-center gap-1.5">
                              <span className={diffDays <= 30 ? 'font-medium text-danger-text' : 'text-foreground'}>
                                {formatDate(rec.expiry_date)}
                              </span>
                            </div>
                          ) : <span className="text-muted">—</span>}
                        </AppTableCell>
                        <AppTableCell>
                          <AppBadge variant={rec.approval_status === 'Active' ? 'success' : rec.approval_status === 'Pending Approval' ? 'warning' : 'neutral'}>
                            {rec.approval_status || 'Pending Approval'}
                          </AppBadge>
                        </AppTableCell>
                        <AppTableCell>
                          <AppBadge variant={rec.status === 'Active' ? 'success' : 'danger'}>
                            {rec.status}
                          </AppBadge>
                        </AppTableCell>
                        <AppTableCell className="text-right">
                          {rec.approval_status === 'Pending Approval' && hasPermission("SUPER_ADMIN") && (
                            <>
                              <AppButton variant="secondary" size="sm" onClick={() => handleApprove(rec.id, 'Active')} className="h-7">
                                Approve
                              </AppButton>
                              <AppButton variant="ghost" size="sm" onClick={() => handleApprove(rec.id, 'Rejected')} className="h-7 text-danger-text hover:bg-danger-soft">
                                Reject
                              </AppButton>
                            </>
                          )}
                          <AppButton aria-label="View history" variant="ghost" size="icon-sm" onClick={() => setSelectedHistoryId(rec.id)} title="View history" className="text-muted hover:text-foreground">
                            <Clock className="h-4 w-4" />
                          </AppButton>
                          {hasPermission("AMC_EDIT") && (
                            <AppButton aria-label="Edit contract" variant="ghost" size="icon-sm" onClick={() => openEditModal(rec)} title="Edit contract" className="text-muted hover:text-foreground">
                              <Edit className="h-4 w-4" />
                            </AppButton>
                          )}
                          {hasPermission("AMC_DELETE") && (
                            <AppButton aria-label={`Delete ${rec.software_name}`} variant="ghost" size="icon-sm" onClick={() => handleDelete(rec.id)} className="text-muted hover:bg-danger-soft hover:text-danger-text" title="Delete">
                              <Trash2 className="h-4 w-4" />
                            </AppButton>
                          )}
                        </AppTableCell>
                      </AppTableRow>
                    );
                  })
                )}
              </AppTableBody>
            </AppTable>
          </div>
        </AppCard>
      )}

      {/* History Modal */}
      {selectedHistoryId && (
        <AMCHistoryModal 
          amcId={selectedHistoryId} 
          isLightMode={isLightMode} 
          onClose={() => setSelectedHistoryId(null)} 
        />
      )}

      {manageModalType && (
        <MasterOptionsManager 
          title={manageModalType === "industry" ? "Industry types" : "Vendor types"}
          tableName={manageModalType === "industry" ? "master_industry_types" : "master_vendor_types"}
          options={manageModalType === "industry" ? masterIndustryTypes : masterVendorTypes}
          onClose={() => setManageModalType(null)}
          onUpdate={fetchDependencies}
        />
      )}

      {/* Confirmation Modal when switching from Headwise to Linewise */}
      {showLinewiseConfirmModal && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 bg-[var(--overlay)] animate-in fade-in duration-200">
          <div role="alertdialog" aria-modal="true" aria-labelledby="amc-linewise-title" className="relative w-full max-w-md space-y-4 rounded-lg border border-border bg-surface p-5 shadow-lg">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning-soft text-warning-text">
                <AlertTriangle className="h-5 w-5" aria-hidden />
              </span>
              <div className="space-y-1">
                <h3 id="amc-linewise-title" className="text-[15px] font-semibold text-heading">Switch to line-item totals?</h3>
                <p className="text-[13px] leading-relaxed text-muted">
                  The contract total was entered as one amount (<span className="font-medium text-foreground">{formCurrency} {formCost || "0.00"}</span>). After switching, the total becomes the sum of the line items.
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
              <AppButton 
                type="button" 
                variant="ghost" 
                size="sm"
                onClick={cancelSwitchToLinewise}
              >
                Cancel
              </AppButton>
              <AppButton 
                type="button" 
                variant="primary" 
                size="sm"
                onClick={confirmSwitchToLinewise}
              >
                Switch
              </AppButton>
            </div>
          </div>
        </div>
      )}


      {/* Full-Screen Page View for Add/Edit */}
      {showModal && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex flex-col animate-in slide-in-from-bottom-4 duration-300 bg-surface">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-5 py-3.5">
            <div className="min-w-0">
              <h2 className="truncate text-[17px] font-semibold text-heading">{editRecordId ? "Edit contract" : "New subscription"}</h2>
            </div>
            <div className="flex items-center gap-3">
              {editRecordId && (
                <AppButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleExportDossier}
                  leftIcon={<FileText className="h-4 w-4" />}
                >
                  Export summary
                </AppButton>
              )}
              <AppButton aria-label="Close" title="Close" variant="ghost" size="icon" onClick={() => setShowModal(false)} className="text-muted hover:text-foreground">
                <X className="h-5 w-5" />
              </AppButton>
            </div>
          </div>

          {editRecordId && (
            <>
              {/* One-Line TCO Summary Strip */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-sunken px-5 py-2 text-[12.5px]">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-1.5 text-muted">
                    <span>Initial cost</span>
                    <span className="font-medium tabular-nums text-foreground">
                      {formCurrency} {formPurchaseDate ? `(${formPurchaseDate})` : ''} {computedTotalCost || formCost || '0.00'}
                    </span>
                  </div>
                  <div className="h-3 w-[1px] bg-border hidden sm:block"></div>
                  <div className="flex items-center gap-1.5 text-muted">
                    <span>PO number</span>
                    <span className="font-mono text-foreground">{formPoNumber || 'N/A'}</span>
                  </div>
                  <div className="h-3 w-[1px] bg-border hidden sm:block"></div>
                  <div className="flex items-center gap-1.5 text-muted">
                    <span>Contract type</span>
                    <span className="font-medium text-foreground">{formContractType}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <AppButton 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setActiveTab('Spend History (TCO)')}
                    className="h-7"
                    leftIcon={<TrendingUp className="h-3.5 w-3.5" />}
                  >
                    View spend history
                  </AppButton>
                </div>
              </div>

              {/* Tab Navigation Strip */}
              <div className="shrink-0 border-b border-border bg-surface px-5">
                <div role="tablist" aria-label="Contract sections" className="flex max-w-full gap-1 overflow-x-auto hide-scrollbar">
                  {['Master', 'Implementation', 'Spend History (TCO)', 'Transactions', 'Payments', 'Renewals', 'Allocations', 'Attachments'].map(tab => {
                    let badgeText = null;
                    if (tab === 'Attachments' && existingAttachments.length > 0) {
                      badgeText = `${existingAttachments.length}`;
                    } else if (tab === 'Allocations' && formTotalLicenses) {
                      badgeText = `${formUsedLicenses || 0}/${formTotalLicenses}`;
                    }

                    const isActive = activeTab === tab;

                    return (
                      <button 
                        key={tab}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => setActiveTab(tab)}
                        className={`-mb-px inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          isActive ? 'border-primary text-foreground' : 'border-transparent text-muted hover:text-foreground'
                        }`}
                      >
                        <span>{tab === 'Master' ? 'Details' : tab === 'Spend History (TCO)' ? 'Spend history' : tab}</span>
                        {badgeText && (
                          <span className="rounded-full bg-sunken px-1.5 text-[11px] font-medium tabular-nums text-subtle">
                            {badgeText}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
          
          <div className="flex-1 overflow-y-auto w-full max-w-[98%] mx-auto pb-32">
            <div className={activeTab === 'Master' ? 'block' : 'hidden'}>
              <form onSubmit={(e) => handleSave(e, false)} className="space-y-8 p-5 md:p-6">
            
              {/* VISUAL STEPPER */}
              <ol className="relative mb-2 flex items-start justify-between" aria-label="Steps">
                <div className="absolute left-0 top-4 -z-10 h-0.5 w-full rounded-full bg-border" aria-hidden></div>
                <div className="absolute left-0 top-4 -z-10 h-0.5 rounded-full bg-primary transition-all duration-300" style={{ width: `${((currentStep - 1) / 4) * 100}%` }} aria-hidden></div>
                
                {[
                  { step: 1, label: "General & vendor", icon: Building2 },
                  { step: 2, label: "PO details", icon: FileText },
                  { step: 3, label: "Software details", icon: Layers },
                  { step: 4, label: "Itemwise solutions", icon: Boxes },
                  { step: 5, label: "Attachments & review", icon: FileCheck }
                ].map((s) => (
                  <li key={s.step} className="z-10 flex flex-col items-center gap-1.5 bg-surface px-2 sm:px-3">
                    <AppButton
                      type="button"
                      variant="ghost"
                      disabled={!editRecordId && s.step > currentStep}
                      onClick={() => setCurrentStep(s.step)}
                      aria-current={currentStep === s.step ? "step" : undefined}
                      aria-label={`Step ${s.step}: ${s.label}`}
                      className={`h-8 w-8 min-h-0 shrink-0 rounded-full border-2 p-0 text-[13px] font-semibold tabular-nums transition-colors ${
                        currentStep === s.step ? 'border-primary bg-primary text-primary-foreground hover:bg-primary' :
                          s.step < currentStep ? 'border-primary bg-surface text-primary' :
                          'border-border bg-surface text-muted hover:border-border-active'}`}
                    >
                      {s.step < currentStep ? <Check className="h-4 w-4" /> : s.step}
                    </AppButton>
                    <span className={`max-w-[100px] text-center text-[12.5px] sm:max-w-none ${currentStep === s.step ? 'font-medium text-foreground' : 'text-muted'}`}>{s.label}</span>
                  </li>
                ))}
              </ol>

            {/* STEP 1: GENERAL & CONTRACT DETAILS */}
            {currentStep === 1 && (
              <div className="space-y-6">
                {/* Provider / Vendor Selection & Toggleable Card */}
                <div className="p-6 rounded-lg border bg-surface border-border shadow-sm space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-accent-soft text-accent-soft-text">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-base font-semibold text-foreground flex items-center gap-2">
                          <span className="bg-primary text-primary-foreground h-5 w-5 rounded flex items-center justify-center text-xs">1</span>
                          Provider / vendor profile
                        </h4>
                        <p className="text-xs text-muted mt-0.5">Select a vendor or view and update full vendor contact and banking information.</p>
                      </div>
                    </div>

                    <AppButton 
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowVendorDetails(prev => !prev)}
                      className="h-9 px-3 text-xs gap-2 border-border-active text-accent-soft-text hover:bg-accent-soft transition-all font-semibold shrink-0"
                    >
                      {showVendorDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      {showVendorDetails ? "Close Vendor Details" : "Show Vendor Details"}
                    </AppButton>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="theme-label">Provider / vendor name <span className="text-danger-text">*</span></label>
                      <select 
                        value={formVendorId} 
                        onChange={(e) => handleVendorChange(e.target.value)} 
                        required 
                        className="w-full h-11 px-4 rounded-lg text-sm transition-all outline-none bg-elevated text-foreground border border-border"
                      >
                        <option value="">Select vendor</option>
                        {vendors.map(v => (
                          <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Collapsed Summary Badge when vendor is selected and details are minimized */}
                    {!showVendorDetails && formVendorId && (
                      <div className="p-3.5 rounded-lg border bg-sunken border-border flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in duration-200">
                        <div className="flex flex-wrap items-center gap-4 text-muted">
                          {vendorContactName && (
                            <div><strong className="text-foreground font-semibold">Contact:</strong> {vendorContactName}</div>
                          )}
                          {vendorContactEmail && (
                            <div><strong className="text-foreground font-semibold">Email:</strong> {vendorContactEmail}</div>
                          )}
                          {vendorContactPhone && (
                            <div><strong className="text-foreground font-semibold">Phone:</strong> {vendorContactPhone}</div>
                          )}
                          {taxGstNumber && (
                            <div><strong className="text-foreground font-semibold">GSTIN:</strong> {taxGstNumber}</div>
                          )}
                          {vendorAddrCity && (
                            <div><strong className="text-foreground font-semibold">Location:</strong> {vendorAddrCity}{vendorAddrState ? `, ${vendorAddrState}` : ''}</div>
                          )}
                        </div>
                        <AppButton 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setShowVendorDetails(true)} 
                          className="text-xs text-accent-soft-text hover:underline p-0 h-auto"
                        >
                          View full details →
                        </AppButton>
                      </div>
                    )}

                    {/* Expandable Vendor Details Sub-sections */}
                    {showVendorDetails && (
                      <div className="mt-4 pt-4 border-t border-border space-y-6 animate-in slide-in-from-top-2 duration-300">
                        {/* Industry & Vendor Types */}
                        <div className="space-y-3">
                          <h5 className="text-xs font-semibold text-accent-soft-text">Industry & vendor classification</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="theme-label">Industry type</label>
                              <div className="flex gap-2">
                                <FormMultiSelect 
                                  options={masterIndustryTypes.map(i => ({ value: i.name, label: i.name }))}
                                  selectedValues={formIndustryType}
                                  onChange={(vals) => {
                                    setFormIndustryType(vals);
                                    const validIndustryNames = new Set(vals);
                                    const validVendorTypes = masterVendorTypes
                                      .filter(v => validIndustryNames.has(v.industry_name))
                                      .map(v => v.name);
                                    setFormVendorType(formVendorType.filter(vt => validVendorTypes.includes(vt)));
                                  }}
                                  placeholder="Select industries…"
                                  className="flex-1"
                                  disabled={!!formVendorId}
                                />
                                <AppButton aria-label="Add new industry" type="button" disabled={!!formVendorId} variant="outline" onClick={() => {
                                  openPrompt({
                                    title: "Add new industry type",
                                    placeholder: "Enter new industry type…",
                                    onSubmit: async (newInd) => {
                                      const trimmed = newInd.trim();
                                      if (trimmed) {
                                        await saveMasterEntity("master_industry_types", { name: trimmed });
                                        await fetchDependencies();
                                        setFormIndustryType(prev => [...prev, trimmed]);
                                      }
                                    }
                                  });
                                }} className="h-11 w-11 px-0 shrink-0" title="Add new industry">
                                  <Plus className="h-4 w-4" />
                                </AppButton>
                                <AppButton aria-label="Manage industry types" type="button" disabled={!!formVendorId} variant="outline" onClick={() => setManageModalType("industry")} className="h-11 w-11 px-0 shrink-0 text-muted" title="Manage industry types">
                                  <Settings className="h-4 w-4" />
                                </AppButton>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="theme-label">Vendor type (multi-select)</label>
                              <div className="flex gap-2">
                                <div className="flex-1">
                                  <FormMultiSelect 
                                    options={masterVendorTypes
                                      .filter(v => formIndustryType.length === 0 || formIndustryType.includes(v.industry_name))
                                      .map(v => ({ value: v.name, label: `${v.name} (${v.industry_name})` }))}
                                    selectedValues={formVendorType}
                                    onChange={setFormVendorType}
                                    placeholder={formIndustryType.length > 0 ? "Select vendor types…" : "Select industry first"}
                                    disabled={!!formVendorId || formIndustryType.length === 0}
                                  />
                                </div>
                                {formIndustryType.length > 0 && (
                                  <AppButton aria-label="Add new vendor type" type="button" disabled={!!formVendorId} variant="outline" onClick={() => {
                                    let targetIndustry = formIndustryType[0];
                                    if (formIndustryType.length > 1) {
                                      openPrompt({
                                        title: "Select industry for vendor type",
                                        description: `Available: ${formIndustryType.join(", ")}`,
                                        placeholder: `e.g. ${formIndustryType[0]}`,
                                        defaultValue: formIndustryType[0],
                                        onSubmit: async (choice) => {
                                          const chosen = choice.trim();
                                          if (!formIndustryType.includes(chosen)) {
                                            toast.error("Invalid industry selected. Creation cancelled.");
                                            return;
                                          }
                                          openPrompt({
                                            title: `New Vendor Type for ${chosen}`,
                                            placeholder: "Enter vendor type name...",
                                            onSubmit: async (newVen) => {
                                              const venTrimmed = newVen.trim();
                                              if (venTrimmed) {
                                                await saveMasterEntity("master_vendor_types", { name: venTrimmed, industry_name: chosen });
                                                await fetchDependencies();
                                                setFormVendorType(prev => [...prev, venTrimmed]);
                                              }
                                            }
                                          });
                                        }
                                      });
                                    } else {
                                      openPrompt({
                                        title: `New Vendor Type for ${targetIndustry}`,
                                        placeholder: "Enter vendor type name...",
                                        onSubmit: async (newVen) => {
                                          const venTrimmed = newVen.trim();
                                          if (venTrimmed) {
                                            await saveMasterEntity("master_vendor_types", { name: venTrimmed, industry_name: targetIndustry });
                                            await fetchDependencies();
                                            setFormVendorType(prev => [...prev, venTrimmed]);
                                          }
                                        }
                                      });
                                    }
                                  }} className="h-11 w-11 px-0 shrink-0" title="Add new vendor type">
                                    <Plus className="h-4 w-4" />
                                  </AppButton>
                                )}
                                <AppButton aria-label="Manage vendor types" type="button" disabled={!!formVendorId} variant="outline" onClick={() => setManageModalType("vendor")} className="h-11 w-11 px-0 shrink-0 text-muted" title="Manage vendor types">
                                  <Settings className="h-4 w-4" />
                                </AppButton>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Contact Person & Address */}
                        <div className="space-y-3 pt-4 border-t border-border">
                          <h5 className="text-xs font-semibold text-accent-soft-text">Contact person & address</h5>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                              <label className="text-xs font-semibold text-muted">Contact name <span className="text-danger-text">*</span></label>
                              <AppInput readOnly={!!formVendorId} className={formVendorId ? "bg-surface opacity-70" : ""} value={vendorContactName} onChange={(e) => setVendorContactName(e.target.value)} placeholder="Full name" />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-semibold text-muted">Contact email <span className="text-danger-text">*</span></label>
                              <AppInput type="email" readOnly={!!formVendorId} className={formVendorId ? "bg-surface opacity-70" : ""} value={vendorContactEmail} onChange={(e) => setVendorContactEmail(e.target.value)} placeholder="Email address" />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-semibold text-muted">Phone / ext <span className="text-danger-text">*</span></label>
                              <AppInput readOnly={!!formVendorId} className={formVendorId ? "bg-surface opacity-70" : ""} value={vendorContactPhone} onChange={(e) => setVendorContactPhone(e.target.value)} placeholder="Contact number" />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-semibold text-muted">Pincode / zip</label>
                              <AppInput readOnly={!!formVendorId} className={formVendorId ? "bg-surface opacity-70" : ""} value={vendorAddrPincode} onChange={(e) => setVendorAddrPincode(e.target.value)} placeholder="Pincode" />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <label className="text-xs font-semibold text-muted">Address line 1</label>
                              <AppInput readOnly={!!formVendorId} className={formVendorId ? "bg-surface opacity-70" : ""} value={vendorAddrLine1} onChange={(e) => setVendorAddrLine1(e.target.value)} placeholder="Building, street" />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <label className="text-xs font-semibold text-muted">Address line 2</label>
                              <AppInput readOnly={!!formVendorId} className={formVendorId ? "bg-surface opacity-70" : ""} value={vendorAddrLine2} onChange={(e) => setVendorAddrLine2(e.target.value)} placeholder="Area, landmark" />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <label className="text-xs font-semibold text-muted">State</label>
                              <select disabled={!!formVendorId} value={vendorAddrState} onChange={(e) => {
                                setVendorAddrState(e.target.value);
                                setVendorAddrCity("");
                              }} className={`w-full h-11 px-4 rounded-lg text-sm transition-all focus:ring-2 outline-none ${formVendorId ? "bg-surface opacity-70" : "bg-surface"} border-border text-foreground focus:border-primary focus:ring-ring border`}>
                                <option value="">Select state</option>
                                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <label className="text-xs font-semibold text-muted flex items-center justify-between">
                                <span>City</span>
                                <AppButton aria-label="Add new city" variant="secondary" type="button" onClick={() => handleAddCity(vendorAddrState, setVendorAddrCity)} disabled={!!formVendorId} className="text-accent-soft-text hover:bg-accent-soft rounded-full p-0.5 transition-colors disabled:opacity-50" title="Add new city">
                                  <Plus className="h-4 w-4" />
                                </AppButton>
                              </label>
                              <select value={vendorAddrCity} onChange={(e) => setVendorAddrCity(e.target.value)} disabled={!vendorAddrState || !!formVendorId} className={`w-full h-11 px-4 rounded-lg text-sm transition-all focus:ring-2 outline-none disabled:opacity-50 ${formVendorId ? "bg-surface opacity-70" : "bg-surface"} border-border text-foreground focus:border-primary focus:ring-ring border`}>
                                <option value="">Select city</option>
                                {masterCities.filter(c => c.state_name === vendorAddrState).map(c => <option key={c.id} value={c.city_name}>{c.city_name}</option>)}
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Taxation & Bank Details */}
                        <div className="space-y-3 pt-4 border-t border-border">
                          <h5 className="text-xs font-semibold text-accent-soft-text">Taxation & banking details</h5>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <label className="text-xs font-semibold text-muted">GST number</label>
                              <AppInput readOnly={!!formVendorId} className={formVendorId ? "bg-surface opacity-70" : ""} value={taxGstNumber} onChange={(e) => setTaxGstNumber(e.target.value)} placeholder="GSTIN" />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-semibold text-muted">PAN number</label>
                              <AppInput readOnly={!!formVendorId} className={formVendorId ? "bg-surface opacity-70" : ""} value={taxPanNumber} onChange={(e) => setTaxPanNumber(e.target.value)} placeholder="PAN" />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-semibold text-muted">MSME number</label>
                              <AppInput readOnly={!!formVendorId} className={formVendorId ? "bg-surface opacity-70" : ""} value={formMsmeNumber} onChange={(e) => setFormMsmeNumber(e.target.value)} placeholder="MSME registration number" />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-semibold text-muted">Bank name</label>
                              <AppInput readOnly={!!formVendorId} className={formVendorId ? "bg-surface opacity-70" : ""} value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Bank name" />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-semibold text-muted">Account number</label>
                              <AppInput readOnly={!!formVendorId} className={formVendorId ? "bg-surface opacity-70" : ""} value={bankAccountNo} onChange={(e) => setBankAccountNo(e.target.value)} placeholder="Account no" />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-semibold text-muted">IFSC code</label>
                              <AppInput readOnly={!!formVendorId} className={formVendorId ? "bg-surface opacity-70" : ""} value={bankIfsc} onChange={(e) => setBankIfsc(e.target.value)} placeholder="IFSC code" />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-semibold text-muted">Branch name</label>
                              <AppInput readOnly={!!formVendorId} className={formVendorId ? "bg-surface opacity-70" : ""} value={bankBranch} onChange={(e) => setBankBranch(e.target.value)} placeholder="Branch name" />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-semibold text-muted">Bank state</label>
                              <select disabled={!!formVendorId} value={bankState} onChange={(e) => {
                                setBankState(e.target.value);
                                setBankCity("");
                              }} className={`w-full h-11 px-4 rounded-lg text-sm transition-all focus:ring-2 outline-none ${formVendorId ? "bg-surface opacity-70" : "bg-surface"} border-border text-foreground focus:border-primary focus:ring-ring border`}>
                                <option value="">Select state</option>
                                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-semibold text-muted flex items-center justify-between">
                                <span>Bank city</span>
                                <AppButton aria-label="Add new city" variant="secondary" type="button" onClick={() => handleAddCity(bankState, setBankCity)} disabled={!!formVendorId} className="text-accent-soft-text hover:bg-accent-soft rounded-full p-0.5 transition-colors disabled:opacity-50" title="Add new city">
                                  <Plus className="h-4 w-4" />
                                </AppButton>
                              </label>
                              <select value={bankCity} onChange={(e) => setBankCity(e.target.value)} disabled={!bankState || !!formVendorId} className={`w-full h-11 px-4 rounded-lg text-sm transition-all focus:ring-2 outline-none disabled:opacity-50 ${formVendorId ? "bg-surface opacity-70" : "bg-surface"} border-border text-foreground focus:border-primary focus:ring-ring border`}>
                                <option value="">Select city</option>
                                {masterCities.filter(c => c.state_name === bankState).map(c => <option key={c.id} value={c.city_name}>{c.city_name}</option>)}
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contract Ownership & Parameters Card */}
                <div className="p-6 rounded-lg border bg-surface border-border">
                  <h4 className="text-base font-semibold pb-4 mb-4 border-b border-border flex items-center gap-2">
                    <span className="bg-primary text-primary-foreground h-5 w-5 rounded flex items-center justify-center text-xs">2</span>
                    Contract parameters & ownership
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="theme-label mb-2 block">Contract type <span className="text-danger-text">*</span></label>
                      <div className="flex gap-2 h-11">
                        <select 
                          className={`flex-1 px-4 rounded-lg text-sm transition-all outline-none bg-elevated text-foreground border border-border`}
                          value={formContractType}
                          onChange={e => setFormContractType(e.target.value)}
                        >
                          {masterContractTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                        <AppButton aria-label="Add contract type" 
                          type="button"
                          onClick={handleAddContractType}
                          className="w-11 h-11 flex items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary transition-all flex-shrink-0"
                          title="Add contract type"
                        >
                          <Plus className="h-5 w-5" />
                        </AppButton>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="theme-label">Status <span className="text-danger-text">*</span></label>
                      <select value={formStatus} onChange={(e) => setFormStatus(e.target.value)} className={`w-full h-11 px-4 rounded-lg text-sm transition-all outline-none bg-elevated text-foreground border border-border`}>
                        <option value="" disabled>Select status</option>
                        <option value="Active">Active</option>
                        <option value="Expired">Expired</option>
                        <option value="Renewed">Renewed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="theme-label">Assigned to (owner) <span className="text-danger-text">*</span></label>
                      <select value={formAssignedTo} onChange={(e) => setFormAssignedTo(e.target.value)} className={`w-full h-11 px-4 rounded-lg text-sm transition-all outline-none bg-elevated text-foreground border border-border`}>
                        <option value="">Select owner</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="theme-label">Department <span className="text-danger-text">*</span></label>
                      <select value={formDepartmentId} onChange={(e) => setFormDepartmentId(e.target.value)} className={`w-full h-11 px-4 rounded-lg text-sm transition-all outline-none bg-elevated text-foreground border border-border`}>
                        <option value="">Select department</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="theme-label">Cost center</label>
                      <select value={formCostCenterId} onChange={(e) => setFormCostCenterId(e.target.value)} className={`w-full h-11 px-4 rounded-lg text-sm transition-all outline-none bg-elevated text-foreground border border-border`}>
                        <option value="">Select cost center</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="theme-label">Remind before (days)</label>
                      <AppInput type="number" value={formNotifyBeforeDays} onChange={(e) => setFormNotifyBeforeDays(e.target.value)} min="1" max="365" className="h-11" />
                    </div>
                  </div>
                </div>

                {/* Vendor Performance & SLA Evaluation Scorecard */}
                <div className="p-6 rounded-lg border bg-surface border-border shadow-sm space-y-4">
                  <h4 className="text-base font-semibold pb-4 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="bg-primary text-primary-foreground h-5 w-5 rounded flex items-center justify-center text-xs">3</span>
                      <span>Vendor performance & evaluation scorecard</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-warning-soft text-warning-text border border-border">
                      <Star className="h-3.5 w-3.5 fill-current text-warning-text" />
                      <span>{formVendorRating} / 5.0 Rating</span>
                    </div>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="theme-label">Vendor rating score</label>
                      <select 
                        value={formVendorRating} 
                        onChange={(e) => setFormVendorRating(e.target.value)}
                        className="w-full h-11 px-4 rounded-lg text-sm transition-all outline-none bg-elevated text-foreground border border-border font-semibold"
                      >
                        <option value="5.0">5.0 - Exceptional performance</option>
                        <option value="4.5">4.5 - Exceeds expectations</option>
                        <option value="4.0">4.0 - Meets SLA criteria</option>
                        <option value="3.5">3.5 - Satisfactory</option>
                        <option value="3.0">3.0 - Requires monitoring</option>
                        <option value="2.0">2.0 - Substandard delivery</option>
                        <option value="1.0">1.0 - Critical breaches / escalate</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="theme-label">Contract risk assessment</label>
                      <select
                        value={formRiskLevel}
                        onChange={(e) => setFormRiskLevel(e.target.value)}
                        className="w-full h-11 px-4 rounded-lg text-sm transition-all outline-none bg-elevated text-foreground border border-border font-semibold"
                      >
                        <option value="Low">Low risk (stable operations)</option>
                        <option value="Medium">Medium risk (monitoring needed)</option>
                        <option value="High">High risk (near expiry / SLA issues)</option>
                        <option value="Critical">Critical (immediate action required)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="theme-label">SLA delivery adherence (%)</label>
                      <AppInput 
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={formSlaAdherencePercent}
                        onChange={(e) => setFormSlaAdherencePercent(e.target.value)}
                        placeholder="100.0"
                        className="h-11 font-mono font-semibold text-success-text"
                      />
                    </div>

                    <div className="space-y-2 lg:col-span-3">
                      <label className="theme-label">Procurement & performance assessment notes</label>
                      <AppInput 
                        value={formVendorEvaluationNotes} 
                        onChange={(e) => setFormVendorEvaluationNotes(e.target.value)} 
                        placeholder="e.g., Annual support responsiveness has been strong. Recommended for automatic renewal next cycle."
                        className="h-11"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: PO DETAILS */}
            {currentStep === 2 && (
              <div className="space-y-6">
                {/* PO & Timeline Card */}
                <div className="p-6 rounded-lg border bg-surface border-border shadow-sm">
                  <h4 className="text-base font-semibold pb-4 mb-4 border-b border-border flex items-center gap-2">
                    <span className="bg-primary text-primary-foreground h-5 w-5 rounded flex items-center justify-center text-xs">1</span>
                    Purchase order & timeline
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="theme-label">PO number</label>
                      <AppInput value={formPoNumber} onChange={(e) => setFormPoNumber(e.target.value)} placeholder="e.g., PO-2026-0091" className="h-11" />
                    </div>
                    <div className="space-y-2">
                      <label className="theme-label">PO received date</label>
                      <AppInput type="date" value={formPoDate} onChange={(e) => setFormPoDate(e.target.value)} className="h-11" />
                    </div>
                    <div className="space-y-2">
                      <label className="theme-label">Purchase date <span className="text-danger-text">*</span></label>
                      <AppInput type="date" value={formPurchaseDate} onChange={(e) => setFormPurchaseDate(e.target.value)} required className="h-11" />
                    </div>
                    <div className="space-y-2">
                      <label className="theme-label">Put to use date</label>
                      <AppInput type="date" value={formPutToUseDate} onChange={(e) => {
                        setFormPutToUseDate(e.target.value);
                        if (formRenewalPeriodType) handleRenewalChange(formRenewalPeriodType, e.target.value);
                      }} className="h-11" />
                    </div>
                    <div className="space-y-2">
                      <label className="theme-label">Renewal period</label>
                      <select value={formRenewalPeriodType} onChange={(e) => handleRenewalChange(e.target.value, formPutToUseDate || formPurchaseDate)} className={`w-full h-11 px-4 rounded-lg text-sm transition-all outline-none bg-elevated text-foreground border border-border`}>
                        <option value="">Select</option>
                        <option value="Yearly">Yearly</option>
                        <option value="Half-Yearly">Half-Yearly</option>
                        <option value="Quarterly">Quarterly</option>
                        <option value="Monthly">Monthly</option>
                        <option value="Custom">Custom</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="theme-label">Expiry date</label>
                      <AppInput type="date" value={formExpiryDate} onChange={(e) => setFormExpiryDate(e.target.value)} className="h-11" />
                    </div>
                  </div>
                </div>

                {/* Commercials, Currency & Payment Terms */}
                <div className="p-6 rounded-lg border bg-surface border-border shadow-sm space-y-6">
                  <h4 className="text-base font-semibold pb-4 border-b border-border flex items-center gap-2">
                    <span className="bg-primary text-primary-foreground h-5 w-5 rounded flex items-center justify-center text-xs">2</span>
                    Commercials & payment terms
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="theme-label">Currency</label>
                      <select value={formCurrency} onChange={(e) => setFormCurrency(e.target.value)} className={`w-full h-11 px-4 rounded-lg text-sm transition-all outline-none bg-elevated text-foreground border border-border`}>
                        <option value="INR">INR (₹)</option>
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="theme-label">
                        Total net amount / overall cost
                        {isLineItemWise && <span className="text-[11px] text-accent-soft-text ml-1.5 font-normal">(Auto-calculated)</span>}
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                        <AppInput 
                          type="number" 
                          step="0.01" 
                          value={computedTotalCost} 
                          onChange={(e) => setFormCost(e.target.value)} 
                          className="pl-9 font-semibold h-11" 
                          placeholder="0.00" 
                          disabled={isLineItemWise} 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="theme-label">Payment terms</label>
                      <select value={formPaymentTerms} onChange={(e) => setFormPaymentTerms(e.target.value)} className={`w-full h-11 px-4 rounded-lg text-sm transition-all outline-none bg-elevated text-foreground border border-border`}>
                        <option value="">Select</option>
                        <option value="100%">100%</option>
                        <option value="Monthly">Monthly</option>
                        <option value="Quarter Installment">Quarter installment</option>
                        <option value="50% Advance">50% Advance</option>
                        <option value="Custom">Custom (% / phase wise)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="theme-label">Additional API / support software (if any)</label>
                      <AppInput value={formAdditionalApi} onChange={(e) => setFormAdditionalApi(e.target.value)} placeholder="e.g., twilio SMS, payment gateway API" className="h-11" />
                    </div>
                    <div className="space-y-2">
                      <label className="theme-label">Additional API amount</label>
                      <AppInput type="number" step="0.01" value={formAdditionalApiAmount} onChange={(e) => setFormAdditionalApiAmount(e.target.value)} placeholder="0.00" className="h-11" />
                    </div>
                  </div>

                  {/* Custom Payment Terms Milestone Manager */}
                  {formPaymentTerms === 'Custom' && (
                    <div className="mt-4 pt-5 border-t border-border space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-accent-soft-text" />
                            Custom payment schedule & milestone releases
                          </h5>
                        </div>
                      </div>
                      <CustomPaymentMilestoneManager
                        customType={formPaymentTermsCustomType}
                        onCustomTypeChange={setHeadCustomType}
                        milestones={formPaymentMilestones}
                        onAddMilestone={addHeadPaymentMilestone}
                        onUpdateMilestone={updateHeadPaymentMilestone}
                        onRemoveMilestone={removeHeadPaymentMilestone}
                        totalBaseAmount={parseFloat(computedTotalCost) || 0}
                        currencySymbol={formCurrency === 'USD' ? '$' : formCurrency === 'EUR' ? '€' : formCurrency === 'GBP' ? '£' : '₹'}
                        levelLabel="Contract Headwise"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 3: SOFTWARE DETAILS */}
            {currentStep === 3 && (
              <div className="space-y-6">
                {/* Software Specifications */}
                <div className="p-6 rounded-lg border bg-surface border-border shadow-sm space-y-5">
                  <h4 className="text-base font-semibold pb-4 border-b border-border flex items-center gap-2">
                    <span className="bg-primary text-primary-foreground h-5 w-5 rounded flex items-center justify-center text-xs">1</span>
                    Software specifications
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="theme-label">Software name <span className="text-danger-text">*</span></label>
                      <AppInput value={formSoftwareName} onChange={(e) => setFormSoftwareName(e.target.value)} required placeholder="e.g., salesforce enterprise edition" className="h-11" />
                    </div>
                    <div className="space-y-2">
                      <label className="theme-label">Software / AMC specification</label>
                      <AppInput value={formSpecifications} onChange={(e) => setFormSpecifications(e.target.value)} placeholder="Detailed requirements or specs…" className="h-11" />
                    </div>
                  </div>
                </div>

                {/* License & Usage Tracking */}
                <div className="p-6 rounded-lg border bg-surface border-border shadow-sm">
                  <h4 className="text-base font-semibold pb-4 mb-4 border-b border-border flex items-center gap-2">
                    <span className="bg-primary text-primary-foreground h-5 w-5 rounded flex items-center justify-center text-xs">2</span>
                    License & usage tracking
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="theme-label">Total licenses purchased</label>
                      <AppInput type="number" value={formTotalLicenses} onChange={(e) => setFormTotalLicenses(e.target.value)} placeholder="e.g., 50" min="0" className="h-11" />
                    </div>
                    <div className="space-y-2">
                      <label className="theme-label">Licenses in use</label>
                      <AppInput type="number" value={formUsedLicenses} onChange={(e) => setFormUsedLicenses(e.target.value)} placeholder="e.g., 42" min="0" className="h-11" />
                    </div>
                    <div className="space-y-2">
                      <label className="theme-label">Cost per license</label>
                      <AppInput type="number" value={computedCostPerLicense} onChange={(e) => setFormCostPerLicense(e.target.value)} placeholder="Auto-calculated" readOnly className="h-11 opacity-70" />
                    </div>
                  </div>
                </div>

                {/* SLA & Support */}
                <div className="p-6 rounded-lg border bg-surface border-border shadow-sm">
                  <h4 className="text-base font-semibold pb-4 mb-4 border-b border-border flex items-center gap-2">
                    <span className="bg-primary text-primary-foreground h-5 w-5 rounded flex items-center justify-center text-xs">3</span>
                    SLA & support terms
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="theme-label">Support tier</label>
                      <select value={formSupportTier} onChange={(e) => setFormSupportTier(e.target.value)} className={`w-full h-11 px-4 rounded-lg text-sm transition-all outline-none bg-elevated text-foreground border border-border`}>
                        <option value="">Select</option>
                        <option value="Standard Business Hours">Standard business hours</option>
                        <option value="Premium 24x5">Premium 24x5</option>
                        <option value="Enterprise 24x7">Enterprise 24x7</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="theme-label">Guaranteed uptime (%)</label>
                      <AppInput type="number" step="0.01" value={formSlaUptime} onChange={(e) => setFormSlaUptime(e.target.value)} placeholder="e.g., 99.9" min="0" max="100" className="h-11" />
                    </div>
                    <div className="space-y-2">
                      <label className="theme-label">Resolution TAT (Turnaround Time)</label>
                      <AppInput value={formSlaTat} onChange={(e) => setFormSlaTat(e.target.value)} placeholder="e.g., 4 hours for p1, 24 hours for p2" className="h-11" />
                    </div>
                    <div className="space-y-2">
                      <label className="theme-label">SLA adherence target (%)</label>
                      <AppInput type="number" step="0.1" min="0" max="100" value={formSlaAdherencePercent} onChange={(e) => setFormSlaAdherencePercent(e.target.value)} placeholder="e.g., 99.5" className="h-11 font-mono font-semibold" />
                    </div>
                  </div>
                </div>

                {/* Governance & Compliance */}
                <div className="p-6 rounded-lg border overflow-hidden bg-surface border-border shadow-sm">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                    <div className={`p-2 rounded-lg bg-accent-soft text-primary`}>
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground">Governance & compliance</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-2">
                      <label className="theme-label">Data classification</label>
                      <select value={formDataClassification} onChange={(e) => setFormDataClassification(e.target.value)} className={`w-full h-11 px-4 rounded-lg text-sm transition-all outline-none bg-elevated text-foreground border border-border`}>
                        <option value="">Select</option>
                        <option value="Public">Public</option>
                        <option value="Internal">Internal</option>
                        <option value="Confidential">Confidential</option>
                        <option value="Restricted/PII">Restricted / PII</option>
                        <option value="Financial">Financial data</option>
                      </select>
                    </div>
                    <div className="space-y-2 lg:col-span-2">
                      <label className="theme-label">Compliance status</label>
                      <FormMultiSelect 
                        options={[
                          {value: "GDPR Compliant", label: "GDPR Compliant"},
                          {value: "SOC2 Type II", label: "SOC2 Type II"},
                          {value: "ISO 27001", label: "ISO 27001"},
                          {value: "HIPAA", label: "HIPAA"},
                          {value: "PCI-DSS", label: "PCI-DSS"}
                        ]}
                        selectedValues={formComplianceStatus}
                        onChange={setFormComplianceStatus}
                        placeholder="Select compliance standards…"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="theme-label">InfoSec approved date</label>
                      <AppInput type="date" value={formInfosecApprovedDate} onChange={(e) => setFormInfosecApprovedDate(e.target.value)} className="h-11" />
                    </div>
                    <div className="space-y-2 lg:col-span-2 flex items-end">
                      <div className="flex items-center gap-3 h-11">
                        <input type="checkbox" id="dpa_signed" checked={formDpaSigned} onChange={(e) => setFormDpaSigned(e.target.checked)} className="w-5 h-5 rounded text-primary focus:ring-ring bg-elevated border-border" />
                        <label htmlFor="dpa_signed" className="font-medium text-sm cursor-pointer">Data processing agreement (DPA) signed</label>
                      </div>
                    </div>
                    {formDpaSigned && (
                      <div className="space-y-2">
                        <label className="theme-label">DPA signed date</label>
                        <AppInput type="date" value={formDpaSignedDate} onChange={(e) => setFormDpaSignedDate(e.target.value)} className="h-11" required />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: ITEMWISE SOLUTIONS */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="p-6 rounded-lg border overflow-hidden bg-surface border-border shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
                    <div>
                      <h4 className="text-base font-semibold flex items-center gap-2">
                        <span className="bg-primary text-primary-foreground h-5 w-5 rounded flex items-center justify-center text-xs">1</span>
                        Solution name & line items
                      </h4>
                    </div>
                    <AppButton type="button" variant="outline" size="sm" onClick={addLineItem} leftIcon={<Plus className="h-4 w-4" />}>
                      Add line item
                    </AppButton>
                  </div>

                  {/* Checkbox for Linewise vs Headwise calculation */}
                  <div className="p-4 rounded-lg border bg-sunken border-border flex items-start sm:items-center justify-between gap-4 transition-all">
                    <div className="flex items-start gap-3">
                      <input 
                        type="checkbox" 
                        id="line_item_wise_calc" 
                        checked={isLineItemWise} 
                        onChange={(e) => handleToggleLineItemWise(e.target.checked)} 
                        className="w-5 h-5 mt-0.5 sm:mt-0 rounded text-primary focus:ring-ring bg-surface border-border cursor-pointer shrink-0" 
                      />
                      <div>
                        <label htmlFor="line_item_wise_calc" className="font-semibold text-sm text-foreground cursor-pointer flex flex-wrap items-center gap-2">
                          <span>Calculate amount line-item wise</span>
                          {isLineItemWise ? (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-accent-soft text-accent-soft-text font-semibold border border-border-active">Linewise calculation active</span>
                          ) : (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted/10 text-muted font-semibold border border-border">Headwise (manual overall) active</span>
                          )}
                        </label>
                        <p className="text-xs text-muted mt-0.5">
                          {isLineItemWise 
                            ? "When enabled, Quantity and Rate per line item are mandatory and automatically calculate the Total Net Amount." 
                            : "When unticked, line items do not require Rate calculations. Total Net Amount is controlled at PO Details."}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {solutionLineItems.length === 0 ? (
                      <div className="py-8 text-center text-muted border border-border bg-sunken/40 rounded-lg">
                        No line items added yet. Click "Add Line Item" to define specific software modules or products.
                      </div>
                    ) : (
                      solutionLineItems.map((item, index) => (
                        <div key={item.id} className="p-5 border border-border bg-background/50 rounded-lg space-y-4 relative group hover:border-border-active transition-colors">
                          <div className="flex items-center justify-between pb-2 border-b border-border/40">
                            <div className="text-xs font-semibold text-accent-soft-text flex items-center gap-2">
                              <span>Item #{index + 1}</span>
                              {item.resolutionName && <span className="text-foreground font-semibold">({item.resolutionName})</span>}
                            </div>
                            <AppButton aria-label="Close" variant="secondary" type="button" onClick={() => removeLineItem(item.id)} className="p-1.5 rounded bg-danger-soft text-danger-text hover:bg-danger-soft transition-colors">
                              <X className="h-4 w-4" />
                            </AppButton>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-2">
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-muted">
                                Resolution name {isLineItemWise && <span className="text-danger-text">*</span>}
                              </label>
                              <AppInput value={item.resolutionName} onChange={(e) => handleLineItemChange(item.id, "resolutionName", e.target.value)} placeholder="e.g., module / product name" className="h-10 text-sm" />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-muted">License key</label>
                              <div className="relative">
                                <AppInput type={revealedLicenseKeys[item.id] ? "text" : "password"} value={item.licenseKey || ""} onChange={(e) => handleLineItemChange(item.id, "licenseKey", e.target.value)} placeholder="License key" className="h-10 text-sm pr-8" />
                                {item.licenseKey && (
                                  <AppButton variant="secondary" type="button" onClick={revealedLicenseKeys[item.id] ? () => setRevealedLicenseKeys(p => ({...p, [item.id]: false})) : () => setRevealLicenseModal({ show: true, lineItemId: item.id, amcId: editRecordId || "" })} className="absolute right-1 top-1.5 text-muted hover:text-subtle p-1 h-7">
                                    {revealedLicenseKeys[item.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </AppButton>
                                )}
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-muted">Remark</label>
                              <AppInput value={item.remark} onChange={(e) => handleLineItemChange(item.id, "remark", e.target.value)} placeholder="Remark or notes" className="h-10 text-sm" />
                            </div>
                          </div>

                          {/* Line Item Dates: Purchase Date *, Put to Use Date, Renewal Period, Expiry Date */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-3 rounded-lg bg-sunken border border-border">
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-muted">
                                Purchase date <span className="text-danger-text">*</span>
                              </label>
                              <AppInput 
                                type="date" 
                                value={item.purchaseDate || ""} 
                                onChange={(e) => handleLineItemChange(item.id, "purchaseDate", e.target.value)} 
                                className="h-10 text-sm" 
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-muted">
                                Put to use date
                              </label>
                              <AppInput 
                                type="date" 
                                value={item.putToUseDate || ""} 
                                onChange={(e) => handleLineItemChange(item.id, "putToUseDate", e.target.value)} 
                                className="h-10 text-sm" 
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-muted">
                                Renewal period
                              </label>
                              <select 
                                value={item.renewalPeriodType || ""} 
                                onChange={(e) => handleLineItemChange(item.id, "renewalPeriodType", e.target.value)} 
                                className="w-full h-10 px-3 rounded-lg text-sm transition-all focus:ring-2 outline-none bg-surface border-border text-foreground focus:border-primary focus:ring-ring border"
                              >
                                <option value="">Select</option>
                                <option value="Yearly">Yearly</option>
                                <option value="Half-Yearly">Half-Yearly</option>
                                <option value="Quarterly">Quarterly</option>
                                <option value="Monthly">Monthly</option>
                                <option value="Custom">Custom</option>
                              </select>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-muted">
                                Expiry date
                              </label>
                              <AppInput 
                                type="date" 
                                value={item.expiryDate || item.customRenewalDate || ""} 
                                onChange={(e) => handleLineItemChange(item.id, "expiryDate", e.target.value)} 
                                className="h-10 text-sm" 
                              />
                            </div>
                          </div>

                          {/* Commercials: Qty, Rate, Taxes, Discount, Net Amount */}
                          <div className={`grid grid-cols-2 md:grid-cols-3 ${isLineItemWise ? 'lg:grid-cols-7' : 'lg:grid-cols-2'} gap-4 items-start`}>
                            <div className="space-y-1.5 col-span-1">
                              <label className="text-xs font-semibold text-muted">
                                Qty {isLineItemWise && <span className="text-danger-text">*</span>}
                              </label>
                              <AppInput type="number" value={item.qty} onChange={(e) => handleLineItemChange(item.id, "qty", e.target.value)} className="h-10 text-sm" min={1} />
                            </div>

                            {isLineItemWise && (
                              <>
                                <div className="space-y-1.5 col-span-1">
                                  <label className="text-xs font-semibold text-muted">
                                    Rate <span className="text-danger-text">*</span>
                                  </label>
                                  <AppInput type="number" step="0.01" value={item.rate} onChange={(e) => handleLineItemChange(item.id, "rate", e.target.value)} className="h-10 text-sm px-2" />
                                </div>
                                <div className="space-y-1.5 col-span-1">
                                  <label className="text-xs font-semibold text-muted">CGST (%)</label>
                                  <div className="flex flex-col gap-1">
                                    <AppInput type="number" value={item.cgstPercent} onChange={(e) => handleLineItemChange(item.id, "cgstPercent", e.target.value)} className="h-10 text-sm px-2" placeholder="%" />
                                    <span className="text-[11px] text-muted truncate leading-none">Amt: {item.cgstAmount?.toFixed(2) || "0.00"}</span>
                                  </div>
                                </div>
                                <div className="space-y-1.5 col-span-1">
                                  <label className="text-xs font-semibold text-muted">SGST (%)</label>
                                  <div className="flex flex-col gap-1">
                                    <AppInput type="number" value={item.sgstPercent} onChange={(e) => handleLineItemChange(item.id, "sgstPercent", e.target.value)} className="h-10 text-sm px-2" placeholder="%" />
                                    <span className="text-[11px] text-muted truncate leading-none">Amt: {item.sgstAmount?.toFixed(2) || "0.00"}</span>
                                  </div>
                                </div>
                                <div className="space-y-1.5 col-span-1">
                                  <label className="text-xs font-semibold text-muted">IGST (%)</label>
                                  <div className="flex flex-col gap-1">
                                    <AppInput type="number" value={item.igstPercent} onChange={(e) => handleLineItemChange(item.id, "igstPercent", e.target.value)} className="h-10 text-sm px-2" placeholder="%" />
                                    <span className="text-[11px] text-muted truncate leading-none">Amt: {item.igstAmount?.toFixed(2) || "0.00"}</span>
                                  </div>
                                </div>
                                <div className="space-y-1.5 col-span-1">
                                  <label className="text-xs font-semibold text-muted">Discount</label>
                                  <AppInput type="number" value={item.discount} onChange={(e) => handleLineItemChange(item.id, "discount", e.target.value)} className="h-10 text-sm px-2" />
                                </div>
                                <div className="space-y-1.5 col-span-1">
                                  <label className="text-xs font-semibold text-muted">Net amount</label>
                                  <div className="h-10 px-2 rounded-lg border bg-surface/80 border-border flex items-center justify-between font-mono font-semibold text-xs text-accent-soft-text">
                                    <span>{formCurrency === 'INR' ? '₹' : formCurrency === 'USD' ? '$' : formCurrency === 'EUR' ? '€' : '£'}</span>
                                    <span className="truncate">{item.netAmount?.toFixed(2) || "0.00"}</span>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>

                          {/* Additional API / Support Software on Line Item */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-muted">Additional API / support software (if any)</label>
                              <AppInput value={item.additionalApi || ""} onChange={(e) => handleLineItemChange(item.id, "additionalApi", e.target.value)} placeholder="e.g., twilio SMS, maps API, payment gateway" className="h-10 text-sm" />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-muted">Additional API amount</label>
                              <AppInput type="number" step="0.01" value={item.additionalApiAmount ?? ""} onChange={(e) => handleLineItemChange(item.id, "additionalApiAmount", e.target.value)} placeholder="0.00" className="h-10 text-sm" />
                            </div>
                          </div>

                          {/* Line Item Payment Terms */}
                          <div className="pt-3 border-t border-border space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-accent-soft-text" />
                                <span className="text-xs font-semibold text-foreground">Line item payment terms</span>
                              </div>
                              <div className="w-full sm:w-64">
                                <select
                                  value={item.paymentTerms || ""}
                                  onChange={(e) => handleLineItemChange(item.id, "paymentTerms", e.target.value)}
                                  className="w-full h-9 px-3 rounded-lg text-xs font-medium border bg-surface border-border text-foreground outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                                >
                                  <option value="">Inherit contract terms</option>
                                  <option value="100%">100%</option>
                                  <option value="Monthly">Monthly</option>
                                  <option value="Quarter Installment">Quarter installment</option>
                                  <option value="50% Advance">50% Advance</option>
                                  <option value="Custom">Custom (% / phase wise)</option>
                                </select>
                              </div>
                            </div>

                            {item.paymentTerms === "Custom" && (
                              <CustomPaymentMilestoneManager
                                customType={item.paymentTermsCustomType || 'phase_wise'}
                                onCustomTypeChange={(t) => setLineItemCustomType(item.id, t)}
                                milestones={item.paymentMilestones || []}
                                onAddMilestone={() => addLineItemPaymentMilestone(item.id)}
                                onUpdateMilestone={(mId, field, val) => updateLineItemPaymentMilestone(item.id, mId, field, val)}
                                onRemoveMilestone={(mId) => removeLineItemPaymentMilestone(item.id, mId)}
                                totalBaseAmount={Number(item.netAmount) || 0}
                                currencySymbol={formCurrency === 'USD' ? '$' : formCurrency === 'EUR' ? '€' : formCurrency === 'GBP' ? '£' : '₹'}
                                levelLabel={`Line Item: ${item.resolutionName || 'Item'}`}
                              />
                            )}
                          </div>

                          {/* Line Item Attachments Box */}
                          <div className="pt-3 border-t border-border space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Paperclip className="h-4 w-4 text-accent-soft-text" />
                                <span className="text-xs font-semibold text-foreground">Line item documents & attachments</span>
                                <span className="text-[11px] text-danger-text font-semibold bg-danger-soft px-2 py-0.5 rounded-full">PO & agreement mandatory</span>
                              </div>
                              <AppButton 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                onClick={() => addLineItemAttachment(item.id)} 
                                leftIcon={<Plus className="h-3.5 w-3.5" />}
                                className="h-8 text-xs"
                              >
                                Attach document
                              </AppButton>
                            </div>

                            {/* Staged Line Item Attachments */}
                            {(lineItemAttachments[item.id] || []).length > 0 && (
                              <div className="space-y-2">
                                {(lineItemAttachments[item.id] || []).map((entry) => (
                                  <div key={entry.id} className="flex flex-col sm:flex-row sm:items-center gap-2 p-2.5 rounded-lg border bg-surface/60 border-border">
                                    <select 
                                      value={entry.docName} 
                                      onChange={(e) => updateLineItemAttachment(item.id, entry.id, 'docName', e.target.value)}
                                      className="w-full sm:w-52 h-9 px-2.5 rounded-lg text-xs border outline-none focus:ring-2 focus:ring-ring bg-surface border-border text-foreground font-medium"
                                    >
                                      <option value="Purchase Order">Purchase order (PO) *</option>
                                      <option value="Agreement">Agreement / contract *</option>
                                      <option value="Invoice">Invoice</option>
                                      <option value="SOP Document">SOP document</option>
                                      <option value="Sign Off Document">Sign off document</option>
                                      <option value="Other">Other</option>
                                    </select>
                                    <input 
                                      type="file" 
                                      onChange={(e) => updateLineItemAttachment(item.id, entry.id, 'file', e.target.files?.[0] || null)}
                                      className="flex-1 w-full text-xs text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-accent-soft file:text-accent-soft-text hover:file:bg-accent-soft cursor-pointer"
                                    />
                                    <AppButton aria-label="Close" 
                                      variant="secondary" 
                                      type="button" 
                                      onClick={() => removeLineItemAttachment(item.id, entry.id)} 
                                      className="p-1.5 text-danger-text hover:bg-danger-soft rounded-lg transition-colors h-8 w-8 shrink-0"
                                    >
                                      <X className="h-4 w-4" />
                                    </AppButton>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Existing uploaded Line Item Attachments */}
                            {existingAttachments.filter(f => getLineItemIdFromFileName(f.name) === item.id).length > 0 && (
                              <div className="space-y-1.5 pt-1">
                                <div className="text-[11px] font-semibold text-muted">Uploaded line item documents:</div>
                                <div className="flex flex-col gap-1.5">
                                  {existingAttachments.filter(f => getLineItemIdFromFileName(f.name) === item.id).map((file, fIdx) => (
                                    <div key={fIdx} className="flex items-center justify-between p-2 rounded-lg border bg-surface/50 border-border text-xs">
                                      <div className="flex items-center gap-2 overflow-hidden">
                                        <Paperclip className="h-3.5 w-3.5 text-accent-soft-text shrink-0" />
                                        <span className="truncate">{formatFileName(file.name)}</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <AppButton aria-label="View document" 
                                          type="button" 
                                          variant="ghost" 
                                          size="sm" 
                                          onClick={() => {
                                            const url = supabase.storage.from('amc-attachments').getPublicUrl(`${editRecordId}/${file.name}`).data.publicUrl;
                                            window.open(url, '_blank', 'noopener,noreferrer');
                                          }} 
                                          className="h-7 w-7 p-0 text-accent hover:bg-accent-soft"
                                          title="View document"
                                        >
                                          <Eye className="h-3.5 w-3.5" />
                                        </AppButton>
                                        <AppButton aria-label="Download document" 
                                          type="button" 
                                          variant="ghost" 
                                          size="sm" 
                                          onClick={() => {
                                            const url = supabase.storage.from('amc-attachments').getPublicUrl(`${editRecordId}/${file.name}`).data.publicUrl;
                                            const a = document.createElement('a');
                                            a.href = `${url}${url.includes('?') ? '&' : '?'}download=1`;
                                            a.download = file.name;
                                            document.body.appendChild(a);
                                            a.click();
                                            document.body.removeChild(a);
                                          }} 
                                          className="h-7 w-7 p-0 text-accent-soft-text hover:bg-accent-soft"
                                          title="Download document"
                                        >
                                          <Download className="h-3.5 w-3.5" />
                                        </AppButton>
                                        {hasPermission("AMC_DELETE") && (
                                          <AppButton aria-label="Delete" type="button" variant="ghost" size="sm" onClick={() => deleteAttachment(file.name)} className="h-7 w-7 p-0 text-danger-text hover:bg-danger-soft">
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </AppButton>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {isLineItemWise && (
                            <div className="pt-3 mt-2 border-t border-border flex items-center justify-end">
                              <div className="text-sm font-semibold text-muted mr-3">Item net amount:</div>
                              <div className="text-xl font-semibold text-accent-soft-text">{formCurrency === 'INR' ? '₹' : formCurrency === 'USD' ? '$' : formCurrency === 'EUR' ? '€' : '£'} {item.netAmount?.toFixed(2) || "0.00"}</div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                    
                    {isLineItemWise ? (
                      <div className="p-5 border border-border bg-surface rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                        <div className="text-xs font-semibold text-muted">
                          Line-item wise total calculated ({solutionLineItems.length} item{solutionLineItems.length === 1 ? '' : 's'})
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-base font-semibold text-muted">Total net amount:</div>
                          <div className="text-2xl font-semibold text-success-text">
                            {formCurrency === 'INR' ? '₹' : formCurrency === 'USD' ? '$' : formCurrency === 'EUR' ? '€' : '£'}{' '}
                            {solutionLineItems.reduce((sum, i) => sum + (Number(i.netAmount) || 0), 0).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-5 border border-border bg-surface rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                        <div>
                          <label className="text-sm font-semibold text-foreground block">
                            Total net amount (manual headwise)
                          </label>
                          <p className="text-xs text-muted mt-0.5">Overall cost is managed at PO details step.</p>
                        </div>
                        <div className="relative w-full sm:w-64">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                          <AppInput 
                            type="number" 
                            step="0.01" 
                            value={formCost} 
                            onChange={(e) => setFormCost(e.target.value)} 
                            placeholder="0.00" 
                            className="pl-9 font-semibold text-lg"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: ATTACHMENTS & REVIEW */}
            {currentStep === 5 && (
              <div className="space-y-6">
                {/* Contract Head Documents */}
                <div className="p-6 rounded-lg border bg-surface border-border shadow-sm space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-border">
                    <div className="flex items-center gap-2">
                      <span className="bg-primary text-primary-foreground h-5 w-5 rounded flex items-center justify-center text-xs">1</span>
                      <h4 className="text-base font-semibold text-foreground">Contract documents & attachments</h4>
                    </div>
                    <AppButton type="button" variant="outline" size="sm" onClick={() => {
                      setAttachments(prev => [...prev, { id: Math.random().toString(36).substring(2, 9), docName: "Purchase Order", file: null }]);
                    }} leftIcon={<Plus className="h-4 w-4" />}>
                      Add document
                    </AppButton>
                  </div>

                  {/* Mandatory Notice */}
                  <div className="p-4 rounded-lg bg-warning-soft border border-border flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-warning-text shrink-0 mt-0.5" />
                    <div className="text-xs text-muted leading-relaxed">
                      <strong className="font-semibold text-warning-text">Mandatory Documents:</strong> Both <span className="underline font-semibold text-foreground">Purchase order (PO)</span> and <span className="underline font-semibold text-foreground">Agreement / contract</span> documents must be attached for this contract before finalizing.
                    </div>
                  </div>

                  <div className="space-y-3">
                    {attachments.map(entry => (
                      <div key={entry.id} className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border bg-elevated border-border`}>
                        <select 
                          value={entry.docName} 
                          onChange={(e) => setAttachments(prev => prev.map(a => a.id === entry.id ? { ...a, docName: e.target.value } : a))}
                          className={`w-full sm:w-56 h-10 px-3 rounded-lg text-sm border outline-none focus:ring-2 focus:ring-ring bg-surface border-border text-foreground font-medium`}
                        >
                          <option value="Purchase Order">Purchase order (PO) *</option>
                          <option value="Agreement">Agreement / contract *</option>
                          <option value="Invoice">Invoice</option>
                          <option value="SOP Document">SOP document</option>
                          <option value="Sign Off Document">Sign off document</option>
                          <option value="Other">Other</option>
                        </select>
                        <input 
                          type="file" 
                          onChange={(e) => setAttachments(prev => prev.map(a => a.id === entry.id ? { ...a, file: e.target.files?.[0] || null } : a))} 
                          className="flex-1 w-full text-sm text-muted file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-accent-soft file:text-accent-soft-text hover:file:bg-accent-soft cursor-pointer"
                        />
                        <AppButton aria-label="Close" variant="secondary" type="button" onClick={() => setAttachments(prev => prev.filter(a => a.id !== entry.id))} className="p-2 text-danger-text hover:bg-danger-soft rounded-lg transition-colors">
                          <X className="h-4 w-4" />
                        </AppButton>
                      </div>
                    ))}
                    {attachments.length === 0 && (
                      <div className="text-sm text-muted italic p-6 text-center border border-border bg-sunken/40 rounded-lg">
                        No new contract documents staged for upload. Click "Add Document" above to attach.
                      </div>
                    )}
                  </div>

                  {existingAttachments.filter(f => !getLineItemIdFromFileName(f.name)).length > 0 && (
                    <div className="space-y-2 pt-4 border-t border-border">
                      <label className="theme-label">Existing contract attachments</label>
                      <div className="flex flex-col gap-2">
                        {existingAttachments.filter(f => !getLineItemIdFromFileName(f.name)).map((file, idx) => (
                          <div key={idx} className={`flex items-center justify-between p-3 rounded-lg border bg-elevated border-border`}>
                            <div className="flex items-center gap-3 text-sm overflow-hidden">
                              <div className="p-2 bg-accent-soft text-accent-soft-text rounded shrink-0">
                                <Paperclip className="h-4 w-4" />
                              </div>
                              <span className="truncate" title={file.name}>{formatFileName(file.name)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <AppButton aria-label="View document" 
                                type="button" 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => {
                                  const url = supabase.storage.from('amc-attachments').getPublicUrl(`${editRecordId}/${file.name}`).data.publicUrl;
                                  window.open(url, '_blank', 'noopener,noreferrer');
                                }}
                                className="h-8 w-8 p-0 text-accent hover:bg-accent-soft"
                                title="View document"
                              >
                                <Eye className="h-4 w-4" />
                              </AppButton>
                              <AppButton aria-label="Download document" 
                                type="button" 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => {
                                  const url = supabase.storage.from('amc-attachments').getPublicUrl(`${editRecordId}/${file.name}`).data.publicUrl;
                                  const a = document.createElement('a');
                                  a.href = `${url}${url.includes('?') ? '&' : '?'}download=1`;
                                  a.download = file.name;
                                  document.body.appendChild(a);
                                  a.click();
                                  document.body.removeChild(a);
                                }}
                                className="h-8 w-8 p-0 text-accent-soft-text hover:bg-accent-soft"
                                title="Download document"
                              >
                                <Download className="h-4 w-4" />
                              </AppButton>
                              {hasPermission("AMC_DELETE") && (
                                <AppButton aria-label="Delete" type="button" variant="ghost" size="sm" onClick={() => deleteAttachment(file.name)}>
                                  <Trash2 className="h-4 w-4 text-danger-text" />
                                </AppButton>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Additional Notes */}
                <div className="p-6 rounded-lg border bg-surface border-border shadow-sm space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="bg-primary text-primary-foreground h-5 w-5 rounded flex items-center justify-center text-xs">2</span>
                    <h4 className="text-base font-semibold text-foreground">Additional notes & remarks</h4>
                  </div>
                  <textarea 
                    value={formNotes} 
                    onChange={(e) => setFormNotes(e.target.value)} 
                    className={`w-full p-4 rounded-lg text-sm transition-all focus:ring-2 outline-none resize-none min-h-[120px] bg-elevated border-border text-foreground focus:border-primary focus:ring-ring border`} 
                    placeholder="Any additional details, terms and conditions, or internal comments…" 
                  />
                </div>

                {/* Final Review Summary Card */}
                <div className="p-6 rounded-lg border bg-sunken border-border shadow-sm space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-border">
                    <ClipboardCheck className="h-5 w-5 text-accent-soft-text" />
                    <h4 className="text-base font-semibold text-foreground">Contract review summary</h4>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div className="space-y-1">
                      <span className="text-muted font-medium">Provider / Vendor:</span>
                      <p className="font-semibold text-foreground truncate">{vendors.find(v => v.id === formVendorId)?.name || 'Not selected'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted font-medium">Software Name:</span>
                      <p className="font-semibold text-foreground truncate">{formSoftwareName || 'Not specified'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted font-medium">Contract type & status:</span>
                      <p className="font-semibold text-foreground">{formContractType} ({formStatus})</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted font-medium">PO Number:</span>
                      <p className="font-semibold text-foreground">{formPoNumber || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted font-medium">Purchase / Expiry:</span>
                      <p className="font-semibold text-foreground">{formPurchaseDate || 'N/A'} → {formExpiryDate || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted font-medium">Total overall cost:</span>
                      <p className="font-semibold text-success-text text-sm font-mono">{formCurrency} {computedTotalCost || '0.00'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted font-medium">Line Items:</span>
                      <p className="font-semibold text-foreground">{solutionLineItems.length} item(s) {isLineItemWise ? '(Linewise)' : '(Headwise)'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted font-medium">Payment Terms:</span>
                      <p className="font-semibold text-foreground">{formPaymentTerms || 'Standard'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* MODAL NAVIGATION FOOTER */}
            <div className="fixed bottom-0 left-0 w-full p-4 border-t shadow-lg flex items-center justify-between gap-4 z-50 bg-surface border-border">
              <div className="w-full max-w-[98%] mx-auto flex justify-between items-center gap-4">
                <div className="text-sm font-medium text-muted">
                  Step {currentStep} of 5
                </div>
                <div className="flex justify-end gap-4 shrink-0">
                  <AppButton type="button" variant="outline" size="lg" onClick={() => setShowModal(false)} disabled={uploading}>
                    Cancel
                  </AppButton>
                  
                  {currentStep > 1 && (
                    <AppButton type="button" variant="secondary" size="lg" onClick={() => setCurrentStep(prev => prev - 1)} disabled={uploading}>
                      Previous
                    </AppButton>
                  )}
                  
                  {currentStep < 5 ? (
                    <AppButton type="button" variant="primary" size="lg" onClick={(e) => handleSave(e, true)} disabled={uploading} leftIcon={uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : undefined} className="min-w-[200px]">
                      {uploading ? 'Saving Data...' : 'Save & Next'}
                    </AppButton>
                  ) : (
                    <AppButton type="submit" variant="primary" size="lg" disabled={uploading} leftIcon={uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />} className="min-w-[200px]">
                      {uploading ? 'Finalizing...' : 'Complete & Save'}
                    </AppButton>
                  )}
                </div>
              </div>
            </div>
            
          </form>
            </div>

            {activeTab === 'Implementation' && editRecordId && (
              <div className="p-6 md:p-8">
                <AMCImplementationTab 
                  amcId={editRecordId} 
                  isLightMode={isLightMode} 
                  onUpdate={fetchRecords} 
                  softwareName={formSoftwareName}
                  contractPutToUseDate={formPutToUseDate}
                />
              </div>
            )}

            {activeTab === 'Spend History (TCO)' && editRecordId && (
              <div className="p-6 md:p-8">
                <AMCTCOSpendHistoryTab 
                  amcId={editRecordId} 
                  isLightMode={isLightMode} 
                  currency={formCurrency}
                  record={records.find(r => r.id === editRecordId)}
                  onRefresh={fetchRecords}
                />
              </div>
            )}

            {activeTab === 'Payments' && editRecordId && (
              <div className="p-6 md:p-8">
                <AMCPaymentsTab amcId={editRecordId} isLightMode={isLightMode} currency={formCurrency} />
              </div>
            )}

            {activeTab === 'Transactions' && editRecordId && (
              <div className="p-6 md:p-8">
                <AMCTransactionsTab 
                  amcId={editRecordId} 
                  isLightMode={isLightMode} 
                  onUpdate={fetchRecords} 
                  currency={formCurrency}
                  baseContractCost={computedTotalCost || formCost}
                  baseLicenses={formTotalLicenses}
                  solutionLineItems={solutionLineItems}
                />
              </div>
            )}

            {activeTab === 'Renewals' && editRecordId && (
              <div className="p-6 md:p-8">
                <AMCRenewalsTab 
                  amcId={editRecordId} 
                  isLightMode={isLightMode} 
                  onUpdate={fetchRecords} 
                  currentExpiryDate={formExpiryDate}
                  currency={formCurrency}
                  baseContractCost={computedTotalCost || formCost}
                />
              </div>
            )}

            {activeTab === 'Allocations' && editRecordId && (
              <div className="p-6 md:p-8">
                <AMCAllocationsTab amcId={editRecordId} isLightMode={isLightMode} onUpdate={fetchRecords} />
              </div>
            )}

            {activeTab === 'Attachments' && editRecordId && (
              <div className="p-6 md:p-8">
                <AMCAttachmentsTab amcId={editRecordId} isLightMode={isLightMode} />
              </div>
            )}

          </div>
        </div>
      )}

      {/* Validation Error Popup */}
      {errorAlert && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-[var(--overlay)] animate-in fade-in duration-200">
          <div className="p-6 rounded-lg shadow-lg max-w-sm w-full mx-4 border animate-in zoom-in-95 duration-200 bg-surface border-border">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-14 w-14 rounded-full bg-danger-soft flex items-center justify-center">
                <AlertTriangle className="h-7 w-7 text-danger-text" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-danger-text">Validation error</h3>
                <p className="text-sm mt-2 text-muted">{errorAlert}</p>
              </div>
              <AppButton variant="primary" className="w-full mt-4 bg-danger hover:bg-danger border-none text-primary-foreground" onClick={() => setErrorAlert(null)}>
                Okay, got it
              </AppButton>
            </div>
          </div>
        </div>
      )}

      {/* Reveal License Modal */}
      {revealLicenseModal && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 bg-[var(--overlay)] animate-in fade-in duration-200">
          <div className="bg-surface border border-border w-full max-w-md rounded-lg shadow-lg flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Lock className="h-5 w-5 text-accent-soft-text" /> Reveal license key
              </h2>
              <button 
                type="button" 
                aria-label="Close reveal license modal" 
                onClick={() => setRevealLicenseModal(null)} 
                className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-muted">
                You are about to view a restricted license key. Please provide a reason or remark for this action. This will be recorded in the audit trail.
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Reason / remark</label>
                <AppInput 
                  value={revealLicenseRemark} 
                  onChange={(e) => setRevealLicenseRemark(e.target.value)} 
                  placeholder="e.g., troubleshooting issue #1234" 
                  className="h-11"
                  autoFocus
                />
              </div>
            </div>
            <div className="p-4 border-t border-border flex justify-end gap-3 bg-elevated">
              <AppButton type="button" variant="secondary" onClick={() => setRevealLicenseModal(null)}>Cancel</AppButton>
              <AppButton type="button" variant="primary" onClick={handleRevealLicenseSubmit}>Confirm & reveal</AppButton>
            </div>
          </div>
        </div>
      )}

    </PageContainer>
  );
}
