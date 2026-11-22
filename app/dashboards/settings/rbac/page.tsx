import { redirect } from "next/navigation";

export default function DashboardsSettingsRbacRedirect() {
  redirect("/rbac?module=DASHBOARDS");
}
