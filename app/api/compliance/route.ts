import { NextRequest, NextResponse } from "next/server";
import { 
  fetchComplianceWorkspaces, 
  fetchComplianceTasks, 
  fetchComplianceRequirements,
  fetchComplianceTickets,
  fetchComplianceAmc,
  fetchComplianceMaster,
  restoreEntity,
  hardDeleteEntity
} from "@/lib/actions/compliance";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tab = searchParams.get("tab") || "workspaces";
    const isDeleted = searchParams.get("deleted") === "true";
    const entity = searchParams.get("entity");
    const nameKey = searchParams.get("nameKey") || "name";
    const codeKey = searchParams.get("codeKey") || "code";

    let data: any[] = [];
    if (tab === "workspaces") {
      data = await fetchComplianceWorkspaces(isDeleted);
    } else if (tab === "tasks") {
      data = await fetchComplianceTasks(isDeleted);
    } else if (tab === "tickets") {
      data = await fetchComplianceTickets(isDeleted);
    } else if (tab === "requirements") {
      data = await fetchComplianceRequirements(isDeleted);
    } else if (tab === "software_amc") {
      data = await fetchComplianceAmc(isDeleted);
    } else if (entity) {
      data = await fetchComplianceMaster(entity as any, nameKey, codeKey, isDeleted);
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[/api/compliance GET Error]:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch compliance records" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, entity, ids, typedConfirm } = body;

    if (action === "restore") {
      const result = await restoreEntity(entity, ids);
      return NextResponse.json(result);
    }

    if (action === "purge") {
      const result = await hardDeleteEntity(entity, ids);
      return NextResponse.json(result);
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("[/api/compliance POST Error]:", err);
    return NextResponse.json({ success: false, error: err.message || "Operation failed" }, { status: 500 });
  }
}
