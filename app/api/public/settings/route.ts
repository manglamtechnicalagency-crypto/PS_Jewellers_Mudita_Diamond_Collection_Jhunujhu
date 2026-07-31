import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/src/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const client = createSupabaseServiceClient();
  if (!client) return NextResponse.json({ data: null }, { headers: { "Cache-Control": "no-store" } });
  const { data, error } = await client.from("site_settings").select("setting_key, value").eq("is_public", true);
  if (error) {
    console.error("[public-settings] load_failed", { errorName: error.name });
    return NextResponse.json({ data: null }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json({ data: Object.fromEntries((data ?? []).map((item) => [item.setting_key, item.value])) }, { headers: { "Cache-Control": "no-store" } });
}
