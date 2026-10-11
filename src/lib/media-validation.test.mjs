import assert from "node:assert/strict";
import test from "node:test";
import { validateMediaMetadata } from "./media-validation.ts";

const metadata = (container, ...tracks) => ({
  media: { track: [{ "@type": "General", Format: container }, ...tracks] },
});
const video = (Format = "AVC") => ({ "@type": "Video", Format });
const audio = (Format = "AAC", extra = {}) => ({ "@type": "Audio", Format, ...extra });

test("MP4/3GP H.264 with one AAC audio stream or no audio is accepted", () => {
  for (const mime of ["video/mp4", "video/3gp", "video/3gpp"]) {
    validateMediaMetadata(mime, metadata("MPEG-4", video()));
    validateMediaMetadata(mime, metadata("MPEG-4", video(), audio()));
  }
});

test("video rejects other codecs, containers, missing video, and multiple audio streams", () => {
  for (const result of [
    metadata("MPEG-4", video("HEVC"), audio()),
    metadata("WebM", video("VP9"), audio("Opus")),
    metadata("MPEG-4", audio()),
    metadata("MPEG-4", video(), audio("MPEG Audio")),
    metadata("MPEG-4", video(), audio(), audio()),
  ]) {
    assert.throws(() => validateMediaMetadata("video/mp4", result));
  }
});

test("supported audio containers and codecs are accepted", () => {
  for (const [type, container, codec, extra] of [
    ["audio/aac", "ADTS", "AAC"],
    ["audio/mp4", "MPEG-4", "AAC"],
    ["audio/amr", "AMR", "AMR"],
    ["audio/mpeg", "MPEG Audio", "MPEG Audio", { Format_Profile: "Layer 3" }],
    ["audio/ogg", "Ogg", "Opus"],
  ]) {
    validateMediaMetadata(type, metadata(container, audio(codec, extra)));
  }
});

test("audio rejects spoofed MIME types, unsupported codecs, video, and multiple streams", () => {
  for (const [type, result] of [
    ["audio/wav", metadata("Wave", audio("PCM"))],
    ["audio/mp4", metadata("MPEG-4", audio("ALAC"))],
    ["audio/mpeg", metadata("MPEG Audio", audio("MPEG Audio", { Format_Profile: "Layer 2" }))],
    ["audio/ogg", metadata("Ogg", audio("Vorbis"))],
    ["audio/mp4", metadata("MPEG-4", video(), audio())],
    ["audio/mp4", metadata("MPEG-4", audio(), audio())],
    ["audio/aac", metadata("MPEG-4", audio())],
  ]) {
    assert.throws(() => validateMediaMetadata(type, result));
  }
});

test("unrecognized file data fails closed", () => {
  assert.throws(() => validateMediaMetadata("video/mp4", {}));
  assert.throws(() => validateMediaMetadata("audio/mp4", {}));
});
