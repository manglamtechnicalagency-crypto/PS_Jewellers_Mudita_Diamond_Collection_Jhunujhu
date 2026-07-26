import { NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/admin-auth";

export async function GET() {
  const auth = await requireAdmin(["super_admin", "admin"]);
  if (auth.error === "not_configured")
    return NextResponse.json(
      { error: { message: "Admin storage is not configured" } },
      { status: 503 },
    );
  if (auth.error !== null)
    return NextResponse.json(
      { error: { message: "Authentication is required" } },
      { status: auth.error === "forbidden" ? 403 : 401 },
    );
  const { data, error } = await auth.client
    .from("audit_logs")
    .select(
      "id, action, entity_type, entity_id, previous_value, new_value, actor_id, created_at, profiles(display_name)",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (error)
    return NextResponse.json(
      { error: { message: "Audit log could not be loaded" } },
      { status: 500 },
    );
  return NextResponse.json(
    { data },
    { headers: { "Cache-Control": "no-store" } },
  );
}
