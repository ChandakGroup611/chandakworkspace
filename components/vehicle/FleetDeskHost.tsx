"use client";

import React, { useState, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { 
  Car, 
  Calendar, 
  Users, 
  Wrench, 
  Package, 
  ShieldAlert, 
  LineChart, 
  LifeBuoy, 
  BookOpen, 
  Settings, 
  LayoutDashboard,
  Search,
  Filter,
  Plus,
  Fuel,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  MapPin,
  TrendingUp
} from "lucide-react";
import { AppCard, AppCardContent, AppCardHeader, AppCardTitle } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { 
  AppTableContainer, 
  AppTable, 
  AppTableHeader, 
  AppTableBody, 
  AppTableRow, 
  AppTableHead, 
  AppTableCell 
} from "@/components/ui/AppTable";

interface VehicleItem {
  id: string;
  regNumber: string;
  makeModel: string;
  type: "SUV" | "Sedan" | "Commercial Van" | "Pickup" | "Bus";
  assignedDriver: string;
  driverPhone: string;
  status: "Available" | "On Route" | "Under Maintenance" | "Reserved";
  currentLocation: string;
  fuelLevel: number;
  odometer: number;
  pucExpiry: string;
  insuranceExpiry: string;
}

interface TripItem {
  id: string;
  tripCode: string;
  vehicleReg: string;
  driverName: string;
  traveler: string;
  route: string;
  startTime: string;
  status: "In Progress" | "Completed" | "Scheduled" | "Cancelled";
  distanceKm: number;
}

interface MaintenanceRecord {
  id: string;
  jobCardId: string;
  vehicleReg: string;
  serviceType: string;
  vendor: string;
  cost: number;
  entryDate: string;
  status: "In Progress" | "Completed" | "Awaiting Parts";
}

const mockVehicles: VehicleItem[] = [
  {
    id: "v-01",
    regNumber: "MH-02-FE-4281",
    makeModel: "Toyota Innova Crysta 2.4 ZX",
    type: "SUV",
    assignedDriver: "Ramesh Pawar",
    driverPhone: "+91 98201 44521",
    status: "On Route",
    currentLocation: "Bandra Kurla Complex (BKC)",
    fuelLevel: 78,
    odometer: 48210,
    pucExpiry: "2026-12-15",
    insuranceExpiry: "2027-03-31"
  },
  {
    id: "v-02",
    regNumber: "MH-04-JN-1904",
    makeModel: "Mahindra Scorpio-N Z8",
    type: "SUV",
    assignedDriver: "Suresh Gaikwad",
    driverPhone: "+91 98334 11209",
    status: "Available",
    currentLocation: "Chandak Central Hub, Goregaon",
    fuelLevel: 92,
    odometer: 31400,
    pucExpiry: "2026-11-20",
    insuranceExpiry: "2027-01-14"
  },
  {
    id: "v-03",
    regNumber: "MH-02-CP-8832",
    makeModel: "Honda City 1.5 ZX CVT",
    type: "Sedan",
    assignedDriver: "Dinesh Shinde",
    driverPhone: "+91 97655 89211",
    status: "Under Maintenance",
    currentLocation: "Apex Authorized Workshop, Andheri",
    fuelLevel: 45,
    odometer: 64120,
    pucExpiry: "2026-10-05",
    insuranceExpiry: "2026-12-31"
  },
  {
    id: "v-04",
    regNumber: "MH-04-KZ-5502",
    makeModel: "Tata Winger 15-Seater Shuttle",
    type: "Bus",
    assignedDriver: "Mahesh Jadhav",
    driverPhone: "+91 99201 88401",
    status: "On Route",
    currentLocation: "Site Route: Stella ➔ Highscape City",
    fuelLevel: 62,
    odometer: 78950,
    pucExpiry: "2026-10-28",
    insuranceExpiry: "2027-02-15"
  },
  {
    id: "v-05",
    regNumber: "MH-01-DT-7719",
    makeModel: "Hyundai Creta SX(O)",
    type: "SUV",
    assignedDriver: "Vijay More",
    driverPhone: "+91 98190 22340",
    status: "Available",
    currentLocation: "Headquarters, Vile Parle",
    fuelLevel: 85,
    odometer: 22800,
    pucExpiry: "2027-04-10",
    insuranceExpiry: "2027-05-20"
  }
];

const mockTrips: TripItem[] = [
  {
    id: "trp-01",
    tripCode: "TRP-2026-0941",
    vehicleReg: "MH-02-FE-4281",
    driverName: "Ramesh Pawar",
    traveler: "Project Director (Chandak Stella)",
    route: "HQ Vile Parle ➔ BKC Site Office",
    startTime: "09:30 AM",
    status: "In Progress",
    distanceKm: 18.5
  },
  {
    id: "trp-02",
    tripCode: "TRP-2026-0940",
    vehicleReg: "MH-04-KZ-5502",
    driverName: "Mahesh Jadhav",
    traveler: "Staff Site Shuttle (Morning Shift)",
    route: "Goregaon Station ➔ Highscape City Site",
    startTime: "08:15 AM",
    status: "Completed",
    distanceKm: 34.0
  },
  {
    id: "trp-03",
    tripCode: "TRP-2026-0939",
    vehicleReg: "MH-01-DT-7719",
    driverName: "Vijay More",
    traveler: "Legal & Liaison Team",
    route: "HQ ➔ MCGM Headquarters, Fort",
    startTime: "11:00 AM",
    status: "Scheduled",
    distanceKm: 28.2
  }
];

const mockMaintenance: MaintenanceRecord[] = [
  {
    id: "m-01",
    jobCardId: "JC-8832-40K",
    vehicleReg: "MH-02-CP-8832",
    serviceType: "Periodic Scheduled 60K Service & Brake Pad Overhaul",
    vendor: "Apex Honda Care, Andheri",
    cost: 14200,
    entryDate: "2026-09-09",
    status: "In Progress"
  },
  {
    id: "m-02",
    jobCardId: "JC-4281-AC",
    vehicleReg: "MH-02-FE-4281",
    serviceType: "Cabin AC Filter Replacement & Disinfection",
    vendor: "Lakozy Toyota Workshop",
    cost: 4500,
    entryDate: "2026-08-25",
    status: "Completed"
  }
];

export default function FleetDeskHost({ initialSlug }: { initialSlug?: string[] }) {
  const pathname = usePathname() || "/vehicle";
  const router = useRouter();

  // Active sub-navigation tab based on URL
  const activeTab = useMemo(() => {
    if (pathname.includes("/inventory")) return "inventory";
    if (pathname.includes("/trips")) return "trips";
    if (pathname.includes("/drivers")) return "drivers";
    if (pathname.includes("/maintenance")) return "maintenance";
    if (pathname.includes("/parts")) return "parts";
    if (pathname.includes("/alerts")) return "alerts";
    return "dashboard";
  }, [pathname]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  const filteredVehicles = useMemo(() => {
    return mockVehicles.filter(v => {
      const matchesSearch = 
        v.regNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.makeModel.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.assignedDriver.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = selectedStatus === "ALL" || v.status === selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, selectedStatus]);

  const stats = useMemo(() => {
    const total = mockVehicles.length;
    const available = mockVehicles.filter(v => v.status === "Available").length;
    const onRoute = mockVehicles.filter(v => v.status === "On Route").length;
    const inService = mockVehicles.filter(v => v.status === "Under Maintenance").length;
    return { total, available, onRoute, inService };
  }, []);

  return (
    <div className="w-full flex-1 flex flex-col p-4 md:p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center border border-emerald-500/25">
              <Car className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Vehicle Module
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Central fleet management, driver rosters, real-time trip sheets & maintenance tracking
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
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
            Inventory ({stats.total})
          </AppButton>
          <AppButton
            variant="outline"
            size="sm"
            onClick={() => router.push("/vehicle/trips")}
            className={`text-xs h-9 ${activeTab === "trips" ? "bg-muted font-bold border-theme-btn-primary/40" : ""}`}
          >
            <Calendar className="h-4 w-4 mr-1.5" />
            Trip Sheets
          </AppButton>
          <AppButton
            variant="outline"
            size="sm"
            onClick={() => router.push("/vehicle/maintenance")}
            className={`text-xs h-9 ${activeTab === "maintenance" ? "bg-muted font-bold border-theme-btn-primary/40" : ""}`}
          >
            <Wrench className="h-4 w-4 mr-1.5" />
            Maintenance ({stats.inService})
          </AppButton>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AppCard className="border-border shadow-xs">
          <AppCardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Vehicles</p>
              <h3 className="text-2xl font-bold mt-1 text-foreground">{stats.total}</h3>
              <span className="text-[10px] text-muted-foreground">100% compliant RTO</span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20">
              <Car className="h-5 w-5" />
            </div>
          </AppCardContent>
        </AppCard>

        <AppCard className="border-border shadow-xs">
          <AppCardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">On Active Route</p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{stats.onRoute}</h3>
              <span className="text-[10px] text-muted-foreground">Real-time GPS active</span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
              <MapPin className="h-5 w-5" />
            </div>
          </AppCardContent>
        </AppCard>

        <AppCard className="border-border shadow-xs">
          <AppCardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Available for Dispatch</p>
              <h3 className="text-2xl font-bold mt-1 text-foreground">{stats.available}</h3>
              <span className="text-[10px] text-muted-foreground">At corporate hubs</span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center border border-indigo-500/20">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </AppCardContent>
        </AppCard>

        <AppCard className="border-border shadow-xs">
          <AppCardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Under Maintenance</p>
              <h3 className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">{stats.inService}</h3>
              <span className="text-[10px] text-muted-foreground">Active job cards</span>
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
              {activeTab === "trips" ? "Daily Trip Logs" : activeTab === "maintenance" ? "Maintenance & Job Cards" : "Fleet Master Registry"}
            </AppCardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {activeTab === "trips" ? "Operational movement tracking across corporate and site locations" : "Complete inventory of company-owned and leased executive fleet"}
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search vehicle, driver..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:border-theme-btn-primary"
              />
            </div>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs py-1.5 px-2.5 rounded-lg border border-border bg-background focus:outline-none focus:border-theme-btn-primary"
            >
              <option value="ALL">All Status</option>
              <option value="Available">Available</option>
              <option value="On Route">On Route</option>
              <option value="Under Maintenance">Maintenance</option>
            </select>
          </div>
        </AppCardHeader>

        <AppCardContent className="p-0 overflow-x-auto">
          {activeTab === "trips" ? (
            /* TRIPS TABLE */
            <AppTableContainer>
              <AppTable className="w-full text-left text-xs">
                <AppTableHeader className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
                  <AppTableRow>
                    <AppTableHead className="p-3.5">Trip Code</AppTableHead>
                    <AppTableHead className="p-3.5">Vehicle</AppTableHead>
                    <AppTableHead className="p-3.5">Assigned Driver</AppTableHead>
                    <AppTableHead className="p-3.5">Passenger / Department</AppTableHead>
                    <AppTableHead className="p-3.5">Route</AppTableHead>
                    <AppTableHead className="p-3.5">Start Time</AppTableHead>
                    <AppTableHead className="p-3.5 text-center">Status</AppTableHead>
                  </AppTableRow>
                </AppTableHeader>
                <AppTableBody className="divide-y divide-border/60">
                  {mockTrips.map((trp) => (
                    <AppTableRow key={trp.id} className="hover:bg-muted/20 transition-colors">
                      <AppTableCell className="p-3.5 font-mono font-bold text-foreground">{trp.tripCode}</AppTableCell>
                      <AppTableCell className="p-3.5 font-semibold text-foreground">{trp.vehicleReg}</AppTableCell>
                      <AppTableCell className="p-3.5 text-muted-foreground">{trp.driverName}</AppTableCell>
                      <AppTableCell className="p-3.5 text-foreground">{trp.traveler}</AppTableCell>
                      <AppTableCell className="p-3.5 text-muted-foreground">{trp.route}</AppTableCell>
                      <AppTableCell className="p-3.5 text-muted-foreground">{trp.startTime}</AppTableCell>
                      <AppTableCell className="p-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          trp.status === "In Progress"
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                            : trp.status === "Completed"
                            ? "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {trp.status}
                        </span>
                      </AppTableCell>
                    </AppTableRow>
                  ))}
                </AppTableBody>
              </AppTable>
            </AppTableContainer>
          ) : activeTab === "maintenance" ? (
            /* MAINTENANCE TABLE */
            <AppTableContainer>
              <AppTable className="w-full text-left text-xs">
                <AppTableHeader className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
                  <AppTableRow>
                    <AppTableHead className="p-3.5">Job Card</AppTableHead>
                    <AppTableHead className="p-3.5">Vehicle</AppTableHead>
                    <AppTableHead className="p-3.5">Work / Service Details</AppTableHead>
                    <AppTableHead className="p-3.5">Authorized Vendor</AppTableHead>
                    <AppTableHead className="p-3.5">Estimated Cost</AppTableHead>
                    <AppTableHead className="p-3.5">Date</AppTableHead>
                    <AppTableHead className="p-3.5 text-center">Status</AppTableHead>
                  </AppTableRow>
                </AppTableHeader>
                <AppTableBody className="divide-y divide-border/60">
                  {mockMaintenance.map((m) => (
                    <AppTableRow key={m.id} className="hover:bg-muted/20 transition-colors">
                      <AppTableCell className="p-3.5 font-mono font-bold text-foreground">{m.jobCardId}</AppTableCell>
                      <AppTableCell className="p-3.5 font-semibold text-foreground">{m.vehicleReg}</AppTableCell>
                      <AppTableCell className="p-3.5 text-foreground max-w-xs">{m.serviceType}</AppTableCell>
                      <AppTableCell className="p-3.5 text-muted-foreground">{m.vendor}</AppTableCell>
                      <AppTableCell className="p-3.5 font-semibold">₹{m.cost.toLocaleString("en-IN")}</AppTableCell>
                      <AppTableCell className="p-3.5 text-muted-foreground">{m.entryDate}</AppTableCell>
                      <AppTableCell className="p-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          m.status === "Completed"
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                        }`}>
                          {m.status}
                        </span>
                      </AppTableCell>
                    </AppTableRow>
                  ))}
                </AppTableBody>
              </AppTable>
            </AppTableContainer>
          ) : (
            /* INVENTORY TABLE */
            <AppTableContainer>
              <AppTable className="w-full text-left text-xs">
                <AppTableHeader className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
                  <AppTableRow>
                    <AppTableHead className="p-3.5">Registration</AppTableHead>
                    <AppTableHead className="p-3.5">Make & Model</AppTableHead>
                    <AppTableHead className="p-3.5">Type</AppTableHead>
                    <AppTableHead className="p-3.5">Assigned Driver</AppTableHead>
                    <AppTableHead className="p-3.5">Current Location</AppTableHead>
                    <AppTableHead className="p-3.5">Odometer</AppTableHead>
                    <AppTableHead className="p-3.5 text-center">Status</AppTableHead>
                  </AppTableRow>
                </AppTableHeader>
                <AppTableBody className="divide-y divide-border/60">
                  {filteredVehicles.map((veh) => (
                    <AppTableRow key={veh.id} className="hover:bg-muted/20 transition-colors">
                      <AppTableCell className="p-3.5 font-mono font-bold text-foreground">
                        <span className="px-2 py-1 rounded bg-muted/60 border border-border/80">
                          {veh.regNumber}
                        </span>
                      </AppTableCell>
                      <AppTableCell className="p-3.5 font-semibold text-foreground">{veh.makeModel}</AppTableCell>
                      <AppTableCell className="p-3.5 text-muted-foreground">{veh.type}</AppTableCell>
                      <AppTableCell className="p-3.5">
                        <div className="text-foreground font-medium">{veh.assignedDriver}</div>
                        <div className="text-[10px] text-muted-foreground">{veh.driverPhone}</div>
                      </AppTableCell>
                      <AppTableCell className="p-3.5 text-muted-foreground flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span>{veh.currentLocation}</span>
                      </AppTableCell>
                      <AppTableCell className="p-3.5 font-mono text-muted-foreground">{veh.odometer.toLocaleString()} km</AppTableCell>
                      <AppTableCell className="p-3.5 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase inline-block ${
                          veh.status === "Available"
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                            : veh.status === "On Route"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                        }`}>
                          {veh.status}
                        </span>
                      </AppTableCell>
                    </AppTableRow>
                  ))}
                </AppTableBody>
              </AppTable>
            </AppTableContainer>
          )}
        </AppCardContent>
      </AppCard>
    </div>
  );
}
