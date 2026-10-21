"use client";

/**
 * REFERENCE LAYOUT for every record detail page: Requirement details, Ticket, Vehicle,
 * Drawing, Vendor, Consultant, User… Presentation only — keep the page's real data/handlers.
 * Anatomy: DetailHeader → (optional InlineAlert) → AppTabs → DetailLayout(main, side).
 */
import React from "react";
import { Pencil, Printer, CheckCircle2, XCircle } from "lucide-react";
import { AppButton } from "@/components/ui/AppButton";
import { AppTabs, AppTabPanel } from "@/components/ui/AppTabs";
import { DetailHeader, DetailLayout, DetailCard, KeyValueGrid } from "@/components/ui/detail/Detail";
import { ActivityTimeline } from "@/components/ui/detail/ActivityTimeline";
import { InlineAlert, EmptyState } from "@/components/ui/feedback/States";
import { StatusBadge, PriorityIndicator, DateCell, DueDateCell, UserCell } from "@/components/ui/data";

export function RecordDetailExample() {
  const [tab, setTab] = React.useState("overview");
  return (
    <div>
      <DetailHeader
        backHref="/requirements"
        backLabel="Requirements"
        code="REQ-1187"
        title="Site Wi-Fi coverage for Tower B, floors 12–18"
        status={<StatusBadge status="Pending approval" />}
        meta={<>Raised 14 Oct 2026 by Priya Deshmukh · Head Office, Andheri</>}
        actions={
          <>
            <AppButton variant="ghost" leftIcon={<Printer className="h-4 w-4" />}>Print</AppButton>
            <AppButton variant="secondary" leftIcon={<Pencil className="h-4 w-4" />}>Edit</AppButton>
            <AppButton variant="secondary" leftIcon={<XCircle className="h-4 w-4" />}>Reject</AppButton>
            <AppButton leftIcon={<CheckCircle2 className="h-4 w-4" />}>Approve</AppButton>
          </>
        }
      />
      <InlineAlert tone="warning" title="Waiting for your approval" className="mb-4">
        Budget is above the ₹5,00,000 department limit, so Finance must approve after you.
      </InlineAlert>
      <AppTabs
        idPrefix="req"
        aria-label="Requirement sections"
        value={tab}
        onValueChange={setTab}
        items={[{ id: "overview", label: "Overview" }, { id: "items", label: "Line items", count: 6 }, { id: "docs", label: "Documents", count: 0 }, { id: "activity", label: "Activity", count: 4 }]}
        className="mb-5"
      />
      <AppTabPanel idPrefix="req" id="overview" active={tab === "overview"}>
        <DetailLayout
          main={
            <DetailCard title="Description">
              <p className="max-w-[70ch] text-[13.5px] leading-relaxed text-foreground">
                Engineers on floors 12–18 lose connection near the east stairwell. Add four ceiling access points, extend the
                PoE switch in the B-12 rack, and survey after installation.
              </p>
            </DetailCard>
          }
          side={
            <DetailCard title="Details">
              <KeyValueGrid
                cols={1}
                items={[
                  { label: "Priority", value: <PriorityIndicator priority="High" /> },
                  { label: "Requested by", value: <UserCell name="Priya Deshmukh" subtitle="IT Admin" /> },
                  { label: "Approver", value: <UserCell name="Amit Shah" subtitle="IT Head" /> },
                  { label: "Created", value: <DateCell value="14-10-2026" /> },
                  { label: "Needed by", value: <DueDateCell value="2026-10-23" /> },
                  { label: "Estimated cost", value: <span className="tabular">₹6,40,000</span> },
                  { label: "Vendor", value: null },
                ]}
              />
            </DetailCard>
          }
        />
      </AppTabPanel>
      <AppTabPanel idPrefix="req" id="docs" active={tab === "docs"}>
        <EmptyState title="No documents yet" description="Attach quotations or survey reports so the approver can review them." action={<AppButton variant="secondary">Upload document</AppButton>} />
      </AppTabPanel>
      <AppTabPanel idPrefix="req" id="activity" active={tab === "activity"}>
        <DetailCard title="Activity">
          <ActivityTimeline
            items={[
              { id: 4, who: "System", action: "sent the approval request to Amit Shah", at: "2026-10-16T10:05:00", tone: "info" },
              { id: 3, who: "Priya Deshmukh", action: "attached a survey report", at: "2026-10-15T17:40:00" },
              { id: 2, who: "Neha Patil", action: "asked for a revised quote", at: "2026-10-15T12:12:00", tone: "warning", note: "Vendor quote excludes cabling. Please get an all-inclusive figure." },
              { id: 1, who: "Priya Deshmukh", action: "created the requirement", at: "2026-10-14T09:30:00", tone: "accent" },
            ]}
          />
        </DetailCard>
      </AppTabPanel>
    </div>
  );
}
