import { checkServerPermission } from "@/lib/permissions";
import { AccessRestricted } from "@/components/errors/AccessRestricted";
import TicketReportsClient from "@/components/tickets/TicketReportsClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TicketReportsPage() {
  const canView =
    (await checkServerPermission("SUPER_ADMIN")) ||
    (await checkServerPermission("TICKETS_VIEW")) ||
    (await checkServerPermission("TICKETS_MANAGE"));

  if (!canView) {
    return (
      <AccessRestricted
        requiredRole="Ticket user"
        requiredPermission="TICKETS_VIEW"
        moduleName="Tickets"
      />
    );
  }

  return (
    <div className="w-full space-y-3 animate-in fade-in-50 duration-150">
      <header className="pb-1">
        <h1 className="text-[20px] sm:text-[22px] font-semibold tracking-[-0.01em] text-heading ">Ticket reports</h1>
        <p className="text-sm text-subtle">All tickets you can see, with filters, column choice and Excel / PDF export.</p>
      </header>
      <main>
        <TicketReportsClient />
      </main>
    </div>
  );
}
