import React from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import LiveDashboardWrapper from "@/components/dashboard/LiveDashboardWrapper";
import { PageContainer } from "@/components/layout/PageContainer";

export default async function Page() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/login");
  }

    const { data: profile } = await supabase
      .from("user_master")
      .select("department_id, designation_id, manager_id, role_id, is_deleted")
      .eq("id", user.id)
      .maybeSingle();
      
    if (!profile) {
      await supabase.auth.signOut();
      redirect("/login?error=not-registered");
    }

    if (profile?.is_deleted) {
      await supabase.auth.signOut();
      redirect("/login?error=account-deleted");
    }

    if (profile) {
      // Check if standard onboarding fields are missing
      const isMissingOrgDetails = !profile.department_id || !profile.designation_id || !profile.manager_id;
      
      // If missing and they aren't a SUPER_ADMIN (admins can sometimes skip), redirect
      if (isMissingOrgDetails) {
        // Double check they aren't SUPER_ADMIN before forcing redirect
        const { supabaseAdmin } = await import("@/lib/supabase/service_role");
        const { data: role } = await supabaseAdmin.from("roles").select("code").eq("id", profile.role_id).single();
        if (role?.code !== "SUPER_ADMIN") {
          redirect("/profile?setup=true");
        }
      }
    }

  // Render dashboard shell immediately to allow fast route transitions without blocking on heavy SSR aggregation
  return (
    <div className="flex-1 min-h-0 min-w-0 animate-in fade-in-50 duration-500 flex flex-col">
      <LiveDashboardWrapper 
        initialMetrics={[]} 
        initialKpis={null}
        initialMeta={null}
        dbError={null} 
      />
    </div>
  );
}
