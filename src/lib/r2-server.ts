import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * SERVER-ONLY. This file reads private R2_* environment variables and must
 * only ever be imported from files under /api — never from anything under
 * src/. Importing this in client code would either crash (env vars are
 * undefined in the browser) or, worse, leak credentials into the bundle if
 * someone "fixes" that crash by hardcoding values. Browser code must never
 * receive R2 credentials or the admin credential used by the presign route.
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

export async function deleteObject(objectKey: string): Promise<void> {
  const bucket = getEnv("R2_BUCKET_NAME");
  await getR2Client().send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey }));
}
