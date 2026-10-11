import assert from "node:assert/strict";
import test from "node:test";
import { validateImageBytes } from "./image-validation.ts";

function png(depth = 8, color = 6) {
  const bytes = new Uint8Array(33);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82]);
  new DataView(bytes.buffer).setUint32(16, 10);
  new DataView(bytes.buffer).setUint32(20, 10);
  bytes[24] = depth;
  bytes[25] = color;
  return bytes;
}
function jpeg(marker = 0xc0, depth = 8, components = 3) {
  return new Uint8Array([255, 216, 255, marker, 0, 17, depth, 0, 10, 0, 10, components,
    1, 17, 0, 2, 17, 0, 3, 17, 0, 255, 218, 0, 2]);
}

test("8-bit RGB and RGBA PNG headers are accepted", () => {
  validateImageBytes(png(8, 2), "image/png");
  validateImageBytes(png(8, 6), "image/png");
});
test("nonstandard PNG color formats and bit depths are rejected", () => {
  for (const [depth, color] of [[16, 6], [8, 0], [8, 3], [8, 4]]) {
    assert.throws(() => validateImageBytes(png(depth, color), "image/png"));
  }
});
test("baseline 8-bit three-component JPEG is accepted", () => {
  validateImageBytes(jpeg(), "image/jpeg");
});
test("progressive, higher-bit-depth, grayscale and CMYK JPEGs are rejected", () => {
  for (const bytes of [jpeg(0xc2), jpeg(0xc0, 12), jpeg(0xc0, 8, 1), jpeg(0xc0, 8, 4)]) {
    assert.throws(() => validateImageBytes(bytes, "image/jpeg"));
  }
});
test("HEIC, spoofed formats and truncated data are rejected", () => {
  assert.throws(() => validateImageBytes(jpeg(), "image/heic"));
  assert.throws(() => validateImageBytes(png(), "image/jpeg"));
  assert.throws(() => validateImageBytes(jpeg(), "image/png"));
  assert.throws(() => validateImageBytes(jpeg().slice(0, 10), "image/jpeg"));
});
