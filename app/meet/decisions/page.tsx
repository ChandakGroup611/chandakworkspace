import React from "react";
import { MeetHeader } from "@/components/meet/MeetHeader";
import DecisionsClient from "./DecisionsClient";
import { getDecisions, getDecisionEligibleSessions } from "@/lib/actions/meet/decisions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Decisions · Chandak Meet",
  description: "Every decision taken in Chandak Meet meetings",
};

export default async function DecisionsPage() {
  const [decisions, sessions] = await Promise.all([
    getDecisions(),
    getDecisionEligibleSessions(),
  ]);

  return (
    <div className="space-y-6">
      <MeetHeader
        title="Decisions"
        description="Every decision taken in a meeting: search it, see where it came from, and mark it replaced or withdrawn."
        breadcrumbs={[{ label: "Decisions" }]}
      />

      <DecisionsClient
        initialDecisions={decisions}
        sessions={sessions as any}
      />
    </div>
  );
}
