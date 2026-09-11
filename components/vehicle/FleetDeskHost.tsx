"use client";

import React, { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { App as FleetApp } from "@/vehicle/src/App";
import "@/vehicle/src/index.css";

const tabToRouteMap: Record<string, string> = {
  dashboard: "/vehicle",
  vehicles: "/vehicle/inventory",
  "daily-trips": "/vehicle/trips",
  drivers: "/vehicle/drivers",
  travelers: "/vehicle/travelers",
  maintenance: "/vehicle/maintenance",
  "parts-accessories": "/vehicle/parts",
  alerts: "/vehicle/alerts",
  reports: "/vehicle/reports",
  "my-garage": "/vehicle/my-garage",
  learning: "/vehicle/learning",
  settings: "/vehicle/settings"
};

export default function FleetDeskHost({ initialSlug }: { initialSlug?: string[] }) {
  const pathname = usePathname() || "/vehicle";
  const router = useRouter();

  // Resolve current active tab and optional vehicleId from pathname
  const { currentTab, vehicleId } = useMemo(() => {
    const parts = pathname.replace(/^\/vehicle\/?/, "").split("/").filter(Boolean);
    const subRoute = parts[0] || "";

    let tab = "dashboard";
    let id: string | null = null;

    switch (subRoute) {
      case "inventory":
        tab = "vehicles";
        if (parts[1]) id = parts[1];
        break;
      case "trips":
        tab = "daily-trips";
        break;
      case "drivers":
        tab = "drivers";
        break;
      case "travelers":
        tab = "travelers";
        break;
      case "maintenance":
        tab = "maintenance";
        break;
      case "parts":
        tab = "parts-accessories";
        break;
      case "alerts":
        tab = "alerts";
        break;
      case "reports":
        tab = "reports";
        break;
      case "my-garage":
        tab = "my-garage";
        break;
      case "learning":
        tab = "learning";
        break;
      case "settings":
        tab = "settings";
        break;
      default:
        tab = "dashboard";
        break;
    }

    return { currentTab: tab, vehicleId: id };
  }, [pathname]);

  const handleTabChange = (newTab: string) => {
    const targetRoute = tabToRouteMap[newTab] || "/vehicle";
    if (targetRoute !== pathname) {
      router.push(targetRoute);
    }
  };

  return (
    <div className="w-full h-full flex flex-col min-h-0 min-w-0 bg-[#0A0D14] text-foreground font-sans relative overflow-hidden">
      <FleetApp
        hideSidebar={true}
        initialTab={currentTab}
        initialVehicleId={vehicleId}
        onTabChange={handleTabChange}
      />
    </div>
  );
}
