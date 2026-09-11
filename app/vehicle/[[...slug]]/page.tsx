import React from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCachedUser } from "@/lib/auth/cached-user";
import { getUserAllowedModules } from "@/lib/actions/module-switcher";
import FleetDeskHost from "@/components/vehicle/FleetDeskHost";

export const metadata = {
  title: "Vehicle Module | Chandak Workspace",
  description: "Enterprise fleet management, vehicle allocation, drivers, trip sheets & maintenance."
};

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
  const hasVehicleAccess = allowed.isAdmin || allowed.modules.some(m => m.code === "VEHICLE_DESK");

  if (!hasVehicleAccess) {
    redirect("/select-module");
  }

  // Ensure active_module cookie is set to VEHICLE_DESK
  const cookieStore = await cookies();
  const currentCookie = cookieStore.get("active_module")?.value;
  if (currentCookie !== "VEHICLE_DESK") {
    cookieStore.set("active_module", "VEHICLE_DESK", {
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
      httpOnly: false
    });
  }

  const resolvedParams = await params;
  const slug = resolvedParams.slug || [];

  return <FleetDeskHost initialSlug={slug} />;
}
