import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getTaskDetail } from "@/lib/actions/meet/task-detail";
import { getMeetingMasters } from "@/lib/actions/meet/masters";
import BackLink from "@/components/meet/BackLink";
import TaskDetailClient from "./TaskDetailClient";
import SubtasksPanel from "@/components/meet/SubtasksPanel";
import CommentsPanel from "@/components/meet/CommentsPanel";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await getTaskDetail(id);
  return { title: d ? `${d.task.code} ${d.task.title} · Chandak Meet` : "Task · Chandak Meet" };
}

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [d, masters] = await Promise.all([getTaskDetail(id), getMeetingMasters()]);
  if (!d) notFound();
  return (
    <div className="space-y-5 pb-6">
      <div className="space-y-2 border-b border-border pb-4">
        <BackLink href="/meet/tasks" label="Tasks" />
        {d.task.parent_task_id && <Link href={`/meet/tasks/${d.task.parent_task_id}`} className="ml-3 text-[13px] font-medium text-primary hover:underline">Main task</Link>}
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-[15px] font-semibold text-muted">{d.task.code}</span>
          <h1 className="text-[22px] font-bold tracking-[-0.01em] text-heading">{d.task.title}</h1>
        </div>
        <p className="text-[13.5px] text-subtle">
          {d.point ? (
            <>Under point <Link href={`/meet/points/${d.point.id}`} className="font-semibold text-primary hover:underline">{d.point.code} {d.point.title}</Link></>
          ) : (
            "Not linked to a point"
          )}
          {d.meeting ? (
            <> · Meeting <Link href={`/meet/meetings/${d.meeting.id}`} className="font-semibold text-primary hover:underline">{d.meeting.code ? `${d.meeting.code} ` : ""}{d.meeting.title}</Link></>
          ) : null}
        </p>
      </div>
      <TaskDetailClient detail={d} users={masters.users as any} />
      <div className="grid gap-5 lg:grid-cols-2">
        {!d.task.parent_task_id && <SubtasksPanel taskId={d.task.id} canAdd={d.canEdit} />}
        <CommentsPanel entityType="task" entityId={d.task.id} />
      </div>
    </div>
  );
}
