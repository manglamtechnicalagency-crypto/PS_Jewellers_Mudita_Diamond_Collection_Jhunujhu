import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateProductMediaSelection } from "../src/lib/product-media-policy.ts";

describe("validateProductMediaSelection", () => {
  it("accepts five images", () => {
    const result = validateProductMediaSelection([
      { name: "1.jpg", type: "image/jpeg", size: 1024 },
      { name: "2.webp", type: "image/webp", size: 1024 },
      { name: "3.png", type: "image/png", size: 1024 },
      { name: "4.jpg", type: "image/jpeg", size: 1024 },
      { name: "5.webp", type: "image/webp", size: 1024 },
    ]);
    assert.equal(result.valid, true);
  });

  it("accepts four images and one video", () => {
    const result = validateProductMediaSelection([
      { name: "1.jpg", type: "image/jpeg", size: 1024 },
      { name: "2.jpg", type: "image/jpeg", size: 1024 },
      { name: "3.jpg", type: "image/jpeg", size: 1024 },
      { name: "4.jpg", type: "image/jpeg", size: 1024 },
      { name: "clip.mp4", type: "video/mp4", size: 1024, duration: 10 },
    ]);
    assert.equal(result.valid, true);
  });

  it("rejects six files and multiple videos", () => {
    const tooMany = validateProductMediaSelection(Array.from({ length: 6 }, (_, index) => ({ name: `${index}.jpg`, type: "image/jpeg", size: 1024 })));
    assert.equal(tooMany.message, "You can upload a maximum of 5 media files per product.");
    const videos = validateProductMediaSelection([
      { name: "a.mp4", type: "video/mp4", size: 1024, duration: 10 },
      { name: "b.mp4", type: "video/mp4", size: 1024, duration: 10 },
    ]);
    assert.equal(videos.message, "Only one video is allowed per product.");
  });

  it("rejects invalid image size and video duration", () => {
    const image = validateProductMediaSelection([{ name: "large.jpg", type: "image/jpeg", size: 3 * 1024 * 1024 + 1 }]);
    assert.equal(image.message, "Each image must be 3 MB or smaller.");
    const video = validateProductMediaSelection([{ name: "short.mp4", type: "video/mp4", size: 1024, duration: 9 }]);
    assert.equal(video.message, "The video must be between 10 and 12 seconds long.");
  });

  it("includes existing media in the five-file limit", () => {
    const result = validateProductMediaSelection(
      [{ name: "new.jpg", type: "image/jpeg", size: 1024 }],
      [{ type: "image/jpeg" }, { type: "image/jpeg" }, { type: "image/jpeg" }, { type: "image/jpeg" }],
    );
    assert.equal(result.valid, true);
    const overflow = validateProductMediaSelection(
      [{ name: "new.jpg", type: "image/jpeg", size: 1024 }, { name: "new2.jpg", type: "image/jpeg", size: 1024 }],
      [{ type: "image/jpeg" }, { type: "image/jpeg" }, { type: "image/jpeg" }, { type: "image/jpeg" }],
    );
    assert.equal(overflow.message, "You can upload a maximum of 5 media files per product.");
  });
});
