"use client";

import { ContactRound, MapPin, Phone, Reply, SmilePlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { type ChatMessage, useChatCompose } from "@/components/chat-compose-context";
import { apiFetch } from "@/lib/api/client";
import { ChatMediaViewer } from "@/components/chat-media-viewer";
import { Button } from "@/components/ui/button";

type Message = ChatMessage;

type MessageListResponse = {
  items: Message[];
  number_of_pages: number;
};

type MessageMenu = { message: Message; x: number; y: number };

const displayableMessageTypes = new Set([
  "text",
  "document",
  "image",
  "location",
  "contacts",
  "audio",
  "video",
  "unsupported",
]);

type ChatMessageHistoryProps = {
  initialMessages: Message[];
  numberOfPages: number;
  phoneNumberId: string;
  customerPhoneNumber?: string;
  customerMetaUserId?: string;
  recipient: string;
};

function messageDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Singapore",
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(timestamp * 1000));
}

function messageTime(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Singapore",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(timestamp * 1000));
}

function messageBody(message: Message) {
  const payload = message.payload;
  if (message.type === "text" && typeof payload.text === "object" && payload.text) {
    const text = payload.text as { body?: unknown };
    if (typeof text.body === "string") return text.body;
  }
  return message.type;
}

function isDisplayableMessage(message: Message) {
  return displayableMessageTypes.has(message.type);
}

function MessageContent({ message }: { message: Message }) {
  const payload = message.payload;
  const media = payload[message.type] as
    | { id?: string; mime_type?: string; caption?: string; filename?: string }
    | undefined;
  const location = payload.location as
    | { latitude?: number; longitude?: number; name?: string; address?: string }
    | undefined;
  const contacts = payload.contacts as
    | { name?: { formatted_name?: string }; phones?: { phone: string }[] }[]
    | undefined;
  const errors = payload.errors as { title?: unknown; message?: unknown } | undefined;
  const errorData = payload.error_data as { details?: unknown } | null | undefined;
  const hasReply = message.type === "text" && Boolean(payload.context);

  return (
    <>
      {hasReply ? <p className="mb-1.5 rounded-md border-l-4 border-[#06cf9c] bg-black/5 px-2 py-1.5 text-xs text-[#54656f] dark:bg-black/15 dark:text-[#aebac1]">Replying to previous message</p> : null}
      {message.type === "unsupported" ? (
        <div className="space-y-1">
          <p className="font-medium">{typeof errors?.title === "string" ? errors.title : "Unsupported message"}</p>
          {typeof errorData?.details === "string" ? <p className="text-sm opacity-70">{errorData.details}</p> : typeof errors?.message === "string" ? <p className="text-sm opacity-70">{errors.message}</p> : null}
        </div>
      ) : media?.id && (message.type === "image" || message.type === "video" || message.type === "audio" || message.type === "document") ? (
        <>
          <ChatMediaViewer mediaId={media.id} type={message.type as "image" | "video" | "audio" | "document"} mimeType={media.mime_type ?? ""} filename={media.filename} />
          {media.caption ? <p className="mt-2 whitespace-pre-wrap">{media.caption}</p> : null}
        </>
      ) : location?.latitude !== undefined && location.longitude !== undefined ? (
        <a href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`} target="_blank" rel="noreferrer" className="flex items-start gap-3 rounded-md bg-black/5 p-2 dark:bg-white/10">
          <MapPin className="mt-0.5 size-5 shrink-0" />
          <span><span className="block text-sm font-medium">{location.name || "Location"}</span>{location.address ? <span className="mt-0.5 block text-xs opacity-70">{location.address}</span> : null}</span>
        </a>
      ) : contacts?.length ? (
        <div className="space-y-2">{contacts.map((contact, index) => <div key={index} className="rounded-md bg-black/5 p-3 dark:bg-white/10"><div className="flex items-center gap-2"><ContactRound className="size-5" /><p className="text-sm font-medium">{contact.name?.formatted_name || "Contact"}</p></div>{contact.phones?.map((phone, phoneIndex) => <p key={phoneIndex} className="mt-2 flex items-center gap-2 text-sm"><Phone className="size-3.5" />{phone.phone}</p>)}</div>)}</div>
      ) : <p className="whitespace-pre-wrap">{messageBody(message)}</p>}
    </>
  );
}

export function ChatMessageHistory({
  initialMessages,
  numberOfPages,
  phoneNumberId,
  customerPhoneNumber,
  customerMetaUserId,
  recipient,
}: ChatMessageHistoryProps) {
  const { appendedMessages, setReplyTarget } = useChatCompose();
  const [messages, setMessages] = useState(() => initialMessages.filter(isDisplayableMessage));
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [menu, setMenu] = useState<MessageMenu | null>(null);
  const [showEmojis, setShowEmojis] = useState(false);
  const documentHeightRef = useRef(0);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo({ top: document.documentElement.scrollHeight });
  }, []);

  useEffect(() => {
    if (appendedMessages.length === 0) return;
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
  }, [appendedMessages.length]);

  async function loadOlderMessages() {
    if (loading || page >= numberOfPages) return;
    documentHeightRef.current = document.documentElement.scrollHeight;
    setLoading(true);
    try {
      const response = await apiFetch<MessageListResponse>("/v1/wa/messages", {
        query: {
          phone_number_id: phoneNumberId,
          customer_phone_number: customerPhoneNumber,
          customer_meta_user_id: customerMetaUserId,
          page: String(page + 1),
          page_size: "50",
        },
      });
      setMessages((current) => [
        ...response.items.filter(isDisplayableMessage).sort((a, b) => a.timestamp - b.timestamp),
        ...current,
      ]);
      setPage((current) => current + 1);
      requestAnimationFrame(() => {
        window.scrollBy(0, document.documentElement.scrollHeight - documentHeightRef.current);
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY <= 8) void loadOlderMessages();
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  });

  useEffect(() => {
    if (!menu) return;
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenu(null);
    };
    window.addEventListener("pointerdown", closeOnOutsidePress);
    return () => window.removeEventListener("pointerdown", closeOnOutsidePress);
  }, [menu]);

  async function reactToMessage(emoji: string) {
    if (!menu?.message.meta_id) return;
    try {
      await apiFetch("/v1/wa/messages", {
        method: "POST",
        body: {
          recipient_type: "individual",
          to: recipient,
          type: "reaction",
          reaction: { message_id: menu.message.meta_id, emoji },
        },
      });
      setMenu(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send reaction.");
    }
  }

  return (
    <div className="pb-20">
      {page >= numberOfPages ? <p className="mb-3 text-center text-xs text-muted-foreground">No more message</p> : null}
      {loading ? <p className="mb-3 text-center text-xs text-muted-foreground">Loading...</p> : null}
      {[...messages, ...appendedMessages].sort((a, b) => a.timestamp - b.timestamp).map((message, index, allMessages) => (
        <div key={message.id}>
          {index === 0 || messageDate(allMessages[index - 1].timestamp) !== messageDate(message.timestamp) ? (
            <p className="mx-auto mb-3 w-fit rounded-lg bg-[#e9edef] px-3 py-1.5 text-xs text-[#54656f] dark:bg-[#182229] dark:text-[#8696a0]">{messageDate(message.timestamp)}</p>
          ) : null}
          <div onContextMenu={(event) => { event.preventDefault(); setShowEmojis(false); setMenu({ message, x: event.clientX, y: event.clientY }); }} className={message.sending ? "relative mb-2 ml-auto w-fit max-w-[80%] rounded-[7.5px] rounded-tr-none border border-[#edf0f1] bg-[#d9fdd3] px-2 py-1.5 text-sm leading-[1.35] text-[#111b21] dark:border-[#087663] dark:bg-[#005c4b] dark:text-[#e9edef]" : "relative mb-2 w-fit max-w-[80%] rounded-[7.5px] rounded-tl-none border border-[#edf0f1] bg-white px-2 py-1.5 text-sm leading-[1.35] text-[#111b21] dark:border-[#314047] dark:bg-[#202c33] dark:text-[#e9edef]"}>
            <MessageContent message={message} />
            <p className="mt-0.5 text-right text-[0.6875rem] leading-none text-[#667781] dark:text-[#aebac1]">{messageTime(message.timestamp)}</p>
          </div>
        </div>
      ))}
      {menu ? (
        <div ref={menuRef} className="fixed z-50 w-52 max-w-[calc(100vw-1rem)] rounded-lg bg-popover p-1 shadow-md ring-1 ring-[#edf0f1] dark:ring-foreground/10" style={{ left: Math.max(8, Math.min(menu.x, window.innerWidth - 216)), top: Math.max(8, Math.min(menu.y, window.innerHeight - (showEmojis ? 224 : 80))) }}>
          <Button type="button" variant="ghost" className="w-full justify-start" onClick={() => { setReplyTarget({ metaId: menu.message.meta_id, preview: messageBody(menu.message) }); setMenu(null); }}><Reply />Reply</Button>
          <Button type="button" variant="ghost" className="w-full justify-start" onClick={() => setShowEmojis(true)}><SmilePlus />React</Button>
          {showEmojis ? <div className="border-t p-1.5"><div className="grid max-h-20 grid-cols-6 gap-1 overflow-y-auto text-lg">{["👍", "❤️", "😂", "😮", "😢", "🙏", "👏", "🔥", "😍", "🎉", "✅", "💯", "🤔", "👀", "🙌", "😅", "💪", "🤝", "💚", "✨", "😁", "😎", "🤗", "🫡"].map((emoji) => <button key={emoji} type="button" className="rounded p-1 hover:bg-muted" onClick={() => void reactToMessage(emoji)}>{emoji}</button>)}</div><input aria-label="Paste an emoji and press Enter" placeholder="Paste an emoji and press Enter" className="mt-2 h-7 w-full rounded border bg-transparent px-2 text-xs" onPaste={(event) => { const emoji = event.clipboardData.getData("text").trim(); if (emoji) { event.preventDefault(); void reactToMessage(emoji); } }} onKeyDown={(event) => { if (event.key === "Enter" && event.currentTarget.value.trim()) { event.preventDefault(); void reactToMessage(event.currentTarget.value.trim()); } }} /></div> : null}
        </div>
      ) : null}
    </div>
  );
}
