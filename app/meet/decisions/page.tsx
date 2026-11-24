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

      <section className="theme-card-structural grid gap-4 p-4 text-[13.5px] text-subtle sm:grid-cols-3">
        <div>
          <p className="font-semibold text-heading">What is a decision?</p>
          <p>Something agreed in a meeting, e.g. "Credit limit for Indore dealers stays at ₹25 lakh". It's recorded during the meeting (or from the minutes) and goes into that meeting's minutes.</p>
        </div>
        <div>
          <p className="font-semibold text-heading">Where it comes from</p>
          <p>Each decision shows the meeting and date it was taken in and, if it was about a point, that point. Click a decision to see all of it.</p>
        </div>
        <div>
          <p className="font-semibold text-heading">What happens next</p>
          <p>It stays <strong>Active</strong> until it's replaced by a newer decision or withdrawn. Give it a review date to have it come back, and create a follow-up task if someone has to act on it.</p>
        </div>
      </section>

      <DecisionsClient
        initialDecisions={decisions}
        sessions={sessions as any}
      />
    </div>
  );
}
