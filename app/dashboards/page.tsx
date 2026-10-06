import React from "react";
import { redirect } from "next/navigation";
import { LineChart, Lock, ArrowRight } from "lucide-react";
import { getCachedUser } from "@/lib/auth/cached-user";
import { listAccessibleDashboards } from "@/lib/dashboards/access";

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

export default async function DashboardsPage() {
  const { user } = await getCachedUser();
  if (!user) redirect("/login?next=/dashboards");

  const dashboards = await listAccessibleDashboards(user.id);

  // If the user only has access to a single dashboard, open it directly
  if (dashboards.length === 1) {
    redirect(`/dashboards/${dashboards[0].def.key}`);
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboards</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Budget and expense dashboards on live IN4 data. You see the dashboards and actions your role allows.
        </p>
      </div>

      {dashboards.length === 0 ? (
        <div className="theme-card-structural rounded-2xl p-8 flex flex-col items-center text-center gap-3">
          <Lock className="h-8 w-8 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">No dashboards assigned yet</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            Ask your portal administrator to give your role access to a department dashboard.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {dashboards.map(({ def, access }) => (
            // Plain link: the dashboard is a separate full-page app served through /dashboards/<key>
            <a
              key={def.key}
              href={`/dashboards/${def.key}`}
              className="theme-card-structural rounded-2xl p-5 flex flex-col gap-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group"
            >
              <div className="flex items-center gap-3">
                <span
                  className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
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
                Open dashboard <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
