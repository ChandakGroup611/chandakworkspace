import React from "react";
import { MeetHeader } from "@/components/meet/MeetHeader";
import MeetAdminClient from "./MeetAdminClient";
import { getMeetingMasters, getMeetSettings, getMeetRoleMatrix } from "@/lib/actions/meet/masters";
import { getSLAPolicies, getSLAInstances, getAlertRules, getNotificationTemplates } from "@/lib/actions/meet/sla";

import { requireMeet } from "@/lib/permissions/meet";
import { readMeetProjects } from "@/lib/utils/meet-projects";
import { graceMinutes } from "@/lib/utils/meet-attendance";
import AttendanceRulesCard from "@/components/meet/AttendanceRulesCard";
import MeetMailServerCard from "@/components/meet/MeetMailServerCard";
import { getMeetSmtpForm } from "@/lib/actions/meet/mail-server";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { AppButton } from "@/components/ui/AppButton";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Meet Settings & Administration · Chandak Meet",
  description: "Roles & permissions, meeting policies, alerts & SLA engine, custom templates, rooms, and masters.",
};

export default async function MeetAdminPage({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  const { section } = await searchParams;
  try {
    await requireMeet("MEET_ADMIN", { requireAdmin: true });
  } catch (err: any) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="h-14 w-14 rounded-2xl bg-danger/10 text-danger flex items-center justify-center ring-8 ring-danger/5">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <div className="space-y-1.5 max-w-md">
          <h2 className="text-xl font-bold text-heading">Meet Administration Restricted</h2>
          <p className="text-sm text-muted">
            You do not have administrative privileges (MEET_ADMIN) to manage Meet module policies, SLA rules, templates, and room masters.
          </p>
        </div>
        <Link href="/meet">
          <AppButton variant="primary" size="md">
            Return to Meet Overview
          </AppButton>
        </Link>
      </div>
    );
  }

  const [masters, settings, roleMatrix, slaPolicies, slaInstances, alertRules, templates, projects] = await Promise.all([
    getMeetingMasters(),
    getMeetSettings(),
    getMeetRoleMatrix(),
    getSLAPolicies(),
    getSLAInstances(),
    getAlertRules(),
    getNotificationTemplates(),
    readMeetProjects(),
  ]);

  return (
    <div className="space-y-6">
      <MeetHeader
        title="Settings"
        description={section ? "Chandak Meet settings. Other sections are under Settings in the menu on the left." : "Pick a section under Settings in the menu on the left."}
        breadcrumbs={[{ label: "Settings" }]}
      />

      <MeetAdminClient
        initialMasters={masters}
        initialSettings={settings}
        initialRoleMatrix={roleMatrix}
        initialSLAPolicies={slaPolicies}
        initialSLAInstances={slaInstances}
        initialAlertRules={alertRules}
        initialTemplates={templates}
        initialProjects={projects}
        section={section}
      />
      {(!section || section === "policies") && <AttendanceRulesCard grace={await graceMinutes()} />}
      {section === "email" && <MeetMailServerCard initial={await getMeetSmtpForm()} />}
    </div>
  );
}
