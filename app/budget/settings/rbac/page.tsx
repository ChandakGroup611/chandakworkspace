import { redirect } from "next/navigation";

export default function BudgetSettingsRbacRedirect() {
  redirect("/budget/admin/access");
}
