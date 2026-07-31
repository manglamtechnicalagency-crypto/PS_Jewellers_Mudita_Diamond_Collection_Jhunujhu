import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/src/lib/supabase/service";
import { publicObjectUrl } from "@/src/lib/r2-server";
import { SITE_SECTION_KEYS, type SectionMediaMap } from "@/src/lib/site-sections";

export const dynamic = "force-dynamic";

/**
 * Admin-assigned storefront section images.
 *
 * Publication rule matches the badge shown in Admin → Media: a media row is
 * live for a section when it carries that `section_key` and `is_active` is
 * true. Only keys declared in `SITE_SECTIONS` are returned, so a stale or
 * hand-edited `section_key` can never inject an image into a slot the
 * storefront does not know about.
 *
 * The newest active row wins when several are assigned to one slot, which lets
 * an admin re-upload without first clearing the previous image.
 */
export async function GET() {
  const empty = NextResponse.json(
    { data: {} as SectionMediaMap },
    { headers: { "Cache-Control": "no-store" } },
  );
  const client = createSupabaseServiceClient();
  if (!client) return empty;

  const { data, error } = await client
    .from("media")
    .select("storage_key, alt_text, title, mime_type, section_key, created_at")
    .in("section_key", SITE_SECTION_KEYS)
    .eq("is_active", true)
    // Matches the admin publish path, which approves on assignment. A pending
    // or rejected asset must never reach the storefront.
    .eq("review_status", "approved")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[public-site-media] load_failed", { errorName: error.name });
    // A CMS outage must not blank the storefront: every slot falls back to its
    // bundled asset when this map is empty.
    return empty;
  }

  const sections: SectionMediaMap = {};
  for (const row of data ?? []) {
    const key = row.section_key;
    if (!key || sections[key]) continue; // First row wins: newest created_at.
    const url = publicObjectUrl(row.storage_key);
    if (!url) continue;
    sections[key] = {
      url,
      alt: row.alt_text || row.title || "",
      mimeType: row.mime_type,
    };
  }

  return NextResponse.json({ data: sections }, { headers: { "Cache-Control": "no-store" } });
}
