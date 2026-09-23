"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "react-toastify";
import { usePathname, useRouter } from "next/navigation";
import { 
  Car, 
  Calendar, 
  Users, 
  Wrench, 
  LayoutDashboard,
  Search,
  Plus,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  RefreshCw,
  X,
  Save,
  Clock,
  Trash2,
  Edit2,
  Play,
  Check,
  Phone,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  PlusCircle,
  Zap,
  Sparkles,
  Shield,
  ShieldCheck,
  FileText,
  Gauge,
  Fuel,
  Building2,
  Hash,
  Palette,
  UserCheck,
  ShieldAlert,
  LineChart,
  Package,
  LifeBuoy,
  BookOpen,
  Settings,
  FileSpreadsheet,
  Eye,
  Receipt,
  ClipboardCheck,
  FileCheck,
  Printer,
  History,
  Wind
} from "lucide-react";
import { 
  POPULAR_BRANDS, 
  TOP_BRAND_NAMES, 
  analyzeIndianPlate,
  calculateDaysRemaining,
  normalizeDateToInputFormat,
  isElectricFuel
} from "./vehicleQuickPicks";
import { AppCard, AppCardContent, AppCardHeader, AppCardTitle } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { usePermissions } from "@/hooks/usePermissions";
import { useFleetPermissions } from "@/hooks/useFleetPermissions";
import FleetRbacGovernance from "./FleetRbacGovernance";
import { 
  AppTableContainer, 
  AppTable, 
  AppTableHeader, 
  AppTableBody, 
  AppTableRow, 
  AppTableHead, 
  AppTableCell 
} from "@/components/ui/AppTable";
import ChandakLoader from "@/components/ui/ChandakLoader";
import {
  fetchVehicleDashboardStats,
  fetchVehiclesList,
  fetchDriversList,
  fetchTripsList,
  fetchMaintenanceList,
  fetchInsuranceVendorsListAction,
  createInsuranceVendorAction,
  updateInsuranceVendorAction,
  deleteInsuranceVendorAction,
  createVehicleAction,
  updateVehicleAction,
  deleteVehicleAction,
  createDriverAction,
  updateDriverAction,
  deleteDriverAction,
  createTripPlanAction,
  updateTripStatusAction,
  deleteTripAction,
  createServiceRecordAction,
  updateServiceRecordAction,
  deleteServiceRecordAction,
  fetchVehiclePortalDetailsAction,
  VehicleDashboardStats,
  VehicleRecord,
  DriverRecord,
  TripRecord,
  MaintenanceRecord,
  InsuranceVendorRecord,
  PartAccessoryRecord,
  fetchVehiclePartsList,
  createVehiclePartAction,
  updateVehiclePartAction,
  deleteVehiclePartAction,
  renewPartPolicyAction,
  VehicleInsurancePolicyRecord,
  fetchVehicleInsurancePoliciesAction,
  renewVehicleInsurancePolicyAction,
  deleteVehicleInsurancePolicyAction,
  VehiclePucCertificateRecord,
  fetchVehiclePucCertificatesAction,
  renewVehiclePucCertificateAction,
  deleteVehiclePucCertificateAction,
  VehicleSpecificationHistoryRecord,
  fetchVehicleSpecificationHistoryAction,
  deleteVehicleSpecificationHistoryRecordAction
} from "@/lib/actions/vehicle";

export const MAINTENANCE_CATEGORIES = [
  { id: "PERIODIC_SERVICE", label: "Scheduled Periodic Service", icon: "🔄", badge: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  { id: "MECHANICAL", label: "Mechanical & Powertrain", icon: "⚙️", badge: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  { id: "BRAKES_TYRES", label: "Brakes, Tyres & Alignment", icon: "🛞", badge: "bg-rose-500/10 text-rose-600 border-rose-500/20" },
  { id: "ELECTRICAL", label: "Electrical, Battery & ECU", icon: "🔋", badge: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  { id: "AC_CLIMATE", label: "AC & Climate Control", icon: "❄️", badge: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20" },
  { id: "BODY_PAINT", label: "Body Denting & Painting", icon: "🎨", badge: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20" },
  { id: "EMERGENCY_BREAKDOWN", label: "Emergency Breakdown", icon: "🚨", badge: "bg-red-500/10 text-red-600 border-red-500/20" },
  { id: "DETAILING_WASH", label: "Detailing & Foam Wash", icon: "🧼", badge: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" }
];

export const SERVICE_PRESETS = [
  "10,000 km Scheduled Service & Oil Replacement",
  "20,000 km Major Service (Fluids & Filter Flush)",
  "Front & Rear Brake Pad Replacement with Rotor Skimming",
  "Wheel Alignment, Balancing & 4-Tyre Rotation",
  "Battery Replacement & Electrical Diagnostic Check",
  "Clutch Assembly Overhaul & Gearbox Oil Change",
  "AC Gas Recharge, Compressor Check & Cabin Filter",
  "Suspension Bushing & Strut Mount Replacement",
  "PUC & Statutory Transport Fitness Tune-up",
  "Underbody Anti-Rust Coating & Complete Wash"
];

export const CHECKLIST_ITEMS = [
  { key: "oil_filter", label: "Engine Oil & Filter Replaced", icon: "🛢️" },
  { key: "air_filter", label: "Air & Cabin Pollen Filter Changed", icon: "💨" },
  { key: "fluids_topped", label: "Brake Fluid & Coolant Topped-Up", icon: "🛑" },
  { key: "brakes_checked", label: "Brake Pads & Discs Inspected", icon: "⚙️" },
  { key: "tyre_alignment", label: "Wheel Alignment & Balancing Done", icon: "🛞" },
  { key: "battery_tested", label: "Battery Health & Terminals Inspected", icon: "🔋" },
  { key: "washing_cleaning", label: "Vehicle Interior Vacuum & Exterior Wash", icon: "🚿" }
];

export default function FleetDeskHost({ initialSlug }: { initialSlug?: string[] }) {
  const pathname = usePathname() || "/vehicle";
  const router = useRouter();
  const { hasPermission, roleCode } = usePermissions();
  const {
    effectiveFleetRole,
    canReadModule,
    canCreateModule,
    canUpdateModule,
    canDeleteModule,
    canApproveModule,
    canExportModule,
    hasAnyFleetAccess
  } = useFleetPermissions();

  const isSuperAdmin = useMemo(() => {
    return roleCode === "SUPER_ADMIN" || roleCode === "ROLE_ADMIN" || hasPermission("SUPER_ADMIN");
  }, [roleCode, hasPermission]);

  const canCreateVehicle = canCreateModule("VEHICLES") || canCreateModule("REGISTER");
  const canEditVehicle = canUpdateModule("VEHICLES");
  const canDeleteVehicle = canDeleteModule("VEHICLES");
  const canManageDrivers = canCreateModule("DRIVERS") || canUpdateModule("DRIVERS");
  const canDispatchTrips = canCreateModule("TRIPS") || canUpdateModule("TRIPS");
  const canManageMaintenance = canCreateModule("MAINTENANCE") || canUpdateModule("MAINTENANCE");
  const canViewReports = canReadModule("REPORTS");

  // Active sub-navigation tab based on URL
  const activeTab: string = useMemo(() => {
    if (pathname.includes("/register") || pathname.includes("/new")) return "register";
    if (pathname.includes("/inventory")) return "inventory";
    if (pathname.includes("/trips")) return "trips";
    if (pathname.includes("/drivers")) return "drivers";
    if (pathname.includes("/maintenance")) return "maintenance";
    if (pathname.includes("/parts")) return "parts";
    if (pathname.includes("/vendors") || pathname.includes("/insurance-vendors")) return "vendors";
    if (pathname.includes("/travelers")) return "travelers";
    if (pathname.includes("/alerts")) return "alerts";
    if (pathname.includes("/reports")) return "reports";
    if (pathname.includes("/my-garage")) return "my-garage";
    if (pathname.includes("/learning")) return "learning";
    if (pathname.includes("/settings")) return "settings";
    if (pathname.includes("/rbac")) return "rbac";
    return "dashboard";
  }, [pathname]);

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Live Data States
  const [stats, setStats] = useState<VehicleDashboardStats>({
    totalVehicles: 0,
    availableVehicles: 0,
    onRouteVehicles: 0,
    inMaintenanceVehicles: 0,
    activeDrivers: 0,
    activeTrips: 0
  });
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [drivers, setDrivers] = useState<DriverRecord[]>([]);
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [insuranceVendors, setInsuranceVendors] = useState<InsuranceVendorRecord[]>([]);

  // Filtering and search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  // Insurance Vendors Filter & Search States
  const [vendorSearch, setVendorSearch] = useState("");
  const [vendorStatusFilter, setVendorStatusFilter] = useState("ALL");

  // Universal Click-to-Inspect Record Inspector States
  const [viewingVehicle, setViewingVehicle] = useState<VehicleRecord | null>(null);
  const [viewingDriver, setViewingDriver] = useState<DriverRecord | null>(null);
  const [viewingTrip, setViewingTrip] = useState<TripRecord | null>(null);
  const [viewingPart, setViewingPart] = useState<PartAccessoryRecord | null>(null);
  const [viewingVendor, setViewingVendor] = useState<InsuranceVendorRecord | null>(null);

  // Modal Dialog States
  const [isEditVehicleOpen, setIsEditVehicleOpen] = useState(false);
  const [selectedVehicleForEdit, setSelectedVehicleForEdit] = useState<VehicleRecord | null>(null);

  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
  const [isEditDriverOpen, setIsEditDriverOpen] = useState(false);
  const [selectedDriverForEdit, setSelectedDriverForEdit] = useState<DriverRecord | null>(null);

  const [isDispatchTripOpen, setIsDispatchTripOpen] = useState(false);
  const [isAddMaintenanceOpen, setIsAddMaintenanceOpen] = useState(false);

  // Insurance Vendor Master Modal State
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [selectedVendorForEdit, setSelectedVendorForEdit] = useState<InsuranceVendorRecord | null>(null);
  const [vendorFormCode, setVendorFormCode] = useState("");
  const [vendorFormName, setVendorFormName] = useState("");
  const [vendorFormContactPerson, setVendorFormContactPerson] = useState("");
  const [vendorFormContactNumber, setVendorFormContactNumber] = useState("");
  const [vendorFormEmail, setVendorFormEmail] = useState("");
  const [vendorFormSupportTollFree, setVendorFormSupportTollFree] = useState("");
  const [vendorFormWebsite, setVendorFormWebsite] = useState("");
  const [vendorFormDesc, setVendorFormDesc] = useState("");

  // Parts & Accessories Data & Filter States
  const [parts, setParts] = useState<PartAccessoryRecord[]>([]);
  const [partsSearch, setPartsSearch] = useState("");
  const [partsItemTypeFilter, setPartsItemTypeFilter] = useState("ALL");
  const [partsExpiryFilter, setPartsExpiryFilter] = useState("ALL");

  // Parts Modal States
  const [isAddPartOpen, setIsAddPartOpen] = useState(false);
  const [isEditPartOpen, setIsEditPartOpen] = useState(false);
  const [selectedPartForEdit, setSelectedPartForEdit] = useState<PartAccessoryRecord | null>(null);
  const [isRenewPartOpen, setIsRenewPartOpen] = useState(false);
  const [selectedPartForRenew, setSelectedPartForRenew] = useState<PartAccessoryRecord | null>(null);

  // Vehicle Insurance Policy Renewal & History Modal States
  const [isRenewPolicyModalOpen, setIsRenewPolicyModalOpen] = useState(false);
  const [selectedVehicleForPolicyRenew, setSelectedVehicleForPolicyRenew] = useState<VehicleRecord | null>(null);

  const [isPolicyHistoryModalOpen, setIsPolicyHistoryModalOpen] = useState(false);
  const [selectedVehicleForPolicyHistory, setSelectedVehicleForPolicyHistory] = useState<VehicleRecord | null>(null);
  const [vehiclePoliciesHistory, setVehiclePoliciesHistory] = useState<VehicleInsurancePolicyRecord[]>([]);
  const [loadingPolicyHistory, setLoadingPolicyHistory] = useState(false);

  // Policy Renewal Form States
  const [renewPolicyNumber, setRenewPolicyNumber] = useState("");
  const [renewPolicyVendorId, setRenewPolicyVendorId] = useState("");
  const [renewPolicyVendorName, setRenewPolicyVendorName] = useState("");
  const [renewPolicyType, setRenewPolicyType] = useState("Comprehensive");
  const [renewPolicyIdv, setRenewPolicyIdv] = useState<number>(0);
  const [renewPolicyPremium, setRenewPolicyPremium] = useState<number>(0);
  const [renewPolicyStartDate, setRenewPolicyStartDate] = useState("");
  const [renewPolicyEndDate, setRenewPolicyEndDate] = useState("");
  const [renewPolicyNcb, setRenewPolicyNcb] = useState<number>(0);
  const [renewPolicyHasRsa, setRenewPolicyHasRsa] = useState(true);
  const [renewPolicyHasZeroDep, setRenewPolicyHasZeroDep] = useState(true);
  const [renewPolicyHasEngineProtect, setRenewPolicyHasEngineProtect] = useState(false);
  const [renewPolicyReceiptNo, setRenewPolicyReceiptNo] = useState("");
  const [renewPolicyDocUrl, setRenewPolicyDocUrl] = useState("");
  const [renewPolicyNotes, setRenewPolicyNotes] = useState("");

  // Vehicle PUC Renewal & History Modal States
  const [isRenewPucModalOpen, setIsRenewPucModalOpen] = useState(false);
  const [selectedVehicleForPucRenew, setSelectedVehicleForPucRenew] = useState<VehicleRecord | null>(null);

  const [isPucHistoryModalOpen, setIsPucHistoryModalOpen] = useState(false);
  const [selectedVehicleForPucHistory, setSelectedVehicleForPucHistory] = useState<VehicleRecord | null>(null);
  const [vehiclePucHistory, setVehiclePucHistory] = useState<VehiclePucCertificateRecord[]>([]);
  const [loadingPucHistory, setLoadingPucHistory] = useState(false);

  // Vehicle Specification Revision History & Audit Modal States
  const [isSpecHistoryModalOpen, setIsSpecHistoryModalOpen] = useState(false);
  const [selectedVehicleForSpecHistory, setSelectedVehicleForSpecHistory] = useState<VehicleRecord | null>(null);
  const [vehicleSpecHistory, setVehicleSpecHistory] = useState<VehicleSpecificationHistoryRecord[]>([]);
  const [loadingSpecHistory, setLoadingSpecHistory] = useState(false);

  // PUC Renewal Form States
  const [renewPucNumber, setRenewPucNumber] = useState("");
  const [renewPucTestingCenter, setRenewPucTestingCenter] = useState("");
  const [renewPucValidFrom, setRenewPucValidFrom] = useState("");
  const [renewPucValidUpto, setRenewPucValidUpto] = useState("");
  const [renewPucFee, setRenewPucFee] = useState<number>(150);
  const [renewPucReceiptNo, setRenewPucReceiptNo] = useState("");
  const [renewPucEmissionNorm, setRenewPucEmissionNorm] = useState("BS-VI");
  const [renewPucCo, setRenewPucCo] = useState<number>(0.05);
  const [renewPucHc, setRenewPucHc] = useState<number>(45.0);
  const [renewPucSmokeDensity, setRenewPucSmokeDensity] = useState<number>(0.45);
  const [renewPucDocUrl, setRenewPucDocUrl] = useState("");
  const [renewPucNotes, setRenewPucNotes] = useState("");

  // Parts Form States
  const [partFormName, setPartFormName] = useState("");
  const [partFormItemType, setPartFormItemType] = useState("SPARE_PART");
  const [partFormPartNumber, setPartFormPartNumber] = useState("");
  const [partFormCategory, setPartFormCategory] = useState("Spare Parts");
  const [partFormBrand, setPartFormBrand] = useState("");
  const [partFormPurchaseAmount, setPartFormPurchaseAmount] = useState<number>(0);
  const [partFormUnitPrice, setPartFormUnitPrice] = useState<number>(0);
  const [partFormQuantity, setPartFormQuantity] = useState<number>(1);
  const [partFormPurchaseDate, setPartFormPurchaseDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [partFormVendorName, setPartFormVendorName] = useState("");
  const [partFormInvoiceNumber, setPartFormInvoiceNumber] = useState("");
  const [partFormManufacturingDate, setPartFormManufacturingDate] = useState("");
  const [partFormExpiryDate, setPartFormExpiryDate] = useState("");
  const [partFormWarrantyType, setPartFormWarrantyType] = useState("WARRANTY");
  const [partFormWarrantyMonths, setPartFormWarrantyMonths] = useState<number>(12);
  const [partFormWarrantyExpiryDate, setPartFormWarrantyExpiryDate] = useState("");
  const [partFormWarrantyTerms, setPartFormWarrantyTerms] = useState("");
  const [partFormHasRenewal, setPartFormHasRenewal] = useState(false);
  const [partFormRenewalType, setPartFormRenewalType] = useState("GPS_SIM_RECHARGE");
  const [partFormRenewalDate, setPartFormRenewalDate] = useState("");
  const [partFormRenewalCost, setPartFormRenewalCost] = useState<number>(0);
  const [partFormRenewalVendor, setPartFormRenewalVendor] = useState("");
  const [partFormRenewalPolicyNumber, setPartFormRenewalPolicyNumber] = useState("");
  const [partFormRenewalReminderDays, setPartFormRenewalReminderDays] = useState<number>(30);
  const [partFormStatus, setPartFormStatus] = useState("IN_STOCK");
  const [partFormVehicleId, setPartFormVehicleId] = useState("UNASSIGNED_STOCK");
  const [partFormAssignedVehicleReg, setPartFormAssignedVehicleReg] = useState("");
  const [partFormInstallationDate, setPartFormInstallationDate] = useState("");
  const [partFormInstalledOdometer, setPartFormInstalledOdometer] = useState<number | "">("");
  const [partFormInstalledBy, setPartFormInstalledBy] = useState("");
  const [partFormCondition, setPartFormCondition] = useState("NEW");
  const [partFormSerialNumber, setPartFormSerialNumber] = useState("");
  const [partFormNotes, setPartFormNotes] = useState("");

  // Renew Modal Form States
  const [renewModalDate, setRenewModalDate] = useState("");
  const [renewModalCost, setRenewModalCost] = useState<number>(0);
  const [renewModalVendor, setRenewModalVendor] = useState("");
  const [renewModalPolicyNumber, setRenewModalPolicyNumber] = useState("");
  const [renewModalNotes, setRenewModalNotes] = useState("");

  // Generic Delete Confirmation Dialog State
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "vehicle" | "driver" | "trip" | "maintenance" | "vendor" | "part";
    id: string;
    label: string;
  } | null>(null);

  const [modalSubmitting, setModalSubmitting] = useState(false);

  // ----------------------------------------------------------------------------
  // Form States — Add Vehicle
  // ----------------------------------------------------------------------------
  const [newVehiclePlate, setNewVehiclePlate] = useState("");
  const [newVehicleMake, setNewVehicleMake] = useState("");
  const [newVehicleModel, setNewVehicleModel] = useState("");
  const [newVehicleVariant, setNewVehicleVariant] = useState("Standard");
  const [newVehicleCategory, setNewVehicleCategory] = useState("CAR");
  const [newVehicleStatus, setNewVehicleStatus] = useState("IN_STOCK");
  const [newVehicleOdometer, setNewVehicleOdometer] = useState<number>(0);
  const [newVehicleDriverId, setNewVehicleDriverId] = useState("");
  const [newVehicleNickname, setNewVehicleNickname] = useState("");
  const [newVehicleColor, setNewVehicleColor] = useState("#1e293b");

  // Comprehensive Vehicle Specs & Compliance
  const [newVehicleVin, setNewVehicleVin] = useState("");
  const [newVehicleEngine, setNewVehicleEngine] = useState("");
  const [newVehicleFuel, setNewVehicleFuel] = useState("Petrol");
  const [newVehicleRegDate, setNewVehicleRegDate] = useState("");
  const [newVehicleRtoOffice, setNewVehicleRtoOffice] = useState("");
  const [newVehicleOwner, setNewVehicleOwner] = useState("");
  const [newVehicleRtoRmn, setNewVehicleRtoRmn] = useState("");
  const [newVehicleInsuranceVendorId, setNewVehicleInsuranceVendorId] = useState("");
  const [newVehicleInsuranceVendor, setNewVehicleInsuranceVendor] = useState("");
  const [newVehicleInsurancePolicy, setNewVehicleInsurancePolicy] = useState("");
  const [newVehicleInsuranceExpiry, setNewVehicleInsuranceExpiry] = useState("");
  const [newVehiclePucExpiry, setNewVehiclePucExpiry] = useState("");
  const [newVehicleFitnessExpiry, setNewVehicleFitnessExpiry] = useState("");
  const [newVehicleHsrp, setNewVehicleHsrp] = useState(true);
  const [newVehicleRsa, setNewVehicleRsa] = useState(true);

  // Portal auto-lookup state
  const [fetchingPortal, setFetchingPortal] = useState(false);
  const [portalLookupMsg, setPortalLookupMsg] = useState<{
    type: "success" | "error" | "info";
    message: string;
    rtoOffice?: string;
    source?: string;
  } | null>(null);

  // Form States — Edit Vehicle
  const [editVehiclePlate, setEditVehiclePlate] = useState("");
  const [editVehicleMake, setEditVehicleMake] = useState("");
  const [editVehicleModel, setEditVehicleModel] = useState("");
  const [editVehicleVariant, setEditVehicleVariant] = useState("");
  const [editVehicleCategory, setEditVehicleCategory] = useState("CAR");
  const [editVehicleStatus, setEditVehicleStatus] = useState("IN_STOCK");
  const [editVehicleOdometer, setEditVehicleOdometer] = useState<number>(0);
  const [editVehicleDriverId, setEditVehicleDriverId] = useState("");
  const [editVehicleNickname, setEditVehicleNickname] = useState("");
  const [editVehicleColor, setEditVehicleColor] = useState("#1e293b");

  // Comprehensive Edit Vehicle Specs & Compliance
  const [editVehicleVin, setEditVehicleVin] = useState("");
  const [editVehicleEngine, setEditVehicleEngine] = useState("");
  const [editVehicleFuel, setEditVehicleFuel] = useState("Petrol");
  const [editVehicleRegDate, setEditVehicleRegDate] = useState("");
  const [editVehicleRtoOffice, setEditVehicleRtoOffice] = useState("");
  const [editVehicleOwner, setEditVehicleOwner] = useState("");
  const [editVehicleRtoRmn, setEditVehicleRtoRmn] = useState("");
  const [editVehicleInsuranceVendorId, setEditVehicleInsuranceVendorId] = useState("");
  const [editVehicleInsuranceVendor, setEditVehicleInsuranceVendor] = useState("");
  const [editVehicleInsurancePolicy, setEditVehicleInsurancePolicy] = useState("");
  const [editVehicleInsuranceExpiry, setEditVehicleInsuranceExpiry] = useState("");
  const [editVehiclePucExpiry, setEditVehiclePucExpiry] = useState("");
  const [editVehicleFitnessExpiry, setEditVehicleFitnessExpiry] = useState("");
  const [editVehicleHsrp, setEditVehicleHsrp] = useState(true);
  const [editVehicleRsa, setEditVehicleRsa] = useState(true);

  // Dynamic Expiry Badge Helper
  const renderExpiryBadge = (days?: number | null) => {
    if (days === null || days === undefined) return null;
    if (days < 0) {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/25 inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
          <span>Expired {Math.abs(days)}d ago</span>
        </span>
      );
    }
    if (days === 0) {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25 inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          <span>Expires Today</span>
        </span>
      );
    }
    if (days <= 30) {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25 inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          <span>Expires in {days}d</span>
        </span>
      );
    }
    return (
      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 inline-flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        <span>Expires in {days}d</span>
      </span>
    );
  };

  // Authentic Indian High Security Registration Plate (HSRP) Badge
  const renderHsrpPlate = (plateNumber?: string) => {
    if (!plateNumber) return <span className="text-muted-foreground">—</span>;
    return (
      <div className="inline-flex items-stretch rounded-sm border-2 border-slate-900 bg-white shadow-xs overflow-hidden select-none">
        <div className="bg-[#003399] px-1.5 py-0.5 flex flex-col items-center justify-center border-r border-[#002266] shrink-0">
          <span className="text-[7px] leading-none text-white font-black tracking-tighter">IND</span>
        </div>
        <div className="px-2 py-0.5 font-mono text-[11px] font-black tracking-widest text-slate-950 uppercase bg-white">
          {plateNumber}
        </div>
      </div>
    );
  };

  // Edit Vehicle Portal lookup state
  const [fetchingEditPortal, setFetchingEditPortal] = useState(false);
  const [editPortalLookupMsg, setEditPortalLookupMsg] = useState<{
    type: "success" | "error" | "info";
    message: string;
    rtoOffice?: string;
    source?: string;
  } | null>(null);

  // Instant Smart Client-Side RTO Analyzers
  const newPlateInfo = useMemo(() => analyzeIndianPlate(newVehiclePlate), [newVehiclePlate]);
  const editPlateInfo = useMemo(() => analyzeIndianPlate(editVehiclePlate), [editVehiclePlate]);

  // ----------------------------------------------------------------------------
  // Form States — Add Driver
  // ----------------------------------------------------------------------------
  const [newDriverName, setNewDriverName] = useState("");
  const [newDriverPhone, setNewDriverPhone] = useState("");
  const [newDriverLicense, setNewDriverLicense] = useState("");
  const [newDriverLicenseExpiry, setNewDriverLicenseExpiry] = useState("");
  const [newDriverExperience, setNewDriverExperience] = useState<number>(3);
  const [newDriverEmergency, setNewDriverEmergency] = useState("");
  const [newDriverVehicleId, setNewDriverVehicleId] = useState("");

  // Form States — Edit Driver
  const [editDriverName, setEditDriverName] = useState("");
  const [editDriverPhone, setEditDriverPhone] = useState("");
  const [editDriverLicense, setEditDriverLicense] = useState("");
  const [editDriverLicenseExpiry, setEditDriverLicenseExpiry] = useState("");
  const [editDriverExperience, setEditDriverExperience] = useState<number>(0);
  const [editDriverEmergency, setEditDriverEmergency] = useState("");
  const [editDriverVehicleId, setEditDriverVehicleId] = useState("");
  const [editDriverActive, setEditDriverActive] = useState(true);

  // ----------------------------------------------------------------------------
  // Form States — Dispatch Trip
  // ----------------------------------------------------------------------------
  const [newTripVehicleId, setNewTripVehicleId] = useState("");
  const [newTripDriverId, setNewTripDriverId] = useState("");
  const [newTripTraveler, setNewTripTraveler] = useState("");
  const [newTripPurpose, setNewTripPurpose] = useState("");
  const [newTripOrigin, setNewTripOrigin] = useState("");
  const [newTripDestination, setNewTripDestination] = useState("");
  const [newTripDate, setNewTripDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [newTripStartTime, setNewTripStartTime] = useState("09:30");
  const [newTripEndTime, setNewTripEndTime] = useState("18:00");

  // ----------------------------------------------------------------------------
  // Form States — Service Records & Workshop Job Cards (Dedicated Module)
  // ----------------------------------------------------------------------------
  const [newMaintVehicleId, setNewMaintVehicleId] = useState("");
  const [newMaintCategory, setNewMaintCategory] = useState("PERIODIC_SERVICE");
  const [newMaintServiceType, setNewMaintServiceType] = useState("");
  const [newMaintVendor, setNewMaintVendor] = useState("");
  const [newMaintLocation, setNewMaintLocation] = useState("");
  const [newMaintTechnician, setNewMaintTechnician] = useState("");
  const [newMaintInvoiceNo, setNewMaintInvoiceNo] = useState("");
  const [newMaintDate, setNewMaintDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [newMaintOdometer, setNewMaintOdometer] = useState<number>(0);
  const [newMaintLabourCost, setNewMaintLabourCost] = useState<number>(0);
  const [newMaintPartsCost, setNewMaintPartsCost] = useState<number>(0);
  const [newMaintTaxCost, setNewMaintTaxCost] = useState<number>(0);
  const [newMaintCost, setNewMaintCost] = useState<number>(0);
  const [newMaintPaymentMode, setNewMaintPaymentMode] = useState("UPI / Bank Transfer");
  const [newMaintPaymentStatus, setNewMaintPaymentStatus] = useState("PAID");
  const [newMaintNextDue, setNewMaintNextDue] = useState("");
  const [newMaintNextDueOdometer, setNewMaintNextDueOdometer] = useState<number>(0);
  const [newMaintNotes, setNewMaintNotes] = useState("");
  const [newMaintPostStatus, setNewMaintPostStatus] = useState("IN_STOCK");
  const [newMaintActiveSection, setNewMaintActiveSection] = useState<"SCOPE_WORKSHOP" | "BILLING_FORECAST">("SCOPE_WORKSHOP");

  // Edit Service Record States
  const [isEditMaintenanceOpen, setIsEditMaintenanceOpen] = useState(false);
  const [selectedMaintenanceForEdit, setSelectedMaintenanceForEdit] = useState<MaintenanceRecord | null>(null);
  const [editMaintVehicleId, setEditMaintVehicleId] = useState("");
  const [editMaintCategory, setEditMaintCategory] = useState("PERIODIC_SERVICE");
  const [editMaintServiceType, setEditMaintServiceType] = useState("");
  const [editMaintVendor, setEditMaintVendor] = useState("");
  const [editMaintLocation, setEditMaintLocation] = useState("");
  const [editMaintTechnician, setEditMaintTechnician] = useState("");
  const [editMaintInvoiceNo, setEditMaintInvoiceNo] = useState("");
  const [editMaintDate, setEditMaintDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [editMaintOdometer, setEditMaintOdometer] = useState<number>(0);
  const [editMaintLabourCost, setEditMaintLabourCost] = useState<number>(0);
  const [editMaintPartsCost, setEditMaintPartsCost] = useState<number>(0);
  const [editMaintTaxCost, setEditMaintTaxCost] = useState<number>(0);
  const [editMaintCost, setEditMaintCost] = useState<number>(0);
  const [editMaintPaymentMode, setEditMaintPaymentMode] = useState("UPI / Bank Transfer");
  const [editMaintPaymentStatus, setEditMaintPaymentStatus] = useState("PAID");
  const [editMaintNextDue, setEditMaintNextDue] = useState("");
  const [editMaintNextDueOdometer, setEditMaintNextDueOdometer] = useState<number>(0);
  const [editMaintNotes, setEditMaintNotes] = useState("");
  const [editMaintPostStatus, setEditMaintPostStatus] = useState("IN_STOCK");
  const [editMaintActiveSection, setEditMaintActiveSection] = useState<"SCOPE_WORKSHOP" | "BILLING_FORECAST">("SCOPE_WORKSHOP");

  const [selectedMaintenanceForView, setSelectedMaintenanceForView] = useState<MaintenanceRecord | null>(null);

  const resetMaintenanceForm = () => {
    setNewMaintVehicleId("");
    setNewMaintCategory("PERIODIC_SERVICE");
    setNewMaintServiceType("");
    setNewMaintVendor("");
    setNewMaintLocation("");
    setNewMaintTechnician("");
    setNewMaintInvoiceNo("");
    setNewMaintDate(new Date().toISOString().split("T")[0]);
    setNewMaintOdometer(0);
    setNewMaintLabourCost(0);
    setNewMaintPartsCost(0);
    setNewMaintTaxCost(0);
    setNewMaintCost(0);
    setNewMaintPaymentMode("UPI / Bank Transfer");
    setNewMaintPaymentStatus("PAID");
    setNewMaintNextDue("");
    setNewMaintNextDueOdometer(0);
    setNewMaintNotes("");
    setNewMaintPostStatus("IN_STOCK");
    setNewMaintActiveSection("SCOPE_WORKSHOP");
  };

  const openEditMaintenanceModal = (m: MaintenanceRecord) => {
    setSelectedMaintenanceForEdit(m);
    const partsData = typeof m.parts_replaced === "object" && m.parts_replaced !== null ? m.parts_replaced : {};
    setEditMaintVehicleId(m.vehicle_id);
    setEditMaintCategory(partsData.category || "PERIODIC_SERVICE");
    setEditMaintServiceType(m.service_type || "");
    setEditMaintVendor(m.service_center || "");
    setEditMaintLocation(partsData.location || "");
    setEditMaintTechnician(m.technician_name || "");
    setEditMaintInvoiceNo(partsData.invoice_number || "");
    setEditMaintDate(m.service_date || new Date().toISOString().split("T")[0]);
    setEditMaintOdometer(m.odometer_km || 0);
    setEditMaintLabourCost(Number(partsData.labour_cost) || 0);
    setEditMaintPartsCost(Number(partsData.parts_cost) || 0);
    setEditMaintTaxCost(Number(partsData.tax_amount) || 0);
    setEditMaintCost(Number(m.cost) || 0);
    setEditMaintPaymentMode(partsData.payment_mode || "UPI / Bank Transfer");
    setEditMaintPaymentStatus(partsData.payment_status || "PAID");
    setEditMaintNextDue(m.next_service_due_date || "");
    setEditMaintNextDueOdometer(Number(m.next_service_due_odometer) || 0);
    setEditMaintNotes(partsData.technician_notes || "");
    setEditMaintPostStatus(partsData.post_service_status || "IN_STOCK");
    setEditMaintActiveSection("SCOPE_WORKSHOP");
    setIsEditMaintenanceOpen(true);
  };

  const handleSelectMaintVehicle = (vehId: string) => {
    setNewMaintVehicleId(vehId);
    const sel = vehicles.find((v) => v.id === vehId);
    if (sel) {
      const curOdo = sel.odometer_km || 0;
      setNewMaintOdometer(curOdo);
      const isBike = sel.category === "BIKE";
      const intervalKm = isBike ? 5000 : 10000;
      setNewMaintNextDueOdometer(curOdo + intervalKm);

      const now = new Date();
      const months = isBike ? 6 : 12;
      const nextDate = new Date(now.getFullYear(), now.getMonth() + months, now.getDate());
      setNewMaintNextDue(nextDate.toISOString().split("T")[0]);

      if (!newMaintServiceType) {
        setNewMaintServiceType(
          isBike
            ? "5,000 km Periodic Service & Synthetic Oil Change"
            : "10,000 km Periodic Inspection & Synthetic Oil Change"
        );
      }

      if (!newMaintVendor) {
        if (/TOYOTA/i.test(sel.make)) setNewMaintVendor("Lakozy Toyota Authorized Service");
        else if (/TVS/i.test(sel.make)) setNewMaintVendor("TVS Sarthak Authorized Service Center");
        else if (/HONDA/i.test(sel.make)) setNewMaintVendor("Honda Authorized Workshop");
        else if (/TATA/i.test(sel.make)) setNewMaintVendor("Tata Motors Authorized Service Center");
        else if (/MAHINDRA/i.test(sel.make)) setNewMaintVendor("Mahindra Authorized Center");
        else setNewMaintVendor(`${sel.make} Authorized Service Center`);
      }
    }
  };

  // ----------------------------------------------------------------------------
  // Data Loaders (Module-local operations)
  // ----------------------------------------------------------------------------

  const loadAllData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);

      const [statsRes, vehiclesRes, driversRes, tripsRes, maintRes, vendorsRes, partsRes] = await Promise.all([
        fetchVehicleDashboardStats(),
        fetchVehiclesList({ pageSize: 100 }),
        fetchDriversList(),
        fetchTripsList(),
        fetchMaintenanceList(),
        fetchInsuranceVendorsListAction(),
        fetchVehiclePartsList()
      ]);

      if (statsRes.success) setStats(statsRes.stats);
      if (vehiclesRes.success) setVehicles(vehiclesRes.vehicles);
      if (driversRes.success) setDrivers(driversRes.drivers);
      if (tripsRes.success) setTrips(tripsRes.trips);
      if (maintRes.success) setMaintenance(maintRes.records);
      if (vendorsRes.success) setInsuranceVendors(vendorsRes.vendors);
      if (partsRes.success && partsRes.parts) setParts(partsRes.parts);

      if (vehiclesRes.error && !isSilent) {
        setErrorBanner(vehiclesRes.error);
      }
    } catch (err: any) {
      console.error("[FleetDeskHost] Failed to load data:", err);
      if (!isSilent) setErrorBanner("Failed to load vehicle records.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Toast banner triggers
  const triggerToast = (msg: string, isError = false) => {
    if (isError) {
      setErrorBanner(msg);
      setSuccessBanner(null);
      toast.error(msg);
    } else {
      setSuccessBanner(msg);
      setErrorBanner(null);
      toast.success(msg);
    }
    setTimeout(() => {
      setErrorBanner(null);
      setSuccessBanner(null);
    }, 4500);
  };

  // ----------------------------------------------------------------------------
  // CRUD Handlers: VEHICLES
  // ----------------------------------------------------------------------------

  // Resilient Portal Lookup & Creation Helpers:
  // Directly queries the permanent REST API route `/api/vehicle/lookup` first.
  // This is 100% immune to Next.js build-time Server Action ID hash rotation ("failed-to-find-server-action").
  const queryVehiclePortal = async (plateNumber: string, categoryPreference?: string) => {
    try {
      const url = `/api/vehicle/lookup?plate=${encodeURIComponent(plateNumber)}${categoryPreference ? `&category=${encodeURIComponent(categoryPreference)}` : ""}`;
      const res = await fetch(url, {
        headers: { "Cache-Control": "no-cache" }
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (apiErr) {
      console.warn("[vehicle] REST lookup failed, attempting Server Action fallback:", apiErr);
    }

    try {
      return await fetchVehiclePortalDetailsAction(plateNumber, categoryPreference);
    } catch (err: any) {
      if (err?.message?.includes("was not found on the server") || err?.message?.includes("failed-to-find-server-action")) {
        console.warn("[vehicle] Stale Server Action hash detected, retrying via REST endpoint...");
        const retryUrl = `/api/vehicle/lookup?plate=${encodeURIComponent(plateNumber)}${categoryPreference ? `&category=${encodeURIComponent(categoryPreference)}` : ""}`;
        const retryRes = await fetch(retryUrl);
        if (retryRes.ok) return await retryRes.json();
      }
      throw err;
    }
  };

  const submitNewVehicle = async (formData: Parameters<typeof createVehicleAction>[0]) => {
    try {
      const res = await fetch("/api/vehicle/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (apiErr) {
      console.warn("[vehicle] REST create failed, attempting Server Action fallback:", apiErr);
    }

    try {
      return await createVehicleAction(formData);
    } catch (err: any) {
      if (err?.message?.includes("was not found on the server") || err?.message?.includes("failed-to-find-server-action")) {
        const retryRes = await fetch("/api/vehicle/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData)
        });
        if (retryRes.ok) return await retryRes.json();
      }
      throw err;
    }
  };

  const handlePortalAutoFetch = async (plateOverride?: string) => {
    const rawPlate = (plateOverride || newVehiclePlate).trim();
    if (!rawPlate) {
      setPortalLookupMsg({
        type: "error",
        message: "Please enter a vehicle registration number first (e.g. MH02FE4281 or HR26CQ9999)."
      });
      return;
    }

    setFetchingPortal(true);
    setPortalLookupMsg(null);

    try {
      const res = await queryVehiclePortal(rawPlate, newVehicleCategory);
      if (res.success && res.data) {
        const d = res.data;
        if (d.registration_number) setNewVehiclePlate(d.registration_number);
        if (d.make) setNewVehicleMake(d.make);
        if (d.model) setNewVehicleModel(d.model);
        if (d.variant) setNewVehicleVariant(d.variant);
        if (d.category) setNewVehicleCategory(d.category);
        if (d.nickname) setNewVehicleNickname(d.nickname);
        if (d.paint_color) setNewVehicleColor(d.paint_color);
        if (d.vin_chassis_number) setNewVehicleVin(d.vin_chassis_number);
        if (d.engine_number) setNewVehicleEngine(d.engine_number);
        if (d.fuel_type) setNewVehicleFuel(d.fuel_type);
        if (d.registration_date) setNewVehicleRegDate(normalizeDateToInputFormat(d.registration_date));
        if (d.rto_office) setNewVehicleRtoOffice(d.rto_office);
        if (d.registered_owner) setNewVehicleOwner(d.registered_owner);
        if (d.rto_rmn) setNewVehicleRtoRmn(d.rto_rmn);
        if (d.insurance_policy_number) setNewVehicleInsurancePolicy(d.insurance_policy_number);
        if (d.insurance_expiry_date) setNewVehicleInsuranceExpiry(normalizeDateToInputFormat(d.insurance_expiry_date));
        if (isElectricFuel(d.fuel_type)) {
          setNewVehiclePucExpiry("");
        } else if (d.puc_expiry_date) {
          setNewVehiclePucExpiry(normalizeDateToInputFormat(d.puc_expiry_date));
        }
        if (d.fitness_expiry_date) setNewVehicleFitnessExpiry(normalizeDateToInputFormat(d.fitness_expiry_date));
        if (d.odometer_km && Number(newVehicleOdometer) === 0) setNewVehicleOdometer(d.odometer_km);

        const rtoLocation = d.rto_office || "RTO Registry Office";

        if (d.make && d.model) {
          setPortalLookupMsg({
            type: "success",
            message: `Parivahan record verified: ${d.make} ${d.model}${d.variant ? ` (${d.variant})` : ""} • ${rtoLocation}`,
            rtoOffice: d.rto_office,
            source: d.source || "Live Parivahan / VAHAN Gateway"
          });
        } else {
          setPortalLookupMsg({
            type: "info",
            message: `RTO Jurisdiction verified: ${rtoLocation}${d.state ? ` (${d.state})` : ""}. Select or enter vehicle make & model below.`,
            rtoOffice: d.rto_office,
            source: d.source || "Official Parivahan RTO Registry"
          });
        }
      } else {
        setPortalLookupMsg({
          type: "error",
          message: res.error || "Could not fetch vehicle specifications from portal."
        });
      }
    } catch (err: any) {
      const isSkew = err?.message?.includes("was not found on the server") || err?.message?.includes("failed-to-find-server-action");
      setPortalLookupMsg({
        type: "error",
        message: isSkew
          ? "Portal update detected. Please refresh your browser tab (Ctrl+R) to synchronize."
          : (err.message || "Failed to connect to vehicle portal service.")
      });
    } finally {
      setFetchingPortal(false);
    }
  };

  const handleResetVehicleForm = () => {
    setNewVehiclePlate("");
    setNewVehicleMake("");
    setNewVehicleModel("");
    setNewVehicleVariant("Standard");
    setNewVehicleCategory("CAR");
    setNewVehicleStatus("IN_STOCK");
    setNewVehicleOdometer(0);
    setNewVehicleDriverId("");
    setNewVehicleNickname("");
    setNewVehicleColor("#1e293b");
    setNewVehicleVin("");
    setNewVehicleEngine("");
    setNewVehicleFuel("Petrol");
    setNewVehicleRegDate("");
    setNewVehicleRtoOffice("");
    setNewVehicleOwner("");
    setNewVehicleRtoRmn("");
    setNewVehicleInsuranceVendorId("");
    setNewVehicleInsuranceVendor("");
    setNewVehicleInsurancePolicy("");
    setNewVehicleInsuranceExpiry("");
    setNewVehiclePucExpiry("");
    setNewVehicleFitnessExpiry("");
    setNewVehicleHsrp(true);
    setNewVehicleRsa(true);
    setPortalLookupMsg(null);
  };

  // Automatically sync verified RTO office into form whenever plate is recognized
  useEffect(() => {
    if (newPlateInfo.rtoName) {
      setNewVehicleRtoOffice(newPlateInfo.rtoName);
    }
  }, [newPlateInfo.rtoName]);

  // Instant Auto-Fetch Hook: triggers automatically whenever user types 6+ plate characters
  useEffect(() => {
    const clean = newVehiclePlate.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    if (clean.length >= 6 && activeTab === "register") {
      const timer = setTimeout(() => {
        handlePortalAutoFetch(clean);
      }, 450);
      return () => clearTimeout(timer);
    }
  }, [newVehiclePlate, activeTab]);

  const handleCreateVehicle = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const rawPlate = newVehiclePlate.trim().toUpperCase();
    if (!rawPlate) {
      triggerToast("Please enter a vehicle registration number.", true);
      return;
    }

    setModalSubmitting(true);
    try {
      let make = newVehicleMake.trim();
      let model = newVehicleModel.trim();
      let variant = newVehicleVariant.trim();
      let category = newVehicleCategory;
      let fuel = newVehicleFuel;
      let vin = newVehicleVin.trim();
      let engine = newVehicleEngine.trim();
      let rto = newVehicleRtoOffice.trim();
      let owner = newVehicleOwner.trim();
      let rtoRmn = newVehicleRtoRmn.trim();
      let regDate = newVehicleRegDate;
      let insVendorId = newVehicleInsuranceVendorId;
      let insVendor = newVehicleInsuranceVendor.trim();
      let insPolicy = newVehicleInsurancePolicy.trim();
      let insExp = newVehicleInsuranceExpiry;
      let pucExp = newVehiclePucExpiry;
      let fitExp = newVehicleFitnessExpiry;
      let odo = Number(newVehicleOdometer) || 0;
      let nickname = (newVehicleNickname.trim() || `${make} ${model}`).trim();

      const isElectric = isElectricFuel(fuel);

      // Mandatory validation for required input fields
      if (!rawPlate) {
        triggerToast("Registration plate number (Regn. No.) is mandatory.", true);
        setModalSubmitting(false);
        return;
      }
      if (!make || !model) {
        triggerToast("Vehicle Name (Make & Model) is mandatory.", true);
        setModalSubmitting(false);
        return;
      }
      if (!owner) {
        triggerToast("Owner Name (Registered Owner) is mandatory.", true);
        setModalSubmitting(false);
        return;
      }
      if (!isElectric && !pucExp) {
        triggerToast("PUC End Date is mandatory for non-electric vehicles.", true);
        setModalSubmitting(false);
        return;
      }
      if (!insExp) {
        triggerToast("Insurance End Date is mandatory.", true);
        setModalSubmitting(false);
        return;
      }
      if (!regDate) {
        triggerToast("Registration Date is mandatory.", true);
        setModalSubmitting(false);
        return;
      }
      if (!vin) {
        triggerToast("Chassis Number (VIN) is mandatory.", true);
        setModalSubmitting(false);
        return;
      }
      if (!engine) {
        triggerToast("Engine Number is mandatory.", true);
        setModalSubmitting(false);
        return;
      }
      if (!rtoRmn) {
        triggerToast("RTO RMN (Registered Mobile Number) is mandatory.", true);
        setModalSubmitting(false);
        return;
      }

      const res = await submitNewVehicle({
        registration_number: rawPlate,
        make: make.trim(),
        model: model.trim(),
        variant: variant || "Standard",
        category,
        status: newVehicleStatus,
        odometer_km: odo,
        assigned_driver_id: newVehicleDriverId || undefined,
        nickname: nickname,
        paint_color: newVehicleColor || undefined,
        vin_chassis_number: vin,
        engine_number: engine,
        fuel_type: fuel,
        registration_date: regDate,
        rto_office: rto || undefined,
        registered_owner: owner,
        rto_rmn: rtoRmn,
        insurance_vendor_id: insVendorId || undefined,
        insurance_vendor: insVendor || undefined,
        insurance_policy_number: insPolicy || undefined,
        insurance_expiry_date: insExp,
        puc_expiry_date: isElectric ? undefined : pucExp,
        fitness_expiry_date: fitExp || undefined,
        has_roadside_assistance: newVehicleRsa,
        has_hsrp_plate: newVehicleHsrp
      });

      if (res.success) {
        triggerToast(`Vehicle ${newVehiclePlate.toUpperCase()} registered successfully!`);
        handleResetVehicleForm();
        loadAllData(true);
        router.push("/vehicle/inventory");
      } else {
        triggerToast(res.error || "Failed to add vehicle", true);
      }
    } catch (err: any) {
      triggerToast(err.message || "Failed to add vehicle", true);
    } finally {
      setModalSubmitting(false);
    }
  };

  const openEditVehicleModal = (veh: VehicleRecord) => {
    setSelectedVehicleForEdit(veh);
    setEditPortalLookupMsg(null);
    setEditVehiclePlate(veh.registration_number);
    setEditVehicleMake(veh.make);
    setEditVehicleModel(veh.model);
    setEditVehicleVariant(veh.variant || "");
    setEditVehicleCategory(veh.category || "CAR");
    setEditVehicleStatus(veh.status || "IN_STOCK");
    setEditVehicleOdometer(veh.odometer_km || 0);
    setEditVehicleDriverId(veh.assignedDriver?.id || "");
    setEditVehicleNickname(veh.nickname || "");
    setEditVehicleColor(veh.paint_color || "#1e293b");
    setEditVehicleVin(veh.vin_chassis_number || "");
    setEditVehicleEngine(veh.engine_number || "");
    setEditVehicleFuel(veh.fuel_type || "Petrol");
    setEditVehicleRegDate(veh.registration_date ? String(veh.registration_date).split("T")[0] : "");
    setEditVehicleRtoOffice(veh.rto_office || "");
    setEditVehicleOwner(veh.registered_owner || "");
    setEditVehicleRtoRmn(veh.rto_rmn || "");
    setEditVehicleInsuranceVendorId(veh.insurance_vendor_id || "");
    setEditVehicleInsuranceVendor(veh.insurance_vendor || "");
    setEditVehicleInsurancePolicy(veh.insurance_policy_number || "");
    const isEv = isElectricFuel(veh.fuel_type);
    setEditVehicleInsuranceExpiry(veh.insurance_expiry_date ? String(veh.insurance_expiry_date).split("T")[0] : "");
    setEditVehiclePucExpiry(isEv ? "" : (veh.puc_expiry_date ? String(veh.puc_expiry_date).split("T")[0] : ""));
    setEditVehicleFitnessExpiry(veh.fitness_expiry_date ? String(veh.fitness_expiry_date).split("T")[0] : "");
    setEditVehicleHsrp(veh.has_hsrp_plate !== undefined ? veh.has_hsrp_plate : true);
    setEditVehicleRsa(veh.has_roadside_assistance !== undefined ? veh.has_roadside_assistance : true);
    setIsEditVehicleOpen(true);
  };

  const handleEditPortalAutoFetch = async (plateOverride?: string) => {
    const rawPlate = (plateOverride || editVehiclePlate).trim();
    if (!rawPlate) {
      setEditPortalLookupMsg({
        type: "error",
        message: "Please enter a vehicle registration number first."
      });
      return;
    }

    setFetchingEditPortal(true);
    setEditPortalLookupMsg(null);

    try {
      const res = await queryVehiclePortal(rawPlate, editVehicleCategory);
      if (res.success && res.data) {
        const d = res.data;
        if (d.registration_number) setEditVehiclePlate(d.registration_number);
        if (d.make) setEditVehicleMake(d.make);
        if (d.model) setEditVehicleModel(d.model);
        if (d.variant) setEditVehicleVariant(d.variant);
        if (d.category) setEditVehicleCategory(d.category);
        if (d.nickname) setEditVehicleNickname(d.nickname);
        if (d.paint_color) setEditVehicleColor(d.paint_color);
        if (d.vin_chassis_number) setEditVehicleVin(d.vin_chassis_number);
        if (d.engine_number) setEditVehicleEngine(d.engine_number);
        if (d.fuel_type) setEditVehicleFuel(d.fuel_type);
        if (d.registration_date) setEditVehicleRegDate(normalizeDateToInputFormat(d.registration_date));
        if (d.rto_office) setEditVehicleRtoOffice(d.rto_office);
        if (d.registered_owner) setEditVehicleOwner(d.registered_owner);
        if (d.rto_rmn) setEditVehicleRtoRmn(d.rto_rmn);
        if (d.insurance_policy_number) setEditVehicleInsurancePolicy(d.insurance_policy_number);
        if (d.insurance_expiry_date) setEditVehicleInsuranceExpiry(normalizeDateToInputFormat(d.insurance_expiry_date));
        if (isElectricFuel(d.fuel_type)) {
          setEditVehiclePucExpiry("");
        } else if (d.puc_expiry_date) {
          setEditVehiclePucExpiry(normalizeDateToInputFormat(d.puc_expiry_date));
        }
        if (d.fitness_expiry_date) setEditVehicleFitnessExpiry(normalizeDateToInputFormat(d.fitness_expiry_date));

        const rtoLocation = d.rto_office || "RTO Registry Office";

        setEditPortalLookupMsg({
          type: "success",
          message: `All details updated: ${d.make} ${d.model}${d.variant ? ` (${d.variant})` : ""} • ${rtoLocation}`,
          rtoOffice: d.rto_office,
          source: d.source || "Universal RTO Portal"
        });
      } else {
        setEditPortalLookupMsg({
          type: "error",
          message: res.error || "Could not fetch vehicle specifications from portal."
        });
      }
    } catch (err: any) {
      const isSkew = err?.message?.includes("was not found on the server") || err?.message?.includes("failed-to-find-server-action");
      setEditPortalLookupMsg({
        type: "error",
        message: isSkew
          ? "Portal update detected. Please refresh your browser tab (Ctrl+R) to synchronize."
          : (err.message || "Failed to connect to vehicle portal service.")
      });
    } finally {
      setFetchingEditPortal(false);
    }
  };

  const handleUpdateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleForEdit) return;

    setModalSubmitting(true);
    try {
      const res = await updateVehicleAction(selectedVehicleForEdit.id, {
        registration_number: editVehiclePlate.trim(),
        make: editVehicleMake.trim(),
        model: editVehicleModel.trim(),
        variant: editVehicleVariant.trim(),
        category: editVehicleCategory,
        status: editVehicleStatus,
        odometer_km: Number(editVehicleOdometer) || 0,
        assigned_driver_id: editVehicleDriverId || null,
        nickname: editVehicleNickname.trim(),
        paint_color: editVehicleColor,
        vin_chassis_number: editVehicleVin.trim() || undefined,
        engine_number: editVehicleEngine.trim() || undefined,
        fuel_type: editVehicleFuel,
        registration_date: editVehicleRegDate || undefined,
        rto_office: editVehicleRtoOffice.trim() || undefined,
        registered_owner: editVehicleOwner.trim() || undefined,
        rto_rmn: editVehicleRtoRmn.trim() || undefined,
        insurance_vendor_id: editVehicleInsuranceVendorId || null,
        insurance_vendor: editVehicleInsuranceVendor || null,
        insurance_policy_number: editVehicleInsurancePolicy.trim() || undefined,
        insurance_expiry_date: editVehicleInsuranceExpiry || undefined,
        puc_expiry_date: editVehiclePucExpiry || undefined,
        fitness_expiry_date: editVehicleFitnessExpiry || undefined,
        has_roadside_assistance: editVehicleRsa,
        has_hsrp_plate: editVehicleHsrp
      });

      if (res.success) {
        triggerToast(`Vehicle ${editVehiclePlate.toUpperCase()} updated successfully!`);
        setIsEditVehicleOpen(false);
        const updatedVehId = selectedVehicleForEdit.id;
        
        // Optimistic state sync
        setVehicles(prev => prev.map(v => {
          if (v.id === updatedVehId) {
            const matchedDriver = drivers.find(d => d.id === editVehicleDriverId);
            return {
              ...v,
              registration_number: editVehiclePlate.trim().toUpperCase(),
              make: editVehicleMake.trim(),
              model: editVehicleModel.trim(),
              variant: editVehicleVariant.trim() || "Standard",
              category: editVehicleCategory,
              status: editVehicleStatus,
              odometer_km: Number(editVehicleOdometer) || 0,
              nickname: editVehicleNickname.trim() || v.nickname,
              paint_color: editVehicleColor,
              vin_chassis_number: editVehicleVin.trim() || v.vin_chassis_number,
              engine_number: editVehicleEngine.trim() || v.engine_number,
              fuel_type: editVehicleFuel,
              registration_date: editVehicleRegDate || v.registration_date,
              rto_office: editVehicleRtoOffice.trim() || v.rto_office,
              registered_owner: editVehicleOwner.trim() || v.registered_owner,
              rto_rmn: editVehicleRtoRmn.trim() || v.rto_rmn,
              insurance_vendor_id: editVehicleInsuranceVendorId || null,
              insurance_vendor: editVehicleInsuranceVendor || null,
              insurance_policy_number: editVehicleInsurancePolicy.trim() || v.insurance_policy_number,
              insurance_expiry_date: editVehicleInsuranceExpiry || v.insurance_expiry_date,
              puc_expiry_date: editVehiclePucExpiry || v.puc_expiry_date,
              fitness_expiry_date: editVehicleFitnessExpiry || v.fitness_expiry_date,
              has_roadside_assistance: editVehicleRsa,
              has_hsrp_plate: editVehicleHsrp,
              assignedDriver: matchedDriver ? { id: matchedDriver.id, full_name: matchedDriver.full_name, phone: matchedDriver.phone } : null
            };
          }
          return v;
        }));

        setSelectedVehicleForEdit(null);
        await loadAllData(true);

        if (selectedVehicleForSpecHistory?.id === updatedVehId) {
          fetchVehicleSpecificationHistoryAction(updatedVehId).then(hRes => {
            if (hRes.success) setVehicleSpecHistory(hRes.history);
          });
        }
      } else {
        triggerToast(res.error || "Failed to update vehicle", true);
      }
    } catch (err: any) {
      triggerToast(err.message || "Failed to update vehicle", true);
    } finally {
      setModalSubmitting(false);
    }
  };

  // ----------------------------------------------------------------------------
  // CRUD Handlers: INSURANCE VENDORS
  // ----------------------------------------------------------------------------

  const openCreateVendorModal = () => {
    setSelectedVendorForEdit(null);
    setVendorFormCode("");
    setVendorFormName("");
    setVendorFormContactPerson("");
    setVendorFormContactNumber("");
    setVendorFormEmail("");
    setVendorFormSupportTollFree("");
    setVendorFormWebsite("");
    setVendorFormDesc("");
    setIsVendorModalOpen(true);
  };

  const openEditVendorModal = (vendor: InsuranceVendorRecord) => {
    setSelectedVendorForEdit(vendor);
    setVendorFormCode(vendor.code || "");
    setVendorFormName(vendor.name || "");
    setVendorFormContactPerson(vendor.contact_person || "");
    setVendorFormContactNumber(vendor.contact_number || "");
    setVendorFormEmail(vendor.email || "");
    setVendorFormSupportTollFree(vendor.support_toll_free || "");
    setVendorFormWebsite(vendor.website || "");
    setVendorFormDesc(vendor.description || "");
    setIsVendorModalOpen(true);
  };

  const handleSaveVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorFormName.trim()) {
      triggerToast("Insurance vendor name is mandatory.", true);
      return;
    }

    setModalSubmitting(true);
    try {
      const generatedCode = vendorFormCode.trim().toUpperCase() || vendorFormName.trim().slice(0, 8).toUpperCase().replace(/[^A-Z0-9]/g, "");
      const payload = {
        code: generatedCode,
        name: vendorFormName.trim(),
        contact_person: vendorFormContactPerson.trim() || undefined,
        contact_number: vendorFormContactNumber.trim() || undefined,
        email: vendorFormEmail.trim() || undefined,
        support_toll_free: vendorFormSupportTollFree.trim() || undefined,
        website: vendorFormWebsite.trim() || undefined,
        description: vendorFormDesc.trim() || undefined,
        is_active: true
      };

      let res;
      if (selectedVendorForEdit) {
        res = await updateInsuranceVendorAction(selectedVendorForEdit.id, payload);
      } else {
        res = await createInsuranceVendorAction(payload);
      }

      if (res.success) {
        triggerToast(`Insurance vendor '${payload.name}' saved successfully!`);
        setIsVendorModalOpen(false);
        // Auto-select in form if adding from a vehicle creation or edit flow
        if (!selectedVendorForEdit && res.vendor) {
          if (activeTab === "register") {
            setNewVehicleInsuranceVendorId(res.vendor.id);
            setNewVehicleInsuranceVendor(res.vendor.name);
          } else if (isEditVehicleOpen) {
            setEditVehicleInsuranceVendorId(res.vendor.id);
            setEditVehicleInsuranceVendor(res.vendor.name);
          }
        }
        loadAllData(true);
      } else {
        triggerToast(res.error || "Failed to save insurance vendor.", true);
      }
    } catch (err: any) {
      triggerToast(err.message || "Failed to save insurance vendor.", true);
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleDeleteVendor = async (id: string, name: string) => {
    try {
      const res = await deleteInsuranceVendorAction(id);
      if (res.success) {
        triggerToast(`Insurance vendor '${name}' deleted successfully.`);
        loadAllData(true);
      } else {
        triggerToast(res.error || "Failed to delete insurance vendor.", true);
      }
    } catch (err: any) {
      triggerToast(err.message || "Failed to delete insurance vendor.", true);
    }
  };

  // ----------------------------------------------------------------------------
  // CRUD Handlers: DRIVERS
  // ----------------------------------------------------------------------------

  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriverName.trim() || !newDriverPhone.trim() || !newDriverLicense.trim()) {
      triggerToast("Driver name, phone, and license number are required.", true);
      return;
    }

    setModalSubmitting(true);
    try {
      const res = await createDriverAction({
        full_name: newDriverName.trim(),
        phone: newDriverPhone.trim(),
        license_number: newDriverLicense.trim(),
        license_expiry_date: newDriverLicenseExpiry || undefined,
        experience_years: Number(newDriverExperience) || 1,
        emergency_contact: newDriverEmergency.trim() || undefined,
        assigned_vehicle_id: newDriverVehicleId || undefined
      });

      if (res.success) {
        triggerToast(`Driver ${newDriverName} added successfully!`);
        setIsAddDriverOpen(false);
        setNewDriverName("");
        setNewDriverPhone("");
        setNewDriverLicense("");
        setNewDriverLicenseExpiry("");
        setNewDriverExperience(3);
        setNewDriverEmergency("");
        setNewDriverVehicleId("");
        loadAllData(true);
      } else {
        triggerToast(res.error || "Failed to add driver", true);
      }
    } catch (err: any) {
      triggerToast(err.message || "Failed to add driver", true);
    } finally {
      setModalSubmitting(false);
    }
  };

  const openEditDriverModal = (drv: DriverRecord) => {
    setSelectedDriverForEdit(drv);
    setEditDriverName(drv.full_name);
    setEditDriverPhone(drv.phone);
    setEditDriverLicense(drv.license_number);
    setEditDriverLicenseExpiry(drv.license_expiry_date || "");
    setEditDriverExperience(drv.experience_years || 0);
    setEditDriverEmergency(drv.emergency_contact || "");
    setEditDriverVehicleId(drv.assigned_vehicle_id || "");
    setEditDriverActive(drv.is_active);
    setIsEditDriverOpen(true);
  };

  const handleUpdateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriverForEdit) return;

    setModalSubmitting(true);
    try {
      const res = await updateDriverAction(selectedDriverForEdit.id, {
        full_name: editDriverName.trim(),
        phone: editDriverPhone.trim(),
        license_number: editDriverLicense.trim(),
        license_expiry_date: editDriverLicenseExpiry || undefined,
        experience_years: Number(editDriverExperience) || 0,
        emergency_contact: editDriverEmergency.trim() || undefined,
        assigned_vehicle_id: editDriverVehicleId || null,
        is_active: editDriverActive
      });

      if (res.success) {
        triggerToast(`Driver ${editDriverName} updated successfully!`);
        setIsEditDriverOpen(false);
        setSelectedDriverForEdit(null);
        loadAllData(true);
      } else {
        triggerToast(res.error || "Failed to update driver", true);
      }
    } catch (err: any) {
      triggerToast(err.message || "Failed to update driver", true);
    } finally {
      setModalSubmitting(false);
    }
  };

  // ----------------------------------------------------------------------------
  // CRUD Handlers: TRIPS & DISPATCH
  // ----------------------------------------------------------------------------

  const handleDispatchTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTripVehicleId || !newTripDriverId || !newTripTraveler.trim() || !newTripPurpose.trim() || !newTripOrigin.trim() || !newTripDestination.trim()) {
      triggerToast("Please fill in vehicle, driver, traveler name, purpose, origin and destination.", true);
      return;
    }

    setModalSubmitting(true);
    try {
      const res = await createTripPlanAction({
        vehicle_id: newTripVehicleId,
        driver_id: newTripDriverId,
        traveler_name: newTripTraveler.trim(),
        purpose: newTripPurpose.trim(),
        origin: newTripOrigin.trim(),
        destination: newTripDestination.trim(),
        plan_date: newTripDate || undefined,
        planned_start_time: newTripStartTime,
        planned_end_time: newTripEndTime
      });

      if (res.success) {
        triggerToast("Trip successfully dispatched!");
        setIsDispatchTripOpen(false);
        setNewTripTraveler("");
        setNewTripPurpose("");
        setNewTripOrigin("");
        setNewTripDestination("");
        setNewTripVehicleId("");
        setNewTripDriverId("");
        loadAllData(true);
      } else {
        triggerToast(res.error || "Failed to dispatch trip", true);
      }
    } catch (err: any) {
      triggerToast(err.message || "Failed to dispatch trip", true);
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleUpdateTripStatus = async (
    tripId: string, 
    newStatus: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
  ) => {
    try {
      const res = await updateTripStatusAction(tripId, newStatus);
      if (res.success) {
        triggerToast(`Trip status marked as ${newStatus}!`);
        loadAllData(true);
      } else {
        triggerToast(res.error || "Failed to update trip status", true);
      }
    } catch (err: any) {
      triggerToast(err.message || "Failed to update trip status", true);
    }
  };

  // ----------------------------------------------------------------------------
  // CRUD Handlers: SERVICE RECORDS & WORKSHOP JOB CARDS
  // ----------------------------------------------------------------------------

  const handleLogMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMaintVehicleId || !newMaintServiceType.trim() || !newMaintVendor.trim()) {
      triggerToast("Please select a target vehicle, specify service scope, and authorized workshop.", true);
      return;
    }

    setModalSubmitting(true);
    try {
      const partsPayload = {
        category: newMaintCategory,
        invoice_number: newMaintInvoiceNo.trim() || undefined,
        location: newMaintLocation.trim() || undefined,
        parts_cost: Number(newMaintPartsCost) || 0,
        labour_cost: Number(newMaintLabourCost) || 0,
        tax_amount: Number(newMaintTaxCost) || 0,
        payment_mode: newMaintPaymentMode,
        payment_status: newMaintPaymentStatus,
        technician_notes: newMaintNotes.trim() || undefined
      };

      const res = await createServiceRecordAction({
        vehicle_id: newMaintVehicleId,
        service_type: newMaintServiceType.trim(),
        service_center: newMaintVendor.trim(),
        service_date: newMaintDate || undefined,
        cost: Number(newMaintCost) || 0,
        odometer_km: Number(newMaintOdometer) || 0,
        next_service_due_date: newMaintNextDue || undefined,
        next_service_due_odometer: Number(newMaintNextDueOdometer) || undefined,
        technician_name: newMaintTechnician.trim() || undefined,
        parts_replaced: partsPayload,
        post_service_status: newMaintPostStatus || "IN_STOCK"
      });

      if (res.success) {
        triggerToast("Workshop Job Card & Service Bill logged successfully!");
        setIsAddMaintenanceOpen(false);
        resetMaintenanceForm();
        loadAllData(true);
      } else {
        triggerToast(res.error || "Failed to log maintenance", true);
      }
    } catch (err: any) {
      triggerToast(err.message || "Failed to log maintenance", true);
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleUpdateMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaintenanceForEdit) return;
    if (!editMaintVehicleId || !editMaintServiceType.trim() || !editMaintVendor.trim()) {
      triggerToast("Please select a target vehicle, specify service scope, and authorized workshop.", true);
      return;
    }

    setModalSubmitting(true);
    try {
      const existingParts = typeof selectedMaintenanceForEdit.parts_replaced === "object" && selectedMaintenanceForEdit.parts_replaced !== null
        ? selectedMaintenanceForEdit.parts_replaced
        : {};

      const partsPayload = {
        ...existingParts,
        category: editMaintCategory,
        invoice_number: editMaintInvoiceNo.trim() || undefined,
        location: editMaintLocation.trim() || undefined,
        parts_cost: Number(editMaintPartsCost) || 0,
        labour_cost: Number(editMaintLabourCost) || 0,
        tax_amount: Number(editMaintTaxCost) || 0,
        payment_mode: editMaintPaymentMode,
        payment_status: editMaintPaymentStatus,
        technician_notes: editMaintNotes.trim() || undefined
      };

      const res = await updateServiceRecordAction(selectedMaintenanceForEdit.id, {
        vehicle_id: editMaintVehicleId,
        service_type: editMaintServiceType.trim(),
        service_center: editMaintVendor.trim(),
        service_date: editMaintDate || undefined,
        cost: Number(editMaintCost) || 0,
        odometer_km: Number(editMaintOdometer) || 0,
        next_service_due_date: editMaintNextDue || undefined,
        next_service_due_odometer: Number(editMaintNextDueOdometer) || undefined,
        technician_name: editMaintTechnician.trim() || undefined,
        parts_replaced: partsPayload,
        post_service_status: editMaintPostStatus || "IN_STOCK"
      });

      if (res.success) {
        triggerToast("Workshop Job Card & Service Bill updated successfully!");
        setIsEditMaintenanceOpen(false);
        setSelectedMaintenanceForEdit(null);
        loadAllData(true);
      } else {
        triggerToast(res.error || "Failed to update maintenance record", true);
      }
    } catch (err: any) {
      triggerToast(err.message || "Failed to update maintenance record", true);
    } finally {
      setModalSubmitting(false);
    }
  };

  // ----------------------------------------------------------------------------
  // CRUD Handlers: PARTS & ACCESSORIES (Dates, Expiries & Renewal Policies)
  // ----------------------------------------------------------------------------

  const openCreatePartModal = () => {
    setSelectedPartForEdit(null);
    setPartFormName("");
    setPartFormItemType("SPARE_PART");
    setPartFormPartNumber("");
    setPartFormCategory("Spare Parts");
    setPartFormBrand("");
    setPartFormPurchaseAmount(0);
    setPartFormUnitPrice(0);
    setPartFormQuantity(1);
    setPartFormPurchaseDate(new Date().toISOString().split("T")[0]);
    setPartFormVendorName("");
    setPartFormInvoiceNumber("");
    setPartFormManufacturingDate("");
    setPartFormExpiryDate("");
    setPartFormWarrantyType("WARRANTY");
    setPartFormWarrantyMonths(12);
    const nextYr = new Date();
    nextYr.setFullYear(nextYr.getFullYear() + 1);
    setPartFormWarrantyExpiryDate(nextYr.toISOString().split("T")[0]);
    setPartFormWarrantyTerms("Standard Manufacturer OEM Warranty");
    setPartFormHasRenewal(false);
    setPartFormRenewalType("GPS_SIM_RECHARGE");
    setPartFormRenewalDate("");
    setPartFormRenewalCost(0);
    setPartFormRenewalVendor("");
    setPartFormRenewalPolicyNumber("");
    setPartFormRenewalReminderDays(30);
    setPartFormStatus("IN_STOCK");
    setPartFormVehicleId("UNASSIGNED_STOCK");
    setPartFormAssignedVehicleReg("");
    setPartFormInstallationDate("");
    setPartFormInstalledOdometer("");
    setPartFormInstalledBy("");
    setPartFormCondition("NEW");
    setPartFormSerialNumber("");
    setPartFormNotes("");
    setIsAddPartOpen(true);
  };

  const openEditPartModal = (part: PartAccessoryRecord) => {
    setSelectedPartForEdit(part);
    setPartFormName(part.name || "");
    setPartFormItemType(part.item_type || "SPARE_PART");
    setPartFormPartNumber(part.part_number || "");
    setPartFormCategory(part.category || "Spare Parts");
    setPartFormBrand(part.brand || "");
    setPartFormPurchaseAmount(part.purchase_amount || 0);
    setPartFormUnitPrice(part.unit_price || 0);
    setPartFormQuantity(part.quantity || 1);
    setPartFormPurchaseDate(part.purchase_date ? part.purchase_date.split("T")[0] : "");
    setPartFormVendorName(part.vendor_name || "");
    setPartFormInvoiceNumber(part.invoice_number || "");
    setPartFormManufacturingDate(part.manufacturing_date ? part.manufacturing_date.split("T")[0] : "");
    setPartFormExpiryDate(part.expiry_date ? part.expiry_date.split("T")[0] : "");
    setPartFormWarrantyType(part.warranty_type || "WARRANTY");
    setPartFormWarrantyMonths(part.warranty_months || 0);
    setPartFormWarrantyExpiryDate(part.warranty_expiry_date ? part.warranty_expiry_date.split("T")[0] : "");
    setPartFormWarrantyTerms(part.warranty_terms || "");
    setPartFormHasRenewal(Boolean(part.has_renewal_policy));
    setPartFormRenewalType(part.renewal_policy_type || "GPS_SIM_RECHARGE");
    setPartFormRenewalDate(part.renewal_date ? part.renewal_date.split("T")[0] : "");
    setPartFormRenewalCost(part.renewal_cost || 0);
    setPartFormRenewalVendor(part.renewal_vendor || "");
    setPartFormRenewalPolicyNumber(part.renewal_policy_number || "");
    setPartFormRenewalReminderDays(part.renewal_reminder_days || 30);
    setPartFormStatus(part.status || "IN_STOCK");
    setPartFormVehicleId(part.vehicle_id || "UNASSIGNED_STOCK");
    setPartFormAssignedVehicleReg(part.assigned_vehicle_reg || "");
    setPartFormInstallationDate(part.installation_date ? part.installation_date.split("T")[0] : "");
    setPartFormInstalledOdometer(part.installed_odometer_km ?? "");
    setPartFormInstalledBy(part.installed_by || "");
    setPartFormCondition(part.condition || "NEW");
    setPartFormSerialNumber(part.serial_number || "");
    setPartFormNotes(part.notes || "");
    setIsEditPartOpen(true);
  };

  const handleSavePart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partFormName.trim()) {
      triggerToast("Part / Accessory name is required.", true);
      return;
    }
    if (!partFormBrand.trim()) {
      triggerToast("Brand / Manufacturer is required.", true);
      return;
    }

    setModalSubmitting(true);
    try {
      let assignedReg = partFormAssignedVehicleReg;
      if (partFormVehicleId && partFormVehicleId !== "UNASSIGNED_STOCK") {
        const matchedVeh = vehicles.find((v) => v.id === partFormVehicleId);
        if (matchedVeh) assignedReg = matchedVeh.registration_number;
      } else {
        assignedReg = "";
      }

      const totalAmt = Number(partFormPurchaseAmount) || (Number(partFormUnitPrice) * Number(partFormQuantity)) || 0;

      const payload = {
        name: partFormName.trim(),
        item_type: partFormItemType,
        part_number: partFormPartNumber.trim() || undefined,
        category: partFormCategory.trim() || "Spare Parts",
        brand: partFormBrand.trim(),
        purchase_amount: totalAmt,
        unit_price: Number(partFormUnitPrice) || undefined,
        quantity: Number(partFormQuantity) || 1,
        purchase_date: partFormPurchaseDate || new Date().toISOString().split("T")[0],
        vendor_name: partFormVendorName.trim() || "OEM / Direct Store",
        invoice_number: partFormInvoiceNumber.trim() || undefined,
        manufacturing_date: partFormManufacturingDate || undefined,
        expiry_date: partFormExpiryDate || undefined,
        warranty_type: partFormWarrantyType,
        warranty_months: Number(partFormWarrantyMonths) || 0,
        warranty_expiry_date: partFormWarrantyExpiryDate || undefined,
        warranty_terms: partFormWarrantyTerms.trim() || undefined,
        has_renewal_policy: partFormHasRenewal,
        renewal_policy_type: partFormHasRenewal ? partFormRenewalType : undefined,
        renewal_date: partFormHasRenewal ? partFormRenewalDate || undefined : undefined,
        renewal_cost: partFormHasRenewal ? Number(partFormRenewalCost) || 0 : undefined,
        renewal_vendor: partFormHasRenewal ? partFormRenewalVendor.trim() || undefined : undefined,
        renewal_policy_number: partFormHasRenewal ? partFormRenewalPolicyNumber.trim() || undefined : undefined,
        renewal_reminder_days: partFormHasRenewal ? Number(partFormRenewalReminderDays) || 30 : undefined,
        status: partFormVehicleId && partFormVehicleId !== "UNASSIGNED_STOCK" ? "INSTALLED" : partFormStatus,
        vehicle_id: partFormVehicleId || "UNASSIGNED_STOCK",
        assigned_vehicle_reg: assignedReg || undefined,
        installation_date: partFormInstallationDate || undefined,
        installed_odometer_km: partFormInstalledOdometer !== "" ? Number(partFormInstalledOdometer) : undefined,
        installed_by: partFormInstalledBy.trim() || undefined,
        condition: partFormCondition,
        serial_number: partFormSerialNumber.trim() || undefined,
        notes: partFormNotes.trim() || undefined
      };

      let res;
      if (selectedPartForEdit) {
        res = await updateVehiclePartAction(selectedPartForEdit.id, payload);
      } else {
        res = await createVehiclePartAction(payload);
      }

      if (res.success) {
        triggerToast(`Part '${payload.name}' saved successfully!`);
        setIsAddPartOpen(false);
        setIsEditPartOpen(false);
        setSelectedPartForEdit(null);
        loadAllData(true);
      } else {
        triggerToast(res.error || "Failed to save part record.", true);
      }
    } catch (err: any) {
      triggerToast(err.message || "Failed to save part record.", true);
    } finally {
      setModalSubmitting(false);
    }
  };

  const openRenewPartModal = (part: PartAccessoryRecord) => {
    setSelectedPartForRenew(part);
    const curDate = part.renewal_date ? new Date(part.renewal_date) : new Date();
    const nextDate = new Date(curDate);
    nextDate.setFullYear(nextDate.getFullYear() + 1);
    setRenewModalDate(nextDate.toISOString().split("T")[0]);
    setRenewModalCost(part.renewal_cost || 0);
    setRenewModalVendor(part.renewal_vendor || part.vendor_name || "");
    setRenewModalPolicyNumber(part.renewal_policy_number || "");
    setRenewModalNotes("");
    setIsRenewPartOpen(true);
  };

  const handleSaveRenewal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartForRenew) return;
    if (!renewModalDate) {
      triggerToast("New renewal date is required.", true);
      return;
    }

    setModalSubmitting(true);
    try {
      const res = await renewPartPolicyAction(selectedPartForRenew.id, {
        new_renewal_date: renewModalDate,
        renewal_cost: Number(renewModalCost) || 0,
        renewal_vendor: renewModalVendor.trim() || undefined,
        policy_number: renewModalPolicyNumber.trim() || undefined,
        notes: renewModalNotes.trim() || undefined
      });

      if (res.success) {
        triggerToast(`Policy for '${selectedPartForRenew.name}' renewed until ${renewModalDate}!`);
        setIsRenewPartOpen(false);
        setSelectedPartForRenew(null);
        loadAllData(true);
      } else {
        triggerToast(res.error || "Failed to renew policy.", true);
      }
    } catch (err: any) {
      triggerToast(err.message || "Failed to renew policy.", true);
    } finally {
      setModalSubmitting(false);
    }
  };

  // ----------------------------------------------------------------------------
  // Vehicle Insurance Policy Renewal & History Handlers
  // ----------------------------------------------------------------------------

  const handleOpenVehiclePolicyRenewModal = (veh: VehicleRecord) => {
    setSelectedVehicleForPolicyRenew(veh);
    
    // Auto-calculate continuous cycle dates:
    // Start Date: Old expiry date + 1 day (or today if unset)
    let startDateStr = new Date().toISOString().split("T")[0];
    if (veh.insurance_expiry_date) {
      const oldExp = new Date(veh.insurance_expiry_date);
      if (!isNaN(oldExp.getTime())) {
        const nextDay = new Date(oldExp);
        nextDay.setDate(nextDay.getDate() + 1);
        startDateStr = nextDay.toISOString().split("T")[0];
      }
    }
    
    // End Date: Start Date + 1 Year - 1 Day
    const st = new Date(startDateStr);
    const end = new Date(st);
    end.setFullYear(end.getFullYear() + 1);
    end.setDate(end.getDate() - 1);
    const endDateStr = end.toISOString().split("T")[0];

    setRenewPolicyStartDate(startDateStr);
    setRenewPolicyEndDate(endDateStr);
    setRenewPolicyVendorId(veh.insurance_vendor_id || "");
    setRenewPolicyVendorName(veh.insurance_vendor || "");
    setRenewPolicyNumber("");
    setRenewPolicyType("Comprehensive");
    setRenewPolicyIdv(650000);
    setRenewPolicyPremium(16500);
    setRenewPolicyNcb(20);
    setRenewPolicyHasRsa(veh.has_roadside_assistance !== undefined ? veh.has_roadside_assistance : true);
    setRenewPolicyHasZeroDep(true);
    setRenewPolicyHasEngineProtect(false);
    setRenewPolicyReceiptNo("");
    setRenewPolicyDocUrl("");
    setRenewPolicyNotes(`Annual policy renewal for ${veh.registration_number}.`);
    setIsRenewPolicyModalOpen(true);
  };

  const handleOpenVehiclePolicyHistoryModal = async (veh: VehicleRecord) => {
    setSelectedVehicleForPolicyHistory(veh);
    setIsPolicyHistoryModalOpen(true);
    setLoadingPolicyHistory(true);
    try {
      const res = await fetchVehicleInsurancePoliciesAction(veh.id);
      if (res.success) {
        setVehiclePoliciesHistory(res.policies);
      } else {
        triggerToast(res.error || "Failed to load policy history", true);
        setVehiclePoliciesHistory([]);
      }
    } catch (err: any) {
      triggerToast(err.message || "Failed to load policy history", true);
      setVehiclePoliciesHistory([]);
    } finally {
      setLoadingPolicyHistory(false);
    }
  };

  const handleSaveVehiclePolicyRenewal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleForPolicyRenew) return;

    if (!renewPolicyNumber.trim()) {
      triggerToast("New policy number is required.", true);
      return;
    }
    if (!renewPolicyVendorName.trim()) {
      triggerToast("Insurance provider / vendor is required.", true);
      return;
    }
    if (!renewPolicyStartDate || !renewPolicyEndDate) {
      triggerToast("Policy start and end dates are required.", true);
      return;
    }

    setModalSubmitting(true);
    try {
      const res = await renewVehicleInsurancePolicyAction(selectedVehicleForPolicyRenew.id, {
        policy_number: renewPolicyNumber.trim(),
        insurer_name: renewPolicyVendorName.trim(),
        insurance_vendor_id: renewPolicyVendorId || undefined,
        policy_type: renewPolicyType,
        idv: Number(renewPolicyIdv) || 0,
        premium_amount: Number(renewPolicyPremium) || 0,
        start_date: renewPolicyStartDate,
        end_date: renewPolicyEndDate,
        has_roadside_assistance: renewPolicyHasRsa,
        has_zero_depreciation: renewPolicyHasZeroDep,
        has_engine_protect: renewPolicyHasEngineProtect,
        ncb_discount_percentage: Number(renewPolicyNcb) || 0,
        receipt_number: renewPolicyReceiptNo.trim() || undefined,
        policy_document_url: renewPolicyDocUrl.trim() || undefined,
        notes: renewPolicyNotes.trim() || undefined
      });

      if (res.success) {
        triggerToast(`Policy #${renewPolicyNumber} successfully renewed until ${renewPolicyEndDate}!`);
        setIsRenewPolicyModalOpen(false);
        setSelectedVehicleForPolicyRenew(null);
        loadAllData(true);
        if (selectedVehicleForPolicyHistory?.id === selectedVehicleForPolicyRenew.id) {
          handleOpenVehiclePolicyHistoryModal(selectedVehicleForPolicyRenew);
        }
      } else {
        triggerToast(res.error || "Failed to renew policy.", true);
      }
    } catch (err: any) {
      triggerToast(err.message || "Failed to renew policy.", true);
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleDeletePolicyHistoryRecord = async (policyId: string) => {
    if (!selectedVehicleForPolicyHistory) return;
    if (!confirm("Are you sure you want to void this policy record?")) return;

    try {
      const res = await deleteVehicleInsurancePolicyAction(policyId, selectedVehicleForPolicyHistory.id);
      if (res.success) {
        triggerToast("Policy record removed.");
        handleOpenVehiclePolicyHistoryModal(selectedVehicleForPolicyHistory);
        loadAllData(true);
      } else {
        triggerToast(res.error || "Failed to remove policy record.", true);
      }
    } catch (err: any) {
      triggerToast(err.message || "Failed to remove policy record.", true);
    }
  };

  // ----------------------------------------------------------------------------
  // Vehicle PUC (Pollution Under Control) Renewal & History Handlers
  // ----------------------------------------------------------------------------

  const handleOpenVehiclePucRenewModal = (veh: VehicleRecord) => {
    setSelectedVehicleForPucRenew(veh);

    // Auto-calculate continuous cycle dates:
    // Start Date: Old expiry date + 1 day (or today if unset)
    let startDateStr = new Date().toISOString().split("T")[0];
    if (veh.puc_expiry_date) {
      const oldExp = new Date(veh.puc_expiry_date);
      if (!isNaN(oldExp.getTime())) {
        const nextDay = new Date(oldExp);
        nextDay.setDate(nextDay.getDate() + 1);
        startDateStr = nextDay.toISOString().split("T")[0];
      }
    }

    // End Date: Start Date + 1 Year - 1 Day
    const st = new Date(startDateStr);
    const end = new Date(st);
    end.setFullYear(end.getFullYear() + 1);
    end.setDate(end.getDate() - 1);
    const endDateStr = end.toISOString().split("T")[0];

    setRenewPucValidFrom(startDateStr);
    setRenewPucValidUpto(endDateStr);
    setRenewPucNumber(veh.puc_certificate_number ? `${veh.puc_certificate_number}-REN` : "");
    setRenewPucTestingCenter("Authorized RTO Emission Testing Center");
    const isDiesel = /diesel/i.test(veh.fuel_type || "");
    const isCng = /cng|lpg/i.test(veh.fuel_type || "");
    setRenewPucFee(isDiesel ? 200 : isCng ? 180 : 150);
    setRenewPucEmissionNorm("BS-VI");
    setRenewPucCo(0.05);
    setRenewPucHc(45.0);
    setRenewPucSmokeDensity(isDiesel ? 0.45 : 0.10);
    setRenewPucReceiptNo("");
    setRenewPucDocUrl("");
    setRenewPucNotes(`Statutory emission inspection & PUC certificate renewed for ${veh.registration_number}.`);
    setIsRenewPucModalOpen(true);
  };

  const handleOpenVehiclePucHistoryModal = async (veh: VehicleRecord) => {
    setSelectedVehicleForPucHistory(veh);
    setIsPucHistoryModalOpen(true);
    setLoadingPucHistory(true);
    try {
      const res = await fetchVehiclePucCertificatesAction(veh.id);
      if (res.success) {
        setVehiclePucHistory(res.certificates);
      } else {
        triggerToast(res.error || "Failed to load PUC history", true);
        setVehiclePucHistory([]);
      }
    } catch (err: any) {
      triggerToast(err.message || "Failed to load PUC history", true);
      setVehiclePucHistory([]);
    } finally {
      setLoadingPucHistory(false);
    }
  };

  const handleSaveVehiclePucRenewal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleForPucRenew) return;

    if (!renewPucNumber.trim()) {
      triggerToast("PUC Certificate number is required.", true);
      return;
    }
    if (!renewPucValidFrom || !renewPucValidUpto) {
      triggerToast("Validity start and expiry dates are required.", true);
      return;
    }

    setModalSubmitting(true);
    try {
      const res = await renewVehiclePucCertificateAction(selectedVehicleForPucRenew.id, {
        certificate_number: renewPucNumber.trim(),
        valid_from: renewPucValidFrom,
        valid_upto: renewPucValidUpto,
        testing_center_name: renewPucTestingCenter.trim() || undefined,
        test_fee: Number(renewPucFee) || 150,
        emission_norm: renewPucEmissionNorm,
        carbon_monoxide_co: Number(renewPucCo) || 0.05,
        hydrocarbon_hc: Number(renewPucHc) || 45.0,
        smoke_density_k: Number(renewPucSmokeDensity) || undefined,
        receipt_number: renewPucReceiptNo.trim() || undefined,
        document_url: renewPucDocUrl.trim() || undefined,
        notes: renewPucNotes.trim() || undefined
      });

      if (res.success) {
        triggerToast(`PUC Certificate #${renewPucNumber} successfully issued until ${renewPucValidUpto}!`);
        setIsRenewPucModalOpen(false);
        setSelectedVehicleForPucRenew(null);
        loadAllData(true);
        if (selectedVehicleForPucHistory?.id === selectedVehicleForPucRenew.id) {
          handleOpenVehiclePucHistoryModal(selectedVehicleForPucRenew);
        }
      } else {
        triggerToast(res.error || "Failed to renew PUC certificate.", true);
      }
    } catch (err: any) {
      triggerToast(err.message || "Failed to renew PUC certificate.", true);
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleDeletePucHistoryRecord = async (pucId: string) => {
    if (!selectedVehicleForPucHistory) return;
    if (!confirm("Are you sure you want to void this PUC certificate record?")) return;

    try {
      const res = await deleteVehiclePucCertificateAction(pucId, selectedVehicleForPucHistory.id);
      if (res.success) {
        triggerToast("PUC certificate record removed.");
        handleOpenVehiclePucHistoryModal(selectedVehicleForPucHistory);
        loadAllData(true);
      } else {
        triggerToast(res.error || "Failed to remove PUC record.", true);
      }
    } catch (err: any) {
      triggerToast(err.message || "Failed to remove PUC record.", true);
    }
  };

  // ----------------------------------------------------------------------------
  // Vehicle Specification Revision History & Audit Handlers
  // ----------------------------------------------------------------------------

  const handleOpenVehicleSpecHistoryModal = async (veh: VehicleRecord) => {
    setSelectedVehicleForSpecHistory(veh);
    setIsSpecHistoryModalOpen(true);
    setLoadingSpecHistory(true);
    try {
      const res = await fetchVehicleSpecificationHistoryAction(veh.id);
      if (res.success) {
        setVehicleSpecHistory(res.history);
      } else {
        triggerToast(res.error || "Failed to load specification history", true);
        setVehicleSpecHistory([]);
      }
    } catch (err: any) {
      triggerToast(err.message || "Failed to load specification history", true);
      setVehicleSpecHistory([]);
    } finally {
      setLoadingSpecHistory(false);
    }
  };

  const handleDeleteSpecHistoryRecord = async (historyId: string) => {
    if (!selectedVehicleForSpecHistory) return;
    if (!confirm("Are you sure you want to void this specification revision log?")) return;

    try {
      const res = await deleteVehicleSpecificationHistoryRecordAction(historyId, selectedVehicleForSpecHistory.id);
      if (res.success) {
        triggerToast("Specification history log record voided.");
        handleOpenVehicleSpecHistoryModal(selectedVehicleForSpecHistory);
        loadAllData(true);
      } else {
        triggerToast(res.error || "Failed to void history record.", true);
      }
    } catch (err: any) {
      triggerToast(err.message || "Failed to void history record.", true);
    }
  };

  // ----------------------------------------------------------------------------
  // Generic Delete Action Handler
  // ----------------------------------------------------------------------------

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setModalSubmitting(true);
    try {
      let res: { success: boolean; error?: string };
      if (deleteTarget.type === "vehicle") {
        res = await deleteVehicleAction(deleteTarget.id);
      } else if (deleteTarget.type === "driver") {
        res = await deleteDriverAction(deleteTarget.id);
      } else if (deleteTarget.type === "trip") {
        res = await deleteTripAction(deleteTarget.id);
      } else if (deleteTarget.type === "vendor") {
        res = await deleteInsuranceVendorAction(deleteTarget.id);
      } else if (deleteTarget.type === "part") {
        res = await deleteVehiclePartAction(deleteTarget.id);
      } else {
        res = await deleteServiceRecordAction(deleteTarget.id);
      }

      if (res.success) {
        triggerToast(`${deleteTarget.label} deleted successfully!`);
        setDeleteTarget(null);
        loadAllData(true);
      } else {
        triggerToast(res.error || `Failed to delete ${deleteTarget.label}`, true);
      }
    } catch (err: any) {
      triggerToast(err.message || `Failed to delete ${deleteTarget.label}`, true);
    } finally {
      setModalSubmitting(false);
    }
  };

  // ----------------------------------------------------------------------------
  // Filtered Lists for Display
  // ----------------------------------------------------------------------------

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        v.registration_number.toLowerCase().includes(q) ||
        v.make.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        (v.nickname && v.nickname.toLowerCase().includes(q)) ||
        (v.assignedDriver?.full_name && v.assignedDriver.full_name.toLowerCase().includes(q));
      const matchesStatus = selectedStatus === "ALL" || v.status === selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [vehicles, searchQuery, selectedStatus]);

  const filteredDrivers = useMemo(() => {
    return drivers.filter(d => {
      const q = searchQuery.toLowerCase().trim();
      return !q ||
        d.full_name.toLowerCase().includes(q) ||
        d.phone.toLowerCase().includes(q) ||
        d.license_number.toLowerCase().includes(q);
    });
  }, [drivers, searchQuery]);

  const filteredTrips = useMemo(() => {
    return trips.filter(t => {
      const q = searchQuery.toLowerCase().trim();
      return !q ||
        (t.vehicle_reg && t.vehicle_reg.toLowerCase().includes(q)) ||
        (t.driver_name && t.driver_name.toLowerCase().includes(q)) ||
        t.traveler_name.toLowerCase().includes(q) ||
        t.destination.toLowerCase().includes(q) ||
        t.purpose.toLowerCase().includes(q);
    });
  }, [trips, searchQuery]);

  const filteredMaintenance = useMemo(() => {
    return maintenance.filter(m => {
      const q = searchQuery.toLowerCase().trim();
      return !q ||
        (m.vehicle_reg && m.vehicle_reg.toLowerCase().includes(q)) ||
        m.service_type.toLowerCase().includes(q) ||
        m.service_center.toLowerCase().includes(q);
    });
  }, [maintenance, searchQuery]);

  const filteredParts = useMemo(() => {
    return parts.filter((p) => {
      const q = partsSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.part_number && p.part_number.toLowerCase().includes(q)) ||
        p.brand.toLowerCase().includes(q) ||
        (p.serial_number && p.serial_number.toLowerCase().includes(q)) ||
        (p.assigned_vehicle_reg && p.assigned_vehicle_reg.toLowerCase().includes(q)) ||
        (p.vendor_name && p.vendor_name.toLowerCase().includes(q)) ||
        (p.renewal_vendor && p.renewal_vendor.toLowerCase().includes(q));

      const matchesType = partsItemTypeFilter === "ALL" || p.item_type === partsItemTypeFilter;

      let matchesExpiry = true;
      if (partsExpiryFilter === "ACTIVE_WARRANTY") {
        matchesExpiry = (p.warranty_days_remaining ?? -1) > 0;
      } else if (partsExpiryFilter === "EXPIRING_SOON") {
        matchesExpiry =
          (p.warranty_days_remaining !== null && p.warranty_days_remaining !== undefined && p.warranty_days_remaining >= 0 && p.warranty_days_remaining <= 30) ||
          (p.expiry_days_remaining !== null && p.expiry_days_remaining !== undefined && p.expiry_days_remaining >= 0 && p.expiry_days_remaining <= 30);
      } else if (partsExpiryFilter === "EXPIRED") {
        matchesExpiry =
          (p.warranty_days_remaining !== null && p.warranty_days_remaining !== undefined && p.warranty_days_remaining < 0) ||
          (p.expiry_days_remaining !== null && p.expiry_days_remaining !== undefined && p.expiry_days_remaining < 0);
      } else if (partsExpiryFilter === "RENEWAL_DUE") {
        matchesExpiry = Boolean(p.has_renewal_policy && p.renewal_days_remaining !== null && p.renewal_days_remaining !== undefined && p.renewal_days_remaining <= 30);
      } else if (partsExpiryFilter === "IN_STOCK") {
        matchesExpiry = p.status === "IN_STOCK" || !p.vehicle_id || p.vehicle_id === "UNASSIGNED_STOCK";
      } else if (partsExpiryFilter === "INSTALLED") {
        matchesExpiry = p.status === "INSTALLED" || (Boolean(p.vehicle_id) && p.vehicle_id !== "UNASSIGNED_STOCK");
      }

      return matchesSearch && matchesType && matchesExpiry;
    });
  }, [parts, partsSearch, partsItemTypeFilter, partsExpiryFilter]);

  const partsKpis = useMemo(() => {
    const totalCount = parts.length;
    const totalValuation = parts.reduce(
      (sum, p) => sum + (Number(p.purchase_amount) || (Number(p.unit_price) * Number(p.quantity)) || 0),
      0
    );
    const activeWarranties = parts.filter((p) => (p.warranty_days_remaining ?? -1) > 0).length;
    const expiringSoon = parts.filter(
      (p) =>
        (p.warranty_days_remaining !== null && p.warranty_days_remaining !== undefined && p.warranty_days_remaining >= 0 && p.warranty_days_remaining <= 30) ||
        (p.expiry_days_remaining !== null && p.expiry_days_remaining !== undefined && p.expiry_days_remaining >= 0 && p.expiry_days_remaining <= 30)
    ).length;
    const renewalsDue = parts.filter(
      (p) => p.has_renewal_policy && p.renewal_days_remaining !== null && p.renewal_days_remaining !== undefined && p.renewal_days_remaining <= 30
    ).length;
    const installed = parts.filter(
      (p) => p.status === "INSTALLED" || (Boolean(p.vehicle_id) && p.vehicle_id !== "UNASSIGNED_STOCK")
    ).length;
    const inStock = parts.filter(
      (p) => p.status === "IN_STOCK" || !p.vehicle_id || p.vehicle_id === "UNASSIGNED_STOCK"
    ).length;

    return { totalCount, totalValuation, activeWarranties, expiringSoon, renewalsDue, installed, inStock };
  }, [parts]);

  // Map of vehicleId to Vehicle for quick lookups
  const vehicleMap = useMemo(() => {
    const map = new Map<string, VehicleRecord>();
    vehicles.forEach(v => map.set(v.id, v));
    return map;
  }, [vehicles]);

  // Real-time fleet statutory compliance audit
  const complianceAlerts = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const list: Array<{
      id: string;
      title: string;
      subtitle: string;
      docType: string;
      expiryDate: string;
      daysRemaining: number;
      status: "EXPIRED" | "EXPIRING_SOON" | "VALID";
      vehicle?: VehicleRecord;
      driver?: DriverRecord;
    }> = [];

    vehicles.forEach(v => {
      const checkDoc = (docType: string, dateStr?: string | null) => {
        if (!dateStr) return;
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return;
        d.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const status = diffDays < 0 ? "EXPIRED" : diffDays <= 30 ? "EXPIRING_SOON" : "VALID";
        list.push({
          id: `${v.id}-${docType}`,
          title: v.registration_number,
          subtitle: `${v.make} ${v.model}`,
          docType,
          expiryDate: String(dateStr).split("T")[0],
          daysRemaining: diffDays,
          status,
          vehicle: v
        });
      };

      const isEv = isElectricFuel(v.fuel_type);
      checkDoc("Insurance Policy", v.insurance_expiry_date);
      if (!isEv) {
        checkDoc("Pollution (PUC)", v.puc_expiry_date);
      }
      checkDoc("Fitness Certificate", v.fitness_expiry_date);
    });

    drivers.forEach(d => {
      if (d.license_expiry_date) {
        const dt = new Date(d.license_expiry_date);
        if (!isNaN(dt.getTime())) {
          dt.setHours(0, 0, 0, 0);
          const diffDays = Math.ceil((dt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          const status = diffDays < 0 ? "EXPIRED" : diffDays <= 30 ? "EXPIRING_SOON" : "VALID";
          list.push({
            id: `${d.id}-license`,
            title: d.full_name,
            subtitle: `Lic: ${d.license_number}`,
            docType: "Driver License",
            expiryDate: String(d.license_expiry_date).split("T")[0],
            daysRemaining: diffDays,
            status,
            driver: d
          });
        }
      }
    });

    return list.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [vehicles, drivers]);

  // Analytics & Reports statistics
  const fleetReportsData = useMemo(() => {
    const totalMaintenanceSpend = maintenance.reduce((sum, m) => sum + (Number(m.cost) || 0), 0);
    const totalOdometerKm = vehicles.reduce((sum, v) => sum + (Number(v.odometer_km) || 0), 0);
    const avgOdometer = vehicles.length > 0 ? Math.round(totalOdometerKm / vehicles.length) : 0;
    
    // Top mileage vehicles
    const topMileageVehicles = [...vehicles]
      .sort((a, b) => b.odometer_km - a.odometer_km)
      .slice(0, 5);

    // Fuel breakdown
    const fuelCounts: Record<string, number> = {};
    vehicles.forEach(v => {
      const f = v.fuel_type || "Petrol";
      fuelCounts[f] = (fuelCounts[f] || 0) + 1;
    });

    return {
      totalMaintenanceSpend,
      totalOdometerKm,
      avgOdometer,
      topMileageVehicles,
      fuelCounts
    };
  }, [vehicles, maintenance]);

  // Upcoming service & license expiry helpers for module-specific KPIs
  const servicesDueCount = useMemo(() => {
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return maintenance.filter(m => {
      if (!m.next_service_due_date) return false;
      const d = new Date(m.next_service_due_date);
      return !isNaN(d.getTime()) && d <= thirtyDaysLater;
    }).length;
  }, [maintenance]);

  const expiringLicensesCount = useMemo(() => {
    const now = new Date();
    const sixtyDaysLater = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    return drivers.filter(d => {
      if (!d.license_expiry_date) return false;
      const exp = new Date(d.license_expiry_date);
      return !isNaN(exp.getTime()) && exp <= sixtyDaysLater;
    }).length;
  }, [drivers]);

  const expiringInsuranceCount = useMemo(() => {
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return vehicles.filter(v => {
      if (!v.insurance_expiry_date) return false;
      const exp = new Date(v.insurance_expiry_date);
      return !isNaN(exp.getTime()) && exp <= thirtyDaysLater;
    }).length;
  }, [vehicles]);

  // Dedicated dynamic metadata & KPI metrics per module
  const moduleMeta = useMemo(() => {
    switch (activeTab) {
      case "maintenance":
        return {
          category: "Service & Assets",
          badge: "Service Bills & Job Cards",
          badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
          icon: Wrench,
          iconBg: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25",
          title: "Workshop Job Cards & Service Bills",
          description: "Dedicated workshop billing, invoice records, labor & tax accounting, and scheduled service tracking",
          actionBtn: canManageMaintenance ? (
            <AppButton
              variant="primary"
              size="sm"
              onClick={() => {
                resetMaintenanceForm();
                setIsAddMaintenanceOpen(true);
              }}
              className="bg-theme-btn-primary hover:bg-theme-btn-primary-secondary text-white text-xs h-9 font-semibold gap-1.5 shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Log Service Job Card</span>
            </AppButton>
          ) : null,
          kpis: [
            {
              title: "Total Service Spend",
              value: "₹" + fleetReportsData.totalMaintenanceSpend.toLocaleString("en-IN"),
              subtext: "Aggregate workshop bills",
              icon: Receipt,
              iconColor: "text-emerald-500",
              iconBg: "bg-emerald-500/10 border-emerald-500/20"
            },
            {
              title: "Logged Job Cards",
              value: maintenance.length,
              subtext: "Service records on file",
              icon: FileText,
              iconColor: "text-blue-500",
              iconBg: "bg-blue-500/10 border-blue-500/20"
            },
            {
              title: "Vehicles in Workshop",
              value: stats.inMaintenanceVehicles,
              subtext: "Currently undergoing service",
              icon: Wrench,
              iconColor: "text-amber-500",
              iconBg: "bg-amber-500/10 border-amber-500/20"
            },
            {
              title: "Services Due (≤30d)",
              value: servicesDueCount,
              subtext: "Upcoming service deadlines",
              icon: Calendar,
              iconColor: "text-indigo-500",
              iconBg: "bg-indigo-500/10 border-indigo-500/20"
            }
          ]
        };

      case "parts":
        return {
          category: "Service & Assets",
          badge: "Parts & Accessories Master",
          badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
          icon: Package,
          iconBg: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25",
          title: "Parts, Accessories & Consumables Master",
          description: "Spare parts inventory, OEM part numbers, shelf-life, warranty tracking & asset valuation",
          actionBtn: (
            <AppButton
              variant="primary"
              size="sm"
              onClick={openCreatePartModal}
              className="bg-theme-btn-primary hover:bg-theme-btn-primary-secondary text-white text-xs h-9 font-semibold gap-1.5 shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Register Part / Accessory</span>
            </AppButton>
          ),
          kpis: [
            {
              title: "Total Catalog Items",
              value: partsKpis.totalCount,
              subtext: partsKpis.installed + " fitted • " + partsKpis.inStock + " in stock",
              icon: Package,
              iconColor: "text-blue-500",
              iconBg: "bg-blue-500/10 border-blue-500/20"
            },
            {
              title: "Inventory Valuation",
              value: "₹" + partsKpis.totalValuation.toLocaleString("en-IN"),
              subtext: "Procurement asset value",
              icon: Receipt,
              iconColor: "text-emerald-500",
              iconBg: "bg-emerald-500/10 border-emerald-500/20"
            },
            {
              title: "Active OEM Warranties",
              value: partsKpis.activeWarranties,
              subtext: "Valid warranty protection",
              icon: ShieldCheck,
              iconColor: "text-indigo-500",
              iconBg: "bg-indigo-500/10 border-indigo-500/20"
            },
            {
              title: "Low Stock / Expiries",
              value: partsKpis.expiringSoon,
              subtext: "Reorder / renewal required",
              icon: AlertTriangle,
              iconColor: "text-amber-500",
              iconBg: "bg-amber-500/10 border-amber-500/20"
            }
          ]
        };

      case "trips":
        return {
          category: "Fleet Operations",
          badge: "Trip Logistics",
          badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
          icon: Calendar,
          iconBg: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/25",
          title: "Daily Trip Dispatch & Log Sheets",
          description: "Vehicle route dispatching, passenger manifests, odometer tracking & trip completion logs",
          actionBtn: canDispatchTrips ? (
            <AppButton
              variant="primary"
              size="sm"
              onClick={() => setIsDispatchTripOpen(true)}
              className="bg-theme-btn-primary hover:bg-theme-btn-primary-secondary text-white text-xs h-9 font-semibold gap-1.5 shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Dispatch Trip</span>
            </AppButton>
          ) : null,
          kpis: [
            {
              title: "Total Logged Trips",
              value: trips.length,
              subtext: "All trip sheets",
              icon: Calendar,
              iconColor: "text-purple-500",
              iconBg: "bg-purple-500/10 border-purple-500/20"
            },
            {
              title: "Active En-Route",
              value: stats.activeTrips,
              subtext: "Currently on road",
              icon: MapPin,
              iconColor: "text-emerald-500",
              iconBg: "bg-emerald-500/10 border-emerald-500/20"
            },
            {
              title: "Completed Trips",
              value: trips.filter(t => t.status === "COMPLETED").length,
              subtext: "Safely completed",
              icon: CheckCircle2,
              iconColor: "text-blue-500",
              iconBg: "bg-blue-500/10 border-blue-500/20"
            },
            {
              title: "Pending / Scheduled",
              value: trips.filter(t => t.status === "SCHEDULED" || t.status === "PLANNED" || t.status === "DISPATCHED").length,
              subtext: "Awaiting departure",
              icon: Clock,
              iconColor: "text-amber-500",
              iconBg: "bg-amber-500/10 border-amber-500/20"
            }
          ]
        };

      case "drivers":
        return {
          category: "Fleet Operations",
          badge: "Driver Roster",
          badgeColor: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
          icon: Users,
          iconBg: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/25",
          title: "Driver Roster & Commercial Licensing",
          description: "Driver profiles, commercial license validity, assigned vehicles & duty status tracking",
          actionBtn: canManageDrivers ? (
            <AppButton
              variant="primary"
              size="sm"
              onClick={() => setIsAddDriverOpen(true)}
              className="bg-theme-btn-primary hover:bg-theme-btn-primary-secondary text-white text-xs h-9 font-semibold gap-1.5 shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Add Driver</span>
            </AppButton>
          ) : null,
          kpis: [
            {
              title: "Total Drivers",
              value: drivers.length,
              subtext: "Registered drivers",
              icon: Users,
              iconColor: "text-cyan-500",
              iconBg: "bg-cyan-500/10 border-cyan-500/20"
            },
            {
              title: "Drivers On Duty",
              value: drivers.filter(d => d.is_active).length,
              subtext: "Active duty roster",
              icon: CheckCircle2,
              iconColor: "text-emerald-500",
              iconBg: "bg-emerald-500/10 border-emerald-500/20"
            },
            {
              title: "Available / Standby",
              value: drivers.filter(d => !d.is_active).length,
              subtext: "Ready for assignment",
              icon: Clock,
              iconColor: "text-blue-500",
              iconBg: "bg-blue-500/10 border-blue-500/20"
            },
            {
              title: "Expiring Licenses (≤60d)",
              value: expiringLicensesCount,
              subtext: "License renewal required",
              icon: AlertTriangle,
              iconColor: "text-amber-500",
              iconBg: "bg-amber-500/10 border-amber-500/20"
            }
          ]
        };

      case "vendors":
        return {
          category: "Service & Assets",
          badge: "Insurance & Workshop Vendors",
          badgeColor: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
          icon: ShieldCheck,
          iconBg: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/25",
          title: "Insurance & Workshop Vendor Master",
          description: "Authorized service centers, cashless garage networks & insurance policy providers",
          actionBtn: (
            <AppButton
              variant="primary"
              size="sm"
              onClick={openCreateVendorModal}
              className="bg-theme-btn-primary hover:bg-theme-btn-primary-secondary text-white text-xs h-9 font-semibold gap-1.5 shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Add Insurance Vendor</span>
            </AppButton>
          ),
          kpis: [
            {
              title: "Total Vendors",
              value: insuranceVendors.length,
              subtext: "Registered partners",
              icon: ShieldCheck,
              iconColor: "text-indigo-500",
              iconBg: "bg-indigo-500/10 border-indigo-500/20"
            },
            {
              title: "Active Vendors",
              value: insuranceVendors.filter(v => v.is_active !== false).length,
              subtext: "Approved partners",
              icon: Building2,
              iconColor: "text-emerald-500",
              iconBg: "bg-emerald-500/10 border-emerald-500/20"
            },
            {
              title: "24x7 Emergency Support",
              value: insuranceVendors.filter(v => v.support_toll_free || v.toll_free_number).length,
              subtext: "Helpline availability",
              icon: Phone,
              iconColor: "text-blue-500",
              iconBg: "bg-blue-500/10 border-blue-500/20"
            },
            {
              title: "Expiring Policies (≤30d)",
              value: expiringInsuranceCount,
              subtext: "Policy renewal required",
              icon: AlertTriangle,
              iconColor: "text-amber-500",
              iconBg: "bg-amber-500/10 border-amber-500/20"
            }
          ]
        };

      case "alerts":
        return {
          category: "Service & Assets",
          badge: "Compliance Radar",
          badgeColor: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
          icon: ShieldAlert,
          iconBg: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/25",
          title: "Fleet Compliance & Renewal Alerts",
          description: "Automated expiry monitoring for insurance policies, PUC, fitness certificates & periodic services",
          actionBtn: null,
          kpis: [
            {
              title: "Critical Expiries (≤7d)",
              value: complianceAlerts.filter(a => a.daysRemaining <= 7).length,
              subtext: "Expiring within 7 days",
              icon: ShieldAlert,
              iconColor: "text-rose-500",
              iconBg: "bg-rose-500/10 border-rose-500/20"
            },
            {
              title: "PUC Renewals",
              value: complianceAlerts.filter(a => a.docType.includes("PUC") || a.docType.includes("Pollution")).length,
              subtext: "Pollution certificates",
              icon: FileText,
              iconColor: "text-amber-500",
              iconBg: "bg-amber-500/10 border-amber-500/20"
            },
            {
              title: "Insurance Renewals",
              value: complianceAlerts.filter(a => a.docType.includes("Insurance")).length,
              subtext: "Policy expirations",
              icon: ShieldCheck,
              iconColor: "text-blue-500",
              iconBg: "bg-blue-500/10 border-blue-500/20"
            },
            {
              title: "Driver Licenses",
              value: complianceAlerts.filter(a => a.docType.includes("License")).length,
              subtext: "License renewals",
              icon: Users,
              iconColor: "text-purple-500",
              iconBg: "bg-purple-500/10 border-purple-500/20"
            }
          ]
        };

      case "reports":
        return {
          category: "Analytics & Intelligence",
          badge: "Executive Reports",
          badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
          icon: LineChart,
          iconBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
          title: "Fleet Analytics & Expense Reports",
          description: "Financial breakdown, maintenance expenditures, fuel consumption & vehicle utilization analysis",
          actionBtn: null,
          kpis: [
            {
              title: "Total Fleet Cost",
              value: "₹" + (fleetReportsData.totalMaintenanceSpend + (fleetReportsData.totalOdometerKm * 8)).toLocaleString("en-IN"),
              subtext: "Operations & maintenance",
              icon: Receipt,
              iconColor: "text-emerald-500",
              iconBg: "bg-emerald-500/10 border-emerald-500/20"
            },
            {
              title: "Total Service Spend",
              value: "₹" + fleetReportsData.totalMaintenanceSpend.toLocaleString("en-IN"),
              subtext: "Workshop invoices",
              icon: Wrench,
              iconColor: "text-amber-500",
              iconBg: "bg-amber-500/10 border-amber-500/20"
            },
            {
              title: "Total Km Logged",
              value: fleetReportsData.totalOdometerKm.toLocaleString("en-IN") + " km",
              subtext: "Across all fleet units",
              icon: MapPin,
              iconColor: "text-blue-500",
              iconBg: "bg-blue-500/10 border-blue-500/20"
            },
            {
              title: "Average Mileage",
              value: fleetReportsData.avgOdometer.toLocaleString("en-IN") + " km",
              subtext: "Mean odometer reading",
              icon: Car,
              iconColor: "text-purple-500",
              iconBg: "bg-purple-500/10 border-purple-500/20"
            }
          ]
        };

      case "travelers":
        return {
          category: "Fleet Operations",
          badge: "Employee Commute",
          badgeColor: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
          icon: UserCheck,
          iconBg: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/25",
          title: "Traveler & Commute Allocations",
          description: "Employee commute assignments, regular traveler directories & route allocations",
          actionBtn: canDispatchTrips ? (
            <AppButton
              variant="primary"
              size="sm"
              onClick={() => setIsDispatchTripOpen(true)}
              className="bg-theme-btn-primary hover:bg-theme-btn-primary-secondary text-white text-xs h-9 font-semibold gap-1.5 shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Dispatch Trip</span>
            </AppButton>
          ) : null,
          kpis: [
            {
              title: "Total Fleet Master",
              value: stats.totalVehicles,
              subtext: "Registered vehicles",
              icon: Car,
              iconColor: "text-emerald-500",
              iconBg: "bg-emerald-500/10 border-emerald-500/20"
            },
            {
              title: "En-Route Vehicles",
              value: stats.onRouteVehicles,
              subtext: "Currently on active transit",
              icon: MapPin,
              iconColor: "text-blue-500",
              iconBg: "bg-blue-500/10 border-blue-500/20"
            },
            {
              title: "Available at Depot",
              value: stats.availableVehicles,
              subtext: "Ready for dispatch",
              icon: CheckCircle2,
              iconColor: "text-indigo-500",
              iconBg: "bg-indigo-500/10 border-indigo-500/20"
            },
            {
              title: "In Workshop / Service",
              value: stats.inMaintenanceVehicles,
              subtext: "Under maintenance",
              icon: Wrench,
              iconColor: "text-amber-500",
              iconBg: "bg-amber-500/10 border-amber-500/20"
            }
          ]
        };

      case "inventory":
        return {
          category: "Fleet Operations",
          badge: "Vehicle Registry",
          badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
          icon: Car,
          iconBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
          title: "Vehicle Inventory & Fleet Registry",
          description: "Central vehicle master, technical specifications, registration documents & operational statuses",
          actionBtn: canCreateVehicle ? (
            <AppButton
              variant="primary"
              size="sm"
              onClick={() => router.push("/vehicle/register")}
              className="bg-theme-btn-primary hover:bg-theme-btn-primary-secondary text-white text-xs h-9 font-semibold gap-1.5 shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Add Vehicle</span>
            </AppButton>
          ) : null,
          kpis: [
            {
              title: "Total Fleet Master",
              value: stats.totalVehicles,
              subtext: "Registered company vehicles",
              icon: Car,
              iconColor: "text-theme-btn-primary",
              iconBg: "bg-theme-btn-primary/10 border-theme-btn-primary/20"
            },
            {
              title: "En-Route Vehicles",
              value: stats.onRouteVehicles,
              subtext: "Currently on active transit",
              icon: MapPin,
              iconColor: "text-emerald-500",
              iconBg: "bg-emerald-500/10 border-emerald-500/20"
            },
            {
              title: "Available at Depot",
              value: stats.availableVehicles,
              subtext: "Ready for dispatch",
              icon: CheckCircle2,
              iconColor: "text-indigo-500",
              iconBg: "bg-indigo-500/10 border-indigo-500/20"
            },
            {
              title: "In Workshop / Service",
              value: stats.inMaintenanceVehicles,
              subtext: "Under maintenance",
              icon: Wrench,
              iconColor: "text-amber-500",
              iconBg: "bg-amber-500/10 border-amber-500/20"
            }
          ]
        };

      default:
        return {
          category: "Fleet Operations",
          badge: "Fleet Operations Desk",
          badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
          icon: LayoutDashboard,
          iconBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
          title: "Enterprise Fleet Management Desk",
          description: "Central fleet master, real-time driver allocation, trip dispatch & maintenance records",
          actionBtn: canCreateVehicle ? (
            <AppButton
              variant="primary"
              size="sm"
              onClick={() => router.push("/vehicle/register")}
              className="bg-theme-btn-primary hover:bg-theme-btn-primary-secondary text-white text-xs h-9 font-semibold gap-1.5 shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Add Vehicle</span>
            </AppButton>
          ) : null,
          kpis: [
            {
              title: "Total Fleet Master",
              value: stats.totalVehicles,
              subtext: "Registered company vehicles",
              icon: Car,
              iconColor: "text-theme-btn-primary",
              iconBg: "bg-theme-btn-primary/10 border-theme-btn-primary/20"
            },
            {
              title: "En-Route Vehicles",
              value: stats.onRouteVehicles,
              subtext: "Currently on active transit",
              icon: MapPin,
              iconColor: "text-emerald-500",
              iconBg: "bg-emerald-500/10 border-emerald-500/20"
            },
            {
              title: "Available at Depot",
              value: stats.availableVehicles,
              subtext: "Ready for dispatch",
              icon: CheckCircle2,
              iconColor: "text-indigo-500",
              iconBg: "bg-indigo-500/10 border-indigo-500/20"
            },
            {
              title: "In Workshop / Service",
              value: stats.inMaintenanceVehicles,
              subtext: "Under maintenance",
              icon: Wrench,
              iconColor: "text-amber-500",
              iconBg: "bg-amber-500/10 border-amber-500/20"
            }
          ]
        };
    }
  }, [
    activeTab, 
    stats, 
    fleetReportsData, 
    maintenance.length, 
    servicesDueCount, 
    partsKpis, 
    trips, 
    drivers, 
    expiringLicensesCount, 
    insuranceVendors, 
    expiringInsuranceCount, 
    complianceAlerts, 
    canManageMaintenance, 
    canDispatchTrips, 
    canManageDrivers, 
    canCreateVehicle
  ]);

  if (loading) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center p-8 space-y-4">
        <ChandakLoader size="lg" />
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground animate-pulse">
          Connecting to Vehicle Backend & Records...
        </p>
      </div>
    );
  }

  if (!hasAnyFleetAccess && !isSuperAdmin) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center p-8 space-y-4 text-center">
        <div className="h-16 w-16 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center border border-rose-500/20 shadow-sm">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-foreground">Fleet Desk Access Restricted</h2>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            You do not currently have an assigned Fleet Role or access policies enabled for the Vehicle Desk. Please contact your System Administrator to request access.
          </p>
        </div>
        <AppButton variant="primary" size="sm" onClick={() => router.push("/")}>
          Return to Workspace
        </AppButton>
      </div>
    );
  }

  return (
    <div className="w-full flex-1 flex flex-col space-y-6 min-w-0 animate-in fade-in duration-300">
      
      {/* Toast Notifications */}
      {successBanner && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-semibold">{successBanner}</span>
          </div>
          <AppButton variant="ghost" size="icon-sm" onClick={() => setSuccessBanner(null)}>
            <X className="h-3.5 w-3.5" />
          </AppButton>
        </div>
      )}

      {errorBanner && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{errorBanner}</span>
          </div>
          <AppButton variant="ghost" size="icon-sm" onClick={() => setErrorBanner(null)}>
            <X className="h-3.5 w-3.5" />
          </AppButton>
        </div>
      )}

      {/* Top Header & KPI Bar — Shown when NOT on dedicated Register Form page or RBAC page */}
      {activeTab !== "register" && activeTab !== "rbac" && (
        <>
          {/* Top Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-6">
            <div>
              <div className="flex items-center gap-3">
                <div className={`h-11 w-11 rounded-xl flex items-center justify-center border shadow-2xs ${moduleMeta.iconBg}`}>
                  <moduleMeta.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${moduleMeta.badgeColor}`}>
                      {moduleMeta.badge}
                    </span>
                    <span className="text-[11px] text-muted-foreground font-medium hidden sm:inline">• {moduleMeta.category}</span>
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground mt-0.5">
                    {moduleMeta.title}
                  </h1>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {moduleMeta.description}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <AppButton
                variant="secondary"
                size="sm"
                onClick={() => loadAllData(true)}
                disabled={refreshing}
                className="text-xs h-9 font-medium"
                title="Refresh module data"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
                <span>Sync</span>
              </AppButton>

              {moduleMeta.actionBtn}
            </div>
          </div>

          {/* Dynamic Module KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {moduleMeta.kpis.map((kpi, idx) => {
              const IconComp = kpi.icon;
              return (
                <AppCard key={idx} className="border-border shadow-xs">
                  <AppCardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">{kpi.title}</p>
                      <h3 className="text-2xl font-bold mt-1 text-foreground">{kpi.value}</h3>
                      <span className="text-[10px] text-muted-foreground">{kpi.subtext}</span>
                    </div>
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center border ${kpi.iconBg} ${kpi.iconColor}`}>
                      <IconComp className="h-5 w-5" />
                    </div>
                  </AppCardContent>
                </AppCard>
              );
            })}
          </div>
        </>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* VEHICLE RBAC ACCESS POLICIES & GOVERNANCE VIEW */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === "rbac" && (
        <FleetRbacGovernance />
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* REGISTER VEHICLE FULL-PAGE FORM (DEDICATED FORM VIEW) */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === "register" && !canCreateVehicle && (
        <div className="w-full flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center border border-rose-500/20">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Access Restricted</h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-md">
              You do not have permission (`VEHICLES_CREATE`) to register new fleet assets. Please contact your Fleet Administrator.
            </p>
          </div>
          <AppButton variant="primary" size="sm" onClick={() => router.push("/vehicle/inventory")}>
            Return to Fleet Inventory
          </AppButton>
        </div>
      )}

      {activeTab === "register" && canCreateVehicle && (
        <div className="w-full flex-1 flex flex-col space-y-8 animate-in fade-in duration-200">
          {/* Top Form Navigation Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <AppButton
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/vehicle/inventory")}
                  className="text-xs h-8 px-2.5 gap-1.5 text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Fleet</span>
                </AppButton>
                <span className="text-border text-xs">/</span>
                <span className="text-xs text-muted-foreground font-medium">New Registration</span>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <div className="h-11 w-11 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/25 shrink-0">
                  <Car className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                    <span>Register Fleet Vehicle</span>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-theme-btn-primary/10 text-theme-btn-primary border border-theme-btn-primary/20">
                      Vehicle Master Form
                    </span>
                  </h1>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Enroll a new vehicle with instant RTO plate analysis, powertrain specs, statutory compliance & driver assignment
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap self-end md:self-center">
              <AppButton
                type="button"
                variant="outline"
                size="sm"
                onClick={() => router.push("/vehicle/inventory")}
                className="text-xs h-9 px-4"
              >
                Cancel
              </AppButton>
              <AppButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetVehicleForm}
                className="text-xs h-9 text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Reset Form
              </AppButton>
              <AppButton
                type="button"
                variant="primary"
                size="sm"
                disabled={modalSubmitting || !newVehiclePlate.trim()}
                onClick={handleCreateVehicle}
                className="bg-theme-btn-primary hover:bg-theme-btn-primary-secondary text-white text-xs h-9 font-semibold gap-1.5 shadow-xs px-5"
              >
                {modalSubmitting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                <span>Save & Register Vehicle</span>
              </AppButton>
            </div>
          </div>

          {/* Form Body: Clean full-width responsive form sections with zero card boxes */}
          <form onSubmit={handleCreateVehicle} className="space-y-10 w-full max-w-5xl mx-auto pb-16">
            {/* 1. REGISTRATION PLATE & INSTANT INTELLIGENCE */}
            <div className="space-y-6 border-b border-border/80 pb-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-theme-btn-primary/10 text-theme-btn-primary text-xs font-bold">1</span>
                    <span>Registration Plate & Instant Intelligence</span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Enter the Indian vehicle registration number (e.g. MH02FE4281). Passing authority, district jurisdiction, and state are verified in real-time.
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-theme-btn-primary font-semibold px-2.5 py-1 rounded-md bg-theme-btn-primary/10 border border-theme-btn-primary/20">
                  <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                  <span>Instant Intelligence Active</span>
                </div>
              </div>

              {/* Plate Input Row with Authentic License Plate Graphic & Quick Samples */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                <div className="lg:col-span-7 space-y-2">
                  <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <span>Registration Plate Number *</span>
                      <span className="text-[11px] font-normal text-muted-foreground">(Indian Parivahan standard)</span>
                    </span>
                    {newPlateInfo.isValidFormat && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Valid CMVR Format
                      </span>
                    )}
                  </label>
                  <div className="flex gap-2">
                    <AppInput 
                      value={newVehiclePlate} 
                      onChange={(e) => {
                        setNewVehiclePlate(e.target.value.toUpperCase());
                        if (portalLookupMsg) setPortalLookupMsg(null);
                      }} 
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handlePortalAutoFetch();
                        }
                      }}
                      required
                      autoFocus
                      className="font-mono font-bold uppercase tracking-wider text-sm flex-1 bg-surface shadow-xs"
                    />
                    <AppButton
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={fetchingPortal || !newVehiclePlate.trim()}
                      onClick={() => handlePortalAutoFetch()}
                      className="shrink-0 h-9 px-4 gap-1.5 text-xs font-semibold border border-border hover:border-theme-btn-primary text-foreground bg-surface shadow-xs"
                      title="Fetch vehicle specifications from RTO Government portal"
                    >
                      {fetchingPortal ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin text-theme-btn-primary" />
                          <span>Auto-Filling...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                          <span>Fetch Portal</span>
                        </>
                      )}
                    </AppButton>
                  </div>

                  {/* Sample Quick-Test Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-medium text-muted-foreground mr-1">Quick Sample:</span>
                    {[
                      { plate: "MH02FE4281", label: "MH-02 Mumbai" },
                      { plate: "DL01AB1234", label: "DL-01 Delhi" },
                      { plate: "HR26CQ9999", label: "HR-26 Gurugram" },
                      { plate: "KA01MJ5555", label: "KA-01 Bangalore" },
                      { plate: "GJ01AB1122", label: "GJ-01 Ahmedabad" }
                    ].map((sample) => (
                      <AppButton
                        key={sample.plate}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setNewVehiclePlate(sample.plate);
                          if (portalLookupMsg) setPortalLookupMsg(null);
                        }}
                        className="h-6 px-2 text-[10px] font-mono font-medium border-border/80 bg-surface text-foreground shadow-2xs hover:border-theme-btn-primary"
                      >
                        <span>{sample.label}</span>
                      </AppButton>
                    ))}
                  </div>
                </div>

                {/* Authentic HSRP Visual License Plate Mockup */}
                <div className="lg:col-span-5 flex flex-col justify-center">
                  <span className="text-[11px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3 text-blue-500" />
                    <span>Official HSRP License Plate Preview</span>
                  </span>
                  <div className="h-11 px-3 bg-white dark:bg-slate-100 border-2 border-slate-900 rounded-md flex items-center justify-between shadow-xs select-none">
                    <div className="flex items-center gap-2">
                      {/* Blue IND Badge */}
                      <div className="flex flex-col items-center justify-center bg-blue-700 text-white rounded-xs px-1.5 py-0.5 leading-none">
                        <span className="text-[9px]">🇮🇳</span>
                        <span className="text-[8px] font-mono font-black tracking-tighter">IND</span>
                      </div>
                      {/* Plate Text */}
                      <span className="font-mono font-black text-slate-900 tracking-widest text-sm sm:text-base uppercase">
                        {newPlateInfo.formattedPlate || newVehiclePlate || "MH-02-FE-4281"}
                      </span>
                    </div>
                    {/* Laser Hologram Badge */}
                    <div className="flex items-center gap-1.5">
                      <span className="h-4 w-4 rounded-full bg-gradient-to-tr from-amber-400 via-teal-400 to-indigo-500 opacity-90 border border-slate-400/80 shadow-2xs" title="Authentic Parivahan Laser Hologram" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Instant Intelligence Verified Fields Grid */}
              <div className="rounded-xl border border-border/80 bg-slate-50/70 dark:bg-slate-900/40 p-4 space-y-3.5">
                <div className="flex items-center justify-between pb-2.5 border-b border-border/60">
                  <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
                    <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                    <span>Verified RTO Jurisdiction & Authority Fields</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    100% Genuine RTO Registry
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Field 1: RTO Passing Authority (Editable) */}
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      <span>RTO Passing Office / Authority *</span>
                    </label>
                    <AppInput 
                      value={newVehicleRtoOffice} 
                      onChange={(e) => setNewVehicleRtoOffice(e.target.value)} 
                      className="text-xs font-semibold bg-surface shadow-2xs"
                      required
                    />
                  </div>

                  {/* Field 2: State / Union Territory */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>State / UT</span>
                    </label>
                    <div className="h-9 px-3 rounded-lg border border-border bg-surface flex items-center justify-between text-xs font-semibold text-foreground shadow-2xs">
                      <span className="truncate">{newPlateInfo.stateName || "State / UT"}</span>
                      <span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-blue-300 font-mono font-bold text-[10px] shrink-0 ml-1">
                        {newPlateInfo.stateCode || "IN"}
                      </span>
                    </div>
                  </div>

                  {/* Field 3: District Code & Zone */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Hash className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                      <span>RTO District Code</span>
                    </label>
                    <div className="h-9 px-3 rounded-lg border border-border bg-surface flex items-center justify-between text-xs font-semibold text-foreground shadow-2xs">
                      <span className="font-mono">{newPlateInfo.districtCode || "—"}</span>
                      <span className="text-[10px] text-muted-foreground truncate ml-1">{newPlateInfo.districtCity || "Passing Zone"}</span>
                    </div>
                  </div>

                  {/* Field 4: Series & Number Breakdown */}
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <span>Registration Series & Sequence Breakdown</span>
                    </label>
                    <div className="h-9 px-3 rounded-lg border border-border bg-surface flex items-center justify-between text-xs font-semibold text-foreground font-mono shadow-2xs">
                      <span>Series: <strong className="text-foreground">{newPlateInfo.series || "Standard"}</strong></span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-border text-[11px] font-bold">
                        Number: {newPlateInfo.vehicleNumber || "—"}
                      </span>
                    </div>
                  </div>

                  {/* Field 5: HSRP High Security Plate Compliance */}
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      <span>High Security Registration Plate (HSRP)</span>
                    </label>
                    <label className="h-9 px-3 rounded-lg border border-border bg-surface flex items-center gap-2.5 cursor-pointer text-xs font-medium text-foreground hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors shadow-2xs">
                      <input 
                        type="checkbox" 
                        checked={newVehicleHsrp} 
                        onChange={(e) => setNewVehicleHsrp(e.target.checked)} 
                        className="rounded border-border text-theme-btn-primary focus:ring-theme-btn-primary"
                      />
                      <span>Fitted with official HSRP plate & laser hologram stamp</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Portal Lookup Feedback Banner */}
              {portalLookupMsg && (
                <div className={`p-3.5 rounded-lg border text-xs leading-relaxed flex items-start gap-2.5 animate-in fade-in duration-150 ${
                  portalLookupMsg.type === "success"
                    ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-300"
                    : portalLookupMsg.type === "info"
                    ? "bg-blue-500/10 border-blue-500/25 text-blue-700 dark:text-blue-300"
                    : "bg-rose-500/10 border-rose-500/25 text-rose-700 dark:text-rose-300"
                }`}>
                  {portalLookupMsg.type === "success" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                  ) : portalLookupMsg.type === "info" ? (
                    <Sparkles className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold flex items-center justify-between gap-2 flex-wrap">
                      <span>{portalLookupMsg.message}</span>
                      {portalLookupMsg.source && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-surface/80 border border-border text-foreground">
                          {portalLookupMsg.source}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] opacity-85 mt-1">
                      {portalLookupMsg.type === "info" 
                        ? "RTO Passing Jurisdiction has been verified. Now select or enter the vehicle Make & Model below."
                        : "Official records verified. You can review or adjust any details before saving."
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 2. SPECIFICATIONS & POWERTRAIN */}
            <div className="space-y-4 border-b border-border/80 pb-8">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-theme-btn-primary/10 text-theme-btn-primary text-xs font-bold">2</span>
                  <span>Vehicle Specifications & Powertrain</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select or type the manufacturer, model, body category and powertrain configuration
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-foreground">Make / Brand *</label>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Sparkles className="h-3 w-3 text-amber-500" />
                      Quick-Pick Available
                    </span>
                  </div>
                  <AppInput 
                    value={newVehicleMake} 
                    onChange={(e) => setNewVehicleMake(e.target.value)} 
                    list="fleet-popular-makes-form"
                    required
                  />
                  <datalist id="fleet-popular-makes-form">
                    {Object.keys(POPULAR_BRANDS).map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>

                  {/* Brand Quick-Pick Chips */}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {TOP_BRAND_NAMES.map((brand) => {
                      const isSelected = newVehicleMake.trim().toLowerCase() === brand.toLowerCase();
                      return (
                        <AppButton
                          key={brand}
                          type="button"
                          variant={isSelected ? "primary" : "outline"}
                          size="sm"
                          onClick={() => {
                            setNewVehicleMake(brand);
                            const cfg = POPULAR_BRANDS[brand];
                            if (cfg) {
                              setNewVehicleCategory(cfg.category);
                              if (cfg.models.length > 0 && (!newVehicleModel || !cfg.models.includes(newVehicleModel))) {
                                setNewVehicleModel(cfg.models[0]);
                                if (newPlateInfo.districtCode) {
                                  setNewVehicleNickname(`${newPlateInfo.stateCode} ${brand} ${cfg.models[0]}`.trim());
                                }
                              }
                            }
                          }}
                          className={`h-6 px-2 text-xs font-medium ${
                            isSelected
                              ? "bg-theme-btn-primary text-white border-theme-btn-primary font-semibold shadow-xs"
                              : "border-border text-foreground hover:border-theme-btn-primary/40 bg-surface"
                          }`}
                        >
                          <span>{brand}</span>
                        </AppButton>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-foreground">Model Name *</label>
                    <span className="text-[10px] text-muted-foreground">Popular models for selected brand</span>
                  </div>
                  <AppInput 
                    value={newVehicleModel} 
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewVehicleModel(val);
                      if (/\b(ev|electric)\b/i.test(val) || /ioniq|recharge/i.test(val)) {
                        setNewVehicleFuel("Electric");
                        setNewVehiclePucExpiry("");
                      }
                    }} 
                    list="fleet-popular-models-form"
                    required
                  />
                  <datalist id="fleet-popular-models-form">
                    {(POPULAR_BRANDS[newVehicleMake]?.models || []).map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>

                  {/* Model Quick-Pick Chips */}
                  {POPULAR_BRANDS[newVehicleMake]?.models ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {POPULAR_BRANDS[newVehicleMake].models.slice(0, 6).map((m) => {
                        const isSelected = newVehicleModel.trim().toLowerCase() === m.toLowerCase();
                        return (
                          <AppButton
                            key={m}
                            type="button"
                            variant={isSelected ? "primary" : "outline"}
                            size="sm"
                            onClick={() => {
                              setNewVehicleModel(m);
                              const cfg = POPULAR_BRANDS[newVehicleMake];
                              if (cfg?.category) setNewVehicleCategory(cfg.category);
                              if (/\b(ev|electric)\b/i.test(m) || /ioniq|recharge/i.test(m)) {
                                setNewVehicleFuel("Electric");
                                setNewVehiclePucExpiry("");
                              }
                              if (newPlateInfo.districtCode) {
                                setNewVehicleNickname(`${newPlateInfo.stateCode} ${m}`.trim());
                              }
                            }}
                            className={`h-6 px-2 text-xs font-medium ${
                              isSelected
                                ? "bg-theme-btn-primary text-white border-theme-btn-primary font-semibold shadow-xs"
                                : "border-border text-foreground hover:border-theme-btn-primary/40 bg-surface"
                            }`}
                          >
                            <span>{m}</span>
                          </AppButton>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground mt-1.5 italic">
                      Pick a brand above to view suggested models or type custom model.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">Variant / Trim</label>
                  <AppInput 
                    value={newVehicleVariant} 
                    onChange={(e) => setNewVehicleVariant(e.target.value)} 
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5 flex items-center gap-1">
                    <Fuel className="h-3.5 w-3.5 text-amber-500" />
                    <span>Fuel Type</span>
                  </label>
                  <select 
                    value={newVehicleFuel}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewVehicleFuel(val);
                      if (isElectricFuel(val)) setNewVehiclePucExpiry("");
                    }}
                    className="w-full h-9 rounded-lg border border-border bg-surface px-3 text-xs text-foreground font-medium focus:outline-none focus:border-theme-btn-primary shadow-2xs"
                  >
                    <option value="Petrol">Petrol</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Petrol Hybrid">Petrol Hybrid</option>
                    <option value="Electric">Electric (EV)</option>
                    <option value="CNG">CNG</option>
                    <option value="LPG">LPG</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">Vehicle Category</label>
                  <select 
                    value={newVehicleCategory}
                    onChange={(e) => setNewVehicleCategory(e.target.value)}
                    className="w-full h-9 rounded-lg border border-border bg-surface px-3 text-xs text-foreground font-medium focus:outline-none focus:border-theme-btn-primary shadow-2xs"
                  >
                    <option value="CAR">Car / SUV / Sedan</option>
                    <option value="BIKE">Motorbike / Scooter</option>
                    <option value="COMMERCIAL">Commercial Van / Shuttle</option>
                    <option value="BUS">Staff Bus / Coach</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5 flex items-center gap-1">
                    <Palette className="h-3.5 w-3.5 text-purple-500" />
                    <span>Body Paint Color</span>
                  </label>
                  <div className="flex gap-2 items-center">
                    <input 
                      type="color" 
                      value={newVehicleColor.startsWith("#") ? newVehicleColor : "#1e293b"}
                      onChange={(e) => setNewVehicleColor(e.target.value)}
                      className="h-9 w-10 rounded border border-border cursor-pointer p-0.5 bg-surface"
                    />
                    <AppInput 
                      value={newVehicleColor} 
                      onChange={(e) => setNewVehicleColor(e.target.value)} 
                      className="flex-1"
                    />
                  </div>
                  {/* Model-Aware OEM Paint Color Quick-Picks */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(() => {
                      const modelUpper = `${newVehicleMake} ${newVehicleModel}`.toUpperCase();
                      const isRaider = modelUpper.includes("RAIDER");
                      const isShine = modelUpper.includes("SHINE");
                      const isActiva = modelUpper.includes("ACTIVA");

                      const swatches = isRaider
                        ? [
                            { name: "Wicked Black", hex: "#0f172a" },
                            { name: "Fiery Yellow", hex: "#eab308" },
                            { name: "Striking Red", hex: "#dc2626" },
                            { name: "Blazing Blue", hex: "#2563eb" },
                            { name: "Forza Blue", hex: "#1d4ed8" }
                          ]
                        : isShine || isActiva
                        ? [
                            { name: "Geny Grey Metallic", hex: "#475569" },
                            { name: "Black", hex: "#0f172a" },
                            { name: "Rebel Red Metallic", hex: "#991b1b" },
                            { name: "Athletic Blue", hex: "#1e40af" }
                          ]
                        : [
                            { name: "Pearl White", hex: "#f8fafc" },
                            { name: "Attitude Black", hex: "#0f172a" },
                            { name: "Silver / Grey", hex: "#64748b" },
                            { name: "Royal Blue", hex: "#2563eb" },
                            { name: "Crimson Red", hex: "#dc2626" }
                          ];

                      return swatches.map((s) => (
                        <AppButton
                          key={s.name}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setNewVehicleColor(s.name)}
                          className={`h-6 px-2 rounded-full text-[10px] font-medium gap-1 ${
                            newVehicleColor === s.name || newVehicleColor === s.hex
                              ? "border-theme-btn-primary bg-theme-btn-primary/10 text-theme-btn-primary font-bold shadow-2xs"
                              : "border-border/70 bg-surface/70 text-muted-foreground hover:bg-surface hover:text-foreground"
                          }`}
                        >
                          <span
                            className="w-2 h-2 rounded-full border border-black/20 shrink-0 inline-block"
                            style={{ backgroundColor: s.hex }}
                          />
                          <span>{s.name}</span>
                        </AppButton>
                      ));
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. LEGAL OWNERSHIP & IDENTIFICATION */}
            <div className="space-y-4 border-b border-border/80 pb-8">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-theme-btn-primary/10 text-theme-btn-primary text-xs font-bold">3</span>
                  <span>Legal Ownership & Identification Numbers</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Corporate entity registration, VIN chassis stamp, engine serial number, and RTO jurisdiction
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5 flex items-center gap-1">
                    <UserCheck className="h-3.5 w-3.5 text-blue-500" />
                    <span>Registered Owner Name *</span>
                  </label>
                  <AppInput 
                    value={newVehicleOwner} 
                    onChange={(e) => setNewVehicleOwner(e.target.value)} 
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5 flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-blue-500" />
                    <span>RTO RMN (Registered Mobile Number) *</span>
                  </label>
                  <AppInput 
                    value={newVehicleRtoRmn} 
                    onChange={(e) => setNewVehicleRtoRmn(e.target.value)} 
                    required
                  />
                  <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                    <span className="text-amber-500 font-semibold">🔒 Protected:</span>
                    <span>Parivahan privacy rules conceal personal phone numbers on public portals. Enter owner's genuine 10-digit mobile number.</span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5 flex items-center gap-1">
                    <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Chassis Number (VIN) *</span>
                  </label>
                  <AppInput 
                    value={newVehicleVin} 
                    onChange={(e) => setNewVehicleVin(e.target.value.toUpperCase())} 
                    className="font-mono uppercase text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5 flex items-center gap-1">
                    <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Engine Number *</span>
                  </label>
                  <AppInput 
                    value={newVehicleEngine} 
                    onChange={(e) => setNewVehicleEngine(e.target.value.toUpperCase())} 
                    className="font-mono uppercase text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Official Registration Date *</span>
                  </label>
                  <AppInput 
                    type="date"
                    value={newVehicleRegDate} 
                    onChange={(e) => setNewVehicleRegDate(e.target.value)} 
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5 flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5 text-blue-500" />
                    <span>RTO Passing Authority (From Section 1)</span>
                  </label>
                  <div className="h-9 px-3 rounded-lg border border-border bg-slate-50 dark:bg-slate-900/50 flex items-center text-xs font-medium text-foreground truncate">
                    {newVehicleRtoOffice || "Resolved under Section 1 above"}
                  </div>
                </div>
              </div>
            </div>

            {/* 4. STATUTORY COMPLIANCE & VALIDITY */}
            <div className="space-y-4 border-b border-border/80 pb-8">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-theme-btn-primary/10 text-theme-btn-primary text-xs font-bold">4</span>
                  <span>Statutory Compliance & Document Validity</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Motor insurance, pollution certificate (PUC), fitness certificate, and highway assistance status
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-2">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
                      <span>Insurance Vendor / Company</span>
                    </label>
                    <AppButton
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={openCreateVendorModal}
                      className="p-0 h-auto text-[11px] font-semibold text-theme-btn-primary hover:underline flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      <span>New Vendor</span>
                    </AppButton>
                  </div>
                  <select
                    value={newVehicleInsuranceVendorId}
                    onChange={(e) => {
                      const selId = e.target.value;
                      setNewVehicleInsuranceVendorId(selId);
                      const sel = insuranceVendors.find(v => v.id === selId);
                      setNewVehicleInsuranceVendor(sel ? sel.name : "");
                    }}
                    className="w-full text-xs p-2.5 rounded-lg border border-border bg-surface text-foreground focus:ring-2 focus:ring-theme-btn-primary outline-none cursor-pointer"
                  >
                    <option value="">— Select Insurance Vendor —</option>
                    {insuranceVendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.name} ({vendor.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5 flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Insurance Policy Number</span>
                  </label>
                  <AppInput 
                    value={newVehicleInsurancePolicy} 
                    onChange={(e) => setNewVehicleInsurancePolicy(e.target.value)} 
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                      <Shield className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Insurance End Date *</span>
                    </label>
                    {newVehicleInsuranceExpiry && (
                      <div>{renderExpiryBadge(calculateDaysRemaining(newVehicleInsuranceExpiry))}</div>
                    )}
                  </div>
                  <AppInput 
                    type="date"
                    value={newVehicleInsuranceExpiry} 
                    onChange={(e) => setNewVehicleInsuranceExpiry(e.target.value)} 
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                <div>
                  {isElectricFuel(newVehicleFuel) ? (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 flex items-start gap-3 shadow-2xs">
                      <div className="h-8 w-8 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Zap className="h-4 w-4 text-emerald-500 fill-emerald-500" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                          <span>PUC Not Required (Zero Emission)</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 font-mono font-bold">CMVR Exempt</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                          Electric Vehicles (EVs) produce zero tailpipe emissions and are legally exempt from PUC certificate requirements under Parivahan CMVR rules.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                          <ShieldCheck className="h-3.5 w-3.5 text-amber-500" />
                          <span>PUC End Date *</span>
                        </label>
                        {newVehiclePucExpiry && (
                          <div>{renderExpiryBadge(calculateDaysRemaining(newVehiclePucExpiry))}</div>
                        )}
                      </div>
                      <AppInput 
                        type="date"
                        value={newVehiclePucExpiry} 
                        onChange={(e) => setNewVehiclePucExpiry(e.target.value)} 
                        required
                      />
                    </>
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">Fitness Certificate Expiry Date</label>
                  <AppInput 
                    type="date"
                    value={newVehicleFitnessExpiry} 
                    onChange={(e) => setNewVehicleFitnessExpiry(e.target.value)} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <label className="flex items-center gap-3 p-3.5 rounded-lg border border-border bg-surface cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors shadow-2xs">
                  <input 
                    type="checkbox"
                    checked={newVehicleHsrp}
                    onChange={(e) => setNewVehicleHsrp(e.target.checked)}
                    className="rounded border-border text-theme-btn-primary focus:ring-theme-btn-primary h-4 w-4 cursor-pointer"
                  />
                  <div className="text-xs">
                    <div className="font-semibold text-foreground">HSRP Number Plate Fitted</div>
                    <div className="text-[11px] text-muted-foreground">High Security Plate with laser-etched hologram & snap lock</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3.5 rounded-lg border border-border bg-surface cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors shadow-2xs">
                  <input 
                    type="checkbox"
                    checked={newVehicleRsa}
                    onChange={(e) => setNewVehicleRsa(e.target.checked)}
                    className="rounded border-border text-theme-btn-primary focus:ring-theme-btn-primary h-4 w-4 cursor-pointer"
                  />
                  <div className="text-xs">
                    <div className="font-semibold text-foreground">24x7 Roadside Assistance (RSA)</div>
                    <div className="text-[11px] text-muted-foreground">Emergency highway towing, battery jumpstart & puncture service</div>
                  </div>
                </label>
              </div>
            </div>

            {/* 5. FLEET ASSIGNMENT & INITIAL TELEMATICS */}
            <div className="space-y-4 border-b border-border/80 pb-8">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-theme-btn-primary/10 text-theme-btn-primary text-xs font-bold">5</span>
                  <span>Fleet Operations & Driver Assignment</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Initial meter distance, operational availability state, and chauffeur allocation
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">Fleet Operational Status</label>
                  <select 
                    value={newVehicleStatus}
                    onChange={(e) => setNewVehicleStatus(e.target.value)}
                    className="w-full h-9 rounded-lg border border-border bg-surface px-3 text-xs font-semibold text-foreground focus:outline-none focus:border-theme-btn-primary shadow-2xs"
                  >
                    <option value="IN_STOCK">Available (In Stock / Pool)</option>
                    <option value="IN_SERVICE">On Route / In Service</option>
                    <option value="MAINTENANCE">In Workshop / Maintenance</option>
                    <option value="RESERVED">Reserved</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5 flex items-center gap-1">
                    <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Initial Odometer Reading (km)</span>
                  </label>
                  <AppInput 
                    type="number"
                    min="0" 
                    value={newVehicleOdometer} 
                    onChange={(e) => setNewVehicleOdometer(Number(e.target.value))} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">Fleet Nickname / Asset Tag</label>
                  <AppInput 
                    value={newVehicleNickname} 
                    onChange={(e) => setNewVehicleNickname(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">Assign Primary Chauffeur</label>
                  <select 
                    value={newVehicleDriverId}
                    onChange={(e) => setNewVehicleDriverId(e.target.value)}
                    className="w-full h-9 rounded-lg border border-border bg-surface px-3 text-xs text-foreground font-medium focus:outline-none focus:border-theme-btn-primary shadow-2xs"
                  >
                    <option value="">-- No Driver Assigned (Pool Vehicle) --</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>{d.full_name} ({d.phone})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Bottom Form Actions */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <AppButton
                type="button"
                variant="outline"
                size="sm"
                onClick={() => router.push("/vehicle/inventory")}
                className="text-xs w-full sm:w-auto"
              >
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Cancel & Back to Fleet
              </AppButton>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <AppButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResetVehicleForm}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  Reset Form
                </AppButton>
                <AppButton 
                  type="submit" 
                  variant="primary"
                  disabled={modalSubmitting || !newVehiclePlate.trim()}
                  className="bg-theme-btn-primary hover:bg-theme-btn-primary-secondary text-white font-semibold text-xs h-9 px-6 gap-1.5 shadow-xs w-full sm:w-auto"
                >
                  {modalSubmitting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  <span>Save & Register Vehicle</span>
                </AppButton>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* OVERVIEW TAB CONTENT */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left: Active Dispatches & Trips */}
            <AppCard className="border-border shadow-xs">
              <AppCardHeader className="bg-surface/50 pb-3 border-b border-border/50 flex items-center justify-between">
                <div>
                  <AppCardTitle className="text-sm font-bold flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-theme-btn-primary" />
                    <span>Recent Trip Movement</span>
                  </AppCardTitle>
                  <p className="text-[11px] text-muted-foreground">Active and recent vehicle assignments</p>
                </div>
                <AppButton
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/vehicle/trips")}
                  className="text-xs text-theme-btn-primary hover:underline h-7"
                >
                  View All ({trips.length})
                </AppButton>
              </AppCardHeader>
              <AppCardContent className="p-0">
                {trips.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    No trip movements logged yet. Click{" "}
                    <AppButton
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsDispatchTripOpen(true)}
                      className="p-0 h-auto text-xs font-bold text-theme-btn-primary hover:underline inline"
                    >
                      Dispatch Trip
                    </AppButton>{" "}
                    to schedule a movement.
                  </div>
                ) : (
                  <div className="divide-y divide-border/60">
                    {trips.slice(0, 5).map(trp => (
                      <div 
                        key={trp.id} 
                        onClick={() => setViewingTrip(trp)}
                        className="p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-xs cursor-pointer group"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {renderHsrpPlate(trp.vehicle_reg)}
                            <span className="text-foreground font-semibold group-hover:text-theme-btn-primary transition-colors">{trp.traveler_name}</span>
                          </div>
                          <div className="text-muted-foreground text-[11px] flex items-center gap-1">
                            <span>{trp.origin}</span>
                            <ArrowRight className="h-3 w-3 inline text-muted-foreground" />
                            <span className="font-medium text-foreground">{trp.destination}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            trp.status === "IN_PROGRESS"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : trp.status === "COMPLETED"
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                              : trp.status === "CANCELLED"
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                          }`}>
                            {trp.status}
                          </span>
                          {trp.status === "PLANNED" && (
                            <AppButton
                              variant="outline"
                              size="icon-sm"
                              title="Start Route"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateTripStatus(trp.id, "IN_PROGRESS");
                              }}
                              className="h-7 w-7 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                            >
                              <Play className="h-3.5 w-3.5" />
                            </AppButton>
                          )}
                          {trp.status === "IN_PROGRESS" && (
                            <AppButton
                              variant="outline"
                              size="icon-sm"
                              title="Complete Trip"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateTripStatus(trp.id, "COMPLETED");
                              }}
                              className="h-7 w-7 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </AppButton>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </AppCardContent>
            </AppCard>

            {/* Right: Fleet Depot Snapshot */}
            <AppCard className="border-border shadow-xs">
              <AppCardHeader className="bg-surface/50 pb-3 border-b border-border/50 flex items-center justify-between">
                <div>
                  <AppCardTitle className="text-sm font-bold flex items-center gap-2">
                    <Car className="h-4 w-4 text-theme-btn-primary" />
                    <span>Fleet Depot Availability</span>
                  </AppCardTitle>
                  <p className="text-[11px] text-muted-foreground">Ready vehicles for allocation</p>
                </div>
                <AppButton
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/vehicle/inventory")}
                  className="text-xs text-theme-btn-primary hover:underline h-7"
                >
                  Manage Fleet ({vehicles.length})
                </AppButton>
              </AppCardHeader>
              <AppCardContent className="p-0">
                {vehicles.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    No vehicles enrolled in fleet master. Click{" "}
                    <AppButton
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push("/vehicle/register")}
                      className="p-0 h-auto text-xs font-bold text-theme-btn-primary hover:underline inline"
                    >
                      Add Vehicle
                    </AppButton>{" "}
                    to register a vehicle.
                  </div>
                ) : (
                  <div className="divide-y divide-border/60">
                    {vehicles.slice(0, 5).map(veh => (
                      <div 
                        key={veh.id} 
                        onClick={() => setViewingVehicle(veh)}
                        className="p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-xs cursor-pointer group"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            {renderHsrpPlate(veh.registration_number)}
                            <span className="font-semibold text-foreground group-hover:text-theme-btn-primary transition-colors">{veh.make} {veh.model}</span>
                            {veh.variant && veh.variant !== "Standard" && (
                              <span className="text-[10px] text-muted-foreground">({veh.variant})</span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            {veh.assignedDriver ? `Driver: ${veh.assignedDriver.full_name}` : "Driver: Unassigned"} • {veh.odometer_km.toLocaleString()} km
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            veh.status === "IN_STOCK"
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                              : veh.status === "IN_SERVICE"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                          }`}>
                            {veh.status === "IN_STOCK" ? "Available" : veh.status === "IN_SERVICE" ? "On Route" : veh.status}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <AppButton
                              variant="outline"
                              size="icon-sm"
                              title="Renew Policy"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenVehiclePolicyRenewModal(veh);
                              }}
                              className="h-7 w-7 text-cyan-600 hover:text-cyan-700 hover:border-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 shadow-2xs"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </AppButton>
                            <AppButton
                              variant="outline"
                              size="icon-sm"
                              title="Policy History & Ledger"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenVehiclePolicyHistoryModal(veh);
                              }}
                              className="h-7 w-7 text-indigo-600 hover:text-indigo-700 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 shadow-2xs"
                            >
                              <History className="h-3.5 w-3.5" />
                            </AppButton>
                            <AppButton
                              variant="outline"
                              size="icon-sm"
                              title="Specification Revision History & Audit Trail"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenVehicleSpecHistoryModal(veh);
                              }}
                              className="h-7 w-7 text-purple-600 hover:text-purple-700 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950/40 shadow-2xs"
                            >
                              <ClipboardCheck className="h-3.5 w-3.5" />
                            </AppButton>
                            <AppButton
                              variant="outline"
                              size="icon-sm"
                              title="Edit Vehicle"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditVehicleModal(veh);
                              }}
                              className="h-7 w-7 hover:border-theme-btn-primary hover:text-theme-btn-primary"
                            >
                              <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                            </AppButton>
                            <AppButton
                              variant="outline"
                              size="icon-sm"
                              title="Delete Vehicle"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget({
                                  type: "vehicle",
                                  id: veh.id,
                                  label: `Vehicle ${veh.registration_number} (${veh.make} ${veh.model})`
                                });
                              }}
                              className="h-7 w-7 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </AppButton>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </AppCardContent>
            </AppCard>

          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* INVENTORY / FLEET MASTER TAB */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === "inventory" && (
        <AppCard className="border-border shadow-xs overflow-hidden">
          <AppCardHeader className="bg-surface/50 pb-4 border-b border-border/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <AppCardTitle className="text-lg">Fleet Master Inventory</AppCardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Complete database of company-owned and executive fleet vehicles
              </p>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
              <div className="relative flex-1 sm:w-64">
                <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search plate, make, model..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:border-theme-btn-primary shadow-2xs"
                />
              </div>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="text-xs py-1.5 px-2.5 rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:border-theme-btn-primary shadow-2xs"
              >
                <option value="ALL">All Status</option>
                <option value="IN_STOCK">Available (In Stock)</option>
                <option value="IN_SERVICE">On Route / In Service</option>
                <option value="MAINTENANCE">In Workshop / Maintenance</option>
                <option value="RESERVED">Reserved</option>
              </select>

              {canCreateVehicle && (
                <AppButton
                  variant="primary"
                  size="sm"
                  onClick={() => router.push("/vehicle/register")}
                  className="bg-theme-btn-primary hover:bg-theme-btn-primary-secondary text-white text-xs h-8 font-semibold gap-1.5 shadow-xs shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Register Vehicle</span>
                </AppButton>
              )}
            </div>
          </AppCardHeader>

          <AppCardContent className="p-0 overflow-x-auto">
            <AppTableContainer className="rounded-none border-none">
              <AppTable className="w-full text-left text-xs">
                <AppTableHeader className="bg-slate-50 dark:bg-slate-900/60 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  <AppTableRow>
                    <AppTableHead className="p-3.5">Vehicle & Plate</AppTableHead>
                    <AppTableHead className="p-3.5">Owner & RTO RMN</AppTableHead>
                    <AppTableHead className="p-3.5">Chassis & Engine</AppTableHead>
                    <AppTableHead className="p-3.5">Reg. Date</AppTableHead>
                    <AppTableHead className="p-3.5">PUC Validity</AppTableHead>
                    <AppTableHead className="p-3.5">Insurance Validity</AppTableHead>
                    <AppTableHead className="p-3.5">RSA & HSRP</AppTableHead>
                    <AppTableHead className="p-3.5 text-center">Status</AppTableHead>
                    <AppTableHead className="p-3.5 text-right">Actions</AppTableHead>
                  </AppTableRow>
                </AppTableHeader>
                <AppTableBody className="divide-y divide-border/60">
                  {filteredVehicles.length === 0 ? (
                    <AppTableRow>
                      <AppTableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                        No vehicles found matching criteria. Click{" "}
                        <AppButton
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push("/vehicle/register")}
                          className="p-0 h-auto text-xs font-bold text-theme-btn-primary hover:underline inline"
                        >
                          Add Vehicle
                        </AppButton>{" "}
                        to enroll a new vehicle.
                      </AppTableCell>
                    </AppTableRow>
                  ) : (
                    filteredVehicles.map((veh) => (
                      <AppTableRow 
                        key={veh.id} 
                        onClick={() => setViewingVehicle(veh)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                      >
                        {/* 1. Vehicle Name & Regn No */}
                        <AppTableCell className="p-3.5">
                          {renderHsrpPlate(veh.registration_number)}
                          <div className="font-semibold text-foreground mt-1.5">
                            {veh.nickname || `${veh.make} ${veh.model}`}
                          </div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <span>{veh.make} {veh.model}</span>
                            {veh.fuel_type && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                                {veh.fuel_type}
                              </span>
                            )}
                          </div>
                        </AppTableCell>

                        {/* 2. Owner Name & RTO RMN */}
                        <AppTableCell className="p-3.5">
                          <div className="font-semibold text-foreground text-xs truncate max-w-xs" title={veh.registered_owner || "—"}>
                            {veh.registered_owner || "—"}
                          </div>
                          <div className="flex items-center gap-1 text-[11px] font-mono text-blue-600 dark:text-blue-400 font-semibold mt-1">
                            <Phone className="h-3 w-3 shrink-0" />
                            <span>{veh.rto_rmn || "Not Provided"}</span>
                          </div>
                          {veh.rto_office && (
                            <div className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate max-w-xs" title={veh.rto_office}>
                              {veh.rto_office}
                            </div>
                          )}
                        </AppTableCell>

                        {/* 3. Chassis Number & Engine Number */}
                        <AppTableCell className="p-3.5 font-mono text-xs">
                          <div className="text-[11px] text-foreground font-medium" title={veh.vin_chassis_number || "—"}>
                            <span className="text-[10px] text-muted-foreground uppercase font-bold mr-1">VIN:</span>
                            {veh.vin_chassis_number || "—"}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5" title={veh.engine_number || "—"}>
                            <span className="uppercase font-bold mr-1">ENG:</span>
                            {veh.engine_number || "—"}
                          </div>
                        </AppTableCell>

                        {/* 4. Registration Date */}
                        <AppTableCell className="p-3.5 font-mono text-xs text-foreground">
                          {veh.registration_date ? String(veh.registration_date).split("T")[0] : "—"}
                        </AppTableCell>

                        {/* 5. PUC End Date & PUC Expire in Days */}
                        <AppTableCell className="p-3.5">
                          {isElectricFuel(veh.fuel_type) ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 inline-flex items-center gap-1 shadow-2xs">
                              <Zap className="h-3 w-3 text-emerald-500 fill-emerald-500" />
                              <span>EV Exempt (N/A)</span>
                            </span>
                          ) : (
                            <>
                              <div className="font-mono text-[11px] font-semibold text-foreground">
                                {veh.puc_expiry_date ? String(veh.puc_expiry_date).split("T")[0] : "—"}
                              </div>
                              <div className="mt-1">
                                {renderExpiryBadge(veh.puc_expire_days ?? calculateDaysRemaining(veh.puc_expiry_date))}
                              </div>
                            </>
                          )}
                        </AppTableCell>

                        {/* 6. Insurance End Date, Vendor & Insurance Expire in Days */}
                        <AppTableCell className="p-3.5">
                          <div className="font-mono text-[11px] font-semibold text-foreground flex items-center gap-1">
                            <Shield className="h-3 w-3 text-emerald-500 shrink-0" />
                            <span>{veh.insurance_expiry_date ? String(veh.insurance_expiry_date).split("T")[0] : "—"}</span>
                          </div>
                          {veh.insurance_vendor && (
                            <div className="text-[10px] text-blue-600 dark:text-blue-400 font-medium truncate max-w-[150px] mt-0.5" title={`${veh.insurance_vendor}${veh.insurance_policy_number ? ` • ${veh.insurance_policy_number}` : ''}`}>
                              {veh.insurance_vendor}
                            </div>
                          )}
                          <div className="mt-1">
                            {renderExpiryBadge(veh.insurance_expire_days ?? calculateDaysRemaining(veh.insurance_expiry_date))}
                          </div>
                        </AppTableCell>

                        {/* 7. Road Side Assistance & HSRP Number Plate */}
                        <AppTableCell className="p-3.5">
                          <div className="flex flex-col gap-1">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border inline-flex items-center gap-1 w-fit ${
                              veh.has_hsrp_plate !== false
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25"
                                : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700"
                            }`}>
                              <ShieldCheck className="h-3 w-3" />
                              <span>HSRP Plate</span>
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border inline-flex items-center gap-1 w-fit ${
                              veh.has_roadside_assistance !== false
                                ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/25"
                                : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700"
                            }`}>
                              <Zap className="h-3 w-3 text-amber-500 fill-amber-500" />
                              <span>24x7 RSA</span>
                            </span>
                          </div>
                        </AppTableCell>

                        {/* 8. Fleet Status */}
                        <AppTableCell className="p-3.5 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase inline-block ${
                            veh.status === "IN_STOCK"
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                              : veh.status === "IN_SERVICE"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                          }`}>
                            {veh.status === "IN_STOCK" ? "Available" : veh.status === "IN_SERVICE" ? "On Route" : veh.status === "MAINTENANCE" ? "In Workshop" : veh.status}
                          </span>
                          {veh.assignedDriver && (
                            <div className="text-[10px] text-muted-foreground mt-1 truncate" title={veh.assignedDriver.full_name}>
                              {veh.assignedDriver.full_name}
                            </div>
                          )}
                        </AppTableCell>

                        {/* 9. Actions */}
                        <AppTableCell className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <AppButton
                              variant="outline"
                              size="sm"
                              title="Renew Insurance Policy"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenVehiclePolicyRenewModal(veh);
                              }}
                              className="h-7 px-2 text-xs gap-1 font-semibold text-cyan-600 dark:text-cyan-400 border-cyan-500/30 hover:border-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 shadow-2xs"
                            >
                              <RotateCcw className="h-3 w-3" />
                              <span>Renew</span>
                            </AppButton>
                            <AppButton
                              variant="outline"
                              size="sm"
                              title="View Policy History & Audit Ledger"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenVehiclePolicyHistoryModal(veh);
                              }}
                              className="h-7 px-2 text-xs gap-1 font-semibold text-indigo-600 dark:text-indigo-400 border-indigo-500/30 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 shadow-2xs"
                            >
                              <History className="h-3 w-3" />
                              <span>History</span>
                            </AppButton>
                            <AppButton
                              variant="outline"
                              size="sm"
                              title="View Specification Revision History & Audit Ledger"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenVehicleSpecHistoryModal(veh);
                              }}
                              className="h-7 px-2 text-xs gap-1 font-semibold text-purple-600 dark:text-purple-400 border-purple-500/30 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950/30 shadow-2xs"
                            >
                              <ClipboardCheck className="h-3 w-3" />
                              <span>Specs History</span>
                            </AppButton>
                            {canEditVehicle && (
                              <AppButton
                                variant="outline"
                                size="sm"
                                title="Edit Vehicle"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditVehicleModal(veh);
                                }}
                                className="h-7 px-2.5 text-xs gap-1 font-semibold hover:border-theme-btn-primary hover:text-theme-btn-primary shadow-2xs"
                              >
                                <Edit2 className="h-3 w-3 text-muted-foreground" />
                                <span>Edit</span>
                              </AppButton>
                            )}
                            {canDeleteVehicle && (
                              <AppButton
                                variant="outline"
                                size="sm"
                                title="Delete Vehicle"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteTarget({
                                    type: "vehicle",
                                    id: veh.id,
                                    label: `Vehicle ${veh.registration_number} (${veh.make} ${veh.model})`
                                  });
                                }}
                                className="h-7 px-2.5 text-xs gap-1 font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900 shadow-2xs"
                              >
                                <Trash2 className="h-3 w-3" />
                                <span>Delete</span>
                              </AppButton>
                            )}
                            {!canEditVehicle && !canDeleteVehicle && (
                              <span className="text-[11px] text-muted-foreground italic">Read-only</span>
                            )}
                          </div>
                        </AppTableCell>
                      </AppTableRow>
                    ))
                  )}
                </AppTableBody>
              </AppTable>
            </AppTableContainer>
          </AppCardContent>
        </AppCard>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* DRIVERS DIRECTORY TAB */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === "drivers" && (
        <AppCard className="border-border shadow-xs overflow-hidden">
          <AppCardHeader className="bg-surface/50 pb-4 border-b border-border/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <AppCardTitle className="text-lg">Drivers Directory & Roster</AppCardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Roster of authorized enterprise drivers, license validity & vehicle assignments
              </p>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search driver name, phone, license..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:border-theme-btn-primary shadow-2xs"
                />
              </div>
            </div>
          </AppCardHeader>

          <AppCardContent className="p-0 overflow-x-auto">
            <AppTableContainer className="rounded-none border-none">
              <AppTable className="w-full text-left text-xs">
                <AppTableHeader className="bg-slate-50 dark:bg-slate-900/60 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  <AppTableRow>
                    <AppTableHead className="p-3.5">Driver Name</AppTableHead>
                    <AppTableHead className="p-3.5">Contact Phone</AppTableHead>
                    <AppTableHead className="p-3.5">License Number</AppTableHead>
                    <AppTableHead className="p-3.5">License Expiry</AppTableHead>
                    <AppTableHead className="p-3.5">Experience</AppTableHead>
                    <AppTableHead className="p-3.5">Assigned Vehicle</AppTableHead>
                    <AppTableHead className="p-3.5 text-center">Status</AppTableHead>
                    <AppTableHead className="p-3.5 text-right">Actions</AppTableHead>
                  </AppTableRow>
                </AppTableHeader>
                <AppTableBody className="divide-y divide-border/60">
                  {filteredDrivers.length === 0 ? (
                    <AppTableRow>
                      <AppTableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                        No drivers recorded. Click <strong>Add Driver</strong> to register a new driver.
                      </AppTableCell>
                    </AppTableRow>
                  ) : (
                    filteredDrivers.map((drv) => {
                      const assignedVeh = drv.assigned_vehicle_id ? vehicleMap.get(drv.assigned_vehicle_id) : null;
                      return (
                        <AppTableRow 
                          key={drv.id} 
                          onClick={() => setViewingDriver(drv)}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                        >
                          <AppTableCell className="p-3.5 font-semibold text-foreground">
                            {drv.full_name}
                          </AppTableCell>
                          <AppTableCell className="p-3.5 text-muted-foreground font-mono">
                            <span className="flex items-center gap-1.5">
                              <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                              {drv.phone}
                            </span>
                          </AppTableCell>
                          <AppTableCell className="p-3.5 font-mono text-muted-foreground">
                            {drv.license_number}
                          </AppTableCell>
                          <AppTableCell className="p-3.5 font-mono text-muted-foreground">
                            {drv.license_expiry_date || "—"}
                          </AppTableCell>
                          <AppTableCell className="p-3.5 text-muted-foreground">
                            {drv.experience_years ? `${drv.experience_years} years` : "—"}
                          </AppTableCell>
                          <AppTableCell className="p-3.5">
                            {assignedVeh ? (
                              <span className="font-mono font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 rounded tracking-wider shadow-2xs inline-flex items-center gap-1">
                                {assignedVeh.registration_number} ({assignedVeh.make})
                              </span>
                            ) : (
                              <span className="text-muted-foreground italic">Pool / Unassigned</span>
                            )}
                          </AppTableCell>
                          <AppTableCell className="p-3.5 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase inline-block ${
                              drv.is_active
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                            }`}>
                              {drv.is_active ? "Active" : "Inactive"}
                            </span>
                          </AppTableCell>
                          <AppTableCell className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {canManageDrivers && (
                                <>
                                  <AppButton
                                    variant="outline"
                                    size="icon-sm"
                                    title="Edit Driver"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openEditDriverModal(drv);
                                    }}
                                    className="h-7 w-7"
                                  >
                                    <Edit2 className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                  </AppButton>
                                  <AppButton
                                    variant="outline"
                                    size="icon-sm"
                                    title="Delete Driver"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteTarget({
                                        type: "driver",
                                        id: drv.id,
                                        label: `Driver ${drv.full_name}`
                                      });
                                    }}
                                    className="h-7 w-7 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </AppButton>
                                </>
                              )}
                              {!canManageDrivers && (
                                <span className="text-[11px] text-muted-foreground italic">Read-only</span>
                              )}
                            </div>
                          </AppTableCell>
                        </AppTableRow>
                      );
                    })
                  )}
                </AppTableBody>
              </AppTable>
            </AppTableContainer>
          </AppCardContent>
        </AppCard>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* TRIPS / DISPATCH TAB */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === "trips" && (
        <AppCard className="border-border shadow-xs overflow-hidden">
          <AppCardHeader className="bg-surface/50 pb-4 border-b border-border/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <AppCardTitle className="text-lg">Daily Trip Dispatch Sheets</AppCardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Movement logs across Chandak corporate offices, development sites, and vendor locations
              </p>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search traveler, purpose, destination..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:border-theme-btn-primary shadow-2xs"
                />
              </div>
            </div>
          </AppCardHeader>

          <AppCardContent className="p-0 overflow-x-auto">
            <AppTableContainer className="rounded-none border-none">
              <AppTable className="w-full text-left text-xs">
                <AppTableHeader className="bg-slate-50 dark:bg-slate-900/60 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  <AppTableRow>
                    <AppTableHead className="p-3.5">Plan Date</AppTableHead>
                    <AppTableHead className="p-3.5">Vehicle</AppTableHead>
                    <AppTableHead className="p-3.5">Assigned Driver</AppTableHead>
                    <AppTableHead className="p-3.5">Traveler / Purpose</AppTableHead>
                    <AppTableHead className="p-3.5">Route (Origin ➔ Destination)</AppTableHead>
                    <AppTableHead className="p-3.5">Schedule</AppTableHead>
                    <AppTableHead className="p-3.5 text-center">Status</AppTableHead>
                    <AppTableHead className="p-3.5 text-right">Actions</AppTableHead>
                  </AppTableRow>
                </AppTableHeader>
                <AppTableBody className="divide-y divide-border/60">
                  {filteredTrips.length === 0 ? (
                    <AppTableRow>
                      <AppTableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                        No trips recorded yet. Click <strong>Dispatch Trip</strong> to schedule a trip sheet.
                      </AppTableCell>
                    </AppTableRow>
                  ) : (
                    filteredTrips.map((trp) => (
                      <AppTableRow 
                        key={trp.id} 
                        onClick={() => setViewingTrip(trp)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                      >
                        <AppTableCell className="p-3.5 font-mono text-muted-foreground">{trp.plan_date}</AppTableCell>
                        <AppTableCell className="p-3.5 font-bold text-foreground">
                          {renderHsrpPlate(trp.vehicle_reg)}
                        </AppTableCell>
                        <AppTableCell className="p-3.5 text-muted-foreground">
                          <div className="font-medium text-foreground">{trp.driver_name}</div>
                        </AppTableCell>
                        <AppTableCell className="p-3.5 text-muted-foreground font-mono text-xs">
                          {trp.planned_start_time} - {trp.planned_end_time}
                        </AppTableCell>
                        <AppTableCell className="p-3.5 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase inline-block ${
                            trp.status === "IN_PROGRESS"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : trp.status === "COMPLETED"
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                              : trp.status === "CANCELLED"
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                          }`}>
                            {trp.status}
                          </span>
                        </AppTableCell>
                        <AppTableCell className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {canDispatchTrips && trp.status === "PLANNED" && (
                              <>
                                <AppButton
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateTripStatus(trp.id, "IN_PROGRESS");
                                  }}
                                  className="h-7 text-xs px-2 text-emerald-600 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                >
                                  <Play className="h-3 w-3 mr-1" />
                                  Start
                                </AppButton>
                                <AppButton
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateTripStatus(trp.id, "CANCELLED");
                                  }}
                                  className="h-7 text-xs px-2 text-muted-foreground hover:text-rose-600"
                                >
                                  Cancel
                                </AppButton>
                              </>
                            )}
                            {canDispatchTrips && trp.status === "IN_PROGRESS" && (
                              <AppButton
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdateTripStatus(trp.id, "COMPLETED");
                                }}
                                className="h-7 text-xs px-2 text-blue-600 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Complete
                              </AppButton>
                            )}
                            {canDispatchTrips && (
                              <AppButton
                                variant="outline"
                                size="icon-sm"
                                title="Delete Trip"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteTarget({
                                    type: "trip",
                                    id: trp.id,
                                    label: `Trip for ${trp.traveler_name}`
                                  });
                                }}
                                className="h-7 w-7 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </AppButton>
                            )}
                            {!canDispatchTrips && (
                              <span className="text-[11px] text-muted-foreground italic">Read-only</span>
                            )}
                          </div>
                        </AppTableCell>
                      </AppTableRow>
                    ))
                  )}
                </AppTableBody>
              </AppTable>
            </AppTableContainer>
          </AppCardContent>
        </AppCard>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* MAINTENANCE TAB */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === "maintenance" && (
        <AppCard className="border-border shadow-xs overflow-hidden">
          <AppCardHeader className="bg-surface/50 pb-4 border-b border-border/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <AppCardTitle className="text-lg">Workshop Maintenance & Service Records</AppCardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Scheduled periodic services, repairs, and vendor job card tracking
              </p>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search service work, vendor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:border-theme-btn-primary shadow-2xs"
                />
              </div>
              {canManageMaintenance && (
                <AppButton
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    resetMaintenanceForm();
                    setIsAddMaintenanceOpen(true);
                  }}
                  className="bg-theme-btn-primary hover:bg-theme-btn-primary-secondary text-white text-xs h-9 font-semibold gap-1.5 shadow-xs shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Log Service Job Card</span>
                </AppButton>
              )}
            </div>
          </AppCardHeader>

          <AppCardContent className="p-0 overflow-x-auto">
            <AppTableContainer className="rounded-none border-none">
              <AppTable className="w-full text-left text-xs">
                <AppTableHeader className="bg-slate-50 dark:bg-slate-900/60 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  <AppTableRow>
                    <AppTableHead className="p-3.5">Service Date & Job Card</AppTableHead>
                    <AppTableHead className="p-3.5">Vehicle</AppTableHead>
                    <AppTableHead className="p-3.5">Category & Scope</AppTableHead>
                    <AppTableHead className="p-3.5">Workshop & Technician</AppTableHead>
                    <AppTableHead className="p-3.5">Odometer</AppTableHead>
                    <AppTableHead className="p-3.5">Cost</AppTableHead>
                    <AppTableHead className="p-3.5 text-center">Next Due</AppTableHead>
                    <AppTableHead className="p-3.5 text-right">Actions</AppTableHead>
                  </AppTableRow>
                </AppTableHeader>
                <AppTableBody className="divide-y divide-border/60">
                  {filteredMaintenance.length === 0 ? (
                    <AppTableRow>
                      <AppTableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                        No maintenance records yet. Click <strong>Log Service Job Card</strong> to record service work.
                      </AppTableCell>
                    </AppTableRow>
                  ) : (
                    filteredMaintenance.map((m) => {
                      const partsData = (m.parts_replaced && typeof m.parts_replaced === "object") ? m.parts_replaced : null;
                      const catId = partsData?.category;
                      const catInfo = MAINTENANCE_CATEGORIES.find((c) => c.id === catId) || {
                        id: "GENERAL",
                        label: "General Service",
                        icon: "🔧",
                        badge: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20"
                      };
                      const invoiceNo = partsData?.invoice_number;

                      return (
                        <AppTableRow 
                          key={m.id} 
                          onClick={() => setSelectedMaintenanceForView(m)}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                        >
                          <AppTableCell className="p-3.5">
                            <div className="font-mono text-xs text-foreground font-semibold">{m.service_date}</div>
                            {invoiceNo ? (
                              <div className="text-[10px] font-mono text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Receipt className="h-3 w-3 text-amber-500" />
                                <span>{invoiceNo}</span>
                              </div>
                            ) : (
                              <div className="text-[10px] text-muted-foreground font-mono">#{m.id.slice(-6)}</div>
                            )}
                          </AppTableCell>
                          <AppTableCell className="p-3.5 font-bold text-foreground">
                            {renderHsrpPlate(m.vehicle_reg)}
                          </AppTableCell>
                          <AppTableCell className="p-3.5 max-w-xs">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border inline-flex items-center gap-1 ${catInfo.badge}`}>
                                <span>{catInfo.icon}</span>
                                <span>{catInfo.label}</span>
                              </span>
                            </div>
                            <div className="text-foreground font-medium truncate text-xs" title={m.service_type}>
                              {m.service_type}
                            </div>
                          </AppTableCell>
                          <AppTableCell className="p-3.5 text-xs">
                            <div className="text-foreground font-semibold truncate max-w-[180px]" title={m.service_center}>
                              {m.service_center}
                            </div>
                            {m.technician_name ? (
                              <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                <span>Advisor:</span>
                                <span className="font-medium text-foreground">{m.technician_name}</span>
                              </div>
                            ) : partsData?.location ? (
                              <div className="text-[10px] text-muted-foreground truncate max-w-[180px]">
                                {partsData.location}
                              </div>
                            ) : null}
                          </AppTableCell>
                          <AppTableCell className="p-3.5 font-mono text-muted-foreground">
                            {m.odometer_km ? `${m.odometer_km.toLocaleString()} km` : "—"}
                          </AppTableCell>
                          <AppTableCell className="p-3.5">
                            <div className="font-bold text-foreground text-xs">
                              ₹{Number(m.cost).toLocaleString("en-IN")}
                            </div>
                            {partsData?.labour_cost ? (
                              <div className="text-[10px] text-muted-foreground">
                                Lab: ₹{Number(partsData.labour_cost).toLocaleString("en-IN")}
                              </div>
                            ) : null}
                          </AppTableCell>
                          <AppTableCell className="p-3.5 text-center font-mono text-xs">
                            <div className="text-foreground font-medium">
                              {m.next_service_due_date || "—"}
                            </div>
                            {m.next_service_due_odometer ? (
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                @ {m.next_service_due_odometer.toLocaleString()} km
                              </div>
                            ) : null}
                          </AppTableCell>
                          <AppTableCell className="p-3.5 text-right">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <AppButton
                                variant="outline"
                                size="sm"
                                title="View Detailed Job Card & Invoice"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedMaintenanceForView(m);
                                }}
                                className="h-7 px-2 text-xs text-primary border-primary/30 hover:bg-primary/10 gap-1 font-medium"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Job Card</span>
                              </AppButton>
                              {canManageMaintenance && (
                                <AppButton
                                  variant="outline"
                                  size="sm"
                                  title="Edit Service Record & Bill"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditMaintenanceModal(m);
                                  }}
                                  className="h-7 px-2 text-xs text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10 gap-1 font-semibold"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                  <span className="hidden sm:inline">Edit</span>
                                </AppButton>
                              )}
                              {canManageMaintenance && (
                                <AppButton
                                  variant="outline"
                                  size="icon-sm"
                                  title="Delete Record"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteTarget({
                                      type: "maintenance",
                                      id: m.id,
                                      label: `Service record for ${m.vehicle_reg}`
                                    });
                                  }}
                                  className="h-7 w-7 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </AppButton>
                              )}
                            </div>
                          </AppTableCell>
                        </AppTableRow>
                      );
                    })
                  )}
                </AppTableBody>
              </AppTable>
            </AppTableContainer>
          </AppCardContent>
        </AppCard>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* TRAVELERS TAB */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === "travelers" && (
        <div className="space-y-6">
          <AppCard className="border-border shadow-xs overflow-hidden">
            <AppCardHeader className="bg-surface/50 pb-4 border-b border-border/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <AppCardTitle className="text-lg flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-indigo-500" />
                  <span>Traveler Allocations & Passenger Manifest</span>
                </AppCardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Corporate personnel, site engineers, and executive vehicle transit schedules
                </p>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search traveler, purpose, destination..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:border-theme-btn-primary shadow-2xs"
                  />
                </div>
                <AppButton
                  variant="primary"
                  size="sm"
                  onClick={() => setIsDispatchTripOpen(true)}
                  className="bg-theme-btn-primary hover:bg-theme-btn-primary-secondary text-white text-xs h-9 font-semibold gap-1.5 shadow-xs shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  <span>Dispatch Trip</span>
                </AppButton>
              </div>
            </AppCardHeader>

            <AppCardContent className="p-0 overflow-x-auto">
              <AppTableContainer className="rounded-none border-none">
                <AppTable className="w-full text-left text-xs">
                  <AppTableHeader className="bg-slate-50 dark:bg-slate-900/60 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    <AppTableRow>
                      <AppTableHead className="p-3.5">Traveler & Department</AppTableHead>
                      <AppTableHead className="p-3.5">Journey Route</AppTableHead>
                      <AppTableHead className="p-3.5">Assigned Vehicle</AppTableHead>
                      <AppTableHead className="p-3.5">Chauffeur / Driver</AppTableHead>
                      <AppTableHead className="p-3.5">Schedule / Timing</AppTableHead>
                      <AppTableHead className="p-3.5 text-center">Movement Status</AppTableHead>
                      <AppTableHead className="p-3.5 text-right">Actions</AppTableHead>
                    </AppTableRow>
                  </AppTableHeader>
                  <AppTableBody className="divide-y divide-border/60">
                    {filteredTrips.length === 0 ? (
                      <AppTableRow>
                        <AppTableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                          No traveler transit records found. Click <strong>Dispatch Trip</strong> to schedule passenger movement.
                        </AppTableCell>
                      </AppTableRow>
                    ) : (
                      filteredTrips.map((trp) => (
                        <AppTableRow 
                          key={trp.id} 
                          onClick={() => setViewingTrip(trp)}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                        >
                          <AppTableCell className="p-3.5">
                            <div className="font-semibold text-foreground">{trp.traveler_name}</div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">{trp.purpose || "Official Corporate Transit"}</div>
                          </AppTableCell>
                          <AppTableCell className="p-3.5">
                            <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                              <span>{trp.origin}</span>
                              <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                              <span className="text-theme-btn-primary font-semibold">{trp.destination}</span>
                            </div>
                          </AppTableCell>
                          <AppTableCell className="p-3.5 font-bold text-foreground">
                            {renderHsrpPlate(trp.vehicle_reg)}
                          </AppTableCell>
                          <AppTableCell className="p-3.5 text-muted-foreground">
                            <div className="font-medium text-foreground">{trp.driver_name}</div>
                          </AppTableCell>
                          <AppTableCell className="p-3.5 text-muted-foreground font-mono text-xs">
                            {trp.planned_start_time} - {trp.planned_end_time}
                          </AppTableCell>
                          <AppTableCell className="p-3.5 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase inline-block ${
                              trp.status === "IN_PROGRESS"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : trp.status === "COMPLETED"
                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                                : trp.status === "CANCELLED"
                                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                            }`}>
                              {trp.status}
                            </span>
                          </AppTableCell>
                          <AppTableCell className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {canDispatchTrips && trp.status === "PLANNED" && (
                                <>
                                  <AppButton
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUpdateTripStatus(trp.id, "IN_PROGRESS");
                                    }}
                                    className="h-7 text-xs px-2 text-emerald-600 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                  >
                                    <Play className="h-3 w-3 mr-1" />
                                    Start
                                  </AppButton>
                                  <AppButton
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUpdateTripStatus(trp.id, "CANCELLED");
                                    }}
                                    className="h-7 text-xs px-2 text-muted-foreground hover:text-rose-600"
                                  >
                                    Cancel
                                  </AppButton>
                                </>
                              )}
                              {canDispatchTrips && trp.status === "IN_PROGRESS" && (
                                <AppButton
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateTripStatus(trp.id, "COMPLETED");
                                  }}
                                  className="h-7 text-xs px-2 text-blue-600 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                                >
                                  <Check className="h-3 w-3 mr-1" />
                                  Complete
                                </AppButton>
                              )}
                              {canDispatchTrips && (
                                <AppButton
                                  variant="outline"
                                  size="icon-sm"
                                  title="Delete Trip"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteTarget({
                                      type: "trip",
                                      id: trp.id,
                                      label: `Trip for ${trp.traveler_name}`
                                    });
                                  }}
                                  className="h-7 w-7 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </AppButton>
                              )}
                              {!canDispatchTrips && (
                                <span className="text-[11px] text-muted-foreground italic">Read-only</span>
                              )}
                            </div>
                          </AppTableCell>
                        </AppTableRow>
                      ))
                    )}
                  </AppTableBody>
                </AppTable>
              </AppTableContainer>
            </AppCardContent>
          </AppCard>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* COMPLIANCE & ALERTS TAB */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === "alerts" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <AppCard className="border-border shadow-xs">
              <AppCardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">Critical / Expired</p>
                  <h3 className="text-2xl font-bold mt-1 text-rose-600 dark:text-rose-400">
                    {complianceAlerts.filter(a => a.status === "EXPIRED").length}
                  </h3>
                  <span className="text-[10px] text-muted-foreground">Immediate action required</span>
                </div>
                <div className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/20">
                  <AlertTriangle className="h-5 w-5" />
                </div>
              </AppCardContent>
            </AppCard>

            <AppCard className="border-border shadow-xs">
              <AppCardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">Expiring in &le; 30 Days</p>
                  <h3 className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">
                    {complianceAlerts.filter(a => a.status === "EXPIRING_SOON").length}
                  </h3>
                  <span className="text-[10px] text-muted-foreground">Renewal window open</span>
                </div>
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
                  <Clock className="h-5 w-5" />
                </div>
              </AppCardContent>
            </AppCard>

            <AppCard className="border-border shadow-xs">
              <AppCardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Fully Compliant</p>
                  <h3 className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                    {complianceAlerts.filter(a => a.status === "VALID").length}
                  </h3>
                  <span className="text-[10px] text-muted-foreground">Statutory documents valid</span>
                </div>
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
                  <ShieldCheck className="h-5 w-5" />
                </div>
              </AppCardContent>
            </AppCard>
          </div>

          <AppCard className="border-border shadow-xs overflow-hidden">
            <AppCardHeader className="bg-surface/50 pb-4 border-b border-border/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <AppCardTitle className="text-lg flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-amber-500" />
                  <span>Statutory Compliance & Expiry Master Audit</span>
                </AppCardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Proactive monitoring of Vehicle Insurance, PUC, Fitness, Road Tax and Chauffeur Commercial Licenses
                </p>
              </div>
            </AppCardHeader>

            <AppCardContent className="p-0 overflow-x-auto">
              <AppTableContainer className="rounded-none border-none">
                <AppTable className="w-full text-left text-xs">
                  <AppTableHeader className="bg-slate-50 dark:bg-slate-900/60 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    <AppTableRow>
                      <AppTableHead className="p-3.5">Asset / Driver</AppTableHead>
                      <AppTableHead className="p-3.5">Statutory Document</AppTableHead>
                      <AppTableHead className="p-3.5">Expiry Date</AppTableHead>
                      <AppTableHead className="p-3.5">Days Status</AppTableHead>
                      <AppTableHead className="p-3.5 text-center">Compliance State</AppTableHead>
                      <AppTableHead className="p-3.5 text-right">Action</AppTableHead>
                    </AppTableRow>
                  </AppTableHeader>
                  <AppTableBody className="divide-y divide-border/60">
                    {complianceAlerts.length === 0 ? (
                      <AppTableRow>
                        <AppTableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                          All statutory records are fully validated and up-to-date!
                        </AppTableCell>
                      </AppTableRow>
                    ) : (
                      complianceAlerts.map((item) => (
                        <AppTableRow 
                          key={item.id} 
                          onClick={() => {
                            if (item.vehicle) setViewingVehicle(item.vehicle);
                            else if (item.driver) setViewingDriver(item.driver);
                          }}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                        >
                          <AppTableCell className="p-3.5">
                            <div className="font-bold text-foreground">{item.title}</div>
                            <div className="text-[11px] text-muted-foreground">{item.subtitle}</div>
                          </AppTableCell>
                          <AppTableCell className="p-3.5 font-medium text-foreground">
                            {item.docType}
                          </AppTableCell>
                          <AppTableCell className="p-3.5 font-mono text-muted-foreground">
                            {item.expiryDate}
                          </AppTableCell>
                          <AppTableCell className="p-3.5">
                            {item.daysRemaining < 0 ? (
                              <span className="text-rose-600 dark:text-rose-400 font-bold">
                                Expired {Math.abs(item.daysRemaining)} days ago
                              </span>
                            ) : item.daysRemaining <= 30 ? (
                              <span className="text-amber-600 dark:text-amber-400 font-bold">
                                Expires in {item.daysRemaining} days
                              </span>
                            ) : (
                              <span className="text-muted-foreground font-mono">
                                Valid ({item.daysRemaining} days left)
                              </span>
                            )}
                          </AppTableCell>
                          <AppTableCell className="p-3.5 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase inline-block ${
                              item.status === "EXPIRED"
                                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                                : item.status === "EXPIRING_SOON"
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            }`}>
                              {item.status === "EXPIRED" ? "Expired" : item.status === "EXPIRING_SOON" ? "Expiring Soon" : "Valid"}
                            </span>
                          </AppTableCell>
                          <AppTableCell className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {item.vehicle ? (
                                <>
                                  {item.docType === "Insurance Policy" && (
                                    <>
                                      <AppButton
                                        variant="primary"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenVehiclePolicyRenewModal(item.vehicle!);
                                        }}
                                        className="h-7 text-xs px-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold gap-1 shadow-2xs"
                                      >
                                        <RotateCcw className="h-3 w-3" />
                                        <span>Renew Policy</span>
                                      </AppButton>
                                      <AppButton
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenVehiclePolicyHistoryModal(item.vehicle!);
                                        }}
                                        className="h-7 text-xs px-2 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 gap-1 font-semibold shadow-2xs"
                                        title="View Historical Policies"
                                      >
                                        <History className="h-3 w-3" />
                                        <span>History</span>
                                      </AppButton>
                                    </>
                                  )}
                                  {item.docType === "PUC Certificate" && (
                                    <>
                                      <AppButton
                                        variant="primary"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenVehiclePucRenewModal(item.vehicle!);
                                        }}
                                        className="h-7 text-xs px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1 shadow-2xs"
                                      >
                                        <Wind className="h-3 w-3" />
                                        <span>Renew PUC</span>
                                      </AppButton>
                                      <AppButton
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenVehiclePucHistoryModal(item.vehicle!);
                                        }}
                                        className="h-7 text-xs px-2 text-teal-600 dark:text-teal-400 border-teal-500/30 hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-950/30 gap-1 font-semibold shadow-2xs"
                                        title="View Historical PUC Certificates"
                                      >
                                        <History className="h-3 w-3" />
                                        <span>History</span>
                                      </AppButton>
                                    </>
                                  )}
                                  <AppButton
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openEditVehicleModal(item.vehicle!);
                                    }}
                                    className="h-7 text-xs px-2.5"
                                  >
                                    <Edit2 className="h-3 w-3 mr-1" />
                                    Edit Vehicle
                                  </AppButton>
                                </>
                              ) : item.driver ? (
                                <AppButton
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditDriverModal(item.driver!);
                                  }}
                                  className="h-7 text-xs px-2.5"
                                >
                                  <Edit2 className="h-3 w-3 mr-1" />
                                  Renew Driver
                                </AppButton>
                              ) : null}
                            </div>
                          </AppTableCell>
                        </AppTableRow>
                      ))
                    )}
                  </AppTableBody>
                </AppTable>
              </AppTableContainer>
            </AppCardContent>
          </AppCard>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* FLEET REPORTS & ANALYTICS TAB */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === "reports" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <AppCard className="border-border shadow-xs">
              <AppCardContent className="p-4">
                <p className="text-xs font-semibold text-muted-foreground">Fleet Size & Capital</p>
                <h3 className="text-2xl font-bold mt-1 text-foreground">{vehicles.length} Units</h3>
                <span className="text-[10px] text-muted-foreground">Enrolled in enterprise registry</span>
              </AppCardContent>
            </AppCard>

            <AppCard className="border-border shadow-xs">
              <AppCardContent className="p-4">
                <p className="text-xs font-semibold text-muted-foreground">Cumulative Mileage</p>
                <h3 className="text-2xl font-bold mt-1 text-indigo-600 dark:text-indigo-400">
                  {fleetReportsData.totalOdometerKm.toLocaleString()} km
                </h3>
                <span className="text-[10px] text-muted-foreground">Avg {fleetReportsData.avgOdometer.toLocaleString()} km / vehicle</span>
              </AppCardContent>
            </AppCard>

            <AppCard className="border-border shadow-xs">
              <AppCardContent className="p-4">
                <p className="text-xs font-semibold text-muted-foreground">Total Workshop Expense</p>
                <h3 className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">
                  ₹{fleetReportsData.totalMaintenanceSpend.toLocaleString("en-IN")}
                </h3>
                <span className="text-[10px] text-muted-foreground">Across {maintenance.length} service records</span>
              </AppCardContent>
            </AppCard>

            <AppCard className="border-border shadow-xs">
              <AppCardContent className="p-4">
                <p className="text-xs font-semibold text-muted-foreground">Driver Assignment Ratio</p>
                <h3 className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                  {vehicles.length > 0 ? Math.round((drivers.filter(d => d.assigned_vehicle_id).length / vehicles.length) * 100) : 0}%
                </h3>
                <span className="text-[10px] text-muted-foreground">{drivers.length} active authorized drivers</span>
              </AppCardContent>
            </AppCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Mileage Vehicles */}
            <AppCard className="border-border shadow-xs">
              <AppCardHeader className="bg-surface/50 pb-3 border-b border-border/50">
                <AppCardTitle className="text-sm font-bold flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-theme-btn-primary" />
                  <span>High-Mileage Fleet Units</span>
                </AppCardTitle>
                <p className="text-[11px] text-muted-foreground">Leaderboard of highest operational odometer distances</p>
              </AppCardHeader>
              <AppCardContent className="p-0">
                <div className="divide-y divide-border/60">
                  {fleetReportsData.topMileageVehicles.map(veh => (
                    <div key={veh.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 rounded tracking-wider shadow-2xs inline-flex items-center gap-1">
                            {veh.registration_number}
                          </span>
                          <span className="font-semibold text-foreground">{veh.make} {veh.model}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {veh.assignedDriver ? `Chauffeur: ${veh.assignedDriver.full_name}` : "Pool Asset"}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-sm text-foreground">
                          {veh.odometer_km.toLocaleString()} km
                        </span>
                        <div className="text-[10px] text-muted-foreground font-medium">{veh.category}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </AppCardContent>
            </AppCard>

            {/* Powertrain Distribution */}
            <AppCard className="border-border shadow-xs">
              <AppCardHeader className="bg-surface/50 pb-3 border-b border-border/50">
                <AppCardTitle className="text-sm font-bold flex items-center gap-2">
                  <Fuel className="h-4 w-4 text-emerald-500" />
                  <span>Fleet Powertrain Distribution</span>
                </AppCardTitle>
                <p className="text-[11px] text-muted-foreground">Breakdown by propulsion & fuel technologies</p>
              </AppCardHeader>
              <AppCardContent className="p-4 space-y-4">
                {Object.entries(fleetReportsData.fuelCounts).map(([fuel, count]) => {
                  const pct = vehicles.length > 0 ? Math.round((count / vehicles.length) * 100) : 0;
                  return (
                    <div key={fuel} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-theme-btn-primary" />
                          {fuel}
                        </span>
                        <span className="text-muted-foreground font-mono">{count} units ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div 
                          className="h-full bg-theme-btn-primary rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </AppCardContent>
            </AppCard>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* PARTS & CONSUMABLES TAB — ENHANCED DATES, EXPIRIES & RENEWAL POLICIES */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === "parts" && (
        <div className="space-y-6">
          <AppCard className="border-border shadow-xs overflow-hidden">
            {/* Filter Bar & Tabs */}
            <div className="p-4 border-b border-border/50 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="flex flex-1 items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <AppInput
                    placeholder="Search by part name, brand, SKU/part #, serial/IMEI, vehicle plate..."
                    value={partsSearch}
                    onChange={(e) => setPartsSearch(e.target.value)}
                    className="pl-9 text-xs h-9"
                  />
                  {partsSearch && (
                    <button
                      onClick={() => setPartsSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <select
                  value={partsItemTypeFilter}
                  onChange={(e) => setPartsItemTypeFilter(e.target.value)}
                  className="h-9 text-xs px-3 rounded-lg border border-border bg-surface text-foreground focus:ring-2 focus:ring-theme-btn-primary outline-none"
                >
                  <option value="ALL">All Item Types</option>
                  <option value="SPARE_PART">Spare Parts</option>
                  <option value="ACCESSORY">Accessories</option>
                  <option value="CONSUMABLE">Consumables & Fluids</option>
                  <option value="TYRE">Tyres & Wheels</option>
                  <option value="BATTERY">Batteries & Electrical</option>
                  <option value="GPS_DEVICE">GPS & Telematics</option>
                  <option value="DASHCAM">Dashcam & Vision</option>
                  <option value="TOOL">Workshop Tools</option>
                </select>
              </div>

              {/* Expiry / Lifecycle Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                {[
                  { id: "ALL", label: `All (${parts.length})` },
                  { id: "ACTIVE_WARRANTY", label: `Active Warranty (${partsKpis.activeWarranties})` },
                  { id: "EXPIRING_SOON", label: `Expiring Soon (${partsKpis.expiringSoon})` },
                  { id: "RENEWAL_DUE", label: `Renewal Due (${partsKpis.renewalsDue})` },
                  { id: "IN_STOCK", label: `In Stock (${partsKpis.inStock})` },
                  { id: "INSTALLED", label: `Installed (${partsKpis.installed})` }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setPartsExpiryFilter(tab.id)}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg shrink-0 transition-colors ${
                      partsExpiryFilter === tab.id
                        ? "bg-theme-btn-primary text-white shadow-2xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Inventory Table */}
            <AppCardContent className="p-0">
              <AppTableContainer className="rounded-none border-none">
                <AppTable className="w-full text-left text-xs">
                  <AppTableHeader className="bg-slate-50 dark:bg-slate-900/60 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    <AppTableRow>
                      <AppTableHead className="p-3.5">Part & Identity</AppTableHead>
                      <AppTableHead className="p-3.5">Procurement & Age</AppTableHead>
                      <AppTableHead className="p-3.5">DOM & Shelf Expiry</AppTableHead>
                      <AppTableHead className="p-3.5">OEM Warranty Status</AppTableHead>
                      <AppTableHead className="p-3.5">Renewal Policy & Due Date</AppTableHead>
                      <AppTableHead className="p-3.5">Assigned Vehicle / Stock</AppTableHead>
                      <AppTableHead className="p-3.5 text-right">Actions</AppTableHead>
                    </AppTableRow>
                  </AppTableHeader>
                  <AppTableBody className="divide-y divide-border/60">
                    {filteredParts.length === 0 ? (
                      <AppTableRow>
                        <AppTableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                          <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                          <p className="font-semibold text-sm text-foreground">No parts or accessories found</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {partsSearch || partsItemTypeFilter !== "ALL" || partsExpiryFilter !== "ALL"
                              ? "Try adjusting your search terms or filter selection."
                              : "Get started by registering spare parts, batteries, lubricants, or telematics accessories."}
                          </p>
                          <AppButton
                            variant="primary"
                            size="sm"
                            onClick={openCreatePartModal}
                            className="mt-3 bg-theme-btn-primary hover:bg-theme-btn-primary-secondary text-white text-xs font-semibold gap-1.5"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Add New Part</span>
                          </AppButton>
                        </AppTableCell>
                      </AppTableRow>
                    ) : (
                      filteredParts.map((part) => {
                        const totalCost = Number(part.purchase_amount) || (Number(part.unit_price || 0) * Number(part.quantity || 1));

                        // Render Warranty Countdown Badge
                        const renderWarrantyCountdown = () => {
                          const wDays = part.warranty_days_remaining;
                          if (wDays === null || wDays === undefined) {
                            return <span className="text-[11px] text-muted-foreground italic">No Warranty Set</span>;
                          }
                          if (wDays < 0) {
                            return (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/25 inline-flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                                <span>Expired {Math.abs(wDays)}d ago</span>
                              </span>
                            );
                          }
                          if (wDays === 0) {
                            return (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25 inline-flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                <span>Expires Today</span>
                              </span>
                            );
                          }
                          if (wDays <= 30) {
                            return (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25 inline-flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                <span>Expires in {wDays}d</span>
                              </span>
                            );
                          }
                          return (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 inline-flex items-center gap-1">
                              <ShieldCheck className="h-3 w-3" />
                              <span>{wDays}d remaining</span>
                            </span>
                          );
                        };

                        // Render Shelf-Life Expiry Countdown Badge
                        const renderShelfExpiryCountdown = () => {
                          const eDays = part.expiry_days_remaining;
                          if (!part.expiry_date) {
                            return <span className="text-[11px] text-muted-foreground">—</span>;
                          }
                          if (eDays === null || eDays === undefined) return null;

                          if (eDays < 0) {
                            return (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/25 inline-flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                                <span>Expired {Math.abs(eDays)}d ago</span>
                              </span>
                            );
                          }
                          if (eDays === 0) {
                            return (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25 inline-flex items-center gap-1">
                                <span>Expires Today</span>
                              </span>
                            );
                          }
                          if (eDays <= 30) {
                            return (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25 inline-flex items-center gap-1">
                                <span>Expires in {eDays}d</span>
                              </span>
                            );
                          }
                          return (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 inline-flex items-center gap-1">
                              <span>Expires in {eDays}d</span>
                            </span>
                          );
                        };

                        // Render Renewal Policy Badge
                        const renderRenewalPolicyBadge = () => {
                          if (!part.has_renewal_policy && !part.renewal_date) {
                            return <span className="text-[11px] text-muted-foreground">One-time / No Policy</span>;
                          }
                          const rDays = part.renewal_days_remaining;

                          return (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                                  {part.renewal_policy_type || "Recurring Renewal"}
                                </span>
                              </div>
                              <div className="text-xs font-mono font-bold text-foreground">
                                Due: {part.renewal_date || "—"}
                              </div>
                              {rDays !== null && rDays !== undefined && (
                                <div>
                                  {rDays < 0 ? (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/25 inline-flex items-center gap-1">
                                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                                      <span>Overdue {Math.abs(rDays)}d</span>
                                    </span>
                                  ) : rDays <= 30 ? (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25 inline-flex items-center gap-1">
                                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                      <span>Due in {rDays}d</span>
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 inline-flex items-center gap-1">
                                      <span>Due in {rDays}d</span>
                                    </span>
                                  )}
                                </div>
                              )}
                              {part.renewal_cost ? (
                                <div className="text-[10px] text-muted-foreground">
                                  ₹{Number(part.renewal_cost).toLocaleString("en-IN")}/cycle
                                </div>
                              ) : null}
                            </div>
                          );
                        };

                        return (
                          <AppTableRow 
                            key={part.id} 
                            onClick={() => setViewingPart(part)}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                          >
                            {/* Part & Identity */}
                            <AppTableCell className="p-3.5">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-foreground">{part.name}</span>
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                                    {part.brand}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                  <span className="font-mono">{part.category}</span>
                                  {part.part_number && (
                                    <>
                                      <span>•</span>
                                      <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                                        SKU: {part.part_number}
                                      </span>
                                    </>
                                  )}
                                </div>
                                {part.serial_number && (
                                  <div className="text-[10px] font-mono text-muted-foreground">
                                    S/N: {part.serial_number}
                                  </div>
                                )}
                              </div>
                            </AppTableCell>

                            {/* Procurement & Age */}
                            <AppTableCell className="p-3.5">
                              <div className="space-y-1">
                                <div className="font-mono text-xs font-semibold text-foreground">
                                  {part.purchase_date}
                                </div>
                                {part.days_since_purchase !== null && part.days_since_purchase !== undefined && (
                                  <div className="text-[10px] text-muted-foreground font-medium">
                                    Age: {part.days_since_purchase} days in fleet
                                  </div>
                                )}
                                <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                  ₹{totalCost.toLocaleString("en-IN")}
                                  {part.quantity > 1 && (
                                    <span className="text-[10px] text-muted-foreground font-normal ml-1">
                                      ({part.quantity} pcs @ ₹{Number(part.unit_price || 0).toLocaleString("en-IN")})
                                    </span>
                                  )}
                                </div>
                                {part.vendor_name && (
                                  <div className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                                    {part.vendor_name}
                                  </div>
                                )}
                              </div>
                            </AppTableCell>

                            {/* DOM & Shelf Expiry */}
                            <AppTableCell className="p-3.5">
                              <div className="space-y-1">
                                {part.manufacturing_date ? (
                                  <div className="text-[11px] text-muted-foreground">
                                    DOM: <span className="font-mono font-semibold text-foreground">{part.manufacturing_date}</span>
                                  </div>
                                ) : (
                                  <div className="text-[11px] text-muted-foreground italic">No DOM Logged</div>
                                )}
                                {part.expiry_date && (
                                  <div className="text-[11px] font-mono font-bold text-foreground">
                                    Exp: {part.expiry_date}
                                  </div>
                                )}
                                {renderShelfExpiryCountdown()}
                              </div>
                            </AppTableCell>

                            {/* Warranty Status */}
                            <AppTableCell className="p-3.5">
                              <div className="space-y-1.5">
                                <div className="text-xs font-medium text-foreground flex items-center gap-1">
                                  <span>{part.warranty_months ? `${part.warranty_months} Months` : "No Term"}</span>
                                  {part.warranty_type && (
                                    <span className="text-[10px] text-muted-foreground font-mono">({part.warranty_type})</span>
                                  )}
                                </div>
                                {part.warranty_expiry_date && (
                                  <div className="text-[11px] font-mono text-muted-foreground">
                                    Till: {part.warranty_expiry_date}
                                  </div>
                                )}
                                {renderWarrantyCountdown()}
                              </div>
                            </AppTableCell>

                            {/* Renewal Policy & Due Date */}
                            <AppTableCell className="p-3.5">
                              {renderRenewalPolicyBadge()}
                            </AppTableCell>

                            {/* Assigned Vehicle / Stock */}
                            <AppTableCell className="p-3.5">
                              {part.assigned_vehicle_reg || (part.vehicle_id && part.vehicle_id !== "UNASSIGNED_STOCK") ? (
                                <div className="space-y-1.5">
                                  <div>
                                    {renderHsrpPlate(
                                      part.assigned_vehicle_reg ||
                                      vehicleMap.get(part.vehicle_id)?.registration_number ||
                                      "ASSIGNED"
                                    )}
                                  </div>
                                  {part.installation_date && (
                                    <div className="text-[10px] text-muted-foreground">
                                      Mounted: <span className="font-mono font-semibold">{part.installation_date}</span>
                                    </div>
                                  )}
                                  {part.installed_odometer_km ? (
                                    <div className="text-[10px] font-mono text-muted-foreground">
                                      @ {part.installed_odometer_km.toLocaleString()} km
                                    </div>
                                  ) : null}
                                </div>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 inline-flex items-center gap-1">
                                  <Package className="h-3 w-3 text-slate-500" />
                                  <span>Warehouse Stock</span>
                                </span>
                              )}
                            </AppTableCell>

                            {/* Actions */}
                            <AppTableCell className="p-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {part.has_renewal_policy && (
                                  <AppButton
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openRenewPartModal(part);
                                    }}
                                    title="Quick Renew Policy"
                                    className="h-7 text-xs px-2 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 border-cyan-500/30"
                                  >
                                    <RotateCcw className="h-3 w-3 mr-1" />
                                    <span>Renew</span>
                                  </AppButton>
                                )}
                                <AppButton
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditPartModal(part);
                                  }}
                                  title="Edit Part Details"
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </AppButton>
                                <AppButton
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteTarget({ type: "part", id: part.id, label: `Part '${part.name}'` });
                                  }}
                                  title="Delete Part"
                                  className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </AppButton>
                              </div>
                            </AppTableCell>
                          </AppTableRow>
                        );
                      })
                    )}
                  </AppTableBody>
                </AppTable>
              </AppTableContainer>
            </AppCardContent>
          </AppCard>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* INSURANCE VENDORS MASTER TAB */}
      {activeTab === "vendors" && (
        <div className="space-y-6">
          <AppCard className="border-border shadow-xs overflow-hidden">
            {/* Filter Bar */}
            <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <AppInput
                  placeholder="Search by vendor name, code, contact person, phone, email, toll-free..."
                  value={vendorSearch}
                  onChange={(e) => setVendorSearch(e.target.value)}
                  className="pl-9 text-xs h-9"
                />
                {vendorSearch && (
                  <button
                    onClick={() => setVendorSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={vendorStatusFilter}
                  onChange={(e) => setVendorStatusFilter(e.target.value)}
                  className="h-9 text-xs px-3 rounded-lg border border-border bg-surface text-foreground focus:ring-2 focus:ring-theme-btn-primary outline-none"
                >
                  <option value="ALL">All Statuses ({insuranceVendors.length})</option>
                  <option value="ACTIVE">Active Only ({insuranceVendors.filter(v => v.is_active !== false).length})</option>
                  <option value="DISABLED">Disabled ({insuranceVendors.filter(v => v.is_active === false).length})</option>
                </select>
              </div>
            </div>

            {/* Vendors Table */}
            <AppCardContent className="p-0 overflow-x-auto">
              <AppTableContainer className="rounded-none border-none">
                <AppTable className="w-full text-left text-xs">
                  <AppTableHeader className="bg-slate-50 dark:bg-slate-900/60 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    <AppTableRow>
                      <AppTableHead className="p-3.5">Vendor / Underwriter</AppTableHead>
                      <AppTableHead className="p-3.5">Code</AppTableHead>
                      <AppTableHead className="p-3.5">Contact Person & Direct Details</AppTableHead>
                      <AppTableHead className="p-3.5">24x7 Toll-Free RSA Helpline</AppTableHead>
                      <AppTableHead className="p-3.5">Claim Portal / Website</AppTableHead>
                      <AppTableHead className="p-3.5 text-center">Insured Vehicles</AppTableHead>
                      <AppTableHead className="p-3.5 text-center">Status</AppTableHead>
                      <AppTableHead className="p-3.5 text-right">Actions</AppTableHead>
                    </AppTableRow>
                  </AppTableHeader>
                  <AppTableBody className="divide-y divide-border/60">
                    {insuranceVendors
                      .filter((v) => {
                        const q = vendorSearch.toLowerCase().trim();
                        const matchesSearch =
                          !q ||
                          (v.name && v.name.toLowerCase().includes(q)) ||
                          (v.code && v.code.toLowerCase().includes(q)) ||
                          (v.contact_person && v.contact_person.toLowerCase().includes(q)) ||
                          (v.contact_number && v.contact_number.toLowerCase().includes(q)) ||
                          (v.email && v.email.toLowerCase().includes(q)) ||
                          (v.support_toll_free && v.support_toll_free.toLowerCase().includes(q));

                        const matchesStatus =
                          vendorStatusFilter === "ALL" ||
                          (vendorStatusFilter === "ACTIVE" && v.is_active !== false) ||
                          (vendorStatusFilter === "DISABLED" && v.is_active === false);

                        return matchesSearch && matchesStatus;
                      })
                      .length === 0 ? (
                      <AppTableRow>
                        <AppTableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                          {vendorSearch || vendorStatusFilter !== "ALL" ? (
                            <div className="space-y-2">
                              <p className="font-semibold text-foreground">No matching insurance vendors found.</p>
                              <p className="text-xs text-muted-foreground">Try adjusting your search or status filter.</p>
                              <AppButton
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setVendorSearch("");
                                  setVendorStatusFilter("ALL");
                                }}
                                className="text-xs mt-2"
                              >
                                Clear Filters
                              </AppButton>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="font-semibold text-foreground">No insurance vendors registered yet.</p>
                              <p className="text-xs text-muted-foreground">Click "Add Insurance Vendor" above to register an underwriter.</p>
                              <AppButton
                                variant="primary"
                                size="sm"
                                onClick={openCreateVendorModal}
                                className="bg-theme-btn-primary hover:bg-theme-btn-primary-secondary text-white text-xs mt-2"
                              >
                                <Plus className="h-3.5 w-3.5 mr-1" />
                                <span>Add Insurance Vendor</span>
                              </AppButton>
                            </div>
                          )}
                        </AppTableCell>
                      </AppTableRow>
                    ) : (
                      insuranceVendors
                        .filter((v) => {
                          const q = vendorSearch.toLowerCase().trim();
                          const matchesSearch =
                            !q ||
                            (v.name && v.name.toLowerCase().includes(q)) ||
                            (v.code && v.code.toLowerCase().includes(q)) ||
                            (v.contact_person && v.contact_person.toLowerCase().includes(q)) ||
                            (v.contact_number && v.contact_number.toLowerCase().includes(q)) ||
                            (v.email && v.email.toLowerCase().includes(q)) ||
                            (v.support_toll_free && v.support_toll_free.toLowerCase().includes(q));

                          const matchesStatus =
                            vendorStatusFilter === "ALL" ||
                            (vendorStatusFilter === "ACTIVE" && v.is_active !== false) ||
                            (vendorStatusFilter === "DISABLED" && v.is_active === false);

                          return matchesSearch && matchesStatus;
                        })
                        .map((vendor) => {
                          const linkedVehiclesCount = vehicles.filter(
                            (v) => v.insurance_vendor_id === vendor.id || (v.insurance_vendor && v.insurance_vendor.toLowerCase() === vendor.name.toLowerCase())
                          ).length;

                          return (
                            <AppTableRow 
                              key={vendor.id} 
                              onClick={() => setViewingVendor(vendor)}
                              className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                            >
                              {/* Vendor / Underwriter */}
                              <AppTableCell className="p-3.5">
                                <div className="font-bold text-foreground text-sm flex items-center gap-1.5">
                                  <ShieldCheck className="h-4 w-4 text-blue-500 shrink-0" />
                                  <span>{vendor.name}</span>
                                </div>
                                {vendor.description && (
                                  <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1 max-w-[280px]">
                                    {vendor.description}
                                  </div>
                                )}
                              </AppTableCell>

                              {/* Code */}
                              <AppTableCell className="p-3.5">
                                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                                  {vendor.code}
                                </span>
                              </AppTableCell>

                              {/* Contact Person */}
                              <AppTableCell className="p-3.5">
                                <div className="space-y-0.5">
                                  <div className="font-semibold text-foreground">{vendor.contact_person || "—"}</div>
                                  {vendor.contact_number && (
                                    <div className="text-[11px] font-mono text-blue-600 dark:text-blue-400">
                                      <a 
                                        href={`tel:${vendor.contact_number}`} 
                                        onClick={(e) => e.stopPropagation()}
                                        className="hover:underline"
                                      >
                                        {vendor.contact_number}
                                      </a>
                                    </div>
                                  )}
                                  {vendor.email && (
                                    <div className="text-[10px] text-muted-foreground">
                                      <a 
                                        href={`mailto:${vendor.email}`} 
                                        onClick={(e) => e.stopPropagation()}
                                        className="hover:underline"
                                      >
                                        {vendor.email}
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </AppTableCell>

                              {/* 24x7 Toll-Free Support */}
                              <AppTableCell className="p-3.5">
                                {vendor.support_toll_free ? (
                                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-mono font-bold text-xs">
                                    <Phone className="h-3 w-3" />
                                    <span>{vendor.support_toll_free}</span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </AppTableCell>

                              {/* Official Website / Claim Portal */}
                              <AppTableCell className="p-3.5">
                                {vendor.website ? (
                                  <a
                                    href={vendor.website.startsWith("http") ? vendor.website : `https://${vendor.website}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-theme-btn-primary hover:underline font-mono text-[11px] inline-flex items-center gap-1"
                                  >
                                    <span>{vendor.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
                                    <span className="text-[10px]">↗</span>
                                  </a>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </AppTableCell>

                              {/* Covered Vehicles */}
                              <AppTableCell className="p-3.5 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold inline-block ${
                                  linkedVehiclesCount > 0
                                  ? "bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/25"
                                  : "bg-slate-100 dark:bg-slate-800 text-muted-foreground"
                                }`}>
                                  {linkedVehiclesCount} {linkedVehiclesCount === 1 ? "vehicle" : "vehicles"}
                                </span>
                              </AppTableCell>

                              {/* Status */}
                              <AppTableCell className="p-3.5 text-center">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase inline-block ${
                                  vendor.is_active !== false
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700"
                                }`}>
                                  {vendor.is_active !== false ? "Active" : "Disabled"}
                                </span>
                              </AppTableCell>

                              {/* Actions */}
                              <AppTableCell className="p-3.5 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <AppButton
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openEditVendorModal(vendor);
                                    }}
                                    className="h-7 px-2 text-xs gap-1 font-semibold hover:border-theme-btn-primary"
                                  >
                                    <Edit2 className="h-3 w-3" />
                                    <span>Edit</span>
                                  </AppButton>
                                  <AppButton
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteTarget({
                                        type: "vendor",
                                        id: vendor.id,
                                        label: `Insurance Vendor '${vendor.name}'`
                                      });
                                    }}
                                    className="h-7 px-2 text-xs gap-1 font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                    <span>Delete</span>
                                  </AppButton>
                                </div>
                              </AppTableCell>
                            </AppTableRow>
                          );
                        })
                    )}
                  </AppTableBody>
                </AppTable>
              </AppTableContainer>
            </AppCardContent>
          </AppCard>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* MY GARAGE / ASSIGNED VEHICLES TAB */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === "my-garage" && (
        <div className="space-y-6">
          <AppCard className="border-border shadow-xs">
            <AppCardHeader className="bg-surface/50 pb-4 border-b border-border/50 flex items-center justify-between">
              <div>
                <AppCardTitle className="text-lg flex items-center gap-2">
                  <LifeBuoy className="h-5 w-5 text-theme-btn-primary" />
                  <span>Assigned Vehicles & Corporate Pool</span>
                </AppCardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Vehicles configured for executive transit, site dispatch, and corporate movements
                </p>
              </div>
              <AppButton
                variant="primary"
                size="sm"
                onClick={() => setIsDispatchTripOpen(true)}
                className="bg-theme-btn-primary hover:bg-theme-btn-primary-secondary text-white text-xs h-9 font-semibold gap-1.5 shadow-xs"
              >
                <Calendar className="h-4 w-4" />
                <span>Book Movement</span>
              </AppButton>
            </AppCardHeader>
            <AppCardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {vehicles.slice(0, 6).map(veh => (
                  <div 
                    key={veh.id} 
                    onClick={() => setViewingVehicle(veh)}
                    className="p-4 rounded-xl border border-border/70 bg-surface space-y-3 shadow-2xs hover:border-theme-btn-primary/40 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100 inline-block px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 tracking-wider shadow-2xs">
                          {veh.registration_number}
                        </div>
                        <h4 className="text-sm font-bold text-foreground mt-1.5">{veh.make} {veh.model}</h4>
                        <p className="text-xs text-muted-foreground">{veh.category} • {veh.fuel_type}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        veh.status === "IN_STOCK"
                          ? "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                          : veh.status === "IN_SERVICE"
                          ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                      }`}>
                        {veh.status === "IN_STOCK" ? "Ready" : veh.status === "IN_SERVICE" ? "Active Route" : veh.status}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-border/50 text-xs space-y-1 text-muted-foreground">
                      <div className="flex items-center justify-between">
                        <span>Chauffeur:</span>
                        <strong className="text-foreground">{veh.assignedDriver?.full_name || "Pool Chauffeur"}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Odometer:</span>
                        <span className="font-mono text-foreground font-semibold">{veh.odometer_km.toLocaleString()} km</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-border/40 flex items-center justify-end gap-1.5">
                      {canEditVehicle && (
                        <AppButton
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditVehicleModal(veh);
                          }}
                          className="h-6 px-2 text-[11px] gap-1 hover:border-theme-btn-primary hover:text-theme-btn-primary"
                        >
                          <Edit2 className="h-3 w-3" />
                          <span>Edit</span>
                        </AppButton>
                      )}
                      {canDeleteVehicle && (
                        <AppButton
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget({
                              type: "vehicle",
                              id: veh.id,
                              label: `Vehicle ${veh.registration_number} (${veh.make} ${veh.model})`
                            });
                          }}
                          className="h-6 px-2 text-[11px] gap-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Delete</span>
                        </AppButton>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </AppCardContent>
          </AppCard>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* LEARNING / FLEET SOPS TAB */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === "learning" && (
        <div className="space-y-6">
          <AppCard className="border-border shadow-xs">
            <AppCardHeader className="bg-surface/50 pb-4 border-b border-border/50">
              <AppCardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-indigo-500" />
                <span>Chandak Fleet Guidelines & Standard Operating Procedures (SOPs)</span>
              </AppCardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Official operational policies for corporate chauffeurs, transit managers, and passengers
              </p>
            </AppCardHeader>
            <AppCardContent className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="p-4 rounded-xl border border-border/70 bg-card shadow-2xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-foreground text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>1. Chauffeur Code of Conduct & Punctuality</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    All enterprise drivers must report in corporate uniform 15 minutes prior to scheduled departure. Chauffeurs must maintain a zero-tolerance policy towards mobile usage while operating vehicles.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-border/70 bg-card shadow-2xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-foreground text-sm">
                    <Gauge className="h-4 w-4 text-blue-500" />
                    <span>2. Speed Caps & Highway Safety Regulations</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Strict adherence to speed limits: City transit capped at 50 km/h; Arterial highways capped at 80 km/h; Expressways capped at 100 km/h. High-speed alerts are audited weekly.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-border/70 bg-card shadow-2xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-foreground text-sm">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span>3. Breakdown & Accident Emergency Protocol</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    In case of roadside breakdown, immediately position hazard cones 15 meters behind the vehicle, activate hazard flashers, ensure passenger safety, and dial the 24x7 Fleet RSA Helpdesk.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-border/70 bg-card shadow-2xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-foreground text-sm">
                    <Fuel className="h-4 w-4 text-purple-500" />
                    <span>4. Fuel Card Billing & Logbook Submissions</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    All fuel refills must be processed through designated corporate IndianOil / BPCL fleet smart cards. Odometer readings before and after refill must be logged in Daily Trip Sheets.
                  </p>
                </div>
              </div>
            </AppCardContent>
          </AppCard>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* SETTINGS TAB */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === "settings" && (
        <div className="space-y-6">
          <AppCard className="border-border shadow-xs">
            <AppCardHeader className="bg-surface/50 pb-4 border-b border-border/50">
              <AppCardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-5 w-5 text-muted-foreground" />
                <span>Fleet Management System Configuration</span>
              </AppCardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                RTO Gov gateway, statutory threshold windows, and periodic maintenance automation
              </p>
            </AppCardHeader>
            <AppCardContent className="p-5 space-y-5">
              <div className="p-4 rounded-xl border border-border/70 bg-card shadow-2xs flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-foreground">Government Parivahan / RTO RC API Gateway</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Real-time Surepass verification for Indian registration plates</p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  Online & Active
                </span>
              </div>

              <div className="p-4 rounded-xl border border-border/70 bg-card shadow-2xs flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-foreground">Statutory Expiry Warning Window</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Proactive alerts for Insurance, PUC and Driving License expirations</p>
                </div>
                <span className="font-mono text-xs font-bold text-foreground bg-surface px-3 py-1 rounded border border-border">
                  30 Days Prior
                </span>
              </div>

              <div className="p-4 rounded-xl border border-border/70 bg-card shadow-2xs flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-foreground">Periodic Maintenance Trigger</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Automated workshop service interval based on odometer thresholds</p>
                </div>
                <span className="font-mono text-xs font-bold text-foreground bg-surface px-3 py-1 rounded border border-border">
                  Every 10,000 km
                </span>
              </div>
            </AppCardContent>
          </AppCard>

          {/* Insurance Vendors Master Table Card */}
          <AppCard className="border-border shadow-xs overflow-hidden">
            <AppCardHeader className="bg-surface/50 pb-4 border-b border-border/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <AppCardTitle className="text-lg flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-blue-500" />
                  <span>Fleet Insurance Vendors Master</span>
                </AppCardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Authorized motor insurance companies, underwriters, and toll-free emergency contacts
                </p>
              </div>

              <AppButton
                type="button"
                variant="primary"
                size="sm"
                onClick={openCreateVendorModal}
                className="bg-theme-btn-primary hover:bg-theme-btn-primary-secondary text-white text-xs h-8 font-semibold gap-1.5 shadow-xs shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Insurance Vendor</span>
              </AppButton>
            </AppCardHeader>

            <AppCardContent className="p-0 overflow-x-auto">
              <AppTableContainer className="rounded-none border-none">
                <AppTable className="w-full text-left text-xs">
                  <AppTableHeader className="bg-slate-50 dark:bg-slate-900/60 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    <AppTableRow>
                      <AppTableHead className="p-3.5">Vendor / Underwriter</AppTableHead>
                      <AppTableHead className="p-3.5">Code</AppTableHead>
                      <AppTableHead className="p-3.5">Contact Person & Phone</AppTableHead>
                      <AppTableHead className="p-3.5">24x7 Toll-Free Support</AppTableHead>
                      <AppTableHead className="p-3.5">Official Website</AppTableHead>
                      <AppTableHead className="p-3.5 text-center">Status</AppTableHead>
                      <AppTableHead className="p-3.5 text-right">Actions</AppTableHead>
                    </AppTableRow>
                  </AppTableHeader>
                  <AppTableBody className="divide-y divide-border/60">
                    {insuranceVendors.length === 0 ? (
                      <AppTableRow>
                        <AppTableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                          No insurance vendors configured yet. Click <strong>Add Insurance Vendor</strong> to create one.
                        </AppTableCell>
                      </AppTableRow>
                    ) : (
                      insuranceVendors.map((vendor) => (
                        <AppTableRow key={vendor.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <AppTableCell className="p-3.5 font-bold text-foreground">
                            <div>{vendor.name}</div>
                            {vendor.description && (
                              <div className="text-[10px] text-muted-foreground font-normal line-clamp-1">{vendor.description}</div>
                            )}
                          </AppTableCell>
                          <AppTableCell className="p-3.5 font-mono text-xs text-muted-foreground font-semibold">
                            {vendor.code}
                          </AppTableCell>
                          <AppTableCell className="p-3.5">
                            <div className="font-semibold text-foreground">{vendor.contact_person || "—"}</div>
                            {vendor.contact_number && (
                              <div className="text-[11px] font-mono text-blue-600 dark:text-blue-400 mt-0.5">{vendor.contact_number}</div>
                            )}
                            {vendor.email && (
                              <div className="text-[10px] text-muted-foreground">{vendor.email}</div>
                            )}
                          </AppTableCell>
                          <AppTableCell className="p-3.5 font-mono text-xs text-foreground font-semibold">
                            {vendor.support_toll_free || "—"}
                          </AppTableCell>
                          <AppTableCell className="p-3.5">
                            {vendor.website ? (
                              <a
                                href={vendor.website.startsWith("http") ? vendor.website : `https://${vendor.website}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-theme-btn-primary hover:underline font-mono text-[11px]"
                              >
                                {vendor.website.replace(/^https?:\/\//, "")}
                              </a>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </AppTableCell>
                          <AppTableCell className="p-3.5 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase inline-block ${
                              vendor.is_active !== false
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700"
                            }`}>
                              {vendor.is_active !== false ? "Active" : "Disabled"}
                            </span>
                          </AppTableCell>
                          <AppTableCell className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <AppButton
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => openEditVendorModal(vendor)}
                                className="h-7 px-2 text-xs gap-1 font-semibold hover:border-theme-btn-primary"
                              >
                                <Edit2 className="h-3 w-3" />
                                <span>Edit</span>
                              </AppButton>
                              <AppButton
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setDeleteTarget({
                                  type: "vendor",
                                  id: vendor.id,
                                  label: `Insurance Vendor '${vendor.name}'`
                                })}
                                className="h-7 px-2 text-xs gap-1 font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900"
                              >
                                <Trash2 className="h-3 w-3" />
                                <span>Delete</span>
                              </AppButton>
                            </div>
                          </AppTableCell>
                        </AppTableRow>
                      ))
                    )}
                  </AppTableBody>
                </AppTable>
              </AppTableContainer>
            </AppCardContent>
          </AppCard>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* EDIT VEHICLE MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {isEditVehicleOpen && selectedVehicleForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-border w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-border bg-surface/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/25">
                  <Edit2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Edit Fleet Vehicle Specifications</h3>
                  <p className="text-xs text-muted-foreground">Update official RTO RC records, compliance dates, or driver assignment</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <AppButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenVehicleSpecHistoryModal(selectedVehicleForEdit)}
                  className="h-8 px-2.5 text-xs gap-1.5 font-semibold text-purple-600 dark:text-purple-400 border-purple-500/30 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950/30 shadow-2xs"
                  title="View specification change history and audit trail"
                >
                  <ClipboardCheck className="h-3.5 w-3.5" />
                  <span>Revision History</span>
                </AppButton>
                <AppButton variant="ghost" size="icon-sm" onClick={() => setIsEditVehicleOpen(false)}>
                  <X className="h-4 w-4" />
                </AppButton>
              </div>
            </div>

            <form onSubmit={handleUpdateVehicle} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* SECTION 1: REGISTRATION & VEHICLE SPECS */}
              <div className="rounded-xl border border-border bg-slate-50/70 dark:bg-slate-900/50 p-4 space-y-3.5">
                <div className="flex items-center gap-2 pb-2 border-b border-border/60 text-foreground font-semibold text-xs">
                  <Car className="h-4 w-4 text-blue-500" />
                  <span>1. Vehicle Identity & Powertrain</span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-foreground flex items-center gap-1">
                      <span>Registration Plate *</span>
                      <span className="text-[10px] font-normal text-muted-foreground">(e.g. MH-02-FE-4281)</span>
                    </label>
                    <span className="text-[10px] text-theme-btn-primary font-medium flex items-center gap-1">
                      <Zap className="h-3 w-3 text-amber-500 fill-amber-500" />
                      Auto-fetch available
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <AppInput 
                      value={editVehiclePlate} 
                      onChange={(e) => {
                        setEditVehiclePlate(e.target.value.toUpperCase());
                        if (editPortalLookupMsg) setEditPortalLookupMsg(null);
                      }} 
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleEditPortalAutoFetch();
                        }
                      }}
                      required
                      className="font-mono font-bold uppercase tracking-wider text-xs flex-1"
                    />
                    <AppButton
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={fetchingEditPortal || !editVehiclePlate.trim()}
                      onClick={() => handleEditPortalAutoFetch()}
                      className="shrink-0 h-9 px-3.5 gap-1.5 text-xs font-semibold border border-border hover:border-theme-btn-primary/40 text-foreground bg-surface shadow-xs"
                      title="Re-fetch vehicle specifications from RTO Government portal"
                    >
                      {fetchingEditPortal ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin text-theme-btn-primary" />
                          <span>Fetching...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                          <span>Re-fetch Portal</span>
                        </>
                      )}
                    </AppButton>
                  </div>

                  {/* Instant Real-Time RTO District Detection Badge */}
                  {editPlateInfo.isRecognized && (
                    <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-[11px] animate-in fade-in duration-150">
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span className="font-semibold">{editPlateInfo.rtoName}</span>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-800 dark:text-blue-200 shrink-0">
                        {editPlateInfo.stateName}
                      </span>
                    </div>
                  )}

                  {/* Edit Portal Lookup Feedback Banner */}
                  {editPortalLookupMsg && (
                    <div className={`p-2.5 rounded-lg border text-[11px] leading-relaxed flex items-start gap-2 animate-in fade-in duration-150 ${
                      editPortalLookupMsg.type === "success"
                        ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-300"
                        : editPortalLookupMsg.type === "info"
                        ? "bg-blue-500/10 border-blue-500/25 text-blue-700 dark:text-blue-300"
                        : "bg-rose-500/10 border-rose-500/25 text-rose-700 dark:text-rose-300"
                    }`}>
                      {editPortalLookupMsg.type === "success" ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                      ) : editPortalLookupMsg.type === "info" ? (
                        <Sparkles className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold flex items-center justify-between gap-2 flex-wrap">
                          <span>{editPortalLookupMsg.message}</span>
                          {editPortalLookupMsg.source && (
                            <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase rounded ${
                              editPortalLookupMsg.type === "success"
                                ? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-200"
                                : "bg-blue-500/20 text-blue-800 dark:text-blue-200"
                            }`}>
                              {editPortalLookupMsg.source}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold block">Make (Brand)</label>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Sparkles className="h-2.5 w-2.5 text-amber-500" />
                        Quick-pick
                      </span>
                    </div>
                    <AppInput 
                      value={editVehicleMake} 
                      onChange={(e) => setEditVehicleMake(e.target.value)} 
                      list="fleet-popular-makes-edit"
                    />
                    <datalist id="fleet-popular-makes-edit">
                      {Object.keys(POPULAR_BRANDS).map((b) => (
                        <option key={b} value={b} />
                      ))}
                    </datalist>

                    {/* Brand Quick-Pick Chips */}
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {TOP_BRAND_NAMES.map((brand) => {
                        const isSelected = editVehicleMake.trim().toLowerCase() === brand.toLowerCase();
                        return (
                          <AppButton
                            key={brand}
                            type="button"
                            variant={isSelected ? "primary" : "outline"}
                            size="sm"
                            onClick={() => {
                              setEditVehicleMake(brand);
                              const cfg = POPULAR_BRANDS[brand];
                              if (cfg) {
                                setNewVehicleCategory(cfg.category);
                                if (cfg.models.length > 0 && (!editVehicleModel || !cfg.models.includes(editVehicleModel))) {
                                  setEditVehicleModel(cfg.models[0]);
                                }
                              }
                            }}
                            className={`h-6 px-1.5 text-[10px] font-medium ${
                              isSelected
                                ? "bg-theme-btn-primary text-white border-theme-btn-primary shadow-xs font-semibold"
                                : "border-border text-foreground hover:border-theme-btn-primary/40 bg-surface"
                            }`}
                          >
                            <span>{brand}</span>
                          </AppButton>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold block">Model</label>
                      <span className="text-[10px] text-muted-foreground">Popular models</span>
                    </div>
                    <AppInput 
                      value={editVehicleModel} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditVehicleModel(val);
                        if (/\b(ev|electric)\b/i.test(val) || /ioniq|recharge/i.test(val)) {
                          setEditVehicleFuel("Electric");
                          setEditVehiclePucExpiry("");
                        }
                      }} 
                      list="fleet-popular-models-edit"
                    />
                    <datalist id="fleet-popular-models-edit">
                      {(POPULAR_BRANDS[editVehicleMake]?.models || []).map((m) => (
                        <option key={m} value={m} />
                      ))}
                    </datalist>

                    {/* Model Quick-Pick Chips */}
                    {POPULAR_BRANDS[editVehicleMake]?.models && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {POPULAR_BRANDS[editVehicleMake].models.slice(0, 6).map((m) => {
                          const isSelected = editVehicleModel.trim().toLowerCase() === m.toLowerCase();
                          return (
                            <AppButton
                              key={m}
                              type="button"
                              variant={isSelected ? "primary" : "outline"}
                              size="sm"
                              onClick={() => {
                                setEditVehicleModel(m);
                                const cfg = POPULAR_BRANDS[editVehicleMake];
                                if (cfg?.category) setEditVehicleCategory(cfg.category);
                                if (/\b(ev|electric)\b/i.test(m) || /ioniq|recharge/i.test(m)) {
                                  setEditVehicleFuel("Electric");
                                  setEditVehiclePucExpiry("");
                                }
                              }}
                              className={`h-6 px-1.5 text-[10px] font-medium ${
                                isSelected
                                  ? "bg-theme-btn-primary text-white border-theme-btn-primary shadow-xs font-semibold"
                                  : "border-border text-foreground hover:border-theme-btn-primary/40 bg-surface"
                              }`}
                            >
                              <span>{m}</span>
                            </AppButton>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1">Variant / Trim</label>
                    <AppInput 
                      value={editVehicleVariant} 
                      onChange={(e) => setEditVehicleVariant(e.target.value)} 
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1 flex items-center gap-1">
                      <Fuel className="h-3.5 w-3.5 text-amber-500" />
                      <span>Fuel Type</span>
                    </label>
                    <select 
                      value={editVehicleFuel}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditVehicleFuel(val);
                        if (isElectricFuel(val)) setEditVehiclePucExpiry("");
                      }}
                      className="w-full h-9 rounded-lg border border-border bg-surface px-3 text-xs"
                    >
                      <option value="Petrol">Petrol</option>
                      <option value="Diesel">Diesel</option>
                      <option value="Petrol Hybrid">Petrol Hybrid</option>
                      <option value="Electric">Electric (EV)</option>
                      <option value="CNG">CNG</option>
                      <option value="LPG">LPG</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1">Category</label>
                    <select 
                      value={editVehicleCategory}
                      onChange={(e) => setEditVehicleCategory(e.target.value)}
                      className="w-full h-9 rounded-lg border border-border bg-surface px-3 text-xs"
                    >
                      <option value="CAR">Car / SUV / Sedan</option>
                      <option value="BIKE">Motorbike / Scooter</option>
                      <option value="COMMERCIAL">Commercial Van / Shuttle</option>
                      <option value="BUS">Staff Bus / Coach</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold block mb-1 flex items-center gap-1">
                      <Palette className="h-3.5 w-3.5 text-purple-500" />
                      <span>Paint Color</span>
                    </label>
                    <div className="flex gap-2 items-center">
                      <input 
                        type="color" 
                        value={editVehicleColor.startsWith("#") ? editVehicleColor : "#1e293b"}
                        onChange={(e) => setEditVehicleColor(e.target.value)}
                        className="h-9 w-10 rounded border border-border cursor-pointer p-0.5 bg-surface"
                      />
                      <AppInput 
                        value={editVehicleColor} 
                        onChange={(e) => setEditVehicleColor(e.target.value)} 
                        className="flex-1"
                      />
                    </div>
                    {/* Model-Aware OEM Paint Color Quick-Picks */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {(() => {
                        const modelUpper = `${editVehicleMake} ${editVehicleModel}`.toUpperCase();
                        const isRaider = modelUpper.includes("RAIDER");
                        const isShine = modelUpper.includes("SHINE");
                        const isActiva = modelUpper.includes("ACTIVA");

                        const swatches = isRaider
                          ? [
                              { name: "Wicked Black", hex: "#0f172a" },
                              { name: "Fiery Yellow", hex: "#eab308" },
                              { name: "Striking Red", hex: "#dc2626" },
                              { name: "Blazing Blue", hex: "#2563eb" },
                              { name: "Forza Blue", hex: "#1d4ed8" }
                            ]
                          : isShine || isActiva
                          ? [
                              { name: "Geny Grey Metallic", hex: "#475569" },
                              { name: "Black", hex: "#0f172a" },
                              { name: "Rebel Red Metallic", hex: "#991b1b" },
                              { name: "Athletic Blue", hex: "#1e40af" }
                            ]
                          : [
                              { name: "Pearl White", hex: "#f8fafc" },
                              { name: "Attitude Black", hex: "#0f172a" },
                              { name: "Silver / Grey", hex: "#64748b" },
                              { name: "Royal Blue", hex: "#2563eb" },
                              { name: "Crimson Red", hex: "#dc2626" }
                            ];

                        return swatches.map((s) => (
                          <AppButton
                            key={s.name}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setEditVehicleColor(s.name)}
                            className={`h-6 px-2 rounded-full text-[10px] font-medium gap-1 ${
                              editVehicleColor === s.name || editVehicleColor === s.hex
                                ? "border-theme-btn-primary bg-theme-btn-primary/10 text-theme-btn-primary font-bold shadow-2xs"
                                : "border-border/70 bg-surface/70 text-muted-foreground hover:bg-surface hover:text-foreground"
                            }`}
                          >
                            <span
                              className="w-2 h-2 rounded-full border border-black/20 shrink-0 inline-block"
                              style={{ backgroundColor: s.hex }}
                            />
                            <span>{s.name}</span>
                          </AppButton>
                        ));
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: CHASSIS, ENGINE & LEGAL OWNERSHIP */}
              <div className="rounded-xl border border-border bg-slate-50/70 dark:bg-slate-900/50 p-4 space-y-3.5">
                <div className="flex items-center gap-2 pb-2 border-b border-border/60 text-foreground font-semibold text-xs">
                  <Building2 className="h-4 w-4 text-blue-500" />
                  <span>2. Identification & Legal Ownership</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1">Registered Owner / Corporate Entity *</label>
                    <AppInput 
                      value={editVehicleOwner} 
                      onChange={(e) => setEditVehicleOwner(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1 flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-blue-500" />
                      <span>RTO RMN (Registered Mobile Number) *</span>
                    </label>
                    <AppInput 
                      value={editVehicleRtoRmn} 
                      onChange={(e) => setEditVehicleRtoRmn(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1 flex items-center gap-1">
                      <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Chassis Number (VIN) *</span>
                    </label>
                    <AppInput 
                      value={editVehicleVin} 
                      onChange={(e) => setEditVehicleVin(e.target.value.toUpperCase())} 
                      className="font-mono uppercase text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1 flex items-center gap-1">
                      <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Engine Number *</span>
                    </label>
                    <AppInput 
                      value={editVehicleEngine} 
                      onChange={(e) => setEditVehicleEngine(e.target.value.toUpperCase())} 
                      className="font-mono uppercase text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-blue-500" />
                      <span>RTO Office / Passing Jurisdiction</span>
                    </label>
                    <AppInput 
                      value={editVehicleRtoOffice} 
                      onChange={(e) => setEditVehicleRtoOffice(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1 flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Registration Date *</span>
                    </label>
                    <AppInput 
                      type="date"
                      value={editVehicleRegDate} 
                      onChange={(e) => setEditVehicleRegDate(e.target.value)} 
                      required
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: STATUTORY COMPLIANCE & VALIDITY */}
              <div className="rounded-xl border border-border bg-slate-50/70 dark:bg-slate-900/50 p-4 space-y-3.5">
                <div className="flex items-center gap-2 pb-2 border-b border-border/60 text-foreground font-semibold text-xs">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <span>3. Statutory Compliance, Insurance & Validity</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold flex items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
                        <span>Insurance Vendor</span>
                      </label>
                      <AppButton
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={openCreateVendorModal}
                        className="p-0 h-auto text-[10px] font-semibold text-theme-btn-primary hover:underline flex items-center gap-0.5"
                      >
                        <Plus className="h-2.5 w-2.5" />
                        <span>New</span>
                      </AppButton>
                    </div>
                    <select
                      value={editVehicleInsuranceVendorId}
                      onChange={(e) => {
                        const selId = e.target.value;
                        setEditVehicleInsuranceVendorId(selId);
                        const sel = insuranceVendors.find(v => v.id === selId);
                        setEditVehicleInsuranceVendor(sel ? sel.name : "");
                      }}
                      className="w-full text-xs p-2 rounded-lg border border-border bg-surface text-foreground focus:ring-2 focus:ring-theme-btn-primary outline-none cursor-pointer"
                    >
                      <option value="">— Select Vendor —</option>
                      {insuranceVendors.map((vendor) => (
                        <option key={vendor.id} value={vendor.id}>
                          {vendor.name} ({vendor.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold block mb-1 flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Insurance Policy Number</span>
                    </label>
                    <AppInput 
                      value={editVehicleInsurancePolicy} 
                      onChange={(e) => setEditVehicleInsurancePolicy(e.target.value)}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold flex items-center gap-1">
                        <Shield className="h-3.5 w-3.5 text-emerald-500" />
                        <span>Insurance Expiry Date *</span>
                      </label>
                      {editVehicleInsuranceExpiry && (
                        <div>{renderExpiryBadge(calculateDaysRemaining(editVehicleInsuranceExpiry))}</div>
                      )}
                    </div>
                    <AppInput 
                      type="date"
                      value={editVehicleInsuranceExpiry} 
                      onChange={(e) => setEditVehicleInsuranceExpiry(e.target.value)} 
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    {isElectricFuel(editVehicleFuel) ? (
                      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 flex items-start gap-2.5">
                        <Zap className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                            <span>PUC Not Required</span>
                            <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 font-mono">CMVR Exempt</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Zero-emission electric vehicle — legally exempt from PUC under CMVR.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-1">
                          <label className="font-semibold">PUC (Pollution) Expiry Date *</label>
                          {editVehiclePucExpiry && (
                            <div>{renderExpiryBadge(calculateDaysRemaining(editVehiclePucExpiry))}</div>
                          )}
                        </div>
                        <AppInput 
                          type="date"
                          value={editVehiclePucExpiry} 
                          onChange={(e) => setEditVehiclePucExpiry(e.target.value)} 
                          required
                        />
                      </>
                    )}
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Fitness Certificate Expiry Date</label>
                    <AppInput 
                      type="date"
                      value={editVehicleFitnessExpiry} 
                      onChange={(e) => setEditVehicleFitnessExpiry(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border bg-surface cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <input 
                      type="checkbox"
                      checked={editVehicleHsrp}
                      onChange={(e) => setEditVehicleHsrp(e.target.checked)}
                      className="rounded border-border text-theme-btn-primary focus:ring-theme-btn-primary h-4 w-4"
                    />
                    <div className="text-xs">
                      <div className="font-semibold text-foreground">HSRP Number Plate Fitted</div>
                      <div className="text-[10px] text-muted-foreground">High Security Plate with laser hologram</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border bg-surface cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <input 
                      type="checkbox"
                      checked={editVehicleRsa}
                      onChange={(e) => setEditVehicleRsa(e.target.checked)}
                      className="rounded border-border text-theme-btn-primary focus:ring-theme-btn-primary h-4 w-4"
                    />
                    <div className="text-xs">
                      <div className="font-semibold text-foreground">24x7 Roadside Assistance (RSA)</div>
                      <div className="text-[10px] text-muted-foreground">Emergency highway towing & breakdown cover</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* SECTION 4: FLEET OPERATIONS & DRIVER */}
              <div className="rounded-xl border border-border bg-slate-50/70 dark:bg-slate-900/50 p-4 space-y-3.5">
                <div className="flex items-center gap-2 pb-2 border-b border-border/60 text-foreground font-semibold text-xs">
                  <Gauge className="h-4 w-4 text-amber-500" />
                  <span>4. Fleet Operations & Driver Assignment</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1">Fleet Operational Status</label>
                    <select 
                      value={editVehicleStatus}
                      onChange={(e) => setEditVehicleStatus(e.target.value)}
                      className="w-full h-9 rounded-lg border border-border bg-surface px-3 text-xs font-semibold"
                    >
                      <option value="IN_STOCK">Available (In Stock)</option>
                      <option value="IN_SERVICE">On Route / In Service</option>
                      <option value="MAINTENANCE">In Workshop / Maintenance</option>
                      <option value="RESERVED">Reserved</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold block mb-1 flex items-center gap-1">
                      <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Current Odometer (km)</span>
                    </label>
                    <AppInput 
                      type="number" 
                      value={editVehicleOdometer} 
                      onChange={(e) => setEditVehicleOdometer(Number(e.target.value))} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1">Fleet Nickname / Tag</label>
                    <AppInput 
                      value={editVehicleNickname} 
                      onChange={(e) => setEditVehicleNickname(e.target.value)} 
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Assigned Driver</label>
                    <select 
                      value={editVehicleDriverId}
                      onChange={(e) => setEditVehicleDriverId(e.target.value)}
                      className="w-full h-9 rounded-lg border border-border bg-surface px-3 text-xs"
                    >
                      <option value="">-- No Driver Assigned --</option>
                      {drivers.map(d => (
                        <option key={d.id} value={d.id}>{d.full_name} ({d.phone})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border flex items-center justify-between gap-2">
                {canDeleteVehicle ? (
                  <AppButton
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const target = selectedVehicleForEdit;
                      setIsEditVehicleOpen(false);
                      if (target) {
                        setDeleteTarget({
                          type: "vehicle",
                          id: target.id,
                          label: `Vehicle ${target.registration_number} (${target.make} ${target.model})`
                        });
                      }
                    }}
                    className="text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900 gap-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Vehicle</span>
                  </AppButton>
                ) : <div />}
                <div className="flex items-center gap-2">
                  <AppButton type="button" variant="ghost" onClick={() => setIsEditVehicleOpen(false)}>
                    Cancel
                  </AppButton>
                  {canEditVehicle && (
                    <AppButton 
                      type="submit" 
                      disabled={modalSubmitting}
                      className="bg-theme-btn-primary hover:bg-theme-btn-primary-secondary text-white font-semibold gap-1.5"
                    >
                      {modalSubmitting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      <span>Update Vehicle</span>
                    </AppButton>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* ADD DRIVER MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {isAddDriverOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-border w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-border bg-surface/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/25">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Add Driver</h3>
                  <p className="text-xs text-muted-foreground">Enroll a driver into the company fleet roster</p>
                </div>
              </div>
              <AppButton variant="ghost" size="icon-sm" onClick={() => setIsAddDriverOpen(false)}>
                <X className="h-4 w-4" />
              </AppButton>
            </div>

            <form onSubmit={handleCreateDriver} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Full Name *</label>
                  <AppInput 
                    value={newDriverName} 
                    onChange={(e) => setNewDriverName(e.target.value)} 
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Phone Number *</label>
                  <AppInput 
                    value={newDriverPhone} 
                    onChange={(e) => setNewDriverPhone(e.target.value)} 
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Driving License Number *</label>
                  <AppInput 
                    value={newDriverLicense} 
                    onChange={(e) => setNewDriverLicense(e.target.value)} 
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">License Expiry Date</label>
                  <AppInput 
                    type="date"
                    value={newDriverLicenseExpiry} 
                    onChange={(e) => setNewDriverLicenseExpiry(e.target.value)} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Driving Experience (Years)</label>
                  <AppInput 
                    type="number" 
                    value={newDriverExperience} 
                    onChange={(e) => setNewDriverExperience(Number(e.target.value))} 
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Emergency Contact</label>
                  <AppInput 
                    value={newDriverEmergency} 
                    onChange={(e) => setNewDriverEmergency(e.target.value)} 
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Assign Primary Vehicle (Optional)</label>
                <select 
                  value={newDriverVehicleId}
                  onChange={(e) => setNewDriverVehicleId(e.target.value)}
                  className="w-full h-9 rounded-lg border border-border bg-surface px-3 text-xs"
                >
                  <option value="">-- No Assigned Vehicle (Pool Driver) --</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.registration_number} - {v.make} {v.model}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-border flex items-center justify-end gap-2">
                <AppButton type="button" variant="ghost" onClick={() => setIsAddDriverOpen(false)}>
                  Cancel
                </AppButton>
                <AppButton 
                  type="submit" 
                  disabled={modalSubmitting}
                  className="bg-theme-btn-primary hover:bg-theme-btn-primary-secondary text-white font-semibold gap-1.5"
                >
                  {modalSubmitting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  <span>Save Driver</span>
                </AppButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* EDIT DRIVER MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {isEditDriverOpen && selectedDriverForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-border w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-border bg-surface/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/25">
                  <Edit2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Edit Driver</h3>
                  <p className="text-xs text-muted-foreground">Update driver contact, license details or vehicle link</p>
                </div>
              </div>
              <AppButton variant="ghost" size="icon-sm" onClick={() => setIsEditDriverOpen(false)}>
                <X className="h-4 w-4" />
              </AppButton>
            </div>

            <form onSubmit={handleUpdateDriver} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Full Name *</label>
                  <AppInput 
                    value={editDriverName} 
                    onChange={(e) => setEditDriverName(e.target.value)} 
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Phone Number *</label>
                  <AppInput 
                    value={editDriverPhone} 
                    onChange={(e) => setEditDriverPhone(e.target.value)} 
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Driving License Number *</label>
                  <AppInput 
                    value={editDriverLicense} 
                    onChange={(e) => setEditDriverLicense(e.target.value)} 
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">License Expiry Date</label>
                  <AppInput 
                    type="date"
                    value={editDriverLicenseExpiry} 
                    onChange={(e) => setEditDriverLicenseExpiry(e.target.value)} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Experience (Years)</label>
                  <AppInput 
                    type="number"
                    value={editDriverExperience} 
                    onChange={(e) => setEditDriverExperience(Number(e.target.value))} 
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Emergency Contact</label>
                  <AppInput 
                    value={editDriverEmergency} 
                    onChange={(e) => setEditDriverEmergency(e.target.value)} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Assigned Vehicle</label>
                  <select 
                    value={editDriverVehicleId}
                    onChange={(e) => setEditDriverVehicleId(e.target.value)}
                    className="w-full h-9 rounded-lg border border-border bg-surface px-3 text-xs"
                  >
                    <option value="">-- No Vehicle Assigned --</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.registration_number} - {v.make} {v.model}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Active Status</label>
                  <select 
                    value={editDriverActive ? "ACTIVE" : "INACTIVE"}
                    onChange={(e) => setEditDriverActive(e.target.value === "ACTIVE")}
                    className="w-full h-9 rounded-lg border border-border bg-surface px-3 text-xs font-semibold"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive / On Leave</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-border flex items-center justify-end gap-2">
                <AppButton type="button" variant="ghost" onClick={() => setIsEditDriverOpen(false)}>
                  Cancel
                </AppButton>
                <AppButton 
                  type="submit" 
                  disabled={modalSubmitting}
                  className="bg-theme-btn-primary hover:bg-theme-btn-primary-secondary text-white font-semibold gap-1.5"
                >
                  {modalSubmitting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  <span>Update Driver</span>
                </AppButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* DISPATCH TRIP MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {isDispatchTripOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-border w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-border bg-surface/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/25">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Dispatch New Trip</h3>
                  <p className="text-xs text-muted-foreground">Schedule an executive movement or site shuttle</p>
                </div>
              </div>
              <AppButton variant="ghost" size="icon-sm" onClick={() => setIsDispatchTripOpen(false)}>
                <X className="h-4 w-4" />
              </AppButton>
            </div>

            <form onSubmit={handleDispatchTrip} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Select Vehicle *</label>
                  <select 
                    value={newTripVehicleId}
                    onChange={(e) => setNewTripVehicleId(e.target.value)}
                    required
                    className="w-full h-9 rounded-lg border border-border bg-surface px-3 text-xs"
                  >
                    <option value="">-- Choose Vehicle --</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.registration_number} - {v.make} {v.model} ({v.status})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Select Driver *</label>
                  <select 
                    value={newTripDriverId}
                    onChange={(e) => setNewTripDriverId(e.target.value)}
                    required
                    className="w-full h-9 rounded-lg border border-border bg-surface px-3 text-xs"
                  >
                    <option value="">-- Choose Driver --</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.full_name} ({d.phone})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Traveler / Department *</label>
                <AppInput 
                  value={newTripTraveler} 
                  onChange={(e) => setNewTripTraveler(e.target.value)} 
                  required
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Purpose of Trip *</label>
                <AppInput 
                  value={newTripPurpose} 
                  onChange={(e) => setNewTripPurpose(e.target.value)} 
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Origin *</label>
                  <AppInput
                    value={newTripOrigin} 
                    onChange={(e) => setNewTripOrigin(e.target.value)} 
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Destination *</label>
                  <AppInput 
                    value={newTripDestination} 
                    onChange={(e) => setNewTripDestination(e.target.value)} 
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Date</label>
                  <AppInput 
                    type="date" 
                    value={newTripDate} 
                    onChange={(e) => setNewTripDate(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Start Time</label>
                  <AppInput 
                    type="time" 
                    value={newTripStartTime} 
                    onChange={(e) => setNewTripStartTime(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Est. Return</label>
                  <AppInput 
                    type="time" 
                    value={newTripEndTime} 
                    onChange={(e) => setNewTripEndTime(e.target.value)} 
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-border flex items-center justify-end gap-2">
                <AppButton type="button" variant="ghost" onClick={() => setIsDispatchTripOpen(false)}>
                  Cancel
                </AppButton>
                <AppButton 
                  type="submit" 
                  disabled={modalSubmitting}
                  className="bg-theme-btn-primary hover:bg-theme-btn-primary-secondary text-white font-semibold gap-1.5"
                >
                  {modalSubmitting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  <span>Dispatch Trip</span>
                </AppButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* LOG SERVICE JOB CARD & WORKSHOP BILL MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {isAddMaintenanceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-border w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-border bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/25 shrink-0 shadow-xs">
                  <Wrench className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-foreground">Workshop Job Card & Service Bill Logger</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      Standard ERP Format
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Log authorized workshop maintenance, repair job sheets, labour & tax billing, and service forecasts
                  </p>
                </div>
              </div>
              <AppButton variant="ghost" size="icon-sm" onClick={() => setIsAddMaintenanceOpen(false)}>
                <X className="h-4 w-4" />
              </AppButton>
            </div>

            {/* Navigation Tabs Header */}
            <div className="px-5 py-2.5 bg-surface/80 border-b border-border flex items-center gap-2 overflow-x-auto text-xs font-semibold">
              <AppButton
                type="button"
                variant={newMaintActiveSection === "SCOPE_WORKSHOP" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setNewMaintActiveSection("SCOPE_WORKSHOP")}
                className={`h-8 text-xs shrink-0 ${newMaintActiveSection === "SCOPE_WORKSHOP" ? "bg-theme-btn-primary text-white font-bold" : "text-muted-foreground"}`}
              >
                <span>1. Vehicle & Service Scope</span>
              </AppButton>
              <AppButton
                type="button"
                variant={newMaintActiveSection === "BILLING_FORECAST" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setNewMaintActiveSection("BILLING_FORECAST")}
                className={`h-8 text-xs shrink-0 gap-1.5 ${newMaintActiveSection === "BILLING_FORECAST" ? "bg-theme-btn-primary text-white font-bold" : "text-muted-foreground"}`}
              >
                <Receipt className="h-3.5 w-3.5" />
                <span>2. Billing & Service Forecast</span>
              </AppButton>
            </div>

            <form onSubmit={handleLogMaintenance} className="flex-1 overflow-y-auto flex flex-col">
              <div className="p-5 space-y-5 flex-1">
                {/* ---------------------------------------------------- */}
                {/* SECTION 1: VEHICLE & SERVICE SCOPE */}
                {/* ---------------------------------------------------- */}
                {newMaintActiveSection === "SCOPE_WORKSHOP" && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="font-semibold block mb-1.5 text-xs text-foreground">
                          Target Fleet Vehicle *
                        </label>
                        <select
                          value={newMaintVehicleId}
                          onChange={(e) => handleSelectMaintVehicle(e.target.value)}
                          required
                          className="w-full h-10 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-foreground focus:outline-none focus:border-theme-btn-primary"
                        >
                          <option value="">-- Select Target Vehicle --</option>
                          {vehicles.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.registration_number} — {v.make} {v.model} ({v.odometer_km?.toLocaleString() || 0} km)
                            </option>
                          ))}
                        </select>
                        {newMaintVehicleId && (
                          <div className="mt-2 flex items-center gap-2">
                            {(() => {
                              const sel = vehicles.find((v) => v.id === newMaintVehicleId);
                              if (!sel) return null;
                              return (
                                <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                                  <span>Current Odo: <strong className="text-foreground">{sel.odometer_km?.toLocaleString()} km</strong></span>
                                  <span>•</span>
                                  <span>Category: <strong className="text-foreground">{sel.category}</strong></span>
                                  <span>•</span>
                                  <span>Status: <span className="px-1.5 py-0.2 rounded font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">{sel.status}</span></span>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="font-semibold block mb-1.5 text-xs text-foreground">
                          Job Card / Tax Invoice Number
                        </label>
                        <AppInput
                          value={newMaintInvoiceNo}
                          onChange={(e) => setNewMaintInvoiceNo(e.target.value)}
                          className="h-10 text-xs font-mono"
                        />
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Official job sheet or bill number issued by the workshop
                        </p>
                      </div>
                    </div>

                    {/* Maintenance Category Grid */}
                    <div>
                      <label className="font-semibold block mb-2 text-xs text-foreground">
                        Maintenance Category *
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {MAINTENANCE_CATEGORIES.map((cat) => {
                          const isSelected = newMaintCategory === cat.id;
                          return (
                            <AppButton
                              key={cat.id}
                              type="button"
                              variant={isSelected ? "primary" : "outline"}
                              size="sm"
                              onClick={() => setNewMaintCategory(cat.id)}
                              className={`p-2.5 h-auto rounded-xl text-left flex items-center justify-start gap-2.5 text-xs ${
                                isSelected
                                  ? "border-theme-btn-primary bg-theme-btn-primary/5 text-foreground ring-1 ring-theme-btn-primary"
                                  : "border-border bg-surface text-muted-foreground"
                              }`}
                            >
                              <span className="text-base">{cat.icon}</span>
                              <span className={`font-semibold leading-tight text-[11px] ${isSelected ? "text-foreground" : ""}`}>
                                {cat.label}
                              </span>
                            </AppButton>
                          );
                        })}
                      </div>
                    </div>

                    {/* Service Description Title */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="font-semibold text-xs text-foreground">
                          Service / Repair Scope Title *
                        </label>
                        <span className="text-[11px] text-muted-foreground">Select a preset or enter details</span>
                      </div>
                      <AppInput
                        value={newMaintServiceType}
                        onChange={(e) => setNewMaintServiceType(e.target.value)}
                        required
                        className="h-10 text-xs font-medium"
                      />

                      {/* Quick Presets */}
                      <div className="mt-2.5 flex flex-wrap gap-1.5 items-center">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground mr-1">Quick Presets:</span>
                        {SERVICE_PRESETS.map((preset) => (
                          <AppButton
                            key={preset}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setNewMaintServiceType(preset)}
                            className="h-6 px-2 text-[11px] bg-slate-100 dark:bg-slate-800/80 border-border text-muted-foreground hover:text-theme-btn-primary"
                          >
                            <span>+ {preset}</span>
                          </AppButton>
                        ))}
                      </div>
                    </div>

                    {/* Workshop & Service Advisor */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                      <div className="sm:col-span-2">
                        <label className="font-semibold block mb-1 text-xs text-foreground">
                          Authorized Workshop / Dealership *
                        </label>
                        <AppInput
                          value={newMaintVendor}
                          onChange={(e) => setNewMaintVendor(e.target.value)}
                          required
                          className="h-10 text-xs"
                        />
                      </div>
                      <div>
                        <label className="font-semibold block mb-1 text-xs text-foreground">
                          Workshop Location / Branch
                        </label>
                        <AppInput
                          value={newMaintLocation}
                          onChange={(e) => setNewMaintLocation(e.target.value)}
                          className="h-10 text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-semibold block mb-1 text-xs text-foreground">
                        Lead Service Advisor / Workshop Technician
                      </label>
                      <AppInput
                        value={newMaintTechnician}
                        onChange={(e) => setNewMaintTechnician(e.target.value)}
                        className="h-10 text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* ---------------------------------------------------- */}
                {/* SECTION 2: BILLING & SERVICE FORECAST */}
                {/* ---------------------------------------------------- */}
                {newMaintActiveSection === "BILLING_FORECAST" && (
                  <div className="space-y-5 animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="font-semibold block mb-1 text-xs text-foreground">
                          Service Execution Date *
                        </label>
                        <AppInput
                          type="date"
                          value={newMaintDate}
                          onChange={(e) => setNewMaintDate(e.target.value)}
                          required
                          className="h-10 text-xs font-mono"
                        />
                      </div>

                      <div>
                        <label className="font-semibold block mb-1 text-xs text-foreground">
                          Vehicle Odometer at Service (km) *
                        </label>
                        <AppInput
                          type="number"
                          value={newMaintOdometer || ""}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setNewMaintOdometer(val);
                            if (newMaintNextDueOdometer <= val) {
                              setNewMaintNextDueOdometer(val + 10000);
                            }
                          }}
                          required
                          className="h-10 text-xs font-mono font-semibold"
                        />
                      </div>
                    </div>

                    {/* Financial Costing Breakdown */}
                    <div className="p-4 rounded-xl border border-border bg-slate-50/60 dark:bg-slate-900/50 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Receipt className="h-4 w-4 text-amber-500" />
                          <h4 className="font-bold text-xs text-foreground">Workshop Invoice & Financial Statement</h4>
                        </div>
                        <AppButton
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const sub = (Number(newMaintPartsCost) || 0) + (Number(newMaintLabourCost) || 0);
                            const gst = Math.round(sub * 0.18);
                            setNewMaintTaxCost(gst);
                            setNewMaintCost(sub + gst);
                          }}
                          className="text-[11px] font-semibold text-primary hover:underline p-0 h-auto"
                        >
                          Auto-Calculate 18% GST
                        </AppButton>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold block mb-1 text-muted-foreground">
                            Labour / Service Charges (₹)
                          </label>
                          <AppInput
                            type="number"
                            value={newMaintLabourCost || ""}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 0;
                              setNewMaintLabourCost(val);
                              setNewMaintCost((Number(newMaintPartsCost) || 0) + val + (Number(newMaintTaxCost) || 0));
                            }}
                            className="h-9 text-xs font-mono font-semibold"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold block mb-1 text-muted-foreground">
                            Consumables & Workshop Misc (₹)
                          </label>
                          <AppInput
                            type="number"
                            value={newMaintPartsCost || ""}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 0;
                              setNewMaintPartsCost(val);
                              setNewMaintCost(val + (Number(newMaintLabourCost) || 0) + (Number(newMaintTaxCost) || 0));
                            }}
                            className="h-9 text-xs font-mono font-semibold"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold block mb-1 text-muted-foreground">
                            Taxes / GST Amount (₹)
                          </label>
                          <AppInput
                            type="number"
                            value={newMaintTaxCost || ""}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 0;
                              setNewMaintTaxCost(val);
                              setNewMaintCost((Number(newMaintPartsCost) || 0) + (Number(newMaintLabourCost) || 0) + val);
                            }}
                            className="h-9 text-xs font-mono font-semibold"
                          />
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-theme-btn-primary/10 border border-theme-btn-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="text-xs font-bold text-foreground block">
                            Grand Total Invoiced Amount
                          </span>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            Labour (₹{Number(newMaintLabourCost).toLocaleString("en-IN")}) + Consumables (₹{Number(newMaintPartsCost).toLocaleString("en-IN")}) + Taxes (₹{Number(newMaintTaxCost).toLocaleString("en-IN")})
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xl font-bold font-mono text-foreground">
                            ₹{Number(newMaintCost).toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="text-[11px] font-semibold block mb-1 text-muted-foreground">
                            Payment Mode / Channel
                          </label>
                          <select
                            value={newMaintPaymentMode}
                            onChange={(e) => setNewMaintPaymentMode(e.target.value)}
                            className="w-full h-9 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-foreground focus:outline-none focus:border-theme-btn-primary"
                          >
                            <option value="UPI / Bank Transfer">UPI / Bank Transfer</option>
                            <option value="Corporate Credit Card">Corporate Credit Card</option>
                            <option value="Cash / Petty Cash">Cash / Petty Cash</option>
                            <option value="Workshop Ledger Account">Workshop Ledger Account</option>
                            <option value="Cheque / DD">Cheque / Demand Draft</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold block mb-1 text-muted-foreground">
                            Payment Settlement Status
                          </label>
                          <select
                            value={newMaintPaymentStatus}
                            onChange={(e) => setNewMaintPaymentStatus(e.target.value)}
                            className="w-full h-9 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-foreground focus:outline-none focus:border-theme-btn-primary"
                          >
                            <option value="PAID">Paid / Settled</option>
                            <option value="PENDING">Pending Settlement</option>
                            <option value="BILLED_TO_ACCOUNT">Billed to Corporate Account</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Next Service Forecast */}
                    <div className="p-4 rounded-xl border border-border bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-blue-500" />
                        <h4 className="font-bold text-xs text-foreground">Next Scheduled Service Due Forecasting</h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold block mb-1 text-muted-foreground">
                            Next Service Due Date
                          </label>
                          <AppInput
                            type="date"
                            value={newMaintNextDue}
                            onChange={(e) => setNewMaintNextDue(e.target.value)}
                            className="h-9 text-xs font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold block mb-1 text-muted-foreground">
                            Next Service Due Odometer (km)
                          </label>
                          <AppInput
                            type="number"
                            value={newMaintNextDueOdometer || ""}
                            onChange={(e) => setNewMaintNextDueOdometer(Number(e.target.value) || 0)}
                            className="h-9 text-xs font-mono font-semibold"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Post-Service Vehicle Status */}
                    <div>
                      <label className="font-semibold block mb-1.5 text-xs text-foreground">
                        Post-Service Vehicle Fleet Status
                      </label>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        {[
                          { id: "IN_STOCK", label: "Available (Ready for Dispatch)", desc: "Parked at hub", color: "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300" },
                          { id: "ON_DUTY", label: "On Duty (Direct Deployment)", desc: "Immediately assigned", color: "border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-300" },
                          { id: "MAINTENANCE", label: "Under Observation", desc: "Test drive / monitoring", color: "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300" }
                        ].map((st) => {
                          const isSel = newMaintPostStatus === st.id;
                          return (
                            <AppButton
                              key={st.id}
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setNewMaintPostStatus(st.id)}
                              className={`p-2.5 h-auto rounded-xl text-left transition-all ${
                                isSel ? `${st.color} ring-1 ring-primary font-semibold` : "border-border bg-surface text-muted-foreground"
                              }`}
                            >
                              <div>
                                <div className="font-bold text-xs">{st.label}</div>
                                <div className="text-[10px] opacity-80 mt-0.5">{st.desc}</div>
                              </div>
                            </AppButton>
                          );
                        })}
                      </div>
                    </div>

                    {/* Technician Notes & Observations */}
                    <div>
                      <label className="font-semibold block mb-1 text-xs text-foreground">
                        Workshop Technician Observations & Advisory Notes
                      </label>
                      <textarea
                        rows={3}
                        value={newMaintNotes}
                        onChange={(e) => setNewMaintNotes(e.target.value)}
                        className="w-full rounded-lg border border-border bg-surface p-2.5 text-xs focus:outline-none focus:border-theme-btn-primary"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer Controls */}
              <div className="p-4 border-t border-border bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between">
                <div>
                  {newMaintActiveSection !== "SCOPE_WORKSHOP" && (
                    <AppButton
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setNewMaintActiveSection("SCOPE_WORKSHOP")}
                      className="gap-1 text-xs"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span>Previous Step</span>
                    </AppButton>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <AppButton type="button" variant="ghost" size="sm" onClick={() => setIsAddMaintenanceOpen(false)}>
                    Cancel
                  </AppButton>

                  {newMaintActiveSection === "SCOPE_WORKSHOP" ? (
                    <AppButton
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setNewMaintActiveSection("BILLING_FORECAST")}
                      className="gap-1 text-xs font-semibold"
                    >
                      <span>Next: Billing & Forecast</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </AppButton>
                  ) : null}

                  <AppButton
                    type="submit"
                    disabled={modalSubmitting}
                    className="bg-theme-btn-primary hover:bg-theme-btn-primary-secondary text-white font-bold gap-1.5 shadow-xs text-xs h-9 px-4"
                  >
                    {modalSubmitting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    <span>Save & Log Job Card</span>
                  </AppButton>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* EDIT SERVICE RECORD & WORKSHOP BILL MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {isEditMaintenanceOpen && selectedMaintenanceForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-border w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-border bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/25 shrink-0 shadow-xs">
                  <Edit2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-foreground">Edit Workshop Job Card & Service Bill</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25">
                      {editMaintInvoiceNo || `#${selectedMaintenanceForEdit.id.slice(-6)}`}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Update service scope, billing amounts, workshop info, and forecast with full audit tracking
                  </p>
                </div>
              </div>
              <AppButton 
                variant="ghost" 
                size="icon-sm" 
                onClick={() => {
                  setIsEditMaintenanceOpen(false);
                  setSelectedMaintenanceForEdit(null);
                }}
              >
                <X className="h-4 w-4" />
              </AppButton>
            </div>

            {/* Navigation Tabs Header */}
            <div className="px-5 py-2.5 bg-surface/80 border-b border-border flex items-center gap-2 overflow-x-auto text-xs font-semibold">
              <AppButton
                type="button"
                variant={editMaintActiveSection === "SCOPE_WORKSHOP" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setEditMaintActiveSection("SCOPE_WORKSHOP")}
                className={`h-8 text-xs shrink-0 ${editMaintActiveSection === "SCOPE_WORKSHOP" ? "bg-theme-btn-primary text-white font-bold" : "text-muted-foreground"}`}
              >
                <span>1. Vehicle & Service Scope</span>
              </AppButton>
              <AppButton
                type="button"
                variant={editMaintActiveSection === "BILLING_FORECAST" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setEditMaintActiveSection("BILLING_FORECAST")}
                className={`h-8 text-xs shrink-0 gap-1.5 ${editMaintActiveSection === "BILLING_FORECAST" ? "bg-theme-btn-primary text-white font-bold" : "text-muted-foreground"}`}
              >
                <Receipt className="h-3.5 w-3.5" />
                <span>2. Billing & Service Forecast</span>
              </AppButton>
            </div>

            <form onSubmit={handleUpdateMaintenance} className="flex-1 overflow-y-auto flex flex-col">
              <div className="p-5 space-y-5 flex-1">
                {/* ---------------------------------------------------- */}
                {/* SECTION 1: VEHICLE & SERVICE SCOPE */}
                {/* ---------------------------------------------------- */}
                {editMaintActiveSection === "SCOPE_WORKSHOP" && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="font-semibold block mb-1.5 text-xs text-foreground">
                          Target Fleet Vehicle *
                        </label>
                        <select
                          value={editMaintVehicleId}
                          onChange={(e) => setEditMaintVehicleId(e.target.value)}
                          required
                          className="w-full h-10 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-foreground focus:outline-none focus:border-theme-btn-primary"
                        >
                          <option value="">-- Select Target Vehicle --</option>
                          {vehicles.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.registration_number} — {v.make} {v.model} ({v.odometer_km?.toLocaleString() || 0} km)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="font-semibold block mb-1.5 text-xs text-foreground">
                          Job Card / Tax Invoice Number
                        </label>
                        <AppInput
                          value={editMaintInvoiceNo}
                          onChange={(e) => setEditMaintInvoiceNo(e.target.value)}
                          className="h-10 text-xs font-mono"
                        />
                      </div>
                    </div>

                    {/* Maintenance Category Grid */}
                    <div>
                      <label className="font-semibold block mb-2 text-xs text-foreground">
                        Maintenance Category *
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {MAINTENANCE_CATEGORIES.map((cat) => {
                          const isSelected = editMaintCategory === cat.id;
                          return (
                            <AppButton
                              key={cat.id}
                              type="button"
                              variant={isSelected ? "primary" : "outline"}
                              size="sm"
                              onClick={() => setEditMaintCategory(cat.id)}
                              className={`p-2.5 h-auto rounded-xl text-left flex items-center justify-start gap-2.5 text-xs ${
                                isSelected
                                  ? "border-theme-btn-primary bg-theme-btn-primary/5 text-foreground ring-1 ring-theme-btn-primary"
                                  : "border-border bg-surface text-muted-foreground"
                              }`}
                            >
                              <span className="text-base">{cat.icon}</span>
                              <span className={`font-semibold leading-tight text-[11px] ${isSelected ? "text-foreground" : ""}`}>
                                {cat.label}
                              </span>
                            </AppButton>
                          );
                        })}
                      </div>
                    </div>

                    {/* Service Description Title */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="font-semibold text-xs text-foreground">
                          Service / Repair Scope Title *
                        </label>
                      </div>
                      <AppInput
                        value={editMaintServiceType}
                        onChange={(e) => setEditMaintServiceType(e.target.value)}
                        required
                        className="h-10 text-xs font-medium"
                      />

                      {/* Quick Presets */}
                      <div className="mt-2.5 flex flex-wrap gap-1.5 items-center">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground mr-1">Quick Presets:</span>
                        {SERVICE_PRESETS.map((preset) => (
                          <AppButton
                            key={preset}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setEditMaintServiceType(preset)}
                            className="h-6 px-2 text-[11px] bg-slate-100 dark:bg-slate-800/80 border-border text-muted-foreground hover:text-theme-btn-primary"
                          >
                            <span>+ {preset}</span>
                          </AppButton>
                        ))}
                      </div>
                    </div>

                    {/* Workshop & Service Advisor */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                      <div className="sm:col-span-2">
                        <label className="font-semibold block mb-1 text-xs text-foreground">
                          Authorized Workshop / Dealership *
                        </label>
                        <AppInput
                          value={editMaintVendor}
                          onChange={(e) => setEditMaintVendor(e.target.value)}
                          required
                          className="h-10 text-xs"
                        />
                      </div>
                      <div>
                        <label className="font-semibold block mb-1 text-xs text-foreground">
                          Workshop Location / Branch
                        </label>
                        <AppInput
                          value={editMaintLocation}
                          onChange={(e) => setEditMaintLocation(e.target.value)}
                          className="h-10 text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-semibold block mb-1 text-xs text-foreground">
                        Lead Service Advisor / Workshop Technician
                      </label>
                      <AppInput
                        value={editMaintTechnician}
                        onChange={(e) => setEditMaintTechnician(e.target.value)}
                        className="h-10 text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* ---------------------------------------------------- */}
                {/* SECTION 2: BILLING & SERVICE FORECAST */}
                {/* ---------------------------------------------------- */}
                {editMaintActiveSection === "BILLING_FORECAST" && (
                  <div className="space-y-5 animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="font-semibold block mb-1 text-xs text-foreground">
                          Service Execution Date *
                        </label>
                        <AppInput
                          type="date"
                          value={editMaintDate}
                          onChange={(e) => setEditMaintDate(e.target.value)}
                          required
                          className="h-10 text-xs font-mono"
                        />
                      </div>

                      <div>
                        <label className="font-semibold block mb-1 text-xs text-foreground">
                          Vehicle Odometer at Service (km) *
                        </label>
                        <AppInput
                          type="number"
                          value={editMaintOdometer || ""}
                          onChange={(e) => setEditMaintOdometer(Number(e.target.value) || 0)}
                          required
                          className="h-10 text-xs font-mono font-semibold"
                        />
                      </div>
                    </div>

                    {/* Financial Costing Breakdown */}
                    <div className="p-4 rounded-xl border border-border bg-slate-50/60 dark:bg-slate-900/50 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Receipt className="h-4 w-4 text-amber-500" />
                          <h4 className="font-bold text-xs text-foreground">Workshop Invoice & Financial Statement</h4>
                        </div>
                        <AppButton
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const sub = (Number(editMaintPartsCost) || 0) + (Number(editMaintLabourCost) || 0);
                            const gst = Math.round(sub * 0.18);
                            setEditMaintTaxCost(gst);
                            setEditMaintCost(sub + gst);
                          }}
                          className="text-[11px] font-semibold text-primary hover:underline p-0 h-auto"
                        >
                          Auto-Calculate 18% GST
                        </AppButton>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold block mb-1 text-muted-foreground">
                            Labour / Service Charges (₹)
                          </label>
                          <AppInput
                            type="number"
                            value={editMaintLabourCost || ""}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 0;
                              setEditMaintLabourCost(val);
                              setEditMaintCost((Number(editMaintPartsCost) || 0) + val + (Number(editMaintTaxCost) || 0));
                            }}
                            className="h-9 text-xs font-mono font-semibold"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold block mb-1 text-muted-foreground">
                            Consumables & Workshop Misc (₹)
                          </label>
                          <AppInput
                            type="number"
                            value={editMaintPartsCost || ""}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 0;
                              setEditMaintPartsCost(val);
                              setEditMaintCost(val + (Number(editMaintLabourCost) || 0) + (Number(editMaintTaxCost) || 0));
                            }}
                            className="h-9 text-xs font-mono font-semibold"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold block mb-1 text-muted-foreground">
                            Taxes / GST Amount (₹)
                          </label>
                          <AppInput
                            type="number"
                            value={editMaintTaxCost || ""}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 0;
                              setEditMaintTaxCost(val);
                              setEditMaintCost((Number(editMaintPartsCost) || 0) + (Number(editMaintLabourCost) || 0) + val);
                            }}
                            className="h-9 text-xs font-mono font-semibold"
                          />
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-theme-btn-primary/10 border border-theme-btn-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="text-xs font-bold text-foreground block">
                            Grand Total Invoiced Amount
                          </span>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            Labour (₹{Number(editMaintLabourCost).toLocaleString("en-IN")}) + Consumables (₹{Number(editMaintPartsCost).toLocaleString("en-IN")}) + Taxes (₹{Number(editMaintTaxCost).toLocaleString("en-IN")})
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xl font-bold font-mono text-foreground">
                            ₹{Number(editMaintCost).toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="text-[11px] font-semibold block mb-1 text-muted-foreground">
                            Payment Mode / Channel
                          </label>
                          <select
                            value={editMaintPaymentMode}
                            onChange={(e) => setEditMaintPaymentMode(e.target.value)}
                            className="w-full h-9 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-foreground focus:outline-none focus:border-theme-btn-primary"
                          >
                            <option value="UPI / Bank Transfer">UPI / Bank Transfer</option>
                            <option value="Corporate Credit Card">Corporate Credit Card</option>
                            <option value="Cash / Petty Cash">Cash / Petty Cash</option>
                            <option value="Workshop Ledger Account">Workshop Ledger Account</option>
                            <option value="Cheque / DD">Cheque / Demand Draft</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold block mb-1 text-muted-foreground">
                            Payment Settlement Status
                          </label>
                          <select
                            value={editMaintPaymentStatus}
                            onChange={(e) => setEditMaintPaymentStatus(e.target.value)}
                            className="w-full h-9 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-foreground focus:outline-none focus:border-theme-btn-primary"
                          >
                            <option value="PAID">Paid / Settled</option>
                            <option value="PENDING">Pending Settlement</option>
                            <option value="BILLED_TO_ACCOUNT">Billed to Corporate Account</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Next Service Forecast */}
                    <div className="p-4 rounded-xl border border-border bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-blue-500" />
                        <h4 className="font-bold text-xs text-foreground">Next Scheduled Service Due Forecasting</h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold block mb-1 text-muted-foreground">
                            Next Service Due Date
                          </label>
                          <AppInput
                            type="date"
                            value={editMaintNextDue}
                            onChange={(e) => setEditMaintNextDue(e.target.value)}
                            className="h-9 text-xs font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold block mb-1 text-muted-foreground">
                            Next Service Due Odometer (km)
                          </label>
                          <AppInput
                            type="number"
                            value={editMaintNextDueOdometer || ""}
                            onChange={(e) => setEditMaintNextDueOdometer(Number(e.target.value) || 0)}
                            className="h-9 text-xs font-mono font-semibold"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Post-Service Vehicle Status */}
                    <div>
                      <label className="font-semibold block mb-1.5 text-xs text-foreground">
                        Post-Service Vehicle Fleet Status
                      </label>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        {[
                          { id: "IN_STOCK", label: "Available (Ready for Dispatch)", desc: "Parked at hub", color: "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300" },
                          { id: "ON_DUTY", label: "On Duty (Direct Deployment)", desc: "Immediately assigned", color: "border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-300" },
                          { id: "MAINTENANCE", label: "Under Observation", desc: "Test drive / monitoring", color: "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300" }
                        ].map((st) => {
                          const isSel = editMaintPostStatus === st.id;
                          return (
                            <AppButton
                              key={st.id}
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setEditMaintPostStatus(st.id)}
                              className={`p-2.5 h-auto rounded-xl text-left transition-all ${
                                isSel ? `${st.color} ring-1 ring-primary font-semibold` : "border-border bg-surface text-muted-foreground"
                              }`}
                            >
                              <div>
                                <div className="font-bold text-xs">{st.label}</div>
                                <div className="text-[10px] opacity-80 mt-0.5">{st.desc}</div>
                              </div>
                            </AppButton>
                          );
                        })}
                      </div>
                    </div>

                    {/* Technician Notes & Observations */}
                    <div>
                      <label className="font-semibold block mb-1 text-xs text-foreground">
                        Workshop Technician Observations & Advisory Notes
                      </label>
                      <textarea
                        rows={3}
                        value={editMaintNotes}
                        onChange={(e) => setEditMaintNotes(e.target.value)}
                        className="w-full rounded-lg border border-border bg-surface p-2.5 text-xs focus:outline-none focus:border-theme-btn-primary"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer Controls */}
              <div className="p-4 border-t border-border bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between">
                <div>
                  {editMaintActiveSection !== "SCOPE_WORKSHOP" && (
                    <AppButton
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditMaintActiveSection("SCOPE_WORKSHOP")}
                      className="gap-1 text-xs"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span>Previous Step</span>
                    </AppButton>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <AppButton 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setIsEditMaintenanceOpen(false);
                      setSelectedMaintenanceForEdit(null);
                    }}
                  >
                    Cancel
                  </AppButton>

                  {editMaintActiveSection === "SCOPE_WORKSHOP" ? (
                    <AppButton
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditMaintActiveSection("BILLING_FORECAST")}
                      className="gap-1 text-xs font-semibold"
                    >
                      <span>Next: Billing & Forecast</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </AppButton>
                  ) : null}

                  <AppButton
                    type="submit"
                    disabled={modalSubmitting}
                    className="bg-theme-btn-primary hover:bg-theme-btn-primary-secondary text-white font-bold gap-1.5 shadow-xs text-xs h-9 px-4"
                  >
                    {modalSubmitting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    <span>Update Service Record</span>
                  </AppButton>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* VIEW DETAILED JOB CARD & SERVICE INVOICE MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {selectedMaintenanceForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-border w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-border bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-theme-btn-primary/15 text-theme-btn-primary flex items-center justify-center border border-theme-btn-primary/25 shrink-0 shadow-xs">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-foreground">Workshop Job Card & Service Invoice</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25">
                      {selectedMaintenanceForView.parts_replaced?.invoice_number || `#${selectedMaintenanceForView.id.slice(-8)}`}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Executed on {selectedMaintenanceForView.service_date} • Authorized Workshop Record
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {canManageMaintenance && (
                  <AppButton
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const rec = selectedMaintenanceForView;
                      setSelectedMaintenanceForView(null);
                      openEditMaintenanceModal(rec);
                    }}
                    className="gap-1 text-xs h-8 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10 font-semibold"
                    title="Edit Record"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </AppButton>
                )}
                <AppButton
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  className="gap-1 text-xs h-8"
                  title="Print Job Card"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Print / PDF</span>
                </AppButton>
                <AppButton
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setSelectedMaintenanceForView(null)}
                >
                  <X className="h-4 w-4" />
                </AppButton>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-5 overflow-y-auto flex-1 text-xs">
              {/* Header Details Card */}
              {(() => {
                const partsData = (selectedMaintenanceForView.parts_replaced && typeof selectedMaintenanceForView.parts_replaced === "object")
                  ? selectedMaintenanceForView.parts_replaced
                  : null;
                const catId = partsData?.category;
                const catInfo = MAINTENANCE_CATEGORIES.find((c) => c.id === catId) || {
                  id: "GENERAL",
                  label: "General Service",
                  icon: "🔧",
                  badge: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20"
                };

                const auditTrail = Array.isArray(partsData?.audit_trail) ? partsData.audit_trail : [];

                return (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Vehicle Details */}
                      <div className="p-4 rounded-xl border border-border bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          Fleet Vehicle Profile
                        </div>
                        <div className="flex items-center justify-between">
                          {renderHsrpPlate(selectedMaintenanceForView.vehicle_reg)}
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border inline-flex items-center gap-1 ${catInfo.badge}`}>
                            <span>{catInfo.icon}</span>
                            <span>{catInfo.label}</span>
                          </span>
                        </div>
                        <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Odometer at Service:</span>
                          <span className="font-mono font-bold text-foreground">
                            {selectedMaintenanceForView.odometer_km ? `${selectedMaintenanceForView.odometer_km.toLocaleString()} km` : "—"}
                          </span>
                        </div>
                      </div>

                      {/* Workshop & Technician */}
                      <div className="p-4 rounded-xl border border-border bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          Authorized Workshop & Technician
                        </div>
                        <div className="text-sm font-bold text-foreground">
                          {selectedMaintenanceForView.service_center}
                        </div>
                        {partsData?.location && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            <span>{partsData.location}</span>
                          </div>
                        )}
                        <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Service Advisor:</span>
                          <span className="font-semibold text-foreground">
                            {selectedMaintenanceForView.technician_name || "—"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Service Scope Description */}
                    <div className="p-4 rounded-xl border border-border bg-surface space-y-1.5">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Service Scope & Job Work Description
                      </div>
                      <div className="text-sm font-semibold text-foreground">
                        {selectedMaintenanceForView.service_type}
                      </div>
                    </div>

                    {/* Billing & Tax Statement */}
                    <div className="p-4 rounded-xl border border-border bg-surface space-y-3">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Receipt className="h-4 w-4 text-amber-500" />
                        <span>Tax Invoice & Financial Statement</span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Labour & Service Charges:</span>
                          <span className="font-mono font-medium text-foreground">
                            ₹{Number(partsData?.labour_cost || 0).toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Consumables & Workshop Misc:</span>
                          <span className="font-mono font-medium text-foreground">
                            ₹{Number(partsData?.parts_cost || 0).toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>GST / Statutory Taxes:</span>
                          <span className="font-mono font-medium text-foreground">
                            ₹{Number(partsData?.tax_amount || 0).toLocaleString("en-IN")}
                          </span>
                        </div>
                        {partsData?.payment_mode && (
                          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                            <span>Payment Mode / Status:</span>
                            <span className="font-medium text-foreground flex items-center gap-1.5">
                              <span>{partsData.payment_mode}</span>
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                {partsData.payment_status || "PAID"}
                              </span>
                            </span>
                          </div>
                        )}
                        <div className="pt-2 border-t border-border flex items-center justify-between text-sm font-bold">
                          <span className="text-foreground">Grand Total Invoiced:</span>
                          <span className="font-mono text-base text-primary">
                            ₹{Number(selectedMaintenanceForView.cost).toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Next Service Forecast & Notes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl border border-border bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-blue-500" />
                          <span>Next Service Forecast</span>
                        </div>
                        <div className="text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Due Date:</span>
                            <span className="font-mono font-semibold text-foreground">
                              {selectedMaintenanceForView.next_service_due_date || "Not Scheduled"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Due Odometer:</span>
                            <span className="font-mono font-semibold text-foreground">
                              {selectedMaintenanceForView.next_service_due_odometer
                                ? `${selectedMaintenanceForView.next_service_due_odometer.toLocaleString()} km`
                                : "—"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {partsData?.technician_notes && (
                        <div className="p-4 rounded-xl border border-border bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            Technician Remarks
                          </div>
                          <p className="text-xs text-foreground italic">
                            "{partsData.technician_notes}"
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Activity & Audit Trail Timeline */}
                    <div className="p-4 rounded-xl border border-border bg-slate-50/40 dark:bg-slate-900/30 space-y-3">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <History className="h-3.5 w-3.5 text-indigo-500" />
                        <span>Audit Trail & Activity Log History</span>
                      </div>
                      
                      {auditTrail.length === 0 ? (
                        <div className="text-xs text-muted-foreground py-2 italic">
                          Created on {selectedMaintenanceForView.service_date}
                        </div>
                      ) : (
                        <div className="divide-y divide-border/60">
                          {auditTrail.map((entry: any, i: number) => {
                            const isCreate = entry.action === "CREATED";
                            return (
                              <div key={i} className="py-2.5 first:pt-0 last:pb-0 flex items-start gap-2.5 text-xs">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 mt-0.5 ${
                                  isCreate 
                                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" 
                                    : "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                                }`}>
                                  {entry.action}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-semibold text-foreground truncate">
                                      {entry.performer_name || "Fleet Administrator"}
                                    </span>
                                    <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                                      {entry.timestamp ? new Date(entry.timestamp).toLocaleString("en-IN") : ""}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground mt-0.5">
                                    {entry.summary || entry.note || "Activity recorded"}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-end gap-2">
              <AppButton
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setSelectedMaintenanceForView(null)}
                className="text-xs font-semibold px-4"
              >
                Close Job Card
              </AppButton>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* INSURANCE VENDOR MASTER MODAL (ADD / EDIT) */}
      {/* ---------------------------------------------------------------------- */}
      {isVendorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-border w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-border bg-surface/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/25">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    {selectedVendorForEdit ? "Edit Insurance Vendor" : "Register Insurance Vendor"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Configure motor insurance company master profile and toll-free emergency support
                  </p>
                </div>
              </div>
              <AppButton variant="ghost" size="icon-sm" onClick={() => setIsVendorModalOpen(false)}>
                <X className="h-4 w-4" />
              </AppButton>
            </div>

            <form onSubmit={handleSaveVendor} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold block mb-1 flex items-center gap-1">
                    <span>Vendor Code *</span>
                    <span className="text-[10px] text-muted-foreground font-normal">(Short identifier)</span>
                  </label>
                  <AppInput
                    value={vendorFormCode}
                    onChange={(e) => setVendorFormCode(e.target.value.toUpperCase())}
                    className="font-mono uppercase font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">
                    <span>Company / Vendor Name *</span>
                  </label>
                  <AppInput
                    value={vendorFormName}
                    onChange={(e) => setVendorFormName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold block mb-1">Contact Person</label>
                  <AppInput
                    value={vendorFormContactPerson}
                    onChange={(e) => setVendorFormContactPerson(e.target.value)}
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-blue-500" />
                    <span>Contact Number / Mobile</span>
                  </label>
                  <AppInput
                    value={vendorFormContactNumber}
                    onChange={(e) => setVendorFormContactNumber(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold block mb-1">Official Email</label>
                  <AppInput
                    type="email"
                    value={vendorFormEmail}
                    onChange={(e) => setVendorFormEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 flex items-center gap-1">
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                    <span>24x7 Toll-Free RSA / Support</span>
                  </label>
                  <AppInput
                    value={vendorFormSupportTollFree}
                    onChange={(e) => setVendorFormSupportTollFree(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Portal / Claim Website URL</label>
                <AppInput
                  value={vendorFormWebsite}
                  onChange={(e) => setVendorFormWebsite(e.target.value)}
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Policy Coverage Remarks / Notes</label>
                <textarea
                  rows={2}
                  value={vendorFormDesc}
                  onChange={(e) => setVendorFormDesc(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-border bg-surface text-foreground focus:ring-2 focus:ring-theme-btn-primary outline-none"
                />
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <AppButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsVendorModalOpen(false)}
                  disabled={modalSubmitting}
                >
                  Cancel
                </AppButton>
                <AppButton
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={modalSubmitting}
                  className="bg-theme-btn-primary hover:bg-theme-btn-primary-secondary text-white font-semibold gap-1.5"
                >
                  {modalSubmitting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  <span>{selectedVendorForEdit ? "Update Vendor" : "Save Insurance Vendor"}</span>
                </AppButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* PARTS & ACCESSORIES MODAL (ADD / EDIT) */}
      {/* ---------------------------------------------------------------------- */}
      {(isAddPartOpen || isEditPartOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-border w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-border bg-surface/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/25">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    {selectedPartForEdit ? "Edit Part / Accessory Record" : "Register Part, Accessory or Consumable"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Configure procurement dates, DOM shelf-life, OEM warranty limits, recurring renewals, and vehicle mounting
                  </p>
                </div>
              </div>
              <AppButton
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  setIsAddPartOpen(false);
                  setIsEditPartOpen(false);
                  setSelectedPartForEdit(null);
                }}
              >
                <X className="h-4 w-4" />
              </AppButton>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSavePart} className="p-5 space-y-6 overflow-y-auto flex-1 text-xs">
              {/* Section 1: Item Identity & Type */}
              <div className="space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 pb-1 border-b border-border">
                  <Package className="h-3.5 w-3.5 text-theme-btn-primary" />
                  <span>1. Item Identity & Classification</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="font-semibold block mb-1">
                      <span>Item / Part Name *</span>
                    </label>
                    <AppInput
                      value={partFormName}
                      onChange={(e) => setPartFormName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Item Category Type</label>
                    <select
                      value={partFormItemType}
                      onChange={(e) => setPartFormItemType(e.target.value)}
                      className="w-full text-xs h-9 px-3 rounded-lg border border-border bg-surface text-foreground focus:ring-2 focus:ring-theme-btn-primary outline-none"
                    >
                      <option value="SPARE_PART">Spare Part</option>
                      <option value="ACCESSORY">Accessory / Gadget</option>
                      <option value="CONSUMABLE">Consumable / Fluid / Lubricant</option>
                      <option value="TYRE">Tyre / Wheel</option>
                      <option value="BATTERY">Battery / Electrical</option>
                      <option value="GPS_DEVICE">GPS & AIS-140 Tracker</option>
                      <option value="DASHCAM">Dashcam & Camera</option>
                      <option value="TOOL">Workshop Tool / Jack</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Brand / Manufacturer *</label>
                    <AppInput
                      value={partFormBrand}
                      onChange={(e) => setPartFormBrand(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Part Number / SKU</label>
                    <AppInput
                      value={partFormPartNumber}
                      onChange={(e) => setPartFormPartNumber(e.target.value)}
                      className="font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Serial Number / IMEI</label>
                    <AppInput
                      value={partFormSerialNumber}
                      onChange={(e) => setPartFormSerialNumber(e.target.value)}
                      className="font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Condition</label>
                    <select
                      value={partFormCondition}
                      onChange={(e) => setPartFormCondition(e.target.value)}
                      className="w-full text-xs h-9 px-3 rounded-lg border border-border bg-surface text-foreground focus:ring-2 focus:ring-theme-btn-primary outline-none"
                    >
                      <option value="NEW">Brand New (OEM)</option>
                      <option value="REFURBISHED">Refurbished / Serviced</option>
                      <option value="USED">Used / Operational</option>
                      <option value="REBUILT">Rebuilt / Overhauled</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Classification Sub-Group</label>
                    <AppInput
                      value={partFormCategory}
                      onChange={(e) => setPartFormCategory(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Procurement & Financials */}
              <div className="space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 pb-1 border-b border-border">
                  <Receipt className="h-3.5 w-3.5 text-emerald-500" />
                  <span>2. Procurement, Invoicing & Costs</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="font-semibold block mb-1 flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-blue-500" />
                      <span>Purchase Date *</span>
                    </label>
                    <AppInput
                      type="date"
                      value={partFormPurchaseDate}
                      onChange={(e) => setPartFormPurchaseDate(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Unit Price (₹)</label>
                    <AppInput
                      type="number"
                      min="0"
                      step="any"
                      value={partFormUnitPrice || ""}
                      onChange={(e) => {
                        const unit = Number(e.target.value) || 0;
                        setPartFormUnitPrice(unit);
                        setPartFormPurchaseAmount(unit * (Number(partFormQuantity) || 1));
                      }}
                      className="font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Quantity</label>
                    <AppInput
                      type="number"
                      min="1"
                      value={partFormQuantity}
                      onChange={(e) => {
                        const qty = Number(e.target.value) || 1;
                        setPartFormQuantity(qty);
                        setPartFormPurchaseAmount((Number(partFormUnitPrice) || 0) * qty);
                      }}
                      className="font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Total Purchase Amount (₹)</label>
                    <AppInput
                      type="number"
                      min="0"
                      step="any"
                      value={partFormPurchaseAmount || ""}
                      onChange={(e) => setPartFormPurchaseAmount(Number(e.target.value) || 0)}
                      className="font-mono font-bold text-emerald-600 dark:text-emerald-400"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="font-semibold block mb-1">Procurement Vendor / Supplier</label>
                    <AppInput
                      value={partFormVendorName}
                      onChange={(e) => setPartFormVendorName(e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="font-semibold block mb-1">Invoice / Bill Number</label>
                    <AppInput
                      value={partFormInvoiceNumber}
                      onChange={(e) => setPartFormInvoiceNumber(e.target.value)}
                      className="font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Manufacturing DOM & Shelf-Life Expiry */}
              <div className="space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 pb-1 border-b border-border">
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  <span>3. Manufacturing Date (DOM) & Shelf-Life Expiry</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1 flex items-center gap-1">
                      <span>Date of Manufacturing (DOM)</span>
                      <span className="text-[10px] text-muted-foreground font-normal">(Shelf age evaluation)</span>
                    </label>
                    <AppInput
                      type="date"
                      value={partFormManufacturingDate}
                      onChange={(e) => setPartFormManufacturingDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1 flex items-center gap-1">
                      <span>Shelf-Life / Expiry Date</span>
                      <span className="text-[10px] text-muted-foreground font-normal">(Fluids, oils, rubber components)</span>
                    </label>
                    <AppInput
                      type="date"
                      value={partFormExpiryDate}
                      onChange={(e) => setPartFormExpiryDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: OEM Warranty Coverage & Period */}
              <div className="space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 pb-1 border-b border-border">
                  <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" />
                  <span>4. OEM Warranty Coverage & Lifecycle Countdown</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold block mb-1">Warranty Type</label>
                    <select
                      value={partFormWarrantyType}
                      onChange={(e) => setPartFormWarrantyType(e.target.value)}
                      className="w-full text-xs h-9 px-3 rounded-lg border border-border bg-surface text-foreground focus:ring-2 focus:ring-theme-btn-primary outline-none"
                    >
                      <option value="WARRANTY">Standard OEM Warranty</option>
                      <option value="EXTENDED_WARRANTY">Extended Warranty</option>
                      <option value="GUARANTEE">Replacement Guarantee</option>
                      <option value="LIFETIME">Lifetime Limited Warranty</option>
                      <option value="NONE">No Warranty</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold block mb-1 flex items-center justify-between">
                      <span>Warranty Period (Months)</span>
                      {partFormPurchaseDate && (
                        <button
                          type="button"
                          onClick={() => {
                            if (partFormPurchaseDate && partFormWarrantyMonths > 0) {
                              const d = new Date(partFormPurchaseDate);
                              d.setMonth(d.getMonth() + Number(partFormWarrantyMonths));
                              setPartFormWarrantyExpiryDate(d.toISOString().split("T")[0]);
                            }
                          }}
                          className="text-[10px] text-theme-btn-primary hover:underline font-semibold"
                        >
                          Auto-Calculate
                        </button>
                      )}
                    </label>
                    <AppInput
                      type="number"
                      min="0"
                      value={partFormWarrantyMonths}
                      onChange={(e) => {
                        const m = Number(e.target.value) || 0;
                        setPartFormWarrantyMonths(m);
                        if (partFormPurchaseDate && m > 0) {
                          const d = new Date(partFormPurchaseDate);
                          d.setMonth(d.getMonth() + m);
                          setPartFormWarrantyExpiryDate(d.toISOString().split("T")[0]);
                        }
                      }}
                      className="font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1 flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-indigo-500" />
                      <span>Warranty Expiry Date</span>
                    </label>
                    <AppInput
                      type="date"
                      value={partFormWarrantyExpiryDate}
                      onChange={(e) => setPartFormWarrantyExpiryDate(e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="font-semibold block mb-1">Warranty Inclusions / Terms</label>
                    <AppInput
                      value={partFormWarrantyTerms}
                      onChange={(e) => setPartFormWarrantyTerms(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Section 5: Recurring Renewal Policy */}
              <div className="space-y-3 p-3.5 rounded-xl border border-cyan-500/20 bg-cyan-500/5">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-800 dark:text-cyan-300 flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-cyan-500" />
                    <span>5. Recurring Renewal Policy (GPS SIM / AMC / Subscriptions)</span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={partFormHasRenewal}
                      onChange={(e) => setPartFormHasRenewal(e.target.checked)}
                      className="rounded border-border text-theme-btn-primary focus:ring-theme-btn-primary h-4 w-4"
                    >
                    </input>
                    <span className="text-xs font-semibold text-foreground">Has Renewal Policy</span>
                  </label>
                </div>

                {partFormHasRenewal && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                    <div>
                      <label className="font-semibold block mb-1">Renewal Policy Type</label>
                      <select
                        value={partFormRenewalType}
                        onChange={(e) => setPartFormRenewalType(e.target.value)}
                        className="w-full text-xs h-9 px-3 rounded-lg border border-border bg-surface text-foreground focus:ring-2 focus:ring-theme-btn-primary outline-none"
                      >
                        <option value="GPS_SIM_RECHARGE">GPS M2M SIM Cellular Recharge</option>
                        <option value="EXTENDED_AMC">Extended AMC Maintenance Contract</option>
                        <option value="ANNUAL_CALIBRATION">Annual Statutory Calibration</option>
                        <option value="SOFTWARE_LICENSE">Software / Cloud Telematics License</option>
                        <option value="FASTAG_RECHARGE">FASTag Fleet Commercial Balance</option>
                        <option value="OTHER_POLICY">Other Recurring Policy</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-semibold block mb-1 flex items-center gap-1 text-amber-700 dark:text-amber-400">
                        <Calendar className="h-3 w-3 text-amber-500" />
                        <span>Next Renewal Due Date *</span>
                      </label>
                      <AppInput
                        type="date"
                        value={partFormRenewalDate}
                        onChange={(e) => setPartFormRenewalDate(e.target.value)}
                        required={partFormHasRenewal}
                      />
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">Renewal Cost (₹ / cycle)</label>
                      <AppInput
                        type="number"
                        min="0"
                        value={partFormRenewalCost || ""}
                        onChange={(e) => setPartFormRenewalCost(Number(e.target.value) || 0)}
                        className="font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">Renewal Provider / Telco</label>
                      <AppInput
                        value={partFormRenewalVendor}
                        onChange={(e) => setPartFormRenewalVendor(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">SIM / Policy / Account Number</label>
                      <AppInput
                        value={partFormRenewalPolicyNumber}
                        onChange={(e) => setPartFormRenewalPolicyNumber(e.target.value)}
                        className="font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">Advance Alert Reminder (Days)</label>
                      <AppInput
                        type="number"
                        min="1"
                        value={partFormRenewalReminderDays}
                        onChange={(e) => setPartFormRenewalReminderDays(Number(e.target.value) || 30)}
                        className="font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Section 6: Vehicle Assignment & Installation */}
              <div className="space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 pb-1 border-b border-border">
                  <Car className="h-3.5 w-3.5 text-blue-500" />
                  <span>6. Vehicle Mounting & Installation Status</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold block mb-1">Assigned Vehicle</label>
                    <select
                      value={partFormVehicleId}
                      onChange={(e) => {
                        const vehId = e.target.value;
                        setPartFormVehicleId(vehId);
                        if (vehId && vehId !== "UNASSIGNED_STOCK") {
                          const matched = vehicles.find((v) => v.id === vehId);
                          if (matched) {
                            setPartFormAssignedVehicleReg(matched.registration_number);
                            setPartFormStatus("INSTALLED");
                            if (!partFormInstalledOdometer && matched.odometer_km) {
                              setPartFormInstalledOdometer(matched.odometer_km);
                            }
                            if (!partFormInstallationDate) {
                              setPartFormInstallationDate(new Date().toISOString().split("T")[0]);
                            }
                          }
                        } else {
                          setPartFormAssignedVehicleReg("");
                          setPartFormStatus("IN_STOCK");
                        }
                      }}
                      className="w-full text-xs h-9 px-3 rounded-lg border border-border bg-surface text-foreground focus:ring-2 focus:ring-theme-btn-primary outline-none"
                    >
                      <option value="UNASSIGNED_STOCK">Warehouse Stock (Unassigned)</option>
                      {vehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.registration_number} — {v.make} {v.model}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Installation Date</label>
                    <AppInput
                      type="date"
                      value={partFormInstallationDate}
                      onChange={(e) => setPartFormInstallationDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Installed Odometer (km)</label>
                    <AppInput
                      type="number"
                      min="0"
                      value={partFormInstalledOdometer}
                      onChange={(e) => setPartFormInstalledOdometer(e.target.value === "" ? "" : Number(e.target.value))}
                      className="font-mono"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="font-semibold block mb-1">Installed By (Technician / Workshop)</label>
                    <AppInput
                      value={partFormInstalledBy}
                      onChange={(e) => setPartFormInstalledBy(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Inventory Status</label>
                    <select
                      value={partFormStatus}
                      onChange={(e) => setPartFormStatus(e.target.value)}
                      className="w-full text-xs h-9 px-3 rounded-lg border border-border bg-surface text-foreground focus:ring-2 focus:ring-theme-btn-primary outline-none"
                    >
                      <option value="IN_STOCK">In Stock (Warehouse)</option>
                      <option value="INSTALLED">Installed on Vehicle</option>
                      <option value="RESERVED">Reserved for Job</option>
                      <option value="DEFECTIVE">Defective / RMA Return</option>
                      <option value="SCRAPPED">Scrapped / Disposed</option>
                    </select>
                  </div>
                  <div className="sm:col-span-3">
                    <label className="font-semibold block mb-1">Technical Notes / Location Details</label>
                    <textarea
                      rows={2}
                      value={partFormNotes}
                      onChange={(e) => setPartFormNotes(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border border-border bg-surface text-foreground focus:ring-2 focus:ring-theme-btn-primary outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-border flex items-center justify-end gap-2">
                <AppButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsAddPartOpen(false);
                    setIsEditPartOpen(false);
                    setSelectedPartForEdit(null);
                  }}
                  disabled={modalSubmitting}
                >
                  Cancel
                </AppButton>
                <AppButton
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={modalSubmitting}
                  className="bg-theme-btn-primary hover:bg-theme-btn-primary-secondary text-white font-semibold gap-1.5"
                >
                  {modalSubmitting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  <span>{selectedPartForEdit ? "Update Part Record" : "Save Part Record"}</span>
                </AppButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* QUICK RENEW POLICY MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {isRenewPartOpen && selectedPartForRenew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-border bg-surface/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center border border-cyan-500/25">
                  <RotateCcw className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Renew Policy / Subscription
                  </h3>
                  <p className="text-xs text-muted-foreground truncate max-w-[280px]">
                    {selectedPartForRenew.name}
                  </p>
                </div>
              </div>
              <AppButton variant="ghost" size="icon-sm" onClick={() => setIsRenewPartOpen(false)}>
                <X className="h-4 w-4" />
              </AppButton>
            </div>

            <form onSubmit={handleSaveRenewal} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="p-3 rounded-xl border border-border bg-slate-50/50 dark:bg-slate-900/40 space-y-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Current Policy Details
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Type:</span>{" "}
                    <span className="font-semibold text-foreground">{selectedPartForRenew.renewal_policy_type || "Standard"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Current Due:</span>{" "}
                    <span className="font-mono font-bold text-foreground">{selectedPartForRenew.renewal_date || "Not Set"}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1 flex items-center gap-1 text-cyan-700 dark:text-cyan-400">
                  <Calendar className="h-3.5 w-3.5 text-cyan-500" />
                  <span>New Extended Renewal Date *</span>
                </label>
                <AppInput
                  type="date"
                  value={renewModalDate}
                  onChange={(e) => setRenewModalDate(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold block mb-1">Renewal Cost (₹)</label>
                  <AppInput
                    type="number"
                    min="0"
                    value={renewModalCost || ""}
                    onChange={(e) => setRenewModalCost(Number(e.target.value) || 0)}
                    className="font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Service Provider / Telco</label>
                  <AppInput
                    value={renewModalVendor}
                    onChange={(e) => setRenewModalVendor(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">New Policy / Invoice / Transaction #</label>
                <AppInput
                  value={renewModalPolicyNumber}
                  onChange={(e) => setRenewModalPolicyNumber(e.target.value)}
                  className="font-mono"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Renewal Remarks</label>
                <textarea
                  rows={2}
                  value={renewModalNotes}
                  onChange={(e) => setRenewModalNotes(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-border bg-surface text-foreground focus:ring-2 focus:ring-theme-btn-primary outline-none"
                />
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <AppButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsRenewPartOpen(false)}
                  disabled={modalSubmitting}
                >
                  Cancel
                </AppButton>
                <AppButton
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={modalSubmitting}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold gap-1.5"
                >
                  {modalSubmitting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  <span>Confirm Policy Renewal</span>
                </AppButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* VEHICLE INSURANCE POLICY RENEWAL MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {isRenewPolicyModalOpen && selectedVehicleForPolicyRenew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-border w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="p-5 border-b border-border bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-transparent flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center border border-cyan-500/25 shadow-xs">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-foreground">
                      Renew Vehicle Insurance Policy
                    </h3>
                    <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-theme-btn-primary/10 text-theme-btn-primary border border-theme-btn-primary/20">
                      {selectedVehicleForPolicyRenew.registration_number}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedVehicleForPolicyRenew.make} {selectedVehicleForPolicyRenew.model} ({selectedVehicleForPolicyRenew.variant || "Standard"}) • Archive previous policy & issue renewal
                  </p>
                </div>
              </div>
              <AppButton variant="ghost" size="icon-sm" onClick={() => setIsRenewPolicyModalOpen(false)}>
                <X className="h-4 w-4" />
              </AppButton>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveVehiclePolicyRenewal} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Current Active Policy Banner */}
              <div className="p-3.5 rounded-xl border border-cyan-500/20 bg-cyan-50/50 dark:bg-cyan-950/20 flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>Current Active Policy Info</span>
                  </div>
                  <div className="text-xs font-semibold text-foreground">
                    {selectedVehicleForPolicyRenew.insurance_policy_number || "No Policy Number on File"} 
                    <span className="text-muted-foreground font-normal"> ({selectedVehicleForPolicyRenew.insurance_vendor || "Vendor Not Assigned"})</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Expires:</span>
                  <span className="font-mono font-bold text-foreground">
                    {selectedVehicleForPolicyRenew.insurance_expiry_date ? String(selectedVehicleForPolicyRenew.insurance_expiry_date).split("T")[0] : "Expired / Unset"}
                  </span>
                  {renderExpiryBadge(selectedVehicleForPolicyRenew.insurance_expire_days ?? calculateDaysRemaining(selectedVehicleForPolicyRenew.insurance_expiry_date))}
                </div>
              </div>

              {/* Vendor & Policy Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold block mb-1 flex items-center gap-1 text-foreground">
                    <Building2 className="h-3.5 w-3.5 text-theme-btn-primary" />
                    <span>Insurance Provider / Vendor *</span>
                  </label>
                  <select
                    value={renewPolicyVendorId}
                    onChange={(e) => {
                      const vId = e.target.value;
                      setRenewPolicyVendorId(vId);
                      const matched = insuranceVendors.find(v => v.id === vId);
                      if (matched) {
                        setRenewPolicyVendorName(matched.name);
                      }
                    }}
                    className="w-full text-xs p-2.5 rounded-lg border border-border bg-surface text-foreground focus:ring-2 focus:ring-theme-btn-primary outline-none"
                  >
                    <option value="">-- Select from Insurance Masters --</option>
                    {insuranceVendors.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.name} {v.toll_free_number ? `(Toll-Free: ${v.toll_free_number})` : ""}
                      </option>
                    ))}
                  </select>
                  {(!renewPolicyVendorId || !insuranceVendors.some(v => v.id === renewPolicyVendorId)) && (
                    <AppInput
                      value={renewPolicyVendorName}
                      onChange={(e) => setRenewPolicyVendorName(e.target.value)}
                      className="mt-1.5"
                      required
                    />
                  )}
                </div>

                <div>
                  <label className="font-semibold block mb-1 flex items-center gap-1 text-foreground">
                    <Hash className="h-3.5 w-3.5 text-theme-btn-primary" />
                    <span>New Policy / Cover Note # *</span>
                  </label>
                  <AppInput
                    value={renewPolicyNumber}
                    onChange={(e) => setRenewPolicyNumber(e.target.value)}
                    required
                    className="font-mono uppercase"
                  />
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">Official policy or e-cover note number</span>
                </div>
              </div>

              {/* Policy Type & Financials */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Policy Type</label>
                  <select
                    value={renewPolicyType}
                    onChange={(e) => setRenewPolicyType(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-border bg-surface text-foreground focus:ring-2 focus:ring-theme-btn-primary outline-none"
                  >
                    <option value="Comprehensive">Comprehensive Package</option>
                    <option value="Zero Depreciation">Zero Depreciation (Bumper-to-Bumper)</option>
                    <option value="Third-Party Liability">Third-Party Liability Only</option>
                    <option value="Commercial Fleet">Commercial Fleet Transit</option>
                    <option value="Own Damage (Stand-alone)">Own Damage (Stand-alone)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1">IDV (Insured Declared Value ₹)</label>
                  <AppInput
                    type="number"
                    min="0"
                    value={renewPolicyIdv || ""}
                    onChange={(e) => setRenewPolicyIdv(Number(e.target.value) || 0)}
                    className="font-mono font-semibold"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Annual Premium Amount (₹) *</label>
                  <AppInput
                    type="number"
                    min="0"
                    value={renewPolicyPremium || ""}
                    onChange={(e) => setRenewPolicyPremium(Number(e.target.value) || 0)}
                    required
                    className="font-mono font-bold text-cyan-600 dark:text-cyan-400"
                  />
                </div>
              </div>

              {/* Policy Validity Dates */}
              <div className="p-3.5 rounded-xl border border-border bg-slate-50/60 dark:bg-slate-900/40 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-cyan-500" />
                    <span>Policy Validity Period (1-Year Cycle)</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const st = renewPolicyStartDate ? new Date(renewPolicyStartDate) : new Date();
                        const end = new Date(st);
                        end.setFullYear(end.getFullYear() + 1);
                        end.setDate(end.getDate() - 1);
                        setRenewPolicyEndDate(end.toISOString().split("T")[0]);
                      }}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20 transition-colors"
                    >
                      +1 Year (Auto)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const st = renewPolicyStartDate ? new Date(renewPolicyStartDate) : new Date();
                        const end = new Date(st);
                        end.setFullYear(end.getFullYear() + 3);
                        end.setDate(end.getDate() - 1);
                        setRenewPolicyEndDate(end.toISOString().split("T")[0]);
                      }}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 transition-colors"
                    >
                      +3 Years (Long-Term)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold block mb-1">Effective Start Date *</label>
                    <AppInput
                      type="date"
                      value={renewPolicyStartDate}
                      onChange={(e) => setRenewPolicyStartDate(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold block mb-1">Policy Expiration Date *</label>
                    <AppInput
                      type="date"
                      value={renewPolicyEndDate}
                      onChange={(e) => setRenewPolicyEndDate(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Add-on Coverage & Discounts */}
              <div className="p-3.5 rounded-xl border border-border bg-surface space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Add-on Covers & NCB Benefits
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label className="flex items-center gap-2 p-2 rounded-lg border border-border hover:bg-slate-50 dark:hover:bg-slate-900/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={renewPolicyHasRsa}
                      onChange={(e) => setRenewPolicyHasRsa(e.target.checked)}
                      className="rounded text-theme-btn-primary focus:ring-theme-btn-primary"
                    />
                    <span className="text-xs font-medium">Roadside Assistance (RSA)</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-lg border border-border hover:bg-slate-50 dark:hover:bg-slate-900/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={renewPolicyHasZeroDep}
                      onChange={(e) => setRenewPolicyHasZeroDep(e.target.checked)}
                      className="rounded text-theme-btn-primary focus:ring-theme-btn-primary"
                    />
                    <span className="text-xs font-medium">Zero Depreciation (Nil-Dep)</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-lg border border-border hover:bg-slate-50 dark:hover:bg-slate-900/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={renewPolicyHasEngineProtect}
                      onChange={(e) => setRenewPolicyHasEngineProtect(e.target.checked)}
                      className="rounded text-theme-btn-primary focus:ring-theme-btn-primary"
                    />
                    <span className="text-xs font-medium">Engine & Gearbox Protector</span>
                  </label>
                </div>
              </div>

              {/* Reference, Receipt & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Receipt / Payment Reference #</label>
                  <AppInput
                    value={renewPolicyReceiptNo}
                    onChange={(e) => setRenewPolicyReceiptNo(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Policy Document Link / Storage URL</label>
                  <AppInput
                    value={renewPolicyDocUrl}
                    onChange={(e) => setRenewPolicyDocUrl(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Renewal Notes & Audit Remarks</label>
                <textarea
                  rows={2}
                  value={renewPolicyNotes}
                  onChange={(e) => setRenewPolicyNotes(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-border bg-surface text-foreground focus:ring-2 focus:ring-theme-btn-primary outline-none"
                />
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-3 border-t border-border flex items-center justify-between">
                <AppButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsRenewPolicyModalOpen(false);
                    if (selectedVehicleForPolicyRenew) {
                      handleOpenVehiclePolicyHistoryModal(selectedVehicleForPolicyRenew);
                    }
                  }}
                  className="text-indigo-600 dark:text-indigo-400 gap-1.5"
                >
                  <History className="h-3.5 w-3.5" />
                  <span>View All Past Cycles</span>
                </AppButton>

                <div className="flex items-center gap-2">
                  <AppButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsRenewPolicyModalOpen(false)}
                    disabled={modalSubmitting}
                  >
                    Cancel
                  </AppButton>
                  <AppButton
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={modalSubmitting}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold gap-1.5 shadow-md"
                  >
                    {modalSubmitting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                    <span>Confirm & Archive Renewal</span>
                  </AppButton>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* VEHICLE POLICY HISTORY & AUDIT LEDGER MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {isPolicyHistoryModalOpen && selectedVehicleForPolicyHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-border w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-border bg-gradient-to-r from-indigo-500/10 via-cyan-500/10 to-transparent flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/25 shadow-xs">
                  <History className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-foreground">
                      Vehicle Policy Ledger & Historical Tracks
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-md font-mono text-xs font-bold bg-theme-btn-primary text-white">
                      {selectedVehicleForPolicyHistory.registration_number}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedVehicleForPolicyHistory.make} {selectedVehicleForPolicyHistory.model} • Complete chronological ledger of insurance policies & renewals
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <AppButton
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setIsPolicyHistoryModalOpen(false);
                    handleOpenVehiclePolicyRenewModal(selectedVehicleForPolicyHistory);
                  }}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold gap-1.5 shadow-xs"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Renew New Policy</span>
                </AppButton>
                <AppButton variant="ghost" size="icon-sm" onClick={() => setIsPolicyHistoryModalOpen(false)}>
                  <X className="h-4 w-4" />
                </AppButton>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Summary Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl border border-border bg-surface shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Active Status</span>
                  <div className="flex items-center gap-1.5">
                    {renderExpiryBadge(selectedVehicleForPolicyHistory.insurance_expire_days ?? calculateDaysRemaining(selectedVehicleForPolicyHistory.insurance_expiry_date))}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-surface shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Active Insurer</span>
                  <div className="text-xs font-bold truncate text-foreground" title={selectedVehicleForPolicyHistory.insurance_vendor || "Not Configured"}>
                    {selectedVehicleForPolicyHistory.insurance_vendor || "—"}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-surface shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Cycles Tracked</span>
                  <div className="text-sm font-extrabold font-mono text-indigo-600 dark:text-indigo-400">
                    {vehiclePoliciesHistory.length} Policy {vehiclePoliciesHistory.length === 1 ? "Record" : "Records"}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-surface shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cumulative Premium Paid</span>
                  <div className="text-sm font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                    ₹{vehiclePoliciesHistory.reduce((acc, p) => acc + (p.premium_amount || 0), 0).toLocaleString("en-IN")}
                  </div>
                </div>
              </div>

              {/* History Timeline / Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                    <span>Chronological Policy History Ledger</span>
                  </h4>
                  <span className="text-[11px] text-muted-foreground">
                    Sorted from newest to oldest policy cycle
                  </span>
                </div>

                {loadingPolicyHistory ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-3">
                    <ChandakLoader size="md" />
                    <span className="text-xs text-muted-foreground font-medium">Loading vehicle policy history...</span>
                  </div>
                ) : vehiclePoliciesHistory.length === 0 ? (
                  <div className="py-12 text-center rounded-xl border border-dashed border-border bg-slate-50/50 dark:bg-slate-900/30 p-6 space-y-3">
                    <div className="h-12 w-12 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                      <Shield className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-foreground">No Historical Policy Records Found</p>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        This vehicle does not have any archived policy cycles yet. Click below to issue the first tracked renewal policy.
                      </p>
                    </div>
                    <AppButton
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setIsPolicyHistoryModalOpen(false);
                        handleOpenVehiclePolicyRenewModal(selectedVehicleForPolicyHistory);
                      }}
                      className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold gap-1.5"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Create Renewal Policy</span>
                    </AppButton>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {vehiclePoliciesHistory.map((policy, idx) => (
                      <div
                        key={policy.id}
                        className={`p-4 rounded-xl border transition-all ${
                          policy.is_active
                            ? "border-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/15 shadow-sm ring-1 ring-emerald-500/20"
                            : "border-border bg-surface hover:border-slate-300 dark:hover:border-slate-700"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2.5">
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                              policy.is_active
                                ? "bg-emerald-500 text-white shadow-xs"
                                : "bg-slate-100 dark:bg-slate-800 text-muted-foreground border border-border"
                            }`}>
                              {policy.is_active ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                              <span>{policy.is_active ? "Current Active Policy" : `Archived Cycle #${vehiclePoliciesHistory.length - idx}`}</span>
                            </span>

                            <span className="font-mono text-xs font-extrabold text-foreground">
                              {policy.policy_number}
                            </span>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs font-semibold text-foreground">
                              {policy.insurer_name}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-md border border-emerald-500/20">
                              ₹{Number(policy.premium_amount || 0).toLocaleString("en-IN")} Premium
                            </span>
                            <AppButton
                              variant="ghost"
                              size="icon-sm"
                              title="Void / Delete Policy Record"
                              onClick={() => handleDeletePolicyHistoryRecord(policy.id)}
                              className="h-6 w-6 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            >
                              <Trash2 className="h-3 w-3" />
                            </AppButton>
                          </div>
                        </div>

                        {/* Policy Metrics Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs pt-2 border-t border-border/60">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Validity Tenure</span>
                            <span className="font-mono font-medium text-foreground">
                              {String(policy.start_date).split("T")[0]} → {String(policy.end_date).split("T")[0]}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Policy Type & IDV</span>
                            <span className="text-foreground">
                              {policy.policy_type} {policy.idv ? `(IDV ₹${Number(policy.idv).toLocaleString("en-IN")})` : ""}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Add-on Coverages</span>
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {policy.has_roadside_assistance && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">RSA</span>
                              )}
                              {policy.has_zero_depreciation && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-500/10 text-purple-600 border border-purple-500/20">Zero-Dep</span>
                              )}
                              {policy.has_engine_protect && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">Engine</span>
                              )}
                              {policy.ncb_discount_percentage ? (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">NCB {policy.ncb_discount_percentage}%</span>
                              ) : null}
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Receipt & Auditor</span>
                            <span className="text-muted-foreground text-[11px] block truncate">
                              {policy.receipt_number ? `Ref: ${policy.receipt_number}` : "No Receipt Ref"} • by {policy.renewed_by || "Admin"}
                            </span>
                          </div>
                        </div>

                        {policy.notes && (
                          <div className="mt-2 text-[11px] text-muted-foreground bg-slate-50/80 dark:bg-slate-900/60 p-2 rounded-lg border border-border/40">
                            <strong>Remarks:</strong> {policy.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border bg-surface/50 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Enterprise compliance tracks are permanently archived for motor insurance audits & renewals.
              </span>
              <AppButton
                variant="outline"
                size="sm"
                onClick={() => setIsPolicyHistoryModalOpen(false)}
              >
                Close Ledger
              </AppButton>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* VEHICLE PUC RENEWAL MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {isRenewPucModalOpen && selectedVehicleForPucRenew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-border w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="p-5 border-b border-border bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/25 shadow-xs">
                  <Wind className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-foreground">
                      Renew Vehicle PUC (Pollution Under Control)
                    </h3>
                    <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-theme-btn-primary/10 text-theme-btn-primary border border-theme-btn-primary/20">
                      {selectedVehicleForPucRenew.registration_number}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedVehicleForPucRenew.make} {selectedVehicleForPucRenew.model} ({selectedVehicleForPucRenew.fuel_type || "Petrol"}) • Record statutory emission test & certificate
                  </p>
                </div>
              </div>
              <AppButton variant="ghost" size="icon-sm" onClick={() => setIsRenewPucModalOpen(false)}>
                <X className="h-4 w-4" />
              </AppButton>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveVehiclePucRenewal} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Current PUC Info Banner */}
              <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20 flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>Current Active PUC Info</span>
                  </div>
                  <div className="text-xs font-semibold text-foreground">
                    {selectedVehicleForPucRenew.puc_certificate_number || "No PUC Number on File"} 
                    <span className="text-muted-foreground font-normal"> ({selectedVehicleForPucRenew.fuel_type || "Standard Fuel"})</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Expires:</span>
                  <span className="font-mono font-bold text-foreground">
                    {selectedVehicleForPucRenew.puc_expiry_date ? String(selectedVehicleForPucRenew.puc_expiry_date).split("T")[0] : "Expired / Unset"}
                  </span>
                  {renderExpiryBadge(selectedVehicleForPucRenew.puc_expire_days ?? calculateDaysRemaining(selectedVehicleForPucRenew.puc_expiry_date))}
                </div>
              </div>

              {/* Certificate Number & Testing Center */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold block mb-1 flex items-center gap-1 text-foreground">
                    <Hash className="h-3.5 w-3.5 text-emerald-500" />
                    <span>New PUC Certificate Number *</span>
                  </label>
                  <AppInput
                    value={renewPucNumber}
                    onChange={(e) => setRenewPucNumber(e.target.value)}
                    required
                    className="font-mono uppercase"
                  />
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">Official RTO Parivahan PUC barcode / number</span>
                </div>

                <div>
                  <label className="font-semibold block mb-1 flex items-center gap-1 text-foreground">
                    <Building2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Testing Center / Station Name</span>
                  </label>
                  <AppInput
                    value={renewPucTestingCenter}
                    onChange={(e) => setRenewPucTestingCenter(e.target.value)}
                  />
                </div>
              </div>

              {/* Validity Dates */}
              <div className="p-3.5 rounded-xl border border-border bg-slate-50/60 dark:bg-slate-900/40 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-emerald-500" />
                    <span>PUC Validity Period</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const st = renewPucValidFrom ? new Date(renewPucValidFrom) : new Date();
                        const end = new Date(st);
                        end.setMonth(end.getMonth() + 6);
                        end.setDate(end.getDate() - 1);
                        setRenewPucValidUpto(end.toISOString().split("T")[0]);
                      }}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                    >
                      +6 Months (Standard)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const st = renewPucValidFrom ? new Date(renewPucValidFrom) : new Date();
                        const end = new Date(st);
                        end.setFullYear(end.getFullYear() + 1);
                        end.setDate(end.getDate() - 1);
                        setRenewPucValidUpto(end.toISOString().split("T")[0]);
                      }}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-teal-500/10 text-teal-600 dark:text-teal-400 hover:bg-teal-500/20 transition-colors"
                    >
                      +1 Year (BS-VI / BS-IV)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold block mb-1">Effective Test Date (Valid From) *</label>
                    <AppInput
                      type="date"
                      value={renewPucValidFrom}
                      onChange={(e) => setRenewPucValidFrom(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold block mb-1">Certificate Expiry Date (Valid Upto) *</label>
                    <AppInput
                      type="date"
                      value={renewPucValidUpto}
                      onChange={(e) => setRenewPucValidUpto(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Emission Norms & Test Readings */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Emission Norm</label>
                  <select
                    value={renewPucEmissionNorm}
                    onChange={(e) => setRenewPucEmissionNorm(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-border bg-surface text-foreground focus:ring-2 focus:ring-theme-btn-primary outline-none"
                  >
                    <option value="BS-VI">Bharat Stage VI (BS-VI)</option>
                    <option value="BS-IV">Bharat Stage IV (BS-IV)</option>
                    <option value="BS-III">Bharat Stage III (BS-III)</option>
                    <option value="CNG/LPG">CNG / Dual Fuel Statutory</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1">CO % (Carbon Monoxide)</label>
                  <AppInput
                    type="number"
                    step="0.001"
                    min="0"
                    value={renewPucCo !== undefined ? renewPucCo : ""}
                    onChange={(e) => setRenewPucCo(Number(e.target.value))}
                    className="font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">HC (Hydrocarbon ppm)</label>
                  <AppInput
                    type="number"
                    step="0.1"
                    min="0"
                    value={renewPucHc !== undefined ? renewPucHc : ""}
                    onChange={(e) => setRenewPucHc(Number(e.target.value))}
                    className="font-mono"
                  />
                </div>
              </div>

              {/* Fees, Receipt & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Test Fee Paid (₹) *</label>
                  <AppInput
                    type="number"
                    min="0"
                    value={renewPucFee || ""}
                    onChange={(e) => setRenewPucFee(Number(e.target.value) || 0)}
                    required
                    className="font-mono font-bold text-emerald-600 dark:text-emerald-400"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Receipt / Transaction #</label>
                  <AppInput
                    value={renewPucReceiptNo}
                    onChange={(e) => setRenewPucReceiptNo(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Certificate PDF / Image URL</label>
                  <AppInput
                    value={renewPucDocUrl}
                    onChange={(e) => setRenewPucDocUrl(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Inspection Notes & Station Remarks</label>
                <textarea
                  rows={2}
                  value={renewPucNotes}
                  onChange={(e) => setRenewPucNotes(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-border bg-surface text-foreground focus:ring-2 focus:ring-theme-btn-primary outline-none"
                />
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-3 border-t border-border flex items-center justify-between">
                <AppButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsRenewPucModalOpen(false);
                    if (selectedVehicleForPucRenew) {
                      handleOpenVehiclePucHistoryModal(selectedVehicleForPucRenew);
                    }
                  }}
                  className="text-teal-600 dark:text-teal-400 gap-1.5"
                >
                  <History className="h-3.5 w-3.5" />
                  <span>View All Past PUC Cycles</span>
                </AppButton>

                <div className="flex items-center gap-2">
                  <AppButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsRenewPucModalOpen(false)}
                    disabled={modalSubmitting}
                  >
                    Cancel
                  </AppButton>
                  <AppButton
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={modalSubmitting}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 shadow-md"
                  >
                    {modalSubmitting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Wind className="h-3.5 w-3.5" />}
                    <span>Confirm & Archive PUC</span>
                  </AppButton>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* VEHICLE PUC HISTORY & AUDIT LEDGER MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {isPucHistoryModalOpen && selectedVehicleForPucHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-border w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-border bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/25 shadow-xs">
                  <Wind className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-foreground">
                      PUC Certificates Ledger & Emission Audit Tracks
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-md font-mono text-xs font-bold bg-theme-btn-primary text-white">
                      {selectedVehicleForPucHistory.registration_number}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedVehicleForPucHistory.make} {selectedVehicleForPucHistory.model} ({selectedVehicleForPucHistory.fuel_type || "Petrol"}) • Complete historical ledger of emission test certificates
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <AppButton
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setIsPucHistoryModalOpen(false);
                    handleOpenVehiclePucRenewModal(selectedVehicleForPucHistory);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 shadow-xs"
                >
                  <Wind className="h-3.5 w-3.5" />
                  <span>Renew New PUC</span>
                </AppButton>
                <AppButton variant="ghost" size="icon-sm" onClick={() => setIsPucHistoryModalOpen(false)}>
                  <X className="h-4 w-4" />
                </AppButton>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Summary Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl border border-border bg-surface shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Active PUC Status</span>
                  <div className="flex items-center gap-1.5">
                    {renderExpiryBadge(selectedVehicleForPucHistory.puc_expire_days ?? calculateDaysRemaining(selectedVehicleForPucHistory.puc_expiry_date))}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-surface shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Fuel & Norm</span>
                  <div className="text-xs font-bold truncate text-foreground">
                    {selectedVehicleForPucHistory.fuel_type || "Petrol"} • BS-VI
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-surface shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Tests Tracked</span>
                  <div className="text-sm font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                    {vehiclePucHistory.length} Certificate {vehiclePucHistory.length === 1 ? "Record" : "Records"}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-surface shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cumulative Test Fees</span>
                  <div className="text-sm font-extrabold font-mono text-teal-600 dark:text-teal-400">
                    ₹{vehiclePucHistory.reduce((acc, c) => acc + (c.test_fee || 0), 0).toLocaleString("en-IN")}
                  </div>
                </div>
              </div>

              {/* History Timeline / Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Chronological PUC Emission History Ledger</span>
                  </h4>
                  <span className="text-[11px] text-muted-foreground">
                    Sorted from newest to oldest inspection cycle
                  </span>
                </div>

                {loadingPucHistory ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-3">
                    <ChandakLoader size="md" />
                    <span className="text-xs text-muted-foreground font-medium">Loading vehicle PUC history...</span>
                  </div>
                ) : vehiclePucHistory.length === 0 ? (
                  <div className="py-12 text-center rounded-xl border border-dashed border-border bg-slate-50/50 dark:bg-slate-900/30 p-6 space-y-3">
                    <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                      <Wind className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-foreground">No Historical PUC Records Found</p>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        This vehicle does not have any archived PUC certificates yet. Click below to issue the first tracked PUC certificate.
                      </p>
                    </div>
                    <AppButton
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setIsPucHistoryModalOpen(false);
                        handleOpenVehiclePucRenewModal(selectedVehicleForPucHistory);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5"
                    >
                      <Wind className="h-3.5 w-3.5" />
                      <span>Record PUC Certificate</span>
                    </AppButton>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {vehiclePucHistory.map((cert, idx) => (
                      <div
                        key={cert.id}
                        className={`p-4 rounded-xl border transition-all ${
                          cert.is_active
                            ? "border-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/15 shadow-sm ring-1 ring-emerald-500/20"
                            : "border-border bg-surface hover:border-slate-300 dark:hover:border-slate-700"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2.5">
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                              cert.is_active
                                ? "bg-emerald-500 text-white shadow-xs"
                                : "bg-slate-100 dark:bg-slate-800 text-muted-foreground border border-border"
                            }`}>
                              {cert.is_active ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                              <span>{cert.is_active ? "Current Active PUC" : `Archived Certificate #${vehiclePucHistory.length - idx}`}</span>
                            </span>

                            <span className="font-mono text-xs font-extrabold text-foreground">
                              {cert.certificate_number}
                            </span>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs font-semibold text-foreground">
                              {cert.testing_center_name || "RTO Testing Center"}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-md border border-emerald-500/20">
                              ₹{Number(cert.test_fee || 0).toLocaleString("en-IN")} Fee Paid
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                              {cert.test_result || "PASS"}
                            </span>
                            <AppButton
                              variant="ghost"
                              size="icon-sm"
                              title="Void / Delete Certificate Record"
                              onClick={() => handleDeletePucHistoryRecord(cert.id)}
                              className="h-6 w-6 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            >
                              <Trash2 className="h-3 w-3" />
                            </AppButton>
                          </div>
                        </div>

                        {/* PUC Details Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs pt-2 border-t border-border/60">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Validity Range</span>
                            <span className="font-mono font-medium text-foreground">
                              {String(cert.valid_from).split("T")[0]} → {String(cert.valid_upto).split("T")[0]}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Norm & CO %</span>
                            <span className="text-foreground">
                              {cert.emission_norm || "BS-VI"} • CO: {cert.carbon_monoxide_co !== null && cert.carbon_monoxide_co !== undefined ? `${cert.carbon_monoxide_co}%` : "—"}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">HC & Smoke Readings</span>
                            <span className="text-foreground">
                              HC: {cert.hydrocarbon_hc !== null && cert.hydrocarbon_hc !== undefined ? `${cert.hydrocarbon_hc} ppm` : "—"} 
                              {cert.smoke_density_k ? ` • K: ${cert.smoke_density_k}` : ""}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Receipt & Inspector</span>
                            <span className="text-muted-foreground text-[11px] block truncate">
                              {cert.receipt_number ? `Ref: ${cert.receipt_number}` : "No Receipt Ref"} • by {cert.renewed_by || "Admin"}
                            </span>
                          </div>
                        </div>

                        {cert.notes && (
                          <div className="mt-2 text-[11px] text-muted-foreground bg-slate-50/80 dark:bg-slate-900/60 p-2 rounded-lg border border-border/40">
                            <strong>Remarks:</strong> {cert.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border bg-surface/50 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Enterprise PUC test records are archived permanently for statutory emission compliance & fleet audits.
              </span>
              <AppButton
                variant="outline"
                size="sm"
                onClick={() => setIsPucHistoryModalOpen(false)}
              >
                Close Ledger
              </AppButton>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* VEHICLE SPECIFICATION REVISION HISTORY & AUDIT LEDGER MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {isSpecHistoryModalOpen && selectedVehicleForSpecHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-border w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-border bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-transparent flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/25 shadow-xs">
                  <ClipboardCheck className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-foreground">
                      Vehicle Specifications Revision History & Audit Ledger
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-md font-mono text-xs font-bold bg-theme-btn-primary text-white">
                      {selectedVehicleForSpecHistory.registration_number}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedVehicleForSpecHistory.make} {selectedVehicleForSpecHistory.model} ({selectedVehicleForSpecHistory.variant || "Standard"}) • Chronological audit log of all specification & compliance updates
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {canEditVehicle && (
                  <AppButton
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setIsSpecHistoryModalOpen(false);
                      openEditVehicleModal(selectedVehicleForSpecHistory);
                    }}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-semibold gap-1.5 shadow-xs"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>Edit Vehicle</span>
                  </AppButton>
                )}
                <AppButton variant="ghost" size="icon-sm" onClick={() => setIsSpecHistoryModalOpen(false)}>
                  <X className="h-4 w-4" />
                </AppButton>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Summary Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl border border-border bg-surface shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Revisions</span>
                  <div className="text-sm font-extrabold font-mono text-purple-600 dark:text-purple-400">
                    {vehicleSpecHistory.length} {vehicleSpecHistory.length === 1 ? "Audit Entry" : "Audit Entries"}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-surface shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Current Status</span>
                  <div className="text-xs font-bold truncate text-foreground">
                    {selectedVehicleForSpecHistory.status === "IN_STOCK" ? "Available / In Stock" : selectedVehicleForSpecHistory.status === "IN_SERVICE" ? "Active in Service" : selectedVehicleForSpecHistory.status}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-surface shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Current Odometer</span>
                  <div className="text-sm font-extrabold font-mono text-foreground">
                    {Number(selectedVehicleForSpecHistory.odometer_km || 0).toLocaleString("en-IN")} km
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-surface shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Assigned Chauffeur</span>
                  <div className="text-xs font-bold truncate text-foreground">
                    {selectedVehicleForSpecHistory.assignedDriver?.full_name || "Unassigned"}
                  </div>
                </div>
              </div>

              {/* History Timeline */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                    <span>Chronological Specification Audit Trail</span>
                  </h4>
                  <span className="text-[11px] text-muted-foreground">
                    Sorted from newest to oldest change event
                  </span>
                </div>

                {loadingSpecHistory ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-3">
                    <ChandakLoader size="md" />
                    <span className="text-xs text-muted-foreground font-medium">Loading specification history...</span>
                  </div>
                ) : vehicleSpecHistory.length === 0 ? (
                  <div className="py-12 text-center rounded-xl border border-dashed border-border bg-slate-50/50 dark:bg-slate-900/30 p-6 space-y-3">
                    <div className="h-12 w-12 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto">
                      <ClipboardCheck className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-foreground">No Specification Revision History Yet</p>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        This vehicle specifications are in their initial state. Any edits made via "Edit Vehicle Specifications" will automatically generate historical audit records here.
                      </p>
                    </div>
                    {canEditVehicle && (
                      <AppButton
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setIsSpecHistoryModalOpen(false);
                          openEditVehicleModal(selectedVehicleForSpecHistory);
                        }}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-semibold gap-1.5 shadow-xs"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        <span>Edit Vehicle Specifications</span>
                      </AppButton>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {vehicleSpecHistory.map((record, idx) => (
                      <div
                        key={record.id}
                        className="p-4 rounded-xl border border-border bg-surface shadow-2xs hover:border-purple-500/40 transition-colors space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                              Revision #{vehicleSpecHistory.length - idx}
                            </span>
                            <span className="text-xs font-semibold text-foreground">
                              {record.changed_by_name || "Fleet Officer"}
                            </span>
                            {record.changed_by_email && (
                              <span className="text-[11px] text-muted-foreground">
                                ({record.changed_by_email})
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              {new Date(record.created_at).toLocaleString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </span>

                            {canDeleteVehicle && (
                              <button
                                type="button"
                                onClick={() => handleDeleteSpecHistoryRecord(record.id)}
                                className="text-muted-foreground hover:text-rose-500 p-1 rounded-md transition-colors"
                                title="Void audit log entry (Admin Only)"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Summary Bar */}
                        <div className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-border/80 text-xs text-foreground font-medium flex items-center gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <span className="break-words">{record.change_summary}</span>
                        </div>

                        {/* Detailed Diffs if available */}
                        {record.changed_fields && record.changed_fields.length > 0 && record.old_data && record.new_data && (
                          <div className="space-y-1.5 pt-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              Modified Attribute Breakdown ({record.changed_fields.length} {record.changed_fields.length === 1 ? "field" : "fields"})
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {record.changed_fields.map((fieldKey) => {
                                const oldV = record.old_data?.[fieldKey];
                                const newV = record.new_data?.[fieldKey];
                                const formatVal = (v: any) => {
                                  if (v === null || v === undefined || v === "") return "None / Empty";
                                  if (typeof v === "boolean") return v ? "Yes / Active" : "No / Inactive";
                                  return String(v);
                                };
                                return (
                                  <div
                                    key={fieldKey}
                                    className="p-2.5 rounded-lg border border-border/60 bg-surface/50 text-[11px] space-y-1"
                                  >
                                    <div className="font-semibold text-foreground uppercase text-[10px] tracking-wider text-muted-foreground">
                                      {fieldKey.replace(/_/g, " ")}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                      <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-mono truncate max-w-[45%]">
                                        {formatVal(oldV)}
                                      </span>
                                      <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono truncate max-w-[45%]">
                                        {formatVal(newV)}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border bg-surface/50 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                All vehicle specification revisions are tracked for fleet audit trails and statutory compliance.
              </span>
              <AppButton
                variant="outline"
                size="sm"
                onClick={() => setIsSpecHistoryModalOpen(false)}
              >
                Close Ledger
              </AppButton>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* 1. VIEW VEHICLE INSPECTOR MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {viewingVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-border w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-border bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-theme-btn-primary/15 text-theme-btn-primary flex items-center justify-center border border-theme-btn-primary/25 shrink-0 shadow-xs">
                  <Car className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-foreground">
                      {viewingVehicle.make} {viewingVehicle.model} {viewingVehicle.variant ? `(${viewingVehicle.variant})` : ""}
                    </h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      viewingVehicle.status === "IN_STOCK"
                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                        : viewingVehicle.status === "IN_SERVICE"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                    }`}>
                      {viewingVehicle.status === "IN_STOCK" ? "Available / In Stock" : viewingVehicle.status === "IN_SERVICE" ? "Active in Service" : viewingVehicle.status}
                    </span>
                  </div>
                  <div className="mt-1">
                    {renderHsrpPlate(viewingVehicle.registration_number)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <AppButton
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const v = viewingVehicle;
                    setViewingVehicle(null);
                    handleOpenVehicleSpecHistoryModal(v);
                  }}
                  className="text-xs h-8 font-semibold gap-1.5 text-purple-600 dark:text-purple-400 border-purple-500/30 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950/30 shadow-2xs"
                  title="View specification change history"
                >
                  <ClipboardCheck className="h-3.5 w-3.5" />
                  <span>Revision History</span>
                </AppButton>
                {canEditVehicle && (
                  <AppButton
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      const v = viewingVehicle;
                      setViewingVehicle(null);
                      openEditVehicleModal(v);
                    }}
                    className="bg-theme-btn-primary hover:bg-theme-btn-primary-secondary text-white text-xs h-8 font-semibold gap-1.5 shadow-xs"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>Edit Vehicle</span>
                  </AppButton>
                )}
                <AppButton
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setViewingVehicle(null)}
                >
                  <X className="h-4 w-4" />
                </AppButton>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-5 overflow-y-auto flex-1 text-xs">
              {/* Primary Specs & Identity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl border border-border/70 bg-slate-50/50 dark:bg-slate-900/40 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Category / Body</span>
                  <div className="font-semibold text-foreground text-sm">{viewingVehicle.category || "Standard"}</div>
                </div>
                <div className="p-3 rounded-xl border border-border/70 bg-slate-50/50 dark:bg-slate-900/40 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Fuel / Powertrain</span>
                  <div className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                    <Fuel className="h-3.5 w-3.5 text-amber-500" />
                    <span>{viewingVehicle.fuel_type || "Petrol"}</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-border/70 bg-slate-50/50 dark:bg-slate-900/40 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Current Odometer</span>
                  <div className="font-mono font-bold text-foreground text-sm">
                    {viewingVehicle.odometer_km ? `${viewingVehicle.odometer_km.toLocaleString()} km` : "0 km"}
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-border/70 bg-slate-50/50 dark:bg-slate-900/40 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Assigned Chauffeur</span>
                  <div className="font-semibold text-foreground text-sm truncate">
                    {viewingVehicle.assignedDriver?.full_name || "Unassigned Pool"}
                  </div>
                </div>
              </div>

              {/* Technical Specifications */}
              <div className="p-4 rounded-xl border border-border bg-surface space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Gauge className="h-4 w-4 text-theme-btn-primary" />
                  <span>Technical & Powertrain Details</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Chassis / VIN:</span>
                    <span className="font-mono font-semibold text-foreground">{viewingVehicle.vin_chassis_number || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Engine Number:</span>
                    <span className="font-mono font-semibold text-foreground">{viewingVehicle.engine_number || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Paint Color:</span>
                    <span className="font-semibold text-foreground">{viewingVehicle.paint_color || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Registration Date:</span>
                    <span className="font-mono font-semibold text-foreground">{viewingVehicle.registration_date || "—"}</span>
                  </div>
                </div>
              </div>

              {/* Statutory Compliance: Insurance & PUC Snapshots */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Insurance Policy Card */}
                <div className="p-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-800 dark:text-cyan-300 flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-cyan-600" />
                      <span>Motor Insurance Policy</span>
                    </div>
                    {viewingVehicle.insurance_expiry_date && (() => {
                      const days = calculateDaysRemaining(viewingVehicle.insurance_expiry_date);
                      if (days === null) return null;
                      return days < 0 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/25">
                          Expired {Math.abs(days)}d ago
                        </span>
                      ) : days <= 30 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25">
                          Expires in {days}d
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
                          Valid ({days}d)
                        </span>
                      );
                    })()}
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Underwriter:</span>
                      <span className="font-semibold text-foreground">{viewingVehicle.insurance_vendor || "—"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Policy Number:</span>
                      <span className="font-mono font-bold text-foreground">{viewingVehicle.insurance_policy_number || "—"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Expiry Date:</span>
                      <span className="font-mono font-bold text-foreground">{viewingVehicle.insurance_expiry_date || "—"}</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-cyan-500/20 flex items-center justify-end gap-2">
                    <AppButton
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const v = viewingVehicle;
                        setViewingVehicle(null);
                        handleOpenVehiclePolicyHistoryModal(v);
                      }}
                      className="h-7 text-xs px-2.5 text-cyan-700 dark:text-cyan-300 border-cyan-500/30 gap-1"
                    >
                      <History className="h-3 w-3" />
                      <span>History</span>
                    </AppButton>
                    <AppButton
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        const v = viewingVehicle;
                        setViewingVehicle(null);
                        handleOpenVehiclePolicyRenewModal(v);
                      }}
                      className="h-7 text-xs px-2.5 bg-cyan-600 hover:bg-cyan-700 text-white gap-1 shadow-2xs font-semibold"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Renew Policy</span>
                    </AppButton>
                  </div>
                </div>

                {/* PUC Certificate Card */}
                <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <Wind className="h-4 w-4 text-emerald-600" />
                      <span>Pollution Under Control (PUC)</span>
                    </div>
                    {viewingVehicle.puc_expiry_date && (() => {
                      const days = calculateDaysRemaining(viewingVehicle.puc_expiry_date);
                      if (days === null) return null;
                      return days < 0 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/25">
                          Expired {Math.abs(days)}d ago
                        </span>
                      ) : days <= 30 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25">
                          Expires in {days}d
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
                          Valid ({days}d)
                        </span>
                      );
                    })()}
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Certificate #:</span>
                      <span className="font-mono font-bold text-foreground">{viewingVehicle.puc_certificate_number || "—"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Expiry Date:</span>
                      <span className="font-mono font-bold text-foreground">{viewingVehicle.puc_expiry_date || "—"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Fitness Expiry:</span>
                      <span className="font-mono font-bold text-foreground">{viewingVehicle.fitness_expiry_date || "—"}</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-end gap-2">
                    <AppButton
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const v = viewingVehicle;
                        setViewingVehicle(null);
                        handleOpenVehiclePucHistoryModal(v);
                      }}
                      className="h-7 text-xs px-2.5 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1"
                    >
                      <History className="h-3 w-3" />
                      <span>History</span>
                    </AppButton>
                    <AppButton
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        const v = viewingVehicle;
                        setViewingVehicle(null);
                        handleOpenVehiclePucRenewModal(v);
                      }}
                      className="h-7 text-xs px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white gap-1 shadow-2xs font-semibold"
                    >
                      <Wind className="h-3 w-3" />
                      <span>Renew PUC</span>
                    </AppButton>
                  </div>
                </div>
              </div>

              {/* RTO & Statutory Compliance */}
              <div className="p-4 rounded-xl border border-border bg-surface space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-blue-500" />
                  <span>RTO Registration Details</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">RTO Office:</span>
                    <span className="font-semibold text-foreground">{viewingVehicle.rto_office || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Registered Owner:</span>
                    <span className="font-semibold text-foreground">{viewingVehicle.registered_owner || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">RTO Registered Mobile:</span>
                    <span className="font-mono font-semibold text-foreground">{viewingVehicle.rto_rmn || "—"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Vehicle ID: <strong className="font-mono text-foreground">{viewingVehicle.id}</strong>
              </span>
              <div className="flex items-center gap-2">
                <AppButton
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const v = viewingVehicle;
                    setViewingVehicle(null);
                    handleOpenVehicleSpecHistoryModal(v);
                  }}
                  className="text-xs h-9 px-3 font-semibold gap-1.5 text-purple-600 dark:text-purple-400 border-purple-500/30 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950/30 shadow-2xs"
                  title="View specification revision history and audit ledger"
                >
                  <ClipboardCheck className="h-3.5 w-3.5" />
                  <span>Revision History</span>
                </AppButton>
                {canEditVehicle && (
                  <AppButton
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      const v = viewingVehicle;
                      setViewingVehicle(null);
                      openEditVehicleModal(v);
                    }}
                    className="bg-theme-btn-primary hover:bg-theme-btn-primary-secondary text-white text-xs h-9 px-3 font-semibold gap-1.5 shadow-xs"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>Edit Vehicle</span>
                  </AppButton>
                )}
                <AppButton
                  variant="outline"
                  size="sm"
                  onClick={() => setViewingVehicle(null)}
                  className="text-xs h-9 px-4 font-semibold"
                >
                  Close
                </AppButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* 2. VIEW DRIVER INSPECTOR MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {viewingDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-border w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-border bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/25 shrink-0 shadow-xs">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-foreground">{viewingDriver.full_name}</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      viewingDriver.is_active
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                    }`}>
                      {viewingDriver.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {viewingDriver.experience_years ? `${viewingDriver.experience_years} Yrs Experience • ` : ""}
                    Commercial Fleet Chauffeur
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {canManageDrivers && (
                  <AppButton
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      const d = viewingDriver;
                      setViewingDriver(null);
                      openEditDriverModal(d);
                    }}
                    className="bg-theme-btn-primary hover:bg-theme-btn-primary-secondary text-white text-xs h-8 font-semibold gap-1.5 shadow-xs"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>Edit Driver</span>
                  </AppButton>
                )}
                <AppButton
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setViewingDriver(null)}
                >
                  <X className="h-4 w-4" />
                </AppButton>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Contact & Profile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-border bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-blue-500" />
                    <span>Primary Contact</span>
                  </span>
                  <div className="text-sm font-bold text-foreground">
                    <a href={`tel:${viewingDriver.phone}`} className="hover:underline text-theme-btn-primary font-mono">
                      {viewingDriver.phone || "—"}
                    </a>
                  </div>
                  {viewingDriver.emergency_contact && (
                    <div className="text-[11px] text-muted-foreground pt-1 border-t border-border">
                      Emergency Contact: <span className="font-mono text-foreground font-semibold">{viewingDriver.emergency_contact}</span>
                    </div>
                  )}
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Car className="h-3.5 w-3.5 text-purple-500" />
                    <span>Assigned Fleet Vehicle</span>
                  </span>
                  <div>
                    {(() => {
                      const assignedVeh = vehicles.find(v => v.id === viewingDriver.assigned_vehicle_id || v.assignedDriver?.id === viewingDriver.id);
                      return assignedVeh ? (
                        <div className="space-y-1">
                          <div>{renderHsrpPlate(assignedVeh.registration_number)}</div>
                          <div className="text-[11px] text-muted-foreground font-medium">{assignedVeh.make} {assignedVeh.model}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">No primary vehicle assigned (Pool Driver)</span>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Driving License & Statutory Compliance */}
              <div className="p-4 rounded-xl border border-border bg-surface space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    <span>Commercial Driving License (DL)</span>
                  </div>
                  {viewingDriver.license_expiry_date && (() => {
                    const days = calculateDaysRemaining(viewingDriver.license_expiry_date);
                    if (days === null) return null;
                    return days < 0 ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/25">
                        Expired {Math.abs(days)}d ago
                      </span>
                    ) : days <= 30 ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25">
                        Expires in {days}d
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
                        Valid ({days}d remaining)
                      </span>
                    );
                  })()}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">DL Number:</span>
                    <span className="font-mono font-bold text-foreground">{viewingDriver.license_number || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">DL Expiry Date:</span>
                    <span className="font-mono font-bold text-foreground">{viewingDriver.license_expiry_date || "—"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Driver Record ID: <strong className="font-mono text-foreground">{viewingDriver.id}</strong>
              </span>
              <div className="flex items-center gap-2">
                {canManageDrivers && (
                  <AppButton
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      const d = viewingDriver;
                      setViewingDriver(null);
                      openEditDriverModal(d);
                    }}
                    className="bg-theme-btn-primary hover:bg-theme-btn-primary-secondary text-white text-xs h-9 px-3 font-semibold gap-1.5 shadow-xs"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>Edit Driver</span>
                  </AppButton>
                )}
                <AppButton
                  variant="outline"
                  size="sm"
                  onClick={() => setViewingDriver(null)}
                  className="text-xs h-9 px-4 font-semibold"
                >
                  Close
                </AppButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* 3. VIEW TRIP / TRAVELER INSPECTOR MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {viewingTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-border w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-border bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/25 shrink-0 shadow-xs">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-foreground">{viewingTrip.traveler_name}</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      viewingTrip.status === "IN_PROGRESS"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        : viewingTrip.status === "COMPLETED"
                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                        : viewingTrip.status === "CANCELLED"
                        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                    }`}>
                      {viewingTrip.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {viewingTrip.purpose || "Official Corporate Transit / Dispatch"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <AppButton
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setViewingTrip(null)}
                >
                  <X className="h-4 w-4" />
                </AppButton>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Journey Route Details */}
              <div className="p-4 rounded-xl border border-border bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Transit Route & Itinerary
                </div>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <span className="text-foreground">{viewingTrip.origin}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-theme-btn-primary font-bold">{viewingTrip.destination}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Departure Timing:</span>
                    <span className="font-mono font-semibold text-foreground">{viewingTrip.planned_start_time || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Expected Return:</span>
                    <span className="font-mono font-semibold text-foreground">{viewingTrip.planned_end_time || "—"}</span>
                  </div>
                </div>
              </div>

              {/* Asset & Chauffeur Allocation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-border bg-surface space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Dispatched Vehicle</span>
                  <div>{renderHsrpPlate(viewingTrip.vehicle_reg)}</div>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-surface space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Assigned Chauffeur</span>
                  <div className="text-sm font-bold text-foreground">{viewingTrip.driver_name || "—"}</div>
                </div>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 border-t border-border bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {canDispatchTrips && viewingTrip.status === "PLANNED" && (
                  <AppButton
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const id = viewingTrip.id;
                      setViewingTrip(null);
                      handleUpdateTripStatus(id, "IN_PROGRESS");
                    }}
                    className="h-8 text-xs text-emerald-600 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 gap-1 font-semibold"
                  >
                    <Play className="h-3.5 w-3.5" />
                    <span>Start Movement</span>
                  </AppButton>
                )}
                {canDispatchTrips && viewingTrip.status === "IN_PROGRESS" && (
                  <AppButton
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const id = viewingTrip.id;
                      setViewingTrip(null);
                      handleUpdateTripStatus(id, "COMPLETED");
                    }}
                    className="h-8 text-xs text-blue-600 border-blue-300 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 gap-1 font-semibold"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Complete Movement</span>
                  </AppButton>
                )}
              </div>

              <AppButton
                variant="outline"
                size="sm"
                onClick={() => setViewingTrip(null)}
                className="text-xs h-9 px-4 font-semibold"
              >
                Close
              </AppButton>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* 4. VIEW PART / ACCESSORY INSPECTOR MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {viewingPart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-border w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-border bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/25 shrink-0 shadow-xs">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-foreground">{viewingPart.name}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                      {viewingPart.brand}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 font-mono">
                      {viewingPart.category}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {viewingPart.part_number ? `SKU / Part #: ${viewingPart.part_number} • ` : ""}
                    {viewingPart.serial_number ? `S/N: ${viewingPart.serial_number} • ` : ""}
                    Asset Lifecycle Master
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <AppButton
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const p = viewingPart;
                    setViewingPart(null);
                    openEditPartModal(p);
                  }}
                  className="bg-theme-btn-primary hover:bg-theme-btn-primary-secondary text-white text-xs h-8 font-semibold gap-1.5 shadow-xs"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>Edit Part</span>
                </AppButton>
                <AppButton
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setViewingPart(null)}
                >
                  <X className="h-4 w-4" />
                </AppButton>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-5 overflow-y-auto flex-1 text-xs">
              {/* Procurement & Valuation */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl border border-border/70 bg-slate-50/50 dark:bg-slate-900/40 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Purchase Date</span>
                  <div className="font-mono font-bold text-foreground text-sm">{viewingPart.purchase_date || "—"}</div>
                </div>
                <div className="p-3 rounded-xl border border-border/70 bg-slate-50/50 dark:bg-slate-900/40 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Quantity</span>
                  <div className="font-mono font-bold text-foreground text-sm">{viewingPart.quantity} units</div>
                </div>
                <div className="p-3 rounded-xl border border-border/70 bg-slate-50/50 dark:bg-slate-900/40 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Unit Price</span>
                  <div className="font-mono font-bold text-foreground text-sm">₹{Number(viewingPart.unit_price || 0).toLocaleString("en-IN")}</div>
                </div>
                <div className="p-3 rounded-xl border border-border/70 bg-slate-50/50 dark:bg-slate-900/40 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Valuation</span>
                  <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    ₹{(Number(viewingPart.quantity || 1) * Number(viewingPart.unit_price || 0)).toLocaleString("en-IN")}
                  </div>
                </div>
              </div>

              {/* Warranty & Shelf Expiry Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* OEM Warranty Card */}
                <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-300 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-indigo-600" />
                    <span>OEM Warranty Terms</span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Coverage Term:</span>
                      <span className="font-semibold text-foreground">
                        {viewingPart.warranty_months ? `${viewingPart.warranty_months} Months (${viewingPart.warranty_type || "Standard"})` : "No Term"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Warranty Expiry:</span>
                      <span className="font-mono font-bold text-foreground">{viewingPart.warranty_expiry_date || "—"}</span>
                    </div>
                  </div>
                </div>

                {/* DOM & Shelf Life */}
                <div className="p-4 rounded-xl border border-border bg-surface space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-slate-500" />
                    <span>Manufacturing & Shelf Life</span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">DOM (Mfg Date):</span>
                      <span className="font-mono font-semibold text-foreground">{viewingPart.manufacturing_date || "—"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Shelf Expiry:</span>
                      <span className="font-mono font-bold text-foreground">{viewingPart.expiry_date || "—"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recurring Renewal Policy */}
              {viewingPart.has_renewal_policy && (
                <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-500/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-purple-800 dark:text-purple-300 flex items-center gap-1.5">
                      <Zap className="h-4 w-4 text-purple-600" />
                      <span>Recurring Renewal Policy ({viewingPart.renewal_policy_type || "Standard"})</span>
                    </div>
                    <AppButton
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const p = viewingPart;
                        setViewingPart(null);
                        openRenewPartModal(p);
                      }}
                      className="h-7 text-xs px-2.5 text-purple-700 dark:text-purple-300 border-purple-500/30 hover:bg-purple-100 dark:hover:bg-purple-950/40 gap-1 font-semibold"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Renew Policy</span>
                    </AppButton>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">Renewal Due Date: </span>
                      <span className="font-mono font-bold text-foreground">{viewingPart.renewal_date || "—"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Renewal Cost: </span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {viewingPart.renewal_cost ? `₹${Number(viewingPart.renewal_cost).toLocaleString("en-IN")}/cycle` : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Assignment & Vehicle Mount */}
              <div className="p-4 rounded-xl border border-border bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Asset Assignment & Mounting State
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div>
                    {viewingPart.assigned_vehicle_reg ? (
                      <div className="flex items-center gap-2">
                        <span>Mounted on:</span>
                        {renderHsrpPlate(viewingPart.assigned_vehicle_reg)}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Status: In Warehouse Inventory</span>
                    )}
                  </div>
                  {viewingPart.installation_date && (
                    <div className="text-muted-foreground">
                      Installed Date: <span className="font-mono font-semibold text-foreground">{viewingPart.installation_date}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Part ID: <strong className="font-mono text-foreground">{viewingPart.id}</strong>
              </span>
              <div className="flex items-center gap-2">
                <AppButton
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const p = viewingPart;
                    setViewingPart(null);
                    openEditPartModal(p);
                  }}
                  className="bg-theme-btn-primary hover:bg-theme-btn-primary-secondary text-white text-xs h-9 px-3 font-semibold gap-1.5 shadow-xs"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>Edit Part</span>
                </AppButton>
                <AppButton
                  variant="outline"
                  size="sm"
                  onClick={() => setViewingPart(null)}
                  className="text-xs h-9 px-4 font-semibold"
                >
                  Close
                </AppButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* 5. VIEW INSURANCE VENDOR INSPECTOR MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {viewingVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-border w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-border bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/25 shrink-0 shadow-xs">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-foreground">{viewingVendor.name}</h3>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                      {viewingVendor.code}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      viewingVendor.is_active !== false
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700"
                    }`}>
                      {viewingVendor.is_active !== false ? "Active Underwriter" : "Disabled"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Authorized Fleet Motor Insurance Underwriter & Policy Desk
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <AppButton
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const vn = viewingVendor;
                    setViewingVendor(null);
                    openEditVendorModal(vn);
                  }}
                  className="bg-theme-btn-primary hover:bg-theme-btn-primary-secondary text-white text-xs h-8 font-semibold gap-1.5 shadow-xs"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>Edit Vendor</span>
                </AppButton>
                <AppButton
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setViewingVendor(null)}
                >
                  <X className="h-4 w-4" />
                </AppButton>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* 24x7 Roadside Assistance Banner */}
              {viewingVendor.support_toll_free && (
                <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Phone className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                        24x7 Emergency Roadside Assistance (RSA)
                      </div>
                      <div className="font-mono font-bold text-base text-foreground mt-0.5">
                        {viewingVendor.support_toll_free}
                      </div>
                    </div>
                  </div>
                  <a
                    href={`tel:${viewingVendor.support_toll_free}`}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-2xs inline-flex items-center gap-1 shrink-0"
                  >
                    <Phone className="h-3 w-3" />
                    <span>Call Helpline</span>
                  </a>
                </div>
              )}

              {/* Contact Person & Claims Desk */}
              <div className="p-4 rounded-xl border border-border bg-surface space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-blue-500" />
                  <span>Account Manager & Claims Support</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Contact Person:</span>
                    <span className="font-semibold text-foreground">{viewingVendor.contact_person || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Direct Phone:</span>
                    {viewingVendor.contact_number ? (
                      <a href={`tel:${viewingVendor.contact_number}`} className="font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline">
                        {viewingVendor.contact_number}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Official Email:</span>
                    {viewingVendor.email ? (
                      <a href={`mailto:${viewingVendor.email}`} className="font-mono text-foreground hover:underline">
                        {viewingVendor.email}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Claim Portal & Description */}
              <div className="p-4 rounded-xl border border-border bg-slate-50/50 dark:bg-slate-900/40 space-y-2 text-xs">
                {viewingVendor.website && (
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Claims Portal / Website:</span>
                    <a
                      href={viewingVendor.website.startsWith("http") ? viewingVendor.website : `https://${viewingVendor.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-theme-btn-primary hover:underline font-mono text-xs inline-flex items-center gap-1 font-semibold"
                    >
                      <span>{viewingVendor.website}</span>
                      <span>↗</span>
                    </a>
                  </div>
                )}
                {viewingVendor.description && (
                  <div className="pt-2 border-t border-border">
                    <span className="text-muted-foreground block text-[11px]">Underwriter Description:</span>
                    <p className="text-foreground mt-0.5">{viewingVendor.description}</p>
                  </div>
                )}
              </div>

              {/* Insured Fleet Summary */}
              {(() => {
                const coveredVehs = vehicles.filter(
                  v => v.insurance_vendor_id === viewingVendor.id || (v.insurance_vendor && v.insurance_vendor.toLowerCase() === viewingVendor.name.toLowerCase())
                );
                return (
                  <div className="p-4 rounded-xl border border-border bg-surface space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Car className="h-4 w-4 text-purple-500" />
                        <span>Insured Fleet Portfolio</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                        {coveredVehs.length} {coveredVehs.length === 1 ? "Vehicle" : "Vehicles"}
                      </span>
                    </div>
                    {coveredVehs.length > 0 ? (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {coveredVehs.map(v => (
                          <div key={v.id}>
                            {renderHsrpPlate(v.registration_number)}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground italic text-xs">No vehicles currently linked to this underwriter.</p>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Vendor Code: <strong className="font-mono text-foreground">{viewingVendor.code}</strong>
              </span>
              <div className="flex items-center gap-2">
                <AppButton
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const vn = viewingVendor;
                    setViewingVendor(null);
                    openEditVendorModal(vn);
                  }}
                  className="bg-theme-btn-primary hover:bg-theme-btn-primary-secondary text-white text-xs h-9 px-3 font-semibold gap-1.5 shadow-xs"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>Edit Vendor</span>
                </AppButton>
                <AppButton
                  variant="outline"
                  size="sm"
                  onClick={() => setViewingVendor(null)}
                  className="text-xs h-9 px-4 font-semibold"
                >
                  Close
                </AppButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* CONFIRM DELETE DIALOG */}
      {/* ---------------------------------------------------------------------- */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-border w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-500/25 shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Confirm Deletion</h3>
                <p className="text-xs text-muted-foreground mt-0.5">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Are you sure you want to permanently delete <strong className="text-foreground">{deleteTarget.label}</strong>?
            </p>

            <div className="pt-4 border-t border-border flex items-center justify-end gap-2">
              <AppButton 
                variant="ghost" 
                size="sm" 
                onClick={() => setDeleteTarget(null)}
                disabled={modalSubmitting}
              >
                Cancel
              </AppButton>
              <AppButton 
                variant="primary" 
                size="sm" 
                onClick={handleConfirmDelete}
                disabled={modalSubmitting}
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
              >
                {modalSubmitting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 mr-1" />}
                <span>Delete Permanently</span>
              </AppButton>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
