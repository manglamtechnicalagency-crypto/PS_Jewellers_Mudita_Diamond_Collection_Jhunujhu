import { NextResponse } from "next/server";
import { getPublishedCatalogue } from "@/src/lib/catalogue-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getPublishedCatalogue();
  if (!data)
    return NextResponse.json(
      { data: null },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  return NextResponse.json(
    { data },
    { headers: { "Cache-Control": "no-store" } },
  );
}
