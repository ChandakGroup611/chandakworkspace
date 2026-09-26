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
  Wind,
  Paperclip,
  UploadCloud,
  Download,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  RotateCw,
  CalendarSync,
  Gift,
  Ticket,
  BadgePercent,
  Percent,
  Calculator,
  Columns,
  Layers,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  IndianRupee,
  CalendarClock
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
  VehicleDocumentRecord,
  fetchVehicleDocumentsAction,
  createVehicleDocumentAction,
  deleteVehicleDocumentAction,
  DriverRecord,
  TripRecord,
  MaintenanceRecord,
  MaintenanceAttachment,
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
  deleteVehicleSpecificationHistoryRecordAction,
  VehicleServiceEntitlementRecord,
  UnifiedVehicleRenewalTimelineItem,
  fetchVehicleServiceEntitlementsAction,
  createVehicleServiceEntitlementAction,
  redeemVehicleServiceEntitlementAction,
  deleteVehicleServiceEntitlementAction,
  fetchVehicleUnifiedRenewalsTimelineAction
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

export const VEHICLE_DOC_TYPES = [
  { value: "PUC", label: "PUC Certificate", badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25" },
  { value: "INSURANCE", label: "Insurance Policy & Cover Note", badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25" },
  { value: "RC", label: "RC Book (Smart Card)", badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25" },
  { value: "FITNESS", label: "Fitness Certificate", badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25" },
  { value: "PERMIT", label: "Commercial / Tourist Permit", badgeColor: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/25" },
  { value: "ROAD_TAX", label: "Road Tax Receipt", badgeColor: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/25" },
  { value: "INVOICE", label: "Purchase Invoice & OEM Bill", badgeColor: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/25" },
  { value: "OTHER", label: "Other Legal / Transport Document", badgeColor: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/25" }
];

// Module-level in-memory cache for FleetDesk data
let fleetDataCache: {
  stats?: VehicleDashboardStats;
  vehicles?: VehicleRecord[];
  drivers?: DriverRecord[];
  trips?: TripRecord[];
  maintenance?: MaintenanceRecord[];
  vendors?: InsuranceVendorRecord[];
  parts?: PartAccessoryRecord[];
  timestamp: number;
} | null = null;


// ============================================================================
// TRANSACTION FORM LAYOUT & WORKING DOCUMENT CANVAS (ENTERPRISE ERP VIEWPORT)
// ============================================================================

interface TransactionFormLayoutProps {
  title: string;
  badge?: string;
  category?: string;
  icon: React.ElementType;
  iconBg?: string;
  description: string;
  breadcrumbs: Array<{ label: string; onClick?: () => void }>;
  onBack: () => void;
  backLabel: string;
  onReset?: () => void;
  onSave?: (e?: any) => void | Promise<void>;
  saveLabel?: string;
  saveIcon?: React.ElementType;
  isSubmitting?: boolean;
  isSaveDisabled?: boolean;
  saveButton?: React.ReactNode;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}

function TransactionFormLayout({
  title,
  badge,
  category,
  icon: Icon,
  iconBg,
  description,
  breadcrumbs,
  onBack,
  backLabel,
  onReset,
  onSave,
  saveLabel = "Save Record",
  saveIcon: SaveIcon,
  isSubmitting = false,
  isSaveDisabled = false,
  saveButton,
  headerActions,
  children
}: TransactionFormLayoutProps) {
  return (
    <div className="w-full flex-1 flex flex-col space-y-8 animate-in fade-in duration-200">
      {/* Top Navigation & Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <AppButton
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-xs h-8 px-2.5 gap-1.5 text-muted-foreground hover:text-foreground font-semibold"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{backLabel}</span>
            </AppButton>
            {breadcrumbs.map((bc, idx) => (
              <React.Fragment key={idx}>
                <span className="text-border text-xs">/</span>
                {bc.onClick ? (
                  <button
                    type="button"
                    onClick={bc.onClick}
                    className="text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
                  >
                    {bc.label}
                  </button>
                ) : (
                  <span className="text-xs text-muted-foreground font-medium">{bc.label}</span>
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="flex items-center gap-3 pt-1">
            <div className={`h-11 w-11 rounded-xl flex items-center justify-center border shrink-0 ${iconBg || "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"}`}>
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5 flex-wrap">
                <span>{title}</span>
                {badge && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-theme-btn-primary/10 text-theme-btn-primary border border-theme-btn-primary/20">
                    {badge}
                  </span>
                )}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2.5 flex-wrap self-end md:self-center">
          {headerActions}
          <AppButton
            type="button"
            variant="outline"
            size="sm"
            onClick={onBack}
            className="text-xs h-9 px-4 font-semibold"
          >
            Cancel
          </AppButton>
          {onReset && (
            <AppButton
              type="button"
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="text-xs h-9 text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Reset Form
            </AppButton>
          )}
          {saveButton ? (
            saveButton
          ) : onSave ? (
            <AppButton
              type="button"
              variant="primary"
              size="sm"
              disabled={isSubmitting || isSaveDisabled}
              onClick={(e) => onSave?.(e)}
              className="bg-theme-btn-primary hover:bg-theme-btn-primary-secondary text-white text-xs h-9 font-semibold gap-1.5 shadow-xs px-5"
            >
              {isSubmitting ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : SaveIcon ? (
                <SaveIcon className="h-3.5 w-3.5" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              <span>{saveLabel}</span>
            </AppButton>
          ) : null}
        </div>
      </div>

      {/* Transaction Canvas */}
      <div className="space-y-6">
        {children}
      </div>

      {/* Bottom Back & Action Flow */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border pt-6 pb-12">
        <AppButton
          type="button"
          variant="outline"
          size="sm"
          onClick={onBack}
          className="text-xs h-9 px-4 gap-1.5 font-semibold"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{backLabel}</span>
        </AppButton>

        <div className="flex items-center gap-2.5 flex-wrap">
          {headerActions}
          <AppButton
            type="button"
            variant="outline"
            size="sm"
            onClick={onBack}
            className="text-xs h-9 px-4 font-semibold"
          >
            Cancel
          </AppButton>
          {onReset && (
            <AppButton
              type="button"
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="text-xs h-9 text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Reset Form
            </AppButton>
          )}
          {saveButton ? (
            saveButton
          ) : onSave ? (
            <AppButton
              type="button"
              variant="primary"
              size="sm"
              disabled={isSubmitting || isSaveDisabled}
              onClick={(e) => onSave?.(e)}
              className="bg-theme-btn-primary hover:bg-theme-btn-primary-secondary text-white text-xs h-9 font-semibold gap-1.5 shadow-xs px-5"
            >
              {isSubmitting ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : SaveIcon ? (
                <SaveIcon className="h-3.5 w-3.5" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              <span>{saveLabel}</span>
            </AppButton>
          ) : null}
        </div>
      </div>
    </div>
  );
}

interface WorkingDocumentLayoutProps {
  title: string;
  badge?: string;
  badgeColor?: string;
  category?: string;
  icon: React.ElementType;
  iconBg?: string;
  description: string;
  breadcrumbs: Array<{ label: string; onClick?: () => void }>;
  onBack: () => void;
  backLabel: string;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}

function WorkingDocumentLayout({
  title,
  badge,
  badgeColor,
  category,
  icon: Icon,
  iconBg,
  description,
  breadcrumbs,
  onBack,
  backLabel,
  headerActions,
  children
}: WorkingDocumentLayoutProps) {
  return (
    <div className="w-full flex-1 flex flex-col space-y-8 animate-in fade-in duration-200">
      {/* Top Navigation & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <AppButton
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-xs h-8 px-2.5 gap-1.5 text-muted-foreground hover:text-foreground font-semibold"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{backLabel}</span>
            </AppButton>
            {breadcrumbs.map((bc, idx) => (
              <React.Fragment key={idx}>
                <span className="text-border text-xs">/</span>
                {bc.onClick ? (
                  <button
                    type="button"
                    onClick={bc.onClick}
                    className="text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
                  >
                    {bc.label}
                  </button>
                ) : (
                  <span className="text-xs text-muted-foreground font-medium">{bc.label}</span>
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="flex items-center gap-3 pt-1">
            <div className={`h-11 w-11 rounded-xl flex items-center justify-center border shrink-0 ${iconBg || "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"}`}>
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5 flex-wrap">
                <span>{title}</span>
                {badge && (
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${badgeColor || "bg-theme-btn-primary/10 text-theme-btn-primary border-theme-btn-primary/20"}`}>
                    {badge}
                  </span>
                )}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2.5 flex-wrap self-end md:self-center">
          {headerActions}
          <AppButton
            type="button"
            variant="outline"
            size="sm"
            onClick={onBack}
            className="text-xs h-9 px-4 gap-1.5 font-semibold"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{backLabel}</span>
          </AppButton>
        </div>
      </div>

      {/* Working Document Canvas */}
      <div className="space-y-6">
        {children}
      </div>

      {/* Bottom Navigation */}
      <div className="flex items-center justify-between border-t border-border pt-6 pb-12">
        <AppButton
          type="button"
          variant="outline"
          size="sm"
          onClick={onBack}
          className="text-xs h-9 px-4 gap-1.5 font-semibold"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{backLabel}</span>
        </AppButton>
        {headerActions && (
          <div className="flex items-center gap-2.5">
            {headerActions}
          </div>
        )}
      </div>
    </div>
  );
}

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

  // Vehicle Master Dossier Multi-Column / Tab View States
  const [vehicleDossierTab, setVehicleDossierTab] = useState<
    "OVERVIEW" | "SERVICES" | "PARTS" | "DOCS" | "COMPLIANCE" | "TRIPS" | "ALL"
  >("OVERVIEW");
  const [dossierOriginVehicle, setDossierOriginVehicle] = useState<VehicleRecord | null>(null);
  const [isDossierAddDocOpen, setIsDossierAddDocOpen] = useState(false);
  const [dossierNewDocType, setDossierNewDocType] = useState("PUC");
  const [dossierNewDocTitle, setDossierNewDocTitle] = useState("");
  const [dossierNewDocNumber, setDossierNewDocNumber] = useState("");
  const [dossierNewDocExpiry, setDossierNewDocExpiry] = useState("");
  const [dossierUploadingDoc, setDossierUploadingDoc] = useState(false);

  // Vehicle Inventory Inline Expandable Dossier & Column Options States
  const [expandedVehicleId, setExpandedVehicleId] = useState<string | null>(null);
  const [expandedVehicleTab, setExpandedVehicleTab] = useState<
    "SPECS" | "SERVICES" | "PARTS" | "DOCS" | "COMPLIANCE" | "TRIPS" | "ALL"
  >("SPECS");
  const [showInventoryFinancials, setShowInventoryFinancials] = useState<boolean>(true);
  const [showInventoryRelations, setShowInventoryRelations] = useState<boolean>(true);
  const [isColumnOptionsOpen, setIsColumnOptionsOpen] = useState<boolean>(false);

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

  // Unified Vehicle Renewals & Free Service Entitlements Modal States
  const [isUnifiedRenewalsModalOpen, setIsUnifiedRenewalsModalOpen] = useState(false);
  const [selectedVehicleForRenewals, setSelectedVehicleForRenewals] = useState<VehicleRecord | null>(null);
  const [unifiedTimeline, setUnifiedTimeline] = useState<UnifiedVehicleRenewalTimelineItem[]>([]);
  const [vehicleEntitlements, setVehicleEntitlements] = useState<VehicleServiceEntitlementRecord[]>([]);
  const [loadingUnifiedTimeline, setLoadingUnifiedTimeline] = useState(false);
  const [renewalsFilter, setRenewalsFilter] = useState<"ALL" | "INSURANCE" | "PUC" | "MAINTENANCE_AMC">("ALL");
  const [renewalsActiveTab, setRenewalsActiveTab] = useState<"TIMELINE" | "FREE_SERVICES">("TIMELINE");

  // Add Free Service / AMC Voucher Modal State
  const [isAddEntitlementModalOpen, setIsAddEntitlementModalOpen] = useState(false);
  const [entitlementFormTitle, setEntitlementFormTitle] = useState("");
  const [entitlementFormType, setEntitlementFormType] = useState("OEM_FREE_1");
  const [entitlementFormScope, setEntitlementFormScope] = useState("LABOR_ONLY");
  const [entitlementFormVoucherNo, setEntitlementFormVoucherNo] = useState("");
  const [entitlementFormProvider, setEntitlementFormProvider] = useState("OEM / Authorized Dealership Network");
  const [entitlementFormValidFrom, setEntitlementFormValidFrom] = useState("");
  const [entitlementFormValidTo, setEntitlementFormValidTo] = useState("");
  const [entitlementFormMinKm, setEntitlementFormMinKm] = useState<number>(0);
  const [entitlementFormMaxKm, setEntitlementFormMaxKm] = useState<number>(5000);
  const [entitlementFormTerms, setEntitlementFormTerms] = useState("");
  const [entitlementFormNotes, setEntitlementFormNotes] = useState("");

  // Redeem / Claim Entitlement Modal State
  const [isRedeemEntitlementModalOpen, setIsRedeemEntitlementModalOpen] = useState(false);
  const [selectedEntitlementForRedeem, setSelectedEntitlementForRedeem] = useState<VehicleServiceEntitlementRecord | null>(null);
  const [redeemFormOdometer, setRedeemFormOdometer] = useState<number>(0);
  const [redeemFormWorkshop, setRedeemFormWorkshop] = useState("");
  const [redeemFormInvoiceNo, setRedeemFormInvoiceNo] = useState("");
  const [redeemFormLaborWaived, setRedeemFormLaborWaived] = useState<number>(0);
  const [redeemFormPartsWaived, setRedeemFormPartsWaived] = useState<number>(0);
  const [redeemFormDocUrl, setRedeemFormDocUrl] = useState("");
  const [redeemFormNotes, setRedeemFormNotes] = useState("");

  // Parts Form States
  const [partFormName, setPartFormName] = useState("");
  const [partFormItemType, setPartFormItemType] = useState("SPARE_PART");
  const [partFormPartNumber, setPartFormPartNumber] = useState("");
  const [partFormCategory, setPartFormCategory] = useState("Spare Parts");
  const [partFormBrand, setPartFormBrand] = useState("");
  const [partFormPurchaseAmount, setPartFormPurchaseAmount] = useState<number>(0);
  const [partFormUnitPrice, setPartFormUnitPrice] = useState<number>(0);
  const [partFormQuantity, setPartFormQuantity] = useState<number>(1);
  const [partFormDiscount, setPartFormDiscount] = useState<number>(0);
  const [partFormTaxRate, setPartFormTaxRate] = useState<number>(18);
  const [partFormTaxAmount, setPartFormTaxAmount] = useState<number>(0);
  const [partFormTdsRate, setPartFormTdsRate] = useState<number>(0);
  const [partFormTdsDeduction, setPartFormTdsDeduction] = useState<number>(0);
  const [partFormOtherDeductions, setPartFormOtherDeductions] = useState<number>(0);
  const [partFormAttachments, setPartFormAttachments] = useState<MaintenanceAttachment[]>([]);
  const [isDraggingPartFile, setIsDraggingPartFile] = useState(false);
  const partFileInputRef = React.useRef<HTMLInputElement>(null);
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
  const [newVehiclePurchasePrice, setNewVehiclePurchasePrice] = useState<string | number>("");
  const [newVehicleCustomExtendedExpiryDate, setNewVehicleCustomExtendedExpiryDate] = useState<string>("");

  // New Vehicle Document Vault States
  const [newVehicleDocs, setNewVehicleDocs] = useState<VehicleDocumentRecord[]>([]);
  const [newDocType, setNewDocType] = useState<string>("PUC");
  const [newDocTitle, setNewDocTitle] = useState<string>("");
  const [newDocNumber, setNewDocNumber] = useState<string>("");
  const [newDocExpiry, setNewDocExpiry] = useState<string>("");
  const [isDraggingNewVehicleDoc, setIsDraggingNewVehicleDoc] = useState<boolean>(false);
  const newVehicleDocFileInputRef = React.useRef<HTMLInputElement>(null);

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
  const [editVehiclePurchasePrice, setEditVehiclePurchasePrice] = useState<string | number>("");
  const [editVehicleCustomExtendedExpiryDate, setEditVehicleCustomExtendedExpiryDate] = useState<string>("");

  // Edit Vehicle Document Vault States
  const [editVehicleDocs, setEditVehicleDocs] = useState<VehicleDocumentRecord[]>([]);
  const [editDocType, setEditDocType] = useState<string>("PUC");
  const [editDocTitle, setEditDocTitle] = useState<string>("");
  const [editDocNumber, setEditDocNumber] = useState<string>("");
  const [editDocExpiry, setEditDocExpiry] = useState<string>("");
  const [isDraggingEditVehicleDoc, setIsDraggingEditVehicleDoc] = useState<boolean>(false);
  const editVehicleDocFileInputRef = React.useRef<HTMLInputElement>(null);

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
  const [newMaintDiscount, setNewMaintDiscount] = useState<number>(0);
  const [newMaintTaxRate, setNewMaintTaxRate] = useState<number>(18);
  const [newMaintTaxCost, setNewMaintTaxCost] = useState<number>(0);
  const [newMaintTdsRate, setNewMaintTdsRate] = useState<number>(0);
  const [newMaintTdsAmount, setNewMaintTdsAmount] = useState<number>(0);
  const [newMaintOtherDeductions, setNewMaintOtherDeductions] = useState<number>(0);
  const [newMaintCost, setNewMaintCost] = useState<number>(0);
  const [newMaintPaymentMode, setNewMaintPaymentMode] = useState("UPI / Bank Transfer");
  const [newMaintPaymentStatus, setNewMaintPaymentStatus] = useState("PAID");
  const [newMaintNextDue, setNewMaintNextDue] = useState("");
  const [newMaintNextDueOdometer, setNewMaintNextDueOdometer] = useState<number>(0);
  const [newMaintNotes, setNewMaintNotes] = useState("");
  const [newMaintPostStatus, setNewMaintPostStatus] = useState("IN_STOCK");
  const [newMaintActiveSection, setNewMaintActiveSection] = useState<"SCOPE_WORKSHOP" | "BILLING_FORECAST">("SCOPE_WORKSHOP");
  const [newMaintAttachments, setNewMaintAttachments] = useState<MaintenanceAttachment[]>([]);
  const [isDraggingNewMaint, setIsDraggingNewMaint] = useState(false);
  const newMaintFileInputRef = React.useRef<HTMLInputElement>(null);

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
  const [editMaintDiscount, setEditMaintDiscount] = useState<number>(0);
  const [editMaintTaxRate, setEditMaintTaxRate] = useState<number>(18);
  const [editMaintTaxCost, setEditMaintTaxCost] = useState<number>(0);
  const [editMaintTdsRate, setEditMaintTdsRate] = useState<number>(0);
  const [editMaintTdsAmount, setEditMaintTdsAmount] = useState<number>(0);
  const [editMaintOtherDeductions, setEditMaintOtherDeductions] = useState<number>(0);
  const [editMaintCost, setEditMaintCost] = useState<number>(0);
  const [editMaintPaymentMode, setEditMaintPaymentMode] = useState("UPI / Bank Transfer");
  const [editMaintPaymentStatus, setEditMaintPaymentStatus] = useState("PAID");
  const [editMaintNextDue, setEditMaintNextDue] = useState("");
  const [editMaintNextDueOdometer, setEditMaintNextDueOdometer] = useState<number>(0);
  const [editMaintNotes, setEditMaintNotes] = useState("");
  const [editMaintPostStatus, setEditMaintPostStatus] = useState("IN_STOCK");
  const [editMaintActiveSection, setEditMaintActiveSection] = useState<"SCOPE_WORKSHOP" | "BILLING_FORECAST">("SCOPE_WORKSHOP");
  const [editMaintAttachments, setEditMaintAttachments] = useState<MaintenanceAttachment[]>([]);
  const [isDraggingEditMaint, setIsDraggingEditMaint] = useState(false);
  const editMaintFileInputRef = React.useRef<HTMLInputElement>(null);

  const [selectedMaintenanceForView, setSelectedMaintenanceForView] = useState<MaintenanceRecord | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<{
    id?: string;
    file_name: string;
    file_size?: number | string | null;
    file_type?: string;
    file_url: string;
    uploaded_at?: string;
  } | null>(null);
  const [previewZoom, setPreviewZoom] = useState<number>(1);
  const [previewRotation, setPreviewRotation] = useState<number>(0);

  const formatFileSize = (bytes: number | string | undefined | null): string => {
    if (!bytes || bytes === 0) return "0 B";
    if (typeof bytes === "string") {
      if (bytes.includes("B") || bytes.includes("KB") || bytes.includes("MB") || bytes.includes("GB")) {
        return bytes;
      }
      const parsed = parseFloat(bytes);
      if (isNaN(parsed) || parsed <= 0) return bytes;
      bytes = parsed;
    }
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const resolveMimeFromName = (fileName: string): string => {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    if (["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext)) return `image/${ext === "jpg" ? "jpeg" : ext}`;
    if (ext === "pdf") return "application/pdf";
    if (["xls", "xlsx", "csv"].includes(ext)) return "application/vnd.ms-excel";
    if (["doc", "docx"].includes(ext)) return "application/msword";
    return "application/octet-stream";
  };

  const renderAttachmentIcon = (mime?: string, fileName: string = "") => {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    if (mime?.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext)) {
      return <ImageIcon className="h-4 w-4 text-emerald-500 shrink-0" />;
    }
    if (mime?.includes("pdf") || ext === "pdf") {
      return <FileText className="h-4 w-4 text-rose-500 shrink-0" />;
    }
    if (mime?.includes("sheet") || mime?.includes("excel") || ["xls", "xlsx", "csv"].includes(ext)) {
      return <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />;
    }
    if (mime?.includes("word") || ["doc", "docx"].includes(ext)) {
      return <FileText className="h-4 w-4 text-blue-500 shrink-0" />;
    }
    return <Paperclip className="h-4 w-4 text-amber-500 shrink-0" />;
  };

  const handleAttachmentFilesSelected = (
    fileList: FileList | File[],
    setAttachments: React.Dispatch<React.SetStateAction<MaintenanceAttachment[]>>
  ) => {
    const files = Array.from(fileList);
    if (!files.length) return;

    const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
    const BLOCKED_EXTS = ["exe", "bat", "cmd", "sh", "vbs", "js", "scr", "msi", "dll"];

    for (const file of files) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      if (BLOCKED_EXTS.includes(ext)) {
        triggerToast(`Executable/script files (.${ext}) are not permitted.`, true);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        triggerToast(`File "${file.name}" exceeds maximum allowed size (25MB).`, true);
        continue;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Url = e.target?.result as string;
        if (!base64Url) return;

        const newAtt: MaintenanceAttachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type || resolveMimeFromName(file.name),
          file_url: base64Url,
          uploaded_at: new Date().toISOString()
        };

        setAttachments((prev) => [...prev, newAtt]);
        triggerToast(`Attached ${file.name}`);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVehicleDocumentFileUpload = (
    fileList: FileList | File[],
    setDocs: React.Dispatch<React.SetStateAction<VehicleDocumentRecord[]>>,
    docTypeOverride?: string,
    docTitleOverride?: string,
    docNumberOverride?: string,
    docExpiryOverride?: string
  ) => {
    const files = Array.from(fileList);
    if (!files.length) return;

    const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
    const BLOCKED_EXTS = ["exe", "bat", "cmd", "sh", "vbs", "js", "scr", "msi", "dll"];

    for (const file of files) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      if (BLOCKED_EXTS.includes(ext)) {
        triggerToast(`Executable/script files (.${ext}) are not permitted.`, true);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        triggerToast(`File "${file.name}" exceeds maximum allowed size (25MB).`, true);
        continue;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Url = e.target?.result as string;
        if (!base64Url) return;

        let detectedType = docTypeOverride || "OTHER";
        const lowerName = file.name.toLowerCase();
        if (!docTypeOverride || docTypeOverride === "AUTO") {
          if (lowerName.includes("puc") || lowerName.includes("pollution")) detectedType = "PUC";
          else if (lowerName.includes("insur") || lowerName.includes("policy")) detectedType = "INSURANCE";
          else if (lowerName.includes("rc") || lowerName.includes("registration") || lowerName.includes("smartcard")) detectedType = "RC";
          else if (lowerName.includes("fit") || lowerName.includes("fitness")) detectedType = "FITNESS";
          else if (lowerName.includes("permit")) detectedType = "PERMIT";
          else if (lowerName.includes("tax") || lowerName.includes("roadtax")) detectedType = "ROAD_TAX";
          else if (lowerName.includes("inv") || lowerName.includes("bill")) detectedType = "INVOICE";
          else detectedType = "OTHER";
        }

        const typeOption = VEHICLE_DOC_TYPES.find((t) => t.value === detectedType);
        const autoTitle = docTitleOverride?.trim() || `${typeOption?.label || "Vehicle Document"} - ${file.name.replace(/\.[^/.]+$/, "")}`;

        const newDoc: VehicleDocumentRecord = {
          id: `vdoc-temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          doc_type: detectedType,
          title: autoTitle,
          document_number: docNumberOverride?.trim() || null,
          expiry_date: docExpiryOverride || null,
          status: "VALID",
          file_name: file.name,
          file_size: formatFileSize(file.size),
          file_type: file.type || resolveMimeFromName(file.name),
          file_url: base64Url,
          uploaded_at: new Date().toISOString()
        };

        setDocs((prev) => [...prev, newDoc]);
        triggerToast(`Attached ${file.name}`);
      };
      reader.readAsDataURL(file);
    }
  };

  const downloadAttachment = (att: { file_name?: string; file_url: string }) => {
    try {
      const link = document.createElement("a");
      link.href = att.file_url;
      link.download = att.file_name || "document";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      triggerToast(`Downloading ${att.file_name || "document"}...`);
    } catch (err) {
      console.error("Download error:", err);
      window.open(att.file_url, "_blank");
    }
  };

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
    setNewMaintDiscount(0);
    setNewMaintTaxRate(18);
    setNewMaintTaxCost(0);
    setNewMaintTdsRate(0);
    setNewMaintTdsAmount(0);
    setNewMaintOtherDeductions(0);
    setNewMaintCost(0);
    setNewMaintPaymentMode("UPI / Bank Transfer");
    setNewMaintPaymentStatus("PAID");
    setNewMaintNextDue("");
    setNewMaintNextDueOdometer(0);
    setNewMaintNotes("");
    setNewMaintPostStatus("IN_STOCK");
    setNewMaintActiveSection("SCOPE_WORKSHOP");
    setNewMaintAttachments([]);
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
    setEditMaintDate(normalizeDateToInputFormat(m.service_date) || new Date().toISOString().split("T")[0]);
    setEditMaintOdometer(m.odometer_km || 0);
    const labour = Number(partsData.labour_cost) || 0;
    const parts = Number(partsData.parts_cost) || 0;
    const disc = Number(partsData.discount) || 0;
    const taxR = partsData.tax_rate !== undefined ? Number(partsData.tax_rate) : 18;
    const taxAmt = Number(partsData.tax_amount) || 0;
    const tdsR = Number(partsData.tds_rate) || 0;
    const tdsAmt = Number(partsData.tds_amount) || 0;
    const otherDed = Number(partsData.other_deductions) || 0;

    setEditMaintLabourCost(labour);
    setEditMaintPartsCost(parts);
    setEditMaintDiscount(disc);
    setEditMaintTaxRate(taxR);
    setEditMaintTaxCost(taxAmt);
    setEditMaintTdsRate(tdsR);
    setEditMaintTdsAmount(tdsAmt);
    setEditMaintOtherDeductions(otherDed);
    setEditMaintCost(Number(m.cost) || 0);
    setEditMaintPaymentMode(partsData.payment_mode || "UPI / Bank Transfer");
    setEditMaintPaymentStatus(partsData.payment_status || "PAID");
    setEditMaintNextDue(normalizeDateToInputFormat(m.next_service_due_date));
    setEditMaintNextDueOdometer(Number(m.next_service_due_odometer) || 0);
    setEditMaintNotes(partsData.technician_notes || "");
    setEditMaintPostStatus(partsData.post_service_status || "IN_STOCK");
    setEditMaintActiveSection("SCOPE_WORKSHOP");
    const existingAtts = Array.isArray(partsData.attachments) ? partsData.attachments : [];
    setEditMaintAttachments(existingAtts);
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
  // Data Loaders (Module-local operations with 60s in-memory cache)
  // ----------------------------------------------------------------------------

  const loadAllData = useCallback(async (isSilent = false, forceRefresh = false) => {
    try {
      const now = Date.now();
      // Use cached dataset on quick tab switching or re-renders
      if (!forceRefresh && fleetDataCache && (now - fleetDataCache.timestamp < 60000)) {
        if (fleetDataCache.stats) setStats(fleetDataCache.stats);
        if (fleetDataCache.vehicles) setVehicles(fleetDataCache.vehicles);
        if (fleetDataCache.drivers) setDrivers(fleetDataCache.drivers);
        if (fleetDataCache.trips) setTrips(fleetDataCache.trips);
        if (fleetDataCache.maintenance) setMaintenance(fleetDataCache.maintenance);
        if (fleetDataCache.vendors) setInsuranceVendors(fleetDataCache.vendors);
        if (fleetDataCache.parts) setParts(fleetDataCache.parts);
        setLoading(false);
        return;
      }

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

      const newCache: {
        stats?: VehicleDashboardStats;
        vehicles?: VehicleRecord[];
        drivers?: DriverRecord[];
        trips?: TripRecord[];
        maintenance?: MaintenanceRecord[];
        vendors?: InsuranceVendorRecord[];
        parts?: PartAccessoryRecord[];
        timestamp: number;
      } = { timestamp: Date.now() };

      if (statsRes.success) { setStats(statsRes.stats); newCache.stats = statsRes.stats; }
      if (vehiclesRes.success) { setVehicles(vehiclesRes.vehicles); newCache.vehicles = vehiclesRes.vehicles; }
      if (driversRes.success) { setDrivers(driversRes.drivers); newCache.drivers = driversRes.drivers; }
      if (tripsRes.success) { setTrips(tripsRes.trips); newCache.trips = tripsRes.trips; }
      if (maintRes.success) { setMaintenance(maintRes.records); newCache.maintenance = maintRes.records; }
      if (vendorsRes.success) { setInsuranceVendors(vendorsRes.vendors); newCache.vendors = vendorsRes.vendors; }
      if (partsRes.success && partsRes.parts) { setParts(partsRes.parts); newCache.parts = partsRes.parts; }

      fleetDataCache = newCache;

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
    setNewVehiclePurchasePrice("");
    setNewVehicleCustomExtendedExpiryDate("");
    setNewVehicleDocs([]);
    setNewDocTitle("");
    setNewDocNumber("");
    setNewDocExpiry("");
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

  // Auto-fetch documents for viewingVehicle dossier if not already populated
  useEffect(() => {
    if (viewingVehicle?.id && (!viewingVehicle.documents || viewingVehicle.documents.length === 0)) {
      fetchVehicleDocumentsAction(viewingVehicle.id).then((res) => {
        if (res.success && res.documents && res.documents.length > 0) {
          setViewingVehicle((prev) => (prev && prev.id === viewingVehicle.id ? { ...prev, documents: res.documents } : prev));
        }
      });
    }
  }, [viewingVehicle?.id]);

  // Auto-fetch documents for inline expanded vehicle if not already populated
  useEffect(() => {
    if (expandedVehicleId) {
      const targetVeh = vehicles.find((v) => v.id === expandedVehicleId);
      if (targetVeh && (!targetVeh.documents || targetVeh.documents.length === 0)) {
        fetchVehicleDocumentsAction(targetVeh.id).then((res) => {
          if (res.success && res.documents && res.documents.length > 0) {
            setVehicles((prev) =>
              prev.map((v) => (v.id === expandedVehicleId ? { ...v, documents: res.documents } : v))
            );
          }
        });
      }
    }
  }, [expandedVehicleId]);

  // Vehicle Dossier Computed Statistics and Subsystem Entities
  const dossierData = useMemo(() => {
    if (!viewingVehicle) {
      return {
        services: [] as MaintenanceRecord[],
        parts: [] as PartAccessoryRecord[],
        trips: [] as TripRecord[],
        docs: [] as VehicleDocumentRecord[],
        totalServiceSpend: 0,
        lastService: null as MaintenanceRecord | null,
        totalPartsValue: 0,
        activeWarrantiesCount: 0,
        expiredDocsCount: 0,
        completedTripsCount: 0,
        activeTripsCount: 0,
        hasPuc: false,
        hasInsurance: false,
        hasRc: false,
        hasFitness: false,
        hasPermit: false
      };
    }

    const normReg = (reg?: string | null) => (reg || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    const targetId = viewingVehicle.id;
    const targetPlate = normReg(viewingVehicle.registration_number);

    // 1. Service / Maintenance Records
    const vServices = maintenance.filter(
      (m) =>
        (m.vehicle_id && m.vehicle_id === targetId) ||
        (m.vehicle_reg && normReg(m.vehicle_reg) === targetPlate)
    ).sort((a, b) => new Date(b.service_date).getTime() - new Date(a.service_date).getTime());

    const totalServiceSpend = vServices.reduce((sum, s) => sum + (Number(s.cost) || 0), 0);
    const lastService = vServices[0] || null;

    // 2. Mounted Spare Parts & Accessories
    const vParts = parts.filter(
      (p) =>
        (p.vehicle_id && p.vehicle_id === targetId) ||
        (p.assigned_vehicle_reg && normReg(p.assigned_vehicle_reg) === targetPlate)
    );

    const totalPartsValue = vParts.reduce((sum, p) => sum + (Number(p.purchase_amount) || 0), 0);
    const activeWarrantiesCount = vParts.filter((p) => {
      if (!p.warranty_expiry_date) return false;
      const days = calculateDaysRemaining(p.warranty_expiry_date);
      return days !== null && days >= 0;
    }).length;

    // 3. Trips Log
    const vTrips = trips.filter(
      (t) =>
        (t.vehicle_id && t.vehicle_id === targetId) ||
        (t.vehicle_reg && normReg(t.vehicle_reg) === targetPlate)
    ).sort((a, b) => new Date(b.plan_date || b.created_at || "").getTime() - new Date(a.plan_date || a.created_at || "").getTime());

    const completedTripsCount = vTrips.filter((t) => t.status === "COMPLETED").length;
    const activeTripsCount = vTrips.filter((t) => t.status === "ON_ROUTE" || t.status === "SCHEDULED").length;

    // 4. Documents & Compliance Status
    const vDocs = viewingVehicle.documents || [];
    const expiredDocsCount = vDocs.filter((d) => {
      if (!d.expiry_date) return false;
      const days = calculateDaysRemaining(d.expiry_date);
      return days !== null && days < 0;
    }).length;

    const hasPuc = Boolean(vDocs.some((d) => d.doc_type === "PUC") || viewingVehicle.puc_certificate_number);
    const hasInsurance = Boolean(vDocs.some((d) => d.doc_type === "INSURANCE") || viewingVehicle.insurance_policy_number);
    const hasRc = Boolean(vDocs.some((d) => d.doc_type === "RC") || viewingVehicle.vin_chassis_number);
    const hasFitness = Boolean(vDocs.some((d) => d.doc_type === "FITNESS") || viewingVehicle.fitness_expiry_date);
    const hasPermit = Boolean(vDocs.some((d) => d.doc_type === "PERMIT"));

    return {
      services: vServices,
      parts: vParts,
      trips: vTrips,
      docs: vDocs,
      totalServiceSpend,
      lastService,
      totalPartsValue,
      activeWarrantiesCount,
      expiredDocsCount,
      completedTripsCount,
      activeTripsCount,
      hasPuc,
      hasInsurance,
      hasRc,
      hasFitness,
      hasPermit
    };
  }, [viewingVehicle, maintenance, parts, trips]);

  const handleDossierDirectDocUpload = async (fileList: FileList | File[]) => {
    if (!viewingVehicle) return;
    const files = Array.from(fileList);
    if (!files.length) return;

    const file = files[0];
    const MAX_FILE_SIZE = 25 * 1024 * 1024;
    const BLOCKED_EXTS = ["exe", "bat", "cmd", "sh", "vbs", "js", "scr", "msi", "dll"];
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (BLOCKED_EXTS.includes(ext)) {
      triggerToast(`Executable/script files (.${ext}) are not permitted.`, true);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      triggerToast(`File "${file.name}" exceeds maximum allowed size (25MB).`, true);
      return;
    }

    setDossierUploadingDoc(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Url = e.target?.result as string;
        if (!base64Url) {
          triggerToast("Failed to read file.", true);
          setDossierUploadingDoc(false);
          return;
        }

        const typeOption = VEHICLE_DOC_TYPES.find((t) => t.value === dossierNewDocType);
        const resolvedTitle = dossierNewDocTitle.trim() || `${typeOption?.label || "Vehicle Document"} - ${file.name.replace(/\.[^/.]+$/, "")}`;

        const res = await createVehicleDocumentAction(viewingVehicle.id, {
          doc_type: dossierNewDocType,
          title: resolvedTitle,
          document_number: dossierNewDocNumber.trim() || null,
          expiry_date: dossierNewDocExpiry || null,
          file_name: file.name,
          file_size: formatFileSize(file.size),
          file_type: file.type || resolveMimeFromName(file.name),
          file_url: base64Url,
          status: "VALID"
        });

        if (res.success && res.document) {
          const updatedDoc = res.document;
          setViewingVehicle((prev) => {
            if (!prev) return null;
            const updatedDocs = [updatedDoc, ...(prev.documents || [])];
            return { ...prev, documents: updatedDocs };
          });
          setVehicles((prev) =>
            prev.map((v) =>
              v.id === viewingVehicle.id
                ? { ...v, documents: [updatedDoc, ...(v.documents || [])] }
                : v
            )
          );
          triggerToast("Document successfully archived into vehicle vault.");
          setDossierNewDocTitle("");
          setDossierNewDocNumber("");
          setDossierNewDocExpiry("");
          setIsDossierAddDocOpen(false);
        } else {
          triggerToast(res.error || "Failed to save document to vehicle vault.", true);
        }
        setDossierUploadingDoc(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      triggerToast(err.message || "Error reading file", true);
      setDossierUploadingDoc(false);
    }
  };

  const handleDossierDeleteDocument = async (docId: string) => {
    if (!viewingVehicle) return;
    if (!confirm("Are you sure you want to permanently delete this document from the vehicle vault?")) {
      return;
    }
    const res = await deleteVehicleDocumentAction(docId);
    if (res.success) {
      setViewingVehicle((prev) => {
        if (!prev) return null;
        return { ...prev, documents: (prev.documents || []).filter((d) => d.id !== docId) };
      });
      setVehicles((prev) =>
        prev.map((v) =>
          v.id === viewingVehicle.id
            ? { ...v, documents: (v.documents || []).filter((d) => d.id !== docId) }
            : v
        )
      );
      triggerToast("Document removed from vehicle vault.");
    } else {
      triggerToast(res.error || "Failed to delete document.", true);
    }
  };


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
        has_hsrp_plate: newVehicleHsrp,
        purchase_price: Number(newVehiclePurchasePrice) || 0,
        purchase_cost: Number(newVehiclePurchasePrice) || 0,
        custom_extended_expiry_date: newVehicleCustomExtendedExpiryDate ? newVehicleCustomExtendedExpiryDate : undefined,
        documents: newVehicleDocs
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
    setEditVehicleRegDate(normalizeDateToInputFormat(veh.registration_date));
    setEditVehicleRtoOffice(veh.rto_office || "");
    setEditVehicleOwner(veh.registered_owner || "");
    setEditVehicleRtoRmn(veh.rto_rmn || "");
    setEditVehicleInsuranceVendorId(veh.insurance_vendor_id || "");
    setEditVehicleInsuranceVendor(veh.insurance_vendor || "");
    setEditVehicleInsurancePolicy(veh.insurance_policy_number || "");
    const isEv = isElectricFuel(veh.fuel_type);
    setEditVehicleInsuranceExpiry(normalizeDateToInputFormat(veh.insurance_expiry_date));
    setEditVehiclePucExpiry(isEv ? "" : normalizeDateToInputFormat(veh.puc_expiry_date));
    setEditVehicleFitnessExpiry(normalizeDateToInputFormat(veh.fitness_expiry_date));
    setEditVehicleHsrp(veh.has_hsrp_plate !== undefined ? veh.has_hsrp_plate : true);
    setEditVehicleRsa(veh.has_roadside_assistance !== undefined ? veh.has_roadside_assistance : true);
    setEditVehiclePurchasePrice(veh.purchase_price ?? veh.purchase_cost ?? "");
    setEditVehicleCustomExtendedExpiryDate(normalizeDateToInputFormat(veh.custom_extended_expiry_date));
    setEditVehicleDocs(veh.documents || []);
    setEditDocTitle("");
    setEditDocNumber("");
    setEditDocExpiry("");
    fetchVehicleDocumentsAction(veh.id).then((res) => {
      if (res.success && res.documents) {
        setEditVehicleDocs(res.documents);
      }
    });
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

  const handleUpdateVehicle = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault?.();
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
        has_hsrp_plate: editVehicleHsrp,
        purchase_price: Number(editVehiclePurchasePrice) || 0,
        purchase_cost: Number(editVehiclePurchasePrice) || 0,
        custom_extended_expiry_date: editVehicleCustomExtendedExpiryDate ? editVehicleCustomExtendedExpiryDate : null,
        documents: editVehicleDocs
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
              purchase_price: Number(editVehiclePurchasePrice) || 0,
              purchase_cost: Number(editVehiclePurchasePrice) || 0,
              custom_extended_expiry_date: editVehicleCustomExtendedExpiryDate || null,
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
              assignedDriver: matchedDriver ? { id: matchedDriver.id, full_name: matchedDriver.full_name, phone: matchedDriver.phone } : null,
              documents: editVehicleDocs
            };
          }
          return v;
        }));

        if (viewingVehicle?.id === updatedVehId) {
          setViewingVehicle(prev => prev ? { 
            ...prev, 
            purchase_price: Number(editVehiclePurchasePrice) || 0,
            purchase_cost: Number(editVehiclePurchasePrice) || 0,
            custom_extended_expiry_date: editVehicleCustomExtendedExpiryDate || null,
            documents: editVehicleDocs 
          } : null);
        }

        setSelectedVehicleForEdit(null);
        fleetDataCache = null;
        await loadAllData(true, true);

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

  const handleSaveVendor = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault?.();
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
        fleetDataCache = null;
        loadAllData(true, true);
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

  const handleCreateDriver = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault?.();
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
        fleetDataCache = null;
        loadAllData(true, true);
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
    setEditDriverLicenseExpiry(normalizeDateToInputFormat(drv.license_expiry_date));
    setEditDriverExperience(drv.experience_years || 0);
    setEditDriverEmergency(drv.emergency_contact || "");
    setEditDriverVehicleId(drv.assigned_vehicle_id || "");
    setEditDriverActive(drv.is_active);
    setIsEditDriverOpen(true);
  };

  const handleUpdateDriver = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault?.();
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
        fleetDataCache = null;
        loadAllData(true, true);
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

  const handleDispatchTrip = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault?.();
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
        fleetDataCache = null;
        loadAllData(true, true);
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

  const handleLogMaintenance = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault?.();
    if (!newMaintVehicleId || !newMaintServiceType.trim() || !newMaintVendor.trim()) {
      triggerToast("Please select a target vehicle, specify service scope, and authorized workshop.", true);
      return;
    }

    setModalSubmitting(true);
    try {
      const labour = Number(newMaintLabourCost) || 0;
      const parts = Number(newMaintPartsCost) || 0;
      const discount = Number(newMaintDiscount) || 0;
      const gross = labour + parts;
      const taxable = Math.max(0, gross - discount);

      const partsPayload = {
        category: newMaintCategory,
        invoice_number: newMaintInvoiceNo.trim() || undefined,
        location: newMaintLocation.trim() || undefined,
        parts_cost: parts,
        labour_cost: labour,
        gross_amount: gross,
        discount: discount,
        taxable_base: taxable,
        tax_rate: Number(newMaintTaxRate) || 0,
        tax_amount: Number(newMaintTaxCost) || 0,
        tds_rate: Number(newMaintTdsRate) || 0,
        tds_amount: Number(newMaintTdsAmount) || 0,
        other_deductions: Number(newMaintOtherDeductions) || 0,
        net_amount: Number(newMaintCost) || 0,
        payment_mode: newMaintPaymentMode,
        payment_status: newMaintPaymentStatus,
        technician_notes: newMaintNotes.trim() || undefined,
        attachments: newMaintAttachments
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
        if (res.record) {
          setMaintenance((prev) => [res.record!, ...prev]);
        }
        setIsAddMaintenanceOpen(false);
        resetMaintenanceForm();
        fleetDataCache = null;
        loadAllData(true, true);
      } else {
        triggerToast(res.error || "Failed to log maintenance", true);
      }
    } catch (err: any) {
      triggerToast(err.message || "Failed to log maintenance", true);
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleUpdateMaintenance = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault?.();
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

      const labour = Number(editMaintLabourCost) || 0;
      const parts = Number(editMaintPartsCost) || 0;
      const discount = Number(editMaintDiscount) || 0;
      const gross = labour + parts;
      const taxable = Math.max(0, gross - discount);

      const partsPayload = {
        ...existingParts,
        category: editMaintCategory,
        invoice_number: editMaintInvoiceNo.trim() || undefined,
        location: editMaintLocation.trim() || undefined,
        parts_cost: parts,
        labour_cost: labour,
        gross_amount: gross,
        discount: discount,
        taxable_base: taxable,
        tax_rate: Number(editMaintTaxRate) || 0,
        tax_amount: Number(editMaintTaxCost) || 0,
        tds_rate: Number(editMaintTdsRate) || 0,
        tds_amount: Number(editMaintTdsAmount) || 0,
        other_deductions: Number(editMaintOtherDeductions) || 0,
        net_amount: Number(editMaintCost) || 0,
        payment_mode: editMaintPaymentMode,
        payment_status: editMaintPaymentStatus,
        technician_notes: editMaintNotes.trim() || undefined,
        attachments: editMaintAttachments
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
        if (res.record) {
          setMaintenance((prev) => prev.map((item) => item.id === res.record!.id ? res.record! : item));
        }
        setIsEditMaintenanceOpen(false);
        setSelectedMaintenanceForEdit(null);
        fleetDataCache = null;
        loadAllData(true, true);
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
    setPartFormDiscount(0);
    setPartFormTaxRate(18);
    setPartFormTaxAmount(0);
    setPartFormTdsRate(0);
    setPartFormTdsDeduction(0);
    setPartFormOtherDeductions(0);
    setPartFormAttachments([]);
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
    setPartFormPurchaseDate(normalizeDateToInputFormat(part.purchase_date));
    setPartFormVendorName(part.vendor_name || "");
    setPartFormInvoiceNumber(part.invoice_number || "");
    setPartFormManufacturingDate(normalizeDateToInputFormat(part.manufacturing_date));
    setPartFormExpiryDate(normalizeDateToInputFormat(part.expiry_date));
    setPartFormWarrantyType(part.warranty_type || "WARRANTY");
    setPartFormWarrantyMonths(part.warranty_months || 0);
    setPartFormWarrantyExpiryDate(normalizeDateToInputFormat(part.warranty_expiry_date));
    setPartFormWarrantyTerms(part.warranty_terms || "");
    setPartFormHasRenewal(Boolean(part.has_renewal_policy));
    setPartFormRenewalType(part.renewal_policy_type || "GPS_SIM_RECHARGE");
    setPartFormRenewalDate(normalizeDateToInputFormat(part.renewal_date));
    setPartFormRenewalCost(part.renewal_cost || 0);
    setPartFormRenewalVendor(part.renewal_vendor || "");
    setPartFormRenewalPolicyNumber(part.renewal_policy_number || "");
    setPartFormRenewalReminderDays(part.renewal_reminder_days || 30);
    setPartFormStatus(part.status || "IN_STOCK");
    setPartFormVehicleId(part.vehicle_id || "UNASSIGNED_STOCK");
    setPartFormAssignedVehicleReg(part.assigned_vehicle_reg || "");
    setPartFormInstallationDate(normalizeDateToInputFormat(part.installation_date));
    setPartFormInstalledOdometer(part.installed_odometer_km ?? "");
    setPartFormInstalledBy(part.installed_by || "");
    setPartFormCondition(part.condition || "NEW");
    setPartFormSerialNumber(part.serial_number || "");

    // Parse structured notes for attachments & tax breakdown
    let rawNotes = part.notes || "";
    let extractedAtts: MaintenanceAttachment[] = [];
    let disc = 0;
    let taxR = 18;
    let taxAmt = 0;
    let tdsR = 0;
    let tdsDed = 0;
    let otherDed = 0;

    if (rawNotes) {
      try {
        const parsed = JSON.parse(rawNotes);
        if (parsed && typeof parsed === "object") {
          rawNotes = parsed.text || "";
          if (Array.isArray(parsed.attachments)) extractedAtts = parsed.attachments;
          if (parsed.tax_breakdown) {
            disc = Number(parsed.tax_breakdown.discount) || 0;
            taxR = parsed.tax_breakdown.tax_rate !== undefined ? Number(parsed.tax_breakdown.tax_rate) : 18;
            taxAmt = Number(parsed.tax_breakdown.tax_amount) || 0;
            tdsR = Number(parsed.tax_breakdown.tds_rate) || 0;
            tdsDed = Number(parsed.tax_breakdown.tds_deduction) || 0;
            otherDed = Number(parsed.tax_breakdown.other_deductions) || 0;
          }
        }
      } catch {
        // Plain text notes
      }
    }

    setPartFormNotes(rawNotes);
    setPartFormAttachments(extractedAtts);
    setPartFormDiscount(disc);
    setPartFormTaxRate(taxR);
    setPartFormTaxAmount(taxAmt);
    setPartFormTdsRate(tdsR);
    setPartFormTdsDeduction(tdsDed);
    setPartFormOtherDeductions(otherDed);
    setIsEditPartOpen(true);
  };

  const handleSavePart = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault?.();
    if (!partFormName.trim()) {
      triggerToast("Part / Accessory name is required.", true);
      return;
    }
    if (!partFormBrand.trim()) {
      triggerToast("Brand / Manufacturer is required.", true);
      return;
    }
    if (partFormHasRenewal && !partFormRenewalDate) {
      triggerToast("Please specify the renewal due date for the active renewal policy.", true);
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

      const unitPrice = Number(partFormUnitPrice) || 0;
      const qty = Number(partFormQuantity) || 1;
      const grossBase = unitPrice * qty;
      const discount = Number(partFormDiscount) || 0;
      const taxableBase = Math.max(0, grossBase - discount);
      const taxAmt = Number(partFormTaxAmount) || 0;
      const tdsDed = Number(partFormTdsDeduction) || 0;
      const otherDed = Number(partFormOtherDeductions) || 0;
      const calculatedNet = Math.max(0, taxableBase + taxAmt - tdsDed - otherDed);
      const finalPurchaseAmount = Number(partFormPurchaseAmount) || calculatedNet || grossBase;

      // Pack structured metadata into notes
      const notesPayload = {
        text: partFormNotes.trim(),
        attachments: partFormAttachments,
        tax_breakdown: {
          unit_price: unitPrice,
          quantity: qty,
          gross_base: grossBase,
          discount: discount,
          taxable_base: taxableBase,
          tax_rate: Number(partFormTaxRate) || 0,
          tax_amount: taxAmt,
          tds_rate: Number(partFormTdsRate) || 0,
          tds_deduction: tdsDed,
          other_deductions: otherDed,
          net_invoiced: finalPurchaseAmount
        }
      };

      const payload = {
        name: partFormName.trim(),
        item_type: partFormItemType,
        part_number: partFormPartNumber.trim() || undefined,
        category: partFormCategory.trim() || "Spare Parts",
        brand: partFormBrand.trim(),
        purchase_amount: finalPurchaseAmount,
        unit_price: unitPrice || undefined,
        quantity: qty,
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
        notes: JSON.stringify(notesPayload)
      };

      let res;
      if (selectedPartForEdit) {
        res = await updateVehiclePartAction(selectedPartForEdit.id, payload);
      } else {
        res = await createVehiclePartAction(payload);
      }

      if (res.success) {
        triggerToast(`Part '${payload.name}' saved successfully!`);
        if (res.part) {
          if (selectedPartForEdit) {
            setParts((prev) => prev.map((p) => p.id === res.part!.id ? res.part! : p));
          } else {
            setParts((prev) => [res.part!, ...prev]);
          }
        }
        setIsAddPartOpen(false);
        setIsEditPartOpen(false);
        setSelectedPartForEdit(null);
        fleetDataCache = null;
        loadAllData(true, true);
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

  const handleSaveRenewal = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault?.();
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
        fleetDataCache = null;
        loadAllData(true, true);
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

  const handleSaveVehiclePolicyRenewal = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault?.();
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
        fleetDataCache = null;
        loadAllData(true, true);
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

  const handleSaveVehiclePucRenewal = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault?.();
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
        fleetDataCache = null;
        loadAllData(true, true);
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
  // Unified Vehicle Renewal & Free Service Entitlements Handlers
  // ----------------------------------------------------------------------------

  const handleOpenVehicleUnifiedRenewalsModal = async (veh: VehicleRecord, defaultTab: "TIMELINE" | "FREE_SERVICES" = "TIMELINE") => {
    setSelectedVehicleForRenewals(veh);
    setRenewalsActiveTab(defaultTab);
    setIsUnifiedRenewalsModalOpen(true);
    setLoadingUnifiedTimeline(true);
    try {
      const [timelineRes, entitlementsRes] = await Promise.all([
        fetchVehicleUnifiedRenewalsTimelineAction(veh.id),
        fetchVehicleServiceEntitlementsAction(veh.id, veh.odometer_km)
      ]);

      if (timelineRes.success) {
        setUnifiedTimeline(timelineRes.timeline);
      } else {
        setUnifiedTimeline([]);
      }

      if (entitlementsRes.success) {
        setVehicleEntitlements(entitlementsRes.entitlements);
      } else {
        setVehicleEntitlements([]);
      }
    } catch (err: any) {
      triggerToast(err.message || "Failed to load renewals timeline", true);
    } finally {
      setLoadingUnifiedTimeline(false);
    }
  };

  const handleOpenAddEntitlementModal = (veh: VehicleRecord) => {
    const today = new Date().toISOString().split("T")[0];
    const sixMonthsLater = new Date();
    sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
    const cleanPlate = (veh.registration_number || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

    setEntitlementFormTitle("Periodic Free Service Voucher");
    setEntitlementFormType("OEM_FREE_2");
    setEntitlementFormScope("LABOR_ONLY");
    setEntitlementFormVoucherNo(`VOUCHER-${cleanPlate}-FS${(vehicleEntitlements.length + 1)}`);
    setEntitlementFormProvider("OEM / Authorized Dealership Network");
    setEntitlementFormValidFrom(today);
    setEntitlementFormValidTo(sixMonthsLater.toISOString().split("T")[0]);
    setEntitlementFormMinKm(veh.odometer_km || 0);
    setEntitlementFormMaxKm((veh.odometer_km || 0) + 5000);
    setEntitlementFormTerms("100% Labor waived. Consumables & fluids payable at actuals.");
    setEntitlementFormNotes("");
    setIsAddEntitlementModalOpen(true);
  };

  const handleSaveAddEntitlement = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault?.();
    if (!selectedVehicleForRenewals) return;

    if (!entitlementFormTitle.trim()) {
      triggerToast("Service title is required.", true);
      return;
    }
    if (!entitlementFormValidFrom || !entitlementFormValidTo) {
      triggerToast("Validity dates are required.", true);
      return;
    }

    setModalSubmitting(true);
    try {
      const res = await createVehicleServiceEntitlementAction(selectedVehicleForRenewals.id, {
        service_title: entitlementFormTitle.trim(),
        service_type: entitlementFormType,
        coverage_scope: entitlementFormScope,
        voucher_number: entitlementFormVoucherNo.trim() || undefined,
        provider_vendor: entitlementFormProvider.trim() || undefined,
        valid_from_date: entitlementFormValidFrom,
        valid_to_date: entitlementFormValidTo,
        min_odometer_km: Number(entitlementFormMinKm) || 0,
        max_odometer_km: Number(entitlementFormMaxKm) || 5000,
        terms_conditions: entitlementFormTerms.trim() || undefined,
        notes: entitlementFormNotes.trim() || undefined
      });

      if (res.success) {
        triggerToast("Service voucher / entitlement created successfully!");
        setIsAddEntitlementModalOpen(false);
        handleOpenVehicleUnifiedRenewalsModal(selectedVehicleForRenewals, "FREE_SERVICES");
      } else {
        triggerToast(res.error || "Failed to create entitlement.", true);
      }
    } catch (err: any) {
      triggerToast(err.message || "Failed to create entitlement.", true);
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleOpenRedeemEntitlementModal = (ent: VehicleServiceEntitlementRecord) => {
    setSelectedEntitlementForRedeem(ent);
    setRedeemFormOdometer(selectedVehicleForRenewals?.odometer_km || ent.min_odometer_km || 0);
    setRedeemFormWorkshop("Authorized Pune Workshop Center");
    setRedeemFormInvoiceNo(`INV-${Math.floor(100000 + Math.random() * 900000)}`);
    setRedeemFormLaborWaived(1200);
    setRedeemFormPartsWaived(0);
    setRedeemFormDocUrl("");
    setRedeemFormNotes("Voucher verified and redeemed against job card.");
    setIsRedeemEntitlementModalOpen(true);
  };

  const handleSaveRedeemEntitlement = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault?.();
    if (!selectedEntitlementForRedeem || !selectedVehicleForRenewals) return;

    if (!redeemFormWorkshop.trim()) {
      triggerToast("Workshop center is required.", true);
      return;
    }

    setModalSubmitting(true);
    try {
      const res = await redeemVehicleServiceEntitlementAction(
        selectedEntitlementForRedeem.id,
        selectedVehicleForRenewals.id,
        {
          redeemed_odometer_km: Number(redeemFormOdometer) || 0,
          workshop_center: redeemFormWorkshop.trim(),
          invoice_number: redeemFormInvoiceNo.trim() || undefined,
          labor_waived_amount: Number(redeemFormLaborWaived) || 0,
          parts_waived_amount: Number(redeemFormPartsWaived) || 0,
          document_url: redeemFormDocUrl.trim() || undefined,
          notes: redeemFormNotes.trim() || undefined
        }
      );

      if (res.success) {
        triggerToast(`Voucher "${selectedEntitlementForRedeem.service_title}" claimed & recorded!`);
        setIsRedeemEntitlementModalOpen(false);
        setSelectedEntitlementForRedeem(null);
        handleOpenVehicleUnifiedRenewalsModal(selectedVehicleForRenewals, "FREE_SERVICES");
      } else {
        triggerToast(res.error || "Failed to redeem entitlement.", true);
      }
    } catch (err: any) {
      triggerToast(err.message || "Failed to redeem entitlement.", true);
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleDeleteEntitlement = async (entId: string) => {
    if (!selectedVehicleForRenewals) return;
    if (!confirm("Are you sure you want to void this service entitlement / voucher?")) return;

    try {
      const res = await deleteVehicleServiceEntitlementAction(entId, selectedVehicleForRenewals.id);
      if (res.success) {
        triggerToast("Voucher voided.");
        handleOpenVehicleUnifiedRenewalsModal(selectedVehicleForRenewals, "FREE_SERVICES");
      } else {
        triggerToast(res.error || "Failed to void voucher.", true);
      }
    } catch (err: any) {
      triggerToast(err.message || "Failed to void voucher.", true);
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
        if (deleteTarget.type === "vehicle") setVehicles(prev => prev.filter(v => v.id !== deleteTarget.id));
        else if (deleteTarget.type === "driver") setDrivers(prev => prev.filter(d => d.id !== deleteTarget.id));
        else if (deleteTarget.type === "trip") setTrips(prev => prev.filter(t => t.id !== deleteTarget.id));
        else if (deleteTarget.type === "vendor") setInsuranceVendors(prev => prev.filter(vn => vn.id !== deleteTarget.id));
        else if (deleteTarget.type === "part") setParts(prev => prev.filter(p => p.id !== deleteTarget.id));
        else setMaintenance(prev => prev.filter(m => m.id !== deleteTarget.id));
        setDeleteTarget(null);
        fleetDataCache = null;
        loadAllData(true, true);
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

  // Transaction Form & Full-Page Working View State
  const isAnyTransactionFormOpen = Boolean(
    isEditVehicleOpen ||
    isAddDriverOpen ||
    isEditDriverOpen ||
    isDispatchTripOpen ||
    isAddMaintenanceOpen ||
    isEditMaintenanceOpen ||
    selectedMaintenanceForView ||
    isVendorModalOpen ||
    isAddPartOpen ||
    isEditPartOpen ||
    isRenewPartOpen ||
    isRenewPolicyModalOpen ||
    isPolicyHistoryModalOpen ||
    isRenewPucModalOpen ||
    isPucHistoryModalOpen ||
    isSpecHistoryModalOpen ||
    isUnifiedRenewalsModalOpen ||
    isAddEntitlementModalOpen ||
    isRedeemEntitlementModalOpen ||
    viewingVehicle ||
    viewingDriver ||
    viewingTrip ||
    viewingPart ||
    viewingVendor
  );

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
      {activeTab !== "register" && activeTab !== "rbac" && !isAnyTransactionFormOpen && (
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5 flex items-center gap-1">
                    <IndianRupee className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Purchase Price (₹)</span>
                  </label>
                  <AppInput 
                    type="number"
                    min="0"
                    step="1"
                    placeholder="e.g. 1250000"
                    value={newVehiclePurchasePrice} 
                    onChange={(e) => setNewVehiclePurchasePrice(e.target.value)} 
                    className="font-mono text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Acquisition cost / ex-showroom capitalized asset value of the vehicle.
                  </p>
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
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                      <CalendarClock className="h-3.5 w-3.5 text-indigo-500" />
                      <span>Custom Extended Expiry Date</span>
                    </label>
                    {newVehicleCustomExtendedExpiryDate && (
                      <div>{renderExpiryBadge(calculateDaysRemaining(newVehicleCustomExtendedExpiryDate))}</div>
                    )}
                  </div>
                  <AppInput 
                    type="date"
                    value={newVehicleCustomExtendedExpiryDate} 
                    onChange={(e) => setNewVehicleCustomExtendedExpiryDate(e.target.value)} 
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

            {/* 6. VEHICLE LEGAL & COMPLIANCE DOCUMENTS VAULT */}
            <div className="space-y-6 border-b border-border/80 pb-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-theme-btn-primary/10 text-theme-btn-primary text-xs font-bold">6</span>
                    <span>Vehicle Legal & Compliance Documents Vault</span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Attach and archive mandatory certificates & compliance records (PUC, Insurance Policy, RC Book Smart Card, Fitness Certificate, Permits, Purchase Invoice & others) with instant preview and download.
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-theme-btn-primary/10 text-theme-btn-primary border border-theme-btn-primary/20 shrink-0">
                  {newVehicleDocs.length} {newVehicleDocs.length === 1 ? "document attached" : "documents attached"}
                </span>
              </div>

              {/* Document Entry & Upload Controls */}
              <div className="p-4 rounded-xl border border-border bg-slate-50/70 dark:bg-slate-900/50 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="font-semibold text-foreground block mb-1">Document Category *</label>
                    <select
                      value={newDocType}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewDocType(val);
                        const match = VEHICLE_DOC_TYPES.find(t => t.value === val);
                        if (match && (!newDocTitle || VEHICLE_DOC_TYPES.some(t => t.label === newDocTitle))) {
                          setNewDocTitle(match.label);
                        }
                      }}
                      className="w-full h-9 rounded-lg border border-border bg-surface px-2.5 text-xs font-semibold text-foreground focus:outline-none focus:border-theme-btn-primary shadow-2xs"
                    >
                      {VEHICLE_DOC_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-foreground block mb-1">Document Title / Note</label>
                    <AppInput
                      placeholder="e.g. Valid PUC 2026-2027"
                      value={newDocTitle}
                      onChange={(e) => setNewDocTitle(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-foreground block mb-1">Certificate / Policy #</label>
                    <AppInput
                      placeholder="e.g. MH02-PUC-98214"
                      value={newDocNumber}
                      onChange={(e) => setNewDocNumber(e.target.value)}
                      className="text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-foreground block mb-1">Document Expiry Date</label>
                    <AppInput
                      type="date"
                      value={newDocExpiry}
                      onChange={(e) => setNewDocExpiry(e.target.value)}
                      className="text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Upload Dropzone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingNewVehicleDoc(true); }}
                  onDragLeave={() => setIsDraggingNewVehicleDoc(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingNewVehicleDoc(false);
                    if (e.dataTransfer.files?.length) {
                      handleVehicleDocumentFileUpload(
                        e.dataTransfer.files, 
                        setNewVehicleDocs, 
                        newDocType,
                        newDocTitle,
                        newDocNumber,
                        newDocExpiry
                      );
                      setNewDocTitle("");
                      setNewDocNumber("");
                      setNewDocExpiry("");
                    }
                  }}
                  onClick={() => newVehicleDocFileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-1.5 group ${
                    isDraggingNewVehicleDoc 
                      ? "border-theme-btn-primary bg-theme-btn-primary/5" 
                      : "border-border hover:border-theme-btn-primary/60 bg-surface/50 hover:bg-surface"
                  }`}
                >
                  <input
                    type="file"
                    multiple
                    ref={newVehicleDocFileInputRef}
                    onChange={(e) => {
                      if (e.target.files?.length) {
                        handleVehicleDocumentFileUpload(
                          e.target.files, 
                          setNewVehicleDocs,
                          newDocType,
                          newDocTitle,
                          newDocNumber,
                          newDocExpiry
                        );
                        setNewDocTitle("");
                        setNewDocNumber("");
                        setNewDocExpiry("");
                        e.target.value = "";
                      }
                    }}
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                    className="hidden"
                  />
                  <div className="h-10 w-10 rounded-full bg-theme-btn-primary/10 text-theme-btn-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                    <UploadCloud className="h-5 w-5" />
                  </div>
                  <div className="text-xs font-bold text-foreground">
                    Click to select file or drag & drop documents here
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Supports PDF, PNG, JPG, JPEG, WEBP (PUC, Insurance Policy, RC Book, Fitness Certificate, Permits up to 25MB)
                  </div>
                </div>
              </div>

              {/* Uploaded Documents List */}
              {newVehicleDocs.length > 0 && (
                <div className="space-y-2.5">
                  <div className="text-xs font-bold text-foreground flex items-center gap-2">
                    <FileCheck className="h-4 w-4 text-emerald-500" />
                    <span>Attached Documents ({newVehicleDocs.length})</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {newVehicleDocs.map((doc, idx) => {
                      const typeConfig = VEHICLE_DOC_TYPES.find(t => t.value === doc.doc_type) || {
                        label: doc.doc_type,
                        badgeColor: "bg-slate-500/10 text-slate-600 border-slate-500/20"
                      };
                      return (
                        <div
                          key={doc.id || idx}
                          className="p-3.5 rounded-xl border border-border bg-surface shadow-2xs hover:border-theme-btn-primary/40 transition-colors flex flex-col justify-between gap-3 text-xs"
                        >
                          <div className="flex items-start justify-between gap-2.5">
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              <div className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-border/80 shrink-0 mt-0.5">
                                {renderAttachmentIcon(doc.file_type || resolveMimeFromName(doc.file_name), doc.file_name)}
                              </div>
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${typeConfig.badgeColor}`}>
                                    {typeConfig.label}
                                  </span>
                                  {doc.document_number && (
                                    <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-surface border border-border text-muted-foreground">
                                      #{doc.document_number}
                                    </span>
                                  )}
                                </div>
                                <div className="font-bold text-foreground truncate" title={doc.title || doc.file_name}>
                                  {doc.title || doc.file_name}
                                </div>
                                <div className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
                                  <span className="font-medium truncate max-w-[150px]">{doc.file_name}</span>
                                  <span>•</span>
                                  <span>{formatFileSize(doc.file_size)}</span>
                                  {doc.expiry_date && (
                                    <>
                                      <span>•</span>
                                      <span className="text-amber-600 dark:text-amber-400 font-semibold">
                                        Exp: {doc.expiry_date}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <AppButton
                                type="button"
                                variant="outline"
                                size="icon-sm"
                                onClick={() => {
                                  setPreviewAttachment({
                                    id: doc.id,
                                    file_name: doc.file_name,
                                    file_size: doc.file_size || "0 B",
                                    file_type: doc.file_type || resolveMimeFromName(doc.file_name),
                                    file_url: doc.file_url,
                                    uploaded_at: doc.uploaded_at
                                  });
                                  setPreviewZoom(1);
                                  setPreviewRotation(0);
                                }}
                                className="h-7 w-7 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                                title="View / Preview Document"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </AppButton>
                              <AppButton
                                type="button"
                                variant="outline"
                                size="icon-sm"
                                onClick={() => downloadAttachment(doc)}
                                className="h-7 w-7 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                                title="Download Document"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </AppButton>
                              <AppButton
                                type="button"
                                variant="outline"
                                size="icon-sm"
                                onClick={() => {
                                  setNewVehicleDocs((prev) => prev.filter((_, i) => i !== idx));
                                  triggerToast(`Removed ${doc.file_name}`);
                                }}
                                className="h-7 w-7 text-rose-600 hover:bg-rose-500/10 hover:border-rose-500/40"
                                title="Remove Document"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </AppButton>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
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
      {!isAnyTransactionFormOpen && activeTab === "dashboard" && (
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
                              title="Unified Renewals & Free Services Lifecycle"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenVehicleUnifiedRenewalsModal(veh);
                              }}
                              className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 shadow-2xs"
                            >
                              <CalendarSync className="h-3.5 w-3.5" />
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
      {!isAnyTransactionFormOpen && activeTab === "inventory" && (
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

              {/* Column Options Selector */}
              <div className="relative">
                <AppButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsColumnOptionsOpen(!isColumnOptionsOpen)}
                  className={`text-xs h-8 px-2.5 gap-1.5 font-semibold ${
                    isColumnOptionsOpen ? "border-theme-btn-primary text-theme-btn-primary bg-theme-btn-primary/10" : ""
                  }`}
                  title="Customize table columns"
                >
                  <Columns className="h-3.5 w-3.5" />
                  <span>Columns</span>
                </AppButton>
                {isColumnOptionsOpen && (
                  <div className="absolute right-0 mt-1.5 w-64 bg-surface border border-border rounded-xl shadow-xl p-3 z-30 space-y-2 text-xs">
                    <div className="font-bold text-foreground pb-1.5 border-b border-border flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Columns className="h-3.5 w-3.5 text-theme-btn-primary" />
                        <span>Visible Columns</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsColumnOptionsOpen(false)}
                        className="text-muted-foreground hover:text-foreground p-0.5"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 p-1.5 rounded-lg text-xs transition-colors">
                      <input
                        type="checkbox"
                        checked={showInventoryFinancials}
                        onChange={(e) => setShowInventoryFinancials(e.target.checked)}
                        className="rounded border-border text-theme-btn-primary focus:ring-theme-btn-primary h-3.5 w-3.5"
                      />
                      <span className="font-medium text-foreground">Purchase Cost & Extended Expiry</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 p-1.5 rounded-lg text-xs transition-colors">
                      <input
                        type="checkbox"
                        checked={showInventoryRelations}
                        onChange={(e) => setShowInventoryRelations(e.target.checked)}
                        className="rounded border-border text-theme-btn-primary focus:ring-theme-btn-primary h-3.5 w-3.5"
                      />
                      <span className="font-medium text-foreground">Service, Parts & Docs Badges</span>
                    </label>
                  </div>
                )}
              </div>

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
                    <AppTableHead className="p-3.5 w-9 text-center">#</AppTableHead>
                    <AppTableHead className="p-3.5">Vehicle & Plate</AppTableHead>
                    <AppTableHead className="p-3.5">Owner & RTO RMN</AppTableHead>
                    <AppTableHead className="p-3.5">Chassis & Engine</AppTableHead>
                    <AppTableHead className="p-3.5">Reg. Date</AppTableHead>
                    <AppTableHead className="p-3.5">PUC Validity</AppTableHead>
                    <AppTableHead className="p-3.5">Insurance Validity</AppTableHead>
                    <AppTableHead className="p-3.5">RSA & HSRP</AppTableHead>
                    {showInventoryFinancials && (
                      <AppTableHead className="p-3.5">Purchase & Expiry</AppTableHead>
                    )}
                    <AppTableHead className="p-3.5 text-center">Status</AppTableHead>
                    <AppTableHead className="p-3.5 text-right">Actions</AppTableHead>
                  </AppTableRow>
                </AppTableHeader>
                <AppTableBody className="divide-y divide-border/60">
                  {filteredVehicles.length === 0 ? (
                    <AppTableRow>
                      <AppTableCell colSpan={showInventoryFinancials ? 11 : 10} className="text-center py-12 text-muted-foreground">
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
                    filteredVehicles.map((veh) => {
                      const isExpanded = expandedVehicleId === veh.id;
                      const norm = (s?: string | null) => (s || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
                      const targetId = veh.id;
                      const targetPlate = norm(veh.registration_number);

                      const vServices = maintenance.filter(
                        (m) =>
                          (m.vehicle_id && m.vehicle_id === targetId) ||
                          (m.vehicle_reg && norm(m.vehicle_reg) === targetPlate)
                      ).sort((a, b) => new Date(b.service_date).getTime() - new Date(a.service_date).getTime());
                      const totalSvcSpend = vServices.reduce((sum, s) => sum + (Number(s.cost) || 0), 0);

                      const vParts = parts.filter(
                        (p) =>
                          (p.vehicle_id && p.vehicle_id === targetId) ||
                          (p.assigned_vehicle_reg && norm(p.assigned_vehicle_reg) === targetPlate)
                      );
                      const totalPartsVal = vParts.reduce((sum, p) => sum + (Number(p.purchase_amount) || 0), 0);

                      const vTrips = trips.filter(
                        (t) =>
                          (t.vehicle_id && t.vehicle_id === targetId) ||
                          (t.vehicle_reg && norm(t.vehicle_reg) === targetPlate)
                      ).sort((a, b) => new Date(b.plan_date || b.created_at || "").getTime() - new Date(a.plan_date || a.created_at || "").getTime());

                      const vDocs = veh.documents || [];

                      return (
                        <React.Fragment key={veh.id}>
                          <AppTableRow 
                            onClick={() => setExpandedVehicleId(isExpanded ? null : veh.id)}
                            className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group ${
                              isExpanded ? "bg-theme-btn-primary/5 dark:bg-theme-btn-primary/10 border-l-4 border-l-theme-btn-primary" : ""
                            }`}
                          >
                            {/* 0. Expand Chevron */}
                            <AppTableCell className="p-3.5 text-center w-9">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedVehicleId(isExpanded ? null : veh.id);
                                }}
                                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-muted-foreground hover:text-foreground transition-colors"
                                title={isExpanded ? "Collapse vehicle details" : "Expand vehicle details on same screen"}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-theme-btn-primary" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 group-hover:text-foreground" />
                                )}
                              </button>
                            </AppTableCell>

                            {/* 1. Vehicle Name & Regn No */}
                            <AppTableCell className="p-3.5">
                              {renderHsrpPlate(veh.registration_number)}
                              <div className="font-semibold text-foreground mt-1.5 group-hover:text-theme-btn-primary transition-colors">
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
                              {showInventoryRelations && (
                                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 px-1.5 py-0.2 rounded border border-amber-500/20" title="Logged Workshop Services">
                                    <Wrench className="h-2.5 w-2.5 text-amber-500" />
                                    <span>{vServices.length} Svc</span>
                                  </span>
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-400 px-1.5 py-0.2 rounded border border-blue-500/20" title="Mounted Spare Parts">
                                    <Package className="h-2.5 w-2.5 text-blue-500" />
                                    <span>{vParts.length} Parts</span>
                                  </span>
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.2 rounded border border-emerald-500/20" title="Archived Documents">
                                    <FileCheck className="h-2.5 w-2.5 text-emerald-500" />
                                    <span>{vDocs.length} Docs</span>
                                  </span>
                                </div>
                              )}
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

                            {/* 8. Optional Financials Column */}
                            {showInventoryFinancials && (
                              <AppTableCell className="p-3.5 font-mono text-xs">
                                <div className="font-bold text-emerald-700 dark:text-emerald-300">
                                  {veh.purchase_price || veh.purchase_cost
                                    ? `₹${Number(veh.purchase_price || veh.purchase_cost).toLocaleString("en-IN")}`
                                    : "—"}
                                </div>
                                {veh.custom_extended_expiry_date ? (
                                  <div className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-0.5 flex items-center gap-1 font-semibold">
                                    <CalendarClock className="h-2.5 w-2.5" />
                                    <span>{String(veh.custom_extended_expiry_date).split("T")[0]}</span>
                                  </div>
                                ) : (
                                  <div className="text-[10px] text-muted-foreground mt-0.5">No ext expiry</div>
                                )}
                              </AppTableCell>
                            )}

                            {/* 9. Fleet Status */}
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
                                <div className="text-[10px] text-muted-foreground mt-1 truncate max-w-[120px] mx-auto" title={veh.assignedDriver.full_name}>
                                  {veh.assignedDriver.full_name}
                                </div>
                              )}
                            </AppTableCell>

                            {/* 10. Actions */}
                            <AppTableCell className="p-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <AppButton
                                  variant="primary"
                                  size="sm"
                                  title="Inspect Complete 360° Vehicle Dossier"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setViewingVehicle(veh);
                                  }}
                                  className="h-7 px-2.5 text-xs gap-1 font-semibold bg-theme-btn-primary hover:bg-theme-btn-primary-secondary text-white shadow-2xs"
                                >
                                  <Car className="h-3 w-3" />
                                  <span>360° View</span>
                                </AppButton>
                                <AppButton
                                  variant="outline"
                                  size="sm"
                                  title={isExpanded ? "Collapse inline details" : "Expand inline vehicle details on same screen"}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedVehicleId(isExpanded ? null : veh.id);
                                  }}
                                  className={`h-7 px-2 text-xs gap-1 font-semibold shadow-2xs ${
                                    isExpanded ? "border-theme-btn-primary text-theme-btn-primary bg-theme-btn-primary/10" : ""
                                  }`}
                                >
                                  {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                  <span>{isExpanded ? "Collapse" : "Details"}</span>
                                </AppButton>
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
                                  title="View Unified Renewals & Free Services Lifecycle"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenVehicleUnifiedRenewalsModal(veh);
                                  }}
                                  className="h-7 px-2 text-xs gap-1 font-semibold text-blue-600 dark:text-blue-400 border-blue-500/30 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 shadow-2xs"
                                >
                                  <CalendarSync className="h-3 w-3" />
                                  <span>Renewals</span>
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
                              </div>
                            </AppTableCell>
                          </AppTableRow>

                          {/* ========================================================================= */}
                          {/* INLINE COMPREHENSIVE VEHICLE MASTER DOSSIER (ON SAME SCREEN) */}
                          {/* ========================================================================= */}
                          {isExpanded && (
                            <AppTableRow className="bg-slate-50/95 dark:bg-slate-900/95 border-b-2 border-theme-btn-primary/40">
                              <AppTableCell colSpan={showInventoryFinancials ? 11 : 10} className="p-4 sm:p-6 space-y-4">
                                
                                {/* 1. DOSSIER HEADER BANNER */}
                                <div className="p-4 rounded-xl border border-border bg-surface shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                                  <div className="flex items-center gap-3.5 flex-wrap">
                                    {renderHsrpPlate(veh.registration_number)}
                                    <div>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="text-base font-bold text-foreground">
                                          {veh.make} {veh.model} {veh.year ? `(${veh.year})` : ""}
                                        </h3>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                          {veh.category || "Standard"}
                                        </span>
                                        {veh.fuel_type && (
                                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 flex items-center gap-1">
                                            <Fuel className="h-2.5 w-2.5" />
                                            <span>{veh.fuel_type}</span>
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-xs text-muted-foreground flex items-center gap-2.5 mt-0.5 flex-wrap">
                                        <span>VIN: <strong className="font-mono text-foreground">{veh.vin_chassis_number || "—"}</strong></span>
                                        <span>•</span>
                                        <span>Owner: <strong className="text-foreground">{veh.registered_owner || "Corporate Fleet"}</strong></span>
                                        <span>•</span>
                                        <span>RTO: <strong className="text-foreground">{veh.rto_office || "State Transport"}</strong></span>
                                        {veh.assignedDriver && (
                                          <>
                                            <span>•</span>
                                            <span>Chauffeur: <strong className="text-purple-600 dark:text-purple-400">{veh.assignedDriver.full_name}</strong></span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Quick Actions at Top Right of Expanded Dossier */}
                                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                                    <AppButton
                                      type="button"
                                      variant="primary"
                                      size="sm"
                                      onClick={() => setViewingVehicle(veh)}
                                      className="text-xs h-8 px-3 gap-1.5 font-semibold bg-theme-btn-primary hover:bg-theme-btn-primary-secondary text-white shadow-2xs"
                                    >
                                      <ExternalLink className="h-3.5 w-3.5" />
                                      <span>Open Full 360° Dossier</span>
                                    </AppButton>
                                    <AppButton
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setExpandedVehicleId(null)}
                                      className="text-xs h-8 px-2.5 gap-1 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                      <span>Collapse</span>
                                    </AppButton>
                                  </div>
                                </div>

                                {/* 2. SEGMENTED TAB BAR FOR VEHICLE RELATED COLUMNS / SECTIONS */}
                                <div className="flex items-center gap-1.5 border-b border-border pb-2 overflow-x-auto no-scrollbar">
                                  <button
                                    type="button"
                                    onClick={() => setExpandedVehicleTab("SPECS")}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors ${
                                      expandedVehicleTab === "SPECS"
                                        ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-2xs"
                                        : "text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                                    }`}
                                  >
                                    <Gauge className="h-3.5 w-3.5" />
                                    <span>Specifications</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setExpandedVehicleTab("SERVICES")}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors ${
                                      expandedVehicleTab === "SERVICES"
                                        ? "bg-amber-600 text-white shadow-2xs"
                                        : "text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                                    }`}
                                  >
                                    <Wrench className="h-3.5 w-3.5" />
                                    <span>Service Details</span>
                                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                                      expandedVehicleTab === "SERVICES" ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700 text-foreground"
                                    }`}>
                                      {vServices.length}
                                    </span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setExpandedVehicleTab("PARTS")}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors ${
                                      expandedVehicleTab === "PARTS"
                                        ? "bg-blue-600 text-white shadow-2xs"
                                        : "text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                                    }`}
                                  >
                                    <Package className="h-3.5 w-3.5" />
                                    <span>Spare Parts Details</span>
                                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                                      expandedVehicleTab === "PARTS" ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700 text-foreground"
                                    }`}>
                                      {vParts.length}
                                    </span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setExpandedVehicleTab("DOCS")}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors ${
                                      expandedVehicleTab === "DOCS"
                                        ? "bg-emerald-600 text-white shadow-2xs"
                                        : "text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                                    }`}
                                  >
                                    <FileCheck className="h-3.5 w-3.5" />
                                    <span>Document Details</span>
                                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                                      expandedVehicleTab === "DOCS" ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700 text-foreground"
                                    }`}>
                                      {vDocs.length}
                                    </span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setExpandedVehicleTab("COMPLIANCE")}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors ${
                                      expandedVehicleTab === "COMPLIANCE"
                                        ? "bg-cyan-600 text-white shadow-2xs"
                                        : "text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                                    }`}
                                  >
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                    <span>Compliance & Renewals</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setExpandedVehicleTab("TRIPS")}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors ${
                                      expandedVehicleTab === "TRIPS"
                                        ? "bg-purple-600 text-white shadow-2xs"
                                        : "text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                                    }`}
                                  >
                                    <MapPin className="h-3.5 w-3.5" />
                                    <span>Trip Details</span>
                                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                                      expandedVehicleTab === "TRIPS" ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700 text-foreground"
                                    }`}>
                                      {vTrips.length}
                                    </span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setExpandedVehicleTab("ALL")}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors ${
                                      expandedVehicleTab === "ALL"
                                        ? "bg-gradient-to-r from-theme-btn-primary to-indigo-600 text-white shadow-2xs"
                                        : "text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                                    }`}
                                  >
                                    <Layers className="h-3.5 w-3.5" />
                                    <span>360° All Columns</span>
                                  </button>
                                </div>

                                {/* ===================================================================== */}
                                {/* TAB 1: SPECIFICATIONS & VEHICLE ASSET IDENTITY */}
                                {/* ===================================================================== */}
                                {(expandedVehicleTab === "SPECS" || expandedVehicleTab === "ALL") && (
                                  <div className="space-y-3">
                                    <div className="text-xs font-bold text-foreground flex items-center justify-between">
                                      <span className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                                        <Gauge className="h-3.5 w-3.5 text-theme-btn-primary" />
                                        <span>Powertrain, Legal & Financial Specifications</span>
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 text-xs">
                                      <div className="p-2.5 rounded-lg border border-border bg-surface space-y-0.5">
                                        <div className="text-[10px] font-bold text-muted-foreground uppercase">Fuel / Powertrain</div>
                                        <div className="font-semibold text-foreground">{veh.fuel_type || "Petrol"}</div>
                                      </div>
                                      <div className="p-2.5 rounded-lg border border-border bg-surface space-y-0.5">
                                        <div className="text-[10px] font-bold text-muted-foreground uppercase">Chassis (VIN)</div>
                                        <div className="font-mono font-bold text-foreground truncate" title={veh.vin_chassis_number || "—"}>
                                          {veh.vin_chassis_number || "—"}
                                        </div>
                                      </div>
                                      <div className="p-2.5 rounded-lg border border-border bg-surface space-y-0.5">
                                        <div className="text-[10px] font-bold text-muted-foreground uppercase">Engine Number</div>
                                        <div className="font-mono font-bold text-foreground truncate" title={veh.engine_number || "—"}>
                                          {veh.engine_number || "—"}
                                        </div>
                                      </div>
                                      <div className="p-2.5 rounded-lg border border-border bg-surface space-y-0.5">
                                        <div className="text-[10px] font-bold text-muted-foreground uppercase">Registration Date</div>
                                        <div className="font-mono font-semibold text-foreground">
                                          {veh.registration_date ? String(veh.registration_date).split("T")[0] : "—"}
                                        </div>
                                      </div>
                                      <div className="p-2.5 rounded-lg border border-border bg-surface space-y-0.5">
                                        <div className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                                          <IndianRupee className="h-2.5 w-2.5 text-emerald-600" />
                                          <span>Purchase Price</span>
                                        </div>
                                        <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                          {veh.purchase_price || veh.purchase_cost
                                            ? `₹${Number(veh.purchase_price || veh.purchase_cost).toLocaleString("en-IN")}`
                                            : "—"}
                                        </div>
                                      </div>
                                      <div className="p-2.5 rounded-lg border border-border bg-surface space-y-0.5">
                                        <div className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                                          <CalendarClock className="h-2.5 w-2.5 text-indigo-500" />
                                          <span>Extended Expiry</span>
                                        </div>
                                        <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                          {veh.custom_extended_expiry_date ? String(veh.custom_extended_expiry_date).split("T")[0] : "—"}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* ===================================================================== */}
                                {/* TAB 2: SERVICE DETAILS & WORKSHOP BREAKDOWN */}
                                {/* ===================================================================== */}
                                {(expandedVehicleTab === "SERVICES" || expandedVehicleTab === "ALL") && (
                                  <div className="space-y-3 pt-1">
                                    <div className="flex items-center justify-between">
                                      <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                        <Wrench className="h-3.5 w-3.5 text-amber-500" />
                                        <span>Workshop Service History ({vServices.length} Records • Spend: ₹{totalSvcSpend.toLocaleString("en-IN")})</span>
                                      </div>
                                      {canManageMaintenance && (
                                        <AppButton
                                          type="button"
                                          size="sm"
                                          variant="primary"
                                          onClick={() => {
                                            resetMaintenanceForm();
                                            setNewMaintVehicleId(veh.id);
                                            setIsAddMaintenanceOpen(true);
                                          }}
                                          className="h-7 text-xs px-2.5 bg-amber-600 hover:bg-amber-700 text-white gap-1 font-semibold shadow-2xs"
                                        >
                                          <Plus className="h-3 w-3" />
                                          <span>+ Log Service</span>
                                        </AppButton>
                                      )}
                                    </div>

                                    {vServices.length === 0 ? (
                                      <div className="p-4 text-center rounded-xl border border-dashed border-border bg-surface text-xs text-muted-foreground">
                                        No workshop services logged for this vehicle yet. Click <strong>+ Log Service</strong> to record maintenance.
                                      </div>
                                    ) : (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                        {vServices.map((svc) => (
                                          <div
                                            key={svc.id}
                                            onClick={() => setSelectedMaintenanceForView(svc)}
                                            className="p-3 rounded-xl border border-border bg-surface hover:border-amber-500/40 cursor-pointer transition-colors shadow-2xs space-y-1.5"
                                          >
                                            <div className="flex items-center justify-between">
                                              <span className="font-bold text-foreground text-xs">{svc.service_type || "General Service"}</span>
                                              <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-xs">
                                                ₹{Number(svc.cost || 0).toLocaleString("en-IN")}
                                              </span>
                                            </div>
                                            <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                                              <span>Date: {svc.service_date}</span>
                                              <span>{svc.odometer_km ? `${svc.odometer_km.toLocaleString()} km` : "—"}</span>
                                            </div>
                                            <div className="text-[11px] text-muted-foreground truncate">
                                              Workshop: <strong className="text-foreground">{svc.service_center || "Authorized Center"}</strong>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* ===================================================================== */}
                                {/* TAB 3: MOUNTED SPARE PARTS & ACCESSORIES */}
                                {/* ===================================================================== */}
                                {(expandedVehicleTab === "PARTS" || expandedVehicleTab === "ALL") && (
                                  <div className="space-y-3 pt-1">
                                    <div className="flex items-center justify-between">
                                      <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                        <Package className="h-3.5 w-3.5 text-blue-500" />
                                        <span>Mounted Spare Parts & Assets ({vParts.length} Parts • Total Value: ₹{totalPartsVal.toLocaleString("en-IN")})</span>
                                      </div>
                                      {canManageMaintenance && (
                                        <AppButton
                                          type="button"
                                          size="sm"
                                          variant="primary"
                                          onClick={() => {
                                            openCreatePartModal();
                                            setPartFormVehicleId(veh.id);
                                            setPartFormAssignedVehicleReg(veh.registration_number);
                                          }}
                                          className="h-7 text-xs px-2.5 bg-blue-600 hover:bg-blue-700 text-white gap-1 font-semibold shadow-2xs"
                                        >
                                          <Plus className="h-3 w-3" />
                                          <span>+ Mount Part</span>
                                        </AppButton>
                                      )}
                                    </div>

                                    {vParts.length === 0 ? (
                                      <div className="p-4 text-center rounded-xl border border-dashed border-border bg-surface text-xs text-muted-foreground">
                                        No spare parts or components mounted on this vehicle yet. Click <strong>+ Mount Part</strong> to track tires, batteries, or accessories.
                                      </div>
                                    ) : (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                        {vParts.map((pt) => {
                                          const days = pt.warranty_expiry_date ? calculateDaysRemaining(pt.warranty_expiry_date) : null;
                                          return (
                                            <div
                                              key={pt.id}
                                              onClick={() => setViewingPart(pt)}
                                              className="p-3 rounded-xl border border-border bg-surface hover:border-blue-500/40 cursor-pointer transition-colors shadow-2xs space-y-1.5"
                                            >
                                              <div className="flex items-center justify-between">
                                                <span className="font-bold text-foreground text-xs truncate max-w-[150px]">{pt.name}</span>
                                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300">
                                                  {pt.item_type || "PART"}
                                                </span>
                                              </div>
                                              <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                                                <span>Brand: <strong className="text-foreground">{pt.brand || "OEM"}</strong></span>
                                                <span className="font-mono">{pt.serial_number ? `#${pt.serial_number}` : ""}</span>
                                              </div>
                                              <div className="text-[10px] flex items-center justify-between pt-1 border-t border-border/60">
                                                <span className="text-muted-foreground">Warranty:</span>
                                                {days !== null ? (
                                                  days < 0 ? (
                                                    <span className="font-bold text-rose-600 dark:text-rose-400">Expired ({Math.abs(days)}d ago)</span>
                                                  ) : (
                                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{days}d left</span>
                                                  )
                                                ) : (
                                                  <span className="text-muted-foreground italic">No expiry</span>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* ===================================================================== */}
                                {/* TAB 4: DOCUMENT VAULT (VIEW, DOWNLOAD & UPLOAD) */}
                                {/* ===================================================================== */}
                                {(expandedVehicleTab === "DOCS" || expandedVehicleTab === "ALL") && (
                                  <div className="space-y-3 pt-1">
                                    <div className="flex items-center justify-between">
                                      <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                        <FileCheck className="h-3.5 w-3.5 text-emerald-500" />
                                        <span>Legal & Compliance Document Vault ({vDocs.length} Documents Archived)</span>
                                      </div>
                                      <label className="h-7 text-xs px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white gap-1 font-semibold rounded-lg shadow-2xs inline-flex items-center cursor-pointer transition-colors">
                                        <UploadCloud className="h-3 w-3" />
                                        <span>+ Upload Doc</span>
                                        <input
                                          type="file"
                                          multiple
                                          accept="image/*,.pdf"
                                          className="hidden"
                                          onChange={async (e) => {
                                            const fileList = e.target.files;
                                            if (!fileList || fileList.length === 0) return;
                                            for (let i = 0; i < fileList.length; i++) {
                                              const file = fileList[i];
                                              const reader = new FileReader();
                                              reader.onload = async (ev) => {
                                                const base64Url = ev.target?.result as string;
                                                if (base64Url) {
                                                  const res = await createVehicleDocumentAction(veh.id, {
                                                    doc_type: "OTHER",
                                                    title: file.name.replace(/\.[^/.]+$/, ""),
                                                    file_name: file.name,
                                                    file_size: formatFileSize(file.size),
                                                    file_type: file.type || resolveMimeFromName(file.name),
                                                    file_url: base64Url,
                                                    status: "VALID"
                                                  });
                                                  if (res.success && res.document) {
                                                    setVehicles((prev) =>
                                                      prev.map((v) =>
                                                        v.id === veh.id
                                                          ? { ...v, documents: [...(v.documents || []), res.document!] }
                                                          : v
                                                      )
                                                    );
                                                    triggerToast(`Document "${file.name}" uploaded successfully!`);
                                                  }
                                                }
                                              };
                                              reader.readAsDataURL(file);
                                            }
                                          }}
                                        />
                                      </label>
                                    </div>

                                    {vDocs.length === 0 ? (
                                      <div className="p-4 text-center rounded-xl border border-dashed border-border bg-surface text-xs text-muted-foreground">
                                        No legal documents attached yet. Click <strong>+ Upload Doc</strong> to archive PUC, insurance schedule, RC, or invoices.
                                      </div>
                                    ) : (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                        {vDocs.map((doc, dIdx) => (
                                          <div
                                            key={doc.id || dIdx}
                                            className="p-3 rounded-xl border border-border bg-surface hover:border-emerald-500/40 transition-colors shadow-2xs flex items-center justify-between gap-2.5"
                                          >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                              <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-border shrink-0">
                                                {renderAttachmentIcon(doc.file_type || resolveMimeFromName(doc.file_name), doc.file_name)}
                                              </div>
                                              <div className="min-w-0">
                                                <div className="font-bold text-foreground text-xs truncate max-w-[130px]" title={doc.title || doc.file_name}>
                                                  {doc.title || doc.file_name}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground truncate">
                                                  {doc.doc_type} {doc.document_number ? `• #${doc.document_number}` : ""}
                                                </div>
                                              </div>
                                            </div>

                                            <div className="flex items-center gap-1 shrink-0">
                                              <AppButton
                                                type="button"
                                                variant="outline"
                                                size="icon-sm"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setPreviewAttachment({
                                                    id: doc.id,
                                                    file_name: doc.file_name,
                                                    file_url: doc.file_url,
                                                    file_type: doc.file_type || resolveMimeFromName(doc.file_name),
                                                    file_size: doc.file_size
                                                  });
                                                }}
                                                className="h-7 w-7 text-theme-btn-primary hover:bg-theme-btn-primary/10"
                                                title="View Document"
                                              >
                                                <Eye className="h-3.5 w-3.5" />
                                              </AppButton>
                                              <AppButton
                                                type="button"
                                                variant="outline"
                                                size="icon-sm"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  const link = document.createElement("a");
                                                  link.href = doc.file_url;
                                                  link.download = doc.file_name;
                                                  link.target = "_blank";
                                                  document.body.appendChild(link);
                                                  link.click();
                                                  document.body.removeChild(link);
                                                }}
                                                className="h-7 w-7 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                                title="Download Document"
                                              >
                                                <Download className="h-3.5 w-3.5" />
                                              </AppButton>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* ===================================================================== */}
                                {/* TAB 5: STATUTORY COMPLIANCE & RENEWALS */}
                                {/* ===================================================================== */}
                                {(expandedVehicleTab === "COMPLIANCE" || expandedVehicleTab === "ALL") && (
                                  <div className="space-y-3 pt-1">
                                    <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                      <ShieldCheck className="h-3.5 w-3.5 text-cyan-600" />
                                      <span>Statutory Compliance, Motor Policies & Validity Clearances</span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                                      {/* Insurance Box */}
                                      <div className="p-3 rounded-xl border border-cyan-500/30 bg-cyan-500/5 space-y-1.5">
                                        <div className="flex items-center justify-between">
                                          <span className="font-bold text-cyan-800 dark:text-cyan-300">Motor Insurance</span>
                                          {renderExpiryBadge(calculateDaysRemaining(veh.insurance_expiry_date))}
                                        </div>
                                        <div className="text-[11px] text-muted-foreground space-y-0.5">
                                          <div>Vendor: <strong className="text-foreground">{veh.insurance_vendor || "—"}</strong></div>
                                          <div>Policy #: <strong className="font-mono text-foreground">{veh.insurance_policy_number || "—"}</strong></div>
                                          <div>Expiry: <strong className="font-mono text-foreground">{veh.insurance_expiry_date ? String(veh.insurance_expiry_date).split("T")[0] : "—"}</strong></div>
                                        </div>
                                        <div className="pt-1.5 flex items-center gap-1.5">
                                          <AppButton
                                            type="button"
                                            size="sm"
                                            variant="primary"
                                            onClick={() => handleOpenVehiclePolicyRenewModal(veh)}
                                            className="h-6 text-[10px] px-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold"
                                          >
                                            Renew Policy
                                          </AppButton>
                                        </div>
                                      </div>

                                      {/* PUC Box */}
                                      <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-1.5">
                                        <div className="flex items-center justify-between">
                                          <span className="font-bold text-emerald-800 dark:text-emerald-300">PUC Clearance</span>
                                          {isElectricFuel(veh.fuel_type) ? (
                                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-700">EV Exempt</span>
                                          ) : (
                                            renderExpiryBadge(calculateDaysRemaining(veh.puc_expiry_date))
                                          )}
                                        </div>
                                        <div className="text-[11px] text-muted-foreground space-y-0.5">
                                          <div>Status: <strong className="text-foreground">{isElectricFuel(veh.fuel_type) ? "Zero Emission" : "CMVR Regulated"}</strong></div>
                                          <div>Expiry: <strong className="font-mono text-foreground">{veh.puc_expiry_date ? String(veh.puc_expiry_date).split("T")[0] : "—"}</strong></div>
                                          <div>Fitness: <strong className="font-mono text-foreground">{veh.fitness_expiry_date || "—"}</strong></div>
                                        </div>
                                        {!isElectricFuel(veh.fuel_type) && (
                                          <div className="pt-1.5 flex items-center gap-1.5">
                                            <AppButton
                                              type="button"
                                              size="sm"
                                              variant="primary"
                                              onClick={() => handleOpenVehiclePucRenewModal(veh)}
                                              className="h-6 text-[10px] px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                                            >
                                              Renew PUC
                                            </AppButton>
                                          </div>
                                        )}
                                      </div>

                                      {/* Extended Expiry & Safety Box */}
                                      <div className="p-3 rounded-xl border border-indigo-500/30 bg-indigo-500/5 space-y-1.5">
                                        <div className="flex items-center justify-between">
                                          <span className="font-bold text-indigo-800 dark:text-indigo-300">Custom Extended Validity</span>
                                          {veh.custom_extended_expiry_date && renderExpiryBadge(calculateDaysRemaining(veh.custom_extended_expiry_date))}
                                        </div>
                                        <div className="text-[11px] text-muted-foreground space-y-0.5">
                                          <div>Extended Expiry: <strong className="font-mono text-foreground">{veh.custom_extended_expiry_date ? String(veh.custom_extended_expiry_date).split("T")[0] : "None"}</strong></div>
                                          <div>HSRP Plate: <strong className="text-foreground">{veh.has_hsrp_plate !== false ? "Laser-Etched Fitted" : "Standard"}</strong></div>
                                          <div>Roadside RSA: <strong className="text-foreground">{veh.has_roadside_assistance !== false ? "24x7 Active" : "No"}</strong></div>
                                        </div>
                                        <div className="pt-1.5 flex items-center gap-1.5">
                                          <AppButton
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => openEditVehicleModal(veh)}
                                            className="h-6 text-[10px] px-2 text-indigo-700 dark:text-indigo-300 font-semibold"
                                          >
                                            Edit Compliance
                                          </AppButton>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* ===================================================================== */}
                                {/* TAB 6: TRIP MOVEMENTS & FLEET DISPATCHES */}
                                {/* ===================================================================== */}
                                {(expandedVehicleTab === "TRIPS" || expandedVehicleTab === "ALL") && (
                                  <div className="space-y-3 pt-1">
                                    <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                      <MapPin className="h-3.5 w-3.5 text-purple-500" />
                                      <span>Trip Movement Logs ({vTrips.length} Dispatched Journeys)</span>
                                    </div>

                                    {vTrips.length === 0 ? (
                                      <div className="p-4 text-center rounded-xl border border-dashed border-border bg-surface text-xs text-muted-foreground">
                                        No trip movements or dispatches recorded for this vehicle yet.
                                      </div>
                                    ) : (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                        {vTrips.map((tp) => (
                                          <div
                                            key={tp.id}
                                            onClick={() => setViewingTrip(tp)}
                                            className="p-3 rounded-xl border border-border bg-surface hover:border-purple-500/40 cursor-pointer transition-colors shadow-2xs space-y-1"
                                          >
                                            <div className="flex items-center justify-between">
                                              <span className="font-bold text-foreground text-xs">{tp.traveler_name || "Corporate Transit"}</span>
                                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300">
                                                {tp.status}
                                              </span>
                                            </div>
                                            <div className="text-[11px] text-muted-foreground truncate">
                                              Route: <strong className="text-foreground">{tp.origin || "HQ"} → {tp.destination || "Destination"}</strong>
                                            </div>
                                            <div className="text-[10px] text-muted-foreground flex items-center justify-between">
                                              <span>Date: {tp.plan_date || tp.created_at?.split("T")[0]}</span>
                                              <span>Chauffeur: {tp.driver_name || "Assigned"}</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}

                              </AppTableCell>
                            </AppTableRow>
                          )}
                        </React.Fragment>
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
      {/* DRIVERS DIRECTORY TAB */}
      {/* ---------------------------------------------------------------------- */}
      {!isAnyTransactionFormOpen && activeTab === "drivers" && (
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
      {!isAnyTransactionFormOpen && activeTab === "trips" && (
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
      {!isAnyTransactionFormOpen && activeTab === "maintenance" && (
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
                            {Array.isArray(partsData?.attachments) && partsData.attachments.length > 0 && (
                              <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 mt-1">
                                <Paperclip className="h-2.5 w-2.5" />
                                <span>{partsData.attachments.length} {partsData.attachments.length === 1 ? "file" : "files"}</span>
                              </div>
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
      {!isAnyTransactionFormOpen && activeTab === "travelers" && (
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
      {!isAnyTransactionFormOpen && activeTab === "alerts" && (
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
                                      handleOpenVehicleUnifiedRenewalsModal(item.vehicle!);
                                    }}
                                    className="h-7 text-xs px-2 text-blue-600 dark:text-blue-400 border-blue-500/30 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 gap-1 font-semibold shadow-2xs"
                                    title="Unified Renewals & Free Services Lifecycle"
                                  >
                                    <CalendarSync className="h-3 w-3" />
                                    <span>All Renewals</span>
                                  </AppButton>
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
      {!isAnyTransactionFormOpen && activeTab === "reports" && (
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
      {!isAnyTransactionFormOpen && activeTab === "parts" && (
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
                                <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                                  <span className="font-mono">{part.category}</span>
                                  {part.part_number && (
                                    <>
                                      <span>•</span>
                                      <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                                        SKU: {part.part_number}
                                      </span>
                                    </>
                                  )}
                                  {(() => {
                                    let attCount = 0;
                                    if (part.notes) {
                                      try {
                                        const parsed = JSON.parse(part.notes);
                                        if (Array.isArray(parsed.attachments)) attCount = parsed.attachments.length;
                                      } catch {}
                                    }
                                    if (attCount > 0) {
                                      return (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                                          <Paperclip className="h-3 w-3" />
                                          <span>{attCount} {attCount === 1 ? "doc" : "docs"}</span>
                                        </span>
                                      );
                                    }
                                    return null;
                                  })()}
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
      {!isAnyTransactionFormOpen && activeTab === "vendors" && (
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
      {!isAnyTransactionFormOpen && activeTab === "my-garage" && (
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
      {!isAnyTransactionFormOpen && activeTab === "learning" && (
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
      {!isAnyTransactionFormOpen && activeTab === "settings" && (
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
        <TransactionFormLayout
          title={`Edit Vehicle Specifications: ${editVehiclePlate || selectedVehicleForEdit.registration_number}`}
          badge="Vehicle Master Form"
          category="Fleet Operations"
          icon={Car}
          iconBg="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25"
          description="Update official RTO RC records, technical powertrain specifications, statutory compliance dates or driver assignment."
          breadcrumbs={[
            { label: "Fleet Inventory", onClick: () => setIsEditVehicleOpen(false) },
            { label: `Edit Vehicle (${editVehiclePlate || selectedVehicleForEdit.registration_number})` }
          ]}
          onBack={() => setIsEditVehicleOpen(false)}
          backLabel="Back to Fleet"
          onReset={() => {
            if (selectedVehicleForEdit) openEditVehicleModal(selectedVehicleForEdit);
          }}
          onSave={handleUpdateVehicle}
          saveLabel="Save & Update Vehicle"
          saveIcon={Save}
          isSubmitting={modalSubmitting}
          headerActions={
            <div className="flex items-center gap-2">
              <AppButton
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleOpenVehicleSpecHistoryModal(selectedVehicleForEdit)}
                className="h-9 px-3 text-xs gap-1.5 font-semibold text-purple-600 dark:text-purple-400 border-purple-500/30 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950/30 shadow-2xs"
                title="View specification change history and audit trail"
              >
                <ClipboardCheck className="h-3.5 w-3.5" />
                <span>Revision History</span>
              </AppButton>
              {canDeleteVehicle && (
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
                  className="h-9 px-3 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900 gap-1.5 font-semibold"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Vehicle</span>
                </AppButton>
              )}
            </div>
          }
        >
          <div className="space-y-6">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1 flex items-center gap-1">
                      <IndianRupee className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Purchase Price (₹)</span>
                    </label>
                    <AppInput 
                      type="number"
                      min="0"
                      step="1"
                      placeholder="e.g. 1250000"
                      value={editVehiclePurchasePrice} 
                      onChange={(e) => setEditVehiclePurchasePrice(e.target.value)} 
                      className="font-mono text-xs"
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
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold flex items-center gap-1">
                        <CalendarClock className="h-3.5 w-3.5 text-indigo-500" />
                        <span>Custom Extended Expiry Date</span>
                      </label>
                      {editVehicleCustomExtendedExpiryDate && (
                        <div>{renderExpiryBadge(calculateDaysRemaining(editVehicleCustomExtendedExpiryDate))}</div>
                      )}
                    </div>
                    <AppInput 
                      type="date"
                      value={editVehicleCustomExtendedExpiryDate} 
                      onChange={(e) => setEditVehicleCustomExtendedExpiryDate(e.target.value)} 
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

              {/* SECTION 5: VEHICLE LEGAL & COMPLIANCE DOCUMENTS VAULT */}
              <div className="rounded-xl border border-border bg-slate-50/70 dark:bg-slate-900/50 p-4 space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
                    <FileCheck className="h-4 w-4 text-emerald-500" />
                    <span>5. Legal & Compliance Documents Vault</span>
                  </div>
                  <span className="text-[11px] font-semibold text-muted-foreground bg-surface px-2.5 py-0.5 rounded-md border border-border">
                    {editVehicleDocs.length} {editVehicleDocs.length === 1 ? "document archived" : "documents archived"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="font-semibold text-foreground block mb-1">Document Category *</label>
                    <select
                      value={editDocType}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditDocType(val);
                        const match = VEHICLE_DOC_TYPES.find(t => t.value === val);
                        if (match && (!editDocTitle || VEHICLE_DOC_TYPES.some(t => t.label === editDocTitle))) {
                          setEditDocTitle(match.label);
                        }
                      }}
                      className="w-full h-9 rounded-lg border border-border bg-surface px-2.5 text-xs font-semibold text-foreground focus:outline-none focus:border-theme-btn-primary shadow-2xs"
                    >
                      {VEHICLE_DOC_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-foreground block mb-1">Document Title / Note</label>
                    <AppInput
                      placeholder="e.g. Valid PUC 2026-2027"
                      value={editDocTitle}
                      onChange={(e) => setEditDocTitle(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-foreground block mb-1">Certificate / Policy #</label>
                    <AppInput
                      placeholder="e.g. POL-2026-98124"
                      value={editDocNumber}
                      onChange={(e) => setEditDocNumber(e.target.value)}
                      className="text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-foreground block mb-1">Document Expiry Date</label>
                    <AppInput
                      type="date"
                      value={editDocExpiry}
                      onChange={(e) => setEditDocExpiry(e.target.value)}
                      className="text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Upload Dropzone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingEditVehicleDoc(true); }}
                  onDragLeave={() => setIsDraggingEditVehicleDoc(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingEditVehicleDoc(false);
                    if (e.dataTransfer.files?.length) {
                      handleVehicleDocumentFileUpload(
                        e.dataTransfer.files, 
                        setEditVehicleDocs, 
                        editDocType,
                        editDocTitle,
                        editDocNumber,
                        editDocExpiry
                      );
                      setEditDocTitle("");
                      setEditDocNumber("");
                      setEditDocExpiry("");
                    }
                  }}
                  onClick={() => editVehicleDocFileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-1.5 group ${
                    isDraggingEditVehicleDoc 
                      ? "border-theme-btn-primary bg-theme-btn-primary/5" 
                      : "border-border hover:border-theme-btn-primary/60 bg-surface/50 hover:bg-surface"
                  }`}
                >
                  <input
                    type="file"
                    multiple
                    ref={editVehicleDocFileInputRef}
                    onChange={(e) => {
                      if (e.target.files?.length) {
                        handleVehicleDocumentFileUpload(
                          e.target.files, 
                          setEditVehicleDocs,
                          editDocType,
                          editDocTitle,
                          editDocNumber,
                          editDocExpiry
                        );
                        setEditDocTitle("");
                        setEditDocNumber("");
                        setEditDocExpiry("");
                        e.target.value = "";
                      }
                    }}
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                    className="hidden"
                  />
                  <div className="h-9 w-9 rounded-full bg-theme-btn-primary/10 text-theme-btn-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                    <UploadCloud className="h-4 w-4" />
                  </div>
                  <div className="text-xs font-semibold text-foreground">
                    Upload new document (PDF, Images) or drag & drop files here
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    PUC, Insurance Policy, RC Book Smart Card, Fitness Certificate, Permits (up to 25MB)
                  </div>
                </div>

                {/* Uploaded Documents List */}
                {editVehicleDocs.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {editVehicleDocs.map((doc, idx) => {
                        const typeConfig = VEHICLE_DOC_TYPES.find(t => t.value === doc.doc_type) || {
                          label: doc.doc_type,
                          badgeColor: "bg-slate-500/10 text-slate-600 border-slate-500/20"
                        };
                        return (
                          <div
                            key={doc.id || idx}
                            className="p-3 rounded-lg border border-border bg-surface hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-border/80 shrink-0">
                                {renderAttachmentIcon(doc.file_type || resolveMimeFromName(doc.file_name), doc.file_name)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${typeConfig.badgeColor}`}>
                                    {typeConfig.label}
                                  </span>
                                  {doc.document_number && (
                                    <span className="text-[9px] font-mono text-muted-foreground">
                                      #{doc.document_number}
                                    </span>
                                  )}
                                </div>
                                <div className="font-semibold text-foreground truncate mt-0.5" title={doc.title || doc.file_name}>
                                  {doc.title || doc.file_name}
                                </div>
                                <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                  <span>{formatFileSize(doc.file_size)}</span>
                                  {doc.expiry_date && (
                                    <>
                                      <span>•</span>
                                      <span className="text-amber-600 dark:text-amber-400 font-medium">Exp: {doc.expiry_date}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <AppButton
                                type="button"
                                variant="outline"
                                size="icon-sm"
                                onClick={() => {
                                  setPreviewAttachment({
                                    id: doc.id,
                                    file_name: doc.file_name,
                                    file_size: doc.file_size || "0 B",
                                    file_type: doc.file_type || resolveMimeFromName(doc.file_name),
                                    file_url: doc.file_url,
                                    uploaded_at: doc.uploaded_at
                                  });
                                  setPreviewZoom(1);
                                  setPreviewRotation(0);
                                }}
                                className="h-7 w-7 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                                title="View / Preview Document"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </AppButton>
                              <AppButton
                                type="button"
                                variant="outline"
                                size="icon-sm"
                                onClick={() => downloadAttachment(doc)}
                                className="h-7 w-7 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                                title="Download Document"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </AppButton>
                              <AppButton
                                type="button"
                                variant="outline"
                                size="icon-sm"
                                onClick={() => {
                                  setEditVehicleDocs((prev) => prev.filter((_, i) => i !== idx));
                                  triggerToast(`Removed ${doc.file_name}`);
                                }}
                                className="h-7 w-7 text-rose-600 hover:bg-rose-500/10 hover:border-rose-500/40"
                                title="Remove Document"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </AppButton>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

          </div>
        </TransactionFormLayout>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* ADD DRIVER MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {isAddDriverOpen && (
        <TransactionFormLayout
          title="Register Driver Personnel Profile"
          badge="Driver Master Form"
          category="Driver Operations"
          icon={Users}
          iconBg="bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/25"
          description="Enroll a licensed driver into the company fleet roster, record driving credentials, emergency contacts & primary vehicle allocation."
          breadcrumbs={[
            { label: "Driver Management", onClick: () => setIsAddDriverOpen(false) },
            { label: "New Driver" }
          ]}
          onBack={() => setIsAddDriverOpen(false)}
          backLabel="Back to Drivers"
          onReset={() => {
            setNewDriverName("");
            setNewDriverPhone("");
            setNewDriverLicense("");
            setNewDriverLicenseExpiry("");
            setNewDriverExperience(0);
            setNewDriverEmergency("");
            setNewDriverVehicleId("");
          }}
          onSave={handleCreateDriver}
          saveLabel="Save & Register Driver"
          saveIcon={UserCheck}
          isSubmitting={modalSubmitting}
        >
          <div className="space-y-4">
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

          </div>
        </TransactionFormLayout>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* EDIT DRIVER MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {isEditDriverOpen && selectedDriverForEdit && (
        <TransactionFormLayout
          title={`Edit Driver Profile: ${selectedDriverForEdit.full_name}`}
          badge="Driver Master Form"
          category="Driver Operations"
          icon={Users}
          iconBg="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25"
          description="Update driver license validity, emergency contacts, primary vehicle assignment & active duty status."
          breadcrumbs={[
            { label: "Driver Management", onClick: () => setIsEditDriverOpen(false) },
            { label: `Edit Driver (${selectedDriverForEdit.full_name})` }
          ]}
          onBack={() => setIsEditDriverOpen(false)}
          backLabel="Back to Drivers"
          onReset={() => {
            if (selectedDriverForEdit) openEditDriverModal(selectedDriverForEdit);
          }}
          onSave={handleUpdateDriver}
          saveLabel="Save & Update Driver"
          saveIcon={Save}
          isSubmitting={modalSubmitting}
        >
          <div className="space-y-4">
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

          </div>
        </TransactionFormLayout>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* DISPATCH TRIP MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {isDispatchTripOpen && (
        <TransactionFormLayout
          title="Dispatch Vehicle Trip & Route Manifest"
          badge="Trip Dispatch Form"
          category="Transit Operations"
          icon={MapPin}
          iconBg="bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/25"
          description="Assign an available depot vehicle and duty driver, record traveler manifest, destination route & start odometer reading."
          breadcrumbs={[
            { label: "Trip Dispatches", onClick: () => setIsDispatchTripOpen(false) },
            { label: "Dispatch Trip" }
          ]}
          onBack={() => setIsDispatchTripOpen(false)}
          backLabel="Back to Dispatches"
          onReset={() => {
            setNewTripVehicleId("");
            setNewTripDriverId("");
            setNewTripTraveler("");
            setNewTripPurpose("");
            setNewTripOrigin("");
            setNewTripDestination("");
          }}
          onSave={handleDispatchTrip}
          saveLabel="Dispatch & Start Trip"
          saveIcon={Play}
          isSubmitting={modalSubmitting}
        >
          <div className="space-y-4">
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

          </div>
        </TransactionFormLayout>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* LOG SERVICE JOB CARD & WORKSHOP BILL MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {isAddMaintenanceOpen && (
        <TransactionFormLayout
          title="Log Service Job Card & Workshop Bill"
          badge="Maintenance Work Order"
          category="Workshop & Maintenance"
          icon={Wrench}
          iconBg="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25"
          description="Record scheduled service or breakdown repairs, vendor workshop invoices, parts cost & service tax breakdown."
          breadcrumbs={[
            { label: "Maintenance Records", onClick: () => setIsAddMaintenanceOpen(false) },
            { label: "New Job Card" }
          ]}
          onBack={() => setIsAddMaintenanceOpen(false)}
          backLabel="Back to Maintenance"
          onReset={() => {
            resetMaintenanceForm();
          }}
          onSave={handleLogMaintenance}
          saveLabel="Save Service Record & Bill"
          saveIcon={Save}
          isSubmitting={modalSubmitting}
        >
          <div className="space-y-6">
              <div className="p-5 space-y-5 flex-1">
                {/* Sub-Tab Navigation Header */}
                <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-border">
                  <button
                    type="button"
                    onClick={() => setNewMaintActiveSection("SCOPE_WORKSHOP")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3.5 rounded-lg text-xs font-bold transition-all ${
                      newMaintActiveSection === "SCOPE_WORKSHOP"
                        ? "bg-surface text-foreground shadow-xs border border-border"
                        : "text-muted-foreground hover:text-foreground hover:bg-surface/50"
                    }`}
                  >
                    <Wrench className="h-4 w-4 text-amber-500" />
                    <span>1. Vehicle & Service Scope</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewMaintActiveSection("BILLING_FORECAST")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3.5 rounded-lg text-xs font-bold transition-all ${
                      newMaintActiveSection === "BILLING_FORECAST"
                        ? "bg-surface text-foreground shadow-xs border border-border"
                        : "text-muted-foreground hover:text-foreground hover:bg-surface/50"
                    }`}
                  >
                    <Receipt className="h-4 w-4 text-emerald-500" />
                    <span>2. Billing, Tax Breakdown & Attachments</span>
                    {newMaintAttachments.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                        {newMaintAttachments.length}
                      </span>
                    )}
                  </button>
                </div>
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
                        placeholder="e.g. Ramesh Sharma (Lead Service Advisor)"
                        className="h-10 text-xs"
                      />
                    </div>

                    <div className="pt-3 border-t border-border flex justify-end">
                      <AppButton
                        type="button"
                        variant="primary"
                        onClick={() => setNewMaintActiveSection("BILLING_FORECAST")}
                        className="bg-theme-btn-primary hover:bg-theme-btn-primary-secondary text-white text-xs font-semibold gap-1.5 h-9"
                      >
                        <span>Proceed to Billing, Taxes & Attachments</span>
                        <ArrowRight className="h-4 w-4" />
                      </AppButton>
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

                    {/* Financial Costing & Statutory Tax Breakdown */}
                    <div className="p-4 rounded-xl border border-border bg-slate-50/60 dark:bg-slate-900/50 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/70 pb-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shrink-0">
                            <Receipt className="h-4 w-4" />
                          </div>
                          <div>
                            <h4 className="font-bold text-xs text-foreground">Workshop Invoice & Statutory Tax Breakdown</h4>
                            <p className="text-[10px] text-muted-foreground">Itemized charges, GST additions, and TDS withholding deductions</p>
                          </div>
                        </div>

                        {/* Quick Presets */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-muted-foreground font-semibold mr-1">Presets:</span>
                          <AppButton
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const gross = (Number(newMaintPartsCost) || 0) + (Number(newMaintLabourCost) || 0);
                              const taxable = Math.max(0, gross - (Number(newMaintDiscount) || 0));
                              const gst = Math.round(taxable * 0.18);
                              setNewMaintTaxRate(18);
                              setNewMaintTaxCost(gst);
                              setNewMaintCost(Math.max(0, taxable + gst - (Number(newMaintTdsAmount) || 0) - (Number(newMaintOtherDeductions) || 0)));
                            }}
                            className="text-[10px] h-6 px-2 py-0 border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                          >
                            18% GST (Std)
                          </AppButton>
                          <AppButton
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const gross = (Number(newMaintPartsCost) || 0) + (Number(newMaintLabourCost) || 0);
                              const taxable = Math.max(0, gross - (Number(newMaintDiscount) || 0));
                              const gst = Math.round(taxable * 0.12);
                              setNewMaintTaxRate(12);
                              setNewMaintTaxCost(gst);
                              setNewMaintCost(Math.max(0, taxable + gst - (Number(newMaintTdsAmount) || 0) - (Number(newMaintOtherDeductions) || 0)));
                            }}
                            className="text-[10px] h-6 px-2 py-0 border-slate-300 dark:border-slate-700 hover:bg-slate-100"
                          >
                            12% GST
                          </AppButton>
                          <AppButton
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const gross = (Number(newMaintPartsCost) || 0) + (Number(newMaintLabourCost) || 0);
                              const taxable = Math.max(0, gross - (Number(newMaintDiscount) || 0));
                              const tds = Math.round(taxable * 0.02);
                              setNewMaintTdsRate(2);
                              setNewMaintTdsAmount(tds);
                              setNewMaintCost(Math.max(0, taxable + (Number(newMaintTaxCost) || 0) - tds - (Number(newMaintOtherDeductions) || 0)));
                            }}
                            className="text-[10px] h-6 px-2 py-0 border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40"
                          >
                            2% TDS (194C)
                          </AppButton>
                          <AppButton
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const gross = (Number(newMaintPartsCost) || 0) + (Number(newMaintLabourCost) || 0);
                              const taxable = Math.max(0, gross - (Number(newMaintDiscount) || 0));
                              setNewMaintTaxRate(0);
                              setNewMaintTaxCost(0);
                              setNewMaintTdsRate(0);
                              setNewMaintTdsAmount(0);
                              setNewMaintOtherDeductions(0);
                              setNewMaintCost(taxable);
                            }}
                            className="text-[10px] h-6 px-1.5 py-0 text-muted-foreground hover:text-foreground"
                          >
                            Clear
                          </AppButton>
                        </div>
                      </div>

                      {/* 1. Base Cost Components & Trade Discount */}
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                          <span>1. Gross Service Base & Trade Discount</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="text-[11px] font-semibold block mb-1 text-muted-foreground">
                              Labour / Service Charges (₹)
                            </label>
                            <AppInput
                              type="number"
                              min="0"
                              value={newMaintLabourCost || ""}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 0;
                                setNewMaintLabourCost(val);
                                const gross = val + (Number(newMaintPartsCost) || 0);
                                const taxable = Math.max(0, gross - (Number(newMaintDiscount) || 0));
                                const taxAmt = newMaintTaxRate > 0 ? Math.round(taxable * (newMaintTaxRate / 100)) : (Number(newMaintTaxCost) || 0);
                                const tdsAmt = newMaintTdsRate > 0 ? Math.round(taxable * (newMaintTdsRate / 100)) : (Number(newMaintTdsAmount) || 0);
                                setNewMaintCost(Math.max(0, taxable + taxAmt - tdsAmt - (Number(newMaintOtherDeductions) || 0)));
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
                              min="0"
                              value={newMaintPartsCost || ""}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 0;
                                setNewMaintPartsCost(val);
                                const gross = (Number(newMaintLabourCost) || 0) + val;
                                const taxable = Math.max(0, gross - (Number(newMaintDiscount) || 0));
                                const taxAmt = newMaintTaxRate > 0 ? Math.round(taxable * (newMaintTaxRate / 100)) : (Number(newMaintTaxCost) || 0);
                                const tdsAmt = newMaintTdsRate > 0 ? Math.round(taxable * (newMaintTdsRate / 100)) : (Number(newMaintTdsAmount) || 0);
                                setNewMaintCost(Math.max(0, taxable + taxAmt - tdsAmt - (Number(newMaintOtherDeductions) || 0)));
                              }}
                              className="h-9 text-xs font-mono font-semibold"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold block mb-1 text-muted-foreground">
                              Trade Discount / Vendor Waiver (₹)
                            </label>
                            <AppInput
                              type="number"
                              min="0"
                              value={newMaintDiscount || ""}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 0;
                                setNewMaintDiscount(val);
                                const gross = (Number(newMaintLabourCost) || 0) + (Number(newMaintPartsCost) || 0);
                                const taxable = Math.max(0, gross - val);
                                const taxAmt = newMaintTaxRate > 0 ? Math.round(taxable * (newMaintTaxRate / 100)) : (Number(newMaintTaxCost) || 0);
                                const tdsAmt = newMaintTdsRate > 0 ? Math.round(taxable * (newMaintTdsRate / 100)) : (Number(newMaintTdsAmount) || 0);
                                setNewMaintCost(Math.max(0, taxable + taxAmt - tdsAmt - (Number(newMaintOtherDeductions) || 0)));
                              }}
                              className="h-9 text-xs font-mono font-semibold text-rose-600 dark:text-rose-400"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </div>

                      {/* 2. Tax Addition (GST Rate & Taxes) */}
                      <div className="space-y-1.5 pt-1 border-t border-border/50">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                            <span>2. Statutory Tax Addition (GST / VAT)</span>
                          </span>
                          {newMaintTaxCost > 0 && (
                            <span className="font-mono text-[10px] text-muted-foreground font-normal">
                              CGST: ₹{Math.round(newMaintTaxCost / 2).toLocaleString("en-IN")} + SGST: ₹{Math.round(newMaintTaxCost / 2).toLocaleString("en-IN")} (or IGST)
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="text-[11px] font-semibold block mb-1 text-muted-foreground">
                              GST Rate (%)
                            </label>
                            <select
                              value={newMaintTaxRate}
                              onChange={(e) => {
                                const rate = Number(e.target.value) || 0;
                                setNewMaintTaxRate(rate);
                                const gross = (Number(newMaintLabourCost) || 0) + (Number(newMaintPartsCost) || 0);
                                const taxable = Math.max(0, gross - (Number(newMaintDiscount) || 0));
                                const taxAmt = Math.round(taxable * (rate / 100));
                                setNewMaintTaxCost(taxAmt);
                                setNewMaintCost(Math.max(0, taxable + taxAmt - (Number(newMaintTdsAmount) || 0) - (Number(newMaintOtherDeductions) || 0)));
                              }}
                              className="w-full h-9 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-foreground focus:outline-none focus:border-theme-btn-primary"
                            >
                              <option value={0}>0% (Tax Exempt / Nil)</option>
                              <option value={5}>5% GST</option>
                              <option value={12}>12% GST</option>
                              <option value={18}>18% GST (Standard)</option>
                              <option value={28}>28% GST (Luxury/Heavy)</option>
                            </select>
                          </div>

                          <div className="sm:col-span-2">
                            <label className="text-[11px] font-semibold block mb-1 text-muted-foreground">
                              GST / Tax Addition Amount (₹)
                            </label>
                            <AppInput
                              type="number"
                              min="0"
                              value={newMaintTaxCost || ""}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 0;
                                setNewMaintTaxCost(val);
                                const gross = (Number(newMaintLabourCost) || 0) + (Number(newMaintPartsCost) || 0);
                                const taxable = Math.max(0, gross - (Number(newMaintDiscount) || 0));
                                setNewMaintCost(Math.max(0, taxable + val - (Number(newMaintTdsAmount) || 0) - (Number(newMaintOtherDeductions) || 0)));
                              }}
                              className="h-9 text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400"
                            />
                          </div>
                        </div>
                      </div>

                      {/* 3. Tax Deductions & Withholding (TDS / Retentions) */}
                      <div className="space-y-1.5 pt-1 border-t border-border/50">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-purple-500"></span>
                          <span>3. Statutory Tax Deductions & Withholding (TDS / Sec 194C / Other)</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="text-[11px] font-semibold block mb-1 text-muted-foreground">
                              TDS Withholding Rate (%)
                            </label>
                            <select
                              value={newMaintTdsRate}
                              onChange={(e) => {
                                const rate = Number(e.target.value) || 0;
                                setNewMaintTdsRate(rate);
                                const gross = (Number(newMaintLabourCost) || 0) + (Number(newMaintPartsCost) || 0);
                                const taxable = Math.max(0, gross - (Number(newMaintDiscount) || 0));
                                const tdsAmt = Math.round(taxable * (rate / 100));
                                setNewMaintTdsAmount(tdsAmt);
                                setNewMaintCost(Math.max(0, taxable + (Number(newMaintTaxCost) || 0) - tdsAmt - (Number(newMaintOtherDeductions) || 0)));
                              }}
                              className="w-full h-9 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-foreground focus:outline-none focus:border-theme-btn-primary"
                            >
                              <option value={0}>0% (No TDS Withholding)</option>
                              <option value={1}>1% (TDS Sec 194C - Individual/HUF)</option>
                              <option value={2}>2% (TDS Sec 194C - Company/Firm / 194J)</option>
                              <option value={5}>5% (TDS Sec 194H / Misc)</option>
                              <option value={10}>10% (TDS Sec 194J Professional)</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold block mb-1 text-muted-foreground">
                              TDS Deduction Amount (₹)
                            </label>
                            <AppInput
                              type="number"
                              min="0"
                              value={newMaintTdsAmount || ""}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 0;
                                setNewMaintTdsAmount(val);
                                const gross = (Number(newMaintLabourCost) || 0) + (Number(newMaintPartsCost) || 0);
                                const taxable = Math.max(0, gross - (Number(newMaintDiscount) || 0));
                                setNewMaintCost(Math.max(0, taxable + (Number(newMaintTaxCost) || 0) - val - (Number(newMaintOtherDeductions) || 0)));
                              }}
                              className="h-9 text-xs font-mono font-semibold text-purple-600 dark:text-purple-400"
                              placeholder="0"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold block mb-1 text-muted-foreground">
                              Other Deductions / Advance Adj (₹)
                            </label>
                            <AppInput
                              type="number"
                              min="0"
                              value={newMaintOtherDeductions || ""}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 0;
                                setNewMaintOtherDeductions(val);
                                const gross = (Number(newMaintLabourCost) || 0) + (Number(newMaintPartsCost) || 0);
                                const taxable = Math.max(0, gross - (Number(newMaintDiscount) || 0));
                                setNewMaintCost(Math.max(0, taxable + (Number(newMaintTaxCost) || 0) - (Number(newMaintTdsAmount) || 0) - val));
                              }}
                              className="h-9 text-xs font-mono font-semibold"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </div>

                      {/* 4. Grand Total Net Payable Card with Live Equation */}
                      <div className="p-3.5 rounded-xl bg-theme-btn-primary/10 border border-theme-btn-primary/20 space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <span className="text-xs font-bold text-foreground block">
                              Net Payable / Invoiced Amount
                            </span>
                            <span className="text-[11px] text-muted-foreground font-mono">
                              Gross (₹{(Number(newMaintLabourCost) + Number(newMaintPartsCost)).toLocaleString("en-IN")}) - Disc (₹{Number(newMaintDiscount).toLocaleString("en-IN")}) + GST (₹{Number(newMaintTaxCost).toLocaleString("en-IN")}) - TDS (₹{Number(newMaintTdsAmount).toLocaleString("en-IN")}) - Ded (₹{Number(newMaintOtherDeductions).toLocaleString("en-IN")})
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-2xl font-bold font-mono text-primary">
                              ₹{Number(newMaintCost).toLocaleString("en-IN")}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Payment Mode & Settlement */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-border/50">
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
                            <option value="PARTIAL">Partial Settlement</option>
                            <option value="WAIVED">Warranty / Fully Waived</option>
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

                    {/* Workshop Bills, Invoices & Job Sheet Attachments */}
                    <div className="p-4 rounded-xl border border-border bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
                            <Paperclip className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-foreground">Workshop Invoice, Bill & Job Sheet Attachments</div>
                            <div className="text-[11px] text-muted-foreground">Upload scanned bills, repair job sheets, warranty cards, or technician diagnosis photos</div>
                          </div>
                        </div>
                        <span className="text-[11px] font-semibold text-muted-foreground bg-surface px-2.5 py-0.5 rounded-md border border-border">
                          {newMaintAttachments.length} {newMaintAttachments.length === 1 ? "file attached" : "files attached"}
                        </span>
                      </div>

                      {/* Upload Dropzone */}
                      <div
                        onDragOver={(e) => { e.preventDefault(); setIsDraggingNewMaint(true); }}
                        onDragLeave={() => setIsDraggingNewMaint(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDraggingNewMaint(false);
                          if (e.dataTransfer.files?.length) {
                            handleAttachmentFilesSelected(e.dataTransfer.files, setNewMaintAttachments);
                          }
                        }}
                        onClick={() => newMaintFileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-1.5 group ${
                          isDraggingNewMaint 
                            ? "border-theme-btn-primary bg-theme-btn-primary/5" 
                            : "border-border hover:border-theme-btn-primary/60 bg-surface/50 hover:bg-surface"
                        }`}
                      >
                        <input
                          type="file"
                          multiple
                          ref={newMaintFileInputRef}
                          onChange={(e) => {
                            if (e.target.files?.length) {
                              handleAttachmentFilesSelected(e.target.files, setNewMaintAttachments);
                              e.target.value = "";
                            }
                          }}
                          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv"
                          className="hidden"
                        />
                        <div className="h-9 w-9 rounded-full bg-theme-btn-primary/10 text-theme-btn-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                          <UploadCloud className="h-5 w-5" />
                        </div>
                        <div className="text-xs font-semibold text-foreground">
                          Click to upload or drag & drop files here
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          PDF Invoices, Workshop Estimates, Part Invoices, Photos (up to 25MB)
                        </div>
                      </div>

                      {/* Uploaded File List */}
                      {newMaintAttachments.length > 0 && (
                        <div className="space-y-2 pt-1">
                          {newMaintAttachments.map((att, idx) => (
                            <div
                              key={att.id || idx}
                              className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-surface hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors text-xs"
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                                <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-border/80 shrink-0">
                                  {renderAttachmentIcon(att.file_type, att.file_name)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="font-semibold text-foreground truncate" title={att.file_name}>
                                    {att.file_name}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                                    <span>{formatFileSize(att.file_size)}</span>
                                    <span>•</span>
                                    <span>{new Date(att.uploaded_at || Date.now()).toLocaleDateString("en-IN")}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <AppButton
                                  type="button"
                                  variant="outline"
                                  size="icon-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewAttachment(att);
                                    setPreviewZoom(1);
                                    setPreviewRotation(0);
                                  }}
                                  className="h-7 w-7 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                                  title="View / Preview File"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </AppButton>
                                <AppButton
                                  type="button"
                                  variant="outline"
                                  size="icon-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    downloadAttachment(att);
                                  }}
                                  className="h-7 w-7 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                                  title="Download File"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </AppButton>
                                <AppButton
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setNewMaintAttachments((prev) => prev.filter((_, i) => i !== idx));
                                  }}
                                  className="h-7 w-7 text-rose-600 hover:bg-rose-500/10"
                                  title="Remove File"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </AppButton>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
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

                    <div className="pt-3 border-t border-border flex justify-start">
                      <AppButton
                        type="button"
                        variant="secondary"
                        onClick={() => setNewMaintActiveSection("SCOPE_WORKSHOP")}
                        className="text-xs font-semibold gap-1.5 h-9"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        <span>Back to Vehicle & Service Scope</span>
                      </AppButton>
                    </div>
                  </div>
                )}
              </div>

          </div>
        </TransactionFormLayout>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* EDIT SERVICE RECORD & WORKSHOP BILL MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {isEditMaintenanceOpen && selectedMaintenanceForEdit && (
        <TransactionFormLayout
          title={`Edit Service Record #${selectedMaintenanceForEdit.id.slice(0, 8)}`}
          badge="Maintenance Work Order"
          category="Workshop & Maintenance"
          icon={Wrench}
          iconBg="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25"
          description="Update workshop invoice details, spare part costs, odometer readings & service status."
          breadcrumbs={[
            { label: "Maintenance Records", onClick: () => setIsEditMaintenanceOpen(false) },
            { label: `Edit Record #${selectedMaintenanceForEdit.id.slice(0, 8)}` }
          ]}
          onBack={() => setIsEditMaintenanceOpen(false)}
          backLabel="Back to Maintenance"
          onReset={() => {
            if (selectedMaintenanceForEdit) openEditMaintenanceModal(selectedMaintenanceForEdit);
          }}
          onSave={handleUpdateMaintenance}
          saveLabel="Save Changes"
          saveIcon={Save}
          isSubmitting={modalSubmitting}
        >
          <div className="space-y-6">
              <div className="p-5 space-y-5 flex-1">
                {/* Sub-Tab Navigation Header */}
                <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-border">
                  <button
                    type="button"
                    onClick={() => setEditMaintActiveSection("SCOPE_WORKSHOP")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3.5 rounded-lg text-xs font-bold transition-all ${
                      editMaintActiveSection === "SCOPE_WORKSHOP"
                        ? "bg-surface text-foreground shadow-xs border border-border"
                        : "text-muted-foreground hover:text-foreground hover:bg-surface/50"
                    }`}
                  >
                    <Wrench className="h-4 w-4 text-amber-500" />
                    <span>1. Vehicle & Service Scope</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditMaintActiveSection("BILLING_FORECAST")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3.5 rounded-lg text-xs font-bold transition-all ${
                      editMaintActiveSection === "BILLING_FORECAST"
                        ? "bg-surface text-foreground shadow-xs border border-border"
                        : "text-muted-foreground hover:text-foreground hover:bg-surface/50"
                    }`}
                  >
                    <Receipt className="h-4 w-4 text-emerald-500" />
                    <span>2. Billing, Tax Breakdown & Attachments</span>
                    {editMaintAttachments.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                        {editMaintAttachments.length}
                      </span>
                    )}
                  </button>
                </div>
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
                        placeholder="e.g. Ramesh Sharma (Lead Service Advisor)"
                        className="h-10 text-xs"
                      />
                    </div>

                    <div className="pt-3 border-t border-border flex justify-end">
                      <AppButton
                        type="button"
                        variant="primary"
                        onClick={() => setEditMaintActiveSection("BILLING_FORECAST")}
                        className="bg-theme-btn-primary hover:bg-theme-btn-primary-secondary text-white text-xs font-semibold gap-1.5 h-9"
                      >
                        <span>Proceed to Billing, Taxes & Attachments</span>
                        <ArrowRight className="h-4 w-4" />
                      </AppButton>
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

                    {/* Financial Costing & Statutory Tax Breakdown */}
                    <div className="p-4 rounded-xl border border-border bg-slate-50/60 dark:bg-slate-900/50 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/70 pb-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shrink-0">
                            <Receipt className="h-4 w-4" />
                          </div>
                          <div>
                            <h4 className="font-bold text-xs text-foreground">Workshop Invoice & Statutory Tax Breakdown</h4>
                            <p className="text-[10px] text-muted-foreground">Itemized charges, GST additions, and TDS withholding deductions</p>
                          </div>
                        </div>

                        {/* Quick Presets */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-muted-foreground font-semibold mr-1">Presets:</span>
                          <AppButton
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const gross = (Number(editMaintPartsCost) || 0) + (Number(editMaintLabourCost) || 0);
                              const taxable = Math.max(0, gross - (Number(editMaintDiscount) || 0));
                              const gst = Math.round(taxable * 0.18);
                              setEditMaintTaxRate(18);
                              setEditMaintTaxCost(gst);
                              setEditMaintCost(Math.max(0, taxable + gst - (Number(editMaintTdsAmount) || 0) - (Number(editMaintOtherDeductions) || 0)));
                            }}
                            className="text-[10px] h-6 px-2 py-0 border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                          >
                            18% GST (Std)
                          </AppButton>
                          <AppButton
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const gross = (Number(editMaintPartsCost) || 0) + (Number(editMaintLabourCost) || 0);
                              const taxable = Math.max(0, gross - (Number(editMaintDiscount) || 0));
                              const gst = Math.round(taxable * 0.12);
                              setEditMaintTaxRate(12);
                              setEditMaintTaxCost(gst);
                              setEditMaintCost(Math.max(0, taxable + gst - (Number(editMaintTdsAmount) || 0) - (Number(editMaintOtherDeductions) || 0)));
                            }}
                            className="text-[10px] h-6 px-2 py-0 border-slate-300 dark:border-slate-700 hover:bg-slate-100"
                          >
                            12% GST
                          </AppButton>
                          <AppButton
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const gross = (Number(editMaintPartsCost) || 0) + (Number(editMaintLabourCost) || 0);
                              const taxable = Math.max(0, gross - (Number(editMaintDiscount) || 0));
                              const tds = Math.round(taxable * 0.02);
                              setEditMaintTdsRate(2);
                              setEditMaintTdsAmount(tds);
                              setEditMaintCost(Math.max(0, taxable + (Number(editMaintTaxCost) || 0) - tds - (Number(editMaintOtherDeductions) || 0)));
                            }}
                            className="text-[10px] h-6 px-2 py-0 border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40"
                          >
                            2% TDS (194C)
                          </AppButton>
                          <AppButton
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const gross = (Number(editMaintPartsCost) || 0) + (Number(editMaintLabourCost) || 0);
                              const taxable = Math.max(0, gross - (Number(editMaintDiscount) || 0));
                              setEditMaintTaxRate(0);
                              setEditMaintTaxCost(0);
                              setEditMaintTdsRate(0);
                              setEditMaintTdsAmount(0);
                              setEditMaintOtherDeductions(0);
                              setEditMaintCost(taxable);
                            }}
                            className="text-[10px] h-6 px-1.5 py-0 text-muted-foreground hover:text-foreground"
                          >
                            Clear
                          </AppButton>
                        </div>
                      </div>

                      {/* 1. Base Cost Components & Trade Discount */}
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                          <span>1. Gross Service Base & Trade Discount</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="text-[11px] font-semibold block mb-1 text-muted-foreground">
                              Labour / Service Charges (₹)
                            </label>
                            <AppInput
                              type="number"
                              min="0"
                              value={editMaintLabourCost || ""}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 0;
                                setEditMaintLabourCost(val);
                                const gross = val + (Number(editMaintPartsCost) || 0);
                                const taxable = Math.max(0, gross - (Number(editMaintDiscount) || 0));
                                const taxAmt = editMaintTaxRate > 0 ? Math.round(taxable * (editMaintTaxRate / 100)) : (Number(editMaintTaxCost) || 0);
                                const tdsAmt = editMaintTdsRate > 0 ? Math.round(taxable * (editMaintTdsRate / 100)) : (Number(editMaintTdsAmount) || 0);
                                setEditMaintCost(Math.max(0, taxable + taxAmt - tdsAmt - (Number(editMaintOtherDeductions) || 0)));
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
                              min="0"
                              value={editMaintPartsCost || ""}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 0;
                                setEditMaintPartsCost(val);
                                const gross = (Number(editMaintLabourCost) || 0) + val;
                                const taxable = Math.max(0, gross - (Number(editMaintDiscount) || 0));
                                const taxAmt = editMaintTaxRate > 0 ? Math.round(taxable * (editMaintTaxRate / 100)) : (Number(editMaintTaxCost) || 0);
                                const tdsAmt = editMaintTdsRate > 0 ? Math.round(taxable * (editMaintTdsRate / 100)) : (Number(editMaintTdsAmount) || 0);
                                setEditMaintCost(Math.max(0, taxable + taxAmt - tdsAmt - (Number(editMaintOtherDeductions) || 0)));
                              }}
                              className="h-9 text-xs font-mono font-semibold"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold block mb-1 text-muted-foreground">
                              Trade Discount / Vendor Waiver (₹)
                            </label>
                            <AppInput
                              type="number"
                              min="0"
                              value={editMaintDiscount || ""}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 0;
                                setEditMaintDiscount(val);
                                const gross = (Number(editMaintLabourCost) || 0) + (Number(editMaintPartsCost) || 0);
                                const taxable = Math.max(0, gross - val);
                                const taxAmt = editMaintTaxRate > 0 ? Math.round(taxable * (editMaintTaxRate / 100)) : (Number(editMaintTaxCost) || 0);
                                const tdsAmt = editMaintTdsRate > 0 ? Math.round(taxable * (editMaintTdsRate / 100)) : (Number(editMaintTdsAmount) || 0);
                                setEditMaintCost(Math.max(0, taxable + taxAmt - tdsAmt - (Number(editMaintOtherDeductions) || 0)));
                              }}
                              className="h-9 text-xs font-mono font-semibold text-rose-600 dark:text-rose-400"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </div>

                      {/* 2. Tax Addition (GST Rate & Taxes) */}
                      <div className="space-y-1.5 pt-1 border-t border-border/50">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                            <span>2. Statutory Tax Addition (GST / VAT)</span>
                          </span>
                          {editMaintTaxCost > 0 && (
                            <span className="font-mono text-[10px] text-muted-foreground font-normal">
                              CGST: ₹{Math.round(editMaintTaxCost / 2).toLocaleString("en-IN")} + SGST: ₹{Math.round(editMaintTaxCost / 2).toLocaleString("en-IN")} (or IGST)
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="text-[11px] font-semibold block mb-1 text-muted-foreground">
                              GST Rate (%)
                            </label>
                            <select
                              value={editMaintTaxRate}
                              onChange={(e) => {
                                const rate = Number(e.target.value) || 0;
                                setEditMaintTaxRate(rate);
                                const gross = (Number(editMaintLabourCost) || 0) + (Number(editMaintPartsCost) || 0);
                                const taxable = Math.max(0, gross - (Number(editMaintDiscount) || 0));
                                const taxAmt = Math.round(taxable * (rate / 100));
                                setEditMaintTaxCost(taxAmt);
                                setEditMaintCost(Math.max(0, taxable + taxAmt - (Number(editMaintTdsAmount) || 0) - (Number(editMaintOtherDeductions) || 0)));
                              }}
                              className="w-full h-9 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-foreground focus:outline-none focus:border-theme-btn-primary"
                            >
                              <option value={0}>0% (Tax Exempt / Nil)</option>
                              <option value={5}>5% GST</option>
                              <option value={12}>12% GST</option>
                              <option value={18}>18% GST (Standard)</option>
                              <option value={28}>28% GST (Luxury/Heavy)</option>
                            </select>
                          </div>

                          <div className="sm:col-span-2">
                            <label className="text-[11px] font-semibold block mb-1 text-muted-foreground">
                              GST / Tax Addition Amount (₹)
                            </label>
                            <AppInput
                              type="number"
                              min="0"
                              value={editMaintTaxCost || ""}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 0;
                                setEditMaintTaxCost(val);
                                const gross = (Number(editMaintLabourCost) || 0) + (Number(editMaintPartsCost) || 0);
                                const taxable = Math.max(0, gross - (Number(editMaintDiscount) || 0));
                                setEditMaintCost(Math.max(0, taxable + val - (Number(editMaintTdsAmount) || 0) - (Number(editMaintOtherDeductions) || 0)));
                              }}
                              className="h-9 text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400"
                            />
                          </div>
                        </div>
                      </div>

                      {/* 3. Tax Deductions & Withholding (TDS / Retentions) */}
                      <div className="space-y-1.5 pt-1 border-t border-border/50">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-purple-500"></span>
                          <span>3. Statutory Tax Deductions & Withholding (TDS / Sec 194C / Other)</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="text-[11px] font-semibold block mb-1 text-muted-foreground">
                              TDS Withholding Rate (%)
                            </label>
                            <select
                              value={editMaintTdsRate}
                              onChange={(e) => {
                                const rate = Number(e.target.value) || 0;
                                setEditMaintTdsRate(rate);
                                const gross = (Number(editMaintLabourCost) || 0) + (Number(editMaintPartsCost) || 0);
                                const taxable = Math.max(0, gross - (Number(editMaintDiscount) || 0));
                                const tdsAmt = Math.round(taxable * (rate / 100));
                                setEditMaintTdsAmount(tdsAmt);
                                setEditMaintCost(Math.max(0, taxable + (Number(editMaintTaxCost) || 0) - tdsAmt - (Number(editMaintOtherDeductions) || 0)));
                              }}
                              className="w-full h-9 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-foreground focus:outline-none focus:border-theme-btn-primary"
                            >
                              <option value={0}>0% (No TDS Withholding)</option>
                              <option value={1}>1% (TDS Sec 194C - Individual/HUF)</option>
                              <option value={2}>2% (TDS Sec 194C - Company/Firm / 194J)</option>
                              <option value={5}>5% (TDS Sec 194H / Misc)</option>
                              <option value={10}>10% (TDS Sec 194J Professional)</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold block mb-1 text-muted-foreground">
                              TDS Deduction Amount (₹)
                            </label>
                            <AppInput
                              type="number"
                              min="0"
                              value={editMaintTdsAmount || ""}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 0;
                                setEditMaintTdsAmount(val);
                                const gross = (Number(editMaintLabourCost) || 0) + (Number(editMaintPartsCost) || 0);
                                const taxable = Math.max(0, gross - (Number(editMaintDiscount) || 0));
                                setEditMaintCost(Math.max(0, taxable + (Number(editMaintTaxCost) || 0) - val - (Number(editMaintOtherDeductions) || 0)));
                              }}
                              className="h-9 text-xs font-mono font-semibold text-purple-600 dark:text-purple-400"
                              placeholder="0"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold block mb-1 text-muted-foreground">
                              Other Deductions / Advance Adj (₹)
                            </label>
                            <AppInput
                              type="number"
                              min="0"
                              value={editMaintOtherDeductions || ""}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 0;
                                setEditMaintOtherDeductions(val);
                                const gross = (Number(editMaintLabourCost) || 0) + (Number(editMaintPartsCost) || 0);
                                const taxable = Math.max(0, gross - (Number(editMaintDiscount) || 0));
                                setEditMaintCost(Math.max(0, taxable + (Number(editMaintTaxCost) || 0) - (Number(editMaintTdsAmount) || 0) - val));
                              }}
                              className="h-9 text-xs font-mono font-semibold"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </div>

                      {/* 4. Grand Total Net Payable Card with Live Equation */}
                      <div className="p-3.5 rounded-xl bg-theme-btn-primary/10 border border-theme-btn-primary/20 space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <span className="text-xs font-bold text-foreground block">
                              Net Payable / Invoiced Amount
                            </span>
                            <span className="text-[11px] text-muted-foreground font-mono">
                              Gross (₹{(Number(editMaintLabourCost) + Number(editMaintPartsCost)).toLocaleString("en-IN")}) - Disc (₹{Number(editMaintDiscount).toLocaleString("en-IN")}) + GST (₹{Number(editMaintTaxCost).toLocaleString("en-IN")}) - TDS (₹{Number(editMaintTdsAmount).toLocaleString("en-IN")}) - Ded (₹{Number(editMaintOtherDeductions).toLocaleString("en-IN")})
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-2xl font-bold font-mono text-primary">
                              ₹{Number(editMaintCost).toLocaleString("en-IN")}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Payment Mode & Settlement */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-border/50">
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
                            <option value="PARTIAL">Partial Settlement</option>
                            <option value="WAIVED">Warranty / Fully Waived</option>
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

                    {/* Workshop Bills, Invoices & Job Sheet Attachments */}
                    <div className="p-4 rounded-xl border border-border bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
                            <Paperclip className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-foreground">Workshop Invoice, Bill & Job Sheet Attachments</div>
                            <div className="text-[11px] text-muted-foreground">Upload scanned bills, repair job sheets, warranty cards, or technician diagnosis photos</div>
                          </div>
                        </div>
                        <span className="text-[11px] font-semibold text-muted-foreground bg-surface px-2.5 py-0.5 rounded-md border border-border">
                          {editMaintAttachments.length} {editMaintAttachments.length === 1 ? "file attached" : "files attached"}
                        </span>
                      </div>

                      {/* Upload Dropzone */}
                      <div
                        onDragOver={(e) => { e.preventDefault(); setIsDraggingEditMaint(true); }}
                        onDragLeave={() => setIsDraggingEditMaint(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDraggingEditMaint(false);
                          if (e.dataTransfer.files?.length) {
                            handleAttachmentFilesSelected(e.dataTransfer.files, setEditMaintAttachments);
                          }
                        }}
                        onClick={() => editMaintFileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-1.5 group ${
                          isDraggingEditMaint 
                            ? "border-theme-btn-primary bg-theme-btn-primary/5" 
                            : "border-border hover:border-theme-btn-primary/60 bg-surface/50 hover:bg-surface"
                        }`}
                      >
                        <input
                          type="file"
                          multiple
                          ref={editMaintFileInputRef}
                          onChange={(e) => {
                            if (e.target.files?.length) {
                              handleAttachmentFilesSelected(e.target.files, setEditMaintAttachments);
                              e.target.value = "";
                            }
                          }}
                          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv"
                          className="hidden"
                        />
                        <div className="h-9 w-9 rounded-full bg-theme-btn-primary/10 text-theme-btn-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                          <UploadCloud className="h-5 w-5" />
                        </div>
                        <div className="text-xs font-semibold text-foreground">
                          Click to upload or drag & drop files here
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          PDF Invoices, Workshop Estimates, Part Invoices, Photos (up to 25MB)
                        </div>
                      </div>

                      {/* Uploaded File List */}
                      {editMaintAttachments.length > 0 && (
                        <div className="space-y-2 pt-1">
                          {editMaintAttachments.map((att, idx) => (
                            <div
                              key={att.id || idx}
                              className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-surface hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors text-xs"
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                                <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-border/80 shrink-0">
                                  {renderAttachmentIcon(att.file_type, att.file_name)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="font-semibold text-foreground truncate" title={att.file_name}>
                                    {att.file_name}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                                    <span>{formatFileSize(att.file_size)}</span>
                                    <span>•</span>
                                    <span>{new Date(att.uploaded_at || Date.now()).toLocaleDateString("en-IN")}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <AppButton
                                  type="button"
                                  variant="outline"
                                  size="icon-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewAttachment(att);
                                    setPreviewZoom(1);
                                    setPreviewRotation(0);
                                  }}
                                  className="h-7 w-7 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                                  title="View / Preview File"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </AppButton>
                                <AppButton
                                  type="button"
                                  variant="outline"
                                  size="icon-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    downloadAttachment(att);
                                  }}
                                  className="h-7 w-7 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                                  title="Download File"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </AppButton>
                                <AppButton
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditMaintAttachments((prev) => prev.filter((_, i) => i !== idx));
                                  }}
                                  className="h-7 w-7 text-rose-600 hover:bg-rose-500/10"
                                  title="Remove File"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </AppButton>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
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

                    <div className="pt-3 border-t border-border flex justify-start">
                      <AppButton
                        type="button"
                        variant="secondary"
                        onClick={() => setEditMaintActiveSection("SCOPE_WORKSHOP")}
                        className="text-xs font-semibold gap-1.5 h-9"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        <span>Back to Vehicle & Service Scope</span>
                      </AppButton>
                    </div>
                  </div>
                )}
              </div>

          </div>
        </TransactionFormLayout>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* VIEW DETAILED JOB CARD & SERVICE INVOICE MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {selectedMaintenanceForView && (
        <WorkingDocumentLayout
          title={`Service Work Order #${selectedMaintenanceForView.id.slice(0, 8)}`}
          badge={selectedMaintenanceForView.status}
          badgeColor="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
          category="Workshop & Maintenance"
          icon={Receipt}
          iconBg="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25"
          description="Official service job card, cost ledger breakdown, workshop attachments & audit trail."
          breadcrumbs={[
            { label: "Maintenance Records", onClick: () => setSelectedMaintenanceForView(null) },
            { label: `Work Order #${selectedMaintenanceForView.id.slice(0, 8)}` }
          ]}
          onBack={() => setSelectedMaintenanceForView(null)}
          backLabel="Back to Maintenance"
          headerActions={
            <div className="flex items-center gap-2">
              {canManageMaintenance && (
                <AppButton
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const m = selectedMaintenanceForView;
                    setSelectedMaintenanceForView(null);
                    openEditMaintenanceModal(m);
                  }}
                  className="bg-theme-btn-primary hover:bg-theme-btn-primary-secondary text-white text-xs h-9 px-3 gap-1.5 font-semibold"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>Edit Job Card</span>
                </AppButton>
              )}
              <AppButton
                type="button"
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="text-xs h-9 px-3 gap-1.5 font-semibold"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print Job Card</span>
              </AppButton>
            </div>
          }
        >
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

                    {/* Billing & Tax Statement with Additions & Deductions */}
                    <div className="p-4 rounded-xl border border-border bg-surface space-y-3">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 pb-1 border-b border-border">
                        <Receipt className="h-4 w-4 text-emerald-500" />
                        <span>Tax Invoice & Accounting Statement</span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Labour & Service Charges:</span>
                          <span className="font-mono font-medium text-foreground">
                            ₹{Number(partsData?.labour_cost || 0).toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Consumables & Workshop Spares:</span>
                          <span className="font-mono font-medium text-foreground">
                            ₹{Number(partsData?.parts_cost || 0).toLocaleString("en-IN")}
                          </span>
                        </div>
                        {Boolean(partsData?.discount) && Number(partsData.discount) > 0 && (
                          <div className="flex items-center justify-between text-xs text-rose-600 dark:text-rose-400">
                            <span>Trade Discount / Waiver:</span>
                            <span className="font-mono font-medium">
                              -₹{Number(partsData.discount).toLocaleString("en-IN")}
                            </span>
                          </div>
                        )}
                        {Boolean(partsData?.taxable_base) && Number(partsData.taxable_base) > 0 && (
                          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                            <span>Taxable Base:</span>
                            <span className="font-mono text-foreground">
                              ₹{Number(partsData.taxable_base).toLocaleString("en-IN")}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400">
                          <span>GST / Statutory Tax Addition {partsData?.tax_rate ? `(${partsData.tax_rate}%)` : ""}:</span>
                          <span className="font-mono font-medium">
                            +₹{Number(partsData?.tax_amount || 0).toLocaleString("en-IN")}
                          </span>
                        </div>
                        {Boolean(partsData?.tds_amount) && Number(partsData.tds_amount) > 0 && (
                          <div className="flex items-center justify-between text-xs text-purple-600 dark:text-purple-400">
                            <span>TDS Withholding Deduction {partsData?.tds_rate ? `(${partsData.tds_rate}%)` : ""}:</span>
                            <span className="font-mono font-medium">
                              -₹{Number(partsData.tds_amount).toLocaleString("en-IN")}
                            </span>
                          </div>
                        )}
                        {Boolean(partsData?.other_deductions) && Number(partsData.other_deductions) > 0 && (
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Other Deductions / Advances:</span>
                            <span className="font-mono font-medium">
                              -₹{Number(partsData.other_deductions).toLocaleString("en-IN")}
                            </span>
                          </div>
                        )}
                        {partsData?.payment_mode && (
                          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1.5 border-t border-border/60">
                            <span>Payment Channel & Status:</span>
                            <span className="font-medium text-foreground flex items-center gap-1.5">
                              <span>{partsData.payment_mode}</span>
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                {partsData.payment_status || "PAID"}
                              </span>
                            </span>
                          </div>
                        )}
                        <div className="pt-2 border-t border-border flex items-center justify-between text-sm font-bold">
                          <span className="text-foreground">Net Invoiced / Payable Amount:</span>
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

                    {/* Attached Invoices & Workshop Documents */}
                    {(() => {
                      const atts: MaintenanceAttachment[] = Array.isArray(partsData?.attachments) ? partsData.attachments : [];
                      return (
                        <div className="p-4 rounded-xl border border-border bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                              <Paperclip className="h-3.5 w-3.5 text-amber-500" />
                              <span>Attached Invoices, Bills & Workshop Documents ({atts.length})</span>
                            </div>
                          </div>

                          {atts.length === 0 ? (
                            <div className="text-xs text-muted-foreground py-2 italic flex items-center gap-2">
                              <span>No digital invoices or workshop bills attached to this job card.</span>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {atts.map((att, idx) => (
                                <div
                                  key={att.id || idx}
                                  className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface hover:border-theme-btn-primary/40 transition-colors"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                                    <div className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-border/80 shrink-0">
                                      {renderAttachmentIcon(att.file_type, att.file_name)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="font-semibold text-foreground truncate text-xs" title={att.file_name}>
                                        {att.file_name}
                                      </div>
                                      <div className="text-[10px] text-muted-foreground">
                                        {formatFileSize(att.file_size)}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <AppButton
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setPreviewAttachment(att);
                                        setPreviewZoom(1);
                                        setPreviewRotation(0);
                                      }}
                                      className="h-8 px-2.5 text-xs gap-1 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/10 font-semibold"
                                      title="View / Preview"
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                      <span>View</span>
                                    </AppButton>
                                    <AppButton
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => downloadAttachment(att)}
                                      className="h-8 px-2.5 text-xs gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10 font-semibold"
                                      title="Download File"
                                    >
                                      <Download className="h-3.5 w-3.5" />
                                      <span>Download</span>
                                    </AppButton>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}

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
        </WorkingDocumentLayout>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* INSURANCE VENDOR MASTER MODAL (ADD / EDIT) */}
      {/* ---------------------------------------------------------------------- */}
      {isVendorModalOpen && (
        <TransactionFormLayout
          title={selectedVendorForEdit ? "Edit Insurance Underwriter / Broker" : "Register Insurance Underwriter / Broker"}
          badge="Vendor Master Form"
          category="Supply Chain & Underwriters"
          icon={Building2}
          iconBg="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25"
          description="Register or modify authorized insurance underwriters, broker agents & claim desk contacts."
          breadcrumbs={[
            { label: "Insurance Vendors", onClick: () => setIsVendorModalOpen(false) },
            { label: selectedVendorForEdit ? "Edit Vendor" : "New Vendor" }
          ]}
          onBack={() => {
            setIsVendorModalOpen(false);
            setSelectedVendorForEdit(null);
          }}
          backLabel="Back to Vendors"
          onReset={() => {
            if (selectedVendorForEdit) openEditVendorModal(selectedVendorForEdit);
            else openCreateVendorModal();
          }}
          onSave={handleSaveVendor}
          saveLabel={selectedVendorForEdit ? "Update Vendor" : "Save Vendor"}
          saveIcon={Building2}
          isSubmitting={modalSubmitting}
        >
          <div className="space-y-4">

          </div>
        </TransactionFormLayout>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* PARTS & ACCESSORIES MODAL (ADD / EDIT) */}
      {/* ---------------------------------------------------------------------- */}
      {(isAddPartOpen || isEditPartOpen) && (
        <TransactionFormLayout
          title={isEditPartOpen ? "Edit Fleet Part / Accessory" : "Register Spare Part / Accessory"}
          badge="Part Master Form"
          category="Supply Chain & Inventory"
          icon={Package}
          iconBg="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25"
          description="Register spare parts, batteries, tires, telematics GPS units & warranty schedules."
          breadcrumbs={[
            { label: "Parts & Accessories", onClick: () => { setIsAddPartOpen(false); setIsEditPartOpen(false); } },
            { label: isEditPartOpen ? "Edit Part" : "New Part" }
          ]}
          onBack={() => {
            setIsAddPartOpen(false);
            setIsEditPartOpen(false);
            setSelectedPartForEdit(null);
          }}
          backLabel="Back to Parts"
          onReset={() => {
            if (selectedPartForEdit) openEditPartModal(selectedPartForEdit);
            else openCreatePartModal();
          }}
          onSave={handleSavePart}
          saveLabel={isEditPartOpen ? "Save & Update Part" : "Register Part"}
          saveIcon={Save}
          isSubmitting={modalSubmitting}
        >
          <div className="space-y-4">
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

              {/* Section 2: Procurement, Invoicing, Taxes & Costs */}
              <div className="space-y-3 p-4 rounded-xl border border-border bg-slate-50/50 dark:bg-slate-900/40">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Receipt className="h-3.5 w-3.5 text-emerald-500" />
                    <span>2. Procurement, Invoicing & Statutory Tax Breakdown</span>
                  </div>

                  {/* Quick Presets */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-muted-foreground font-semibold">Presets:</span>
                    <AppButton
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const gross = (Number(partFormUnitPrice) || 0) * (Number(partFormQuantity) || 1);
                        const taxable = Math.max(0, gross - (Number(partFormDiscount) || 0));
                        const gst = Math.round(taxable * 0.18);
                        setPartFormTaxRate(18);
                        setPartFormTaxAmount(gst);
                        setPartFormPurchaseAmount(Math.max(0, taxable + gst - (Number(partFormTdsDeduction) || 0) - (Number(partFormOtherDeductions) || 0)));
                      }}
                      className="text-[10px] h-6 px-2 py-0 border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                    >
                      18% GST (Std)
                    </AppButton>
                    <AppButton
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const gross = (Number(partFormUnitPrice) || 0) * (Number(partFormQuantity) || 1);
                        const taxable = Math.max(0, gross - (Number(partFormDiscount) || 0));
                        const gst = Math.round(taxable * 0.28);
                        setPartFormTaxRate(28);
                        setPartFormTaxAmount(gst);
                        setPartFormPurchaseAmount(Math.max(0, taxable + gst - (Number(partFormTdsDeduction) || 0) - (Number(partFormOtherDeductions) || 0)));
                      }}
                      className="text-[10px] h-6 px-2 py-0 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                    >
                      28% GST (Spares)
                    </AppButton>
                    <AppButton
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const gross = (Number(partFormUnitPrice) || 0) * (Number(partFormQuantity) || 1);
                        const taxable = Math.max(0, gross - (Number(partFormDiscount) || 0));
                        const tds = Math.round(taxable * 0.02);
                        setPartFormTdsRate(2);
                        setPartFormTdsDeduction(tds);
                        setPartFormPurchaseAmount(Math.max(0, taxable + (Number(partFormTaxAmount) || 0) - tds - (Number(partFormOtherDeductions) || 0)));
                      }}
                      className="text-[10px] h-6 px-2 py-0 border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40"
                    >
                      2% TDS
                    </AppButton>
                    <AppButton
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const gross = (Number(partFormUnitPrice) || 0) * (Number(partFormQuantity) || 1);
                        const taxable = Math.max(0, gross - (Number(partFormDiscount) || 0));
                        setPartFormTaxRate(0);
                        setPartFormTaxAmount(0);
                        setPartFormTdsRate(0);
                        setPartFormTdsDeduction(0);
                        setPartFormOtherDeductions(0);
                        setPartFormPurchaseAmount(taxable);
                      }}
                      className="text-[10px] h-6 px-1.5 py-0 text-muted-foreground hover:text-foreground"
                    >
                      Clear
                    </AppButton>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                    <label className="font-semibold block mb-1">Procurement Vendor / Supplier</label>
                    <AppInput
                      value={partFormVendorName}
                      onChange={(e) => setPartFormVendorName(e.target.value)}
                      placeholder="e.g. Bosch Authorized Distributor"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Invoice / Bill Number</label>
                    <AppInput
                      value={partFormInvoiceNumber}
                      onChange={(e) => setPartFormInvoiceNumber(e.target.value)}
                      className="font-mono"
                      placeholder="e.g. INV-2026-889"
                    />
                  </div>
                </div>

                {/* Pricing, Quantity & Discount */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="font-semibold block mb-1 text-xs">Unit Price (₹)</label>
                    <AppInput
                      type="number"
                      min="0"
                      step="any"
                      value={partFormUnitPrice || ""}
                      onChange={(e) => {
                        const unit = Number(e.target.value) || 0;
                        setPartFormUnitPrice(unit);
                        const gross = unit * (Number(partFormQuantity) || 1);
                        const taxable = Math.max(0, gross - (Number(partFormDiscount) || 0));
                        const taxAmt = partFormTaxRate > 0 ? Math.round(taxable * (partFormTaxRate / 100)) : (Number(partFormTaxAmount) || 0);
                        const tdsAmt = partFormTdsRate > 0 ? Math.round(taxable * (partFormTdsRate / 100)) : (Number(partFormTdsDeduction) || 0);
                        setPartFormPurchaseAmount(Math.max(0, taxable + taxAmt - tdsAmt - (Number(partFormOtherDeductions) || 0)));
                      }}
                      className="font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1 text-xs">Quantity</label>
                    <AppInput
                      type="number"
                      min="1"
                      value={partFormQuantity}
                      onChange={(e) => {
                        const qty = Number(e.target.value) || 1;
                        setPartFormQuantity(qty);
                        const gross = (Number(partFormUnitPrice) || 0) * qty;
                        const taxable = Math.max(0, gross - (Number(partFormDiscount) || 0));
                        const taxAmt = partFormTaxRate > 0 ? Math.round(taxable * (partFormTaxRate / 100)) : (Number(partFormTaxAmount) || 0);
                        const tdsAmt = partFormTdsRate > 0 ? Math.round(taxable * (partFormTdsRate / 100)) : (Number(partFormTdsDeduction) || 0);
                        setPartFormPurchaseAmount(Math.max(0, taxable + taxAmt - tdsAmt - (Number(partFormOtherDeductions) || 0)));
                      }}
                      className="font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1 text-xs">Trade Discount / Vendor Rebate (₹)</label>
                    <AppInput
                      type="number"
                      min="0"
                      value={partFormDiscount || ""}
                      onChange={(e) => {
                        const disc = Number(e.target.value) || 0;
                        setPartFormDiscount(disc);
                        const gross = (Number(partFormUnitPrice) || 0) * (Number(partFormQuantity) || 1);
                        const taxable = Math.max(0, gross - disc);
                        const taxAmt = partFormTaxRate > 0 ? Math.round(taxable * (partFormTaxRate / 100)) : (Number(partFormTaxAmount) || 0);
                        const tdsAmt = partFormTdsRate > 0 ? Math.round(taxable * (partFormTdsRate / 100)) : (Number(partFormTdsDeduction) || 0);
                        setPartFormPurchaseAmount(Math.max(0, taxable + taxAmt - tdsAmt - (Number(partFormOtherDeductions) || 0)));
                      }}
                      className="font-mono text-rose-600 dark:text-rose-400"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Tax Addition & Deduction Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
                  <div>
                    <label className="font-semibold block mb-1 text-xs">GST Rate (%)</label>
                    <select
                      value={partFormTaxRate}
                      onChange={(e) => {
                        const rate = Number(e.target.value) || 0;
                        setPartFormTaxRate(rate);
                        const gross = (Number(partFormUnitPrice) || 0) * (Number(partFormQuantity) || 1);
                        const taxable = Math.max(0, gross - (Number(partFormDiscount) || 0));
                        const taxAmt = Math.round(taxable * (rate / 100));
                        setPartFormTaxAmount(taxAmt);
                        setPartFormPurchaseAmount(Math.max(0, taxable + taxAmt - (Number(partFormTdsDeduction) || 0) - (Number(partFormOtherDeductions) || 0)));
                      }}
                      className="w-full text-xs h-9 px-3 rounded-lg border border-border bg-surface text-foreground focus:ring-2 focus:ring-theme-btn-primary outline-none"
                    >
                      <option value={0}>0% (Tax Exempt)</option>
                      <option value={5}>5% GST</option>
                      <option value={12}>12% GST</option>
                      <option value={18}>18% GST (Standard)</option>
                      <option value={28}>28% GST (Spares/Tyres)</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold block mb-1 text-xs">GST Tax Amount (₹)</label>
                    <AppInput
                      type="number"
                      min="0"
                      value={partFormTaxAmount || ""}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        setPartFormTaxAmount(val);
                        const gross = (Number(partFormUnitPrice) || 0) * (Number(partFormQuantity) || 1);
                        const taxable = Math.max(0, gross - (Number(partFormDiscount) || 0));
                        setPartFormPurchaseAmount(Math.max(0, taxable + val - (Number(partFormTdsDeduction) || 0) - (Number(partFormOtherDeductions) || 0)));
                      }}
                      className="font-mono text-emerald-600 dark:text-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1 text-xs">TDS Deduction (₹)</label>
                    <AppInput
                      type="number"
                      min="0"
                      value={partFormTdsDeduction || ""}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        setPartFormTdsDeduction(val);
                        const gross = (Number(partFormUnitPrice) || 0) * (Number(partFormQuantity) || 1);
                        const taxable = Math.max(0, gross - (Number(partFormDiscount) || 0));
                        setPartFormPurchaseAmount(Math.max(0, taxable + (Number(partFormTaxAmount) || 0) - val - (Number(partFormOtherDeductions) || 0)));
                      }}
                      className="font-mono text-purple-600 dark:text-purple-400"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1 text-xs">Other Deductions (₹)</label>
                    <AppInput
                      type="number"
                      min="0"
                      value={partFormOtherDeductions || ""}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        setPartFormOtherDeductions(val);
                        const gross = (Number(partFormUnitPrice) || 0) * (Number(partFormQuantity) || 1);
                        const taxable = Math.max(0, gross - (Number(partFormDiscount) || 0));
                        setPartFormPurchaseAmount(Math.max(0, taxable + (Number(partFormTaxAmount) || 0) - (Number(partFormTdsDeduction) || 0) - val));
                      }}
                      className="font-mono"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Grand Total Net Invoiced Card */}
                <div className="p-3 rounded-xl bg-theme-btn-primary/10 border border-theme-btn-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-2">
                  <div>
                    <span className="text-xs font-bold text-foreground block">
                      Total Net Purchase Invoiced Amount (₹)
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      Gross: ₹{((Number(partFormUnitPrice) || 0) * (Number(partFormQuantity) || 1)).toLocaleString("en-IN")} • Taxable: ₹{Math.max(0, ((Number(partFormUnitPrice) || 0) * (Number(partFormQuantity) || 1)) - (Number(partFormDiscount) || 0)).toLocaleString("en-IN")} • GST: +₹{Number(partFormTaxAmount).toLocaleString("en-IN")} • TDS: -₹{Number(partFormTdsDeduction).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="text-right">
                    <AppInput
                      type="number"
                      min="0"
                      step="any"
                      value={partFormPurchaseAmount || ""}
                      onChange={(e) => setPartFormPurchaseAmount(Number(e.target.value) || 0)}
                      className="font-mono font-bold text-base text-primary h-9 w-44 text-right"
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
                      placeholder="Serial numbers, storage bin, workshop notes, fitting guidelines..."
                      className="w-full text-xs p-2.5 rounded-lg border border-border bg-surface text-foreground focus:ring-2 focus:ring-theme-btn-primary outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section 7: Invoices, Warranty Cards, Spec Sheets & Part Photos */}
              <div className="space-y-3 p-4 rounded-xl border border-border bg-slate-50/50 dark:bg-slate-900/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
                      <Paperclip className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">Part Invoices, Warranty Cards & Spec Sheet Attachments</div>
                      <div className="text-[11px] text-muted-foreground">Upload purchase invoices, OEM spec sheets, warranty certificates, or part condition photos</div>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-muted-foreground bg-surface px-2.5 py-0.5 rounded-md border border-border">
                    {partFormAttachments.length} {partFormAttachments.length === 1 ? "file attached" : "files attached"}
                  </span>
                </div>

                {/* Upload Dropzone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingPartFile(true); }}
                  onDragLeave={() => setIsDraggingPartFile(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingPartFile(false);
                    if (e.dataTransfer.files?.length) {
                      handleAttachmentFilesSelected(e.dataTransfer.files, setPartFormAttachments);
                    }
                  }}
                  onClick={() => partFileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-1.5 group ${
                    isDraggingPartFile 
                      ? "border-theme-btn-primary bg-theme-btn-primary/5" 
                      : "border-border hover:border-theme-btn-primary/60 bg-surface/50 hover:bg-surface"
                  }`}
                >
                  <input
                    type="file"
                    multiple
                    ref={partFileInputRef}
                    onChange={(e) => {
                      if (e.target.files?.length) {
                        handleAttachmentFilesSelected(e.target.files, setPartFormAttachments);
                        e.target.value = "";
                      }
                    }}
                    className="hidden"
                    accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv"
                  />
                  <div className="h-9 w-9 rounded-full bg-theme-btn-primary/10 text-theme-btn-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                    <UploadCloud className="h-5 w-5" />
                  </div>
                  <div className="text-xs font-semibold text-foreground">
                    Click to browse or drag & drop files here
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    PDF Invoices, Spec Sheets, Warranty Cards, Photos (up to 25MB each)
                  </div>
                </div>

                {/* Uploaded File List */}
                {partFormAttachments.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {partFormAttachments.map((att, idx) => (
                      <div
                        key={att.id || idx}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-surface hover:border-theme-btn-primary/40 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                          <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-border/80 shrink-0">
                            {renderAttachmentIcon(att.file_type, att.file_name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-foreground truncate text-xs" title={att.file_name}>
                              {att.file_name}
                            </div>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                              <span>{formatFileSize(att.file_size)}</span>
                              <span>•</span>
                              <span>{att.uploaded_at ? new Date(att.uploaded_at).toLocaleDateString("en-IN") : "Attached"}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {att.file_type?.startsWith("image/") && (
                            <AppButton
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewAttachment(att);
                                setPreviewZoom(1);
                                setPreviewRotation(0);
                              }}
                              className="h-7 w-7 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                              title="Preview Image"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </AppButton>
                          )}
                          <AppButton
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadAttachment(att);
                            }}
                            className="h-7 w-7 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                            title="Download File"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </AppButton>
                          <AppButton
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPartFormAttachments((prev) => prev.filter((_, i) => i !== idx));
                            }}
                            className="h-7 w-7 text-rose-600 hover:bg-rose-500/10"
                            title="Remove Attachment"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </AppButton>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
          </div>
        </TransactionFormLayout>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* QUICK RENEW POLICY MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {isRenewPartOpen && selectedPartForRenew && (
        <TransactionFormLayout
          title={`Renew Part / Warranty: ${selectedPartForRenew.name}`}
          badge="Warranty Renewal"
          category="Supply Chain & Parts"
          icon={RotateCcw}
          iconBg="bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/25"
          description="Extend replacement warranty, update inspection dates & purchase invoice records."
          breadcrumbs={[
            { label: "Parts & Accessories", onClick: () => setIsRenewPartOpen(false) },
            { label: `Renew Part (${selectedPartForRenew.name})` }
          ]}
          onBack={() => {
            setIsRenewPartOpen(false);
            setSelectedPartForRenew(null);
          }}
          backLabel="Back to Parts"
          onSave={handleSaveRenewal}
          saveLabel="Save Part Renewal"
          saveIcon={Save}
          isSubmitting={modalSubmitting}
        >
          <div className="space-y-4">

          </div>
        </TransactionFormLayout>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* VEHICLE INSURANCE POLICY RENEWAL MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {isRenewPolicyModalOpen && selectedVehicleForPolicyRenew && (
        <TransactionFormLayout
          title={`Renew Insurance Policy: ${selectedVehicleForPolicyRenew.registration_number}`}
          badge="Policy Renewal"
          category="Statutory Compliance"
          icon={ShieldCheck}
          iconBg="bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/25"
          description="Record newly issued insurance policy number, underwriting vendor, premium amount, coverage dates & policy document."
          breadcrumbs={[
            { label: "Fleet Inventory", onClick: () => setIsRenewPolicyModalOpen(false) },
            { label: `Renew Policy (${selectedVehicleForPolicyRenew.registration_number})` }
          ]}
          onBack={() => {
            setIsRenewPolicyModalOpen(false);
            setSelectedVehicleForPolicyRenew(null);
          }}
          backLabel="Back to Fleet"
          onSave={handleSaveVehiclePolicyRenewal}
          saveLabel="Save & Issue Insurance Policy"
          saveIcon={ShieldCheck}
          isSubmitting={modalSubmitting}
        >
          <div className="space-y-4">
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

          </div>
        </TransactionFormLayout>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* VEHICLE POLICY HISTORY & AUDIT LEDGER MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {isPolicyHistoryModalOpen && selectedVehicleForPolicyHistory && (
        <WorkingDocumentLayout
          title={`Insurance Policy Ledger: ${selectedVehicleForPolicyHistory.registration_number}`}
          badge="Statutory Ledger"
          badgeColor="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20"
          category="Insurance & Underwriting Ledgers"
          icon={History}
          iconBg="bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/25"
          description="Complete chronology of past insurance policies, premium costs, underwriters, claim contacts & certificate documents."
          breadcrumbs={[
            { label: "Fleet Inventory", onClick: () => setIsPolicyHistoryModalOpen(false) },
            { label: `Policy Ledger (${selectedVehicleForPolicyHistory.registration_number})` }
          ]}
          onBack={() => {
            setIsPolicyHistoryModalOpen(false);
            setSelectedVehicleForPolicyHistory(null);
          }}
          backLabel="Back to Fleet"
        >
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
        </WorkingDocumentLayout>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* VEHICLE PUC RENEWAL MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {isRenewPucModalOpen && selectedVehicleForPucRenew && (
        <TransactionFormLayout
          title={`Renew PUC Emission Certificate: ${selectedVehicleForPucRenew.registration_number}`}
          badge="PUC Renewal"
          category="Statutory Compliance"
          icon={Wind}
          iconBg="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
          description="Record newly issued pollution control test certificate number, testing station, issue/expiry dates & certificate attachment."
          breadcrumbs={[
            { label: "Fleet Inventory", onClick: () => setIsRenewPucModalOpen(false) },
            { label: `Renew PUC (${selectedVehicleForPucRenew.registration_number})` }
          ]}
          onBack={() => {
            setIsRenewPucModalOpen(false);
            setSelectedVehicleForPucRenew(null);
          }}
          backLabel="Back to Fleet"
          onSave={handleSaveVehiclePucRenewal}
          saveLabel="Save & Issue PUC Certificate"
          saveIcon={Wind}
          isSubmitting={modalSubmitting}
        >
          <div className="space-y-4">
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

          </div>
        </TransactionFormLayout>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* VEHICLE PUC HISTORY & AUDIT LEDGER MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {isPucHistoryModalOpen && selectedVehicleForPucHistory && (
        <WorkingDocumentLayout
          title={`PUC Emission Ledger: ${selectedVehicleForPucHistory.registration_number}`}
          badge="Emission Ledger"
          badgeColor="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
          category="Statutory Compliance Ledgers"
          icon={History}
          iconBg="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
          description="Chronological log of emission test certificates, test centers, compliance validity periods & audit records."
          breadcrumbs={[
            { label: "Fleet Inventory", onClick: () => setIsPucHistoryModalOpen(false) },
            { label: `PUC History (${selectedVehicleForPucHistory.registration_number})` }
          ]}
          onBack={() => {
            setIsPucHistoryModalOpen(false);
            setSelectedVehicleForPucHistory(null);
          }}
          backLabel="Back to Fleet"
        >
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
        </WorkingDocumentLayout>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* VEHICLE SPECIFICATION REVISION HISTORY & AUDIT LEDGER MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {isSpecHistoryModalOpen && selectedVehicleForSpecHistory && (
        <WorkingDocumentLayout
          title={`Specification Revision Ledger: ${selectedVehicleForSpecHistory.registration_number}`}
          badge="Specification Audit"
          badgeColor="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
          category="Fleet Compliance & Technical Audits"
          icon={FileSpreadsheet}
          iconBg="bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/25"
          description="Chronological audit trail of vehicle technical parameters, fuel type modifications, engine specifications & registration updates."
          breadcrumbs={[
            { label: "Fleet Inventory", onClick: () => setIsSpecHistoryModalOpen(false) },
            { label: `Spec History (${selectedVehicleForSpecHistory.registration_number})` }
          ]}
          onBack={() => {
            setIsSpecHistoryModalOpen(false);
            setSelectedVehicleForSpecHistory(null);
          }}
          backLabel="Back to Fleet"
        >
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
        </WorkingDocumentLayout>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* UNIFIED VEHICLE RENEWALS & FREE SERVICES TIMELINE MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {isUnifiedRenewalsModalOpen && selectedVehicleForRenewals && (
        <WorkingDocumentLayout
          title={`Unified Renewals & Free Services Timeline: ${selectedVehicleForRenewals.registration_number}`}
          badge="Lifecycle Ledger"
          badgeColor="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
          category="Compliance & Statutory Ledgers"
          icon={CalendarSync}
          iconBg="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
          description={`Combined chronology of insurance policies, PUC emission certificates, specification revisions & free service entitlement vouchers for ${selectedVehicleForRenewals.make} ${selectedVehicleForRenewals.model}.`}
          breadcrumbs={[
            { label: "Fleet Inventory", onClick: () => setIsUnifiedRenewalsModalOpen(false) },
            { label: `Unified Renewals (${selectedVehicleForRenewals.registration_number})` }
          ]}
          onBack={() => {
            setIsUnifiedRenewalsModalOpen(false);
            setSelectedVehicleForRenewals(null);
          }}
          backLabel="Back to Fleet"
          headerActions={
            <AppButton
              type="button"
              variant="primary"
              size="sm"
              onClick={() => handleOpenAddEntitlementModal(selectedVehicleForRenewals)}
              className="bg-theme-btn-primary hover:bg-theme-btn-primary-secondary text-white text-xs h-9 font-semibold gap-1.5 shadow-xs px-3.5"
            >
              <Gift className="h-3.5 w-3.5" />
              <span>Add Entitlement Voucher</span>
            </AppButton>
          }
        >
              {loadingUnifiedTimeline ? (
                <div className="py-16 text-center space-y-3">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-500" />
                  <p className="text-sm text-muted-foreground">Loading vehicle renewal lineage & vouchers...</p>
                </div>
              ) : renewalsActiveTab === "TIMELINE" ? (
                <div>
                  {unifiedTimeline.filter((item) => renewalsFilter === "ALL" || item.renewal_type === renewalsFilter).length === 0 ? (
                    <div className="py-14 text-center border-2 border-dashed border-border rounded-xl p-6">
                      <CalendarSync className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
                      <h4 className="text-sm font-semibold text-foreground">No Renewal History Found</h4>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                        No renewals or service vouchers match the selected filter.
                      </p>
                    </div>
                  ) : (
                    <div className="relative pl-6 border-l-2 border-border/80 space-y-5 ml-3 my-2">
                      {unifiedTimeline
                        .filter((item) => renewalsFilter === "ALL" || item.renewal_type === renewalsFilter)
                        .map((event, idx) => {
                          const isInsurance = event.renewal_type === "INSURANCE";
                          const isPuc = event.renewal_type === "PUC";
                          const isMaint = event.renewal_type === "MAINTENANCE_AMC";

                          return (
                            <div key={event.record_id + idx} className="relative group">
                              {/* Timeline Bullet */}
                              <div className={`absolute -left-[31px] top-1 h-5 w-5 rounded-full border-2 border-surface flex items-center justify-center shadow-xs ${
                                isInsurance
                                  ? "bg-cyan-500 text-white"
                                  : isPuc
                                  ? "bg-emerald-500 text-white"
                                  : "bg-blue-600 text-white"
                              }`}>
                                {isInsurance ? (
                                  <Shield className="h-2.5 w-2.5" />
                                ) : isPuc ? (
                                  <Wind className="h-2.5 w-2.5" />
                                ) : (
                                  <Wrench className="h-2.5 w-2.5" />
                                )}
                              </div>

                              {/* Timeline Card */}
                              <div className="bg-surface border border-border/70 rounded-xl p-4 shadow-2xs hover:border-blue-500/40 transition-colors">
                                <div className="flex items-start justify-between gap-3 flex-wrap">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                        isInsurance
                                          ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20"
                                          : isPuc
                                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                          : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                                      }`}>
                                        {isInsurance ? "🛡️ Insurance Policy" : isPuc ? "💨 PUC Certificate" : "🛠️ Service / AMC Voucher"}
                                      </span>

                                      <h4 className="text-sm font-bold text-foreground">
                                        {isMaint ? event.metadata?.service_title || event.certificate_or_policy_number : `#${event.certificate_or_policy_number}`}
                                      </h4>

                                      {event.statusBadge === "ACTIVE" && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                          Active Cycle
                                        </span>
                                      )}
                                      {event.statusBadge === "REDEEMED" && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">
                                          Claimed / Redeemed
                                        </span>
                                      )}
                                      {event.statusBadge === "EXPIRING_SOON" && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                          Expiring ({event.daysRemaining} days left)
                                        </span>
                                      )}
                                      {event.statusBadge === "EXPIRED" && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                                          Superseded / Expired
                                        </span>
                                      )}
                                    </div>

                                    <div className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                                      <span><strong>Provider/Vendor:</strong> {event.provider_or_vendor}</span>
                                      <span>•</span>
                                      <span><strong>Validity:</strong> {event.valid_from} ➔ {event.valid_upto}</span>
                                      {event.cost_or_fee > 0 && (
                                        <>
                                          <span>•</span>
                                          <span><strong>{isMaint ? "Waived Benefit:" : "Fee/Premium:"}</strong> ₹{event.cost_or_fee.toLocaleString()}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  {event.document_url && (
                                    <a
                                      href={event.document_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-lg border border-blue-500/20"
                                    >
                                      <FileText className="h-3.5 w-3.5" />
                                      <span>View Attachment</span>
                                    </a>
                                  )}
                                </div>

                                {/* Event Specific Metadata Cards */}
                                <div className="mt-3 pt-3 border-t border-border/60 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                                  {isInsurance && (
                                    <>
                                      <div className="p-2 rounded bg-surface/50 border border-border/50">
                                        <div className="text-muted-foreground text-[10px] uppercase">IDV Insured Value</div>
                                        <div className="font-semibold text-foreground">₹{(event.metadata?.idv || 0).toLocaleString()}</div>
                                      </div>
                                      <div className="p-2 rounded bg-surface/50 border border-border/50">
                                        <div className="text-muted-foreground text-[10px] uppercase">NCB Bonus</div>
                                        <div className="font-semibold text-foreground">{event.metadata?.ncb_percent || 0}%</div>
                                      </div>
                                      <div className="p-2 rounded bg-surface/50 border border-border/50">
                                        <div className="text-muted-foreground text-[10px] uppercase">Cover Type</div>
                                        <div className="font-semibold text-foreground">{event.metadata?.policy_type || "Comprehensive"}</div>
                                      </div>
                                      <div className="p-2 rounded bg-surface/50 border border-border/50">
                                        <div className="text-muted-foreground text-[10px] uppercase">Add-ons</div>
                                        <div className="font-semibold text-foreground">
                                          {[
                                            event.metadata?.has_zero_dep ? "Zero Dep" : null,
                                            event.metadata?.has_rsa ? "RSA" : null,
                                            event.metadata?.has_engine_protect ? "Engine Protect" : null
                                          ].filter(Boolean).join(", ") || "Standard"}
                                        </div>
                                      </div>
                                    </>
                                  )}

                                  {isPuc && (
                                    <>
                                      <div className="p-2 rounded bg-surface/50 border border-border/50">
                                        <div className="text-muted-foreground text-[10px] uppercase">Emission Norm</div>
                                        <div className="font-semibold text-foreground">{event.metadata?.emission_norm || "BS-VI"}</div>
                                      </div>
                                      <div className="p-2 rounded bg-surface/50 border border-border/50">
                                        <div className="text-muted-foreground text-[10px] uppercase">CO Reading</div>
                                        <div className="font-semibold text-foreground">{event.metadata?.carbon_monoxide_co ?? "0.05"} %</div>
                                      </div>
                                      <div className="p-2 rounded bg-surface/50 border border-border/50">
                                        <div className="text-muted-foreground text-[10px] uppercase">HC Reading</div>
                                        <div className="font-semibold text-foreground">{event.metadata?.hydrocarbon_hc ?? "45.0"} ppm</div>
                                      </div>
                                      <div className="p-2 rounded bg-surface/50 border border-border/50">
                                        <div className="text-muted-foreground text-[10px] uppercase">Test Result</div>
                                        <div className="font-semibold text-emerald-600 dark:text-emerald-400">{event.metadata?.test_result || "PASS"}</div>
                                      </div>
                                    </>
                                  )}

                                  {isMaint && (
                                    <>
                                      <div className="p-2 rounded bg-surface/50 border border-border/50">
                                        <div className="text-muted-foreground text-[10px] uppercase">Mileage Range</div>
                                        <div className="font-semibold text-foreground">{event.metadata?.min_odometer_km?.toLocaleString()} - {event.metadata?.max_odometer_km?.toLocaleString()} KM</div>
                                      </div>
                                      <div className="p-2 rounded bg-surface/50 border border-border/50">
                                        <div className="text-muted-foreground text-[10px] uppercase">Coverage Scope</div>
                                        <div className="font-semibold text-foreground">
                                          {event.metadata?.coverage_scope === "LABOR_ONLY" ? "100% Free Labor" : "Comprehensive (Labor + Parts)"}
                                        </div>
                                      </div>
                                      <div className="p-2 rounded bg-surface/50 border border-border/50">
                                        <div className="text-muted-foreground text-[10px] uppercase">Labor Waived</div>
                                        <div className="font-semibold text-emerald-600">₹{(event.metadata?.labor_waived || 0).toLocaleString()}</div>
                                      </div>
                                      <div className="p-2 rounded bg-surface/50 border border-border/50">
                                        <div className="text-muted-foreground text-[10px] uppercase">Redemption Odo</div>
                                        <div className="font-semibold text-foreground">
                                          {event.metadata?.redeemed_odometer_km ? `${event.metadata.redeemed_odometer_km.toLocaleString()} KM` : "Not Claimed Yet"}
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              ) : (
                /* TAB 2: FREE SERVICES & AMC VOUCHERS */
                <div className="space-y-4">
                  {/* Summary Banner */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-blue-500/20 flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/30">
                        <Gift className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground">Free Maintenance & AMC Entitlement Passport</h4>
                        <p className="text-xs text-muted-foreground">
                          Track statutory OEM free service coupons, periodic checkups, and AMC contracts with mileage & time limits.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-semibold">
                      <div className="text-right">
                        <div className="text-muted-foreground text-[10px] uppercase">Total Fleet Savings</div>
                        <div className="text-base font-extrabold text-emerald-600">
                          ₹{vehicleEntitlements.reduce((acc, x) => acc + (x.labor_waived_amount || 0) + (x.parts_waived_amount || 0), 0).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Vouchers Grid */}
                  {vehicleEntitlements.length === 0 ? (
                    <div className="py-14 text-center border-2 border-dashed border-border rounded-xl p-6">
                      <Ticket className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
                      <h4 className="text-sm font-semibold text-foreground">No Free Service Entitlements Registered</h4>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                        Register OEM complimentary vouchers or annual fleet maintenance contracts (AMC) for this vehicle.
                      </p>
                      <AppButton
                        variant="primary"
                        size="sm"
                        onClick={() => handleOpenAddEntitlementModal(selectedVehicleForRenewals)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Create 1st Free Service Voucher
                      </AppButton>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {vehicleEntitlements.map((ent) => {
                        const isRedeemed = ent.status === "REDEEMED";
                        const isExpired = ent.statusBadge === "EXPIRED" && !isRedeemed;
                        const isExpiring = ent.statusBadge === "EXPIRING_SOON" && !isRedeemed;

                        return (
                          <div
                            key={ent.id}
                            className={`p-4 rounded-xl border relative flex flex-col justify-between transition-all ${
                              isRedeemed
                                ? "bg-blue-50/30 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/60"
                                : isExpired
                                ? "bg-rose-50/30 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60"
                                : isExpiring
                                ? "bg-amber-50/30 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800"
                                : "bg-surface border-border hover:border-blue-500/40 shadow-xs"
                            }`}
                          >
                            <div className="space-y-3">
                              {/* Header */}
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-muted text-foreground border border-border">
                                      {ent.voucher_number || `VOUCHER-${ent.id.slice(0, 6).toUpperCase()}`}
                                    </span>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                      {ent.coverage_scope === "LABOR_ONLY" ? "100% Free Labor" : "Full Parts + Labor"}
                                    </span>
                                  </div>
                                  <h4 className="text-sm font-bold text-foreground mt-1">{ent.service_title}</h4>
                                  <p className="text-[11px] text-muted-foreground">{ent.provider_vendor}</p>
                                </div>

                                <div>
                                  {isRedeemed ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                                      <CheckCircle2 className="h-3 w-3" />
                                      Claimed
                                    </span>
                                  ) : isExpired ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30">
                                      <AlertTriangle className="h-3 w-3" />
                                      Expired / Lapsed
                                    </span>
                                  ) : isExpiring ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 animate-pulse">
                                      <Clock className="h-3 w-3" />
                                      Expiring Soon
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30">
                                      <Ticket className="h-3 w-3" />
                                      Available
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Dual-Validity Metrics */}
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="p-2 rounded-lg bg-surface/70 border border-border/60">
                                  <div className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                                    <Calendar className="h-3 w-3 text-blue-500" />
                                    <span>Date Validity</span>
                                  </div>
                                  <div className="font-semibold text-foreground text-[11px] mt-0.5">
                                    {ent.valid_from_date} ➔ {ent.valid_to_date}
                                  </div>
                                  {!isRedeemed && (
                                    <div className={`text-[10px] font-medium mt-0.5 ${
                                      (ent.daysRemaining ?? 0) < 0 ? "text-rose-600" : (ent.daysRemaining ?? 0) <= 30 ? "text-amber-600" : "text-emerald-600"
                                    }`}>
                                      {(ent.daysRemaining ?? 0) < 0 ? "Date expired" : `${ent.daysRemaining} days left`}
                                    </div>
                                  )}
                                </div>

                                <div className="p-2 rounded-lg bg-surface/70 border border-border/60">
                                  <div className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                                    <Gauge className="h-3 w-3 text-indigo-500" />
                                    <span>Mileage Bounds</span>
                                  </div>
                                  <div className="font-semibold text-foreground text-[11px] mt-0.5">
                                    Max {ent.max_odometer_km.toLocaleString()} KM
                                  </div>
                                  {!isRedeemed && (
                                    <div className={`text-[10px] font-medium mt-0.5 ${
                                      (ent.kmRemaining ?? 0) < 0 ? "text-rose-600" : (ent.kmRemaining ?? 0) <= 500 ? "text-amber-600" : "text-emerald-600"
                                    }`}>
                                      {(ent.kmRemaining ?? 0) < 0 ? "Mileage exceeded" : `${ent.kmRemaining?.toLocaleString()} KM remaining`}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Redemption Record if Claimed */}
                              {isRedeemed && (
                                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1">
                                  <div className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                                    <span>Claimed at {ent.workshop_center || "Authorized Workshop"}</span>
                                    <span>Waived: ₹{((ent.labor_waived_amount || 0) + (ent.parts_waived_amount || 0)).toLocaleString()}</span>
                                  </div>
                                  <div className="text-[11px] text-muted-foreground flex items-center gap-3">
                                    <span>Redeemed Odo: {ent.redeemed_odometer_km ? `${ent.redeemed_odometer_km.toLocaleString()} KM` : "N/A"}</span>
                                    {ent.invoice_number && <span>Invoice: #{ent.invoice_number}</span>}
                                  </div>
                                </div>
                              )}

                              {ent.terms_conditions && (
                                <p className="text-[11px] text-muted-foreground italic line-clamp-2">
                                  Note: {ent.terms_conditions}
                                </p>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                              <span className="text-[10px] text-muted-foreground">
                                Recorded by {ent.renewed_by || "System"}
                              </span>

                              <div className="flex items-center gap-1.5">
                                {!isRedeemed && (
                                  <AppButton
                                    variant="primary"
                                    size="sm"
                                    onClick={() => handleOpenRedeemEntitlementModal(ent)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 px-2.5 font-semibold gap-1 shadow-2xs"
                                  >
                                    <CheckCircle2 className="h-3 w-3" />
                                    <span>Claim Voucher</span>
                                  </AppButton>
                                )}
                                <AppButton
                                  variant="ghost"
                                  size="icon-sm"
                                  title="Void Voucher"
                                  onClick={() => handleDeleteEntitlement(ent.id)}
                                  className="h-7 w-7 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </AppButton>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
        </WorkingDocumentLayout>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* ADD SERVICE ENTITLEMENT / AMC VOUCHER MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {isAddEntitlementModalOpen && selectedVehicleForRenewals && (
        <TransactionFormLayout
          title={`Add Free Service Voucher / AMC: ${selectedVehicleForRenewals.registration_number}`}
          badge="Entitlement Voucher Form"
          category="Warranty & Free Service Entitlements"
          icon={Gift}
          iconBg="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
          description="Register manufacturer warranty free service coupons, dealership AMC vouchers & dual validity rules (months/odometer)."
          breadcrumbs={[
            { label: "Fleet Inventory", onClick: () => setIsAddEntitlementModalOpen(false) },
            { label: "Unified Renewals", onClick: () => setIsAddEntitlementModalOpen(false) },
            { label: "Add Service Voucher" }
          ]}
          onBack={() => setIsAddEntitlementModalOpen(false)}
          backLabel="Back to Unified Renewals"
          onSave={handleSaveAddEntitlement}
          saveLabel="Save Service Entitlement"
          saveIcon={Gift}
          isSubmitting={modalSubmitting}
        >
          <div className="space-y-4">

          </div>
        </TransactionFormLayout>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* REDEEM / CLAIM SERVICE ENTITLEMENT MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {isRedeemEntitlementModalOpen && selectedEntitlementForRedeem && selectedVehicleForRenewals && (
        <TransactionFormLayout
          title={`Redeem Free Service Entitlement: ${selectedEntitlementForRedeem.service_title}`}
          badge="Redemption Voucher Form"
          category="Warranty & Free Service Entitlements"
          icon={Ticket}
          iconBg="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
          description={`Claim free service voucher against workshop job card for vehicle ${selectedVehicleForRenewals.registration_number}.`}
          breadcrumbs={[
            { label: "Fleet Inventory", onClick: () => setIsRedeemEntitlementModalOpen(false) },
            { label: "Unified Renewals", onClick: () => setIsRedeemEntitlementModalOpen(false) },
            { label: "Redeem Voucher" }
          ]}
          onBack={() => {
            setIsRedeemEntitlementModalOpen(false);
            setSelectedEntitlementForRedeem(null);
          }}
          backLabel="Back to Unified Renewals"
          onSave={handleSaveRedeemEntitlement}
          saveLabel="Confirm & Claim Voucher"
          saveIcon={Ticket}
          isSubmitting={modalSubmitting}
        >
          <div className="space-y-4">

          </div>
        </TransactionFormLayout>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* 1. VIEW VEHICLE INSPECTOR MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {viewingVehicle && (
        <WorkingDocumentLayout
          title={`Vehicle Master Dossier: ${viewingVehicle.registration_number}`}
          badge={viewingVehicle.status}
          badgeColor={
            viewingVehicle.status === "IN_STOCK"
              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
              : viewingVehicle.status === "IN_SERVICE"
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
          }
          category="Fleet Operations & Asset Management"
          icon={Car}
          iconBg="bg-theme-btn-primary/15 text-theme-btn-primary border-theme-btn-primary/25"
          description="Complete 360° vehicle asset dossier: Technical powertrain specifications, workshop service logs, mounted spare parts & warranties, compliance document vault, insurance/PUC policies & trip dispatch movements."
          breadcrumbs={[
            { label: "Fleet Inventory", onClick: () => setViewingVehicle(null) },
            { label: `Vehicle Dossier (${viewingVehicle.registration_number})` }
          ]}
          onBack={() => setViewingVehicle(null)}
          backLabel="Back to Fleet"
          headerActions={
            <div className="flex items-center gap-2 flex-wrap">
              {canEditVehicle && (
                <AppButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDossierOriginVehicle(viewingVehicle);
                    openEditVehicleModal(viewingVehicle);
                  }}
                  className="text-xs h-9 px-3 gap-1.5 font-semibold text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>Edit Vehicle</span>
                </AppButton>
              )}
              {canManageMaintenance && (
                <AppButton
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setDossierOriginVehicle(viewingVehicle);
                    resetMaintenanceForm();
                    setNewMaintVehicleId(viewingVehicle.id);
                    setIsAddMaintenanceOpen(true);
                  }}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-9 px-3 gap-1.5 font-semibold shadow-2xs"
                >
                  <Wrench className="h-3.5 w-3.5" />
                  <span>+ Log Service</span>
                </AppButton>
              )}
              <AppButton
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setDossierOriginVehicle(viewingVehicle);
                  openCreatePartModal();
                  setPartFormVehicleId(viewingVehicle.id);
                  setPartFormAssignedVehicleReg(viewingVehicle.registration_number);
                }}
                className="text-xs h-9 px-3 gap-1.5 font-semibold text-blue-600 dark:text-blue-400 border-blue-500/30 hover:bg-blue-50 dark:hover:bg-blue-950/30"
              >
                <Package className="h-3.5 w-3.5" />
                <span>+ Mount Part</span>
              </AppButton>
              <AppButton
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setVehicleDossierTab("DOCS");
                  setIsDossierAddDocOpen(true);
                }}
                className="text-xs h-9 px-3 gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              >
                <UploadCloud className="h-3.5 w-3.5" />
                <span>+ Attach Document</span>
              </AppButton>
              <AppButton
                type="button"
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="text-xs h-9 px-3 gap-1.5 font-semibold"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print Dossier</span>
              </AppButton>
            </div>
          }
        >
          {/* 1. HERO BANNER: Identity, Plate, Make & Key Assignment Specs */}
          <div className="p-5 rounded-2xl border border-border bg-gradient-to-r from-slate-50 via-surface to-slate-50/50 dark:from-slate-900/60 dark:via-surface dark:to-slate-900/40 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="shrink-0 pt-0.5">
                {renderHsrpPlate(viewingVehicle.registration_number)}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold tracking-tight text-foreground">
                    {viewingVehicle.make} {viewingVehicle.model} {viewingVehicle.year ? `(${viewingVehicle.year})` : ""}
                  </h2>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-border">
                    {viewingVehicle.category || "Standard Car"}
                  </span>
                  {viewingVehicle.fuel_type && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 flex items-center gap-1">
                      <Fuel className="h-3 w-3 text-amber-500" />
                      <span>{viewingVehicle.fuel_type}</span>
                    </span>
                  )}
                  {viewingVehicle.nickname && (
                    <span className="text-[11px] font-medium text-muted-foreground italic">
                      "{viewingVehicle.nickname}"
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1 font-mono">
                    <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>VIN: {viewingVehicle.vin_chassis_number || "Not Recorded"}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5 text-blue-500" />
                    <span>RTO: {viewingVehicle.rto_office || "State Transport"}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <UserCheck className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Owner: {viewingVehicle.registered_owner || "Corporate Fleet"}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              <div className="p-3 rounded-xl border border-border bg-surface shadow-2xs space-y-0.5 min-w-[130px]">
                <div className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                  <Gauge className="h-3 w-3 text-theme-btn-primary" />
                  <span>Odometer</span>
                </div>
                <div className="text-sm font-mono font-bold text-foreground">
                  {viewingVehicle.odometer_km ? `${viewingVehicle.odometer_km.toLocaleString()} km` : "0 km"}
                </div>
              </div>

              <div className="p-3 rounded-xl border border-border bg-surface shadow-2xs space-y-0.5 min-w-[160px]">
                <div className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3 text-purple-500" />
                  <span>Primary Chauffeur</span>
                </div>
                <div className="text-xs font-semibold text-foreground truncate max-w-[150px]">
                  {viewingVehicle.assignedDriver?.full_name || "Unassigned Pool"}
                </div>
                {viewingVehicle.assignedDriver?.phone && (
                  <div className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">
                    <a href={`tel:${viewingVehicle.assignedDriver.phone}`} className="hover:underline">
                      {viewingVehicle.assignedDriver.phone}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 2. CLICKABLE METRIC JUMP TILES (Fast overview & quick navigation) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Tile 1: Services */}
            <button
              type="button"
              onClick={() => setVehicleDossierTab("SERVICES")}
              className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden group ${
                vehicleDossierTab === "SERVICES"
                  ? "border-amber-500/60 bg-amber-500/10 dark:bg-amber-950/20 shadow-xs ring-1 ring-amber-500/30"
                  : "border-border bg-surface hover:border-amber-500/40 hover:bg-slate-50/50 dark:hover:bg-slate-900/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <Wrench className="h-4 w-4" />
                  <span>Workshop Services</span>
                </span>
                <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300">
                  {dossierData.services.length}
                </span>
              </div>
              <div className="text-lg font-bold text-foreground mt-2 font-mono">
                ₹{dossierData.totalServiceSpend.toLocaleString("en-IN")}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                {dossierData.lastService ? `Last: ${dossierData.lastService.service_date}` : "No service logs yet"}
              </div>
            </button>

            {/* Tile 2: Mounted Spare Parts */}
            <button
              type="button"
              onClick={() => setVehicleDossierTab("PARTS")}
              className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden group ${
                vehicleDossierTab === "PARTS"
                  ? "border-blue-500/60 bg-blue-500/10 dark:bg-blue-950/20 shadow-xs ring-1 ring-blue-500/30"
                  : "border-border bg-surface hover:border-blue-500/40 hover:bg-slate-50/50 dark:hover:bg-slate-900/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                  <Package className="h-4 w-4" />
                  <span>Spare Parts & Assets</span>
                </span>
                <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-blue-300">
                  {dossierData.parts.length}
                </span>
              </div>
              <div className="text-lg font-bold text-foreground mt-2 font-mono">
                ₹{dossierData.totalPartsValue.toLocaleString("en-IN")}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                {dossierData.activeWarrantiesCount} mounted parts under warranty
              </div>
            </button>

            {/* Tile 3: Document Vault */}
            <button
              type="button"
              onClick={() => setVehicleDossierTab("DOCS")}
              className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden group ${
                vehicleDossierTab === "DOCS"
                  ? "border-emerald-500/60 bg-emerald-500/10 dark:bg-emerald-950/20 shadow-xs ring-1 ring-emerald-500/30"
                  : "border-border bg-surface hover:border-emerald-500/40 hover:bg-slate-50/50 dark:hover:bg-slate-900/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <FileCheck className="h-4 w-4" />
                  <span>Legal Document Vault</span>
                </span>
                <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                  {dossierData.docs.length}
                </span>
              </div>
              <div className="text-lg font-bold text-foreground mt-2">
                {dossierData.expiredDocsCount > 0 ? (
                  <span className="text-rose-600 dark:text-rose-400 text-sm font-semibold">
                    {dossierData.expiredDocsCount} Expired
                  </span>
                ) : dossierData.docs.length > 0 ? (
                  <span className="text-emerald-600 dark:text-emerald-400 text-sm font-semibold">
                    All Valid & Archived
                  </span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400 text-sm font-semibold">
                    No Files Attached
                  </span>
                )}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                PUC, Insurance, RC Smart Card & Permits
              </div>
            </button>

            {/* Tile 4: Trips Movement */}
            <button
              type="button"
              onClick={() => setVehicleDossierTab("TRIPS")}
              className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden group ${
                vehicleDossierTab === "TRIPS"
                  ? "border-purple-500/60 bg-purple-500/10 dark:bg-purple-950/20 shadow-xs ring-1 ring-purple-500/30"
                  : "border-border bg-surface hover:border-purple-500/40 hover:bg-slate-50/50 dark:hover:bg-slate-900/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  <span>Trip Movements</span>
                </span>
                <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-700 dark:text-purple-300">
                  {dossierData.trips.length}
                </span>
              </div>
              <div className="text-lg font-bold text-foreground mt-2">
                {dossierData.completedTripsCount} <span className="text-xs text-muted-foreground font-normal">Completed</span>
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                {dossierData.activeTripsCount} scheduled or en-route
              </div>
            </button>
          </div>

          {/* 3. DOSSIER COLUMNS / SECTIONS TAB NAVIGATION BAR */}
          <div className="flex items-center gap-1.5 border-b border-border pb-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setVehicleDossierTab("OVERVIEW")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors ${
                vehicleDossierTab === "OVERVIEW"
                  ? "bg-theme-btn-primary text-white shadow-2xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Car className="h-3.5 w-3.5" />
              <span>Overview & Specs</span>
            </button>

            <button
              type="button"
              onClick={() => setVehicleDossierTab("SERVICES")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors ${
                vehicleDossierTab === "SERVICES"
                  ? "bg-amber-600 text-white shadow-2xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Wrench className="h-3.5 w-3.5" />
              <span>Service Records</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                vehicleDossierTab === "SERVICES" ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700 text-foreground"
              }`}>
                {dossierData.services.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setVehicleDossierTab("PARTS")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors ${
                vehicleDossierTab === "PARTS"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Package className="h-3.5 w-3.5" />
              <span>Spare Parts & Assets</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                vehicleDossierTab === "PARTS" ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700 text-foreground"
              }`}>
                {dossierData.parts.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setVehicleDossierTab("DOCS")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors ${
                vehicleDossierTab === "DOCS"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <FileCheck className="h-3.5 w-3.5" />
              <span>Document Vault</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                vehicleDossierTab === "DOCS" ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700 text-foreground"
              }`}>
                {dossierData.docs.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setVehicleDossierTab("COMPLIANCE")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors ${
                vehicleDossierTab === "COMPLIANCE"
                  ? "bg-cyan-600 text-white shadow-2xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Compliance & Renewals</span>
            </button>

            <button
              type="button"
              onClick={() => setVehicleDossierTab("TRIPS")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors ${
                vehicleDossierTab === "TRIPS"
                  ? "bg-purple-600 text-white shadow-2xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <MapPin className="h-3.5 w-3.5" />
              <span>Trip Movements</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                vehicleDossierTab === "TRIPS" ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700 text-foreground"
              }`}>
                {dossierData.trips.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setVehicleDossierTab("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors ${
                vehicleDossierTab === "ALL"
                  ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-2xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Complete 360° Dossier (All Columns)</span>
            </button>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: OVERVIEW & TECHNICAL SPECIFICATIONS */}
          {/* ========================================================================= */}
          {(vehicleDossierTab === "OVERVIEW" || vehicleDossierTab === "ALL") && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <div className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-theme-btn-primary" />
                  <span>Technical Powertrain & Identity Specifications</span>
                </div>
              </div>

              {/* Technical Specifications Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl border border-border bg-surface space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Category / Body Type</span>
                  <div className="font-semibold text-foreground text-xs">{viewingVehicle.category || "Standard"}</div>
                </div>
                <div className="p-3.5 rounded-xl border border-border bg-surface space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Fuel / Powertrain</span>
                  <div className="font-semibold text-foreground text-xs flex items-center gap-1">
                    <Fuel className="h-3.5 w-3.5 text-amber-500" />
                    <span>{viewingVehicle.fuel_type || "Petrol"}</span>
                  </div>
                </div>
                <div className="p-3.5 rounded-xl border border-border bg-surface space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Seating Capacity</span>
                  <div className="font-semibold text-foreground text-xs">{viewingVehicle.seating_capacity ? `${viewingVehicle.seating_capacity} Seater` : "5 Seater"}</div>
                </div>
                <div className="p-3.5 rounded-xl border border-border bg-surface space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Transmission</span>
                  <div className="font-semibold text-foreground text-xs">{viewingVehicle.transmission || "Manual"}</div>
                </div>
                <div className="p-3.5 rounded-xl border border-border bg-surface space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Chassis / VIN Number</span>
                  <div className="font-mono font-bold text-foreground text-xs">{viewingVehicle.vin_chassis_number || "—"}</div>
                </div>
                <div className="p-3.5 rounded-xl border border-border bg-surface space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Engine Number</span>
                  <div className="font-mono font-bold text-foreground text-xs">{viewingVehicle.engine_number || "—"}</div>
                </div>
                <div className="p-3.5 rounded-xl border border-border bg-surface space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Exterior Paint Color</span>
                  <div className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                    <span className="h-3.5 w-3.5 rounded-full border border-border" style={{ backgroundColor: viewingVehicle.paint_color || "#334155" }} />
                    <span>{viewingVehicle.paint_color || "Standard"}</span>
                  </div>
                </div>
                <div className="p-3.5 rounded-xl border border-border bg-surface space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Registration Date</span>
                  <div className="font-mono font-semibold text-foreground text-xs">{viewingVehicle.registration_date ? String(viewingVehicle.registration_date).split("T")[0] : "—"}</div>
                </div>
                <div className="p-3.5 rounded-xl border border-border bg-surface space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <IndianRupee className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                    <span>Purchase Price</span>
                  </span>
                  <div className="font-mono font-bold text-emerald-700 dark:text-emerald-300 text-xs">
                    {viewingVehicle.purchase_price || viewingVehicle.purchase_cost
                      ? `₹${Number(viewingVehicle.purchase_price || viewingVehicle.purchase_cost).toLocaleString("en-IN")}`
                      : "—"}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl border border-border bg-surface space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <CalendarClock className="h-3 w-3 text-indigo-500" />
                      <span>Extended Expiry</span>
                    </span>
                    {viewingVehicle.custom_extended_expiry_date && (
                      <div>{renderExpiryBadge(calculateDaysRemaining(viewingVehicle.custom_extended_expiry_date))}</div>
                    )}
                  </div>
                  <div className="font-mono font-semibold text-foreground text-xs">
                    {viewingVehicle.custom_extended_expiry_date ? String(viewingVehicle.custom_extended_expiry_date).split("T")[0] : "—"}
                  </div>
                </div>
              </div>

              {/* RTO & Chauffeur Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* RTO Office & Ownership */}
                <div className="p-4 rounded-xl border border-border bg-surface space-y-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-blue-500" />
                    <span>RTO Jurisdiction & Registered Ownership</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">RTO Jurisdiction:</span>
                      <span className="font-semibold text-foreground">{viewingVehicle.rto_office || "—"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Registered Owner:</span>
                      <span className="font-semibold text-foreground">{viewingVehicle.registered_owner || "Corporate Fleet"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">RTO Registered Mobile:</span>
                      <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">{viewingVehicle.rto_rmn || "—"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Fitness Expiry:</span>
                      <span className="font-mono font-semibold text-foreground">{viewingVehicle.fitness_expiry_date || "—"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Purchase Asset Cost:</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {viewingVehicle.purchase_price || viewingVehicle.purchase_cost
                          ? `₹${Number(viewingVehicle.purchase_price || viewingVehicle.purchase_cost).toLocaleString("en-IN")}`
                          : "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Assigned Chauffeur & Personnel Details */}
                <div className="p-4 rounded-xl border border-border bg-surface space-y-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-purple-500" />
                    <span>Assigned Chauffeur & Duty Assignment</span>
                  </div>
                  {(() => {
                    const assignedDriverFull = viewingVehicle.assignedDriver?.id
                      ? drivers.find(d => d.id === viewingVehicle.assignedDriver?.id)
                      : null;
                    return viewingVehicle.assignedDriver ? (
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Driver Name:</span>
                          <span className="font-bold text-foreground">{viewingVehicle.assignedDriver.full_name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Contact Phone:</span>
                          <a href={`tel:${viewingVehicle.assignedDriver.phone}`} className="font-mono font-bold text-theme-btn-primary hover:underline">
                            {viewingVehicle.assignedDriver.phone}
                          </a>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Driving License:</span>
                          <span className="font-mono font-semibold text-foreground">{assignedDriverFull?.license_number || "—"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">DL Expiry:</span>
                          <span className="font-mono font-semibold text-foreground">{assignedDriverFull?.license_expiry_date || "—"}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="py-4 text-center text-xs text-muted-foreground italic">
                        No designated chauffeur assigned. This vehicle is in the unassigned corporate pool.
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: VEHICLE SERVICE DETAILS (Workshop & Job Sheets) */}
          {/* ========================================================================= */}
          {(vehicleDossierTab === "SERVICES" || vehicleDossierTab === "ALL") && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2 flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-amber-500" />
                    <span>Vehicle Service Details & Workshop History</span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Historical workshop visits, periodic maintenance, billings, labor charges & parts replaced
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {canManageMaintenance && (
                    <AppButton
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setDossierOriginVehicle(viewingVehicle);
                        resetMaintenanceForm();
                        setNewMaintVehicleId(viewingVehicle.id);
                        setIsAddMaintenanceOpen(true);
                      }}
                      className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8 px-3 gap-1.5 font-semibold shadow-2xs"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Log Service Job Card</span>
                    </AppButton>
                  )}
                </div>
              </div>

              {/* Service Summary KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">Lifetime Spend</span>
                  <div className="text-base font-mono font-bold text-foreground">
                    ₹{dossierData.totalServiceSpend.toLocaleString("en-IN")}
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-border bg-surface space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Logged Services</span>
                  <div className="text-base font-mono font-bold text-foreground">
                    {dossierData.services.length} Job Cards
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-border bg-surface space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Last Service Date</span>
                  <div className="text-xs font-mono font-bold text-foreground">
                    {dossierData.lastService ? dossierData.lastService.service_date : "No History"}
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-border bg-surface space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Next Service Due</span>
                  <div className="text-xs font-mono font-bold text-foreground">
                    {viewingVehicle.next_service_due_date || "Not Scheduled"}
                  </div>
                </div>
              </div>

              {/* Service Records List */}
              {dossierData.services.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed border-border bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
                  <Wrench className="h-8 w-8 text-muted-foreground mx-auto opacity-50" />
                  <p className="text-xs font-semibold text-foreground">No service records logged for this vehicle</p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Track all authorized dealership visits, scheduled oil changes, tire rotations and mechanical repairs.
                  </p>
                  {canManageMaintenance && (
                    <div className="pt-2">
                      <AppButton
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setDossierOriginVehicle(viewingVehicle);
                          resetMaintenanceForm();
                          setNewMaintVehicleId(viewingVehicle.id);
                          setIsAddMaintenanceOpen(true);
                        }}
                        className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8 px-3 gap-1.5 font-semibold"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Log First Service Job Card</span>
                      </AppButton>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {dossierData.services.map((svc) => {
                    const partsData = (svc.parts_replaced && typeof svc.parts_replaced === "object") ? svc.parts_replaced : null;
                    const attachments = Array.isArray(partsData?.attachments) ? partsData.attachments : [];
                    return (
                      <div
                        key={svc.id}
                        className="p-4 rounded-xl border border-border bg-surface hover:border-amber-500/40 transition-colors shadow-2xs space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-border text-foreground">
                                WO#{svc.id.slice(0, 8)}
                              </span>
                              <span className="text-xs font-bold text-foreground">
                                {svc.service_type || "Routine Maintenance"}
                              </span>
                              <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                                {partsData?.category || "PERIODIC_SERVICE"}
                              </span>
                              {partsData?.payment_status && (
                                <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                                  partsData.payment_status === "PAID"
                                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                                    : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20"
                                }`}>
                                  {partsData.payment_status}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-3 mt-1 flex-wrap">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="font-mono font-medium">{svc.service_date}</span>
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>{svc.service_center || "Authorized Workshop"}</span>
                              </span>
                              {svc.technician_name && (
                                <>
                                  <span>•</span>
                                  <span>Technician: <strong className="text-foreground font-medium">{svc.technician_name}</strong></span>
                                </>
                              )}
                              <span>•</span>
                              <span className="font-mono text-muted-foreground">Odo: <strong>{svc.odometer_km ? `${svc.odometer_km.toLocaleString()} km` : "—"}</strong></span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <div className="text-base font-bold text-foreground font-mono">
                                ₹{Number(svc.cost || 0).toLocaleString("en-IN")}
                              </div>
                              {partsData?.invoice_number && (
                                <div className="text-[10px] font-mono text-muted-foreground">
                                  Inv #{partsData.invoice_number}
                                </div>
                              )}
                            </div>
                            <AppButton
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setDossierOriginVehicle(viewingVehicle);
                                setSelectedMaintenanceForView(svc);
                              }}
                              className="h-8 text-xs px-2.5 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/10 gap-1 font-semibold"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>View Job Sheet</span>
                            </AppButton>
                          </div>
                        </div>

                        {/* Breakdown Pills */}
                        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-border/70 flex items-center gap-4 text-xs flex-wrap">
                          <div>
                            <span className="text-[10px] text-muted-foreground block">Labour Cost:</span>
                            <span className="font-mono font-semibold text-foreground">₹{Number(partsData?.labour_cost || 0).toLocaleString("en-IN")}</span>
                          </div>
                          <div className="border-l border-border pl-4">
                            <span className="text-[10px] text-muted-foreground block">Parts Cost:</span>
                            <span className="font-mono font-semibold text-foreground">₹{Number(partsData?.parts_cost || 0).toLocaleString("en-IN")}</span>
                          </div>
                          <div className="border-l border-border pl-4">
                            <span className="text-[10px] text-muted-foreground block">Taxes / GST:</span>
                            <span className="font-mono font-semibold text-foreground">₹{Number(partsData?.tax_cost || 0).toLocaleString("en-IN")}</span>
                          </div>
                          {partsData?.notes && (
                            <div className="border-l border-border pl-4 flex-1 min-w-[200px]">
                              <span className="text-[10px] text-muted-foreground block">Service Notes:</span>
                              <span className="text-foreground text-[11px] truncate block" title={partsData.notes}>
                                {partsData.notes}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Service Invoices & Bills Attachments */}
                        {attachments.length > 0 && (
                          <div className="space-y-1.5 pt-1 border-t border-border">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                              <Paperclip className="h-3 w-3 text-amber-500" />
                              <span>Attached Invoices & Work Orders ({attachments.length})</span>
                            </span>
                            <div className="flex items-center gap-2 flex-wrap">
                              {attachments.map((att: any, attIdx: number) => (
                                <div
                                  key={att.id || attIdx}
                                  className="px-2.5 py-1 rounded-lg border border-border bg-surface text-xs flex items-center gap-2 hover:border-theme-btn-primary/40"
                                >
                                  <span className="font-medium text-foreground truncate max-w-[150px]" title={att.file_name}>
                                    {att.file_name}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPreviewAttachment({
                                        id: att.id || String(attIdx),
                                        file_name: att.file_name,
                                        file_size: formatFileSize(att.file_size || 0),
                                        file_type: att.file_type || resolveMimeFromName(att.file_name),
                                        file_url: att.file_url,
                                        uploaded_at: att.uploaded_at || new Date().toISOString()
                                      });
                                      setPreviewZoom(1);
                                      setPreviewRotation(0);
                                    }}
                                    className="text-blue-600 dark:text-blue-400 hover:underline text-[11px] font-semibold"
                                  >
                                    View
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => downloadAttachment(att)}
                                    className="text-emerald-600 dark:text-emerald-400 hover:underline text-[11px] font-semibold"
                                  >
                                    Download
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: SPARE PARTS & MOUNTED ASSETS */}
          {/* ========================================================================= */}
          {(vehicleDossierTab === "PARTS" || vehicleDossierTab === "ALL") && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2 flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Package className="h-4 w-4 text-blue-500" />
                    <span>Mounted Spare Parts, Tires, Batteries & Accessories</span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Hardware components mounted to this vehicle, serial numbers, warranties & IoT recharge policies
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <AppButton
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setDossierOriginVehicle(viewingVehicle);
                      openCreatePartModal();
                      setPartFormVehicleId(viewingVehicle.id);
                      setPartFormAssignedVehicleReg(viewingVehicle.registration_number);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-3 gap-1.5 font-semibold shadow-2xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>+ Mount Spare Part / Asset</span>
                  </AppButton>
                </div>
              </div>

              {/* Spare Parts Summary Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl border border-blue-500/20 bg-blue-500/5 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300">Total Mounted Assets</span>
                  <div className="text-base font-mono font-bold text-foreground">
                    {dossierData.parts.length} Units
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-border bg-surface space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Parts Value</span>
                  <div className="text-base font-mono font-bold text-foreground">
                    ₹{dossierData.totalPartsValue.toLocaleString("en-IN")}
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-border bg-surface space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Under Active Warranty</span>
                  <div className="text-base font-mono font-bold text-foreground">
                    {dossierData.activeWarrantiesCount} Parts
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-border bg-surface space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">IoT & GPS Trackers</span>
                  <div className="text-base font-mono font-bold text-foreground">
                    {dossierData.parts.filter(p => p.has_renewal_policy || p.item_type === "GPS_TRACKER").length} Devices
                  </div>
                </div>
              </div>

              {/* Spare Parts Cards */}
              {dossierData.parts.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed border-border bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
                  <Package className="h-8 w-8 text-muted-foreground mx-auto opacity-50" />
                  <p className="text-xs font-semibold text-foreground">No spare parts or accessories mounted to this vehicle</p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Track mounted tires with serial numbers, battery warranty cards, GPS trackers, dashcams and toolkits.
                  </p>
                  <div className="pt-2">
                    <AppButton
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setDossierOriginVehicle(viewingVehicle);
                        openCreatePartModal();
                        setPartFormVehicleId(viewingVehicle.id);
                        setPartFormAssignedVehicleReg(viewingVehicle.registration_number);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-3 gap-1.5 font-semibold"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Mount First Spare Part</span>
                    </AppButton>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {dossierData.parts.map((p) => {
                    const daysRemaining = p.warranty_expiry_date ? calculateDaysRemaining(p.warranty_expiry_date) : null;
                    return (
                      <div
                        key={p.id}
                        className="p-4 rounded-xl border border-border bg-surface hover:border-blue-500/40 transition-colors shadow-2xs space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                                {p.item_type || "SPARE_PART"}
                              </span>
                              {p.part_number && (
                                <span className="font-mono text-[10px] font-semibold text-muted-foreground px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 border border-border">
                                  #{p.part_number}
                                </span>
                              )}
                              <span className="px-2 py-0.2 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-foreground border border-border">
                                {p.condition || "NEW"}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-foreground mt-1">
                              {p.name}
                            </h4>
                            <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                              <span>Brand: <strong className="text-foreground">{p.brand || "OEM"}</strong></span>
                              {p.serial_number && (
                                <>
                                  <span>•</span>
                                  <span className="font-mono">S/N: {p.serial_number}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-sm font-mono font-bold text-foreground">
                              ₹{Number(p.purchase_amount || 0).toLocaleString("en-IN")}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              Qty: {p.quantity || 1}
                            </div>
                          </div>
                        </div>

                        {/* Installation & Warranty Details */}
                        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-border/70 text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Installed Date & Odo:</span>
                            <span className="font-mono font-semibold text-foreground">
                              {p.installation_date || "—"} {p.installed_odometer_km ? `(${p.installed_odometer_km.toLocaleString()} km)` : ""}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Warranty Status:</span>
                            {p.warranty_expiry_date ? (
                              daysRemaining !== null && daysRemaining < 0 ? (
                                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                                  Expired ({Math.abs(daysRemaining)}d ago)
                                </span>
                              ) : daysRemaining !== null && daysRemaining <= 30 ? (
                                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                  Expires in {daysRemaining}d
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                  Valid ({daysRemaining}d remaining)
                                </span>
                              )
                            ) : (
                              <span className="text-muted-foreground italic">No Warranty Registered</span>
                            )}
                          </div>
                          {p.has_renewal_policy && (
                            <div className="flex items-center justify-between pt-1 border-t border-border">
                              <span className="text-muted-foreground">IoT SIM Recharge:</span>
                              <span className="text-theme-btn-primary font-semibold">
                                {p.renewal_policy_type || "GPS"} (Due: {p.renewal_date || "—"})
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Part Card Actions */}
                        <div className="flex items-center justify-end gap-1.5 pt-1">
                          <AppButton
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setDossierOriginVehicle(viewingVehicle);
                              setViewingPart(p);
                            }}
                            className="h-7 text-xs px-2.5 text-blue-600 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/10 gap-1 font-semibold"
                          >
                            <Eye className="h-3 w-3" />
                            <span>Inspect Part</span>
                          </AppButton>
                          <AppButton
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setDossierOriginVehicle(viewingVehicle);
                              openEditPartModal(p);
                            }}
                            className="h-7 text-xs px-2.5 text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 gap-1 font-semibold"
                          >
                            <Edit2 className="h-3 w-3" />
                            <span>Edit Part</span>
                          </AppButton>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: LEGAL & COMPLIANCE DOCUMENT VAULT */}
          {/* ========================================================================= */}
          {(vehicleDossierTab === "DOCS" || vehicleDossierTab === "ALL") && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2 flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <FileCheck className="h-4 w-4 text-emerald-500" />
                    <span>Legal & Compliance Documents Vault</span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Archived certificates, RC smart cards, pollution clearances, insurance policies & purchase bills
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <AppButton
                    type="button"
                    variant={isDossierAddDocOpen ? "outline" : "primary"}
                    size="sm"
                    onClick={() => setIsDossierAddDocOpen(!isDossierAddDocOpen)}
                    className={
                      isDossierAddDocOpen
                        ? "text-xs h-8 px-3 gap-1.5 font-semibold"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-3 gap-1.5 font-semibold shadow-2xs"
                    }
                  >
                    {isDossierAddDocOpen ? (
                      <>
                        <X className="h-3.5 w-3.5" />
                        <span>Cancel Upload</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="h-3.5 w-3.5" />
                        <span>+ Upload Document</span>
                      </>
                    )}
                  </AppButton>
                </div>
              </div>

              {/* Compliance Checklist Summary Pills */}
              <div className="p-3 rounded-xl border border-border bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between gap-3 flex-wrap text-xs">
                <span className="font-bold text-foreground">Compliance Checklist:</span>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                    dossierData.hasRc
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25"
                      : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25"
                  }`}>
                    <CheckCircle2 className="h-3 w-3" />
                    <span>RC Smart Card: {dossierData.hasRc ? "Archived" : "Missing"}</span>
                  </span>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                    dossierData.hasInsurance
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25"
                      : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25"
                  }`}>
                    <ShieldCheck className="h-3 w-3" />
                    <span>Insurance: {dossierData.hasInsurance ? "Covered" : "Missing"}</span>
                  </span>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                    dossierData.hasPuc
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25"
                      : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25"
                  }`}>
                    <Wind className="h-3 w-3" />
                    <span>PUC: {dossierData.hasPuc ? "Valid" : "Pending"}</span>
                  </span>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                    dossierData.hasFitness
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25"
                      : "bg-slate-200 dark:bg-slate-700 text-muted-foreground border-border"
                  }`}>
                    <FileText className="h-3 w-3" />
                    <span>Fitness: {dossierData.hasFitness ? "Valid" : "N/A"}</span>
                  </span>
                </div>
              </div>

              {/* INLINE DOCUMENT UPLOAD FORM (Directly inside dossier screen) */}
              {isDossierAddDocOpen && (
                <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <UploadCloud className="h-4 w-4" />
                      <span>Archive New Document to Vehicle Vault</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsDossierAddDocOpen(false)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-foreground block mb-1">Document Category</label>
                      <select
                        value={dossierNewDocType}
                        onChange={(e) => setDossierNewDocType(e.target.value)}
                        className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:border-theme-btn-primary"
                      >
                        {VEHICLE_DOC_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-foreground block mb-1">Document Title (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. 2026-27 Comprehensive Policy"
                        value={dossierNewDocTitle}
                        onChange={(e) => setDossierNewDocTitle(e.target.value)}
                        className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:border-theme-btn-primary"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-foreground block mb-1">Document / Certificate #</label>
                      <input
                        type="text"
                        placeholder="e.g. POL-8941203"
                        value={dossierNewDocNumber}
                        onChange={(e) => setDossierNewDocNumber(e.target.value)}
                        className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:border-theme-btn-primary font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-foreground block mb-1">Expiry Date (Optional)</label>
                      <input
                        type="date"
                        value={dossierNewDocExpiry}
                        onChange={(e) => setDossierNewDocExpiry(e.target.value)}
                        className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:border-theme-btn-primary font-mono"
                      />
                    </div>
                  </div>

                  {/* Drag and Drop Upload Zone */}
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files) {
                        handleDossierDirectDocUpload(e.dataTransfer.files);
                      }
                    }}
                    className="p-6 border-2 border-dashed border-emerald-500/40 rounded-xl bg-surface text-center hover:border-emerald-500 transition-colors cursor-pointer"
                    onClick={() => {
                      const input = document.getElementById("dossier-direct-doc-file-input") as HTMLInputElement;
                      if (input) input.click();
                    }}
                  >
                    <input
                      id="dossier-direct-doc-file-input"
                      type="file"
                      className="hidden"
                      accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                      onChange={(e) => {
                        if (e.target.files) {
                          handleDossierDirectDocUpload(e.target.files);
                        }
                      }}
                    />
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        {dossierUploadingDoc ? (
                          <RotateCw className="h-5 w-5 animate-spin" />
                        ) : (
                          <UploadCloud className="h-5 w-5" />
                        )}
                      </div>
                      <span className="text-xs font-bold text-foreground">
                        {dossierUploadingDoc ? "Saving document to vault..." : "Click or drag document to archive"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Supports PDF, PNG, JPG, WEBP (Max 25MB). Auto-archives into vehicle vault.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Documents Grid */}
              {dossierData.docs.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed border-border bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
                  <FileCheck className="h-8 w-8 text-muted-foreground mx-auto opacity-50" />
                  <p className="text-xs font-semibold text-foreground">No documents currently archived for this vehicle</p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Attach PUC certificates, insurance policy schedules, RC smart cards, fitness certificates or state permits.
                  </p>
                  <div className="pt-2">
                    <AppButton
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => setIsDossierAddDocOpen(true)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-3 gap-1.5 font-semibold"
                    >
                      <UploadCloud className="h-3.5 w-3.5" />
                      <span>Upload First Document</span>
                    </AppButton>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {dossierData.docs.map((doc, idx) => {
                    const typeConfig = VEHICLE_DOC_TYPES.find((t) => t.value === doc.doc_type) || {
                      label: doc.doc_type,
                      badgeColor: "bg-slate-500/10 text-slate-600 border-slate-500/20"
                    };
                    const daysRemaining = doc.expiry_date ? calculateDaysRemaining(doc.expiry_date) : null;
                    return (
                      <div
                        key={doc.id || idx}
                        className="p-3.5 rounded-xl border border-border bg-surface hover:border-emerald-500/40 transition-colors shadow-2xs space-y-2.5 flex flex-col justify-between"
                      >
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-border shrink-0">
                            {renderAttachmentIcon(doc.file_type || resolveMimeFromName(doc.file_name), doc.file_name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${typeConfig.badgeColor}`}>
                                {typeConfig.label}
                              </span>
                              {doc.document_number && (
                                <span className="text-[9px] font-mono font-semibold px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-muted-foreground border border-border">
                                  #{doc.document_number}
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold text-foreground text-xs truncate mt-1" title={doc.title || doc.file_name}>
                              {doc.title || doc.file_name}
                            </h4>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5 truncate">
                              <span className="truncate max-w-[110px]">{doc.file_name}</span>
                              <span>•</span>
                              <span>{formatFileSize(doc.file_size)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Expiry Pill */}
                        <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                          <div>
                            {doc.expiry_date ? (
                              daysRemaining !== null && daysRemaining < 0 ? (
                                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                                  Expired {Math.abs(daysRemaining)}d ago
                                </span>
                              ) : daysRemaining !== null && daysRemaining <= 30 ? (
                                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                  Expires in {daysRemaining}d
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                  Valid ({daysRemaining}d)
                                </span>
                              )
                            ) : (
                              <span className="text-[10px] text-muted-foreground italic">No expiry set</span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <AppButton
                              type="button"
                              variant="outline"
                              size="icon-sm"
                              onClick={() => {
                                setPreviewAttachment({
                                  id: doc.id,
                                  file_name: doc.file_name,
                                  file_size: doc.file_size || "0 B",
                                  file_type: doc.file_type || resolveMimeFromName(doc.file_name),
                                  file_url: doc.file_url,
                                  uploaded_at: doc.uploaded_at
                                });
                                setPreviewZoom(1);
                                setPreviewRotation(0);
                              }}
                              className="h-7 w-7 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                              title="View / Preview Document"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </AppButton>
                            <AppButton
                              type="button"
                              variant="outline"
                              size="icon-sm"
                              onClick={() => downloadAttachment(doc)}
                              className="h-7 w-7 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                              title="Download Document"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </AppButton>
                            {canEditVehicle && (
                              <AppButton
                                type="button"
                                variant="outline"
                                size="icon-sm"
                                onClick={() => handleDossierDeleteDocument(doc.id)}
                                className="h-7 w-7 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
                                title="Delete Document"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </AppButton>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: STATUTORY COMPLIANCE, INSURANCE & PUC */}
          {/* ========================================================================= */}
          {(vehicleDossierTab === "COMPLIANCE" || vehicleDossierTab === "ALL") && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2 flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-cyan-600" />
                    <span>Motor Insurance Policy & PUC Clearances</span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Statutory coverage, policy renewal audit trail, and pollution emission test validity
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <AppButton
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDossierOriginVehicle(viewingVehicle);
                      handleOpenVehicleUnifiedRenewalsModal(viewingVehicle);
                    }}
                    className="h-8 text-xs px-2.5 text-theme-btn-primary border-theme-btn-primary/30 hover:bg-theme-btn-primary/10 gap-1 font-semibold"
                  >
                    <CalendarSync className="h-3.5 w-3.5" />
                    <span>Unified Renewals Timeline</span>
                  </AppButton>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Motor Insurance Policy Card */}
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
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">24x7 Roadside Assistance:</span>
                      <span className="font-semibold text-foreground">{viewingVehicle.has_roadside_assistance !== false ? "Covered" : "Not Opted"}</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-cyan-500/20 flex items-center justify-end gap-2">
                    <AppButton
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const v = viewingVehicle;
                        setDossierOriginVehicle(v);
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
                        setDossierOriginVehicle(v);
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
                        setDossierOriginVehicle(v);
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
                        setDossierOriginVehicle(v);
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

                {/* Statutory Fitness & Extended Validity Card */}
                <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-300 flex items-center gap-1.5">
                      <CalendarClock className="h-4 w-4 text-indigo-600" />
                      <span>Statutory Fitness & Extended Expiry</span>
                    </div>
                    {viewingVehicle.custom_extended_expiry_date && (() => {
                      const days = calculateDaysRemaining(viewingVehicle.custom_extended_expiry_date);
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
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-500/25">
                          Valid ({days}d)
                        </span>
                      );
                    })()}
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Custom Extended Expiry:</span>
                      <span className="font-mono font-bold text-foreground">
                        {viewingVehicle.custom_extended_expiry_date
                          ? String(viewingVehicle.custom_extended_expiry_date).split("T")[0]
                          : "Not Scheduled"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Fitness Certificate Expiry:</span>
                      <span className="font-mono font-bold text-foreground">{viewingVehicle.fitness_expiry_date || "—"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">HSRP Plate Status:</span>
                      <span className="font-semibold text-foreground">
                        {viewingVehicle.has_hsrp_plate !== false ? "Laser-Etched HSRP Fitted" : "Standard Plate"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Capitalized Asset Value:</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {viewingVehicle.purchase_price || viewingVehicle.purchase_cost
                          ? `₹${Number(viewingVehicle.purchase_price || viewingVehicle.purchase_cost).toLocaleString("en-IN")}`
                          : "—"}
                      </span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-indigo-500/20 flex items-center justify-end gap-2">
                    <AppButton
                      variant="outline"
                      size="sm"
                      onClick={() => openEditVehicleModal(viewingVehicle)}
                      className="h-7 text-xs px-2.5 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 gap-1 font-semibold"
                    >
                      <Edit2 className="h-3 w-3" />
                      <span>Update Compliance Dates</span>
                    </AppButton>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 6: TRIP MOVEMENTS & DISPATCH HISTORY */}
          {/* ========================================================================= */}
          {(vehicleDossierTab === "TRIPS" || vehicleDossierTab === "ALL") && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2 flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-purple-500" />
                    <span>Trip Movements & Fleet Dispatches</span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Movement history, scheduled dispatches, traveler itineraries & designated chauffeurs
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-xs text-muted-foreground">
                    Total: <strong className="text-foreground">{dossierData.trips.length} Trips</strong>
                  </div>
                </div>
              </div>

              {dossierData.trips.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed border-border bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
                  <MapPin className="h-8 w-8 text-muted-foreground mx-auto opacity-50" />
                  <p className="text-xs font-semibold text-foreground">No trip movements logged for this vehicle</p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Dispatches and scheduled corporate trips assigned to this vehicle will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {dossierData.trips.map((t) => (
                    <div
                      key={t.id}
                      className="p-3.5 rounded-xl border border-border bg-surface hover:border-purple-500/40 transition-colors shadow-2xs flex items-center justify-between gap-3 flex-wrap text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 border border-border text-foreground">
                            {t.trip_code || `#${t.id.slice(0, 6)}`}
                          </span>
                          <span className="font-bold text-foreground">
                            {t.traveler_name || "Executive Traveler"}
                          </span>
                          <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                            t.status === "COMPLETED"
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                              : t.status === "ON_ROUTE"
                              ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20"
                              : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                          }`}>
                            {t.status}
                          </span>
                        </div>
                        <div className="text-muted-foreground flex items-center gap-2 text-[11px] flex-wrap">
                          <span>Route: <strong className="text-foreground">{t.origin}</strong> → <strong className="text-foreground">{t.destination}</strong></span>
                          <span>•</span>
                          <span>Chauffeur: <strong className="text-foreground">{t.driver_name || "Assigned Driver"}</strong></span>
                          <span>•</span>
                          <span className="font-mono">Date: {t.plan_date || t.planned_start_time?.split("T")[0] || "—"}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <AppButton
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setDossierOriginVehicle(viewingVehicle);
                            setViewingTrip(t);
                          }}
                          className="h-7 text-xs px-2.5 text-purple-700 dark:text-purple-300 border-purple-500/30 hover:bg-purple-500/10 gap-1 font-semibold"
                        >
                          <Eye className="h-3 w-3" />
                          <span>Inspect Trip</span>
                        </AppButton>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </WorkingDocumentLayout>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* 2. VIEW DRIVER INSPECTOR MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {viewingDriver && (
        <WorkingDocumentLayout
          title={`Driver Personnel File: ${viewingDriver.full_name}`}
          badge={viewingDriver.is_active ? "ACTIVE ON DUTY" : "INACTIVE"}
          badgeColor={viewingDriver.is_active ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"}
          category="Driver Operations"
          icon={Users}
          iconBg="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25"
          description="Driver personnel credentials, driving license validity, emergency contacts, primary vehicle assignment & duty history."
          breadcrumbs={[
            { label: "Driver Management", onClick: () => setViewingDriver(null) },
            { label: `Driver File (${viewingDriver.full_name})` }
          ]}
          onBack={() => setViewingDriver(null)}
          backLabel="Back to Drivers"
        >
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
        </WorkingDocumentLayout>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* 3. VIEW TRIP / TRAVELER INSPECTOR MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {viewingTrip && (
        <WorkingDocumentLayout
          title={`Trip Transit Record #${viewingTrip.id.slice(0, 8)}`}
          badge={viewingTrip.status}
          badgeColor="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
          category="Transit Operations"
          icon={MapPin}
          iconBg="bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/25"
          description="Transit route manifest, driver assignment, vehicle telemetry, destination itinerary & trip odometer logs."
          breadcrumbs={[
            { label: "Trip Dispatches", onClick: () => setViewingTrip(null) },
            { label: `Trip #${viewingTrip.id.slice(0, 8)}` }
          ]}
          onBack={() => setViewingTrip(null)}
          backLabel="Back to Dispatches"
          headerActions={
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
          }
        >
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
        </WorkingDocumentLayout>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* 4. VIEW PART / ACCESSORY INSPECTOR MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {viewingPart && (
        <WorkingDocumentLayout
          title={`Spare Part Specification: ${viewingPart.name}`}
          badge={viewingPart.category}
          badgeColor="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
          category="Inventory & Spare Parts"
          icon={Package}
          iconBg="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25"
          description="Spare part master parameters, brand, SKU code, stock balance, warranty timeline & vehicle fitment."
          breadcrumbs={[
            { label: "Parts & Accessories", onClick: () => setViewingPart(null) },
            { label: `Part Dossier (${viewingPart.name})` }
          ]}
          onBack={() => setViewingPart(null)}
          backLabel="Back to Parts"
          headerActions={
            <AppButton
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                const p = viewingPart;
                setViewingPart(null);
                openEditPartModal(p);
              }}
              className="bg-theme-btn-primary hover:bg-theme-btn-primary-secondary text-white text-xs h-9 px-3 gap-1.5 font-semibold"
            >
              <Edit2 className="h-3.5 w-3.5" />
              <span>Edit Part</span>
            </AppButton>
          }
        >
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

              {/* Tax Invoice Breakdown & Attached Documents */}
              {(() => {
                let notesText = viewingPart.notes || "";
                let atts: MaintenanceAttachment[] = [];
                let tb: any = null;

                if (viewingPart.notes) {
                  try {
                    const parsed = JSON.parse(viewingPart.notes);
                    if (parsed && typeof parsed === "object") {
                      notesText = parsed.text || "";
                      if (Array.isArray(parsed.attachments)) atts = parsed.attachments;
                      if (parsed.tax_breakdown) tb = parsed.tax_breakdown;
                    }
                  } catch {
                    notesText = viewingPart.notes;
                  }
                }

                return (
                  <div className="space-y-4">
                    {/* Tax Breakdown Card */}
                    <div className="p-4 rounded-xl border border-border bg-surface space-y-3">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 pb-1 border-b border-border">
                        <Receipt className="h-4 w-4 text-emerald-500" />
                        <span>Procurement Invoice & Statutory Tax Breakdown</span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Gross Base Price ({viewingPart.quantity} units @ ₹{Number(viewingPart.unit_price || 0).toLocaleString("en-IN")}):</span>
                          <span className="font-mono font-medium text-foreground">
                            ₹{((Number(viewingPart.unit_price || 0)) * (Number(viewingPart.quantity || 1))).toLocaleString("en-IN")}
                          </span>
                        </div>
                        {tb && tb.discount > 0 && (
                          <div className="flex items-center justify-between text-xs text-rose-600 dark:text-rose-400">
                            <span>Trade Discount / Rebate:</span>
                            <span className="font-mono font-medium">-₹{Number(tb.discount).toLocaleString("en-IN")}</span>
                          </div>
                        )}
                        {tb && tb.taxable_base > 0 && (
                          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                            <span>Taxable Base Amount:</span>
                            <span className="font-mono text-foreground">₹{Number(tb.taxable_base).toLocaleString("en-IN")}</span>
                          </div>
                        )}
                        {tb && tb.tax_amount > 0 && (
                          <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400">
                            <span>GST Tax Addition ({tb.tax_rate}%):</span>
                            <span className="font-mono font-medium">+₹{Number(tb.tax_amount).toLocaleString("en-IN")}</span>
                          </div>
                        )}
                        {tb && tb.tds_deduction > 0 && (
                          <div className="flex items-center justify-between text-xs text-purple-600 dark:text-purple-400">
                            <span>TDS Withholding Deduction ({tb.tds_rate}%):</span>
                            <span className="font-mono font-medium">-₹{Number(tb.tds_deduction).toLocaleString("en-IN")}</span>
                          </div>
                        )}
                        {tb && tb.other_deductions > 0 && (
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Other Deductions:</span>
                            <span className="font-mono font-medium">-₹{Number(tb.other_deductions).toLocaleString("en-IN")}</span>
                          </div>
                        )}
                        <div className="pt-2 border-t border-border flex items-center justify-between text-sm font-bold">
                          <span className="text-foreground">Total Invoiced Asset Valuation:</span>
                          <span className="font-mono text-base text-primary">
                            ₹{Number(viewingPart.purchase_amount).toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Attached Documents */}
                    <div className="p-4 rounded-xl border border-border bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Paperclip className="h-3.5 w-3.5 text-amber-500" />
                          <span>Attached Invoices, Warranty Cards & Spec Sheets ({atts.length})</span>
                        </div>
                      </div>

                      {atts.length === 0 ? (
                        <div className="text-xs text-muted-foreground py-2 italic">
                          No digital invoices or spec sheet files attached to this part.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {atts.map((att, idx) => (
                            <div
                              key={att.id || idx}
                              className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface hover:border-theme-btn-primary/40 transition-colors"
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                                <div className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-border/80 shrink-0">
                                  {renderAttachmentIcon(att.file_type, att.file_name)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="font-semibold text-foreground truncate text-xs" title={att.file_name}>
                                    {att.file_name}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground">
                                    {formatFileSize(att.file_size)}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {att.file_type?.startsWith("image/") && (
                                  <AppButton
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => {
                                      setPreviewAttachment(att);
                                      setPreviewZoom(1);
                                      setPreviewRotation(0);
                                    }}
                                    className="h-7 w-7 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                                    title="Preview Image"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </AppButton>
                                )}
                                <AppButton
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => downloadAttachment(att)}
                                  className="h-7 w-7 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                                  title="Download File"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </AppButton>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Technical Notes */}
                    {notesText && (
                      <div className="p-4 rounded-xl border border-border bg-slate-50/50 dark:bg-slate-900/40 space-y-1.5">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          Technical Notes & Location Guidelines
                        </div>
                        <p className="text-xs text-foreground italic bg-surface p-3 rounded-lg border border-border/60 whitespace-pre-wrap">
                          {notesText}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}
        </WorkingDocumentLayout>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* 5. VIEW INSURANCE VENDOR INSPECTOR MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {viewingVendor && (
        <WorkingDocumentLayout
          title={`Insurance Underwriter Dossier: ${viewingVendor.name}`}
          badge={viewingVendor.is_active !== false ? "Active Partner" : "Inactive"}
          badgeColor={viewingVendor.is_active !== false ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"}
          category="Supply Chain & Underwriters"
          icon={Building2}
          iconBg="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25"
          description="Underwriter master profile, branch address, contact channels, portal links & active policy portfolio."
          breadcrumbs={[
            { label: "Insurance Vendors", onClick: () => setViewingVendor(null) },
            { label: `Vendor Dossier (${viewingVendor.name})` }
          ]}
          onBack={() => setViewingVendor(null)}
          backLabel="Back to Vendors"
        >
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
        </WorkingDocumentLayout>
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

      {/* ---------------------------------------------------------------------- */}
      {/* INTERACTIVE ATTACHMENT PREVIEW LIGHTBOX MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {previewAttachment && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-surface border border-border w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-border bg-slate-50/90 dark:bg-slate-900/90 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-4">
                <div className="h-8 w-8 rounded-lg bg-theme-btn-primary/15 text-theme-btn-primary flex items-center justify-center shrink-0">
                  {renderAttachmentIcon(previewAttachment.file_type, previewAttachment.file_name)}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-foreground truncate" title={previewAttachment.file_name}>
                    {previewAttachment.file_name}
                  </h4>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                    <span>{formatFileSize(previewAttachment.file_size)}</span>
                    {previewAttachment.uploaded_at && (
                      <>
                        <span>•</span>
                        <span>Uploaded {new Date(previewAttachment.uploaded_at).toLocaleString("en-IN")}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {previewAttachment.file_type?.startsWith("image/") && (
                  <>
                    <AppButton
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      onClick={() => setPreviewZoom((z) => Math.max(0.5, z - 0.25))}
                      className="h-8 w-8"
                      title="Zoom Out"
                    >
                      <ZoomOut className="h-3.5 w-3.5" />
                    </AppButton>
                    <span className="text-[11px] font-mono font-semibold px-1 text-muted-foreground">
                      {Math.round(previewZoom * 100)}%
                    </span>
                    <AppButton
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      onClick={() => setPreviewZoom((z) => Math.min(3, z + 0.25))}
                      className="h-8 w-8"
                      title="Zoom In"
                    >
                      <ZoomIn className="h-3.5 w-3.5" />
                    </AppButton>
                    <AppButton
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      onClick={() => setPreviewRotation((r) => (r + 90) % 360)}
                      className="h-8 w-8"
                      title="Rotate 90°"
                    >
                      <RotateCw className="h-3.5 w-3.5" />
                    </AppButton>
                  </>
                )}

                <AppButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => downloadAttachment(previewAttachment)}
                  className="gap-1 text-xs h-8 font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                  title="Download Original File"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Download</span>
                </AppButton>

                <AppButton
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setPreviewAttachment(null)}
                  title="Close Preview"
                >
                  <X className="h-4 w-4" />
                </AppButton>
              </div>
            </div>

            {/* Modal Preview Canvas */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950/20 min-h-[350px] max-h-[calc(92vh-130px)]">
              {previewAttachment.file_type?.startsWith("image/") ? (
                <div className="overflow-auto max-w-full max-h-full flex items-center justify-center p-2">
                  <img
                    src={previewAttachment.file_url}
                    alt={previewAttachment.file_name}
                    style={{
                      transform: `scale(${previewZoom}) rotate(${previewRotation}deg)`,
                      transition: "transform 0.2s ease-in-out"
                    }}
                    className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-md"
                  />
                </div>
              ) : previewAttachment.file_type === "application/pdf" || previewAttachment.file_name?.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={previewAttachment.file_url}
                  title={previewAttachment.file_name}
                  className="w-full h-[70vh] rounded-lg border border-border bg-white shadow-inner"
                />
              ) : (
                <div className="text-center p-8 space-y-3">
                  <div className="h-16 w-16 rounded-2xl bg-amber-500/15 text-amber-600 mx-auto flex items-center justify-center border border-amber-500/25">
                    {renderAttachmentIcon(previewAttachment.file_type, previewAttachment.file_name)}
                  </div>
                  <div className="text-sm font-bold text-foreground">
                    {previewAttachment.file_name}
                  </div>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Direct browser preview is not supported for this file format. You can download and view it on your device.
                  </p>
                  <AppButton
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => downloadAttachment(previewAttachment)}
                    className="gap-1.5 text-xs font-semibold"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download & Open Document</span>
                  </AppButton>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
