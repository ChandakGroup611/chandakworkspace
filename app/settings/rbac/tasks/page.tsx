import { redirect } from "next/navigation";

export default function TasksSettingsRbacRedirect() {
  redirect("/rbac?module=TASK_WORKFLOW");
}
