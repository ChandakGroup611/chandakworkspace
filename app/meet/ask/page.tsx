import React, { Suspense } from "react";
import AskMeetClient from "./AskMeetClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ask Meet · Chandak Meet",
  description: "Ask about anything discussed or decided in your meetings",
};

export default function AskMeetPage() {
  return (
    <div className="space-y-5 pb-8">
      <div className="mx-auto max-w-3xl border-b border-border pb-4">
        <h1 className="text-[20px] sm:text-[22px] font-semibold tracking-[-0.01em] text-heading">Ask Meet</h1>
        <p className="mt-1 text-[14px] text-subtle">Ask about anything discussed, decided or assigned in your meetings. Answers only use meetings you can see.</p>
      </div>
      <Suspense>
        <AskMeetClient />
      </Suspense>
    </div>
  );
}
