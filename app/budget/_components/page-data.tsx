import * as D from "@/lib/budget/data";
import { Notice } from "./shell";

// Signed-in user and their budget role; the screens show a message instead when either is missing.
export async function loadSession() {
  const s = await D.getSession();
  if (!s.signedIn) return { ...s, block: <main className="wrap"><Notice>Sign in to the application to use the budget module.</Notice></main> };
  if (!s.me) return { ...s, block: <main className="wrap"><Notice>Your account does not have access to the budget module yet. An administrator adds you as a budget member.</Notice></main> };
  return { ...s, block: null };
}
