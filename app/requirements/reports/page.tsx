import { checkServerPermission } from "@/lib/permissions";
import { PageContainer } from "@/components/layout/PageContainer";
import RequirementListViewClient from "@/components/requirements/RequirementListViewClient";
import { fetchRequirementAnalyticsData } from "@/lib/actions/requirements";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RequirementReportsPage() {
  const canAccess = await checkServerPermission("REQUIREMENTS_REPORTS_VIEW");
  if (!canAccess) {
    return (
      <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center p-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-red-500">Access Denied</h2>
          <p className="text-gray-500">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  const reqs = await fetchRequirementAnalyticsData();

  return (
    <PageContainer strict={true} className="p-6">
      <RequirementListViewClient initialReqs={reqs} />
    </PageContainer>
  );
}
