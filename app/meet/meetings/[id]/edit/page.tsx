import React from "react";
import { notFound } from "next/navigation";
import { getMeetingById } from "@/lib/actions/meet/meetings";
import { getMeetingMasters } from "@/lib/actions/meet/masters";
import { MeetHeader } from "@/components/meet/MeetHeader";
import CreateMeetingClientForm from "../../new/CreateMeetingClientForm";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const meeting = await getMeetingById(id);
  return { title: meeting ? `Edit · ${meeting.title} · Chandak Meet` : "Edit meeting series · Chandak Meet" };
}

// Record standard: edit uses the same form the series was created with, pre-filled.
export default async function EditMeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [meeting, masters] = await Promise.all([getMeetingById(id), getMeetingMasters()]);
  if (!meeting) notFound();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <MeetHeader
        title={`Edit · ${meeting.title}`}
        description="Same form as when the series was scheduled. Changes apply to future sessions."
        breadcrumbs={[
          { label: "Meeting Series", href: "/meet/meetings" },
          { label: meeting.code, href: `/meet/meetings/${meeting.id}?tab=details` },
          { label: "Edit" },
        ]}
      />
      <CreateMeetingClientForm masters={masters} recordMode="edit" meeting={meeting} />
    </div>
  );
}
