"use client";

import React from "react";
import DeleteRefsView from "@/components/meet/DeleteRefsView";
import { deletePointWithRefs, type PointRefs } from "@/lib/actions/meet/delete-refs";

export default function PointDeleteClient({ refs }: { refs: PointRefs }) {
  const p = refs.point!;
  return (
    <DeleteRefsView
      what="Point"
      canDelete={refs.canDelete}
      doneHref={`/meet/meetings/${p.meetingId}?tab=points`}
      sections={[
        { key: "task", step: 1, title: "Tasks", hint: "Tasks under this point (and their subtasks).", items: refs.tasks, hrefBase: "/meet/tasks/", removeLabel: "Delete task", blocking: true },
        { key: "decision", step: 2, title: "Decisions", hint: "Decisions about this point are withdrawn, not erased.", items: refs.decisions, hrefBase: "/meet/decisions/", removeLabel: "Withdraw", blocking: false },
      ]}
      notes={[`The point appears in ${refs.sessions} meeting date${refs.sessions === 1 ? "" : "s"}; those minutes keep it in the history.`]}
      onRemove={(kind, id, reason) => deletePointWithRefs({ pointId: p.id, reason, removeAll: false, only: { kind: kind as any, id } })}
      onDelete={(reason, removeAll) => deletePointWithRefs({ pointId: p.id, reason, removeAll })}
    />
  );
}
