/**
 * AMC & Subscriptions home (redesign stage 1): renewals, payments due, unused seats and records
 * to tidy up. Registers, record pages, transactions and reports are their own routes
 * (see components/amc/AMCShell.tsx).
 */
import React from "react";
import { AMCShell } from "@/components/amc/AMCShell";
import AMCHome from "@/components/amc/AMCHome";
import { getAMCHome } from "@/lib/actions/amc-home";

export const dynamic = "force-dynamic";

export default async function AMCHomePage({ searchParams }: { searchParams: Promise<{ win?: string }> }) {
  const sp = await searchParams;
  const win = (sp.win === "60" ? 60 : sp.win === "90" ? 90 : 30) as 30 | 60 | 90;
  const data = await getAMCHome();

  return (
    <AMCShell title="AMC & Subscriptions" description="What's renewing, what's due and what needs tidying up.">
      {data ? <AMCHome data={data} win={win} /> : null}
    </AMCShell>
  );
}
