import { PageContainer } from "@/components/layout/PageContainer";
import RequirementListViewClient from "@/components/requirements/RequirementListViewClient";
import { fetchRequirementAnalyticsData } from "@/lib/actions/requirements";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RequirementReportsPage() {
  const reqs = await fetchRequirementAnalyticsData();

  return (
    <PageContainer strict={true} className="p-6">
      <RequirementListViewClient initialReqs={reqs} />
    </PageContainer>
  );
}
