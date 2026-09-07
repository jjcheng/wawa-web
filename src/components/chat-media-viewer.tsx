"use client";

import { Download, FileText, ImageIcon, Play } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

import { Button } from "@/components/ui/button";

type ChatMediaViewerProps = {
  mediaId: string;
  type: "document" | "image" | "audio" | "video";
  mimeType: string;
  filename?: string;
};

function mediaProxyUrl(mediaId: string) {
  return `/api/bff/v1/wa/media/${encodeURIComponent(mediaId)}`;
}

export function ChatMediaViewer({
  mediaId,
  type,
  mimeType,
  filename,
}: ChatMediaViewerProps) {
  const [loaded, setLoaded] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const mediaUrl = mediaProxyUrl(mediaId);
  const label = type === "image" ? "View Image" : type === "video" ? "Play Video" : "Play Audio";

  if (type === "document") {
    return (
      <a
        href={mediaUrl}
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
            onClick={() => setGalleryOpen(true)}
          >
          <Image
            src={mediaUrl}
            alt="Image attachment"
            fill
            unoptimized
            className="object-cover"
          />
          </button>
          <Lightbox open={galleryOpen} close={() => setGalleryOpen(false)} carousel={{ finite: true }} slides={[{ src: mediaUrl }]} />
        </>
      );
    }

    if (type === "video") {
      return (
        <video
          className="h-64 w-72 max-w-full rounded-md object-cover"
          controls
          autoPlay
          src={mediaUrl}
        />
      );
    }

    return <audio className="w-72 max-w-full" controls autoPlay src={mediaUrl} />;
  }

  return (
      <Button
        type="button"
        variant="ghost"
        className="h-24 w-72 max-w-full bg-black/5 text-inherit opacity-65 hover:bg-black/10 hover:opacity-80 dark:bg-white/5 dark:hover:bg-white/10"
        onClick={() => setLoaded(true)}
      >
        {type === "image" ? <ImageIcon className="size-5" /> : <Play className="size-5" />}
        <span className="text-lg">{label}</span>
      </Button>
  );
}