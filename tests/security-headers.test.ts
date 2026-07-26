import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { buildContentSecurityPolicy, connectSources, imageSources } from "../src/lib/security-headers.ts";

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

function directive(policy: string, name: string): string {
  const found = policy.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name} `));
  assert.ok(found, `${name} directive missing`);
  return found;
}

describe("connectSources", () => {
  it("includes the Supabase origin so admin sign-in is not blocked", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc123.supabase.co";
    const sources = connectSources();
    assert.ok(sources.includes("https://abc123.supabase.co"));
    assert.ok(sources.includes("wss://abc123.supabase.co"));
  });

  it("ignores a malformed Supabase URL rather than throwing", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "not a url";
    delete process.env.SUPABASE_URL;
    assert.doesNotThrow(() => connectSources());
  });
});

describe("imageSources", () => {
  it("includes the R2 public origin when configured", () => {
    process.env.NEXT_PUBLIC_R2_PUBLIC_URL = "https://media.example.com/";
    assert.ok(imageSources().includes("https://media.example.com"));
  });
});

describe("buildContentSecurityPolicy", () => {
  it("drops unsafe-inline from script-src when a nonce is supplied", () => {
    const policy = buildContentSecurityPolicy({ nonce: "abc123" });
    const scriptSrc = directive(policy, "script-src");
    assert.ok(scriptSrc.includes("'nonce-abc123'"));
    assert.ok(scriptSrc.includes("'strict-dynamic'"));
    assert.ok(!scriptSrc.includes("'unsafe-inline'"));
  });

  it("never allows unsafe-eval in production", () => {
    const policy = buildContentSecurityPolicy({ nonce: "abc123", isDevelopment: false });
    assert.ok(!policy.includes("'unsafe-eval'"));
  });

  it("keeps framing and object embedding locked down", () => {
    const policy = buildContentSecurityPolicy({ nonce: "n" });
    assert.ok(policy.includes("frame-ancestors 'none'"));
    assert.ok(policy.includes("object-src 'none'"));
    assert.ok(policy.includes("base-uri 'self'"));
    assert.ok(policy.includes("form-action 'self'"));
  });
});
