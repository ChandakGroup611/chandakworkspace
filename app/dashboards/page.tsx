import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LineChart, Lock, ArrowRight, ArrowLeft, Wallet } from "lucide-react";
import { getCachedUser } from "@/lib/auth/cached-user";
import { listAccessibleDashboards } from "@/lib/dashboards/access";
import { getUserAllowedModules } from "@/lib/actions/module-switcher";

export const metadata = {
  title: "Dashboards | Chandak Workspace",
  description: "Department budget and expense dashboards on live IN4 data.",
};

export const dynamic = "force-dynamic";

const PERM_LABEL: Record<string, string> = {
  view: "View",
  details: "Details",
  export: "Export",
  schedule: "Schedule emails",
  chat: "Ask the data",
  admin: "Admin",
};

export default async function DashboardsPage({
  searchParams
}: {
  searchParams?: Promise<{ view?: string } | undefined>;
}) {
  const { user } = await getCachedUser();
  if (!user) redirect("/login?next=/dashboards");

  // Verify DASHBOARDS module authorization
  const userModules = await getUserAllowedModules(user.id);
  const canAccessDashboards = userModules.modules.some((m) => m.code === "DASHBOARDS");
  if (!canAccessDashboards) {
    redirect("/select-module");
  }

  const canAccessOrgBudget = userModules.modules.some((m) => m.code === "ORG_BUDGET");

  const dashboards = await listAccessibleDashboards(user.id);

  const sp = searchParams ? await searchParams : {};
  // If the user only has access to a single dashboard and no Organization Budget, open it directly unless intentionally viewing list
  if (dashboards.length === 1 && !canAccessOrgBudget && sp?.view !== "list") {
    redirect(`/dashboards/${dashboards[0].def.key}`);
  }

  const hasMultipleModules = userModules.modules.length > 1;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
      <div>
        {hasMultipleModules && (
          <div className="mb-2">
            <Link
              href="/select-module?choose=1"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to module navigation
            </Link>
          </div>
        )}
        <h1 className="text-2xl font-semibold text-foreground">Dashboards</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Budget and expense dashboards on live IN4 data. You see the dashboards and actions your role allows.
        </p>
      </div>

      {dashboards.length === 0 && !canAccessOrgBudget ? (
        <div className="theme-card-structural rounded-lg p-8 flex flex-col items-center text-center gap-3">
          <Lock className="h-8 w-8 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">No dashboards assigned yet</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            Ask your portal administrator to give your account access to a department dashboard.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {dashboards.map(({ def, access }) => (
            // Plain link: the dashboard is a separate full-page app served through /dashboards/<key>
            <a
              key={def.key}
              href={`/dashboards/${def.key}`}
              className="theme-card-structural rounded-lg p-5 flex flex-col gap-4 transition-all duration-300 hover:border-border-active hover:shadow-md group"
            >
              <div className="flex items-center gap-3">
                <span
                  className="h-11 w-11 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${def.accent}1f`, color: def.accent }}
                >
                  <LineChart className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="font-semibold text-foreground truncate">{def.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {access.companies === null ? "All companies" : `${access.companies.length} compan${access.companies.length === 1 ? "y" : "ies"}`}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{def.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {access.perms.map((p) => (
                  <span key={p} className="text-[11px] font-medium px-2 py-0.5 rounded-full border border-border text-muted-foreground">
                    {PERM_LABEL[p] || p}
                  </span>
                ))}
              </div>
              <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: def.accent }}>
                Open dashboard <ArrowRight className="h-4 w-4" />
              </span>
            </a>
          ))}

          {canAccessOrgBudget && (
            <Link
              href="/budget"
              className="theme-card-structural rounded-lg p-5 flex flex-col gap-4 transition-all duration-300 hover:border-border-active hover:shadow-md group"
            >
              <div className="flex items-center gap-3">
                <span
                  className="h-11 w-11 rounded-lg flex items-center justify-center shrink-0 bg-primary/10 text-primary"
                >
                  <Wallet className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="font-semibold text-foreground truncate">Organization Budget & Cost Control</h2>
                  <p className="text-xs text-muted-foreground">
                    Projects, Towers & Cost Centers
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Project, tower and department budgets with revisions (R1, R2, ...), variance tracking, and cost incurred actuals.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {["Revisions (R1..Rn)", "Variance & CTC", "Tower Workings", "Vendor Bills"].map((p) => (
                  <span key={p} className="text-[11px] font-medium px-2 py-0.5 rounded-full border border-border text-muted-foreground">
                    {p}
                  </span>
                ))}
              </div>
              <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                Open Organization Budget <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
