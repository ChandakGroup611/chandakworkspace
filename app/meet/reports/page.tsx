import React from "react";
import { MeetHeader } from "@/components/meet/MeetHeader";
import ReportsClient from "./ReportsClient";
import { getMeetReports } from "@/lib/actions/meet/analytics";
import { getMoMVersions } from "@/lib/actions/meet/mom";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Reports & Analytics · Chandak Meet",
  description: "Enterprise meeting reports, carry-forward tracking, TAT compliance, and executive performance scorecards",
};

export default async function MeetReportsPage() {
  const [r1MoMs, r2Meetings, r3PendingPoints, r4CarryForward, r5TatCompliance, r6OwnerPerformance] =
    await Promise.all([
      getMoMVersions(),
      getMeetReports("R2"),
      getMeetReports("R3"),
      getMeetReports("R4"),
      getMeetReports("R5"),
      getMeetReports("R6"),
    ]);

  return (
    <div className="space-y-6">
      <MeetHeader
        title="Reports & Analytics Hub"
        description="Comprehensive audit registers, TAT SLAs, carry-forward ageing, and MoM distribution records"
        breadcrumbs={[{ label: "Reports" }]}
      />

      <ReportsClient
        initialReportData={{
          r1MoMs,
          r2Meetings,
          r3PendingPoints,
          r4CarryForward,
          r5TatCompliance,
          r6OwnerPerformance,
        }}
      />
    </div>
  );
}
