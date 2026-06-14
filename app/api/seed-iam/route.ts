import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const PERMS_TO_SEED = [];

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase.from("permissions").upsert(PERMS_TO_SEED, { onConflict: "code" });
  const { error: updateError } = await supabase.from("permissions").update({ action: "VIEW" }).eq("code", "AUDIT_READ");

  if (error) {
    return NextResponse.json({ success: false, error: error.message });
  }

  return NextResponse.json({ success: true, message: "Seeded " + PERMS_TO_SEED.length + " IAM permissions successfully.", updateError });
}
