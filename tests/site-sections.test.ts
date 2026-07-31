import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SITE_SECTIONS,
  SITE_SECTION_KEYS,
  findSiteSection,
  signatureMatches,
  siteSectionGroups,
  validateSectionUpload,
} from "../src/lib/site-sections.ts";

const hero = findSiteSection("home.hero.poster")!;
const goldBanner = findSiteSection("home.gold-banner")!;
const heroVideo = findSiteSection("home.hero.video")!;

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe("site section config", () => {
  it("every declared key is unique and non-empty", () => {
    assert.equal(new Set(SITE_SECTION_KEYS).size, SITE_SECTION_KEYS.length);
    assert.ok(SITE_SECTION_KEYS.every((key) => key.length > 0));
  });

  it("every section declares limits the admin UI can display", () => {
    for (const section of SITE_SECTIONS) {
      assert.ok(section.maxItems >= 1, section.key);
      assert.ok(section.maxBytes > 0, section.key);
      assert.ok(section.minWidth > 0 && section.minHeight > 0, section.key);
      assert.ok(section.allowedMimeTypes.length > 0, section.key);
      assert.ok(section.label && section.hint, section.key);
    }
  });

  it("groups cover every section exactly once", () => {
    const grouped = siteSectionGroups().flatMap(([, sections]) => sections.map((section) => section.key));
    assert.deepEqual([...grouped].sort(), [...SITE_SECTION_KEYS].sort());
  });
});

describe("section upload validation", () => {
  it("accepts a correctly sized, correctly shaped image", () => {
    assert.equal(
      validateSectionUpload(hero, { mimeType: "image/jpeg", sizeBytes: 400_000, width: 1920, height: 1080, signature: JPEG }),
      null,
    );
  });

  it("rejects an unsupported MIME type", () => {
    const reason = validateSectionUpload(hero, { mimeType: "image/gif", sizeBytes: 1000, width: 1920, height: 1080 });
    assert.match(reason ?? "", /accepts/);
  });

  it("rejects a spoofed extension: declared JPEG whose bytes are PNG", () => {
    const reason = validateSectionUpload(hero, {
      mimeType: "image/jpeg",
      sizeBytes: 400_000,
      width: 1920,
      height: 1080,
      signature: PNG,
    });
    assert.match(reason ?? "", /do not match/);
  });

  it("rejects an oversized file", () => {
    const reason = validateSectionUpload(hero, {
      mimeType: "image/jpeg",
      sizeBytes: hero.maxBytes + 1,
      width: 1920,
      height: 1080,
      signature: JPEG,
    });
    assert.match(reason ?? "", /Maximum size/);
  });

  it("rejects an empty file", () => {
    assert.match(validateSectionUpload(hero, { mimeType: "image/jpeg", sizeBytes: 0 }) ?? "", /empty/);
  });

  it("rejects dimensions below the section minimum", () => {
    const reason = validateSectionUpload(hero, {
      mimeType: "image/jpeg",
      sizeBytes: 10_000,
      width: 640,
      height: 360,
      signature: JPEG,
    });
    assert.match(reason ?? "", /needs at least/);
  });

  it("rejects an aspect ratio that would crop badly", () => {
    const reason = validateSectionUpload(goldBanner, {
      mimeType: "image/jpeg",
      sizeBytes: 10_000,
      width: 1300,
      height: 1300,
      signature: JPEG,
    });
    assert.match(reason ?? "", /expects roughly/);
  });

  it("tolerates small aspect-ratio drift", () => {
    // 1210×800 is 1.51:1 against a 1.5:1 slot.
    assert.equal(
      validateSectionUpload(goldBanner, { mimeType: "image/jpeg", sizeBytes: 10_000, width: 1210, height: 800, signature: JPEG }),
      null,
    );
  });

  it("keeps video slots to video types", () => {
    assert.match(validateSectionUpload(heroVideo, { mimeType: "image/jpeg", sizeBytes: 1000 }) ?? "", /accepts/);
    assert.equal(validateSectionUpload(heroVideo, { mimeType: "video/mp4", sizeBytes: 1000, width: 1920, height: 1080 }), null);
  });
});

describe("file signature checks", () => {
  it("recognises each accepted format", () => {
    assert.equal(signatureMatches("image/jpeg", JPEG), true);
    assert.equal(signatureMatches("image/png", PNG), true);
    assert.equal(
      signatureMatches("image/webp", new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])),
      true,
    );
    assert.equal(
      signatureMatches("video/mp4", new Uint8Array([0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70])),
      true,
    );
    assert.equal(signatureMatches("video/webm", new Uint8Array([0x1a, 0x45, 0xdf, 0xa3])), true);
  });

  it("rejects mismatched and unknown types", () => {
    assert.equal(signatureMatches("image/png", JPEG), false);
    assert.equal(signatureMatches("application/x-msdownload", new Uint8Array([0x4d, 0x5a])), false);
  });
});

describe("badge text policy", () => {
  // Mirrors ProductCard.badgeText. Kept in the test suite because the rule is
  // a product decision ("NEW is owned by the flag"), not a rendering detail.
  const STALE = new Set(["new", "new in", "new arrival", "new arrivals", "just in"]);
  const badgeText = (badge: string, isNewArrival: boolean) =>
    isNewArrival ? "New" : STALE.has(badge.trim().toLowerCase()) ? "" : badge;

  it("shows NEW only when the flag is set", () => {
    assert.equal(badgeText("Premium", true), "New");
    assert.equal(badgeText("", true), "New");
  });

  it("suppresses stale newness claims on an unflagged product", () => {
    assert.equal(badgeText("New Arrival", false), "");
    assert.equal(badgeText(" new in ", false), "");
  });

  it("keeps legitimate badges that merely contain the word new", () => {
    assert.equal(badgeText("New Season", false), "New Season");
    assert.equal(badgeText("Best Seller", false), "Best Seller");
  });
});
