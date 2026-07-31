import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getPublishedCatalogue } from "@/src/lib/catalogue-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const data = await getPublishedCatalogue();
  if (!data)
    return NextResponse.json(
      { data: null },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  const payload = JSON.stringify({ data });
  const etag = `\"${createHash("sha256").update(payload).digest("base64url")}\"`;
  if (request.headers.get("if-none-match") === etag)
    return new NextResponse(null, { status: 304, headers: { ETag: etag, "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300" } });
  return new NextResponse(payload, { headers: { "Content-Type": "application/json; charset=utf-8", ETag: etag, "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300" } });
}
