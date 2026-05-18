import React from "react";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import DashboardCommandCenter from "@/components/dashboard/DashboardCommandCenter";

export default async function Page() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Safely pre-fetch real production items from backend storage
  const { data: todos, error } = await supabase.from("todos").select().limit(5);

  return (
    <div className="w-full animate-in fade-in-50 duration-500">
      <DashboardCommandCenter 
        initialTodos={todos || []} 
        dbError={error ? error.message : null} 
      />
    </div>
  );
}
