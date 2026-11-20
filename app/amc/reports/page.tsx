import Link from "next/link";
import { ArrowLeft, FileBarChart } from "lucide-react";
import { checkServerPermission } from "@/lib/permissions";
import { AccessRestricted } from "@/components/errors/AccessRestricted";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import AMCReportsClient from "@/components/amc/AMCReportsClient";

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
    <PageContainer strict={true}>
      <PageHeader
        title="AMC & subscription reports"
        description="Contracts, invoices, renewals, add-ons and license allocations, with filters, column choice and Excel / PDF export."
        icon={<FileBarChart className="h-6 w-6" />}
        breadcrumbs={[{ label: "AMC and subscriptions", href: "/amc" }, { label: "Reports" }]}
        actions={
          <Link
            href="/amc"
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-surface-hover"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to contracts
          </Link>
        }
      />
      <AMCReportsClient />
    </PageContainer>
  );
}
