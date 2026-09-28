"use client";

import EmojiPicker, { EmojiStyle, Theme, type EmojiClickData } from "emoji-picker-react";
import { ContactRound, FileText, ImageIcon, MapPin, Music2, Paperclip, Reply, Send, SmilePlus, Video, X } from "lucide-react";
import {
  autoUpdate,
  flip,
  FloatingFocusManager,
  FloatingPortal,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from "@floating-ui/react";
import Image from "next/image";
import { useTheme } from "@/components/theme-provider";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type SubmitEvent } from "react";
import { toast } from "@/lib/toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChatCompose } from "@/components/chat-compose-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GoogleLocationInput, type GoogleLocationSelection } from "@/components/google-location-input";
import { Popover, PopoverContent, PopoverTrigger, popoverSurfaceClassName } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api/client";

type ChatMessageComposerProps = {
  customerId: string;
  messageId?: number;
  lastCustomerMessageTimestamp?: number | null;
};

type WhatsAppContact = {
  name: { first_name?: string; last_name?: string; formatted_name: string };
  org?: { company?: string };
  phones: { phone: string; type?: string }[];
  vcard: string;
  origin: "other";
};

type SelectedAttachment = {
  file: File;
  previewUrl: string | null;
};

type AttachedLocation = {
  latitude: number;
  longitude: number;
  name: string;
  address: string;
};

const IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const VIDEO_MAX_SIZE_BYTES = 16 * 1024 * 1024;
const DOCUMENT_MAX_SIZE_BYTES = 100 * 1024 * 1024;
const TYPING_INDICATOR_INTERVAL_MS = 30_000;

const VIDEO_ALLOWED_TYPES = new Set(["video/mp4", "video/3gpp"]);
const IMAGE_ALLOWED_TYPES = new Set(["image/jpeg", "image/png"]);
const IMAGE_ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png"]);
const VIDEO_ALLOWED_EXTENSIONS = new Set([".mp4", ".3gp"]);
const DOCUMENT_ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".txt",
  ".csv",
]);

function getFileExtension(name: string) {
  const match = /\.[^./\\]+$/i.exec(name);
  return match ? match[0].toLowerCase() : "";
}

function validateSelectedAttachment(file: File) {
  const extension = getFileExtension(file.name);

  if (file.type.startsWith("image/")) {
    const normalizedType = file.type.toLowerCase();
    if (!IMAGE_ALLOWED_TYPES.has(normalizedType) && !IMAGE_ALLOWED_EXTENSIONS.has(extension)) {
      throw new Error("Images must be PNG, JPG, or JPEG.");
    }
    if (file.size > IMAGE_MAX_SIZE_BYTES) {
      throw new Error(`Images must be ${formatBytes(IMAGE_MAX_SIZE_BYTES)} or smaller.`);
    }
    return;
  }

  if (file.type.startsWith("video/")) {
    const normalizedType = file.type.toLowerCase();
    if (!VIDEO_ALLOWED_TYPES.has(normalizedType) && !VIDEO_ALLOWED_EXTENSIONS.has(extension)) {
      throw new Error("Videos must be MP4 or 3GP.");
    }
    if (file.size > VIDEO_MAX_SIZE_BYTES) {
      throw new Error(`Videos must be ${formatBytes(VIDEO_MAX_SIZE_BYTES)} or smaller.`);
    }
    return;
  }

  if (file.type.startsWith("audio/")) {
    return;
  }

  if (!DOCUMENT_ALLOWED_EXTENSIONS.has(extension)) {
    throw new Error("Documents must be PDF, Office, text, or CSV files.");
  }
  if (file.size > DOCUMENT_MAX_SIZE_BYTES) {
    throw new Error(`Documents must be ${formatBytes(DOCUMENT_MAX_SIZE_BYTES)} or smaller.`);
  }
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

async function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new globalThis.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not read image."));
    image.src = url;
  });
}

async function compressImageFile(file: File): Promise<File> {
  if (file.size <= IMAGE_MAX_SIZE_BYTES) return file;

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    const maxDimension = 1600;
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    let width = Math.max(1, Math.round(image.width * scale));
    let height = Math.max(1, Math.round(image.height * scale));
    let quality = 0.82;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");

      if (!context) return file;
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", quality);
      });
      if (!blob) return file;

      const compressedFile = new File([blob], file.name.replace(/\.[^./]+$/, ".jpg"), {
        type: "image/jpeg",
      });

      if (compressedFile.size <= IMAGE_MAX_SIZE_BYTES || attempt === 4) {
        return compressedFile;
      }

      quality = Math.max(0.25, quality - 0.15);
      width = Math.max(1, Math.round(width * 0.85));
      height = Math.max(1, Math.round(height * 0.85));
    }

    return file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function compressVideoFile(file: File): Promise<File> {
  if (file.size <= VIDEO_MAX_SIZE_BYTES) return file;

  const objectUrl = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.src = objectUrl;

    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Could not read video for compression."));
    });

    const maxDimension = 1440;
    const scale = Math.min(1, maxDimension / Math.max(video.videoWidth, video.videoHeight));
    const width = Math.max(1, Math.round(video.videoWidth * scale));
    const height = Math.max(1, Math.round(video.videoHeight * scale));

    if (typeof MediaRecorder === "undefined") return file;

    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : MediaRecorder.isTypeSupported("video/webm")
        ? "video/webm"
        : undefined;

    if (!mimeType) return file;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;

    const stream = canvas.captureStream(20);
    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: Blob[] = [];

    await new Promise<void>((resolve, reject) => {
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onerror = () => reject(new Error("Failed to compress video."));
      recorder.onstop = () => resolve();

      video.currentTime = 0;
      const durationLimit = Math.min(video.duration || 1, 5);
      const renderFrame = () => {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        if (video.currentTime >= durationLimit || video.ended) {
          recorder.stop();
          return;
        }
        requestAnimationFrame(renderFrame);
      };

      video.play().then(() => {
        recorder.start();
        requestAnimationFrame(renderFrame);
      }).catch(() => reject(new Error("Could not play video for compression.")));
    });

    const compressedBlob = new Blob(chunks, { type: mimeType });
    const compressedFile = new File([compressedBlob], file.name.replace(/\.[^./]+$/, ".webm"), {
      type: mimeType,
    });
    return compressedFile.size <= VIDEO_MAX_SIZE_BYTES ? compressedFile : file;
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function parseVCard(value: string): WhatsAppContact | null {
  const lines = value.replace(/\r\n[ \t]/g, "").split(/\r?\n/);
  const field = (name: string) => lines.find((line) => line.toUpperCase().startsWith(`${name}:`))?.split(":").slice(1).join(":");
  const nameParts = field("N")?.split(";") ?? [];
  const formattedName = field("FN") || [nameParts[1], nameParts[0]].filter(Boolean).join(" ");
  const phones = lines
    .filter((line) => line.toUpperCase().startsWith("TEL"))
    .map((line) => ({ phone: line.split(":").slice(1).join(":"), type: line.match(/TYPE=([^;:]+)/i)?.[1] }))
    .filter((phone) => phone.phone);
  if (!formattedName || phones.length === 0) return null;

  return {
    name: { first_name: nameParts[1], last_name: nameParts[0], formatted_name: formattedName },
    org: field("ORG") ? { company: field("ORG") } : undefined,
    phones,
    vcard: btoa(String.fromCharCode(...new TextEncoder().encode(value))),
    origin: "other",
  };
}

export function ChatMessageComposer({
  customerId,
  messageId,
}: ChatMessageComposerProps) {
  const { replyTarget, setReplyTarget } = useChatCompose();
  const { resolvedTheme } = useTheme();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [isMultiline, setIsMultiline] = useState(false);
  const [locationSearchValue, setLocationSearchValue] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<GoogleLocationSelection | null>(null);
  const [contact, setContact] = useState<WhatsAppContact | null>(null);
  const [attachedContact, setAttachedContact] = useState<WhatsAppContact | null>(null);
  const [attachedLocation, setAttachedLocation] = useState<AttachedLocation | null>(null);
  const [attachment, setAttachment] = useState<SelectedAttachment | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const emojiPickerTheme = resolvedTheme === "dark" ? Theme.DARK : Theme.LIGHT;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const vCardInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const typingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingActiveRef = useRef(false);
  const lastTypingAtRef = useRef(0);
  const hasSendableContent = Boolean(message.trim() || attachedContact || attachedLocation || attachment);
  const canSend = hasSendableContent && !sending && !compressing;
  const disabledReason = compressing
    ? "Compressing attachment..."
    : !hasSendableContent
      ? "Enter a message or add an attachment"
      : null;

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
  }, []);

  function stopTypingIndicator() {
    if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
    typingIntervalRef.current = null;
    typingActiveRef.current = false;
    lastTypingAtRef.current = 0;
  }

  function sendTypingIndicator() {
    if (messageId === undefined) return;
    void apiFetch("v1/wa/messages/start-typing", {
      method: "POST",
      query: { message_id: String(messageId) },
    }).catch(() => {});
  }

  function startTypingIndicator(now: number) {
    stopTypingIndicator();
    typingActiveRef.current = true;
    lastTypingAtRef.current = now;
    sendTypingIndicator();
    typingIntervalRef.current = setInterval(() => {
      if (Date.now() - lastTypingAtRef.current >= TYPING_INDICATOR_INTERVAL_MS) {
        stopTypingIndicator();
        return;
      }
      sendTypingIndicator();
    }, TYPING_INDICATOR_INTERVAL_MS);
  }

  async function sendMessage() {
    const body = message.trim();
    if (!hasSendableContent || sending) return;

    stopTypingIndicator();
    setSending(true);
    try {
      let payload: Record<string, unknown>;
      let attachmentUrl: string | undefined;
      let sendCaptionAsText = false;
      if (attachment) {
        const media = await apiFetch<{ url: string }>("/v1/wa/media", {
          method: "POST",
          query: {
            filename: attachment.file.name,
            content_type: attachment.file.type || "application/octet-stream",
          },
          rawBody: attachment.file,
          contentType: "application/octet-stream",
        });
        if (!media.url) throw new Error("Media upload did not return a URL.");
        attachmentUrl = media.url;

        const type = attachment.file.type.startsWith("image/")
          ? "image"
          : attachment.file.type.startsWith("video/")
            ? "video"
            : attachment.file.type.startsWith("audio/")
              ? "audio"
              : "document";
        const mediaObject = {
          link: media.url,
          ...(body && !attachment.file.type.startsWith("audio/") ? { caption: body } : {}),
          ...(type === "document" ? { filename: attachment.file.name } : {}),
        };
        sendCaptionAsText = Boolean(body && type === "audio");
        payload = { type, [type]: mediaObject };
      } else if (attachedContact) {
        const contactPayload = {
          name: attachedContact.name,
          phones: attachedContact.phones,
          ...(attachedContact.org ? { org: attachedContact.org } : {}),
        };
        payload = { type: "contacts", contacts: [contactPayload] };
      } else if (attachedLocation) {
        sendCaptionAsText = Boolean(body);
        payload = { type: "location", location: attachedLocation };
      } else {
        payload = { type: "text", text: { body } };
      }

      await apiFetch("/v1/wa/messages", {
        method: "POST",
        body: {
          customer_id: Number(customerId),
          ...payload,
          ...(attachmentUrl ? { attachment_url: attachmentUrl } : {}),
          ...(replyTarget ? { context: { message_id: replyTarget.waMessageId } } : {}),
        },
      });
      if (sendCaptionAsText) {
        await apiFetch("/v1/wa/messages", {
          method: "POST",
          body: {
            customer_id: Number(customerId),
            type: "text",
            text: { body },
            ...(replyTarget ? { context: { message_id: replyTarget.waMessageId } } : {}),
          },
        });
      }
      setMessage("");
      removeAttachment();
      setReplyTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send message.");
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage();
  }

  const handleLocationChange = useCallback((value: string) => {
    setLocationSearchValue(value);
  }, []);

  const handleLocationSelect = useCallback((location: GoogleLocationSelection | null) => {
    setSelectedLocation(location);
  }, []);

  function updateSelectedLocationField(field: "name" | "address", value: string) {
    setSelectedLocation((current) => {
      if (!current) return current;
      return { ...current, [field]: value };
    });
  }

  function handleMessageChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    const nextMessage = event.target.value;
    setMessage(nextMessage);
    setIsMultiline(event.target.scrollHeight > 40);

    if (!nextMessage.trim()) {
      stopTypingIndicator();
      return;
    }

    const now = Date.now();
    if (!typingActiveRef.current || now - lastTypingAtRef.current >= TYPING_INDICATOR_INTERVAL_MS) {
      startTypingIndicator(now);
    } else {
      lastTypingAtRef.current = now;
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.shiftKey || event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void sendMessage();
    }
  }

  function handleEmojiSelect(emojiData: EmojiClickData) {
    setMessage((current) => `${current}${emojiData.emoji}`);
  }

  function attachLocation() {
    if (!selectedLocation) return;
    const latitudeValue = Number(selectedLocation.latitude);
    const longitudeValue = Number(selectedLocation.longitude);
    if (!Number.isFinite(latitudeValue) || !Number.isFinite(longitudeValue)) return;
    setAttachedLocation({
      latitude: latitudeValue,
      longitude: longitudeValue,
      name: selectedLocation.name.trim() || selectedLocation.address.trim(),
      address: selectedLocation.address.trim(),
    });
    setLocationOpen(false);
    setLocationSearchValue("");
    setSelectedLocation(null);
  }

  function chooseFile(accept: string) {
    const input = fileInputRef.current;
    if (!input) return;
    input.accept = accept;
    input.click();
  }

  async function selectAttachment(file: File) {
    setCompressing(true);
    try {
      validateSelectedAttachment(file);

      let finalFile = file;

      if (file.type.startsWith("image/")) {
        finalFile = await compressImageFile(file);
        if (finalFile.size > IMAGE_MAX_SIZE_BYTES) {
          throw new Error(`Images must be ${formatBytes(IMAGE_MAX_SIZE_BYTES)} or smaller.`);
        }
      } else if (file.type.startsWith("video/")) {
        finalFile = await compressVideoFile(file);
        if (finalFile.size > VIDEO_MAX_SIZE_BYTES) {
          throw new Error(`Videos must be ${formatBytes(VIDEO_MAX_SIZE_BYTES)} or smaller.`);
        }
      }

      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      const previewUrl = finalFile.type.startsWith("image/") ? URL.createObjectURL(finalFile) : null;
      previewUrlRef.current = previewUrl;
      setAttachment({ file: finalFile, previewUrl });
      setAttachmentOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not prepare attachment.");
    } finally {
      setCompressing(false);
    }
  }

  function removeAttachment() {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setAttachment(null);
    setAttachedContact(null);
    setAttachedLocation(null);
  }

  async function importVCard(file: File) {
    const vCard = await file.text();
    const parsedContact = parseVCard(vCard);
    if (!parsedContact) {
      toast.error("Could not read a contact from this vCard file.");
      return;
    }
    setContact(parsedContact);
  }

  function attachContact() {
    if (!contact) return;
    setAttachedContact(contact);
    setContact(null);
    setContactOpen(false);
  }

  return (
    <form
      className="bg-background/80 fixed bottom-0 left-4 right-4 z-20 flex flex-col gap-2 pb-3 pt-3 backdrop-blur sm:left-6 sm:right-6 lg:left-[15.5rem] xl:left-[17.5rem]"
      onSubmit={handleSubmit}
    >
      {compressing ? (
        <div className="flex items-center gap-2 rounded-lg border border-[#d1fae5] bg-[#ecfdf5] px-2 py-1 text-xs font-medium text-[#065f46] dark:border-[#064e3b] dark:bg-[#022c22] dark:text-[#d1fae5]">
          <span className="inline-block size-2 animate-pulse rounded-full bg-[#10b981]" />
          Compressing attachment...
        </div>
      ) : null}
      {replyTarget || attachment || attachedContact || attachedLocation ? (
        <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
          {replyTarget ? (
            <div className="flex w-fit shrink-0 items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground"><Reply className="size-4" /></span>
              <p className="max-w-52 truncate text-sm font-medium">{replyTarget.preview}</p>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Cancel reply" onClick={() => setReplyTarget(null)}><X className="size-4" /></Button>
            </div>
          ) : null}
          {attachment || attachedContact || attachedLocation ? (
            <div className="flex w-fit shrink-0 items-center gap-2">
              {attachment?.previewUrl ? (
                <Image src={attachment.previewUrl} alt="Selected attachment" width={36} height={36} unoptimized className="size-8 rounded-md object-cover" />
              ) : attachedLocation ? null : (
                <span className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  {attachedContact ? <ContactRound className="size-5" /> : attachment?.file.type.startsWith("video/") ? <Video className="size-5" /> : attachment?.file.type.startsWith("audio/") ? <Music2 className="size-5" /> : <FileText className="size-5" />}
                </span>
              )}
              <p className="max-w-52 truncate text-sm font-medium">{attachedContact?.name.formatted_name || attachedLocation?.name || attachedLocation?.address || attachment?.file.name || "Location"}</p>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove attachment" onClick={removeAttachment}>
                <X className="size-4" />
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="flex w-full items-center gap-2">
        <div className="flex min-h-12 flex-1 items-center rounded-full border border-input bg-[#f0f2f5] px-1 dark:bg-[#202c33]">
        <Popover open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-10 rounded-full text-[#54656f] hover:bg-muted/80 dark:text-[#aebac1]"
              aria-label="Add emoji"
            >
              <SmilePlus className="size-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            side="top"
            sideOffset={8}
            className="w-[320px] border border-[#edf0f1] bg-popover p-0 shadow-md dark:border-foreground/10"
          >
            <div className="overflow-hidden rounded-lg">
              <EmojiPicker
                className="!border-0 !shadow-none"
                onEmojiClick={handleEmojiSelect}
                emojiStyle={EmojiStyle.NATIVE}
                theme={emojiPickerTheme}
                width="100%"
                height={360}
                lazyLoadEmojis
                previewConfig={{ showPreview: false }}
                searchPlaceHolder="Search emoji"
              />
            </div>
          </PopoverContent>
        </Popover>
        <textarea
          value={message}
          onChange={handleMessageChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message"
          rows={1}
          className="field-sizing-content max-h-32 min-h-12 w-0 min-w-0 flex-1 resize-none border-0 bg-transparent pr-3 py-3.5 text-base leading-5 text-[#111b21] outline-none placeholder:text-[#667781] focus-visible:ring-0 dark:text-[#e9edef] dark:placeholder:text-[#8696a0]"
        />
        <AttachmentPopover
          open={attachmentOpen}
          onOpenChange={setAttachmentOpen}
          onChooseFile={chooseFile}
          onChooseLocation={() => {
            setAttachmentOpen(false);
            setLocationOpen(true);
          }}
          onChooseContact={() => {
            setAttachmentOpen(false);
            setContactOpen(true);
          }}
          disabled={attachment !== null || attachedContact !== null || attachedLocation !== null}
        />
      </div>
      {disabledReason ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button
                type="submit"
                size="icon-lg"
                className="size-12 rounded-full bg-[#00a884] text-white hover:bg-[#008f72] disabled:bg-[#8bcfbd] dark:bg-[#00a884] dark:hover:bg-[#00a884]/85"
                aria-label="Send message"
                disabled
              >
                <Send className="size-4" />
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8}>{disabledReason}</TooltipContent>
        </Tooltip>
      ) : (
        <Button
          type="submit"
          size="icon-lg"
          className="size-12 rounded-full bg-[#00a884] text-white hover:bg-[#008f72] disabled:bg-[#8bcfbd] dark:bg-[#00a884] dark:hover:bg-[#00a884]/85"
          aria-label="Send message"
          disabled={!canSend}
        >
          <Send className="size-4" />
        </Button>
      )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) selectAttachment(file);
          event.target.value = "";
        }}
      />
      <input
        ref={vCardInputRef}
        type="file"
        accept="text/vcard,text/x-vcard,.vcf"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void importVCard(file);
          event.target.value = "";
        }}
      />
      <Dialog open={locationOpen} onOpenChange={setLocationOpen}>
        <DialogContent
          className="!max-h-[85vh] h-[70vh] overflow-y-auto [&>[data-slot=dialog-header]~*:not([data-slot=dialog-footer]):not([data-slot=dialog-close])]:overflow-visible"
          style={{ width: "min(90vw, 48rem)", maxWidth: "48rem" }}
        >
          <DialogHeader>
            <DialogTitle>Attach location</DialogTitle>
            <DialogDescription>Search for a place on Google Maps.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 overflow-visible pb-2" style={{ overflow: "visible" }}>
            <GoogleLocationInput
              value={locationSearchValue}
              onChange={handleLocationChange}
              onPlaceSelect={handleLocationSelect}
            />
            {selectedLocation ? (
              <div className="grid gap-3 pt-1">
                <div className="grid gap-1.5">
                  <label className="text-sm font-medium">Location name</label>
                  <Input
                    value={selectedLocation.name}
                    onChange={(event) => updateSelectedLocationField("name", event.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-sm font-medium">Location address</label>
                  <Input
                    value={selectedLocation.address}
                    onChange={(event) => updateSelectedLocationField("address", event.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-sm font-medium">Latitude</label>
                  <Input value={selectedLocation.latitude ?? ""} readOnly className="bg-muted/50 text-muted-foreground" />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-sm font-medium">Longitude</label>
                  <Input value={selectedLocation.longitude ?? ""} readOnly className="bg-muted/50 text-muted-foreground" />
                </div>
              </div>
            ) : null}
            <Button type="button" onClick={attachLocation} disabled={!selectedLocation?.latitude || !selectedLocation?.longitude}>Attach location</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Attach contact</DialogTitle>
            <DialogDescription>Import a vCard contact from your computer.</DialogDescription>
          </DialogHeader>
          {contact ? (
            <div className="rounded-lg border p-3">
              <p className="font-medium">{contact.name.formatted_name}</p>
              {contact.phones.map((phone) => <p key={phone.phone} className="text-muted-foreground mt-1 text-sm">{phone.phone}</p>)}
            </div>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => vCardInputRef.current?.click()}>Choose vCard</Button>
            <Button type="button" onClick={attachContact} disabled={!contact}>Attach contact</Button>
          </div>
        </DialogContent>
      </Dialog>
    </form>
  );
}

function AttachmentOption({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return <Button type="button" variant="ghost" className="h-auto flex-col gap-1.5 p-0 text-xs font-normal" onClick={onClick}><span className="flex size-9 items-center justify-center rounded-full bg-[#d9fdd3] text-[#008f72] dark:bg-[#005c4b] dark:text-[#e9edef]">{icon}</span>{label}</Button>;
}

function AttachmentPopover({
  open,
  onOpenChange,
  onChooseFile,
  onChooseLocation,
  onChooseContact,
  disabled,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChooseFile: (accept: string) => void;
  onChooseLocation: () => void;
  onChooseContact: () => void;
  disabled: boolean;
}) {
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange,
    placement: "top-end",
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(16),
      flip(),
      shift({ padding: 8 }),
    ],
  });
  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss, role]);

  return (
    <>
      <Button ref={refs.setReference} type="button" variant="ghost" size="icon" className="text-[#54656f] dark:text-[#aebac1]" aria-label="Attach file" disabled={disabled} {...getReferenceProps()}>
        <Paperclip className="size-5" />
      </Button>
      {open ? (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false}>
            {/* Floating UI's callback ref is safe to attach during render. */}
            {/* eslint-disable-next-line react-hooks/refs */}
            <div ref={refs.setFloating} style={floatingStyles} className={cn("z-50 w-60 rounded-lg p-3", popoverSurfaceClassName)} {...getFloatingProps()}>
              <div className="relative grid grid-cols-3 gap-x-2 gap-y-3">
                <AttachmentOption icon={<ImageIcon />} label="Images" onClick={() => onChooseFile("image/jpeg,image/png")} />
                <AttachmentOption icon={<Video />} label="Video" onClick={() => onChooseFile("video/mp4,video/3gpp")} />
                <AttachmentOption icon={<Music2 />} label="Audio" onClick={() => onChooseFile("audio/aac,audio/amr,audio/mpeg,audio/mp4,audio/ogg,audio/opus")} />
                <AttachmentOption icon={<FileText />} label="Document" onClick={() => onChooseFile("text/plain,text/csv,application/pdf,application/msword,application/vnd.ms-excel,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation")} />
                <AttachmentOption icon={<MapPin />} label="Location" onClick={onChooseLocation} />
                <AttachmentOption icon={<ContactRound />} label="Contact" onClick={onChooseContact} />
              </div>
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      ) : null}
    </>
  );
}