import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { hasPermission } from "@/lib/permissions";
import { supabaseAdmin } from "@/lib/supabase/service_role";

export const dynamic = "force-dynamic";

// Only AMC tables may be written through this endpoint (it used to accept any table name from the browser).
function isAmcTable(name: unknown): name is string {
  return typeof name === "string" && (name === "software_amc" || /^amc_[a-z_]+$/.test(name));
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized: Please log in." }, { status: 401 });
    }

    const body = await request.json();
    const { tableName, payload, editId } = body;

    if (!tableName || !payload) {
      return NextResponse.json({ success: false, error: "Missing tableName or payload." }, { status: 400 });
    }
    if (!isAmcTable(tableName)) {
      return NextResponse.json({ success: false, error: "This endpoint only saves AMC records." }, { status: 400 });
    }

    const isSuperAdmin = await hasPermission(user.id, "SUPER_ADMIN");
    const requiredPerm = editId ? "AMC_EDIT" : "AMC_CREATE";
    const hasPerm =
      isSuperAdmin ||
      (await hasPermission(user.id, requiredPerm)) ||
      (editId ? await hasPermission(user.id, "AMC_UPDATE") : false) ||
      (await hasPermission(user.id, "AMC_MANAGE"));

    if (!hasPerm) {
      return NextResponse.json({ success: false, error: `Forbidden: Missing ${requiredPerm} permission.` }, { status: 403 });
    }

    const tablesWithoutUpdatedAt = [
      "amc_invoices",
      "amc_transactions",
      "amc_renewals",
      "amc_license_allocations"
    ];

    let res;
    if (editId) {
      const updatePayload = { ...payload };
      if (!tablesWithoutUpdatedAt.includes(tableName)) {
        updatePayload.updated_at = new Date().toISOString();
      }

      // Permission was checked above; write with the service role so the user's row policies can't
      // silently block the save ("Cannot coerce the result to a single JSON object").
      res = await supabaseAdmin
        .from(tableName)
        .update(updatePayload)
        .eq("id", editId)
        .select()
        .single();
    } else {
      res = await supabaseAdmin
        .from(tableName)
        .insert([payload])
        .select()
        .single();
    }

    if (res.error) {
      return NextResponse.json({ success: false, error: res.error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: res.data });
  } catch (err: any) {
    console.error("[AMC API POST Error]:", err);
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized: Please log in." }, { status: 401 });
    }

    const body = await request.json();
    const { tableName, id, hardDelete } = body;

    if (!tableName || !id) {
      return NextResponse.json({ success: false, error: "Missing tableName or id." }, { status: 400 });
    }
    if (!isAmcTable(tableName)) {
      return NextResponse.json({ success: false, error: "This endpoint only deletes AMC records." }, { status: 400 });
    }

    const isSuperAdmin = await hasPermission(user.id, "SUPER_ADMIN");
    const hasDeletePerm = isSuperAdmin || (await hasPermission(user.id, "AMC_DELETE")) || (await hasPermission(user.id, "AMC_MANAGE"));

    if (!hasDeletePerm) {
      return NextResponse.json({ success: false, error: "Forbidden: Missing AMC_DELETE permission." }, { status: 403 });
    }
    if (hardDelete && !isSuperAdmin) {
      return NextResponse.json({ success: false, error: "Only a Super Admin can permanently delete AMC records." }, { status: 403 });
    }

    const tablesWithoutUpdatedAt = [
      "amc_invoices",
      "amc_transactions",
      "amc_renewals",
      "amc_license_allocations"
    ];

    if (tableName === "software_amc" && !hardDelete) {
      const { data: activeTx } = await supabaseAdmin
        .from("amc_transactions")
        .select("id")
        .eq("amc_id", id)
        .eq("is_deleted", false)
        .limit(1);

      if (activeTx && activeTx.length > 0) {
        return NextResponse.json({ success: false, error: "Cannot delete AMC because it has active transactions." }, { status: 400 });
      }

      const { data: activeInv } = await supabaseAdmin
        .from("amc_invoices")
        .select("id")
        .eq("amc_id", id)
        .limit(1);

      if (activeInv && activeInv.length > 0) {
        return NextResponse.json({ success: false, error: "Cannot delete AMC because it has active invoices." }, { status: 400 });
      }
    }

    let res;
    if (hardDelete) {
      res = await supabaseAdmin.from(tableName).delete().eq("id", id);
    } else {
      const updatePayload: any = { is_deleted: true };
      if (!tablesWithoutUpdatedAt.includes(tableName)) {
        updatePayload.updated_at = new Date().toISOString();
      }
      if (tableName === "software_amc") {
        updatePayload.deleted_by = user.id;
        updatePayload.deleted_at = new Date().toISOString();
      }
      res = await supabaseAdmin.from(tableName).update(updatePayload).eq("id", id);
    }

    if (res.error) {
      return NextResponse.json({ success: false, error: res.error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[AMC API DELETE Error]:", err);
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 });
  }
}
