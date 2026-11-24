import React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getMeetEmailSetup } from "@/lib/actions/meet/email-setup";
import MeetEmailEditor from "./MeetEmailEditor";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Emails · Chandak Meet",
  description: "Write each Meet email, choose who gets it and, for reminders, when",
};

export default async function MeetEmailsPage() {
  const { items, canEdit, smtpReady } = await getMeetEmailSetup();
  return (
    <div className="space-y-5 pb-8">
      <div className="border-b border-border pb-4">
        <Link href="/meet/automations" className="inline-flex items-center gap-1 text-[13.5px] font-medium text-muted hover:text-foreground">
          <ChevronLeft className="h-4 w-4" aria-hidden /> Automations
        </Link>
        <h1 className="mt-1 text-[24px] font-bold tracking-[-0.01em] text-heading">Emails</h1>
        <p className="mt-1 max-w-3xl text-[14px] text-subtle">
          Pick an event, choose who gets the email and write it. Nothing is sent for an event until you write it and switch it on.
          Emails go out through your own SMTP.
        </p>
      </div>
      <MeetEmailEditor items={items} canEdit={canEdit} smtpReady={smtpReady} />
    </div>
  );
}
