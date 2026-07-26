import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { consumeUploadRateLimit, getTrustedClientKey } from "../src/lib/upload-rate-limit.ts";

const originalEnv = { ...process.env };

// Restore by mutating keys. Reassigning `process.env` swaps the object out and
// any cached reference to it stops affecting the real environment.
function restoreEnv() {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) delete process.env[key];
  }
  Object.assign(process.env, originalEnv);
}

afterEach(restoreEnv);

// `process.env.NODE_ENV` is declared readonly by @types/node; tests need to
// exercise the production branch, so write through a widened view.
const env = process.env as Record<string, string | undefined>;

function request(headers: Record<string, string> = {}): Request {
  return new Request("https://example.com/api/r2-presign", { method: "POST", headers });
}

describe("getTrustedClientKey", () => {
  it("uses platform-supplied headers", () => {
    const result = getTrustedClientKey(request({ "x-vercel-forwarded-for": "203.0.113.7" }));
    assert.equal(result.trusted, true);
    assert.equal(result.key, "203.0.113.7");
  });

  it("ignores client-supplied x-forwarded-for", () => {
    env.NODE_ENV = "production";
    const result = getTrustedClientKey(request({ "x-forwarded-for": "1.2.3.4" }));
    assert.equal(result.trusted, false, "spoofable header must not create a bucket");
  });

  it("fails closed in production when no trusted header is present", () => {
    env.NODE_ENV = "production";
    const result = getTrustedClientKey(request());
    assert.equal(result.trusted, false);
    assert.equal(result.key, null);
  });

  it("allows an explicit opt-in for platforms without a client header", () => {
    env.NODE_ENV = "production";
    env.R2_UPLOAD_RATE_LIMIT_TRUST_UNIDENTIFIED = "true";
    const result = getTrustedClientKey(request());
    assert.equal(result.trusted, true);
  });
});

describe("consumeUploadRateLimit", () => {
  it("limits only after the configured maximum is exceeded", async () => {
    env.R2_UPLOAD_RATE_LIMIT_MAX_REQUESTS = "3";
    env.R2_UPLOAD_RATE_LIMIT_WINDOW_SECONDS = "60";
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const key = `test-${Math.random()}`;
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await consumeUploadRateLimit(key));

    assert.deepEqual(
      results.map((r) => r.limited),
      [false, false, false, true],
    );
  });

  it("keeps separate buckets per client", async () => {
    env.R2_UPLOAD_RATE_LIMIT_MAX_REQUESTS = "1";
    const a = `a-${Math.random()}`;
    const b = `b-${Math.random()}`;

    await consumeUploadRateLimit(a);
    const secondForA = await consumeUploadRateLimit(a);
    const firstForB = await consumeUploadRateLimit(b);

    assert.equal(secondForA.limited, true);
    assert.equal(firstForB.limited, false);
  });

  it("reports that the in-memory limiter is not durable", async () => {
    const result = await consumeUploadRateLimit(`durability-${Math.random()}`);
    assert.equal(result.durable, false);
  });
});
