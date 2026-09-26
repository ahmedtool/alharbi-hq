import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  // Fail loudly at startup instead of with confusing network errors later.
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env.local and fill them in."
  );
}

/** Browser client: keeps the signed-in session in localStorage. */
export const supabase: SupabaseClient = createClient(url, key, {
  auth: { persistSession: typeof window !== "undefined", autoRefreshToken: typeof window !== "undefined" },
});

/**
 * Server-side client that acts as the signed-in user, so the database
 * security rules (RLS) apply exactly as they do in the browser.
 * Pass the access token from `supabase.auth.getSession()` on the client.
 */
export function supabaseForToken(accessToken: string): SupabaseClient {
  return createClient(url!, key!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

/** Resolves the user behind an access token, or null if it is invalid. */
export async function userForToken(accessToken: string | undefined | null) {
  if (!accessToken) return null;
  const { data, error } = await supabaseForToken(accessToken).auth.getUser(accessToken);
  return error ? null : data.user;
}
