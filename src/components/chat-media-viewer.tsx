"use client";

import { Download, FileText, ImageIcon, LoaderCircle, Play } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";

type ChatMediaViewerProps = {
  mediaId?: string;
  waMessageId?: string;
  mediaUrl?: string;
  type: "document" | "image" | "audio" | "video";
  mimeType: string;
  filename?: string;
};

export function ChatMediaViewer({
  mediaId,
  waMessageId,
  mediaUrl,
  type,
  mimeType,
  filename,
}: ChatMediaViewerProps) {
  const [loaded, setLoaded] = useState(Boolean(mediaUrl));
  const [loading, setLoading] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [resolvedMediaUrl, setResolvedMediaUrl] = useState(mediaUrl || "");
  const label = type === "image" ? "View Image" : type === "video" ? "Play Video" : "Play Audio";

  async function loadMedia() {
    if (mediaUrl) {
      setResolvedMediaUrl(mediaUrl);
      setLoaded(true);
      return;
    }

    if (!mediaId || !waMessageId) return;

    setLoading(true);
    try {
      const response = await apiFetch<{ url: string }>("/v1/wa/media", {
        query: {
          wa_message_id: waMessageId,
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
    if (type === "image") {
      return (
        <>
          <button
            type="button"
            className="relative block aspect-square w-72 max-w-full cursor-pointer overflow-hidden rounded-md"
            aria-label="View image fullscreen"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setGalleryOpen(true);
            }}
          >
          <Image
            src={resolvedMediaUrl}
            alt="Image attachment"
            fill
            loading="lazy"
            unoptimized
            sizes="288px"
            className="object-cover"
          />
          </button>
          <Lightbox open={galleryOpen} close={() => setGalleryOpen(false)} carousel={{ finite: true }} slides={[{ src: resolvedMediaUrl }]} />
        </>
      );
    }

    if (type === "video") {
      return (
        <video
          className="h-64 w-72 max-w-full rounded-md object-cover"
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
        {loading ? <LoaderCircle className="size-5 animate-spin" /> : type === "image" ? <ImageIcon className="size-5" /> : <Play className="size-5" />}
        <span className="text-lg">{loading ? "Loading..." : label}</span>
      </Button>
  );
}