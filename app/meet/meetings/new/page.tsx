import React from "react";
import { getMeetingMasters } from "@/lib/actions/meet/masters";
import { MeetHeader } from "@/components/meet/MeetHeader";
import CreateMeetingClientForm from "./CreateMeetingClientForm";

export const metadata = {
  title: "Schedule Meeting Series · Chandak Meet",
  description: "Configure a recurring review series with template agendas and standing attendees",
};

export default async function NewMeetingPage() {
  const masters = await getMeetingMasters();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <MeetHeader
        title="Schedule New Meeting Series"
        description="Configure recurring review rules, standing attendees, and time-boxed agendas"
        breadcrumbs={[
          { label: "Meeting Series", href: "/meet/meetings" },
          { label: "Schedule New" },
        ]}
      />

      <CreateMeetingClientForm masters={masters} />
    </div>
  );
}
