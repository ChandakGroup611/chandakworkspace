"use client";

import AMCReportsClient from "@/components/amc/AMCReportsClient";
import { AMCShell } from "@/components/amc/AMCShell";

// Transactions across all AMC contracts and subscriptions: invoices & payments, renewals,
// add-on transactions and license allocations. Contract registers live under their own sections.
export default function AMCTransactionsPage() {
  return (
    <AMCShell
      title="Transactions"
      breadcrumbs={[{ label: "AMC & Subscriptions", href: "/amc" }, { label: "Transactions" }]}
    >
      <div className="theme-card-structural p-4">
        <AMCReportsClient reportIds={["invoices", "renewals", "transactions", "allocations"]} defaultReport="invoices" />
      </div>
    </AMCShell>
  );
}
