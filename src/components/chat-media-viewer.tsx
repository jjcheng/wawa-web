"use client";

import { Download, FileText, ImageIcon, LoaderCircle, Play, Sticker } from "lucide-react";
import Image from "next/image";
import { useEffect, useEffectEvent, useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";

type ChatMediaViewerProps = {
  mediaId?: string;
  messageId?: number;
  waMessageId?: string;
  mediaUrl?: string;
  type: "document" | "image" | "sticker" | "audio" | "video";
  mimeType: string;
  filename?: string;
  autoLoad?: boolean;
};

export function ChatMediaViewer({
  mediaId,
  messageId,
  mediaUrl,
  type,
  mimeType,
  filename,
  autoLoad = false,
}: ChatMediaViewerProps) {
  const [loaded, setLoaded] = useState(Boolean(mediaUrl));
  const [loading, setLoading] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [resolvedMediaUrl, setResolvedMediaUrl] = useState(mediaUrl || "");
  const label = type === "sticker" ? "View Sticker" : type === "image" ? "View Image" : type === "video" ? "Play Video" : "Play Audio";

  async function loadMedia() {
    if (mediaUrl) {
      setResolvedMediaUrl(mediaUrl);
      setLoaded(true);
      return;
    }

    if (!mediaId || messageId === undefined) return;

    setLoading(true);
    try {
      const response = await apiFetch<{ url: string }>("/v1/wa/media", {
        query: {
          message_id: String(messageId),
          wa_media_id: mediaId,
        },
      });
      setResolvedMediaUrl(response.url || "");
      setLoaded(Boolean(response.url));
    } catch {
      setResolvedMediaUrl("");
      setLoaded(false);
    } finally {
      setLoading(false);
    }
  }

  const loadStickerMedia = useEffectEvent(() => {
    void loadMedia();
  });

  useEffect(() => {
    if (autoLoad && !loaded) queueMicrotask(loadStickerMedia);
  }, [autoLoad, loaded]);

  if (!mediaUrl && !resolvedMediaUrl && !mediaId) return null;

  if (mediaUrl && !loaded) {
    setLoaded(true);
  }

  if (type === "document") {
    if (!loaded) {
      return (
        <Button
          type="button"
          variant="ghost"
          className="h-24 w-72 max-w-full bg-black/5 px-3 text-inherit opacity-65 hover:bg-black/10 hover:opacity-80 dark:bg-white/5 dark:hover:bg-white/10"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void loadMedia();
          }}
          disabled={loading}
        >
          <div className="flex w-full items-center gap-3 text-left">
            <div className="flex shrink-0 items-center justify-center">
              {loading ? <LoaderCircle className="size-5 animate-spin" /> : <FileText className="size-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{filename || "Document"}</span>
              <span className="block truncate text-xs opacity-70">{mimeType || "Document"}</span>
            </div>
          </div>
        </Button>
      );
    }

    return (
      <a
        href={resolvedMediaUrl}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-3 rounded-md bg-black/5 p-2 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15"
      >
        <FileText className="size-8 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{filename || "Document"}</span>
          <span className="block text-xs opacity-70">{mimeType}</span>
        </span>
        <Download className="size-4 shrink-0" />
      </a>
    );
  }

  if (loaded) {
    if (type === "image" || type === "sticker") {
      return (
        <>
          <button
            type="button"
            className={`relative block aspect-square max-w-full cursor-pointer ${type === "sticker" ? "w-48" : "w-full max-h-[250px] overflow-hidden sm:w-72 sm:max-h-none"}`}
            aria-label={type === "sticker" ? "View sticker fullscreen" : "View image fullscreen"}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setGalleryOpen(true);
            }}
          >
          <Image
            src={resolvedMediaUrl}
            alt={type === "sticker" ? "Sticker attachment" : "Image attachment"}
            fill
            loading="lazy"
            unoptimized
            sizes="288px"
            className={type === "sticker" ? "object-contain" : "object-cover"}
          />
          </button>
          <Lightbox open={galleryOpen} close={() => setGalleryOpen(false)} carousel={{ finite: true }} slides={[{ src: resolvedMediaUrl }]} />
        </>
      );
    }

    if (type === "video") {
      return (
        <video
          className="h-64 w-72 max-w-full object-cover overflow-hidden"
          controls
          src={resolvedMediaUrl}
        />
      );
    }

    return <audio className="w-72 max-w-full" controls src={resolvedMediaUrl} />;
  }

  return (
      <Button
        type="button"
        variant="ghost"
        className="h-24 w-72 max-w-full bg-black/5 text-inherit opacity-65 hover:bg-black/10 hover:opacity-80 dark:bg-white/5 dark:hover:bg-white/10"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void loadMedia();
        }}
        disabled={loading}
      >
        {loading ? <LoaderCircle className="size-5 animate-spin" /> : type === "sticker" ? <Sticker className="size-5" /> : type === "image" ? <ImageIcon className="size-5" /> : <Play className="size-5" />}
        <span className="text-lg">{loading ? "Loading..." : label}</span>
      </Button>
  );
}