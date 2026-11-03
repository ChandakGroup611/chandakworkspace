import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import * as D from "@/lib/budget/data";
import { AccessSettings, FieldSettings } from "../../_components/admin";
import { MastersSettings } from "../../_components/masters";
import { loadSession } from "../../_components/page-data";
import { MasterNav, Notice, Shell } from "../../_components/shell";

export const dynamic = "force-dynamic";

// Settings: /budget/admin/access (right access.manage) and /budget/admin/fields (right fields.manage).
export default async function Settings({ params, searchParams }: { params: Promise<{ section: string }>; searchParams?: Promise<Record<string, string | undefined>> }) {
  const { section } = await params;
  const sp = searchParams ? await searchParams : {};
  if (section !== "access" && section !== "fields" && section !== "masters") notFound();
  const { sb, me, block } = await loadSession();
  if (block || !me) return block;
  const projects = await D.getProjects(sb);
  const cookieStore = await cookies();
  const activeProjectId = cookieStore.get("active_budget_project")?.value;
  const currentProject = projects.find((p) => String(p.id) === activeProjectId) ?? projects[0] ?? null;

  let body: React.ReactNode;
  if (section === "access") {
    if (!D.can(me, "access.manage")) body = <Notice>You do not have the right to manage access.</Notice>;
    else {
      const [access, directory, depts, names] = await Promise.all([D.getAccess(sb), D.getWorkspaceUsers(sb), D.getDepartments(sb), D.getMemberNames(sb)]);
      const email = new Map(directory.map((u) => [u.user_id, u.email]));
      const members = access.members.map((m) => ({ ...m, name: names[m.user_id] ?? "Member", email: email.get(m.user_id) ?? null }))
        .sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name));
      body = <AccessSettings permissions={access.permissions} roles={access.roles} members={members} directory={directory}
        projects={projects.map((p) => ({ id: p.id, name: p.name }))} departments={depts.map((d) => ({ id: d.id, name: d.name }))} me={me.user_id} isSuperAdmin={Boolean(me.is_super_admin || me.role === 'Super Administrator' || me.role_id === 1)} />;
    }
  } else if (section === "masters") {
    if (!D.can(me, "project.view")) body = <Notice>You do not have access to the budget masters.</Notice>;
    else {
      const [depts, summary, gst, heads] = await Promise.all([
        D.getDepartments(sb),
        sb.from("budget_summary_template").select("category, subcategory, category_sort, subcategory_sort").order("category_sort").order("subcategory_sort"),
        sb.from("budget_gst_rules").select("id, name, rate_pct, share_pct, sort, active").order("sort").order("name"),
        sb.from("budget_cost_heads").select("department_id"),
      ]);
      const used = (id: number) => (heads.data ?? []).filter((h) => h.department_id === id).length;
      // one master per screen: /budget/admin/masters?section=departments|summary|gst
      const cats = new Set(((summary.data ?? []) as { category: string }[]).map((r) => r.category)).size;
      const tabs = [
        { key: "departments", label: "Departments", href: "/budget/admin/masters?section=departments", count: depts.length, hint: "Shared by every project. Each department rolls into one category of the Project Budget Summary." },
        { key: "summary", label: "Summary categories", href: "/budget/admin/masters?section=summary", count: cats, hint: "Category and sub-category rows of the Project Budget Summary, in report order. Construction rows follow the tower building types." },
        { key: "gst", label: "GST rules", href: "/budget/admin/masters?section=gst", count: (gst.data ?? []).length, hint: "GST = rate % × eligible share %. Picked when adding a GST cost head; changing a rule does not change heads already set up." },
      ];
      const ms = (tabs.some((t) => t.key === sp.section) ? sp.section : "departments") as "departments" | "summary" | "gst";
      body = <><MasterNav label="Common masters" items={tabs} active={ms} /><MastersSettings section={ms} editable={D.can(me, "project.setup")}
        departments={depts.map((d) => ({ ...d, heads: used(d.id) }))}
        summary={(summary.data ?? []) as { category: string; subcategory: string; category_sort: number; subcategory_sort: number }[]}
        gst={(gst.data ?? []) as { id: number; name: string; rate_pct: number; share_pct: number; sort: number; active: boolean }[]} /></>;
    }
  } else if (!D.can(me, "fields.manage")) body = <Notice>You do not have the right to change custom fields.</Notice>;
  else {
    const [fields, access] = await Promise.all([D.getAllCustomFields(sb), D.getAccess(sb)]);
    body = <FieldSettings fields={fields} projects={projects.map((p) => ({ id: p.id, name: p.name }))} permissions={access.permissions} />;
  }
  return <Shell me={me} projects={projects} project={currentProject} versions={[]} version={null} tab={section}>{body}</Shell>;
}
