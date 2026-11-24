import { redirect } from "next/navigation";

/** Old "Points & tasks" page: points and tasks now each have their own list page. */
export default async function OldPointsAndTasks({ searchParams }: { searchParams: Promise<{ tab?: string; view?: string; search?: string }> }) {
  const sp = await searchParams;
  if (sp.tab === "tasks") redirect("/meet/tasks?show=mine");
  const map: Record<string, string> = { mine: "show=mine", meetings: "show=meetings", overdue: "due=overdue", carried: "carried=3", closed: "status=closed" };
  const q = [map[sp.view || ""] || "", sp.search ? `q=${encodeURIComponent(sp.search)}` : ""].filter(Boolean).join("&");
  const base = "/meet/points";
  redirect(q ? `${base}?${q}` : base);
}
