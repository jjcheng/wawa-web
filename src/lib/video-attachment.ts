export const VIDEO_MAX_SIZE_BYTES = 16 * 1024 * 1024;

export async function prepareVideoAttachment(
  file: File,
  compress: (file: File) => Promise<File> = compressVideoFile,
): Promise<File> {
  const compressed = await compress(file);
  if (compressed.size === 0) throw new Error("Video compression produced an empty file.");
  if (compressed.size > VIDEO_MAX_SIZE_BYTES) {
    throw new Error("Videos must be 16 MB or smaller after compression.");
  }
  return compressed;
}

async function compressVideoFile(file: File): Promise<File> {
  const mimeType = typeof MediaRecorder !== "undefined"
    ? ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4"]
      .find((type) => MediaRecorder.isTypeSupported(type))
    : undefined;
  if (!mimeType) {
    throw new Error("This browser cannot compress videos to MP4. Please use a browser with MP4 recording support.");
  }

  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  let audioContext: AudioContext | undefined;
  let stream: MediaStream | undefined;
  let recorder: MediaRecorder | undefined;
  let frame = 0;
  try {
    video.preload = "auto";
    video.playsInline = true;
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Timed out reading video for compression."));
      }, 30_000);
      video.onloadeddata = () => {
        clearTimeout(timeout);
        resolve();
      };
      video.onerror = () => {
        clearTimeout(timeout);
        reject(new Error("Could not read video for compression."));
      };
      video.src = objectUrl;
    });
    if (!Number.isFinite(video.duration) || video.duration <= 0 ||
      !video.videoWidth || !video.videoHeight) {
      throw new Error("The selected video has invalid duration or dimensions.");
    }

    const scale = Math.min(1, 1280 / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(2, Math.round(video.videoWidth * scale / 2) * 2);
    canvas.height = Math.max(2, Math.round(video.videoHeight * scale / 2) * 2);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not create the video compression canvas.");
    stream = canvas.captureStream(30);

    audioContext = new AudioContext();
    const source = audioContext.createMediaElementSource(video);
    const destination = audioContext.createMediaStreamDestination();
    source.connect(destination);
    const silentOutput = audioContext.createGain();
    silentOutput.gain.value = 0;
    source.connect(silentOutput);
    silentOutput.connect(audioContext.destination);
    for (const track of destination.stream.getAudioTracks()) stream.addTrack(track);
    await audioContext.resume();

    recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 2_000_000,
      audioBitsPerSecond: 128_000,
    });
    const activeRecorder = recorder;
    const chunks: Blob[] = [];
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Video compression timed out. Please keep this tab active and try again."));
      }, (video.duration + 30) * 1000);
      const fail = (message: string) => {
        clearTimeout(timeout);
        reject(new Error(message));
      };
      activeRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      activeRecorder.onerror = () => fail("Failed to compress video.");
      activeRecorder.onstop = () => {
        clearTimeout(timeout);
        resolve();
      };
      video.onerror = () => fail("Could not play the complete video for compression.");
      video.onended = () => {
        cancelAnimationFrame(frame);
        if (activeRecorder.state === "recording") activeRecorder.stop();
      };
      const renderFrame = () => {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        frame = requestAnimationFrame(renderFrame);
      };
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      activeRecorder.start();
      frame = requestAnimationFrame(renderFrame);
      void video.play().catch((error: unknown) => fail(
        error instanceof Error
          ? `Could not play video for compression: ${error.message}`
          : "Could not play video for compression.",
      ));
    });
    return new File([new Blob(chunks, { type: "video/mp4" })],
      file.name.replace(/\.[^./]+$/, "") + ".mp4", { type: "video/mp4" });
  } finally {
    cancelAnimationFrame(frame);
    video.pause();
    video.onended = null;
    video.onerror = null;
    video.onloadeddata = null;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    stream?.getTracks().forEach((track) => track.stop());
    if (audioContext) await audioContext.close();
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(objectUrl);
  }
}
