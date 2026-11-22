import { redirect } from "next/navigation";

export default function BudgetRbacRedirect() {
  redirect("/budget/admin/access");
}
