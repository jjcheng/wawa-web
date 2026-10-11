import type { MediaInfoFactoryOptions, MediaInfo, MediaInfoResult } from "mediainfo.js";

type MediaInfoFactory = (options: MediaInfoFactoryOptions<"object">) => Promise<MediaInfo<"object">>;

declare global {
  interface Window {
    MediaInfo?: { mediaInfoFactory: MediaInfoFactory };
  }
}

let factoryPromise: Promise<MediaInfoFactory> | undefined;

function loadMediaInfo(): Promise<MediaInfoFactory> {
  if (window.MediaInfo) return Promise.resolve(window.MediaInfo.mediaInfoFactory);
  if (!factoryPromise) {
    factoryPromise = new Promise<MediaInfoFactory>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "/media-info/mediainfo.js";
      script.onload = () => {
        if (window.MediaInfo) resolve(window.MediaInfo.mediaInfoFactory);
        else reject(new Error("Local media inspector did not initialize."));
      };
      script.onerror = () => {
        script.remove();
        reject(new Error("Could not load the local media inspector. Please try again."));
      };
      document.head.appendChild(script);
    }).catch((error: unknown) => {
      factoryPromise = undefined;
      throw error;
    });
  }
  return factoryPromise;
}

const AUDIO_TYPES = new Set(["audio/aac", "audio/mp4", "audio/amr", "audio/mpeg", "audio/ogg"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/3gp", "video/3gpp"]);

export function validateMediaMetadata(
  mimeType: string,
  result: MediaInfoResult,
): void {
  const tracks = result.media?.track ?? [];
  const general = tracks.find((track) => track["@type"] === "General");
  const videos = tracks.filter((track) => track["@type"] === "Video");
  const audios = tracks.filter((track) => track["@type"] === "Audio");
  const type = mimeType.toLowerCase().split(";")[0].trim();
  if (VIDEO_TYPES.has(type)) {
    if (general?.Format !== "MPEG-4" || videos.length !== 1 ||
      videos[0].Format !== "AVC") {
      throw new Error("Videos must be MP4 or 3GP containing H.264 video.");
    }
    if (audios.length > 1 || audios.some((track) => track.Format !== "AAC")) {
      throw new Error("Videos must contain a single AAC audio stream or no audio.");
    }
    return;
  }
  if (!AUDIO_TYPES.has(type)) {
    throw new Error("Audio must be AAC, MP4, AMR, MP3, or Ogg/Opus.");
  }
  if (videos.length > 0 || audios.length !== 1) {
    throw new Error("Audio attachments must contain one audio stream and no video.");
  }
  const audio = audios[0];
  const valid =
    (type === "audio/aac" && general?.Format === "ADTS" && audio.Format === "AAC") ||
    (type === "audio/mp4" && general?.Format === "MPEG-4" && audio.Format === "AAC") ||
    (type === "audio/amr" && general?.Format === "AMR" && audio.Format === "AMR") ||
    (type === "audio/mpeg" && general?.Format === "MPEG Audio" &&
      audio.Format === "MPEG Audio" && audio.Format_Profile === "Layer 3") ||
    (type === "audio/ogg" && general?.Format === "Ogg" && audio.Format === "Opus");
  if (!valid) {
    throw new Error("The audio file's container or codec does not match a supported format. Use AAC, AAC in MP4, AMR, MP3, or Opus in Ogg.");
  }
}

export async function validateMediaFile(file: File): Promise<void> {
  if (file.type.startsWith("image/")) {
    const { validateImageFile } = await import("./image-validation");
    await validateImageFile(file);
    return;
  }
  const mediaInfoFactory = await loadMediaInfo();
  const inspector = await mediaInfoFactory({
    format: "object",
    locateFile: () => "/media-info/MediaInfoModule.wasm",
  });
  try {
    const metadata = await inspector.analyzeData(file.size, async (size, offset) =>
      new Uint8Array(await file.slice(offset, offset + size).arrayBuffer()));
    validateMediaMetadata(file.type, metadata);
  } finally {
    inspector.close();
  }
}
