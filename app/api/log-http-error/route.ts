import { type NextRequest, NextResponse } from "next/server";
import { logHttpError } from "@/lib/errors/http-error-logger";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { status = 500, method = "GET", path = "/", source = "app", errorMessage, errorStack, metadata } = body;

    let userId: string | null = null;
    try {
      const cookieStore = await cookies();
      const supabase = createClient(cookieStore);
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    } catch {
      // Ignore session errors
    }

    const referrer = req.headers.get("referer") || undefined;

    await logHttpError({
      status: Number(status) || 500,
      method: String(method || "GET"),
      path: String(path || "/"),
      userId,
      referrer,
      source: ["app", "server-firewall", "storage"].includes(source) ? source : "app",
      errorMessage: errorMessage ? String(errorMessage) : undefined,
      errorStack: errorStack ? String(errorStack) : undefined,
      metadata: typeof metadata === "object" ? metadata : {}
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
