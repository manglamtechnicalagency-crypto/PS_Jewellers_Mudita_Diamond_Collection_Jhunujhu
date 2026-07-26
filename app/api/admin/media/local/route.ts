import { readdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/admin-auth";

const MIME_TYPES: Record<string, string> = {
  ".avif": "image/avif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
};

async function collectAssets(directory: string, relativeDirectory = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const assets: Array<{ id: string; filename: string; public_url: string; mime_type: string; source: "bundled" }> = [];
  for (const entry of entries) {
    const relativePath = path.join(relativeDirectory, entry.name);
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      assets.push(...await collectAssets(absolutePath, relativePath));
      continue;
    }
    const extension = path.extname(entry.name).toLowerCase();
    const mimeType = MIME_TYPES[extension];
    if (!mimeType) continue;
    const publicPath = relativePath.split(path.sep).map(encodeURIComponent).join("/");
    assets.push({ id: `bundled:${relativePath}`, filename: entry.name, public_url: `/assets/${publicPath}`, mime_type: mimeType, source: "bundled" });
  }
  return assets;
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error === "not_configured") return NextResponse.json({ error: { code: "not_configured", message: "Admin storage is not configured" } }, { status: 503 });
  if (auth.error === "unauthorized" || auth.error === "mfa_required") return NextResponse.json({ error: { code: "unauthorized", message: "Authentication is required" } }, { status: 401 });
  if (auth.error === "forbidden") return NextResponse.json({ error: { code: "forbidden", message: "You do not have permission to view media" } }, { status: 403 });
  if (auth.error) return NextResponse.json({ error: { code: "internal_error", message: "Media could not be loaded" } }, { status: 500 });

  try {
    const data = await collectAssets(path.join(process.cwd(), "public", "assets"));
    return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[admin-media-local] failed", { errorName: error instanceof Error ? error.name : "UnknownError" });
    return NextResponse.json({ error: { code: "filesystem_error", message: "Bundled media could not be loaded" } }, { status: 500 });
  }
}
