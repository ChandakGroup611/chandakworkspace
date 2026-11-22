import Link from "next/link";
import * as D from "@/lib/budget/data";
import { dmy, formatBudgetPeriod, versionTitle } from "@/lib/budget/format";
import { SignoffActions } from "../_components/forms";
import { loadSession } from "../_components/page-data";
import { Shell } from "../_components/shell";

export const dynamic = "force-dynamic";

const ACTION_LABEL = { submitted: "Submitted", signed: "Signed", returned: "Sent back", recalled: "Taken back" } as const;

/**
 * Budget approvals: one screen for sign-off across all projects.
 *   1. Waiting for you    – versions where you sign the next level (sign / send back here)
 *   2. Under sign-off     – every version in review, with the level it is waiting for
 *   3. Recent decisions   – the latest sign-off events
 * The same rules as the version banner apply (SignoffActions + database checks).
 */
export default async function BudgetApprovals() {
  const { sb, me, block } = await loadSession();
  if (block || !me) return block;

  const [projects, versions, names, levels, mine] = await Promise.all([
    D.getProjects(sb), D.getVersions(sb), D.getMemberNames(sb), D.getSignoffLevels(sb), D.getMySignoffs(sb),
  ]);
  const projectById = new Map(projects.map((p) => [p.id, p]));
  const inReview = versions.filter((v) => v.status === "in_review" && projectById.has(v.project_id));
  const steps = await Promise.all(inReview.map((v) => D.getSignoffStatus(sb, v.id)));
  const recent = ((await sb
    .from("budget_signoffs")
    .select("id, version_id, level_title, action, comment, user_id, at")
    .order("at", { ascending: false })
    .limit(20)).data ?? []) as (D.SignoffEvent & { version_id: number })[];
  const versionById = new Map(versions.map((v) => [v.id, v]));
  const who = (id: string | null) => (id && names[id]) || "Member";

  const rows = inReview.map((v, i) => {
    const s = steps[i];
    const next = s.find((x) => x.is_next) ?? null;
    return {
      v,
      p: projectById.get(v.project_id)!,
      signed: s.filter((x) => x.signed_by).length,
      total: s.length,
      next,
      mineNext: !!next && next.approver_ids.includes(me.user_id),
      chain: D.chainOf(levels, v.project_id).length > 0,
      mayRecall: D.canChangeDraft(me, { ...v, status: "draft" }),
    };
  });
  const waiting = rows.filter((r) => r.mineNext);

  const VersionCell = ({ v, p }: { v: D.Version; p: D.Project }) => {
    const period = formatBudgetPeriod(v.as_on, p.fy_start_month);
    return (
      <td>
        <Link href={`/budget/${p.id}/overview?v=${v.number}`}><b>{p.name}</b> · R{v.number}</Link>
        <span className="sub" style={{ display: "block" }}>{versionTitle(v.number)} · {period.fy} {period.quarter} · as on {period.asOnFormatted}</span>
      </td>
    );
  };

  return (
    <Shell me={me} projects={projects} project={null} versions={[]} version={null} tab="approvals">
      <section className="panel">
        <div className="panel-head">
          <h2>Waiting for your signature</h2>
          <span className="sub">{waiting.length ? `${waiting.length} version${waiting.length === 1 ? "" : "s"}` : mine.length ? `${mine.length} pending` : "Nothing waiting for you"}</span>
        </div>
        {waiting.length ? (
          <div className="scroll"><table>
            <thead><tr><th className="label">Budget version</th><th>Your level</th><th>Progress</th><th>Prepared by</th><th className="actions-col">Sign or send back</th></tr></thead>
            <tbody>
              {waiting.map((r) => (
                <tr key={r.v.id}>
                  <VersionCell v={r.v} p={r.p} />
                  <td>{r.next?.title}</td>
                  <td>{r.signed} of {r.total} signed</td>
                  <td>{who(r.v.prepared_by)}</td>
                  <td className="actions">
                    <div className="actions-group">
                      <Link className="btn-action" href={`/budget/${r.p.id}/detail?v=${r.v.number}`}>Read detail</Link>
                      <Link className="btn-action" href={`/budget/${r.p.id}/create?mode=view&v=${r.v.number}`}>View form</Link>
                    </div>
                    <SignoffActions versionId={r.v.id} number={r.v.number} projectId={r.p.id} status={r.v.status} chain={r.chain}
                      mayApprove={D.canApprove(me, r.v)} mayRecall={false} next={r.next ? { title: r.next.title, mine: true } : null} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        ) : (
          <p className="sub">When a budget reaches your sign-off level it appears here.</p>
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>All versions under sign-off</h2>
          <span className="sub">{rows.length} in review</span>
        </div>
        {rows.length ? (
          <div className="scroll"><table>
            <thead><tr><th className="label">Budget version</th><th>Waiting for</th><th>Approvers</th><th>Progress</th><th>Prepared by</th><th className="actions-col">Actions</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.v.id}>
                  <VersionCell v={r.v} p={r.p} />
                  <td><span className="chip warn">{r.next?.title ?? "Sign-off"}</span></td>
                  <td>{r.next ? r.next.approver_ids.map(who).join(", ") : ""}</td>
                  <td>{r.signed} of {r.total}</td>
                  <td>{who(r.v.prepared_by)}</td>
                  <td className="actions">
                    <div className="actions-group">
                      <Link className="btn-action" href={`/budget/${r.p.id}/overview?v=${r.v.number}`}>Open</Link>
                    </div>
                    {!r.mineNext && r.mayRecall && (
                      <SignoffActions versionId={r.v.id} number={r.v.number} projectId={r.p.id} status={r.v.status} chain={r.chain}
                        mayApprove={false} mayRecall next={r.next ? { title: r.next.title, mine: false } : null} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        ) : (
          <p className="sub">No budget is under sign-off. A preparer submits a draft from its Overview.</p>
        )}
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Recent decisions</h2></div>
        {recent.length ? (
          <div className="scroll"><table>
            <thead><tr><th>Date</th><th className="label">Budget version</th><th>What</th><th>Level</th><th>By</th><th className="label-sm">Comment</th></tr></thead>
            <tbody>
              {recent.map((e) => {
                const v = versionById.get(e.version_id);
                const p = v ? projectById.get(v.project_id) : undefined;
                return (
                  <tr key={e.id}>
                    <td>{dmy(e.at)}</td>
                    <td>{v && p ? <Link href={`/budget/${p.id}/overview?v=${v.number}`}>{p.name} · R{v.number}</Link> : "—"}</td>
                    <td><span className={`chip ${e.action === "signed" ? "ok" : e.action === "returned" ? "bad" : ""}`}>{ACTION_LABEL[e.action]}</span></td>
                    <td>{e.level_title}</td>
                    <td>{who(e.user_id)}</td>
                    <td>{e.comment}</td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        ) : (
          <p className="sub">No sign-off activity yet.</p>
        )}
      </section>
    </Shell>
  );
}
