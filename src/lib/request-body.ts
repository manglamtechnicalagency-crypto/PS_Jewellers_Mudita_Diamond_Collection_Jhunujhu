export type JsonBodyResult =
  | { ok: true; value: unknown }
  | { ok: false; reason: "too_large" | "invalid_json" };

export type FormBodyResult =
  | { ok: true; value: FormData }
  | { ok: false; reason: "too_large" | "invalid_form" };

async function readBytesWithLimit(request: Request, maxBytes: number): Promise<Uint8Array | null> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null) {
    const parsedLength = Number(declaredLength);
    if (!Number.isSafeInteger(parsedLength) || parsedLength < 0 || parsedLength > maxBytes) {
      return null;
    }
  }

  if (!request.body) return new Uint8Array();

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return bytes;
}

/** Reads JSON with a hard byte ceiling, including chunked requests. */
export async function readJsonWithLimit(request: Request, maxBytes: number): Promise<JsonBodyResult> {
  const bytes = await readBytesWithLimit(request, maxBytes);
  if (!bytes) return { ok: false, reason: "too_large" };
  try {
    return { ok: true, value: JSON.parse(new TextDecoder().decode(bytes)) };
  } catch {
    return { ok: false, reason: "invalid_json" };
  }
}

/** Buffers multipart data only after enforcing a hard request ceiling. */
export async function readFormDataWithLimit(request: Request, maxBytes: number): Promise<FormBodyResult> {
  const bytes = await readBytesWithLimit(request, maxBytes);
  if (!bytes) return { ok: false, reason: "too_large" };
  const contentType = request.headers.get("content-type");
  if (!contentType) return { ok: false, reason: "invalid_form" };
  try {
    const boundedRequest = new Request("http://localhost/upload", {
      method: "POST",
      headers: { "Content-Type": contentType },
      body: new Uint8Array(bytes),
    });
    return { ok: true, value: await boundedRequest.formData() };
  } catch {
    return { ok: false, reason: "invalid_form" };
  }
}
