"use client";

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
import { AMCPaymentsTab } from "@/components/amc/AMCPaymentsTab";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
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
  PieChart
} from "lucide-react";

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
  renewalPeriodType?: string;
  customRenewalDate?: string;
}

export default function AMCPage() {
  const supabase = createClient();
  const { hasPermission, loading: permsLoading } = usePermissions();
  let isLightMode = false;
  try {
    const { theme } = useTheme();
    isLightMode = ["executive-light", "material-ocean", "aurora-breeze", "pure-elegance", "pristine-white"].includes(theme);
  } catch (e) {}

  const [records, setRecords] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
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
  const [mounted, setMounted] = useState(false);
  
  // Phase 1 Fields
  const [formSoftwareName, setFormSoftwareName] = useState("");
  const [formVendorId, setFormVendorId] = useState("");
  const [formContractType, setFormContractType] = useState("AMC");
  const [formPurchaseDate, setFormPurchaseDate] = useState("");
  const [formExpiryDate, setFormExpiryDate] = useState("");
  const [formCost, setFormCost] = useState("");
  const [formAssignedTo, setFormAssignedTo] = useState("");
  const [formDepartmentId, setFormDepartmentId] = useState("");
  const [formStatus, setFormStatus] = useState("Active");
  const [formNotes, setFormNotes] = useState("");

  const [formCurrency, setFormCurrency] = useState("INR");
  const [formTotalLicenses, setFormTotalLicenses] = useState("");
  const [formUsedLicenses, setFormUsedLicenses] = useState("");
  const [formCostPerLicense, setFormCostPerLicense] = useState("");
  const [formLicenseKey, setFormLicenseKey] = useState("");
  const [formPaymentTerms, setFormPaymentTerms] = useState("");
  const [formSupportTier, setFormSupportTier] = useState("");
  const [formSlaUptime, setFormSlaUptime] = useState("");
  const [formSlaTat, setFormSlaTat] = useState("");
  const [formCostCenterId, setFormCostCenterId] = useState("");
  const [formNotifyBeforeDays, setFormNotifyBeforeDays] = useState("30");
  const [showLicenseKey, setShowLicenseKey] = useState(false);

  const handleRevealLicenseKey = async () => {
    if (confirm("Are you sure you want to reveal the license key? This action will be logged.")) {
       setShowLicenseKey(true);
       if (editRecordId) {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
               await supabase.from('amc_license_views').insert([{
                 amc_id: editRecordId,
                 user_id: user.id
               }]);
            }
          } catch(e) { console.error("Failed to log view", e); }
       }
    }
  };

  // Phase 2 Fields - Structured
  const [solutionLineItems, setSolutionLineItems] = useState<SolutionLineItem[]>([]);

  useEffect(() => {
    if (solutionLineItems && solutionLineItems.length > 0) {
      const total = solutionLineItems.reduce((sum, i) => sum + i.netAmount, 0);
      setFormCost(total ? total.toFixed(2) : "");
    }
  }, [solutionLineItems]);

  useEffect(() => {
    if (formTotalLicenses && formCost) {
      const total = parseFloat(formCost);
      const licenses = parseInt(formTotalLicenses);
      if (licenses > 0 && !isNaN(total)) {
        setFormCostPerLicense((total / licenses).toFixed(2));
      }
    }
  }, [formTotalLicenses, formCost]);

  
  const [formPoNumber, setFormPoNumber] = useState("");
  const [formPoDate, setFormPoDate] = useState("");
  const [formPutToUseDate, setFormPutToUseDate] = useState("");
  const [formRenewalPeriodType, setFormRenewalPeriodType] = useState("");
  useEffect(() => {
    if (formRenewalPeriodType && formRenewalPeriodType !== "Custom" && formRenewalPeriodType !== "") {
      const baseDateStr = formPutToUseDate;
      if (baseDateStr) {
        const d = new Date(baseDateStr);
        if (!isNaN(d.getTime())) {
          switch (formRenewalPeriodType) {
            case "Yearly": d.setFullYear(d.getFullYear() + 1); break;
            case "Half-Yearly": d.setMonth(d.getMonth() + 6); break;
            case "Quarterly": d.setMonth(d.getMonth() + 3); break;
            case "Monthly": d.setMonth(d.getMonth() + 1); break;
          }
          // Subtract 1 day for contract expiration standard (e.g. Jan 1 -> Dec 31)
          d.setDate(d.getDate() - 1);
          setFormExpiryDate(d.toISOString().split('T')[0]);
        }
      }
    }
  }, [formRenewalPeriodType, formPutToUseDate, formPurchaseDate]);

  
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
  
  const [formIndustryType, setFormIndustryType] = useState("");
  const [formVendorType, setFormVendorType] = useState("");
  
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

  const handleAddCity = async (stateName: string, setter: (city: string) => void) => {
    if (!stateName) {
      alert("Please select a state first before adding a city.");
      return;
    }
    const newCity = prompt(`Enter new city name for ${stateName}:`);
    if (!newCity || !newCity.trim()) return;
    
    const cityName = newCity.trim();
    try {
      const { data, error } = await supabase.from('master_cities').insert({ state_name: stateName, city_name: cityName }).select().single();
      if (error) {
        if (error.code === '23505') {
           alert("City already exists in this state!");
           setter(cityName);
        } else throw error;
      }
      if (data) {
        setMasterCities(prev => [...prev, data]);
        setter(cityName);
      }
    } catch(e) {
      console.error(e);
      alert("Failed to add city.");
    }
  };

  const formatFileName = (rawName: string) => {
    const match = rawName.match(/^\[(.*?)\]_[^_]+_(.*)$/);
    if (match) {
      return `${match[1]}: ${match[2]}`;
    }
    return rawName;
  };
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchDependencies();
    fetchRecords();
  }, []);

  const fetchDependencies = async () => {
    try {
      const [{ data: usersData }, { data: deptsData }, { data: citiesData }, { data: vendorsData }] = await Promise.all([
        supabase.from("user_master").select("id, full_name, email").eq("is_active", true),
        supabase.from("departments").select("id, name").eq("is_active", true),
        supabase.from("master_cities").select("*").order("city_name"),
        supabase.from("vendor_master").select("id, name").order("name")
      ]);
      if (usersData) setUsers(usersData);
      if (deptsData) setDepartments(deptsData);
      if (citiesData) setMasterCities(citiesData);
      if (vendorsData) setVendors(vendorsData);
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
    setFormStatus("Active");
    setFormNotes("");
    
    setFormCurrency("INR");
    setFormTotalLicenses("");
    setFormUsedLicenses("");
    setFormCostPerLicense("");
    setFormLicenseKey("");
    setFormPaymentTerms("");
    setFormSupportTier("");
    setFormSlaUptime("");
    setFormSlaTat("");
    setFormCostCenterId("");
    setFormNotifyBeforeDays("30");
    setShowLicenseKey(false);
    
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
    
    setFormIndustryType("");
    setFormVendorType("");
    
    setVendorAddrLine1("");
    setVendorAddrLine2("");
    setVendorAddrCity("");
    setVendorAddrState("");
    setVendorAddrPincode("");
    
    setFormMsmeNumber("");
    setFormSpecifications("");
    
    setAttachments([]);
    setExistingAttachments([]);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (rec: any) => {
    resetForm();
    setEditRecordId(rec.id);
    setFormSoftwareName(rec.software_name || "");
    setFormVendorId(rec.vendor_id || "");
    setFormContractType(rec.contract_type || "AMC");
    setFormPurchaseDate(rec.purchase_date || "");
    setFormExpiryDate(rec.expiry_date || "");
    setFormCost(rec.cost?.toString() || "");
    setFormAssignedTo(rec.assigned_to || "");
    setFormDepartmentId(rec.department_id || "");
    setFormStatus(rec.status || "Active");
    setFormNotes(rec.notes || "");

    setFormCurrency(rec.currency || "INR");
    setFormTotalLicenses(rec.total_licenses?.toString() || "");
    setFormUsedLicenses(rec.used_licenses?.toString() || "");
    setFormCostPerLicense(rec.cost_per_license?.toString() || "");
    setFormLicenseKey(rec.license_key || "");
    setFormPaymentTerms(rec.payment_terms || "");
    setFormSupportTier(rec.support_tier || "");
    setFormSlaUptime(rec.sla_uptime?.toString() || "");
    setFormSlaTat(rec.sla_tat || "");
    setFormCostCenterId(rec.cost_center_id || "");
    setFormNotifyBeforeDays(rec.notify_before_days?.toString() || "30");
    setShowLicenseKey(false);

    setSolutionLineItems(rec.solution_line_items || []);
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
    
    setFormIndustryType(rec.industry_type || "");
    setFormVendorType(rec.vendor_type || "");
    
    setVendorAddrLine1(rec.vendor_address_json?.line1 || "");
    setVendorAddrLine2(rec.vendor_address_json?.line2 || "");
    setVendorAddrCity(rec.vendor_address_json?.city || "");
    setVendorAddrState(rec.vendor_address_json?.state || "");
    setVendorAddrPincode(rec.vendor_address_json?.pincode || "");
    
    setFormMsmeNumber(rec.msme_number || "");
    setFormSpecifications(rec.specifications || "");

    fetchAttachments(rec.id);
    setShowModal(true);
  };

  const handleLineItemChange = (id: string, field: keyof SolutionLineItem, value: any) => {
    setSolutionLineItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        // Parse numerical values
        const qty = parseFloat(updated.qty.toString()) || 0;
        const rate = parseFloat(updated.rate.toString()) || 0;
        const base = qty * rate;
        
        const cgstPct = parseFloat(updated.cgstPercent.toString()) || 0;
        const sgstPct = parseFloat(updated.sgstPercent.toString()) || 0;
        const igstPct = parseFloat(updated.igstPercent.toString()) || 0;
        const discount = parseFloat(updated.discount.toString()) || 0;
        
        updated.cgstAmount = parseFloat((base * (cgstPct / 100)).toFixed(2));
        updated.sgstAmount = parseFloat((base * (sgstPct / 100)).toFixed(2));
        updated.igstAmount = parseFloat((base * (igstPct / 100)).toFixed(2));
        updated.netAmount = parseFloat((base + updated.cgstAmount + updated.sgstAmount + updated.igstAmount - discount).toFixed(2));
        
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
        renewalPeriodType: "",
        customRenewalDate: ""
      }
    ]);
  };

  const removeLineItem = (id: string) => {
    setSolutionLineItems(prev => prev.filter(item => item.id !== id));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formVendorId.trim()) {
      setErrorAlert("Provider / Vendor Name is mandatory.");
      return;
    }
    if (!formSoftwareName.trim()) {
      setErrorAlert("Software Name is mandatory.");
      return;
    }

    if (!formContractType) { setErrorAlert("Contract Type is mandatory."); return; }
    if (!formStatus) { setErrorAlert("Status is mandatory."); return; }
    if (!formPurchaseDate) { setErrorAlert("Purchase Date is mandatory."); return; }
    if (!formAssignedTo) { setErrorAlert("Assigned To (Owner) is mandatory."); return; }
    if (!formDepartmentId) { setErrorAlert("Department is mandatory."); return; }

    if (!vendorContactName.trim()) { setErrorAlert("Contact Name is mandatory."); return; }
    if (!vendorContactEmail.trim()) { setErrorAlert("Contact Email is mandatory."); return; }
    if (!vendorContactPhone.trim()) { setErrorAlert("Contact Phone / Ext is mandatory."); return; }

    // Input Validations
    if (vendorContactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(vendorContactEmail)) {
      setErrorAlert("Please enter a valid email address.");
      return;
    }
    if (vendorContactPhone && !/^(?:(?:\+|0{0,2})91(\s*[\-]\s*)?|[0]?)?[6789]\d{9}$/.test(vendorContactPhone.replace(/[\s-]/g, ''))) {
      setErrorAlert("Please enter a valid 10-digit Indian phone number.");
      return;
    }
    if (vendorAddrPincode && !/^\d{6}$/.test(vendorAddrPincode)) {
      setErrorAlert("Please enter a valid 6-digit Indian Pincode.");
      return;
    }
    if (taxGstNumber && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(taxGstNumber)) {
      setErrorAlert("Please enter a valid Indian GST Number.");
      return;
    }
    if (taxPanNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(taxPanNumber)) {
      setErrorAlert("Please enter a valid Indian PAN Number.");
      return;
    }
    if (taxGstNumber && taxPanNumber) {
      const panFromGst = taxGstNumber.substring(2, 12);
      if (panFromGst !== taxPanNumber) {
        setErrorAlert("The GST Number does not match the provided PAN Number. The PAN should be embedded in the GSTIN.");
        return;
      }
    }
    if (formMsmeNumber && !/^UDYAM-[A-Z]{2}-[0-9]{2}-[0-9]{7}$/.test(formMsmeNumber.toUpperCase())) {
      setErrorAlert("Please enter a valid MSME Udyam Registration Number (e.g., UDYAM-MH-00-1234567).");
      return;
    }
    if (bankAccountNo && !/^\d{9,18}$/.test(bankAccountNo)) {
      setErrorAlert("Please enter a valid Indian Bank Account Number (9-18 digits).");
      return;
    }
    if (bankIfsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankIfsc)) {
      setErrorAlert("Please enter a valid Indian IFSC Code.");
      return;
    }

    const payload = {
      software_name: formSoftwareName,
      solution_name: solutionLineItems.map(item => item.resolutionName).filter(Boolean).join(", ") || null,
      vendor_id: formVendorId,
      contract_type: formContractType,
      purchase_date: formPurchaseDate || null,
      expiry_date: formExpiryDate || null,
      put_to_use_date: formPutToUseDate || null,
      renewal_period_type: formRenewalPeriodType || null,
      cost: formCost ? parseFloat(formCost) : null,
      assigned_to: formAssignedTo || null,
      department_id: formDepartmentId || null,
      status: formStatus,
      po_number: formPoNumber || null,
      po_date: formPoDate || null,
      industry_type: formIndustryType || null,
      vendor_type: formVendorType || null,
      msme_number: formMsmeNumber || null,
      specifications: formSpecifications || null,
      notes: formNotes,
      
      currency: formCurrency,
      total_licenses: formTotalLicenses ? parseInt(formTotalLicenses) : null,
      used_licenses: formUsedLicenses ? parseInt(formUsedLicenses) : null,
      cost_per_license: formCostPerLicense ? parseFloat(formCostPerLicense) : null,
      license_key: formLicenseKey || null,
      payment_terms: formPaymentTerms || null,
      support_tier: formSupportTier || null,
      sla_uptime: formSlaUptime ? parseFloat(formSlaUptime) : null,
      sla_tat: formSlaTat || null,
      cost_center_id: formCostCenterId || null,
      notify_before_days: formNotifyBeforeDays ? parseInt(formNotifyBeforeDays) : 30,
      
      // JSON fields
      solution_line_items: solutionLineItems,
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
        const { error } = await supabase
          .from("software_amc")
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq("id", editRecordId);
        if (error) throw error;
        setSuccessAlert("Subscription updated successfully.");
      } else {
        const { data: newRec, error } = await supabase
          .from("software_amc")
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        currentEditId = newRec.id;
        setSuccessAlert("Subscription created successfully.");
      }

      // Handle File Uploads
      if (attachments.length > 0 && currentEditId) {
        for (const entry of attachments) {
          if (!entry.file) continue;
          const safeDocName = (entry.docName || 'Document').replace(/[^a-zA-Z0-9 -]/g, '');
          const fileName = `${currentEditId}/[${safeDocName}]_${Math.random().toString(36).substring(2, 8)}_${entry.file.name}`;
          await supabase.storage.from('amc-attachments').upload(fileName, entry.file);
        }
      }

      setShowModal(false);
      fetchRecords();
    } catch (err: any) {
      setErrorAlert("Failed to save record: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleApprove = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('software_amc')
        .update({ approval_status: status })
        .eq('id', id);
      if (error) throw error;
      setSuccessAlert(`AMC marked as ${status}`);
      await fetchRecords();
    } catch (err: any) {
      setErrorAlert(`Failed to update status: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this record?")) return;
    try {
      const { error } = await supabase
        .from("software_amc")
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      setSuccessAlert("Record deleted.");
      fetchRecords();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const deleteAttachment = async (fileName: string) => {
    if (!editRecordId) return;
    if (!confirm("Remove this attachment?")) return;
    try {
      await supabase.storage.from('amc-attachments').remove([`${editRecordId}/${fileName}`]);
      fetchAttachments(editRecordId);
    } catch(e) {
      console.error(e);
    }
  };

  const filteredDataset = records.filter(r => 
    r.software_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.vendor_master?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.solution_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!mounted || permsLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!hasPermission("AMC_VIEW")) {
    return (
      <div className="h-screen flex flex-col items-center justify-center text-gray-500">
        <Lock className="h-12 w-12 mb-4 opacity-50" />
        <h2 className="text-xl font-semibold text-gray-300">Access Denied</h2>
        <p className="text-sm mt-2">You do not have permission to view the AMC module.</p>
      </div>
    );
  }

  return (
    <PageContainer strict={true}>
      <PageHeader
        title="Annual Maintenance Contracts"
        description="Manage Software AMCs, Subscriptions, and Ownership Assignments."
        icon={<ShieldCheck className="h-6 w-6" />}
        actions={
          <>
            <Link href="/amc/reports">
              <AppButton variant="outline" size="sm" leftIcon={<PieChart className="h-3.5 w-3.5" />}>
                Reports
              </AppButton>
            </Link>
            <Link href="/amc/analytics">
              <AppButton variant="outline" size="sm" leftIcon={<BarChart2 className="h-3.5 w-3.5" />}>
                Analytics
              </AppButton>
            </Link>
            <AppButton variant="outline" size="sm" onClick={fetchRecords} leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-accent' : ''}`} />}>
              Refresh
            </AppButton>
            {hasPermission("AMC_CREATE") && (
              <AppButton variant="primary" size="sm" onClick={openCreateModal} leftIcon={<Plus className="h-3.5 w-3.5" />}>
                Add Subscription
              </AppButton>
            )}
          </>
        }
      />

      {errorAlert && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 mb-4">
          <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs text-rose-200">{errorAlert}</div>
        </div>
      )}

      {successAlert && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-xs text-emerald-300 mb-4">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{successAlert}</span>
        </div>
      )}

      <AppCard className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AppInput 
              placeholder="Search software, provider, solution..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-80"
            />
          </div>
          <div className="text-xs text-gray-500">
            {filteredDataset.length} records found
          </div>
        </div>
        
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
            <thead className={`sticky top-0 z-10 bg-gray-50`}>
              <tr>
                <th className="p-3 font-medium text-gray-500 border-b border-border">Software Name</th>
                <th className="p-3 font-medium text-gray-500 border-b border-border">Solution Name</th>
                <th className="p-3 font-medium text-gray-500 border-b border-border">Vendor</th>
                <th className="p-3 font-medium text-gray-500 border-b border-border">Type</th>
                <th className="p-3 font-medium text-gray-500 border-b border-border">Owner</th>
                <th className="p-3 font-medium text-gray-500 border-b border-border">Expiry Date</th>
                <th className="p-3 font-medium text-gray-500 border-b border-border">Approval</th>
                <th className="p-3 font-medium text-gray-500 border-b border-border">Status</th>
                <th className="p-3 font-medium text-gray-500 border-b border-border text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDataset.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500">
                    No subscriptions found.
                  </td>
                </tr>
              ) : (
                filteredDataset.map((rec) => (
                  <tr key={rec.id} className={`border-b border-border transition-colors hover:bg-elevated`}>
                    <td className="p-3 font-medium">{rec.software_name}</td>
                    <td className="p-3">{rec.solution_name || '-'}</td>
                    <td className="p-3">{rec.vendor_master?.name || '-'}</td>
                    <td className="p-3">
                      <AppBadge variant={rec.contract_type === 'AMC' ? 'accent' : rec.contract_type === 'Subscription' ? 'warning' : 'neutral'}>
                        {rec.contract_type}
                      </AppBadge>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-gray-400" />
                        <span>{rec.user_master?.full_name || 'Unassigned'}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      {rec.expiry_date ? (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          <span>{new Date(rec.expiry_date).toLocaleDateString()}</span>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="p-3">
                      <AppBadge variant={rec.approval_status === 'Active' ? 'success' : rec.approval_status === 'Pending Approval' ? 'warning' : 'neutral'}>{rec.approval_status || 'Pending Approval'}</AppBadge>
                    </td>
                    <td className="p-3">
                      <AppBadge variant={rec.status === 'Active' ? 'success' : 'danger'}>{rec.status}</AppBadge>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      {rec.approval_status === 'Pending Approval' && hasPermission("SUPER_ADMIN") && (
                        <>
                          <AppButton variant="ghost" size="sm" onClick={() => handleApprove(rec.id, 'Active')} className="text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10">
                            Approve
                          </AppButton>
                          <AppButton variant="ghost" size="sm" onClick={() => handleApprove(rec.id, 'Rejected')} className="text-red-500 hover:text-red-600 hover:bg-red-500/10">
                            Reject
                          </AppButton>
                        </>
                      )}
                      <AppButton variant="ghost" size="sm" onClick={() => setSelectedHistoryId(rec.id)} title="View Audit History">
                        <Clock className="h-3.5 w-3.5 text-accent" />
                      </AppButton>
                      {hasPermission("AMC_EDIT") && (
                        <AppButton variant="ghost" size="sm" onClick={() => openEditModal(rec)} title="Edit Record & Log Transactions">
                          <Edit className="h-3.5 w-3.5" />
                        </AppButton>
                      )}
                      {hasPermission("AMC_DELETE") && (
                        <AppButton variant="ghost" size="sm" onClick={() => handleDelete(rec.id)} className="text-red-500 hover:text-red-600 hover:bg-red-500/10">
                          <Trash2 className="h-3.5 w-3.5" />
                        </AppButton>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AppCard>

      {/* History Modal */}
      {selectedHistoryId && (
        <AMCHistoryModal 
          amcId={selectedHistoryId} 
          isLightMode={isLightMode} 
          onClose={() => setSelectedHistoryId(null)} 
        />
      )}



      {/* Full-Screen Page View for Add/Edit */}
      {showModal && (
        <div className={`fixed inset-0 z-[100] flex flex-col animate-in slide-in-from-bottom-4 duration-300 bg-gray-50`}>
          <div className={`flex items-center justify-between p-6 border-b shrink-0 bg-surface border-border shadow-[var(--shadow-ambient)]`}>
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-accent">{editRecordId ? "Manage Subscription Record" : "Add New Subscription"}</h2>
              <p className="text-sm text-gray-500">Manage the core software record, mid-year transactions, and renewals.</p>
            </div>
            <button onClick={() => setShowModal(false)} className="p-2 rounded-full hover:bg-red-500/10 text-gray-500 hover:text-red-500 transition-colors">
              <X className="h-6 w-6" />
            </button>
          </div>

          {editRecordId && (
            <div className={`flex items-center gap-6 px-6 border-b shrink-0 bg-gray-50 border-border`}>
              {['Master', 'Payments', 'Transactions', 'Renewals', 'Allocations'].map(tab => (
                <button 
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 px-2 text-sm font-bold border-b-2 transition-colors ${activeTab === tab ? 'border-accent text-accent' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}
          
          <div className="flex-1 overflow-y-auto w-full max-w-[98%] mx-auto pb-32">
            <div className={activeTab === 'Master' ? 'block' : 'hidden'}>
              <form onSubmit={handleSave} className="p-6 md:p-8 space-y-12">
            
            {/* SECTION: GENERAL & CONTRACT DETAILS */}
            <div className={`p-6 rounded-2xl border bg-surface border-border shadow-[var(--shadow-ambient)]`}>
              <h4 className="text-base font-bold pb-4 mb-4 border-b border-border flex items-center gap-2">
                <span className="bg-accent text-white h-6 w-6 rounded flex items-center justify-center text-xs">1</span>
                General & Contract Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2 lg:col-span-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Provider / Vendor <span className="text-red-500">*</span></label>
                  <select value={formVendorId} onChange={(e) => setFormVendorId(e.target.value)} required className={`w-full h-11 px-4 rounded-xl text-sm transition-all focus:ring-2 outline-none bg-elevated border-border text-foreground focus:border-accent focus:ring-accent/20 border`}>
                    <option value="">-- Select Vendor --</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2 lg:col-span-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Software Name <span className="text-red-500">*</span></label>
                  <AppInput value={formSoftwareName} onChange={(e) => setFormSoftwareName(e.target.value)} required placeholder="e.g., Salesforce Enterprise" className="h-11" />
                </div>
                <div className="lg:col-span-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Contract Type <span className="text-red-500">*</span></label>
                    <select value={formContractType} onChange={(e) => setFormContractType(e.target.value)} className={`w-full h-11 px-4 rounded-xl text-sm transition-all focus:ring-2 outline-none bg-elevated border-border text-foreground focus:border-accent focus:ring-accent/20 border`}>
                      <option value="AMC">Annual Maintenance Contract (AMC)</option>
                      <option value="Subscription">SaaS Subscription</option>
                      <option value="Perpetual License">Perpetual License</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Status <span className="text-red-500">*</span></label>
                    <select value={formStatus} onChange={(e) => setFormStatus(e.target.value)} className={`w-full h-11 px-4 rounded-xl text-sm transition-all focus:ring-2 outline-none bg-elevated border-border text-foreground focus:border-accent focus:ring-accent/20 border`}>
                      <option value="Active">Active</option>
                      <option value="Expired">Expired</option>
                      <option value="Renewed">Renewed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Software / AMC Specification</label>
                    <AppInput value={formSpecifications} onChange={(e) => setFormSpecifications(e.target.value)} placeholder="Detailed requirements or specs..." className="h-11" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Purchase Date <span className="text-red-500">*</span></label>
                  <AppInput type="date" value={formPurchaseDate} onChange={(e) => setFormPurchaseDate(e.target.value)} className="h-11" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Put to Use Date</label>
                  <AppInput type="date" value={formPutToUseDate} onChange={(e) => setFormPutToUseDate(e.target.value)} className="h-11" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Renewal Period</label>
                  <select value={formRenewalPeriodType} onChange={(e) => setFormRenewalPeriodType(e.target.value)} className={`w-full h-11 px-4 rounded-xl text-sm transition-all focus:ring-2 outline-none bg-elevated border-border text-foreground focus:border-accent focus:ring-accent/20 border`}>
                    <option value="">-- Select --</option>
                    <option value="Yearly">Yearly</option>
                    <option value="Half-Yearly">Half-Yearly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Expiry Date</label>
                  <AppInput type="date" value={formExpiryDate} onChange={(e) => setFormExpiryDate(e.target.value)} className="h-11" />
                </div>
                <div className="space-y-2 lg:col-span-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Assigned To (Owner) <span className="text-red-500">*</span></label>
                  <select value={formAssignedTo} onChange={(e) => setFormAssignedTo(e.target.value)} className={`w-full h-11 px-4 rounded-xl text-sm transition-all focus:ring-2 outline-none bg-elevated border-border text-foreground focus:border-accent focus:ring-accent/20 border`}>
                    <option value="">-- Select Owner --</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>)}
                  </select>
                </div>
                <div className="space-y-2 lg:col-span-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Department <span className="text-red-500">*</span></label>
                  <select value={formDepartmentId} onChange={(e) => setFormDepartmentId(e.target.value)} className={`w-full h-11 px-4 rounded-xl text-sm transition-all focus:ring-2 outline-none bg-elevated border-border text-foreground focus:border-accent focus:ring-accent/20 border`}>
                    <option value="">-- Select Department --</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Cost Center</label>
                  <select value={formCostCenterId} onChange={(e) => setFormCostCenterId(e.target.value)} className={`w-full h-11 px-4 rounded-xl text-sm transition-all focus:ring-2 outline-none bg-elevated border-border text-foreground focus:border-accent focus:ring-accent/20 border`}>
                    <option value="">-- Select Cost Center --</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Remind Before (Days)</label>
                  <AppInput type="number" value={formNotifyBeforeDays} onChange={(e) => setFormNotifyBeforeDays(e.target.value)} min="1" max="365" className="h-11" />
                </div>
              </div>
            </div>

            {/* SECTION: LICENSE & USAGE TRACKING */}
            <div className={`p-6 rounded-2xl border bg-surface border-border shadow-[var(--shadow-ambient)]`}>
              <h4 className="text-base font-bold pb-4 mb-4 border-b border-border flex items-center gap-2">
                <span className="bg-accent text-white h-6 w-6 rounded flex items-center justify-center text-xs">2</span>
                License & Usage Tracking
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Total Licenses Purchased</label>
                  <AppInput type="number" value={formTotalLicenses} onChange={(e) => setFormTotalLicenses(e.target.value)} placeholder="e.g., 50" min="0" className="h-11" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Licenses In-Use</label>
                  <AppInput type="number" value={formUsedLicenses} onChange={(e) => setFormUsedLicenses(e.target.value)} placeholder="e.g., 42" min="0" className="h-11" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Cost Per License</label>
                  <AppInput type="number" value={formCostPerLicense} onChange={(e) => setFormCostPerLicense(e.target.value)} placeholder="Auto-calculated" readOnly className="h-11 opacity-70" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">License Key</label>
                  <div className="relative">
                    <AppInput type={showLicenseKey ? "text" : "password"} value={formLicenseKey} onChange={(e) => setFormLicenseKey(e.target.value)} placeholder="Enter License Key" className="h-11 pr-10" />
                    {formLicenseKey && (
                      <button type="button" onClick={showLicenseKey ? () => setShowLicenseKey(false) : handleRevealLicenseKey} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                        {showLicenseKey ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION: SLA & PAYMENT TERMS */}
            <div className={`p-6 rounded-2xl border bg-surface border-border shadow-[var(--shadow-ambient)]`}>
              <h4 className="text-base font-bold pb-4 mb-4 border-b border-border flex items-center gap-2">
                <span className="bg-accent text-white h-6 w-6 rounded flex items-center justify-center text-xs">3</span>
                SLA & Payment Terms
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Currency</label>
                  <select value={formCurrency} onChange={(e) => setFormCurrency(e.target.value)} className={`w-full h-11 px-4 rounded-xl text-sm transition-all focus:ring-2 outline-none bg-elevated border-border text-foreground focus:border-accent focus:ring-accent/20 border`}>
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Payment Terms</label>
                  <select value={formPaymentTerms} onChange={(e) => setFormPaymentTerms(e.target.value)} className={`w-full h-11 px-4 rounded-xl text-sm transition-all focus:ring-2 outline-none bg-elevated border-border text-foreground focus:border-accent focus:ring-accent/20 border`}>
                    <option value="">-- Select --</option>
                    <option value="100% Advance">100% Advance</option>
                    <option value="Net 15">Net 15</option>
                    <option value="Net 30">Net 30</option>
                    <option value="Net 45">Net 45</option>
                    <option value="Net 60">Net 60</option>
                    <option value="Quarterly">Quarterly Installments</option>
                    <option value="50% Advance, 50% Post-Deployment">50% Advance, 50% Post-Deployment</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Support Tier</label>
                  <select value={formSupportTier} onChange={(e) => setFormSupportTier(e.target.value)} className={`w-full h-11 px-4 rounded-xl text-sm transition-all focus:ring-2 outline-none bg-elevated border-border text-foreground focus:border-accent focus:ring-accent/20 border`}>
                    <option value="">-- Select --</option>
                    <option value="Standard Business Hours">Standard Business Hours</option>
                    <option value="Premium 24x5">Premium 24x5</option>
                    <option value="Enterprise 24x7">Enterprise 24x7</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Guaranteed Uptime (%)</label>
                  <AppInput type="number" step="0.01" value={formSlaUptime} onChange={(e) => setFormSlaUptime(e.target.value)} placeholder="e.g., 99.9" min="0" max="100" className="h-11" />
                </div>
                <div className="space-y-2 lg:col-span-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Resolution TAT (Turnaround Time)</label>
                  <AppInput value={formSlaTat} onChange={(e) => setFormSlaTat(e.target.value)} placeholder="e.g., 4 Hours for P1, 24 Hours for P2" className="h-11" />
                </div>
              </div>
            </div>

            {/* SECTION: SOLUTION LINE ITEMS */}
            <div className={`p-6 rounded-2xl border overflow-hidden bg-surface border-border shadow-[var(--shadow-ambient)]`}>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-border">
                <h4 className="text-base font-bold flex items-center gap-2">
                  <span className="bg-accent text-white h-6 w-6 rounded flex items-center justify-center text-xs">4</span>
                  Solution Name & Line Items
                </h4>
                <AppButton type="button" variant="outline" size="sm" onClick={addLineItem} leftIcon={<Plus className="h-4 w-4" />}>
                  Add Line Item
                </AppButton>
              </div>
              
              <div className="overflow-x-auto pb-4">
                <table className="w-full text-left text-sm whitespace-nowrap min-w-[1200px]">
                  <thead>
                    <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-border">
                      <th className="pb-3 px-2 font-bold w-64">Resolution Name</th>
                      <th className="pb-3 px-2 font-bold w-48">Remark</th>
                      <th className="pb-3 px-2 font-bold w-32">Renewal Period</th>
                      <th className="pb-3 px-2 font-bold w-32">Renewal Date</th>
                      <th className="pb-3 px-2 font-bold w-20">Qty</th>
                      <th className="pb-3 px-2 font-bold w-28">Rate</th>
                      <th className="pb-3 px-2 font-bold w-32">CGST (%)</th>
                      <th className="pb-3 px-2 font-bold w-32">SGST (%)</th>
                      <th className="pb-3 px-2 font-bold w-32">IGST (%)</th>
                      <th className="pb-3 px-2 font-bold w-28">Discount</th>
                      <th className="pb-3 px-2 font-bold w-32 text-right">Net Amount</th>
                      <th className="pb-3 px-2 font-bold w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {solutionLineItems.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-gray-500 italic">No line items added. Click "Add Line Item" to begin.</td>
                      </tr>
                    ) : (
                      solutionLineItems.map((item, index) => (
                        <tr key={item.id} className="border-b border-border/50">
                          <td className="py-2 px-1">
                            <AppInput value={item.resolutionName} onChange={(e) => handleLineItemChange(item.id, "resolutionName", e.target.value)} placeholder="Name" className="h-9 text-xs" />
                          </td>
                          <td className="py-2 px-1">
                            <AppInput value={item.remark} onChange={(e) => handleLineItemChange(item.id, "remark", e.target.value)} placeholder="Remark" className="h-9 text-xs" />
                          </td>
                          <td className="py-2 px-1">
                            <select value={item.renewalPeriodType || ""} onChange={(e) => handleLineItemChange(item.id, "renewalPeriodType", e.target.value)} className={`w-full h-9 px-2 rounded-lg text-xs transition-all focus:ring-2 outline-none bg-white border-border text-foreground focus:border-accent focus:ring-accent/20 border`}>
                              <option value="">-- Select --</option>
                              <option value="Yearly">Yearly</option>
                              <option value="Half-Yearly">Half-Yearly</option>
                              <option value="Quarterly">Quarterly</option>
                              <option value="Monthly">Monthly</option>
                              <option value="Custom">Custom</option>
                            </select>
                          </td>
                          <td className="py-2 px-1">
                            {item.renewalPeriodType === "Custom" ? (
                              <AppInput type="date" value={item.customRenewalDate || ""} onChange={(e) => handleLineItemChange(item.id, "customRenewalDate", e.target.value)} className="h-9 text-xs" />
                            ) : (
                              <span className="text-gray-500 text-xs">-</span>
                            )}
                          </td>
                          <td className="py-2 px-1">
                            <AppInput type="number" value={item.qty} onChange={(e) => handleLineItemChange(item.id, "qty", e.target.value)} className="h-9 text-xs" min={1} />
                          </td>
                          <td className="py-2 px-1">
                            <AppInput type="number" value={item.rate} onChange={(e) => handleLineItemChange(item.id, "rate", e.target.value)} className="h-9 text-xs" />
                          </td>
                          <td className="py-2 px-1">
                            <div className="flex items-center gap-1">
                              <AppInput type="number" value={item.cgstPercent} onChange={(e) => handleLineItemChange(item.id, "cgstPercent", e.target.value)} className="h-9 text-xs w-16" placeholder="%" />
                              <span className="text-xs text-gray-500 w-16 truncate">({item.cgstAmount.toFixed(2)})</span>
                            </div>
                          </td>
                          <td className="py-2 px-1">
                            <div className="flex items-center gap-1">
                              <AppInput type="number" value={item.sgstPercent} onChange={(e) => handleLineItemChange(item.id, "sgstPercent", e.target.value)} className="h-9 text-xs w-16" placeholder="%" />
                              <span className="text-xs text-gray-500 w-16 truncate">({item.sgstAmount.toFixed(2)})</span>
                            </div>
                          </td>
                          <td className="py-2 px-1">
                            <div className="flex items-center gap-1">
                              <AppInput type="number" value={item.igstPercent} onChange={(e) => handleLineItemChange(item.id, "igstPercent", e.target.value)} className="h-9 text-xs w-16" placeholder="%" />
                              <span className="text-xs text-gray-500 w-16 truncate">({item.igstAmount.toFixed(2)})</span>
                            </div>
                          </td>
                          <td className="py-2 px-1">
                            <AppInput type="number" value={item.discount} onChange={(e) => handleLineItemChange(item.id, "discount", e.target.value)} className="h-9 text-xs" />
                          </td>
                          <td className="py-2 px-1 text-right font-bold text-accent">
                            {item.netAmount.toFixed(2)}
                          </td>
                          <td className="py-2 px-1 text-right">
                            <button type="button" onClick={() => removeLineItem(item.id)} className="p-1.5 rounded bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors">
                              <X className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {solutionLineItems.length > 0 && (
                    <tfoot>
                      <tr>
                        <td colSpan={8} className="py-4 text-right font-bold text-gray-500">Total Net Amount:</td>
                        <td className="py-4 px-1 text-right font-black text-lg text-emerald-500">
                          {solutionLineItems.reduce((sum, i) => sum + i.netAmount, 0).toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* SECTION: VENDOR DETAILS */}
            <div className={`p-6 rounded-2xl border bg-surface border-border shadow-[var(--shadow-ambient)]`}>
              <h4 className="text-base font-bold pb-4 mb-4 border-b border-border flex items-center gap-2">
                <span className="bg-accent text-white h-6 w-6 rounded flex items-center justify-center text-xs">5</span>
                Vendor & Contact Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                
                {/* Vendor Identity */}
                <div className="space-y-4 col-span-1 md:col-span-3">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2 col-span-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">Industry Type</label>
                      <select value={formIndustryType} onChange={(e) => setFormIndustryType(e.target.value)} className={`w-full h-11 px-4 rounded-xl text-sm transition-all focus:ring-2 outline-none bg-white border-border text-foreground focus:border-accent focus:ring-accent/20 border`}>
                        <option value="">Select Industry Type</option>
                        <option value="IT Software">IT Software</option>
                        <option value="IT Hardware / Electronics">IT Hardware / Electronics</option>
                        <option value="Manufacturing">Manufacturing</option>
                        <option value="BFSI (Banking, Financial Services, Insurance)">BFSI (Banking, Financial Services, Insurance)</option>
                        <option value="Retail & E-Commerce">Retail & E-Commerce</option>
                        <option value="Healthcare & Pharma">Healthcare & Pharma</option>
                        <option value="Telecommunications">Telecommunications</option>
                        <option value="Education & EdTech">Education & EdTech</option>
                        <option value="Construction & Real Estate">Construction & Real Estate</option>
                        <option value="Logistics & Supply Chain">Logistics & Supply Chain</option>
                        <option value="Government & PSU">Government & PSU</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="space-y-2 col-span-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">Vendor Type</label>
                      <select value={formVendorType} onChange={(e) => setFormVendorType(e.target.value)} className={`w-full h-11 px-4 rounded-xl text-sm transition-all focus:ring-2 outline-none bg-white border-border text-foreground focus:border-accent focus:ring-accent/20 border`}>
                        <option value="">Select Vendor Type</option>
                        <option value="OEM (Original Equipment Manufacturer)">OEM (Original Equipment Manufacturer)</option>
                        <option value="Authorized Distributor">Authorized Distributor</option>
                        <option value="Value Added Reseller (VAR)">Value Added Reseller (VAR)</option>
                        <option value="System Integrator (SI)">System Integrator (SI)</option>
                        <option value="Managed Service Provider (MSP)">Managed Service Provider (MSP)</option>
                        <option value="Implementation Partner">Implementation Partner</option>
                        <option value="Consultant / Advisory">Consultant / Advisory</option>
                        <option value="Direct Retailer">Direct Retailer</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Contact Person & Address */}
                <div className="col-span-1 md:col-span-3 space-y-4 pt-4 border-t border-border">
                  <h5 className="text-sm font-semibold text-accent">Contact Person & Address</h5>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Contact Name <span className="text-red-500">*</span></label>
                      <AppInput value={vendorContactName} onChange={(e) => setVendorContactName(e.target.value)} placeholder="Full Name" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Contact Email <span className="text-red-500">*</span></label>
                      <AppInput type="email" value={vendorContactEmail} onChange={(e) => setVendorContactEmail(e.target.value)} placeholder="Email Address" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Address Line 1</label>
                      <AppInput value={vendorAddrLine1} onChange={(e) => setVendorAddrLine1(e.target.value)} placeholder="Building, Street" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Address Line 2</label>
                      <AppInput value={vendorAddrLine2} onChange={(e) => setVendorAddrLine2(e.target.value)} placeholder="Area, Landmark" />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Phone / Ext <span className="text-red-500">*</span></label>
                      <AppInput value={vendorContactPhone} onChange={(e) => setVendorContactPhone(e.target.value)} placeholder="Contact Number" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">State</label>
                      <select value={vendorAddrState} onChange={(e) => {
                        setVendorAddrState(e.target.value);
                        setVendorAddrCity(""); // Reset city when state changes
                      }} className={`w-full h-11 px-4 rounded-xl text-sm transition-all focus:ring-2 outline-none bg-white border-border text-foreground focus:border-accent focus:ring-accent/20 border`}>
                        <option value="">Select State</option>
                        {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center justify-between">
                        <span>City</span>
                        <button type="button" onClick={() => handleAddCity(vendorAddrState, setVendorAddrCity)} className="text-accent hover:bg-accent/10 rounded-full p-0.5 transition-colors" title="Add New City">
                          <Plus className="h-4 w-4" />
                        </button>
                      </label>
                      <select value={vendorAddrCity} onChange={(e) => setVendorAddrCity(e.target.value)} disabled={!vendorAddrState} className={`w-full h-11 px-4 rounded-xl text-sm transition-all focus:ring-2 outline-none disabled:opacity-50 bg-white border-border text-foreground focus:border-accent focus:ring-accent/20 border`}>
                        <option value="">Select City</option>
                        {masterCities.filter(c => c.state_name === vendorAddrState).map(c => <option key={c.id} value={c.city_name}>{c.city_name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Pincode / Zip</label>
                      <AppInput value={vendorAddrPincode} onChange={(e) => setVendorAddrPincode(e.target.value)} placeholder="Pincode" />
                    </div>
                  </div>
                </div>
                
              </div>
            </div>

            {/* SECTION: FINANCIALS */}
            <div className={`p-6 rounded-2xl border bg-surface border-border shadow-[var(--shadow-ambient)]`}>
              <h4 className="text-base font-bold pb-4 mb-4 border-b border-border flex items-center gap-2">
                <span className="bg-accent text-white h-6 w-6 rounded flex items-center justify-center text-xs">6</span>
                Financial & Taxation Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* PO Details */}
                <div className="space-y-4">
                  <h5 className="text-sm font-semibold text-accent">Purchase Order</h5>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase">PO Number</label>
                      <AppInput value={formPoNumber} onChange={(e) => setFormPoNumber(e.target.value)} placeholder="PO-..." />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase">PO Date</label>
                      <AppInput type="date" value={formPoDate} onChange={(e) => setFormPoDate(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase">
                        {solutionLineItems.length > 0 ? "Overall Cost (Auto-Calculated)" : "Manual Overall Cost (Legacy)"}
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                        <AppInput 
                          type="number" 
                          step="0.01" 
                          value={formCost} 
                          onChange={(e) => setFormCost(e.target.value)} 
                          className="pl-9" 
                          placeholder="0.00" 
                          disabled={solutionLineItems.length > 0} 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Taxation */}
                <div className="space-y-4">
                  <h5 className="text-sm font-semibold text-accent">Taxation</h5>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase">GST Number</label>
                      <AppInput value={taxGstNumber} onChange={(e) => setTaxGstNumber(e.target.value)} placeholder="GSTIN" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase">PAN Number</label>
                      <AppInput value={taxPanNumber} onChange={(e) => setTaxPanNumber(e.target.value)} placeholder="PAN" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase">MSME Number</label>
                      <AppInput value={formMsmeNumber} onChange={(e) => setFormMsmeNumber(e.target.value)} placeholder="MSME Reg. No." />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bank Details Sub Section */}
              <div className="mt-8 pt-6 border-t border-border space-y-4">
                <h5 className="text-sm font-semibold text-accent">Bank Details</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Bank Name</label>
                    <AppInput value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Bank Name" className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Account Number</label>
                    <AppInput value={bankAccountNo} onChange={(e) => setBankAccountNo(e.target.value)} placeholder="Account No" className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">IFSC Code</label>
                    <AppInput value={bankIfsc} onChange={(e) => setBankIfsc(e.target.value)} placeholder="IFSC" className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Branch Name</label>
                    <AppInput value={bankBranch} onChange={(e) => setBankBranch(e.target.value)} placeholder="e.g., MG Road Branch" className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">State</label>
                    <select value={bankState} onChange={(e) => {
                      setBankState(e.target.value);
                      setBankCity(""); // Reset city
                    }} className={`w-full h-11 px-4 rounded-xl text-sm transition-all focus:ring-2 outline-none bg-white border-border text-foreground focus:border-accent focus:ring-accent/20 border`}>
                      <option value="">Select State</option>
                      {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center justify-between">
                      <span>City</span>
                      <button type="button" onClick={() => handleAddCity(bankState, setBankCity)} className="text-accent hover:bg-accent/10 rounded-full p-0.5 transition-colors" title="Add New City">
                        <Plus className="h-4 w-4" />
                      </button>
                    </label>
                    <select value={bankCity} onChange={(e) => setBankCity(e.target.value)} disabled={!bankState} className={`w-full h-11 px-4 rounded-xl text-sm transition-all focus:ring-2 outline-none disabled:opacity-50 bg-white border-border text-foreground focus:border-accent focus:ring-accent/20 border`}>
                      <option value="">Select City</option>
                      {masterCities.filter(c => c.state_name === bankState).map(c => <option key={c.id} value={c.city_name}>{c.city_name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION: ATTACHMENTS & MISC */}
            <div className={`p-6 rounded-2xl border bg-surface border-border shadow-[var(--shadow-ambient)]`}>
              <h4 className="text-base font-bold pb-4 mb-4 border-b border-border flex items-center gap-2">
                <span className="bg-accent text-white h-6 w-6 rounded flex items-center justify-center text-xs">7</span>
                Attachments & Notes
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-500 uppercase">Documents & Attachments</label>
                      <AppButton type="button" variant="outline" size="sm" onClick={() => {
                        setAttachments(prev => [...prev, { id: Math.random().toString(36).substring(2, 9), docName: "", file: null }]);
                      }} leftIcon={<Plus className="h-4 w-4" />}>
                        Add Document
                      </AppButton>
                    </div>
                    
                    <div className="space-y-3">
                      {attachments.map(entry => (
                        <div key={entry.id} className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border bg-elevated border-border`}>
                          <select 
                            value={entry.docName} 
                            onChange={(e) => setAttachments(prev => prev.map(a => a.id === entry.id ? { ...a, docName: e.target.value } : a))}
                            className={`w-full sm:w-48 h-10 px-3 rounded-lg text-sm border outline-none focus:ring-2 focus:ring-accent/20 bg-surface border-border text-foreground`}
                          >
                            <option value="">Select Type</option>
                            <option value="SOP Document">SOP Document</option>
                            <option value="Sign Off Document">Sign Off Document</option>
                            <option value="Invoice">Invoice</option>
                            <option value="Contract">Contract</option>
                            <option value="Purchase Order">Purchase Order</option>
                            <option value="Other">Other</option>
                          </select>
                          <input 
                            type="file" 
                            onChange={(e) => setAttachments(prev => prev.map(a => a.id === entry.id ? { ...a, file: e.target.files?.[0] || null } : a))} 
                            className="flex-1 w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-accent/10 file:text-accent hover:file:bg-accent/20 cursor-pointer"
                          />
                          <button type="button" onClick={() => setAttachments(prev => prev.filter(a => a.id !== entry.id))} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      {attachments.length === 0 && (
                        <div className={`text-sm text-gray-500 italic p-6 text-center border-2 border-dashed rounded-xl border-border`}>
                          No documents staged for upload. Click "Add Document" to begin.
                        </div>
                      )}
                    </div>
                  </div>

                  {existingAttachments.length > 0 && (
                    <div className="space-y-2 pt-4">
                      <label className="text-xs font-bold text-gray-500 uppercase">Existing Attachments</label>
                      <div className="flex flex-col gap-2">
                        {existingAttachments.map((file, idx) => (
                          <div key={idx} className={`flex items-center justify-between p-3 rounded-xl border bg-elevated border-border`}>
                            <div className="flex items-center gap-3 text-sm overflow-hidden">
                              <div className="p-2 bg-accent/10 text-accent rounded shrink-0">
                                <Paperclip className="h-4 w-4" />
                              </div>
                              <span className="truncate" title={file.name}>{formatFileName(file.name)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <AppButton type="button" variant="ghost" size="sm" onClick={() => {
                                const url = supabase.storage.from('amc-attachments').getPublicUrl(`${editRecordId}/${file.name}`).data.publicUrl;
                                window.open(url, '_blank');
                              }}>
                                <Download className="h-4 w-4 text-accent" />
                              </AppButton>
                              {hasPermission("AMC_DELETE") && (
                                <AppButton type="button" variant="ghost" size="sm" onClick={() => deleteAttachment(file.name)}>
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </AppButton>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Additional Notes</label>
                  <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} className={`w-full p-4 rounded-xl text-sm transition-all focus:ring-2 outline-none resize-none h-full min-h-[150px] bg-elevated border-border text-foreground focus:border-accent focus:ring-accent/20 border`} placeholder="Any additional details, terms and conditions, or internal comments..." />
                </div>
              </div>
            </div>

            <div className={`fixed bottom-0 left-0 w-full p-4 border-t shadow-2xl flex items-center justify-end gap-4 z-50 bg-surface/90 border-border backdrop-blur-md`}>
              <div className="w-full max-w-[98%] mx-auto flex justify-end items-center gap-4">
                <div className="flex justify-end gap-4 shrink-0">
                  <AppButton type="button" variant="outline" size="lg" onClick={() => setShowModal(false)} disabled={uploading}>
                    Cancel
                  </AppButton>
                  <AppButton type="submit" variant="primary" size="lg" disabled={uploading} leftIcon={uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : undefined} className="min-w-[200px]">
                    {uploading ? 'Saving Data...' : 'Save Subscription Record'}
                  </AppButton>
                </div>
              </div>
            </div>
            
          </form>
            </div>

            {activeTab === 'Payments' && editRecordId && (
              <div className="p-6 md:p-8">
                <AMCPaymentsTab amcId={editRecordId} isLightMode={isLightMode} />
              </div>
            )}

            {activeTab === 'Transactions' && editRecordId && (
              <div className="p-6 md:p-8">
                <AMCTransactionsTab amcId={editRecordId} isLightMode={isLightMode} onUpdate={fetchRecords} />
              </div>
            )}

            {activeTab === 'Renewals' && editRecordId && (
              <div className="p-6 md:p-8">
                <AMCRenewalsTab 
                  amcId={editRecordId} 
                  isLightMode={isLightMode} 
                  onUpdate={fetchRecords} 
                  currentExpiryDate={formExpiryDate}
                />
              </div>
            )}

            {activeTab === 'Allocations' && editRecordId && (
              <div className="p-6 md:p-8">
                <AMCAllocationsTab amcId={editRecordId} isLightMode={isLightMode} onUpdate={fetchRecords} />
              </div>
            )}

          </div>
        </div>
      )}

      {/* Validation Error Popup */}
      {errorAlert && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`p-6 rounded-2xl shadow-2xl max-w-sm w-full mx-4 border animate-in zoom-in-95 duration-200 bg-surface border-border`}>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-14 w-14 rounded-full bg-rose-500/10 flex items-center justify-center">
                <AlertTriangle className="h-7 w-7 text-rose-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-rose-500">Validation Error</h3>
                <p className={`text-sm mt-2 text-muted`}>{errorAlert}</p>
              </div>
              <AppButton variant="primary" className="w-full mt-4 bg-rose-500 hover:bg-rose-600 border-none text-white" onClick={() => setErrorAlert(null)}>
                Okay, got it
              </AppButton>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
