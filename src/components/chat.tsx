"use client";

import { ArrowDown, Check, CheckCheck, ContactRound, MapPin, Phone, Reply, SmilePlus } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { toast } from "sonner";

import {
  type ChatMessage,
  type ChatMessageStatus,
  useChatCompose,
} from "@/components/chat-compose-context";
import { createAblyConversationProvider } from "@/lib/ably-realtime";
import { apiFetch } from "@/lib/api/client";
import { ChatMediaViewer } from "@/components/chat-media-viewer";
import { Button } from "@/components/ui/button";

type Message = ChatMessage;

type MessageListResponse = {
  items: Message[];
  number_of_pages: number;
};

type MessageMenu = { message: Message; x: number; y: number };

const realtimeProvider = createAblyConversationProvider<Message, ChatMessageStatus>();

const displayableMessageTypes = new Set([
  "text",
  "template",
  "interactive",
  "button",
  "document",
  "image",
  "sticker",
  "location",
  "contacts",
  "audio",
  "video",
  "unsupported",
]);
const bottomScrollThreshold = 120;

type ChatProps = {
  initialMessages: Message[];
  numberOfPages: number;
  phoneNumberId: string;
  customerId: string;
  customerWAId?: string;
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
  if (message.type === "template" && typeof payload.template === "object" && payload.template) {
    const template = payload.template as { name?: unknown };
    if (typeof template.name === "string") return template.name;
  }
  if (message.type === "interactive" && typeof payload.interactive === "object" && payload.interactive) {
    const interactive = payload.interactive as {
      body?: { text?: unknown };
      button_reply?: { title?: unknown };
      list_reply?: { title?: unknown };
    };
    if (typeof interactive.button_reply?.title === "string") return interactive.button_reply.title;
    if (typeof interactive.list_reply?.title === "string") return interactive.list_reply.title;
    if (typeof interactive.body?.text === "string") return interactive.body.text;
  }
  if (message.type === "button" && typeof payload.button === "object" && payload.button) {
    const button = payload.button as { text?: unknown; payload?: unknown };
    if (typeof button.text === "string") return button.text;
    if (typeof button.payload === "string") return button.payload;
  }
  return message.type;
}

function templateDetails(message: Message) {
  if (message.type !== "template") return null;
  const template = message.payload.template;
  if (typeof template !== "object" || !template) return { name: "Template message", language: null, parameters: [] };

  const data = template as {
    name?: unknown;
    language?: { code?: unknown };
    components?: { parameters?: { text?: unknown }[] }[];
  };
  const parameters = data.components
    ?.flatMap((component) => component.parameters ?? [])
    .map((parameter) => parameter.text)
    .filter((text): text is string => typeof text === "string" && text.trim().length > 0) ?? [];

  return {
    name: typeof data.name === "string" ? data.name : "Template message",
    language: typeof data.language?.code === "string" ? data.language.code : null,
    parameters,
  };
}

function interactiveDetails(message: Message) {
  if (message.type !== "interactive") return null;
  const interactive = message.payload.interactive;
  if (typeof interactive !== "object" || !interactive) {
    return { label: "Interactive", title: "Interactive message", description: null };
  }

  const data = interactive as {
    type?: unknown;
    body?: { text?: unknown };
    button_reply?: { title?: unknown; id?: unknown };
    list_reply?: { title?: unknown; description?: unknown; id?: unknown };
  };
  const reply = data.button_reply ?? data.list_reply;
  const title = typeof reply?.title === "string"
    ? reply.title
    : typeof data.body?.text === "string"
      ? data.body.text
      : "Interactive message";
  const description = typeof data.list_reply?.description === "string"
    ? data.list_reply.description
    : typeof reply?.id === "string"
      ? reply.id
      : null;

  return {
    label: typeof data.type === "string" ? data.type.replaceAll("_", " ") : "Interactive",
    title,
    description,
  };
}

function buttonDetails(message: Message) {
  if (message.type !== "button") return null;
  const button = message.payload.button;
  if (typeof button !== "object" || !button) return { text: "Button response", payload: null };

  const data = button as { text?: unknown; payload?: unknown };
  return {
    text: typeof data.text === "string" ? data.text : "Button response",
    payload: typeof data.payload === "string" ? data.payload : null,
  };
}

function isEmojiOnly(value: string) {
  return value.trim().length > 0 && /^(?:[\p{Extended_Pictographic}\p{Emoji_Presentation}\uFE0F\u200D\s])+$/u.test(value);
}

function reactionEmoji(message: Message) {
  const payload = message.payload as {
    reaction?: { emoji?: unknown };
    reactions?: { emoji?: unknown }[];
  };
  if (typeof payload.reaction?.emoji === "string") return payload.reaction.emoji;
  return payload.reactions?.find((reaction) => typeof reaction.emoji === "string")?.emoji as string | undefined;
}

function reactionTargetId(message: Message) {
  const reaction = (message.payload as { reaction?: { message_id?: unknown } }).reaction;
  return typeof reaction?.message_id === "string" ? reaction.message_id : undefined;
}

function reactionUserId(message: Message) {
  const payload = message.payload as { from?: unknown; from_user_id?: unknown };
  return typeof payload.from_user_id === "string"
    ? payload.from_user_id
    : typeof payload.from === "string"
      ? payload.from
      : message.sending
        ? "sender"
        : "recipient";
}

function isDisplayableMessage(message: Message) {
  return displayableMessageTypes.has(message.type);
}

function groupMessagesByDate(messages: Message[]) {
  const groups: { date: string; messages: Message[] }[] = [];
  for (const message of messages) {
    const date = messageDate(message.timestamp);
    const latestGroup = groups[groups.length - 1];
    if (latestGroup?.date === date) {
      latestGroup.messages.push(message);
    } else {
      groups.push({ date, messages: [message] });
    }
  }
  return groups;
}

function mergeMessages(current: Message[], incoming: Message[]) {
  const messagesByWhatsAppId = new Map(
    [...current, ...incoming].map((message) => [message.wa_message_id, message]),
  );
  return [...messagesByWhatsAppId.values()].sort((first, second) => first.timestamp - second.timestamp);
}

function MessageStatusIcon({ status }: { status?: string }) {
  if (status === "delivered") return <CheckCheck className="size-3.5" aria-label="Delivered" />;
  if (status === "read" || status === "played") {
    return <CheckCheck className="size-3.5 text-[#00a884]" aria-label="Read" />;
  }
  return <Check className="size-3.5" aria-label="Sent" />;
}

function MessageContent({ message }: { message: Message }) {
  const payload = message.payload;
  const media = payload[message.type] as
    | { id?: string; mime_type?: string; caption?: string; filename?: string; url?: string }
    | undefined;
  const attachmentUrl = typeof message.attachment_url === "string" ? message.attachment_url : "";
  const location = payload.location as
    | { latitude?: number; longitude?: number; name?: string; address?: string }
    | undefined;
  const contacts = payload.contacts as
    | { name?: { formatted_name?: string }; phones?: { phone: string }[] }[]
    | undefined;
  const errors = payload.errors as { title?: unknown; message?: unknown } | undefined;
  const errorData = payload.error_data as { details?: unknown } | null | undefined;
  const hasReply = message.type === "text" && Boolean(payload.context);
  const template = templateDetails(message);
  const interactive = interactiveDetails(message);
  const button = buttonDetails(message);

  return (
    <>
      {hasReply ? <p className="mb-1.5 rounded-md border-l-4 border-[#06cf9c] bg-black/5 px-2 py-1.5 text-xs text-[#54656f] dark:bg-black/15 dark:text-[#aebac1]">Replying to previous message</p> : null}
      {message.type === "unsupported" ? (
        <div className="space-y-1">
          <p className="font-medium">{typeof errors?.title === "string" ? errors.title : "Unsupported message"}</p>
          {typeof errorData?.details === "string" ? <p className="text-sm opacity-70">{errorData.details}</p> : typeof errors?.message === "string" ? <p className="text-sm opacity-70">{errors.message}</p> : null}
        </div>
      ) : template ? (
        <div className="space-y-1 rounded-md bg-black/5 p-2 dark:bg-white/10">
          <p className="text-xs font-medium uppercase tracking-wide opacity-70">Template</p>
          <p className="font-medium">{template.name}</p>
          {template.language ? <p className="text-xs opacity-70">{template.language}</p> : null}
          {template.parameters.length > 0 ? (
            <div className="mt-2 space-y-1 border-t border-black/10 pt-2 text-sm dark:border-white/10">
              {template.parameters.map((parameter, index) => (
                <p key={`${parameter}-${index}`} className="whitespace-pre-wrap">{parameter}</p>
              ))}
            </div>
          ) : null}
        </div>
      ) : interactive ? (
        <div className="space-y-1 rounded-md bg-black/5 p-2 dark:bg-white/10">
          <p className="text-xs font-medium uppercase tracking-wide opacity-70">{interactive.label}</p>
          <p className="font-medium whitespace-pre-wrap">{interactive.title}</p>
          {interactive.description ? <p className="text-xs opacity-70">{interactive.description}</p> : null}
        </div>
      ) : button ? (
        <div className="space-y-1 rounded-md bg-black/5 p-2 dark:bg-white/10">
          <p className="text-xs font-medium uppercase tracking-wide opacity-70">Button response</p>
          <p className="font-medium whitespace-pre-wrap">{button.text}</p>
          {button.payload ? <p className="text-xs opacity-70">{button.payload}</p> : null}
        </div>
      ) : (media?.id || attachmentUrl) && (message.type === "image" || message.type === "sticker" || message.type === "video" || message.type === "audio" || message.type === "document") ? (
        <>
          <ChatMediaViewer
            mediaId={media?.id}
            waMessageId={message.wa_message_id}
            mediaUrl={attachmentUrl || undefined}
            type={message.type as "image" | "sticker" | "video" | "audio" | "document"}
            mimeType={media?.mime_type ?? ""}
            filename={media?.filename}
            autoLoad={message.auto_load_media}
          />
          {media?.caption ? <p className="mt-2 whitespace-pre-wrap">{media.caption}</p> : null}
        </>
      ) : location?.latitude !== undefined && location.longitude !== undefined ? (
        <a href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`} target="_blank" rel="noreferrer" className="flex items-start gap-3 rounded-md bg-black/5 p-2 dark:bg-white/10">
          <MapPin className="mt-0.5 size-5 shrink-0" />
          <span><span className="block text-sm font-medium">{location.name || "Location"}</span>{location.address ? <span className="mt-0.5 block text-xs opacity-70">{location.address}</span> : null}</span>
        </a>
      ) : contacts?.length ? (
        <div className="space-y-2">{contacts.map((contact, index) => <div key={index} className="rounded-md bg-black/5 p-3 dark:bg-white/10"><div className="flex items-center gap-2"><ContactRound className="size-5" /><p className="text-sm font-medium">{contact.name?.formatted_name || "Contact"}</p></div>{contact.phones?.map((phone, phoneIndex) => <p key={phoneIndex} className="mt-2 flex items-center gap-2 text-sm"><Phone className="size-3.5" />{phone.phone}</p>)}</div>)}</div>
      ) : (() => {
        const body = messageBody(message);
        return <p className={`whitespace-pre-wrap ${isEmojiOnly(body) ? "text-4xl leading-tight" : ""}`}>{body}</p>;
      })()}
    </>
  );
}

export function Chat({
  initialMessages,
  numberOfPages,
  phoneNumberId,
  customerId,
  customerWAId,
  customerMetaUserId,
  recipient,
}: ChatProps) {
  const { appendMessage, appendedMessages, setReplyTarget, updateMessageStatus } = useChatCompose();
  const [messages, setMessages] = useState(() => initialMessages);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [menu, setMenu] = useState<MessageMenu | null>(null);
  const [showEmojis, setShowEmojis] = useState(false);
  const documentHeightRef = useRef(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const realtimeConnectedRef = useRef(false);
  const isNearBottomRef = useRef(true);
  const [showScrollToLatest, setShowScrollToLatest] = useState(false);

  function updateScrollPosition() {
    const distanceFromBottom = document.documentElement.scrollHeight - (window.scrollY + window.innerHeight);
    const isNearBottom = distanceFromBottom <= bottomScrollThreshold;
    isNearBottomRef.current = isNearBottom;
    setShowScrollToLatest(!isNearBottom && document.documentElement.scrollHeight > window.innerHeight);
  }

  function scrollToLatest() {
    isNearBottomRef.current = true;
    setShowScrollToLatest(false);
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
  }

  async function refreshRecentMessages() {
    try {
      const response = await apiFetch<MessageListResponse>("/v1/wa/messages", {
        query: {
          customer_id: customerId,
          page: "1",
          page_size: "50",
        },
      });
      const recentMessages = response.items.filter(isDisplayableMessage);
      setMessages((current) => {
        const merged = new Map(current.map((message) => [message.wa_message_id, message]));
        for (const message of recentMessages) merged.set(message.wa_message_id, message);
        return [...merged.values()].sort((first, second) => first.timestamp - second.timestamp);
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not refresh messages after reconnecting.");
    }
  }

  const handleRealtimeEvent = useEffectEvent((event: { type: "message"; message: Message } | { type: "status"; status: ChatMessageStatus } | { type: "connection"; state: string }) => {
    if (event.type === "message" && event.message.type !== "unsupported" && isDisplayableMessage(event.message)) {
      appendMessage({ ...event.message, auto_load_media: true });
    }
    if (event.type === "status") {
      setMessages((current) =>
        current.map((message) =>
          message.wa_message_id === event.status.wa_message_id
            ? { ...message, status: event.status.status }
            : message,
        ),
      );
      updateMessageStatus(event.status);
    }
    if (event.type === "connection") {
      if (event.state === "connected") {
        const wasConnected = realtimeConnectedRef.current;
        realtimeConnectedRef.current = true;
        if (wasConnected) void refreshRecentMessages();
      } else if (event.state === "suspended") {
        toast.error("Realtime messaging is temporarily unavailable. Reconnecting...");
      } else if (event.state === "failed") {
        toast.error("Realtime messaging failed. Refresh messages to try again.");
      }
    }
  });

  const handleRealtimeError = useEffectEvent((error: Error) => {
    toast.error(error.message || "Realtime messaging failed.");
  });

  useEffect(() => {
    window.scrollTo({ top: document.documentElement.scrollHeight });
  }, []);

  useEffect(() => {
    if (!customerMetaUserId && !customerWAId) return;
    return realtimeProvider.subscribe(
      { phoneNumberId, customerId, customerWAId, customerMetaUserId },
      handleRealtimeEvent,
      handleRealtimeError,
    );
  }, [customerId, customerMetaUserId, customerWAId, phoneNumberId]);

  useEffect(() => {
    if (appendedMessages.length === 0) return;
    if (isNearBottomRef.current) {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
    } else {
      setShowScrollToLatest(true);
    }
  }, [appendedMessages.length]);

  const loadOlderMessages = useEffectEvent(async () => {
    if (loading || page >= numberOfPages) return;
    documentHeightRef.current = document.documentElement.scrollHeight;
    setLoading(true);
    try {
      const response = await apiFetch<MessageListResponse>("/v1/wa/messages", {
        query: {
          customer_id: customerId,
          page: String(page + 1),
          page_size: "50",
        },
      });
      setMessages((current) => mergeMessages(current, response.items));
      setPage((current) => current + 1);
      requestAnimationFrame(() => {
        window.scrollBy(0, document.documentElement.scrollHeight - documentHeightRef.current);
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load older messages.");
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    const onScroll = () => {
      updateScrollPosition();
      if (window.scrollY <= 8) void loadOlderMessages();
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [loading, page, numberOfPages]);

  useEffect(() => {
    if (!menu) return;
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenu(null);
    };
    window.addEventListener("pointerdown", closeOnOutsidePress);
    return () => window.removeEventListener("pointerdown", closeOnOutsidePress);
  }, [menu]);

  async function reactToMessage(emoji: string) {
    if (!menu?.message.wa_message_id) return;
    try {
      await apiFetch("/v1/wa/messages", {
        method: "POST",
        body: {
          customer_id: Number(customerId),
          type: "reaction",
          reaction: { message_id: menu.message.wa_message_id, emoji },
        },
      });
      setMenu(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send reaction.");
    }
  }

  const allMessages = [...messages, ...appendedMessages]
    .sort((a, b) => a.timestamp - b.timestamp)
    .filter(
      (message, index, current) =>
        current.findIndex((candidate) => candidate.wa_message_id === message.wa_message_id) === index,
    );
  const reactionByMessageId = new Map<string, { emoji: string; userId: string }[]>();
  for (const message of allMessages) {
    const targetId = reactionTargetId(message);
    const emoji = reactionEmoji(message);
    if (message.type === "reaction" && targetId && emoji) {
      const reactions = reactionByMessageId.get(targetId) ?? [];
      const userId = reactionUserId(message);
      const existingIndex = reactions.findIndex((reaction) => reaction.userId === userId);
      if (existingIndex >= 0) reactions.splice(existingIndex, 1);
      reactions.push({ emoji, userId });
      reactionByMessageId.set(targetId, reactions.slice(-2));
    }
  }
  const visibleMessages = allMessages.filter(isDisplayableMessage);
  const messageGroups = groupMessagesByDate(visibleMessages);

  return (
    <div className="pb-20">
      {showScrollToLatest ? (
        <Button
          type="button"
          size="icon-lg"
          variant="outline"
          className="fixed right-4 bottom-20 z-10 size-11 animate-bounce rounded-full border-0 bg-[#00a884] text-white shadow-md hover:bg-[#008f72]"
          aria-label="Scroll to latest message"
          onClick={scrollToLatest}
        >
          <ArrowDown className="size-5" />
        </Button>
      ) : null}
      {page >= numberOfPages ? <p className="mb-3 text-center text-xs text-muted-foreground">No more message</p> : null}
      {loading ? <p className="mb-3 text-center text-xs text-muted-foreground">Loading...</p> : null}
      {messageGroups.map((group) => (
        <section key={group.date}>
          <p className="sticky top-[68px] z-30 mx-auto mb-3 w-fit rounded-lg bg-[#e9edef] px-2 py-0.5 text-[0.6875rem] leading-5 text-[#54656f] shadow-sm dark:bg-[#182229] dark:text-[#8696a0]">{group.date}</p>
          {group.messages.map((message) => (
            <div key={message.id} className={reactionByMessageId.has(message.wa_message_id) ? "mb-2 flex flex-col" : undefined}>
              <div onContextMenu={(event) => { event.preventDefault(); setShowEmojis(false); setMenu({ message, x: event.clientX, y: event.clientY }); }} className={message.type === "sticker" ? `relative mb-2 w-fit max-w-[80%] text-base leading-[1.35] ${message.sending ? "ml-auto" : ""}` : message.sending ? "relative mb-2 ml-auto w-fit max-w-[80%] rounded-[7.5px] rounded-tr-none border border-[#edf0f1] bg-[#d9fdd3] px-2 py-1.5 text-base leading-[1.35] text-[#111b21] dark:border-[#087663] dark:bg-[#005c4b] dark:text-[#e9edef]" : "relative mb-2 w-fit max-w-[80%] rounded-[7.5px] rounded-tl-none border border-[#edf0f1] bg-white px-2 py-1.5 text-base leading-[1.35] text-[#111b21] dark:border-[#314047] dark:bg-[#202c33] dark:text-[#e9edef]"}>
                <MessageContent message={message} />
                <p className="mt-0.5 flex items-center justify-end gap-1 text-[0.6875rem] leading-none text-[#667781] dark:text-[#aebac1]">
                  {messageTime(message.timestamp)}
                  {message.sending ? <MessageStatusIcon status={message.status} /> : null}
                </p>
              </div>
              {reactionByMessageId.get(message.wa_message_id)?.length ? (
                <div className={`mt-0.5 flex gap-0.5 ${message.sending ? "self-end" : "self-start"}`}>
                  {reactionByMessageId.get(message.wa_message_id)?.map((reaction) => (
                    <span
                      key={`${reaction.userId}-${reaction.emoji}`}
                      className="rounded-full bg-background px-1 text-xl leading-none shadow-sm"
                      aria-label={`Reaction: ${reaction.emoji}`}
                    >
                      {reaction.emoji}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </section>
      ))}
      {menu ? (
        <div ref={menuRef} className="fixed z-50 w-52 max-w-[calc(100vw-1rem)] rounded-lg bg-popover p-1 shadow-md ring-1 ring-[#edf0f1] dark:ring-foreground/10" style={{ left: Math.max(8, Math.min(menu.x, window.innerWidth - 216)), top: Math.max(8, Math.min(menu.y, window.innerHeight - (showEmojis ? 224 : 80))) }}>
          <Button type="button" variant="ghost" className="w-full justify-start" onClick={() => { setReplyTarget({ waMessageId: menu.message.wa_message_id, preview: messageBody(menu.message) }); setMenu(null); }}><Reply />Reply</Button>
          <Button type="button" variant="ghost" className="w-full justify-start" onClick={() => setShowEmojis(true)}><SmilePlus />React</Button>
          {showEmojis ? <div className="border-t p-1.5"><div className="grid max-h-28 grid-cols-6 gap-1 overflow-y-auto">{["👍", "❤️", "😂", "😮", "😢", "🙏", "👏", "🔥", "😍", "🎉", "✅", "💯", "🤔", "👀", "🙌", "😅", "💪", "🤝", "💚", "✨", "😁", "😎", "🤗", "🫡"].map((emoji) => <button key={emoji} type="button" className="flex size-10 items-center justify-center rounded p-0 text-[1.5rem] leading-none hover:bg-muted" onClick={() => void reactToMessage(emoji)}>{emoji}</button>)}</div><input aria-label="Paste an emoji and press Enter" placeholder="Paste an emoji and press Enter" className="mt-2 h-7 w-full rounded border bg-transparent px-2 text-xs" onPaste={(event) => { const emoji = event.clipboardData.getData("text").trim(); if (emoji) { event.preventDefault(); void reactToMessage(emoji); } }} onKeyDown={(event) => { if (event.key === "Enter" && event.currentTarget.value.trim()) { event.preventDefault(); void reactToMessage(event.currentTarget.value.trim()); } }} /></div> : null}
        </div>
      ) : null}
    </div>
  );
}
