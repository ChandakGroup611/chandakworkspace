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
  fetchVehiclePartsList
} from "@/lib/actions/vehicle";
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

  // Route-aware pre-fetch: Always load stats and fleet directory for instant shell & metrics.
  // Specialized domain datasets are loaded when deep-linking to that route or on-demand via sub-tab click.
  const [
    statsRes, 
    vehiclesRes, 
    driversRes, 
    tripsRes, 
    maintRes,
    vendorsRes,
    purchaseVendorsRes,
    partsRes
  ] = await Promise.all([
    fetchVehicleDashboardStats().catch(() => ({ success: false, stats: undefined })),
    fetchVehiclesList({ pageSize: 50 }).catch(() => ({ success: false, vehicles: [] })),
    primaryTab === "drivers" ? fetchDriversList().catch(() => ({ success: false, drivers: [] })) : Promise.resolve(undefined),
    primaryTab === "trips" ? fetchTripsList().catch(() => ({ success: false, trips: [] })) : Promise.resolve(undefined),
    primaryTab === "maintenance" ? fetchMaintenanceList().catch(() => ({ success: false, records: [] })) : Promise.resolve(undefined),
    primaryTab === "vendors" ? fetchInsuranceVendorsListAction().catch(() => ({ success: false, vendors: [] })) : Promise.resolve(undefined),
    (primaryTab === "register" || primaryTab === "new") ? fetchPurchaseVendorsListAction().catch(() => ({ success: false, vendors: [] })) : Promise.resolve(undefined),
    primaryTab === "parts" ? fetchVehiclePartsList().catch(() => ({ success: false, parts: [] })) : Promise.resolve(undefined)
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
    />
  );
}
