import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hasValidSameOrigin } from "../src/lib/request-origin.ts";

function request(headers: Record<string, string>): Request {
  return new Request("https://shop.example.com/api/admin/products", { method: "POST", headers });
}

describe("hasValidSameOrigin", () => {
  it("accepts a matching origin", () => {
    assert.equal(hasValidSameOrigin(request({ origin: "https://shop.example.com" })), true);
  });

  it("rejects a cross-site origin", () => {
    assert.equal(hasValidSameOrigin(request({ origin: "https://evil.example.com" })), false);
  });

  it("rejects a look-alike origin", () => {
    assert.equal(hasValidSameOrigin(request({ origin: "https://shop.example.com.evil.net" })), false);
  });

  it("rejects a scheme downgrade", () => {
    assert.equal(hasValidSameOrigin(request({ origin: "http://shop.example.com" })), false);
  });

  it("rejects cross-site when only Sec-Fetch-Site is present", () => {
    assert.equal(hasValidSameOrigin(request({ "sec-fetch-site": "cross-site" })), false);
    assert.equal(hasValidSameOrigin(request({ "sec-fetch-site": "same-site" })), false);
  });

  it("accepts same-origin Sec-Fetch-Site without an Origin header", () => {
    assert.equal(hasValidSameOrigin(request({ "sec-fetch-site": "same-origin" })), true);
    assert.equal(hasValidSameOrigin(request({ "sec-fetch-site": "none" })), true);
  });
});
