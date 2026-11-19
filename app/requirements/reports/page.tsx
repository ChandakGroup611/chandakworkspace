import { checkServerPermission } from "@/lib/permissions";
import { PageContainer } from "@/components/layout/PageContainer";
import RequirementListViewClient from "@/components/requirements/RequirementListViewClient";
import { fetchRequirementAnalyticsData } from "@/lib/actions/requirements";
import { AccessRestricted } from "@/components/errors/AccessRestricted";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RequirementReportsPage() {
  const canAccess = await checkServerPermission("REQUIREMENTS_REPORTS_VIEW");
  if (!canAccess) {
    return (
      <AccessRestricted
        requiredRole="Requirement Manager"
        requiredPermission="REQUIREMENTS_REPORTS_VIEW"
        moduleName="Requirements"
      />
    );
  }

  const reqs = await fetchRequirementAnalyticsData();

  return (
    <PageContainer strict={true} className="p-6">
      <RequirementListViewClient initialReqs={reqs} />
    </PageContainer>
  );
}
