import { checkServerPermission } from "@/lib/permissions";
import { AccessRestricted } from "@/components/errors/AccessRestricted";
import AMCReportsClient from "@/components/amc/AMCReportsClient";
import { AMCShell } from "@/components/amc/AMCShell";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * The single report page for AMC & subscriptions: contracts register, invoices & payments,
 * renewals, add-on transactions and license allocations, with filters, column choice and
 * Excel / PDF export.
 */
export default async function AMCReportsPage() {
  const canView =
    (await checkServerPermission("SUPER_ADMIN")) ||
    (await checkServerPermission("AMC_VIEW")) ||
    (await checkServerPermission("AMC_MANAGE"));

  if (!canView) {
    return (
      <AccessRestricted
        requiredRole="AMC Manager"
        requiredPermission="AMC_VIEW"
        moduleName="AMC Reports"
      />
    );
  }

  return (
    <AMCShell
      title="Reports"
      description="Contracts register, invoices, renewals, add-ons and license allocations, with filters, column choice and Excel / PDF export."
      breadcrumbs={[{ label: "AMC & Subscriptions", href: "/amc" }, { label: "Reports" }]}
      showNew={false}
    >
      <AMCReportsClient />
    </AMCShell>
  );
}
