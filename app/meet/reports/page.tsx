import React from "react";
import { MeetHeader } from "@/components/meet/MeetHeader";
import ReportsClient from "./ReportsClient";
import { getMeetReports } from "@/lib/actions/meet/analytics";
import { getMoMVersions } from "@/lib/actions/meet/mom";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Reports · Chandak Meet",
  description: "Chandak Meet reports",
};

export default async function MeetReportsPage() {
  const [r1MoMs, r2Meetings, r3PendingPoints, r4CarryForward, r5TatCompliance, r6OwnerPerformance, r7Invites] =
    await Promise.all([
      getMoMVersions(),
      getMeetReports("R2"),
      getMeetReports("R3"),
      getMeetReports("R4"),
      getMeetReports("R5"),
      getMeetReports("R6"),
      getMeetReports("R7"),
    ]);

  return (
    <div className="space-y-6">
      <MeetHeader
        title="Reports"
        description="Minutes, meetings, open and carried points, tasks on time, owners, and who replied to and attended each meeting."
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
          r7Invites,
        }}
      />
    </div>
  );
}
