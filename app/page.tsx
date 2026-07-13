import React from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import LiveDashboardWrapper from "@/components/dashboard/LiveDashboardWrapper";
import { fetchLiveDashboardMetrics } from "@/lib/actions/dashboardMetrics";
import { PageContainer } from "@/components/layout/PageContainer";

export default async function Page() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from("user_master")
      .select("department_id, designation_id, manager_id, role_id")
      .eq("id", user.id)
      .single();
      
    if (profile) {
      // Check if standard onboarding fields are missing
      const isMissingOrgDetails = !profile.department_id || !profile.designation_id || !profile.manager_id;
      
      // If missing and they aren't a SUPER_ADMIN (admins can sometimes skip), redirect
      if (isMissingOrgDetails) {
        // Double check they aren't SUPER_ADMIN before forcing redirect
        const { data: role } = await supabase.from("roles").select("code").eq("id", profile.role_id).single();
        if (role?.code !== "SUPER_ADMIN" && role?.code !== "SYSTEM_ADMIN") {
          redirect("/profile?setup=true");
        }
      }
    }
  }

  // Fetch real aggregated production items from backend with RLS inherently applied
  const metricsResult = await fetchLiveDashboardMetrics();

  return (
    <PageContainer strict={false}>
      {/* Removed redundant PageHeader to reduce blank space */}
      <div className="flex-1 min-h-0 min-w-0 animate-in fade-in-50 duration-500 flex flex-col">
        <LiveDashboardWrapper 
          initialMetrics={metricsResult.data || []} 
          initialKpis={metricsResult.kpis || null}
          dbError={metricsResult.error || null} 
        />
      </div>
    </PageContainer>
  );
}
