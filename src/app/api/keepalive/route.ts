import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * Called once a day by a Vercel cron (see vercel.json) so the free Supabase
 * project never sits idle for a week and gets paused.
 * A tiny read is enough to count as activity; it returns no data.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Vercel sends "Authorization: Bearer <CRON_SECRET>" when that variable is set.
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const { error } = await supabase.from("documents").select("id", { head: true, count: "exact" }).limit(1);
  return NextResponse.json({ ok: !error, at: new Date().toISOString(), ...(error ? { error: error.message } : {}) }, { status: error ? 500 : 200 });
}
