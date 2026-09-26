import { supabase } from "./supabase";

/** Supabase auth client (kept under the old name so callers read the same). */
export const auth = supabase.auth;

/** Signs out and clears the local "logged in" marker used by the idle-logout timer. */
export async function signOut(_auth: typeof auth = auth) {
  await supabase.auth.signOut();
  try { localStorage.removeItem("authenticatedUser"); } catch {}
}

/** Access token of the current session, for server actions that act as the user. */
export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
