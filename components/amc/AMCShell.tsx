"use client";

/**
 * Frame shared by every AMC page: header, "New" actions and the module section menu.
 * Each section is its own route (Fleet pattern), instead of tabs on one page:
 *   /amc                 Dashboard
 *   /amc/contracts       AMC contracts register        (+ /new, /[id], /[id]/edit)
 *   /amc/subscriptions   Subscriptions register        (+ /new, /[id], /[id]/edit)
 *   /amc/transactions    Invoices, renewals, add-ons, allocations across all contracts
 *   /amc/reports         Detailed reports with export
 *   /amc/analytics       Analysis
 */
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ShieldCheck, Zap, Receipt, FileBarChart, LineChart, Plus } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppButton } from "@/components/ui/AppButton";
import { usePermissions } from "@/hooks/usePermissions";
import { AccessRestricted } from "@/components/errors/AccessRestricted";
import ChandakLoader from "@/components/ui/ChandakLoader";
import { cn } from "@/lib/utils";

export const AMC_SECTIONS = [
  { href: "/amc", label: "Home", icon: BarChart3, match: (p: string) => p === "/amc" },
  { href: "/amc/register", label: "Register", icon: ShieldCheck, match: (p: string) => p.startsWith("/amc/register") || p.startsWith("/amc/contracts") || p.startsWith("/amc/subscriptions") },
  { href: "/amc/transactions", label: "Payments & renewals", icon: Receipt, match: (p: string) => p.startsWith("/amc/transactions") },
  { href: "/amc/reports", label: "Reports", icon: FileBarChart, match: (p: string) => p.startsWith("/amc/reports") },
  { href: "/amc/analytics", label: "Analytics", icon: LineChart, match: (p: string) => p.startsWith("/amc/analytics") },
] as const;

export function AMCSectionNav({ counts }: { counts?: Partial<Record<string, number>> }) {
  const pathname = usePathname() || "/amc";
  return (
    <nav aria-label="AMC sections" className="mb-5 border-b border-border">
      <ul className="flex max-w-full gap-1 overflow-x-auto hide-scrollbar">
        {AMC_SECTIONS.map((s) => {
          const active = s.match(pathname);
          const Icon = s.icon;
          const count = counts?.[s.href];
          return (
            <li key={s.href}>
              <Link
                href={s.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center gap-2 whitespace-nowrap border-b-2 px-3.5 text-[13px] transition-colors sm:min-h-10",
                  active ? "border-primary font-semibold text-foreground" : "border-transparent font-medium text-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {s.label}
                {count !== undefined && (
                  <span className="rounded-full bg-sunken px-1.5 font-mono text-[11px] tabular-nums text-subtle">{count}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function AMCShell({
  title,
  description,
  breadcrumbs,
  actions,
  counts,
  showNew = true,
  showNav = true,
  strict = false,
  children,
}: {
  title: string;
  description?: string;
  breadcrumbs?: { label: string; href?: string }[];
  /** Extra header actions (shown before the New buttons). */
  actions?: React.ReactNode;
  counts?: Partial<Record<string, number>>;
  showNew?: boolean;
  showNav?: boolean;
  strict?: boolean;
  children: React.ReactNode;
}) {
  const { hasPermission, loading } = usePermissions();
  const canView = hasPermission("SUPER_ADMIN") || hasPermission("AMC_VIEW") || hasPermission("AMC_MANAGE");
  const canCreate = hasPermission("SUPER_ADMIN") || hasPermission("AMC_CREATE");

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <ChandakLoader size="lg" title="Loading AMC…" />
      </div>
    );
  }
  if (!canView) {
    return <AccessRestricted requiredRole="AMC Manager" requiredPermission="AMC_VIEW" moduleName="AMC and Subscriptions" />;
  }

  return (
    <PageContainer strict={strict} className={cn(!strict && "pb-12")}>
      <PageHeader
        title={title}
        description={description}
        icon={<ShieldCheck className="h-6 w-6" />}
        breadcrumbs={breadcrumbs}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {actions}
            {showNew && canCreate && (
              <>
                <Link href="/amc/contracts/new">
                  <AppButton variant="outline" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} className="h-9 text-xs font-medium">
                    New AMC contract
                  </AppButton>
                </Link>
                <Link href="/amc/subscriptions/new">
                  <AppButton variant="primary" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} className="h-9 text-xs font-semibold">
                    New subscription
                  </AppButton>
                </Link>
              </>
            )}
          </div>
        }
      />
      {showNav && <AMCSectionNav counts={counts} />}
      {children}
    </PageContainer>
  );
}
