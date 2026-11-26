"use client";

import React, { useState, useTransition } from "react";
import { toast } from "react-toastify";
import { KeyRound, Plug, Save } from "lucide-react";
import { AppButton } from "@/components/ui/AppButton";
import {
  saveMeetAzure,
  testMeetAzure,
  type MeetAzureForm,
} from "@/lib/actions/meet/azure-config";

const inputCls =
  "h-10 w-full rounded-md border border-border bg-surface px-3 text-base sm:text-[14px] text-foreground placeholder:text-muted focus:border-primary focus:outline-none";
const labelCls = "mb-1 block text-[13px] font-semibold text-foreground";

/** Meet › Settings: Microsoft Azure & Teams integration keys stored securely in DB. */
export default function MeetAzureConfigCard({ initial }: { initial: MeetAzureForm }) {
  const [f, setF] = useState({ ...initial, client_secret: "" });
  const [pending, start] = useTransition();
  const set = (k: string, v: any) => setF((x) => ({ ...x, [k]: v }));

  const payload = () => ({
    active: f.active,
    tenant_id: f.tenant_id,
    client_id: f.client_id,
    client_secret: f.client_secret,
  });

  return (
    <section className="theme-card-structural overflow-hidden p-0" aria-labelledby="azure-h">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-sunken px-5 py-4">
        <div className="flex items-center gap-3">
          <KeyRound className="h-5 w-5 text-primary shrink-0" aria-hidden />
          <div>
            <h2 id="azure-h" className="text-[15px] font-semibold text-heading">
              Microsoft Teams &amp; Azure App Keys
            </h2>
            <p className="text-[12.5px] text-muted">
              Used by Chandak Meet for Teams meeting links, Outlook calendar sync, attendance, and transcripts.
            </p>
          </div>
        </div>
        <label className="inline-flex items-center gap-2 text-[13.5px] font-semibold text-foreground cursor-pointer">
          <input
            type="checkbox"
            role="switch"
            checked={f.active}
            onChange={(e) => set("active", e.target.checked)}
            className="h-4 w-4"
          />
          {f.active ? "On" : "Off"}
        </label>
      </div>

      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <div>
          <label htmlFor="az-tenant" className={labelCls}>
            Azure Tenant ID
          </label>
          <input
            id="az-tenant"
            value={f.tenant_id}
            onChange={(e) => set("tenant_id", e.target.value)}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            autoComplete="off"
            className={inputCls}
          />
        </div>

        <div>
          <label htmlFor="az-client" className={labelCls}>
            Azure Client ID (Application ID)
          </label>
          <input
            id="az-client"
            value={f.client_id}
            onChange={(e) => set("client_id", e.target.value)}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            autoComplete="off"
            className={inputCls}
          />
        </div>

        <div>
          <label htmlFor="az-secret" className={labelCls}>
            Azure Client Secret
          </label>
          <input
            id="az-secret"
            type="password"
            value={f.client_secret}
            onChange={(e) => set("client_secret", e.target.value)}
            placeholder={
              initial.hasClientSecret
                ? "Saved. Type a new secret to replace it"
                : "Enter Azure Client Secret"
            }
            autoComplete="new-password"
            className={inputCls}
          />
        </div>

        <div className="rounded-md bg-sunken p-3 text-[12.5px] text-subtle sm:self-end">
          {f.active
            ? "On: Chandak Meet fetches Azure credentials directly from these settings."
            : "Off: Using server environment variables if configured, otherwise deep-link fallback."}
          {initial.hasEnvFallback && (
            <span className="block text-muted mt-0.5">Server env fallback is also present.</span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2 border-t border-border bg-sunken px-5 py-3">
        <AppButton
          type="button"
          variant="outline"
          size="md"
          disabled={pending || !f.tenant_id || !f.client_id}
          leftIcon={<Plug className="h-4 w-4" />}
          onClick={() =>
            start(async () => {
              const r = await testMeetAzure(payload());
              if (r.success) {
                const roleInfo = r.roles?.length ? ` (${r.roles.length} Graph roles)` : "";
                toast.success(`Azure connection verified${roleInfo}`);
              } else {
                toast.error(r.error || "Azure connection test failed");
              }
            })
          }
        >
          Test connection
        </AppButton>

        <AppButton
          type="button"
          variant="primary"
          size="md"
          disabled={pending}
          leftIcon={<Save className="h-4 w-4" />}
          onClick={() =>
            start(async () => {
              const r = await saveMeetAzure(payload());
              if (r.success) {
                toast.success("Azure keys saved");
                setF((x) => ({ ...x, client_secret: "" }));
              } else {
                toast.error(r.error || "Couldn't save Azure keys");
              }
            })
          }
        >
          Save
        </AppButton>
      </div>
    </section>
  );
}
