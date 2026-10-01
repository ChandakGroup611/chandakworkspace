import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function KnowledgeRedirectPage() {
  redirect("/knowledge/articles");
}
