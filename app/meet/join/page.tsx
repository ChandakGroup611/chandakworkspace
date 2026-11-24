import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { resolveJoinCode } from "@/lib/actions/meet/join";
import { btnPrimary } from "@/components/meet/session-ui";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Join with meeting ID · Chandak Meet",
};

/** /meet/join?code=MTG-0007 → the live or next meeting with that ID. */
export default async function JoinByCodePage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  let error: string | null = null;
  if (code) {
    const r = await resolveJoinCode(code);
    if (r.sessionId) redirect(`/meet/join/${r.sessionId}`);
    error = r.error || "No meeting found with that ID.";
  }

  return (
    <div className="mx-auto max-w-md space-y-5 py-10">
      <div>
        <h1 className="text-[24px] font-bold text-heading">Join with a meeting ID</h1>
        <p className="mt-1 text-[14px] text-subtle">You'll find the ID in the invite email, for example MTG-0007.</p>
      </div>
      <form className="space-y-3">
        <label htmlFor="join-code" className="block text-[13px] font-semibold text-subtle">Meeting ID</label>
        <input
          id="join-code"
          name="code"
          defaultValue={code || ""}
          autoFocus
          placeholder="MTG-0007"
          className="h-11 w-full rounded-md border border-border bg-surface px-3 text-[15px] uppercase text-foreground focus:border-primary focus:outline-none"
        />
        {error && <p role="alert" className="text-[13.5px] text-danger-text">{error}</p>}
        <button type="submit" className={`${btnPrimary} h-11 w-full`}>Continue</button>
      </form>
      <Link href="/meet" className="text-[13.5px] font-medium text-primary hover:underline">Back to Meet home</Link>
    </div>
  );
}
