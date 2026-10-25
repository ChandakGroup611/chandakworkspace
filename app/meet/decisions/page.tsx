import React from "react";
import { MeetHeader } from "@/components/meet/MeetHeader";
import DecisionsClient from "./DecisionsClient";
import { getDecisions, getDecisionEligibleSessions } from "@/lib/actions/meet/decisions";

export const metadata = {
  title: "Decisions Register · Chandak Meet",
  description: "Enterprise register of standing decisions and ratified policies across Chandak Group meetings",
};

export default async function DecisionsPage() {
  const [decisions, sessions] = await Promise.all([
    getDecisions(),
    getDecisionEligibleSessions(),
  ]);

  return (
    <div className="space-y-6">
      <MeetHeader
        title="Decisions & Policy Register"
        description="Searchable central record of standing resolutions, committee mandates, and active policies"
        breadcrumbs={[{ label: "Decisions Register" }]}
      />

      <DecisionsClient
        initialDecisions={decisions}
        sessions={sessions as any}
      />
    </div>
  );
}
