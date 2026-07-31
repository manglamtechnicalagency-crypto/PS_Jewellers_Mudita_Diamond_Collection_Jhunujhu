import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readJsonWithLimit } from "../src/lib/request-body.ts";

describe("readJsonWithLimit", () => {
  it("parses a body under the byte limit", async () => {
    const result = await readJsonWithLimit(new Request("https://example.test", {
      method: "POST",
      body: JSON.stringify({ name: "PS Jewellers" }),
    }), 1_000);
    assert.deepEqual(result, { ok: true, value: { name: "PS Jewellers" } });
  });

  it("rejects a chunked body that exceeds the limit", async () => {
    const result = await readJsonWithLimit(new Request("https://example.test", {
      method: "POST",
      body: JSON.stringify({ message: "x".repeat(2_000) }),
    }), 100);
    assert.deepEqual(result, { ok: false, reason: "too_large" });
  });

  it("rejects malformed JSON", async () => {
    const result = await readJsonWithLimit(new Request("https://example.test", {
      method: "POST",
      body: "not-json",
    }), 100);
    assert.deepEqual(result, { ok: false, reason: "invalid_json" });
  });
});
