import { cookies } from "next/headers";
import { createClient as createWorkspaceClient } from "@/utils/supabase/server";

// The budget module uses the workspace's own Supabase client, signed in as the current user, so Row
// Level Security decides what each person may read and change.
export async function createClient() {
  return createWorkspaceClient(await cookies());
}
