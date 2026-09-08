"use client";

import { ContactRound, FileText, ImageIcon, Library, MapPin, Music2, Paperclip, Reply, Send, Video, X } from "lucide-react";
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
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useChatCompose } from "@/components/chat-compose-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { popoverSurfaceClassName } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api/client";

type ChatMessageComposerProps = {
  recipient: string;
  lastCustomerMessageTimestamp: number | null;
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
  recipient,
  lastCustomerMessageTimestamp,
}: ChatMessageComposerProps) {
  const { replyTarget, setReplyTarget } = useChatCompose();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [isMultiline, setIsMultiline] = useState(false);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [locationName, setLocationName] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [contact, setContact] = useState<WhatsAppContact | null>(null);
  const [attachedContact, setAttachedContact] = useState<WhatsAppContact | null>(null);
  const [attachedLocation, setAttachedLocation] = useState<AttachedLocation | null>(null);
  const [attachment, setAttachment] = useState<SelectedAttachment | null>(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const vCardInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const serviceWindowOpen =
    lastCustomerMessageTimestamp !== null &&
    currentTime - lastCustomerMessageTimestamp * 1000 <= 24 * 60 * 60 * 1000;
  const hasSendableContent = Boolean(message.trim() || attachedContact || attachedLocation || attachment);
  const canSend = hasSendableContent && serviceWindowOpen && !sending;
  const disabledReason = !serviceWindowOpen
    ? "The 24-hour customer service window has closed"
    : !hasSendableContent
      ? "Enter a message or add an attachment"
      : null;

  useEffect(() => {
    const interval = window.setInterval(() => setCurrentTime(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  async function sendMessage() {
    const body = message.trim();
    if (!hasSendableContent || !serviceWindowOpen || sending) return;

    setSending(true);
    try {
      let payload: Record<string, unknown>;
      let attachmentUrl: string | undefined;
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
          ...(body ? { caption: body } : {}),
          ...(type === "document" ? { filename: attachment.file.name } : {}),
        };
        payload = { type, [type]: mediaObject };
      } else if (attachedContact) {
        const contactPayload = {
          name: attachedContact.name,
          phones: attachedContact.phones,
          ...(attachedContact.org ? { org: attachedContact.org } : {}),
        };
        payload = { type: "contacts", contacts: [contactPayload] };
      } else if (attachedLocation) {
        payload = { type: "location", location: attachedLocation };
      } else {
        payload = { type: "text", text: { body } };
      }

      await apiFetch("/v1/wa/messages", {
        method: "POST",
        body: {
          recipient_type: "individual",
          to: recipient,
          ...payload,
          ...(attachmentUrl ? { attachment_url: attachmentUrl } : {}),
          ...(replyTarget ? { context: { message_id: replyTarget.waMessageId } } : {}),
        },
      });
      setMessage("");
      removeAttachment();
      setReplyTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send message.");
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage();
  }

  function handleMessageChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    setMessage(event.target.value);
    setIsMultiline(event.target.scrollHeight > 40);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.shiftKey || event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void sendMessage();
    }
  }

  function attachLocation() {
    const latitudeValue = Number(latitude);
    const longitudeValue = Number(longitude);
    if (!Number.isFinite(latitudeValue) || !Number.isFinite(longitudeValue)) return;
    setAttachedLocation({
      latitude: latitudeValue,
      longitude: longitudeValue,
      name: locationName.trim(),
      address: locationAddress.trim(),
    });
    setLocationOpen(false);
    setLatitude("");
    setLongitude("");
    setLocationName("");
    setLocationAddress("");
  }

  function chooseFile(accept: string) {
    const input = fileInputRef.current;
    if (!input) return;
    input.accept = accept;
    input.click();
  }

  function selectAttachment(file: File) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
    previewUrlRef.current = previewUrl;
    setAttachment({ file, previewUrl });
    setAttachmentOpen(false);
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
      className="bg-background/80 fixed right-0 bottom-0 left-0 z-20 flex flex-col gap-2 px-3 py-2 backdrop-blur lg:left-64"
      onSubmit={handleSubmit}
    >
      {replyTarget || attachment || attachedContact || attachedLocation ? (
        <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
          {replyTarget ? (
            <div className="flex h-12 w-fit shrink-0 items-center gap-3 rounded-lg border border-[#edf0f1] bg-white p-1.5 dark:border-transparent dark:bg-[#202c33]">
              <span className="flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground"><Reply className="size-4" /></span>
              <p className="max-w-52 truncate text-sm font-medium">{replyTarget.preview}</p>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Cancel reply" onClick={() => setReplyTarget(null)}><X className="size-4" /></Button>
            </div>
          ) : null}
          {attachment || attachedContact || attachedLocation ? (
            <div className="bg-background/35 border-border flex h-12 w-fit shrink-0 items-center gap-3 rounded-lg border p-1.5 backdrop-blur">
              {attachment?.previewUrl ? (
                <Image src={attachment.previewUrl} alt="Selected attachment" width={36} height={36} unoptimized className="size-9 rounded-md object-cover" />
              ) : (
                <span className="flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  {attachedContact ? <ContactRound className="size-5" /> : attachedLocation ? <MapPin className="size-5" /> : attachment?.file.type.startsWith("video/") ? <Video className="size-5" /> : attachment?.file.type.startsWith("audio/") ? <Music2 className="size-5" /> : <FileText className="size-5" />}
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
      <div className={cn("bg-background/35 border-border flex min-h-12 flex-1 items-center border pl-4 pr-1 backdrop-blur", isMultiline ? "rounded-2xl" : "rounded-full")}>
        <textarea
          value={message}
          onChange={handleMessageChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message"
          rows={1}
          className="field-sizing-content max-h-32 min-h-10 flex-1 resize-none border-0 bg-transparent py-2 text-base leading-5 text-[#111b21] outline-none placeholder:text-[#667781] focus-visible:ring-0 dark:text-[#e9edef] dark:placeholder:text-[#8696a0]"
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
          onChooseLibrary={() => {
            setAttachmentOpen(false);
            setLibraryOpen(true);
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
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Attach location</DialogTitle>
            <DialogDescription>Enter the location details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <input value={locationName} onChange={(event) => setLocationName(event.target.value)} placeholder="Name" className="border-input h-9 rounded-md border bg-transparent px-3 text-sm" />
            <input value={locationAddress} onChange={(event) => setLocationAddress(event.target.value)} placeholder="Address" className="border-input h-9 rounded-md border bg-transparent px-3 text-sm" />
            <input value={latitude} onChange={(event) => setLatitude(event.target.value)} placeholder="Latitude" inputMode="decimal" className="border-input h-9 rounded-md border bg-transparent px-3 text-sm" />
            <input value={longitude} onChange={(event) => setLongitude(event.target.value)} placeholder="Longitude" inputMode="decimal" className="border-input h-9 rounded-md border bg-transparent px-3 text-sm" />
            <Button type="button" onClick={attachLocation} disabled={!latitude || !longitude}>Attach location</Button>
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
      <Dialog open={libraryOpen} onOpenChange={setLibraryOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Media library</DialogTitle>
            <DialogDescription>Your previously uploaded media will appear here.</DialogDescription>
          </DialogHeader>
          <p className="text-muted-foreground py-8 text-center text-sm">No media yet.</p>
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
  onChooseLibrary,
  disabled,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChooseFile: (accept: string) => void;
  onChooseLocation: () => void;
  onChooseContact: () => void;
  onChooseLibrary: () => void;
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
                <AttachmentOption icon={<ImageIcon />} label="Images" onClick={() => onChooseFile("image/jpeg,image/png,image/webp")} />
                <AttachmentOption icon={<Video />} label="Video" onClick={() => onChooseFile("video/mp4,video/3gpp")} />
                <AttachmentOption icon={<Music2 />} label="Audio" onClick={() => onChooseFile("audio/aac,audio/amr,audio/mpeg,audio/mp4,audio/ogg,audio/opus")} />
                <AttachmentOption icon={<FileText />} label="Document" onClick={() => onChooseFile("text/plain,text/csv,application/pdf,application/msword,application/vnd.ms-excel,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation")} />
                <AttachmentOption icon={<MapPin />} label="Location" onClick={onChooseLocation} />
                <AttachmentOption icon={<ContactRound />} label="Contact" onClick={onChooseContact} />
                <AttachmentOption icon={<Library />} label="Library" onClick={onChooseLibrary} />
              </div>
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      ) : null}
    </>
  );
}