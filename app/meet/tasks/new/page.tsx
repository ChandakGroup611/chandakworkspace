import React from "react";
import BackLink from "@/components/meet/BackLink";
import { getNewTaskFormData } from "@/lib/actions/meet/task-new";
import NewTaskForm from "./NewTaskForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "New task · Chandak Meet" };

export default async function NewMeetTaskPage({ searchParams }: { searchParams: Promise<{ point?: string; session?: string; back?: string }> }) {
  const sp = await searchParams;
  const data = await getNewTaskFormData(sp.point);
  const back = sp.back && sp.back.startsWith("/meet") ? sp.back : "/meet/tasks";
  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-6">
      <div className="space-y-2 border-b border-border pb-4">
        <BackLink href={back} label="Back" />
        <h1 className="text-[20px] sm:text-[22px] font-semibold tracking-[-0.01em] text-heading">New task</h1>
        <p className="text-[13.5px] text-muted">
          A Chandak Meet task: an action someone has to complete, usually agreed in a meeting. It is tracked here in Chandak Meet (Tasks list, minutes, reminders), separately from Workspace tasks.
        </p>
      </div>
      <NewTaskForm data={data} sessionId={sp.session} back={back} />
    </div>
  );
}
