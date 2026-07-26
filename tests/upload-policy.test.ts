import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MAX_UPLOAD_BYTES,
  extensionForContentType,
  isUploadValidationError,
  validateUploadRequest,
} from "../src/lib/upload-policy.ts";

describe("validateUploadRequest", () => {
  it("accepts a well-formed request", () => {
    const result = validateUploadRequest({ contentType: "image/png", fileSize: 1024 });
    assert.equal(isUploadValidationError(result), false);
  });

  it("rejects unsupported media types", () => {
    for (const contentType of ["image/svg+xml", "text/html", "application/pdf", "image/gif"]) {
      const result = validateUploadRequest({ contentType, fileSize: 1024 });
      assert.ok(isUploadValidationError(result), `${contentType} should be rejected`);
      if (isUploadValidationError(result)) assert.equal(result.status, 415);
    }
  });

  it("rejects extra properties so the body shape cannot be widened", () => {
    const result = validateUploadRequest({ contentType: "image/png", fileSize: 1024, objectKey: "../../etc/passwd" });
    assert.ok(isUploadValidationError(result));
  });

  it("rejects prototype-pollution style content types", () => {
    for (const contentType of ["__proto__", "constructor", "toString"]) {
      const result = validateUploadRequest({ contentType, fileSize: 1 });
      assert.ok(isUploadValidationError(result), `${contentType} should be rejected`);
    }
  });

  it("rejects non-positive, fractional, and unsafe file sizes", () => {
    for (const fileSize of [0, -1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 2, "1024"]) {
      const result = validateUploadRequest({ contentType: "image/jpeg", fileSize });
      assert.ok(isUploadValidationError(result), `${String(fileSize)} should be rejected`);
    }
  });

  it("enforces the size ceiling at the boundary", () => {
    assert.equal(isUploadValidationError(validateUploadRequest({ contentType: "image/webp", fileSize: MAX_UPLOAD_BYTES })), false);
    const tooLarge = validateUploadRequest({ contentType: "image/webp", fileSize: MAX_UPLOAD_BYTES + 1 });
    assert.ok(isUploadValidationError(tooLarge));
    if (isUploadValidationError(tooLarge)) assert.equal(tooLarge.status, 413);
  });

  it("rejects non-object bodies", () => {
    for (const body of [null, undefined, [], "string", 42]) {
      assert.ok(isUploadValidationError(validateUploadRequest(body)));
    }
  });
});

describe("extensionForContentType", () => {
  it("maps every supported type to a safe extension", () => {
    assert.equal(extensionForContentType("image/jpeg"), "jpg");
    assert.equal(extensionForContentType("image/png"), "png");
    assert.equal(extensionForContentType("image/webp"), "webp");
    assert.equal(extensionForContentType("image/avif"), "avif");
  });

  it("never yields path separators", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp", "image/avif"] as const) {
      const ext = extensionForContentType(type);
      assert.ok(!ext.includes("/") && !ext.includes("\\") && !ext.includes(".."));
    }
  });
});
