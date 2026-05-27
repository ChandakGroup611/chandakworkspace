"use client";

import React, { useEffect, useState, useTransition } from "react";
import { createClient } from "@/utils/supabase/client";
import DashboardCommandCenter from "./DashboardCommandCenter";
import { fetchLiveDashboardMetrics } from "@/lib/actions/dashboardMetrics";

interface LiveDashboardWrapperProps {
  initialMetrics: any[];
  dbError: string | null;
}

export default function LiveDashboardWrapper({ initialMetrics, dbError }: LiveDashboardWrapperProps) {
  const [metrics, setMetrics] = useState<any[]>(initialMetrics || []);
  const [isPending, startTransition] = useTransition();
  const supabase = createClient();

  useEffect(() => {
    const handleRealtimeChange = () => {
      startTransition(async () => {
        const result = await fetchLiveDashboardMetrics();
        if (result.data) {
          setMetrics(result.data);
        }
      });
    };

    const tasksSub = supabase.channel("dashboard-tasks")
      .on("postgres_changes", { event: "*", schema: "public", table: "workspace_tasks" }, handleRealtimeChange).subscribe();
    
    const ticketsSub = supabase.channel("dashboard-tickets")
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, handleRealtimeChange).subscribe();
      
    const reqsSub = supabase.channel("dashboard-reqs")
      .on("postgres_changes", { event: "*", schema: "public", table: "requirements" }, handleRealtimeChange).subscribe();

    const workspacesSub = supabase.channel("dashboard-workspaces")
      .on("postgres_changes", { event: "*", schema: "public", table: "workspaces" }, handleRealtimeChange).subscribe();

    return () => {
      supabase.removeChannel(tasksSub);
      supabase.removeChannel(ticketsSub);
      supabase.removeChannel(reqsSub);
      supabase.removeChannel(workspacesSub);
    };
  }, [supabase]);

  return (
    <div className={isPending ? "opacity-70 transition-opacity" : "opacity-100 transition-opacity"}>
      <DashboardCommandCenter metrics={metrics} dbError={dbError} />
    </div>
  );
}
