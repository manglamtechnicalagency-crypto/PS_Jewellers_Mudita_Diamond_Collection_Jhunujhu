import sharp from "sharp";
import { deleteObject, getObjectBytes, uploadObject } from "./r2-server";
import { signatureMatches } from "./site-sections";

export interface ProcessedMedia {
  storageKey: string;
  fileSizeBytes: number;
  reviewStatus: "approved" | "pending";
  width?: number;
  height?: number;
}

/** Validates quarantined bytes and rewrites images before they can be public. */
export async function processQuarantinedMedia(
  objectKey: string,
  mimeType: string,
  expectedBytes: number,
): Promise<ProcessedMedia> {
  if (!objectKey.startsWith("quarantine/")) throw new Error("Media was not uploaded to quarantine");
  const bytes = await getObjectBytes(objectKey, expectedBytes);
  if (bytes.byteLength !== expectedBytes) throw new Error("Uploaded media size does not match the request");
  if (!signatureMatches(mimeType, bytes.subarray(0, 32))) throw new Error("Media signature does not match its declared type");

  if (!mimeType.startsWith("image/")) {
    return { storageKey: objectKey, fileSizeBytes: bytes.byteLength, reviewStatus: "pending" };
  }

  const pipeline = sharp(bytes, { failOn: "error", limitInputPixels: 80_000_000 }).rotate();
  let output: Buffer;
  switch (mimeType) {
    case "image/jpeg": output = await pipeline.jpeg({ quality: 88, mozjpeg: true }).toBuffer(); break;
    case "image/png": output = await pipeline.png({ compressionLevel: 9 }).toBuffer(); break;
    case "image/webp": output = await pipeline.webp({ quality: 88 }).toBuffer(); break;
    case "image/avif": output = await pipeline.avif({ quality: 60 }).toBuffer(); break;
    default: throw new Error("Unsupported image type");
  }
  const metadata = await sharp(output).metadata();
  const publishedKey = objectKey.replace(/^quarantine\//, "published/");
  await uploadObject(publishedKey, output, mimeType);
  await deleteObject(objectKey);
  return { storageKey: publishedKey, fileSizeBytes: output.byteLength, reviewStatus: "approved", width: metadata.width, height: metadata.height };
}
