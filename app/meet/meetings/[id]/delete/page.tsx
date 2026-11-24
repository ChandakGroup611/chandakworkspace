import React from "react";
import { notFound } from "next/navigation";
import BackLink from "@/components/meet/BackLink";
import { getMeetingRefs } from "@/lib/actions/meet/delete-refs";
import MeetingDeleteClient from "./MeetingDeleteClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Delete meeting · Chandak Meet" };

export default async function DeleteMeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const refs = await getMeetingRefs(id);
  if (!refs.meeting) notFound();
  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-6">
      <div className="space-y-2 border-b border-border pb-4">
        <BackLink href={`/meet/meetings/${id}`} label="Back to the meeting" />
        <h1 className="text-[22px] font-bold text-heading">Delete "{refs.meeting.title}"</h1>
        <p className="text-[13.5px] text-muted">{refs.meeting.code} · Check what is linked to this meeting before it goes.</p>
      </div>
      <MeetingDeleteClient refs={refs} />
    </div>
  );
}
