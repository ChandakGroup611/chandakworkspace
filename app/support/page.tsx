import { SelfServicePortal } from "@/components/tickets/SelfServicePortal";
import { fetchTicketDashboardData } from "@/lib/actions/tickets";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My IT support",
  description: "End-user support portal",
};

export default async function SupportPage() {
  let initialData = null;
  try {
    initialData = await fetchTicketDashboardData();
  } catch (e) {
    console.error("[SupportPage] Failed to fetch initial ticket data:", e);
  }

  return <SelfServicePortal initialData={initialData} />;
}
