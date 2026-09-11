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
  ExternalLink,
  ShieldCheck,
  Fuel
} from "lucide-react";
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
  createTripPlanAction,
  createServiceRecordAction,
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
    if (pathname.includes("/inventory")) return "inventory";
    if (pathname.includes("/trips")) return "trips";
    if (pathname.includes("/drivers")) return "drivers";
    if (pathname.includes("/maintenance")) return "maintenance";
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
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [isDispatchTripOpen, setIsDispatchTripOpen] = useState(false);
  const [isAddMaintenanceOpen, setIsAddMaintenanceOpen] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);

  // Form States — Add Vehicle
  const [newVehiclePlate, setNewVehiclePlate] = useState("");
  const [newVehicleMake, setNewVehicleMake] = useState("");
  const [newVehicleModel, setNewVehicleModel] = useState("");
  const [newVehicleVariant, setNewVehicleVariant] = useState("Standard");
  const [newVehicleCategory, setNewVehicleCategory] = useState("CAR");
  const [newVehicleOdometer, setNewVehicleOdometer] = useState<number>(0);
  const [newVehicleDriverId, setNewVehicleDriverId] = useState("");

  // Form States — Dispatch Trip
  const [newTripVehicleId, setNewTripVehicleId] = useState("");
  const [newTripDriverId, setNewTripDriverId] = useState("");
  const [newTripTraveler, setNewTripTraveler] = useState("");
  const [newTripPurpose, setNewTripPurpose] = useState("");
  const [newTripOrigin, setNewTripOrigin] = useState("Chandak Headquarters");
  const [newTripDestination, setNewTripDestination] = useState("");
  const [newTripStartTime, setNewTripStartTime] = useState("09:30");
  const [newTripEndTime, setNewTripEndTime] = useState("18:00");

  // Form States — Log Maintenance
  const [newMaintVehicleId, setNewMaintVehicleId] = useState("");
  const [newMaintServiceType, setNewMaintServiceType] = useState("");
  const [newMaintVendor, setNewMaintVendor] = useState("");
  const [newMaintCost, setNewMaintCost] = useState<number>(0);
  const [newMaintOdometer, setNewMaintOdometer] = useState<number>(0);

  // ----------------------------------------------------------------------------
  // Data Loaders (Module-local operations)
  // ----------------------------------------------------------------------------

  const loadAllData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);

      const [statsRes, vehiclesRes, driversRes, tripsRes, maintRes] = await Promise.all([
        fetchVehicleDashboardStats(),
        fetchVehiclesList({ pageSize: 50 }),
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

  // Temporary toast banner triggers
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
    }, 5000);
  };

  // ----------------------------------------------------------------------------
  // Form Submission Handlers
  // ----------------------------------------------------------------------------

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehiclePlate || !newVehicleMake || !newVehicleModel) {
      triggerToast("Registration plate, make, and model are required.", true);
      return;
    }

    setModalSubmitting(true);
    try {
      const res = await createVehicleAction({
        registration_number: newVehiclePlate,
        make: newVehicleMake,
        model: newVehicleModel,
        variant: newVehicleVariant,
        category: newVehicleCategory,
        odometer_km: Number(newVehicleOdometer) || 0,
        assigned_driver_id: newVehicleDriverId || undefined,
        status: "IN_STOCK"
      });

      if (res.success) {
        triggerToast(`Vehicle ${newVehiclePlate.toUpperCase()} added successfully!`);
        setIsAddVehicleOpen(false);
        // Reset form
        setNewVehiclePlate("");
        setNewVehicleMake("");
        setNewVehicleModel("");
        setNewVehicleVariant("Standard");
        setNewVehicleOdometer(0);
        setNewVehicleDriverId("");
        // Reload local data
        loadAllData(true);
      } else {
        triggerToast(res.error || "Failed to add vehicle", true);
      }
    } catch (err: any) {
      triggerToast(err.message || "Failed to add vehicle", true);
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleDispatchTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTripVehicleId || !newTripDriverId || !newTripTraveler || !newTripPurpose) {
      triggerToast("Please select a vehicle, driver, traveler name, and purpose.", true);
      return;
    }

    setModalSubmitting(true);
    try {
      const res = await createTripPlanAction({
        vehicle_id: newTripVehicleId,
        driver_id: newTripDriverId,
        traveler_name: newTripTraveler,
        purpose: newTripPurpose,
        origin: newTripOrigin,
        destination: newTripDestination,
        planned_start_time: newTripStartTime,
        planned_end_time: newTripEndTime
      });

      if (res.success) {
        triggerToast("Trip successfully dispatched!");
        setIsDispatchTripOpen(false);
        setNewTripTraveler("");
        setNewTripPurpose("");
        setNewTripDestination("");
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

  const handleLogMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMaintVehicleId || !newMaintServiceType || !newMaintVendor) {
      triggerToast("Vehicle, service type, and vendor are required.", true);
      return;
    }

    setModalSubmitting(true);
    try {
      const res = await createServiceRecordAction({
        vehicle_id: newMaintVehicleId,
        service_type: newMaintServiceType,
        service_center: newMaintVendor,
        cost: Number(newMaintCost) || 0,
        odometer_km: Number(newMaintOdometer) || 0
      });

      if (res.success) {
        triggerToast("Maintenance record logged successfully!");
        setIsAddMaintenanceOpen(false);
        setNewMaintServiceType("");
        setNewMaintVendor("");
        setNewMaintCost(0);
        setNewMaintOdometer(0);
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
  // Filtered Lists for Display
  // ----------------------------------------------------------------------------

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      const matchesSearch = 
        v.registration_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.make.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.assignedDriver?.full_name && v.assignedDriver.full_name.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = selectedStatus === "ALL" || v.status === selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [vehicles, searchQuery, selectedStatus]);

  if (loading) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center p-8 space-y-4">
        <ChandakLoader size="lg" />
        <p className="text-xs font-semibold uppercase tracking-widest text-muted animate-pulse">
          Loading Vehicle Fleet Records...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full flex-1 flex flex-col p-4 md:p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      
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
              <p className="text-xs text-muted mt-0.5">
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
            variant="outline"
            size="sm"
            onClick={() => router.push("/vehicle")}
            className={`text-xs h-9 ${activeTab === "dashboard" ? "bg-muted font-bold border-theme-btn-primary/40" : ""}`}
          >
            <LayoutDashboard className="h-4 w-4 mr-1.5" />
            Overview
          </AppButton>
          <AppButton
            variant="outline"
            size="sm"
            onClick={() => router.push("/vehicle/inventory")}
            className={`text-xs h-9 ${activeTab === "inventory" ? "bg-muted font-bold border-theme-btn-primary/40" : ""}`}
          >
            <Car className="h-4 w-4 mr-1.5" />
            Fleet ({stats.totalVehicles})
          </AppButton>
          <AppButton
            variant="outline"
            size="sm"
            onClick={() => router.push("/vehicle/trips")}
            className={`text-xs h-9 ${activeTab === "trips" ? "bg-muted font-bold border-theme-btn-primary/40" : ""}`}
          >
            <Calendar className="h-4 w-4 mr-1.5" />
            Trips ({stats.activeTrips})
          </AppButton>
          <AppButton
            variant="outline"
            size="sm"
            onClick={() => router.push("/vehicle/maintenance")}
            className={`text-xs h-9 ${activeTab === "maintenance" ? "bg-muted font-bold border-theme-btn-primary/40" : ""}`}
          >
            <Wrench className="h-4 w-4 mr-1.5" />
            Maintenance ({stats.inMaintenanceVehicles})
          </AppButton>

          {/* Action trigger button tailored to active tab */}
          {activeTab === "trips" ? (
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
              onClick={() => setIsAddVehicleOpen(true)}
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
              <p className="text-xs font-semibold text-muted">Total Fleet Master</p>
              <h3 className="text-2xl font-bold mt-1 text-foreground">{stats.totalVehicles}</h3>
              <span className="text-[10px] text-muted">Active in enterprise</span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20">
              <Car className="h-5 w-5" />
            </div>
          </AppCardContent>
        </AppCard>

        <AppCard className="border-border shadow-xs">
          <AppCardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted">On Active Route</p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{stats.onRouteVehicles}</h3>
              <span className="text-[10px] text-muted">Dispatched / in transit</span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
              <MapPin className="h-5 w-5" />
            </div>
          </AppCardContent>
        </AppCard>

        <AppCard className="border-border shadow-xs">
          <AppCardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted">Available at Depot</p>
              <h3 className="text-2xl font-bold mt-1 text-foreground">{stats.availableVehicles}</h3>
              <span className="text-[10px] text-muted">Ready for allocation</span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center border border-indigo-500/20">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </AppCardContent>
        </AppCard>

        <AppCard className="border-border shadow-xs">
          <AppCardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted">Under Maintenance</p>
              <h3 className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">{stats.inMaintenanceVehicles}</h3>
              <span className="text-[10px] text-muted">Active job cards</span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
              <Wrench className="h-5 w-5" />
            </div>
          </AppCardContent>
        </AppCard>
      </div>

      {/* Main Content Area */}
      <AppCard className="border-border shadow-xs overflow-hidden">
        <AppCardHeader className="bg-surface/50 pb-4 border-b border-border/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <AppCardTitle className="text-lg">
              {activeTab === "trips" ? "Daily Trip Dispatch Sheets" : activeTab === "maintenance" ? "Workshop Maintenance & Job Cards" : "Fleet Master Inventory"}
            </AppCardTitle>
            <p className="text-xs text-muted mt-0.5">
              {activeTab === "trips" 
                ? "Movement logs across Chandak corporate offices, development sites, and vendor locations" 
                : activeTab === "maintenance" 
                ? "Scheduled periodic services, repairs, and job card tracking" 
                : "Real-time records of all company-owned and executive fleet vehicles"}
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted pointer-events-none" />
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
              <option value="RESERVED">Reserved</option>
            </select>
          </div>
        </AppCardHeader>

        <AppCardContent className="p-0 overflow-x-auto">
          {activeTab === "trips" ? (
            /* TRIPS TABLE */
            <AppTableContainer className="rounded-none border-none">
              <AppTable className="w-full text-left text-xs">
                <AppTableHeader className="bg-muted/30 border-b border-border text-muted font-semibold">
                  <AppTableRow>
                    <AppTableHead className="p-3.5">Plan Date</AppTableHead>
                    <AppTableHead className="p-3.5">Vehicle</AppTableHead>
                    <AppTableHead className="p-3.5">Assigned Driver</AppTableHead>
                    <AppTableHead className="p-3.5">Traveler / Passenger</AppTableHead>
                    <AppTableHead className="p-3.5">Route (Origin ➔ Destination)</AppTableHead>
                    <AppTableHead className="p-3.5">Schedule</AppTableHead>
                    <AppTableHead className="p-3.5 text-center">Status</AppTableHead>
                  </AppTableRow>
                </AppTableHeader>
                <AppTableBody className="divide-y divide-border/60">
                  {trips.length === 0 ? (
                    <AppTableRow>
                      <AppTableCell colSpan={7} className="text-center py-12 text-muted">
                        No trips recorded yet. Click <strong>Dispatch Trip</strong> to schedule a trip sheet.
                      </AppTableCell>
                    </AppTableRow>
                  ) : (
                    trips.map((trp) => (
                      <AppTableRow key={trp.id} className="hover:bg-muted/10 transition-colors">
                        <AppTableCell className="p-3.5 font-mono text-muted">{trp.plan_date}</AppTableCell>
                        <AppTableCell className="p-3.5 font-bold text-foreground">{trp.vehicle_reg}</AppTableCell>
                        <AppTableCell className="p-3.5 text-muted">{trp.driver_name}</AppTableCell>
                        <AppTableCell className="p-3.5 font-semibold text-foreground">{trp.traveler_name}</AppTableCell>
                        <AppTableCell className="p-3.5 text-muted">
                          {trp.origin} ➔ {trp.destination}
                        </AppTableCell>
                        <AppTableCell className="p-3.5 text-muted">{trp.planned_start_time} - {trp.planned_end_time}</AppTableCell>
                        <AppTableCell className="p-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            trp.status === "IN_PROGRESS"
                              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                              : trp.status === "COMPLETED"
                              ? "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                              : "bg-muted text-muted"
                          }`}>
                            {trp.status}
                          </span>
                        </AppTableCell>
                      </AppTableRow>
                    ))
                  )}
                </AppTableBody>
              </AppTable>
            </AppTableContainer>
          ) : activeTab === "maintenance" ? (
            /* MAINTENANCE TABLE */
            <AppTableContainer className="rounded-none border-none">
              <AppTable className="w-full text-left text-xs">
                <AppTableHeader className="bg-muted/30 border-b border-border text-muted font-semibold">
                  <AppTableRow>
                    <AppTableHead className="p-3.5">Service Date</AppTableHead>
                    <AppTableHead className="p-3.5">Vehicle</AppTableHead>
                    <AppTableHead className="p-3.5">Service Details</AppTableHead>
                    <AppTableHead className="p-3.5">Authorized Vendor / Workshop</AppTableHead>
                    <AppTableHead className="p-3.5">Odometer</AppTableHead>
                    <AppTableHead className="p-3.5">Cost</AppTableHead>
                    <AppTableHead className="p-3.5 text-center">Next Due</AppTableHead>
                  </AppTableRow>
                </AppTableHeader>
                <AppTableBody className="divide-y divide-border/60">
                  {maintenance.length === 0 ? (
                    <AppTableRow>
                      <AppTableCell colSpan={7} className="text-center py-12 text-muted">
                        No maintenance records yet. Click <strong>Log Maintenance</strong> to record service work.
                      </AppTableCell>
                    </AppTableRow>
                  ) : (
                    maintenance.map((m) => (
                      <AppTableRow key={m.id} className="hover:bg-muted/10 transition-colors">
                        <AppTableCell className="p-3.5 font-mono text-muted">{m.service_date}</AppTableCell>
                        <AppTableCell className="p-3.5 font-bold text-foreground">{m.vehicle_reg}</AppTableCell>
                        <AppTableCell className="p-3.5 text-foreground max-w-xs">{m.service_type}</AppTableCell>
                        <AppTableCell className="p-3.5 text-muted">{m.service_center}</AppTableCell>
                        <AppTableCell className="p-3.5 font-mono text-muted">{m.odometer_km.toLocaleString()} km</AppTableCell>
                        <AppTableCell className="p-3.5 font-semibold text-foreground">₹{Number(m.cost).toLocaleString("en-IN")}</AppTableCell>
                        <AppTableCell className="p-3.5 text-center font-mono text-xs text-muted">
                          {m.next_service_due_date || "—"}
                        </AppTableCell>
                      </AppTableRow>
                    ))
                  )}
                </AppTableBody>
              </AppTable>
            </AppTableContainer>
          ) : (
            /* INVENTORY TABLE */
            <AppTableContainer className="rounded-none border-none">
              <AppTable className="w-full text-left text-xs">
                <AppTableHeader className="bg-muted/30 border-b border-border text-muted font-semibold">
                  <AppTableRow>
                    <AppTableHead className="p-3.5">Registration Plate</AppTableHead>
                    <AppTableHead className="p-3.5">Make & Model</AppTableHead>
                    <AppTableHead className="p-3.5">Category</AppTableHead>
                    <AppTableHead className="p-3.5">Assigned Driver</AppTableHead>
                    <AppTableHead className="p-3.5">Odometer Reading</AppTableHead>
                    <AppTableHead className="p-3.5 text-center">Status</AppTableHead>
                  </AppTableRow>
                </AppTableHeader>
                <AppTableBody className="divide-y divide-border/60">
                  {filteredVehicles.length === 0 ? (
                    <AppTableRow>
                      <AppTableCell colSpan={6} className="text-center py-12 text-muted">
                        No vehicles found matching filter criteria. Click <strong>Add Vehicle</strong> to enroll a new vehicle.
                      </AppTableCell>
                    </AppTableRow>
                  ) : (
                    filteredVehicles.map((veh) => (
                      <AppTableRow key={veh.id} className="hover:bg-muted/10 transition-colors">
                        <AppTableCell className="p-3.5 font-mono font-bold text-foreground">
                          <span className="px-2 py-1 rounded-md bg-muted/60 border border-border">
                            {veh.registration_number}
                          </span>
                        </AppTableCell>
                        <AppTableCell className="p-3.5 font-semibold text-foreground">
                          {veh.make} {veh.model} {veh.variant !== "Standard" ? `(${veh.variant})` : ""}
                        </AppTableCell>
                        <AppTableCell className="p-3.5 text-muted">{veh.category}</AppTableCell>
                        <AppTableCell className="p-3.5">
                          {veh.assignedDriver ? (
                            <div>
                              <div className="text-foreground font-semibold">{veh.assignedDriver.full_name}</div>
                              <div className="text-[10px] text-muted">{veh.assignedDriver.phone}</div>
                            </div>
                          ) : (
                            <span className="text-muted italic">Unassigned</span>
                          )}
                        </AppTableCell>
                        <AppTableCell className="p-3.5 font-mono text-muted">
                          {veh.odometer_km.toLocaleString()} km
                        </AppTableCell>
                        <AppTableCell className="p-3.5 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase inline-block ${
                            veh.status === "IN_STOCK"
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                              : veh.status === "IN_SERVICE"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                          }`}>
                            {veh.status === "IN_STOCK" ? "Available" : veh.status === "IN_SERVICE" ? "On Route" : veh.status}
                          </span>
                        </AppTableCell>
                      </AppTableRow>
                    ))
                  )}
                </AppTableBody>
              </AppTable>
            </AppTableContainer>
          )}
        </AppCardContent>
      </AppCard>

      {/* ---------------------------------------------------------------------- */}
      {/* ADD VEHICLE MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {isAddVehicleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-border bg-surface/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/25">
                  <Car className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Add Fleet Vehicle</h3>
                  <p className="text-xs text-muted">Register a new vehicle into the fleet master</p>
                </div>
              </div>
              <AppButton variant="ghost" size="icon-sm" onClick={() => setIsAddVehicleOpen(false)}>
                <X className="h-4 w-4" />
              </AppButton>
            </div>

            <form onSubmit={handleCreateVehicle} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div>
                <label className="font-semibold block mb-1">Registration Plate *</label>
                <AppInput 
                  placeholder="e.g. MH-02-FE-4281" 
                  value={newVehiclePlate} 
                  onChange={(e) => setNewVehiclePlate(e.target.value)} 
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Make (Brand) *</label>
                  <AppInput 
                    placeholder="e.g. Toyota" 
                    value={newVehicleMake} 
                    onChange={(e) => setNewVehicleMake(e.target.value)} 
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Model *</label>
                  <AppInput 
                    placeholder="e.g. Innova Hycross" 
                    value={newVehicleModel} 
                    onChange={(e) => setNewVehicleModel(e.target.value)} 
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Variant</label>
                  <AppInput 
                    placeholder="e.g. ZX (O) Hybrid" 
                    value={newVehicleVariant} 
                    onChange={(e) => setNewVehicleVariant(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Category</label>
                  <select 
                    value={newVehicleCategory}
                    onChange={(e) => setNewVehicleCategory(e.target.value)}
                    className="w-full h-9 rounded-lg border border-border bg-surface px-3 text-xs"
                  >
                    <option value="CAR">Car / SUV / Sedan</option>
                    <option value="BIKE">Motorbike / Scooter</option>
                    <option value="COMMERCIAL">Commercial Van / Shuttle</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Initial Odometer (km)</label>
                  <AppInput 
                    type="number"
                    placeholder="0" 
                    value={newVehicleOdometer} 
                    onChange={(e) => setNewVehicleOdometer(Number(e.target.value))} 
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Assign Driver (Optional)</label>
                  <select 
                    value={newVehicleDriverId}
                    onChange={(e) => setNewVehicleDriverId(e.target.value)}
                    className="w-full h-9 rounded-lg border border-border bg-surface px-3 text-xs"
                  >
                    <option value="">-- No Driver Assigned --</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>{d.full_name} ({d.phone})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-border flex items-center justify-end gap-2">
                <AppButton type="button" variant="ghost" onClick={() => setIsAddVehicleOpen(false)}>
                  Cancel
                </AppButton>
                <AppButton 
                  type="submit" 
                  disabled={modalSubmitting}
                  className="bg-theme-btn-primary hover:bg-theme-btn-primary-secondary text-white font-semibold gap-1.5"
                >
                  {modalSubmitting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  <span>Save Vehicle</span>
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
          <div className="bg-surface border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-border bg-surface/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/25">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Dispatch New Trip</h3>
                  <p className="text-xs text-muted">Schedule an executive movement or site shuttle</p>
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
                      <option key={v.id} value={v.id}>{v.registration_number} - {v.make} {v.model}</option>
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
                      <option key={d.id} value={d.id}>{d.full_name}</option>
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Start Time</label>
                  <AppInput 
                    type="time" 
                    value={newTripStartTime} 
                    onChange={(e) => setNewTripStartTime(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Estimated Return Time</label>
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
          <div className="bg-surface border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-border bg-surface/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/25">
                  <Wrench className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Log Maintenance Work</h3>
                  <p className="text-xs text-muted">Record service work or workshop repairs</p>
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
                  onChange={(e) => setNewMaintVehicleId(e.target.value)}
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
                  <label className="font-semibold block mb-1">Cost (₹)</label>
                  <AppInput 
                    type="number" 
                    placeholder="0"
                    value={newMaintCost} 
                    onChange={(e) => setNewMaintCost(Number(e.target.value))} 
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Current Odometer (km)</label>
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

    </div>
  );
}
