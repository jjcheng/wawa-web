import assert from "node:assert/strict";
import test from "node:test";
import { prepareVideoAttachment, VIDEO_MAX_SIZE_BYTES } from "./video-attachment.ts";

test("oversized source is compressed before its size is checked", async () => {
  const source = new File([new Uint8Array(VIDEO_MAX_SIZE_BYTES + 1)], "large.mp4", { type: "video/mp4" });
  const output = new File(["compressed"], "large.mp4", { type: "video/mp4" });
  let called = false;
  assert.equal(await prepareVideoAttachment(source, async (file) => {
    assert.equal(file, source);
    called = true;
    return output;
  }), output);
  assert.equal(called, true);
});

test("small videos are also compressed first", async () => {
  const source = new File(["source"], "small.mp4");
  const output = new File(["output"], "small.mp4");
  assert.equal(await prepareVideoAttachment(source, async () => output), output);
});

test("compressed output at the limit is accepted and over the limit is rejected", async () => {
  const source = new File(["source"], "video.mp4");
  const atLimit = new File([new Uint8Array(VIDEO_MAX_SIZE_BYTES)], "video.mp4");
  assert.equal(await prepareVideoAttachment(source, async () => atLimit), atLimit);
  await assert.rejects(prepareVideoAttachment(source, async () =>
    new File([new Uint8Array(VIDEO_MAX_SIZE_BYTES + 1)], "video.mp4")), /after compression/);
});

test("empty output and compression errors are surfaced", async () => {
  const source = new File(["source"], "video.mp4");
  await assert.rejects(prepareVideoAttachment(source, async () => new File([], "video.mp4")), /empty file/);
  await assert.rejects(prepareVideoAttachment(source, async () => {
    throw new Error("Cannot decode video");
  }), /Cannot decode video/);
});
