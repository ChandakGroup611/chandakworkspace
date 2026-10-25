import React from "react";
import NotesClient from "./NotesClient";
import { getNotes } from "@/lib/actions/meet/notes";
import { getMeetingMasters } from "@/lib/actions/meet/masters";

export const metadata = {
  title: "Meeting & Personal Notes | Chandak Meet",
  description: "Fast capture layer for meetings, running notes, open loops, and instant item conversion.",
};

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; q?: string }>;
}) {
  const params = await searchParams;
  const [notes, masters] = await Promise.all([
    getNotes({ kind: params.kind, q: params.q }),
    getMeetingMasters(),
  ]);

  return <NotesClient initialNotes={notes} masters={masters} initialKind={params.kind || "all"} />;
}
