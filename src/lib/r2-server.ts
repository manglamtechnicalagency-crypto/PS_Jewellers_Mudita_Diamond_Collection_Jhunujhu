import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * SERVER-ONLY. This file reads private R2_* environment variables. Import it
 * only from route handlers under app/api/ or from Server Components — never
 * from a file carrying "use client", and never from anything reachable through
 * a client component's import graph. Importing this in client code would either
 * crash (env vars are undefined in the browser) or, worse, leak credentials into
 * the bundle if someone "fixes" that crash by hardcoding values.
 *
 * Current server-side callers: app/api/admin/media/*, app/api/admin/products/,
 * and the admin product Server Components (which use publicObjectUrl only).
 *
 * R2 is S3-compatible, so the AWS SDK v3 works as-is against R2's endpoint.
 */

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var ${name}. Set it in your Vercel project settings or local .env (see .env.example).`);
  }
  return value;
}

let client: S3Client | null = null;

function getR2Client(): S3Client {
  if (client) return client;

  const accountId = getEnv("R2_ACCOUNT_ID");
  client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: getEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: getEnv("R2_SECRET_ACCESS_KEY"),
    },
  });
  return client;
}

/**
 * Returns a short-lived, single-object presigned PUT URL. The browser
 * uploads directly to R2 using this URL — the file bytes never pass through
 * our own server, only the small presigned-URL request does.
 */
export async function createUploadUrl(
  objectKey: string,
  contentType: string,
  contentLength: number,
  expiresInSeconds = 300,
): Promise<string> {
  const bucket = getEnv("R2_BUCKET_NAME");
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: objectKey,
    ContentType: contentType,
    ContentLength: contentLength,
  });
  return getSignedUrl(getR2Client(), command, { expiresIn: expiresInSeconds });
}

export async function uploadObject(
  objectKey: string,
  body: Uint8Array,
  contentType: string,
): Promise<void> {
  const bucket = getEnv("R2_BUCKET_NAME");
  await getR2Client().send(new PutObjectCommand({
    Bucket: bucket,
    Key: objectKey,
    Body: body,
    ContentType: contentType,
    ContentLength: body.byteLength,
  }));
}

export async function deleteObject(objectKey: string): Promise<void> {
  const bucket = getEnv("R2_BUCKET_NAME");
  await getR2Client().send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey }));
}

export function publicObjectUrl(objectKey: string): string | null {
  const base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.replace(/\/$/, "");
  return base ? `${base}/${objectKey.split("/").map(encodeURIComponent).join("/")}` : null;
}
