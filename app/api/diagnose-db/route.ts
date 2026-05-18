import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized. Please log in first." }, { status: 401 });
  }

  // 1. Fetch recent activity logs
  const { data: activityLogs, error: activityError } = await supabase
    .from("task_activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  // 2. Fetch recent audit logs
  const { data: auditLogs, error: auditError } = await supabase
    .from("task_audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  // 3. Fetch recent notifications
  const { data: notifications, error: notifError } = await supabase
    .from("task_notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  return NextResponse.json({
    user: {
      id: userData.user.id,
      email: userData.user.email
    },
    activityLogs,
    activityError,
    auditLogs,
    auditError,
    notifications,
    notifError
  });
}
