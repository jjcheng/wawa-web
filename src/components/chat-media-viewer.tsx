"use client";

import { Download, FileText, ImageIcon, LoaderCircle, Sticker } from "lucide-react";
import { useRef, useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import { resolveDirectChatMediaUrl } from "@/lib/chat-media-url";
import { toApiError } from "@/lib/api/errors";
import { toast } from "@/lib/toast";

type ChatMediaViewerProps = {
  mediaId?: string;
  messageId?: number;
  waMessageId?: string;
  mediaUrl?: string;
  attachmentUrl?: string;
  type: "document" | "image" | "sticker" | "audio" | "video";
  mimeType: string;
  filename?: string;
};

export function ChatMediaViewer({
  mediaId,
  messageId,
  mediaUrl,
  attachmentUrl,
  type,
  mimeType,
  filename,
}: ChatMediaViewerProps) {
  const directMediaUrl = resolveDirectChatMediaUrl(attachmentUrl, mediaId, mediaUrl);
  const requestPending = useRef(false);
  const [mediaLoaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [fetchedMediaUrl, setResolvedMediaUrl] = useState("");
  const resolvedMediaUrl = directMediaUrl || fetchedMediaUrl;
  const loaded = Boolean(attachmentUrl?.trim()) || mediaLoaded;
  const label = type === "sticker" ? "View Sticker" : type === "image" ? "View Image" : type === "video" ? "Download video" : "Download audio";

  async function loadMedia() {
    if (requestPending.current) return;
    if (directMediaUrl) {
      setResolvedMediaUrl(directMediaUrl);
      setLoaded(true);
      return;
    }

    if (!mediaId || messageId === undefined) {
      toast.error("Cannot load media without a media ID and message ID.");
      return;
    }

    requestPending.current = true;
    setLoading(true);
    try {
      const response = await apiFetch<{ url: string }>("/v1/wa/media", {
        query: {
          message_id: String(messageId),
          wa_media_id: mediaId,
        },
      });
      if (!response.url?.trim()) throw new Error("Media request did not return a URL.");
      setResolvedMediaUrl(response.url);
      setLoaded(true);
    } catch (error) {
      setResolvedMediaUrl("");
      setLoaded(false);
      toast.error(toApiError(error).message);
    } finally {
      requestPending.current = false;
      setLoading(false);
    }
  }

  if (!resolvedMediaUrl && !mediaId) return null;

  if (type === "document") {
    const documentClassName = "inline-flex h-auto w-72 max-w-full items-center gap-3 rounded-none bg-transparent px-3 py-2 text-left text-inherit hover:bg-transparent hover:text-inherit dark:bg-transparent dark:hover:bg-transparent";
    const documentContent = (
      <>
        {loading ? <LoaderCircle className="size-5 shrink-0 animate-spin" /> : <FileText className="size-5 shrink-0" />}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{filename || "Document"}</span>
          <span className="block truncate text-xs font-normal opacity-70">{mimeType || "Document"}</span>
        </span>
        <Download className="size-4 shrink-0" />
      </>
    );
    if (!loaded) {
      return (
        <Button
          type="button"
          variant="ghost"
          className={documentClassName}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void loadMedia();
          }}
          disabled={loading}
        >
          {documentContent}
        </Button>
      );
    }

    return (
      <a
        href={resolvedMediaUrl}
        target="_blank"
        rel="noreferrer"
        className={documentClassName}
      >
        {documentContent}
      </a>
    );
  }

  if (loaded) {
    if (type === "image" || type === "sticker") {
      return (
        <>
          <button
            type="button"
            data-loaded-sticker={type === "sticker" ? "" : undefined}
            className={`relative block cursor-pointer ${type === "sticker" ? "aspect-square w-48" : "w-full max-w-full overflow-hidden"}`}
            aria-label={type === "sticker" ? "View sticker fullscreen" : "View image fullscreen"}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setGalleryOpen(true);
            }}
          >
          {type === "sticker" ? (
            <img
              src={resolvedMediaUrl}
              alt="Sticker attachment"
              className="absolute inset-0 size-full object-contain"
              loading={attachmentUrl?.trim() ? "eager" : "lazy"}
            />
          ) : (
            <img
              src={resolvedMediaUrl}
              alt="Image attachment"
              className="block h-auto max-h-[288px] w-full object-cover"
              loading={attachmentUrl?.trim() ? "eager" : "lazy"}
            />
          )}
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
        className={`h-24 w-72 max-w-full rounded-none text-inherit opacity-65 hover:opacity-80 ${type === "audio"
          ? "bg-transparent hover:bg-transparent dark:bg-transparent dark:hover:bg-transparent"
          : "bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"}`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void loadMedia();
        }}
        disabled={loading}
      >
        {loading ? <LoaderCircle className="size-5 animate-spin" /> : type === "sticker" ? <Sticker className="size-5" /> : type === "image" ? <ImageIcon className="size-5" /> : <Download className="size-5" />}
        <span className="text-lg">{loading ? "Loading..." : label}</span>
      </Button>
  );
}