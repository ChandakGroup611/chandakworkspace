import React from "react";
import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/auth/cached-user";
import { getUserAllowedModules } from "@/lib/actions/module-switcher";
import { fetchVehicleDashboardStats, fetchVehiclesList } from "@/lib/actions/vehicle";
import FleetDeskHost from "@/components/vehicle/FleetDeskHost";

export const metadata = {
  title: "Vehicle Module | Chandak Workspace",
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

  // Server-side parallel pre-fetch for instant first paint
  const [statsRes, vehiclesRes] = await Promise.all([
    fetchVehicleDashboardStats().catch(() => ({ success: false, stats: undefined })),
    fetchVehiclesList({ pageSize: 100 }).catch(() => ({ success: false, vehicles: [] }))
  ]);

  return (
    <FleetDeskHost 
      initialSlug={slug} 
      initialStats={statsRes?.success ? statsRes.stats : undefined}
      initialVehicles={vehiclesRes?.success ? vehiclesRes.vehicles : undefined}
    />
  );
}
