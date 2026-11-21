import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function BudgetMastersRedirect({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const sp = searchParams ? await searchParams : {};
  const section = sp.section ? `?section=${encodeURIComponent(sp.section)}` : "";
  redirect(`/budget/admin/masters${section}`);
}
