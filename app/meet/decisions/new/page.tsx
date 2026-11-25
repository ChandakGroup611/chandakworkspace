import React from "react";
import BackLink from "@/components/meet/BackLink";
import { getDecisionFormData } from "@/lib/actions/meet/decision-new";
import RecordDecisionForm from "./RecordDecisionForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Record a decision · Chandak Meet" };

export default async function NewDecisionPage({ searchParams }: { searchParams: Promise<{ session?: string }> }) {
  const sp = await searchParams;
  const data = await getDecisionFormData();
  return (
    <div className="space-y-5 pb-6">
      <div className="space-y-2 border-b border-border pb-4">
        <BackLink href="/meet/decisions" label="Decisions" />
        <h1 className="text-[20px] sm:text-[22px] font-semibold tracking-[-0.01em] text-heading">Record a decision</h1>
        <p className="text-[13.5px] text-muted">A management decision: what was decided, who it applies to, and who has to act on it. Each person who has to act gets a task, so you can see what was done.</p>
      </div>
      <RecordDecisionForm sessions={data.sessions} departments={data.departments} people={data.people} defaultSession={sp.session} />
    </div>
  );
}
