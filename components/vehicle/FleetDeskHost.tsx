"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  ExternalLink,
  FileSpreadsheet
} from "lucide-react";
import { 
  POPULAR_BRANDS, 
  TOP_BRAND_NAMES, 
  analyzeIndianPlate 
} from "./vehicleQuickPicks";
import { AppCard, AppCardContent, AppCardHeader, AppCardTitle } from "@/components/ui/AppCard";
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
import ChandakLoader from "@/components/ui/ChandakLoader";
import {
  fetchVehicleDashboardStats,
  fetchVehiclesList,
  fetchDriversList,
  fetchTripsList,
  fetchMaintenanceList,
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
  deleteServiceRecordAction,
  fetchVehiclePortalDetailsAction,
  calculateDaysRemaining,
  VehicleDashboardStats,
  VehicleRecord,
  DriverRecord,
  TripRecord,
  MaintenanceRecord
} from "@/lib/actions/vehicle";

export default function FleetDeskHost({ initialSlug }: { initialSlug?: string[] }) {
  const pathname = usePathname() || "/vehicle";
  const router = useRouter();

  // Active sub-navigation tab based on URL
  const activeTab = useMemo(() => {
    if (pathname.includes("/register") || pathname.includes("/new")) return "register";
    if (pathname.includes("/inventory")) return "inventory";
    if (pathname.includes("/trips")) return "trips";
    if (pathname.includes("/drivers")) return "drivers";
    if (pathname.includes("/maintenance")) return "maintenance";
    if (pathname.includes("/travelers")) return "travelers";
    if (pathname.includes("/alerts")) return "alerts";
    if (pathname.includes("/reports")) return "reports";
    if (pathname.includes("/parts")) return "parts";
    if (pathname.includes("/my-garage")) return "my-garage";
    if (pathname.includes("/learning")) return "learning";
    if (pathname.includes("/settings")) return "settings";
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

  // Filtering and search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  // Modal Dialog States
  const [isEditVehicleOpen, setIsEditVehicleOpen] = useState(false);
  const [selectedVehicleForEdit, setSelectedVehicleForEdit] = useState<VehicleRecord | null>(null);

  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
  const [isEditDriverOpen, setIsEditDriverOpen] = useState(false);
  const [selectedDriverForEdit, setSelectedDriverForEdit] = useState<DriverRecord | null>(null);

  const [isDispatchTripOpen, setIsDispatchTripOpen] = useState(false);
  const [isAddMaintenanceOpen, setIsAddMaintenanceOpen] = useState(false);

  // Generic Delete Confirmation Dialog State
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "vehicle" | "driver" | "trip" | "maintenance";
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
  // Form States — Log Maintenance
  // ----------------------------------------------------------------------------
  const [newMaintVehicleId, setNewMaintVehicleId] = useState("");
  const [newMaintServiceType, setNewMaintServiceType] = useState("");
  const [newMaintVendor, setNewMaintVendor] = useState("");
  const [newMaintCost, setNewMaintCost] = useState<number>(0);
  const [newMaintOdometer, setNewMaintOdometer] = useState<number>(0);
  const [newMaintDate, setNewMaintDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [newMaintNextDue, setNewMaintNextDue] = useState("");

  // ----------------------------------------------------------------------------
  // Data Loaders (Module-local operations)
  // ----------------------------------------------------------------------------

  const loadAllData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);

      const [statsRes, vehiclesRes, driversRes, tripsRes, maintRes] = await Promise.all([
        fetchVehicleDashboardStats(),
        fetchVehiclesList({ pageSize: 100 }),
        fetchDriversList(),
        fetchTripsList(),
        fetchMaintenanceList()
      ]);

      if (statsRes.success) setStats(statsRes.stats);
      if (vehiclesRes.success) setVehicles(vehiclesRes.vehicles);
      if (driversRes.success) setDrivers(driversRes.drivers);
      if (tripsRes.success) setTrips(tripsRes.trips);
      if (maintRes.success) setMaintenance(maintRes.records);

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
    } else {
      setSuccessBanner(msg);
      setErrorBanner(null);
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
  const queryVehiclePortal = async (plateNumber: string) => {
    try {
      const res = await fetch(`/api/vehicle/lookup?plate=${encodeURIComponent(plateNumber)}`, {
        headers: { "Cache-Control": "no-cache" }
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (apiErr) {
      console.warn("[vehicle] REST lookup failed, attempting Server Action fallback:", apiErr);
    }

    try {
      return await fetchVehiclePortalDetailsAction(plateNumber);
    } catch (err: any) {
      if (err?.message?.includes("was not found on the server") || err?.message?.includes("failed-to-find-server-action")) {
        console.warn("[vehicle] Stale Server Action hash detected, retrying via REST endpoint...");
        const retryRes = await fetch(`/api/vehicle/lookup?plate=${encodeURIComponent(plateNumber)}`);
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
      const res = await queryVehiclePortal(rawPlate);
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
        if (d.registration_date) setNewVehicleRegDate(d.registration_date);
        if (d.rto_office) setNewVehicleRtoOffice(d.rto_office);
        if (d.registered_owner) setNewVehicleOwner(d.registered_owner);
        if (d.rto_rmn) setNewVehicleRtoRmn(d.rto_rmn);
        if (d.insurance_policy_number) setNewVehicleInsurancePolicy(d.insurance_policy_number);
        if (d.insurance_expiry_date) setNewVehicleInsuranceExpiry(d.insurance_expiry_date);
        if (d.puc_expiry_date) setNewVehiclePucExpiry(d.puc_expiry_date);
        if (d.fitness_expiry_date) setNewVehicleFitnessExpiry(d.fitness_expiry_date);
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
      let insPolicy = newVehicleInsurancePolicy.trim();
      let insExp = newVehicleInsuranceExpiry;
      let pucExp = newVehiclePucExpiry;
      let fitExp = newVehicleFitnessExpiry;
      let odo = Number(newVehicleOdometer) || 0;
      let nickname = (newVehicleNickname.trim() || `${make} ${model}`).trim();

      // Mandatory validation for all 11 required input fields
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
      if (!pucExp) {
        triggerToast("PUC End Date is mandatory.", true);
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
        insurance_policy_number: insPolicy || undefined,
        insurance_expiry_date: insExp,
        puc_expiry_date: pucExp,
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
    setEditVehicleInsurancePolicy(veh.insurance_policy_number || "");
    setEditVehicleInsuranceExpiry(veh.insurance_expiry_date ? String(veh.insurance_expiry_date).split("T")[0] : "");
    setEditVehiclePucExpiry(veh.puc_expiry_date ? String(veh.puc_expiry_date).split("T")[0] : "");
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
      const res = await queryVehiclePortal(rawPlate);
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
        if (d.registration_date) setEditVehicleRegDate(d.registration_date);
        if (d.rto_office) setEditVehicleRtoOffice(d.rto_office);
        if (d.registered_owner) setEditVehicleOwner(d.registered_owner);
        if (d.rto_rmn) setEditVehicleRtoRmn(d.rto_rmn);
        if (d.insurance_policy_number) setEditVehicleInsurancePolicy(d.insurance_policy_number);
        if (d.insurance_expiry_date) setEditVehicleInsuranceExpiry(d.insurance_expiry_date);
        if (d.puc_expiry_date) setEditVehiclePucExpiry(d.puc_expiry_date);
        if (d.fitness_expiry_date) setEditVehicleFitnessExpiry(d.fitness_expiry_date);

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
        setSelectedVehicleForEdit(null);
        loadAllData(true);
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
  // CRUD Handlers: MAINTENANCE
  // ----------------------------------------------------------------------------

  const handleLogMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMaintVehicleId || !newMaintServiceType.trim() || !newMaintVendor.trim()) {
      triggerToast("Vehicle, service type, and workshop are required.", true);
      return;
    }

    setModalSubmitting(true);
    try {
      const res = await createServiceRecordAction({
        vehicle_id: newMaintVehicleId,
        service_type: newMaintServiceType.trim(),
        service_center: newMaintVendor.trim(),
        service_date: newMaintDate || undefined,
        cost: Number(newMaintCost) || 0,
        odometer_km: Number(newMaintOdometer) || 0,
        next_service_due_date: newMaintNextDue || undefined
      });

      if (res.success) {
        triggerToast("Maintenance record logged successfully!");
        setIsAddMaintenanceOpen(false);
        setNewMaintVehicleId("");
        setNewMaintServiceType("");
        setNewMaintVendor("");
        setNewMaintCost(0);
        setNewMaintOdometer(0);
        setNewMaintNextDue("");
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

      checkDoc("Insurance Policy", v.insurance_expiry_date);
      checkDoc("Pollution (PUC)", v.puc_expiry_date);
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

      {/* Top Header & KPI Bar — Shown when NOT on dedicated Register Form page */}
      {activeTab !== "register" && (
        <>
          {/* Top Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-6">
            <div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/25">
                  <Car className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    Vehicle Module
                  </h1>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Central fleet master, real-time driver allocation, trip dispatch & maintenance records
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <AppButton
                variant="secondary"
                size="sm"
                onClick={() => loadAllData(true)}
                disabled={refreshing}
                className="text-xs h-9"
                title="Refresh fleet data"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
                <span>Sync</span>
              </AppButton>

              <AppButton
                variant={activeTab === "dashboard" ? "primary" : "secondary"}
                size="sm"
                onClick={() => router.push("/vehicle")}
                className={`text-xs h-9 font-semibold transition-all ${
                  activeTab === "dashboard"
                    ? "bg-theme-btn-primary text-white font-bold shadow-xs border-transparent ring-1 ring-theme-btn-primary/30"
                    : "bg-surface text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 border-border"
                }`}
              >
                <LayoutDashboard className={`h-4 w-4 mr-1.5 ${activeTab === "dashboard" ? "text-white" : "text-muted-foreground"}`} />
                <span>Overview</span>
              </AppButton>

              <AppButton
                variant={activeTab === "inventory" ? "primary" : "secondary"}
                size="sm"
                onClick={() => router.push("/vehicle/inventory")}
                className={`text-xs h-9 font-semibold transition-all ${
                  activeTab === "inventory"
                    ? "bg-theme-btn-primary text-white font-bold shadow-xs border-transparent ring-1 ring-theme-btn-primary/30"
                    : "bg-surface text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 border-border"
                }`}
              >
                <Car className={`h-4 w-4 mr-1.5 ${activeTab === "inventory" ? "text-white" : "text-muted-foreground"}`} />
                <span>Fleet ({stats.totalVehicles})</span>
              </AppButton>

              <AppButton
                variant={activeTab === "drivers" ? "primary" : "secondary"}
                size="sm"
                onClick={() => router.push("/vehicle/drivers")}
                className={`text-xs h-9 font-semibold transition-all ${
                  activeTab === "drivers"
                    ? "bg-theme-btn-primary text-white font-bold shadow-xs border-transparent ring-1 ring-theme-btn-primary/30"
                    : "bg-surface text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 border-border"
                }`}
              >
                <Users className={`h-4 w-4 mr-1.5 ${activeTab === "drivers" ? "text-white" : "text-muted-foreground"}`} />
                <span>Drivers ({stats.activeDrivers})</span>
              </AppButton>

              <AppButton
                variant={activeTab === "trips" ? "primary" : "secondary"}
                size="sm"
                onClick={() => router.push("/vehicle/trips")}
                className={`text-xs h-9 font-semibold transition-all ${
                  activeTab === "trips"
                    ? "bg-theme-btn-primary text-white font-bold shadow-xs border-transparent ring-1 ring-theme-btn-primary/30"
                    : "bg-surface text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 border-border"
                }`}
              >
                <Calendar className={`h-4 w-4 mr-1.5 ${activeTab === "trips" ? "text-white" : "text-muted-foreground"}`} />
                <span>Trips ({stats.activeTrips})</span>
              </AppButton>

              <AppButton
                variant={activeTab === "maintenance" ? "primary" : "secondary"}
                size="sm"
                onClick={() => router.push("/vehicle/maintenance")}
                className={`text-xs h-9 font-semibold transition-all ${
                  activeTab === "maintenance"
                    ? "bg-theme-btn-primary text-white font-bold shadow-xs border-transparent ring-1 ring-theme-btn-primary/30"
                    : "bg-surface text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 border-border"
                }`}
              >
                <Wrench className={`h-4 w-4 mr-1.5 ${activeTab === "maintenance" ? "text-white" : "text-muted-foreground"}`} />
                <span>Maintenance ({stats.inMaintenanceVehicles})</span>
              </AppButton>

              <AppButton
                variant={activeTab === "alerts" ? "primary" : "secondary"}
                size="sm"
                onClick={() => router.push("/vehicle/alerts")}
                className={`text-xs h-9 font-semibold transition-all ${
                  activeTab === "alerts"
                    ? "bg-theme-btn-primary text-white font-bold shadow-xs border-transparent ring-1 ring-theme-btn-primary/30"
                    : "bg-surface text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 border-border"
                }`}
              >
                <ShieldAlert className={`h-4 w-4 mr-1.5 ${activeTab === "alerts" ? "text-white" : "text-amber-500"}`} />
                <span>Alerts</span>
              </AppButton>

              <AppButton
                variant={activeTab === "travelers" ? "primary" : "secondary"}
                size="sm"
                onClick={() => router.push("/vehicle/travelers")}
                className={`text-xs h-9 font-semibold transition-all ${
                  activeTab === "travelers"
                    ? "bg-theme-btn-primary text-white font-bold shadow-xs border-transparent ring-1 ring-theme-btn-primary/30"
                    : "bg-surface text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 border-border"
                }`}
              >
                <UserCheck className={`h-4 w-4 mr-1.5 ${activeTab === "travelers" ? "text-white" : "text-indigo-500"}`} />
                <span>Travelers</span>
              </AppButton>

              <AppButton
                variant={activeTab === "reports" ? "primary" : "secondary"}
                size="sm"
                onClick={() => router.push("/vehicle/reports")}
                className={`text-xs h-9 font-semibold transition-all ${
                  activeTab === "reports"
                    ? "bg-theme-btn-primary text-white font-bold shadow-xs border-transparent ring-1 ring-theme-btn-primary/30"
                    : "bg-surface text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 border-border"
                }`}
              >
                <LineChart className={`h-4 w-4 mr-1.5 ${activeTab === "reports" ? "text-white" : "text-emerald-500"}`} />
                <span>Reports</span>
              </AppButton>

              {/* Action trigger button tailored to active tab */}
              {activeTab === "drivers" ? (
                <AppButton
                  variant="primary"
                  size="sm"
                  onClick={() => setIsAddDriverOpen(true)}
                  className="bg-theme-btn-primary hover:bg-theme-btn-primary-secondary text-white text-xs h-9 font-semibold gap-1.5 shadow-xs"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Driver</span>
                </AppButton>
              ) : activeTab === "trips" || activeTab === "travelers" ? (
                <AppButton
                  variant="primary"
                  size="sm"
                  onClick={() => setIsDispatchTripOpen(true)}
                  className="bg-theme-btn-primary hover:bg-theme-btn-primary-secondary text-white text-xs h-9 font-semibold gap-1.5 shadow-xs"
                >
                  <Plus className="h-4 w-4" />
                  <span>Dispatch Trip</span>
                </AppButton>
              ) : activeTab === "maintenance" ? (
                <AppButton
                  variant="primary"
                  size="sm"
                  onClick={() => setIsAddMaintenanceOpen(true)}
                  className="bg-theme-btn-primary hover:bg-theme-btn-primary-secondary text-white text-xs h-9 font-semibold gap-1.5 shadow-xs"
                >
                  <Plus className="h-4 w-4" />
                  <span>Log Maintenance</span>
                </AppButton>
              ) : (
                <AppButton
                  variant="primary"
                  size="sm"
                  onClick={() => router.push("/vehicle/register")}
                  className="bg-theme-btn-primary hover:bg-theme-btn-primary-secondary text-white text-xs h-9 font-semibold gap-1.5 shadow-xs"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Vehicle</span>
                </AppButton>
              )}
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <AppCard className="border-border shadow-xs">
              <AppCardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Total Fleet Master</p>
                  <h3 className="text-2xl font-bold mt-1 text-foreground">{stats.totalVehicles}</h3>
                  <span className="text-[10px] text-muted-foreground">Registered company vehicles</span>
                </div>
                <div className="h-10 w-10 rounded-xl bg-theme-btn-primary/10 text-theme-btn-primary flex items-center justify-center border border-theme-btn-primary/20">
                  <Car className="h-5 w-5" />
                </div>
              </AppCardContent>
            </AppCard>

            <AppCard className="border-border shadow-xs">
              <AppCardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">En-Route Vehicles</p>
                  <h3 className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{stats.onRouteVehicles}</h3>
                  <span className="text-[10px] text-muted-foreground">Currently on active transit</span>
                </div>
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
                  <MapPin className="h-5 w-5" />
                </div>
              </AppCardContent>
            </AppCard>

            <AppCard className="border-border shadow-xs">
              <AppCardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Available at Depot</p>
                  <h3 className="text-2xl font-bold mt-1 text-foreground">{stats.availableVehicles}</h3>
                  <span className="text-[10px] text-muted-foreground">Ready for dispatch</span>
                </div>
                <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center border border-indigo-500/20">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </AppCardContent>
            </AppCard>

            <AppCard className="border-border shadow-xs">
              <AppCardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">In Workshop / Service</p>
                  <h3 className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">{stats.inMaintenanceVehicles}</h3>
                  <span className="text-[10px] text-muted-foreground">Under maintenance</span>
                </div>
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
                  <Wrench className="h-5 w-5" />
                </div>
              </AppCardContent>
            </AppCard>
          </div>
        </>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* REGISTER VEHICLE FULL-PAGE FORM (DEDICATED FORM VIEW) */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === "register" && (
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
                      placeholder="e.g. MH02FE4281" 
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
                      <button
                        key={sample.plate}
                        type="button"
                        onClick={() => {
                          setNewVehiclePlate(sample.plate);
                          if (portalLookupMsg) setPortalLookupMsg(null);
                        }}
                        className="px-2 py-0.5 rounded text-[10px] font-mono font-medium border border-border/80 bg-surface hover:border-theme-btn-primary hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground transition-all cursor-pointer"
                      >
                        {sample.label}
                      </button>
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
                      placeholder="e.g. MH-02 (Mumbai West / Andheri RTO)" 
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
                    placeholder="e.g. Toyota, Maruti Suzuki, Tata" 
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
                        <button
                          key={brand}
                          type="button"
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
                          className={`px-2 py-0.5 rounded text-xs font-medium border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-theme-btn-primary text-white border-theme-btn-primary shadow-xs font-semibold"
                              : "bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 border-border text-foreground hover:border-theme-btn-primary/40"
                          }`}
                        >
                          {brand}
                        </button>
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
                    placeholder="e.g. Innova Hycross, Fortuner, Swift" 
                    value={newVehicleModel} 
                    onChange={(e) => setNewVehicleModel(e.target.value)} 
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
                          <button
                            key={m}
                            type="button"
                            onClick={() => {
                              setNewVehicleModel(m);
                              const cfg = POPULAR_BRANDS[newVehicleMake];
                              if (cfg?.category) setNewVehicleCategory(cfg.category);
                              if (newPlateInfo.districtCode) {
                                setNewVehicleNickname(`${newPlateInfo.stateCode} ${m}`.trim());
                              }
                            }}
                            className={`px-2 py-0.5 rounded text-xs font-medium border transition-all cursor-pointer ${
                              isSelected
                                ? "bg-theme-btn-primary text-white border-theme-btn-primary shadow-xs font-semibold"
                                : "bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 border-border text-foreground hover:border-theme-btn-primary/40"
                            }`}
                          >
                            {m}
                          </button>
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
                    placeholder="e.g. ZX (O) Hybrid, 2.8 4x4 AT" 
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
                    onChange={(e) => setNewVehicleFuel(e.target.value)}
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
                      placeholder="e.g. Pearl White / #1e293b" 
                      value={newVehicleColor} 
                      onChange={(e) => setNewVehicleColor(e.target.value)} 
                      className="flex-1"
                    />
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
                    placeholder="e.g. Chandak Realtors Pvt. Ltd. / Saroj Landmark Realty LLP" 
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
                    placeholder="e.g. +91 98200 45210" 
                    value={newVehicleRtoRmn} 
                    onChange={(e) => setNewVehicleRtoRmn(e.target.value)} 
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5 flex items-center gap-1">
                    <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Chassis Number (VIN) *</span>
                  </label>
                  <AppInput 
                    placeholder="e.g. MBJAAA41VPA012345" 
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
                    placeholder="e.g. 2GD1234567" 
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5 flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Insurance Policy Number</span>
                  </label>
                  <AppInput 
                    placeholder="e.g. 2311/61284792/00/000 (ICICI Lombard)" 
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
                    placeholder="0" 
                    value={newVehicleOdometer} 
                    onChange={(e) => setNewVehicleOdometer(Number(e.target.value))} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">Fleet Nickname / Asset Tag</label>
                  <AppInput 
                    placeholder="e.g. Stella Site VIP Chauffeur Car" 
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
                    <button onClick={() => setIsDispatchTripOpen(true)} className="text-theme-btn-primary font-bold hover:underline">
                      Dispatch Trip
                    </button>{" "}
                    to schedule a movement.
                  </div>
                ) : (
                  <div className="divide-y divide-border/60">
                    {trips.slice(0, 5).map(trp => (
                      <div key={trp.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {renderHsrpPlate(trp.vehicle_reg)}
                            <span className="text-foreground font-semibold">{trp.traveler_name}</span>
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
                              onClick={() => handleUpdateTripStatus(trp.id, "IN_PROGRESS")}
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
                              onClick={() => handleUpdateTripStatus(trp.id, "COMPLETED")}
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
                    <button onClick={() => router.push("/vehicle/register")} className="text-theme-btn-primary font-bold hover:underline">
                      Add Vehicle
                    </button>{" "}
                    to register a vehicle.
                  </div>
                ) : (
                  <div className="divide-y divide-border/60">
                    {vehicles.slice(0, 5).map(veh => (
                      <div key={veh.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            {renderHsrpPlate(veh.registration_number)}
                            <span className="font-semibold text-foreground">{veh.make} {veh.model}</span>
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
                          <AppButton
                            variant="ghost"
                            size="icon-sm"
                            title="Edit Vehicle"
                            onClick={() => openEditVehicleModal(veh)}
                            className="h-7 w-7"
                          >
                            <Edit2 className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                          </AppButton>
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

              <AppButton
                variant="primary"
                size="sm"
                onClick={() => router.push("/vehicle/register")}
                className="bg-theme-btn-primary hover:bg-theme-btn-primary-secondary text-white text-xs h-8 font-semibold gap-1.5 shadow-xs shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Register Vehicle</span>
              </AppButton>
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
                        <button onClick={() => router.push("/vehicle/register")} className="text-theme-btn-primary font-bold hover:underline">
                          Add Vehicle
                        </button>{" "}
                        to enroll a new vehicle.
                      </AppTableCell>
                    </AppTableRow>
                  ) : (
                    filteredVehicles.map((veh) => (
                      <AppTableRow key={veh.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
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
                          <div className="font-mono text-[11px] font-semibold text-foreground">
                            {veh.puc_expiry_date ? String(veh.puc_expiry_date).split("T")[0] : "—"}
                          </div>
                          <div className="mt-1">
                            {renderExpiryBadge(veh.puc_expire_days ?? calculateDaysRemaining(veh.puc_expiry_date))}
                          </div>
                        </AppTableCell>

                        {/* 6. Insurance End Date & Insurance Expire in Days */}
                        <AppTableCell className="p-3.5">
                          <div className="font-mono text-[11px] font-semibold text-foreground flex items-center gap-1">
                            <Shield className="h-3 w-3 text-emerald-500 shrink-0" />
                            <span>{veh.insurance_expiry_date ? String(veh.insurance_expiry_date).split("T")[0] : "—"}</span>
                          </div>
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
                              size="icon-sm"
                              title="Edit Vehicle"
                              onClick={() => openEditVehicleModal(veh)}
                              className="h-7 w-7"
                            >
                              <Edit2 className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                            </AppButton>
                            <AppButton
                              variant="outline"
                              size="icon-sm"
                              title="Delete Vehicle"
                              onClick={() => setDeleteTarget({
                                type: "vehicle",
                                id: veh.id,
                                label: `Vehicle ${veh.registration_number}`
                              })}
                              className="h-7 w-7 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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
                        <AppTableRow key={drv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
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
                              <AppButton
                                variant="outline"
                                size="icon-sm"
                                title="Edit Driver"
                                onClick={() => openEditDriverModal(drv)}
                                className="h-7 w-7"
                              >
                                <Edit2 className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                              </AppButton>
                              <AppButton
                                variant="outline"
                                size="icon-sm"
                                title="Delete Driver"
                                onClick={() => setDeleteTarget({
                                  type: "driver",
                                  id: drv.id,
                                  label: `Driver ${drv.full_name}`
                                })}
                                className="h-7 w-7 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900"
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
                      <AppTableRow key={trp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <AppTableCell className="p-3.5 font-mono text-muted-foreground">{trp.plan_date}</AppTableCell>
                        <AppTableCell className="p-3.5 font-bold text-foreground">
                          {renderHsrpPlate(trp.vehicle_reg)}
                        </AppTableCell>
                        <AppTableCell className="p-3.5 text-muted-foreground">{trp.driver_name}</AppTableCell>
                        <AppTableCell className="p-3.5">
                          <div className="font-semibold text-foreground">{trp.traveler_name}</div>
                          <div className="text-[10px] text-muted-foreground">{trp.purpose}</div>
                        </AppTableCell>
                        <AppTableCell className="p-3.5 text-muted-foreground">
                          {trp.origin} ➔ <span className="text-foreground font-medium">{trp.destination}</span>
                        </AppTableCell>
                        <AppTableCell className="p-3.5 text-muted-foreground font-mono">{trp.planned_start_time} - {trp.planned_end_time}</AppTableCell>
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
                            {trp.status === "PLANNED" && (
                              <>
                                <AppButton
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUpdateTripStatus(trp.id, "IN_PROGRESS")}
                                  className="h-7 text-xs px-2 text-emerald-600 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                >
                                  <Play className="h-3 w-3 mr-1" />
                                  Start
                                </AppButton>
                                <AppButton
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUpdateTripStatus(trp.id, "CANCELLED")}
                                  className="h-7 text-xs px-2 text-muted-foreground hover:text-rose-600"
                                >
                                  Cancel
                                </AppButton>
                              </>
                            )}
                            {trp.status === "IN_PROGRESS" && (
                              <AppButton
                                variant="outline"
                                size="sm"
                                onClick={() => handleUpdateTripStatus(trp.id, "COMPLETED")}
                                className="h-7 text-xs px-2 text-blue-600 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Complete
                              </AppButton>
                            )}
                            <AppButton
                              variant="outline"
                              size="icon-sm"
                              title="Delete Trip"
                              onClick={() => setDeleteTarget({
                                type: "trip",
                                id: trp.id,
                                label: `Trip for ${trp.traveler_name}`
                              })}
                              className="h-7 w-7 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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
            </div>
          </AppCardHeader>

          <AppCardContent className="p-0 overflow-x-auto">
            <AppTableContainer className="rounded-none border-none">
              <AppTable className="w-full text-left text-xs">
                <AppTableHeader className="bg-slate-50 dark:bg-slate-900/60 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  <AppTableRow>
                    <AppTableHead className="p-3.5">Service Date</AppTableHead>
                    <AppTableHead className="p-3.5">Vehicle</AppTableHead>
                    <AppTableHead className="p-3.5">Service Details</AppTableHead>
                    <AppTableHead className="p-3.5">Authorized Vendor / Workshop</AppTableHead>
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
                        No maintenance records yet. Click <strong>Log Maintenance</strong> to record service work.
                      </AppTableCell>
                    </AppTableRow>
                  ) : (
                    filteredMaintenance.map((m) => (
                      <AppTableRow key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <AppTableCell className="p-3.5 font-mono text-muted-foreground">{m.service_date}</AppTableCell>
                        <AppTableCell className="p-3.5 font-bold text-foreground">
                          {renderHsrpPlate(m.vehicle_reg)}
                        </AppTableCell>
                        <AppTableCell className="p-3.5 text-foreground max-w-md">{m.service_type}</AppTableCell>
                        <AppTableCell className="p-3.5 text-muted-foreground">{m.service_center}</AppTableCell>
                        <AppTableCell className="p-3.5 font-mono text-muted-foreground">{m.odometer_km.toLocaleString()} km</AppTableCell>
                        <AppTableCell className="p-3.5 font-semibold text-foreground">₹{Number(m.cost).toLocaleString("en-IN")}</AppTableCell>
                        <AppTableCell className="p-3.5 text-center font-mono text-xs text-muted-foreground">
                          {m.next_service_due_date || "—"}
                        </AppTableCell>
                        <AppTableCell className="p-3.5 text-right">
                          <AppButton
                            variant="outline"
                            size="icon-sm"
                            title="Delete Record"
                            onClick={() => setDeleteTarget({
                              type: "maintenance",
                              id: m.id,
                              label: `Service record for ${m.vehicle_reg}`
                            })}
                            className="h-7 w-7 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </AppButton>
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
                        <AppTableRow key={trp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
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
                              {trp.status === "PLANNED" && (
                                <AppButton
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUpdateTripStatus(trp.id, "IN_PROGRESS")}
                                  className="h-7 text-xs px-2 text-emerald-600 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                >
                                  <Play className="h-3 w-3 mr-1" />
                                  Start
                                </AppButton>
                              )}
                              {trp.status === "IN_PROGRESS" && (
                                <AppButton
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUpdateTripStatus(trp.id, "COMPLETED")}
                                  className="h-7 text-xs px-2 text-blue-600 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                                >
                                  <Check className="h-3 w-3 mr-1" />
                                  Complete
                                </AppButton>
                              )}
                              <AppButton
                                variant="outline"
                                size="icon-sm"
                                title="Delete Trip"
                                onClick={() => setDeleteTarget({
                                  type: "trip",
                                  id: trp.id,
                                  label: `Trip for ${trp.traveler_name}`
                                })}
                                className="h-7 w-7 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
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
                        <AppTableRow key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
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
                            {item.vehicle ? (
                              <AppButton
                                variant="outline"
                                size="sm"
                                onClick={() => openEditVehicleModal(item.vehicle!)}
                                className="h-7 text-xs px-2.5"
                              >
                                <Edit2 className="h-3 w-3 mr-1" />
                                Renew Vehicle
                              </AppButton>
                            ) : item.driver ? (
                              <AppButton
                                variant="outline"
                                size="sm"
                                onClick={() => openEditDriverModal(item.driver!)}
                                className="h-7 text-xs px-2.5"
                              >
                                <Edit2 className="h-3 w-3 mr-1" />
                                Renew Driver
                              </AppButton>
                            ) : null}
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
      {/* PARTS & CONSUMABLES TAB */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === "parts" && (
        <div className="space-y-6">
          <AppCard className="border-border shadow-xs">
            <AppCardHeader className="bg-surface/50 pb-4 border-b border-border/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <AppCardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5 text-amber-500" />
                  <span>Parts & Consumables Inventory Catalog</span>
                </AppCardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Standardized replacement parts, lubricants, and workshop consumable intervals
                </p>
              </div>
              <AppButton
                variant="primary"
                size="sm"
                onClick={() => setIsAddMaintenanceOpen(true)}
                className="bg-theme-btn-primary hover:bg-theme-btn-primary-secondary text-white text-xs h-9 font-semibold gap-1.5 shadow-xs"
              >
                <Wrench className="h-4 w-4" />
                <span>Log Replacement</span>
              </AppButton>
            </AppCardHeader>
            <AppCardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { name: "Full Synthetic Engine Oil", code: "LUB-SYN-5W30", category: "Fluids", interval: "Every 10,000 km", status: "In Stock", stock: "45 Liters" },
                  { name: "All-Season Radial Tyres (R16)", code: "TYR-215-60R16", category: "Tyres", interval: "Every 45,000 km", status: "In Stock", stock: "8 Units" },
                  { name: "Ceramic Front Brake Pads", code: "BRK-PAD-OEM-F", category: "Braking", interval: "Every 20,000 km", status: "Low Stock", stock: "2 Sets" },
                  { name: "High-Crank AGM Battery 65Ah", code: "BAT-AGM-12V65", category: "Electrical", interval: "Every 36 Months", status: "In Stock", stock: "4 Units" },
                  { name: "OEM Engine Air Filter", code: "FLT-ENG-AIR-01", category: "Filters", interval: "Every 10,000 km", status: "In Stock", stock: "12 Units" },
                  { name: "Heavy Duty Glycol Coolant", code: "CLT-GLY-5050", category: "Fluids", interval: "Every 40,000 km", status: "In Stock", stock: "30 Liters" }
                ].map(part => (
                  <div key={part.code} className="p-4 rounded-xl border border-border/70 bg-surface space-y-3 shadow-2xs hover:border-theme-btn-primary/40 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider">{part.category}</span>
                        <h4 className="text-sm font-bold text-foreground mt-0.5">{part.name}</h4>
                        <span className="text-[11px] font-mono text-muted-foreground">{part.code}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        part.status === "In Stock" ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                      }`}>
                        {part.status}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Interval: <strong className="text-foreground">{part.interval}</strong></span>
                      <span className="font-mono font-semibold text-foreground">{part.stock}</span>
                    </div>
                  </div>
                ))}
              </div>
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
                  <div key={veh.id} className="p-4 rounded-xl border border-border/70 bg-surface space-y-3 shadow-2xs hover:border-theme-btn-primary/40 transition-colors">
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
              <AppButton variant="ghost" size="icon-sm" onClick={() => setIsEditVehicleOpen(false)}>
                <X className="h-4 w-4" />
              </AppButton>
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
                          <button
                            key={brand}
                            type="button"
                            onClick={() => {
                              setEditVehicleMake(brand);
                              const cfg = POPULAR_BRANDS[brand];
                              if (cfg) {
                                setEditVehicleCategory(cfg.category);
                                if (cfg.models.length > 0 && (!editVehicleModel || !cfg.models.includes(editVehicleModel))) {
                                  setEditVehicleModel(cfg.models[0]);
                                }
                              }
                            }}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium border transition-all cursor-pointer ${
                              isSelected
                                ? "bg-theme-btn-primary text-white border-theme-btn-primary shadow-xs font-semibold"
                                : "bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 border-border text-foreground hover:border-theme-btn-primary/40"
                            }`}
                          >
                            {brand}
                          </button>
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
                      onChange={(e) => setEditVehicleModel(e.target.value)} 
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
                            <button
                              key={m}
                              type="button"
                              onClick={() => {
                                setEditVehicleModel(m);
                                const cfg = POPULAR_BRANDS[editVehicleMake];
                                if (cfg?.category) setEditVehicleCategory(cfg.category);
                              }}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium border transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-theme-btn-primary text-white border-theme-btn-primary shadow-xs font-semibold"
                                  : "bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 border-border text-foreground hover:border-theme-btn-primary/40"
                              }`}
                            >
                              {m}
                            </button>
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
                      onChange={(e) => setEditVehicleFuel(e.target.value)}
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
                      placeholder="e.g. Saroj Landmark Realty LLP / Chandak Realtors Pvt. Ltd."
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
                      placeholder="e.g. +91 98200 45210"
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
                      placeholder="e.g. MBJAAA41VPA012345"
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
                      placeholder="e.g. 2GD1234567"
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
                      placeholder="e.g. MH-02 Mumbai Andheri RTO"
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1 flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Insurance Policy Number</span>
                    </label>
                    <AppInput 
                      value={editVehicleInsurancePolicy} 
                      onChange={(e) => setEditVehicleInsurancePolicy(e.target.value)} 
                      placeholder="e.g. 2311/61284792/00/000 (ICICI Lombard)"
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

              <div className="pt-4 border-t border-border flex items-center justify-end gap-2">
                <AppButton type="button" variant="ghost" onClick={() => setIsEditVehicleOpen(false)}>
                  Cancel
                </AppButton>
                <AppButton 
                  type="submit" 
                  disabled={modalSubmitting}
                  className="bg-theme-btn-primary hover:bg-theme-btn-primary-secondary text-white font-semibold gap-1.5"
                >
                  {modalSubmitting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  <span>Update Vehicle</span>
                </AppButton>
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
                    placeholder="e.g. Ramesh Kumar" 
                    value={newDriverName} 
                    onChange={(e) => setNewDriverName(e.target.value)} 
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Phone Number *</label>
                  <AppInput 
                    placeholder="e.g. +91 98200 12345" 
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
                    placeholder="e.g. MH02 20190012345" 
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
                    placeholder="3" 
                    value={newDriverExperience} 
                    onChange={(e) => setNewDriverExperience(Number(e.target.value))} 
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Emergency Contact</label>
                  <AppInput 
                    placeholder="e.g. Wife: 98111 22222" 
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
                  placeholder="e.g. Anand Mohta (Legal Team)" 
                  value={newTripTraveler} 
                  onChange={(e) => setNewTripTraveler(e.target.value)} 
                  required
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Purpose of Trip *</label>
                <AppInput 
                  placeholder="e.g. Site inspection & consultant review" 
                  value={newTripPurpose} 
                  onChange={(e) => setNewTripPurpose(e.target.value)} 
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Origin *</label>
                  <AppInput 
                    placeholder="e.g. Head Office, Andheri"
                    value={newTripOrigin} 
                    onChange={(e) => setNewTripOrigin(e.target.value)} 
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Destination *</label>
                  <AppInput 
                    placeholder="e.g. Stella Site, Goregaon" 
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
      {/* LOG MAINTENANCE MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {isAddMaintenanceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-border w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-border bg-surface/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/25">
                  <Wrench className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Log Maintenance Work</h3>
                  <p className="text-xs text-muted-foreground">Record service work or workshop repairs</p>
                </div>
              </div>
              <AppButton variant="ghost" size="icon-sm" onClick={() => setIsAddMaintenanceOpen(false)}>
                <X className="h-4 w-4" />
              </AppButton>
            </div>

            <form onSubmit={handleLogMaintenance} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div>
                <label className="font-semibold block mb-1">Select Vehicle *</label>
                <select 
                  value={newMaintVehicleId}
                  onChange={(e) => {
                    setNewMaintVehicleId(e.target.value);
                    const sel = vehicles.find(v => v.id === e.target.value);
                    if (sel) setNewMaintOdometer(sel.odometer_km);
                  }}
                  required
                  className="w-full h-9 rounded-lg border border-border bg-surface px-3 text-xs"
                >
                  <option value="">-- Choose Vehicle --</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.registration_number} - {v.make} {v.model}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Service / Repair Description *</label>
                <AppInput 
                  placeholder="e.g. 50K Scheduled Service & Engine Oil Replacement" 
                  value={newMaintServiceType} 
                  onChange={(e) => setNewMaintServiceType(e.target.value)} 
                  required
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Authorized Workshop / Service Center *</label>
                <AppInput 
                  placeholder="e.g. Lakozy Toyota Authorized Center, Andheri" 
                  value={newMaintVendor} 
                  onChange={(e) => setNewMaintVendor(e.target.value)} 
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Service Date</label>
                  <AppInput 
                    type="date"
                    value={newMaintDate} 
                    onChange={(e) => setNewMaintDate(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Next Service Due Date (Optional)</label>
                  <AppInput 
                    type="date"
                    value={newMaintNextDue} 
                    onChange={(e) => setNewMaintNextDue(e.target.value)} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Cost (₹)</label>
                  <AppInput 
                    type="number" 
                    placeholder="0"
                    value={newMaintCost} 
                    onChange={(e) => setNewMaintCost(Number(e.target.value))} 
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Odometer at Service (km)</label>
                  <AppInput 
                    type="number" 
                    placeholder="0"
                    value={newMaintOdometer} 
                    onChange={(e) => setNewMaintOdometer(Number(e.target.value))} 
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-border flex items-center justify-end gap-2">
                <AppButton type="button" variant="ghost" onClick={() => setIsAddMaintenanceOpen(false)}>
                  Cancel
                </AppButton>
                <AppButton 
                  type="submit" 
                  disabled={modalSubmitting}
                  className="bg-theme-btn-primary hover:bg-theme-btn-primary-secondary text-white font-semibold gap-1.5"
                >
                  {modalSubmitting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  <span>Save Record</span>
                </AppButton>
              </div>
            </form>
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
