import React from "react";
import { MeetHeader } from "@/components/meet/MeetHeader";
import MeetAdminClient from "./MeetAdminClient";
import { getMeetingMasters, getMeetSettings } from "@/lib/actions/meet/masters";

export const metadata = {
  title: "Admin & Settings · Chandak Meet",
  description: "Configure meeting masters, types, rooms, templates, and statutory TAT working days SLA",
};

export default async function MeetAdminPage() {
  const [masters, settings] = await Promise.all([
    getMeetingMasters(),
    getMeetSettings(),
  ]);

  return (
    <div className="space-y-6">
      <MeetHeader
        title="Meet Admin & Master Controls"
        description="Global governance settings, room allocations, standing cadences, and statutory working day parameters"
        breadcrumbs={[{ label: "Meet Admin" }]}
      />

      <MeetAdminClient
        initialMasters={masters}
        initialSettings={settings}
      />
    </div>
  );
}
