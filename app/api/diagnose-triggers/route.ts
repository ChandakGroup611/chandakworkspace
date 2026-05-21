import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Query triggers and their definition
  const { data: triggers, error: triggerError } = await supabase.rpc("execute_sql", {
    sql_query: `
      SELECT 
        trg.tgname AS trigger_name,
        tbl.relname AS table_name,
        ns.nspname AS schema_name,
        proc.proname AS function_name,
        pg_get_triggerdef(trg.oid) AS trigger_definition
      FROM pg_trigger trg
      JOIN pg_class tbl ON trg.tgrelid = tbl.oid
      JOIN pg_namespace ns ON tbl.relnamespace = ns.oid
      JOIN pg_proc proc ON trg.tgfoid = proc.oid
      WHERE ns.nspname = 'public' AND NOT trg.tgisinternal;
    `
  });

  // If RPC is not available, try raw query or direct select
  if (triggerError) {
    return NextResponse.json({ 
      error: "RPC execute_sql failed", 
      details: triggerError 
    });
  }

  return NextResponse.json({ triggers });
}
