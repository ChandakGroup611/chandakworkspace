import Link from "next/link";
import { notFound } from "next/navigation";
import * as D from "@/lib/budget/data";
import { AccessSettings, FieldSettings } from "../../_components/admin";
import { loadSession } from "../../_components/page-data";
import { Notice, Shell } from "../../_components/shell";

export const dynamic = "force-dynamic";

// Settings: /budget/admin/access (right access.manage) and /budget/admin/fields (right fields.manage).
export default async function Settings({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (section !== "access" && section !== "fields") notFound();
  const { sb, me, block } = await loadSession();
  if (block || !me) return block;
  const projects = await D.getProjects(sb);
  const nav = (
    <nav className="admin-nav" aria-label="Settings">
      {D.can(me, "access.manage") && <Link href="/budget/admin/access" aria-current={section === "access" ? "page" : undefined}>Access: roles, rights and members</Link>}
      {D.can(me, "fields.manage") && <Link href="/budget/admin/fields" aria-current={section === "fields" ? "page" : undefined}>Custom fields and forms</Link>}
    </nav>
  );
  let body: React.ReactNode;
  if (section === "access") {
    if (!D.can(me, "access.manage")) body = <Notice>You do not have the right to manage access.</Notice>;
    else {
      const [access, directory, depts, names] = await Promise.all([D.getAccess(sb), D.getWorkspaceUsers(sb), D.getDepartments(sb), D.getMemberNames(sb)]);
      const email = new Map(directory.map((u) => [u.user_id, u.email]));
      const members = access.members.map((m) => ({ ...m, name: names[m.user_id] ?? "Member", email: email.get(m.user_id) ?? null }))
        .sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name));
      body = <AccessSettings permissions={access.permissions} roles={access.roles} members={members} directory={directory}
        projects={projects.map((p) => ({ id: p.id, name: p.name }))} departments={depts.map((d) => ({ id: d.id, name: d.name }))} me={me.user_id} />;
    }
  } else if (!D.can(me, "fields.manage")) body = <Notice>You do not have the right to change custom fields.</Notice>;
  else {
    const [fields, access] = await Promise.all([D.getAllCustomFields(sb), D.getAccess(sb)]);
    body = <FieldSettings fields={fields} projects={projects.map((p) => ({ id: p.id, name: p.name }))} permissions={access.permissions} />;
  }
  return <Shell me={me} projects={projects} project={null} versions={[]} version={null} tab="home">{nav}{body}</Shell>;
}
