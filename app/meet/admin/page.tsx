import React from "react";
import { MeetHeader } from "@/components/meet/MeetHeader";
import MeetAdminClient from "./MeetAdminClient";
import { getMeetingMasters, getMeetSettings, getMeetRoleMatrix } from "@/lib/actions/meet/masters";
import { getSLAPolicies, getSLAInstances, getAlertRules, getNotificationTemplates } from "@/lib/actions/meet/sla";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Meet Settings & Administration · Chandak Meet",
  description: "Roles & permissions, meeting policies, alerts & SLA engine, custom templates, rooms, and masters.",
};

export default async function MeetAdminPage() {
  const [masters, settings, roleMatrix, slaPolicies, slaInstances, alertRules, templates] = await Promise.all([
    getMeetingMasters(),
    getMeetSettings(),
    getMeetRoleMatrix(),
    getSLAPolicies(),
    getSLAInstances(),
    getAlertRules(),
    getNotificationTemplates(),
  ]);

  return (
    <div className="space-y-6">
      <MeetHeader
        title="Meet Settings & Governance Hub"
        description="Module-level roles & access, meeting policies, SLA escalation matrix, custom email templates, and room displays"
        breadcrumbs={[{ label: "Meet Settings" }]}
      />

      <MeetAdminClient
        initialMasters={masters}
        initialSettings={settings}
        initialRoleMatrix={roleMatrix}
        initialSLAPolicies={slaPolicies}
        initialSLAInstances={slaInstances}
        initialAlertRules={alertRules}
        initialTemplates={templates}
      />
    </div>
  );
}
