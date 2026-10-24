import React from "react";
import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/auth/cached-user";
import { getUserAllowedModules } from "@/lib/actions/module-switcher";
import { 
  fetchVehicleDashboardStats, 
  fetchVehiclesList, 
  fetchDriversList, 
  fetchTripsList, 
  fetchMaintenanceList,
  fetchInsuranceVendorsListAction,
  fetchPurchaseVendorsListAction,
  fetchVehiclePartsList,
  fetchVehicleSalesListAction
} from "@/lib/actions/vehicle";
import { fetchMyFleetAccessAction } from "@/lib/actions/vehicleRbac";
import FleetDeskHost from "@/components/vehicle/FleetDeskHost";

export const metadata = {
  title: "Vehicle module | Chandak Workspace",
  description: "Enterprise fleet management, vehicle allocation, drivers, trip sheets & maintenance."
};

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug?: string[] }>;
}

export default async function VehicleModulePage({ params }: PageProps) {
  const { user } = await getCachedUser();

  if (!user) {
    redirect("/login?next=/vehicle");
  }

  // Verify module access
  const allowed = await getUserAllowedModules(user.id);
  const hasVehicleAccess = allowed.isAdmin || allowed.modules.length === 0 || allowed.modules.some(m => m.code === "VEHICLE_DESK");

  if (!hasVehicleAccess) {
    redirect("/select-module");
  }

  const resolvedParams = await params;
  const slug = resolvedParams.slug || [];
  const primaryTab = slug[0] || "dashboard";

  // Always load stats, fleet directory, and lightweight master lookups (insurance vendors, purchase vendors, drivers)
  // for instant dropdown population and driver linkage across all modules.
  // Large operational ledgers (trips, maintenance, parts, sales) are pre-fetched on direct route or on-demand.
  const [
    statsRes, 
    vehiclesRes, 
    driversRes, 
    tripsRes, 
    maintRes, 
    vendorsRes, 
    purchaseVendorsRes, 
    partsRes, 
    salesRes, 
    fleetAccessRes
  ] = await Promise.all([
    fetchVehicleDashboardStats().catch(() => ({ success: false, stats: undefined })),
    fetchVehiclesList({ pageSize: 50 }).catch(() => ({ success: false, vehicles: [] })),
    fetchDriversList().catch(() => ({ success: false, drivers: [] })),
    primaryTab === "trips" ? fetchTripsList().catch(() => ({ success: false, trips: [] })) : Promise.resolve(undefined),
    primaryTab === "maintenance" ? fetchMaintenanceList().catch(() => ({ success: false, records: [] })) : Promise.resolve(undefined),
    fetchInsuranceVendorsListAction().catch(() => ({ success: false, vendors: [] })),
    fetchPurchaseVendorsListAction().catch(() => ({ success: false, vendors: [] })),
    primaryTab === "parts" ? fetchVehiclePartsList().catch(() => ({ success: false, parts: [] })) : Promise.resolve(undefined),
    primaryTab === "sales" ? fetchVehicleSalesListAction().catch(() => ({ success: false, sales: [] })) : Promise.resolve(undefined),
    fetchMyFleetAccessAction().catch(() => ({ success: false, fleetAccess: null }))
  ]);

  return (
    <FleetDeskHost 
      initialSlug={slug} 
      initialStats={statsRes?.success ? statsRes.stats : undefined}
      initialVehicles={vehiclesRes?.success ? vehiclesRes.vehicles : undefined}
      initialDrivers={driversRes?.success ? driversRes.drivers : undefined}
      initialTrips={tripsRes?.success ? tripsRes.trips : undefined}
      initialMaintenance={maintRes?.success ? maintRes.records : undefined}
      initialVendors={vendorsRes?.success ? vendorsRes.vendors : undefined}
      initialPurchaseVendors={purchaseVendorsRes?.success ? purchaseVendorsRes.vendors : undefined}
      initialParts={partsRes?.success ? partsRes.parts : undefined}
      initialSales={salesRes?.success ? salesRes.sales : undefined}
      initialFleetAccess={fleetAccessRes?.success ? fleetAccessRes.fleetAccess : undefined}
    />
  );
}
