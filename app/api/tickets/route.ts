import { NextRequest, NextResponse } from "next/server";
import { fetchTicketDashboardData } from "@/lib/actions/tickets";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filters = {
      searchQuery: searchParams.get("searchQuery") || undefined,
      status_id: searchParams.get("status_id") || undefined,
      priority_id: searchParams.get("priority_id") || undefined,
      scope_id: searchParams.get("scope_id") || undefined,
    };
    const data = await fetchTicketDashboardData(filters);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[api/tickets] Error fetching dashboard data:", err);
    return NextResponse.json({ error: err.message, tickets: [] }, { status: 200 });
  }
}
