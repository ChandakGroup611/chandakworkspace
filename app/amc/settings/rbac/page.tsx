import { redirect } from "next/navigation";

export default function AmcSettingsRbacRedirect() {
  redirect("/rbac?module=AMC");
}
