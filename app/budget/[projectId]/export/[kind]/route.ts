import * as D from "@/lib/budget/data";
import { billsExport, billsWorkbook, detailExport, detailWorkbook, summaryExport, summaryWorkbook, workingsExport, workingsWorkbook } from "@/lib/budget/export";
import { latestNote } from "@/lib/budget/insights";

export const dynamic = "force-dynamic";

// Excel downloads in the company's formats: /budget/<project>/export/detail?v=<version number>
// /budget/<project>/export/summary?v=<version number> and /budget/<project>/export/workings?v=<version number>
// (tower workings) and /budget/<project>/export/bills?v=<version number> (bills up to the version's as-on month).
// Needs the "Export reports" right.
export async function GET(req: Request, { params }: { params: Promise<{ projectId: string; kind: string }> }) {
  const { projectId, kind } = await params;
  if (kind !== "detail" && kind !== "summary" && kind !== "workings" && kind !== "bills") return new Response("Not found", { status: 404 });
  const { sb, me } = await D.getSession();
  if (!me) return new Response("Sign in to download budget reports", { status: 401 });
  const project = (await D.getProjects(sb)).find((p) => String(p.id) === projectId);
  if (!project) return new Response("Project not found", { status: 404 });
  if (!D.can(me, "report.export", project.id)) return new Response("You do not have the Export reports right for this project", { status: 403 });
  const versions = await D.getVersions(sb, project.id);
  const wanted = new URL(req.url).searchParams.get("v");
  const v = versions.find((x) => String(x.number) === wanted) ?? versions[versions.length - 1];
  if (!v) return new Response("This project has no budget version yet", { status: 404 });
  const names = await D.getMemberNames(sb);

  const file = kind === "detail" ? await detailWorkbook(await detailExport(sb, project, v, names))
    : kind === "workings" ? await workingsWorkbook(await workingsExport(sb, project, v))
    : kind === "bills" ? await billsWorkbook(await billsExport(sb, project, v))
    : await summaryWorkbook(await summaryExport(sb, project, v, versions, names, (await latestNote(sb, v.id))?.body ?? null));
  const date = v.as_on.slice(0, 10).split("-").reverse().join("-");
  const name = `${project.name} ${kind === "detail" ? "Detail Budget" : kind === "workings" ? "Tower Workings" : kind === "bills" ? "Bills" : "Budget Summary"} R${v.number} as on ${date}.xlsx`;
  return new Response(file as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${name.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "")}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "no-store",
    },
  });
}
