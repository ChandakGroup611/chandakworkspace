"use client";

import React from "react";
import DeleteRefsView from "@/components/meet/DeleteRefsView";
import { removeRef, deleteMeetingWithRefs, type MeetingRefs } from "@/lib/actions/meet/delete-refs";

export default function MeetingDeleteClient({ refs }: { refs: MeetingRefs }) {
  const id = refs.meeting!.id;
  const held = refs.sessions.filter((s) => s.status !== "scheduled" && s.status !== "cancelled").length;
  return (
    <DeleteRefsView
      what="Meeting"
      canDelete={refs.canDelete}
      doneHref="/meet/meetings"
      sections={[
        { key: "task", step: 1, title: "Tasks", hint: "Tasks created under this meeting's points.", items: refs.tasks, hrefBase: "/meet/tasks/", removeLabel: "Delete task", blocking: true },
        { key: "point", step: 2, title: "Points", hint: "Points raised in this meeting. A point can go once its tasks are gone.", items: refs.points, hrefBase: "/meet/points/", removeLabel: "Delete point", blocking: true },
        { key: "decision", step: 3, title: "Decisions", hint: "Decisions are withdrawn, not erased, so the register keeps the history.", items: refs.decisions, hrefBase: "/meet/decisions/", removeLabel: "Withdraw", blocking: false },
        { key: "session", step: 4, title: "Meeting dates", hint: "Upcoming dates are cancelled and their rooms freed. Dates already held keep their minutes in the history.", items: refs.sessions, hrefBase: "/meet/sessions/", removeLabel: "Remove date", blocking: false },
      ]}
      notes={[
        `${held} date${held === 1 ? " was" : "s were"} already held; their minutes stay in the history.`,
        refs.files ? `${refs.files} attached file${refs.files === 1 ? "" : "s"} stay in storage and in the history.` : "",
        refs.comments ? `${refs.comments} comment${refs.comments === 1 ? "" : "s"} stay in the history.` : "",
      ].filter(Boolean)}
      onRemove={(kind, rid, reason) => removeRef({ meetingId: id, kind: kind as any, id: rid, reason })}
      onDelete={(reason, removeAll) => deleteMeetingWithRefs({ meetingId: id, reason, removeAll })}
    />
  );
}
