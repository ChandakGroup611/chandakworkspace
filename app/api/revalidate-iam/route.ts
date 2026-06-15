import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function GET() {
  revalidatePath("/iam");
  revalidatePath("/iam/cockpit");
  revalidatePath("/workspaces");
  revalidatePath("/tasks");
  return NextResponse.json({ success: true, message: "Paths revalidated" });
}
