"use client";

import EmojiPicker, { EmojiStyle, Theme, type EmojiClickData } from "emoji-picker-react";
import { ArrowDown, Check, CheckCheck, ContactRound, Info, Loader2, MessageCircle, Phone, Reply, SmilePlus } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useEffect, useEffectEvent, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { toast } from "@/lib/toast";

import {
  type ChatMessage,
  type ChatMessageStatus,
  useChatCompose,
} from "@/components/chat-compose-context";
import { LocalDateTime } from "@/components/local-date-time";
import { createAblyConversationProvider } from "@/lib/ably-realtime";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import type { MessageDetail } from "@/lib/api/types";
import { ChatMediaViewer } from "@/components/chat-media-viewer";
import { TemplatePreviewHtml } from "@/components/template-preview-html";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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

function messageDate(timestamp: number, useLocalTime: boolean) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: useLocalTime ? undefined : "UTC",
  }).format(new Date(timestamp * 1000));
}

function messageTime(timestamp: number, useLocalTime: boolean) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: useLocalTime ? undefined : "UTC",
  }).format(new Date(timestamp * 1000));
}

function subscribeToHydration() {
  return () => {};
}

function useHydrated() {
  return useSyncExternalStore(subscribeToHydration, () => true, () => false);
}

function messageBody(message: Message) {
  const payload = message.payload;
  if (message.type === "text" && typeof payload.text === "object" && payload.text) {
    const text = payload.text as { body?: unknown };
    if (typeof text.body === "string") return text.body;
  }
  if (message.type === "template" && typeof payload.template === "object" && payload.template) {
    const template = payload.template as {
      name?: unknown;
      components?: { type?: unknown; text?: unknown; parameters?: { text?: unknown }[] }[];
    };
    const templateText = template.components
      ?.flatMap((component) => {
        const type = typeof component.type === "string" ? component.type.toUpperCase() : "";
        const isBodyLike = type === "BODY" || type === "HEADER" || type === "FOOTER";
        return isBodyLike && typeof component.text === "string" ? [component.text] : [];
      })
      .join(" ");
    if (templateText) return templateText;
    return typeof template.name === "string" ? template.name : "Template message";
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

function buttonResponseContextText(message: Message) {
  const text = messageBody(message).trim();
  if (!text) return undefined;

  return text;
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

function formatWhatsAppText(value: string) {
  const parts: ReactNode[] = [];
  let remaining = value;
  let key = 0;

  while (remaining.length > 0) {
    if (remaining.startsWith("```")) {
      const closingIndex = remaining.indexOf("```", 3);
      if (closingIndex >= 0) {
        parts.push(
          <code
            key={key++}
            className="rounded bg-black/10 px-1 font-mono text-[0.9em] dark:bg-white/10"
          >
            {remaining.slice(3, closingIndex)}
          </code>,
        );
        remaining = remaining.slice(closingIndex + 3);
        continue;
      }
    }

    const marker = remaining[0];
    if (marker === "*" || marker === "_" || marker === "~") {
      const closingIndex = remaining.indexOf(marker, 1);
      if (closingIndex > 1) {
        const content = remaining.slice(1, closingIndex);
        if (marker === "*") {
          parts.push(<strong key={key++}>{content}</strong>);
        } else if (marker === "_") {
          parts.push(<em key={key++}>{content}</em>);
        } else {
          parts.push(<del key={key++}>{content}</del>);
        }
        remaining = remaining.slice(closingIndex + 1);
        continue;
      }
    }

    const nextSpecial = remaining.search(/[\*_~`]/);
    const textLength = nextSpecial < 0 ? remaining.length : nextSpecial === 0 ? 1 : nextSpecial;
    parts.push(remaining.slice(0, textLength));
    remaining = remaining.slice(textLength);
  }

  return parts;
}

function locationStaticMapUrl(location: { latitude?: number; longitude?: number } | null | undefined) {
  const latitude = Number(location?.latitude ?? 1.32);
  const longitude = Number(location?.longitude ?? 103.85);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  const url = new URL("https://maps.googleapis.com/maps/api/staticmap");
  const coordinates = `${latitude},${longitude}`;
  url.searchParams.set("center", coordinates);
  url.searchParams.set("zoom", "17");
  url.searchParams.set("size", "480x220");
  url.searchParams.set("maptype", "roadmap");
  url.searchParams.set("markers", `color:red|${coordinates}`);
  url.searchParams.set("key", apiKey);
  return url.toString();
}

function toIdString(val: unknown): string | undefined {
  if (typeof val === "string" && val.trim() !== "") return val.trim();
  if (typeof val === "number" && !isNaN(val)) return String(val);
  return undefined;
}

function reactionEmoji(message: Message) {
  const payload = message.payload as Record<string, unknown> | undefined;
  if (!payload) return undefined;

  const reaction = (typeof payload.reaction === "object" && payload.reaction
    ? payload.reaction
    : undefined) as Record<string, unknown> | undefined;

  if (typeof reaction?.emoji === "string") return reaction.emoji;
  if (typeof payload.emoji === "string") return payload.emoji;
  if (typeof payload.reaction === "string") return payload.reaction;

  if (Array.isArray(payload.reactions)) {
    for (const item of payload.reactions) {
      if (item && typeof item === "object" && typeof (item as Record<string, unknown>).emoji === "string") {
        return (item as Record<string, unknown>).emoji as string;
      }
    }
  }

  const textObj = (typeof payload.text === "object" && payload.text
    ? payload.text
    : undefined) as Record<string, unknown> | undefined;
  if (typeof textObj?.body === "string" && isEmojiOnly(textObj.body)) {
    return textObj.body.trim();
  }

  return undefined;
}

function reactionTargetId(message: Message) {
  const payload = message.payload as Record<string, unknown> | undefined;
  if (!payload) return undefined;

  const reaction = (typeof payload.reaction === "object" && payload.reaction
    ? payload.reaction
    : undefined) as Record<string, unknown> | undefined;

  const context = (typeof payload.context === "object" && payload.context
    ? payload.context
    : undefined) as Record<string, unknown> | undefined;

  return (
    toIdString(reaction?.message_id) ??
    toIdString(reaction?.wa_message_id) ??
    toIdString(reaction?.id) ??
    toIdString(payload.reaction) ??
    toIdString(payload.message_id) ??
    toIdString(payload.wa_message_id) ??
    toIdString(context?.id) ??
    toIdString(context?.wa_message_id) ??
    toIdString(context?.message_id)
  );
}

function buttonResponseTargetId(message: Message) {
  if (message.type !== "button") return undefined;
  const payload = message.payload as Record<string, unknown> | undefined;
  if (!payload) return undefined;
  const button = (typeof payload.button === "object" && payload.button
    ? payload.button
    : undefined) as Record<string, unknown> | undefined;
  const context = (typeof payload.context === "object" && payload.context
    ? payload.context
    : undefined) as Record<string, unknown> | undefined;

  return (
    toIdString(context?.id) ??
    toIdString(context?.wa_message_id) ??
    toIdString(context?.message_id) ??
    toIdString(button?.message_id) ??
    toIdString(button?.wa_message_id)
  );
}

function replyTargetId(message: Message) {
  if (message.type !== "text") return undefined;
  const payload = message.payload as Record<string, unknown> | undefined;
  const context = (typeof payload?.context === "object" && payload.context
    ? payload.context
    : undefined) as Record<string, unknown> | undefined;

  return (
    toIdString(context?.id) ??
    toIdString(context?.wa_message_id) ??
    toIdString(context?.message_id)
  );
}

function reactionUserId(message: Message) {
  const payload = message.payload as {
    from_me?: unknown;
    fromMe?: unknown;
    from?: unknown;
    from_user_id?: unknown;
  } | undefined;
  if (
    message.sending ||
    payload?.from_me === true ||
    payload?.fromMe === true ||
    payload?.from === "sender" ||
    payload?.from === "agent"
  ) {
    return "agent";
  }
  return "customer";
}

function isDisplayableMessage(message: Message) {
  return displayableMessageTypes.has(message.type);
}

function groupMessagesByDate(messages: Message[], useLocalTime: boolean) {
  const groups: { date: string; messages: Message[] }[] = [];
  for (const message of messages) {
    const date = messageDate(message.timestamp, useLocalTime);
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
  const getMsgKey = (m: Message) =>
    m.wa_message_id && m.wa_message_id.trim() !== ""
      ? m.wa_message_id.trim()
      : `id-${m.id}`;
  const messagesMap = new Map(
    [...current, ...incoming].map((message) => [getMsgKey(message), message]),
  );
  return [...messagesMap.values()].sort((first, second) => first.timestamp - second.timestamp);
}

function MessageStatusIcon({ status, hasError }: { status?: string; hasError?: boolean }) {
  if (hasError) return null;
  const normalized = status?.toLowerCase();
  if (normalized === "failed" || normalized === "error") return null;
  if (normalized === "delivered") return <CheckCheck className="size-3.5" aria-label="Delivered" />;
  if (normalized === "read" || normalized === "played") {
    return <CheckCheck className="size-3.5 text-[#00a884]" aria-label="Read" />;
  }
  return <Check className="size-3.5" aria-label="Sent" />;
}

function MessageInfoPopover({
  messageId,
  hasError,
  errorMessage,
}: {
  messageId: number;
  hasError?: boolean;
  errorMessage?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<MessageDetail | null>(null);

  const hasDetailError =
    hasError ||
    Boolean(errorMessage?.trim()) ||
    Boolean(details?.error_message?.trim()) ||
    Boolean(
      details?.statuses?.some(
        (status) => status.error_message && status.error_message.trim() !== "",
      ),
    );

  async function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen && !details && !loading) {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<MessageDetail>(`v1/wa/messages/${messageId}`);
        setDetails(data);
      } catch (err) {
        setError(toApiError(err).message);
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`ml-0.5 inline-flex items-center focus-visible:outline-none ${
            hasDetailError
              ? "text-destructive hover:text-destructive/80 dark:text-destructive"
              : "text-[#667781] hover:text-foreground dark:text-[#aebac1]"
          }`}
          title="Message details"
          aria-label="Message details"
        >
          <Info className="size-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-3 text-xs">
        <p className="mb-2 font-semibold text-foreground text-sm">Message Details</p>
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Loading message details" />
          </div>
        ) : error ? (
          <p className="text-destructive text-xs">{error}</p>
        ) : details ? (
          <div className="space-y-2">
            <dl className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-2.5 gap-y-1 text-xs">
              <dt className="text-muted-foreground">Type</dt>
              <dd className="capitalize">{details.type || "—"}</dd>

              <dt className="text-muted-foreground">Status</dt>
              <dd className="capitalize">{details.status || "—"}</dd>

              {details.category ? (
                <>
                  <dt className="text-muted-foreground">Category</dt>
                  <dd>{details.category}</dd>
                </>
              ) : null}

              {details.billing_type ? (
                <>
                  <dt className="text-muted-foreground">Billing</dt>
                  <dd>
                    {details.billing_type}
                    {details.billable !== undefined ? ` (${details.billable ? "Billable" : "Free"})` : ""}
                  </dd>
                </>
              ) : null}

              {details.broadcast_id ? (
                <>
                  <dt className="text-muted-foreground">Broadcast ID</dt>
                  <dd>{details.broadcast_id}</dd>
                </>
              ) : null}

              {!details.statuses?.length &&
              (errorMessage?.trim() || details.error_message?.trim()) ? (
                <>
                  <dt className="text-muted-foreground">Error</dt>
                  <dd className="break-words text-destructive">
                    {errorMessage?.trim() || details.error_message?.trim()}
                  </dd>
                </>
              ) : null}
            </dl>

            {details.statuses && details.statuses.length > 0 ? (
              <div className="mt-2 border-t pt-2 space-y-1">
                <p className="mb-2 font-semibold text-foreground text-xs">Status History</p>
                <dl className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-2.5 gap-y-1 text-[11px]">
                  {[...details.statuses].sort((first, second) => first.timestamp - second.timestamp).map((event) => (
                    <div key={event.id || `${event.status}-${event.timestamp}`} className="contents">
                      <dt className="capitalize text-foreground">{event.status}</dt>
                      <dd className="text-muted-foreground">
                        <LocalDateTime value={event.timestamp ? event.timestamp * 1000 : event.added_at} />
                        {event.error_message ? (
                          <span className="block text-destructive break-words">
                            {event.error_message}
                          </span>
                        ) : null}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

function MessageContent({
  message,
  onButtonResponseClick,
  onReplyClick,
  buttonResponseContext,
}: {
  message: Message;
  onButtonResponseClick?: () => void;
  onReplyClick?: () => void;
  buttonResponseContext?: string;
}) {
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
      {hasReply ? (
        <button
          type="button"
          className="mb-1.5 w-full rounded-md border-l-4 border-[#06cf9c] bg-black/5 px-2 py-1.5 text-left text-xs text-[#54656f] dark:bg-black/15 dark:text-[#aebac1]"
          onClick={onReplyClick}
        >
          Replying to previous message
        </button>
      ) : null}
      {message.type === "unsupported" ? (
        <div className="space-y-1">
          <p className="font-medium">{typeof errors?.title === "string" ? errors.title : "Unsupported message"}</p>
          {typeof errorData?.details === "string" ? <p className="text-sm opacity-70">{errorData.details}</p> : typeof errors?.message === "string" ? <p className="text-sm opacity-70">{errors.message}</p> : null}
        </div>
      ) : message.type === "template" && (message.preview_html || message.preview_dark_html) ? (
        <TemplatePreviewHtml
          lightHtml={message.preview_html}
          darkHtml={message.preview_dark_html}
        />
      ) : template ? (
        <div className="space-y-1 rounded-md bg-black/5 p-2 dark:bg-white/10">
          <p className="text-xs font-medium uppercase tracking-wide opacity-70">Template</p>
          <p className="font-medium">{template.name}</p>
          {template.language ? <p className="text-xs opacity-70">{template.language}</p> : null}
          {template.parameters.length > 0 ? (
            <div className="mt-2 space-y-1 border-t border-black/10 pt-2 text-sm dark:border-white/10">
              {template.parameters.map((parameter, index) => (
                <p key={`${parameter}-${index}`} className="whitespace-pre-wrap">
                  {formatWhatsAppText(parameter)}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      ) : interactive ? (
        <div className="space-y-1 rounded-md bg-black/5 p-2 dark:bg-white/10">
          <p className="text-xs font-medium uppercase tracking-wide opacity-70">{interactive.label}</p>
          <p className="font-medium whitespace-pre-wrap">
            {formatWhatsAppText(interactive.title)}
          </p>
          {interactive.description ? (
            <p className="text-xs opacity-70">{formatWhatsAppText(interactive.description)}</p>
          ) : null}
        </div>
      ) : button ? (
        <button
          type="button"
          onClick={onButtonResponseClick}
          disabled={!onButtonResponseClick}
          className="w-full space-y-1 rounded-md text-left disabled:cursor-default"
        >
          {buttonResponseContext ? (
            <p
              className="border-l-2 border-[#06cf9c] pl-2 mb-2 text-xs text-[#54656f] dark:text-[#aebac1]"
              style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
            >
              {buttonResponseContext}
            </p>
          ) : null}
          <p className="text-xs font-medium uppercase tracking-wide opacity-70">Button response</p>
          <p className="font-medium whitespace-pre-wrap">{formatWhatsAppText(button.text)}</p>
        </button>
      ) : (media?.id || attachmentUrl) && (message.type === "image" || message.type === "sticker" || message.type === "video" || message.type === "audio" || message.type === "document") ? (
        <>
          <ChatMediaViewer
            mediaId={media?.id}
            messageId={message.id}
            waMessageId={message.wa_message_id}
            mediaUrl={attachmentUrl || undefined}
            type={message.type as "image" | "sticker" | "video" | "audio" | "document"}
            mimeType={media?.mime_type ?? ""}
            filename={media?.filename}
            autoLoad={message.auto_load_media}
          />
          {media?.caption ? (
            <p className="mt-2 whitespace-pre-wrap pb-2 px-2">{formatWhatsAppText(media.caption)}</p>
          ) : null}
        </>
      ) : location?.latitude !== undefined && location.longitude !== undefined ? (
        <a href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`} target="_blank" rel="noreferrer" className="block overflow-hidden">
          {(() => {
            const staticMapUrl = locationStaticMapUrl(location);
            return staticMapUrl ? (
              <img
                src={staticMapUrl}
                alt="Location map"
                className="h-28 w-full object-cover"
              />
            ) : null;
          })()}
          <div className="flex items-start gap-3 px-2 py-2">
            <span><span className="block text-sm font-medium">{location.name || "Location"}</span>{location.address ? <span className="mt-0.5 block text-xs opacity-70">{location.address}</span> : null}</span>
          </div>
        </a>
      ) : contacts?.length ? (
        <div className="space-y-2">{contacts.map((contact, index) => <div key={index} className="rounded-md bg-black/5 p-3 dark:bg-white/10"><div className="flex items-center gap-2"><ContactRound className="size-5" /><p className="text-sm font-medium">{contact.name?.formatted_name || "Contact"}</p></div>{contact.phones?.map((phone, phoneIndex) => <p key={phoneIndex} className="mt-2 flex items-center gap-2 text-sm"><Phone className="size-3.5" />{phone.phone}</p>)}</div>)}</div>
      ) : (() => {
        const body = messageBody(message);
        return (
          <p className={`whitespace-pre-wrap ${isEmojiOnly(body) ? "text-4xl leading-tight" : ""}`}>
            {formatWhatsAppText(body)}
          </p>
        );
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
}: ChatProps) {
  const { appendMessage, appendedMessages, setReplyTarget, updateMessageStatus } = useChatCompose();
  const { resolvedTheme } = useTheme();
  const hydrated = useHydrated();
  const [messages, setMessages] = useState(() => initialMessages);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [menu, setMenu] = useState<MessageMenu | null>(null);
  const [showEmojis, setShowEmojis] = useState(false);
  const documentHeightRef = useRef(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef(new Map<string, HTMLDivElement>());
  const realtimeConnectedRef = useRef(false);
  const isNearBottomRef = useRef(true);
  const initialScrollCompleteRef = useRef(false);
  const [showScrollToLatest, setShowScrollToLatest] = useState(false);
  const [flashedMessageKey, setFlashedMessageKey] = useState<string | null>(null);

  function updateScrollPosition() {
    const distanceFromBottom = document.documentElement.scrollHeight - (window.scrollY + window.innerHeight);
    const isNearBottom = distanceFromBottom <= bottomScrollThreshold;
    isNearBottomRef.current = isNearBottom;
    if (isNearBottom) {
      setShowScrollToLatest(false);
    }
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
      const recentMessages = response.items.filter(
        (m) => isDisplayableMessage(m) || m.type === "reaction",
      );
      setMessages((current) => mergeMessages(current, recentMessages));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not refresh messages after reconnecting.");
    }
  }

  const handleRealtimeEvent = useEffectEvent((event: { type: "message"; message: Message } | { type: "status"; status: ChatMessageStatus } | { type: "connection"; state: string }) => {
    if (
      event.type === "message" &&
      event.message.type !== "unsupported" &&
      (isDisplayableMessage(event.message) || event.message.type === "reaction")
    ) {
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
    requestAnimationFrame(() => {
      window.scrollTo({ top: document.documentElement.scrollHeight });
      initialScrollCompleteRef.current = true;
    });
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
    const latestMessage = appendedMessages[appendedMessages.length - 1];
    if (latestMessage?.type === "reaction") return;
    if (isNearBottomRef.current || latestMessage?.sending) {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
      setShowScrollToLatest(false);
    } else {
      setShowScrollToLatest(true);
    }
  }, [appendedMessages]);

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
      if (initialScrollCompleteRef.current && window.scrollY <= 8) {
        void loadOlderMessages();
      }
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
    if (!menu?.message) return;
    const targetMessageId = menu.message.wa_message_id?.trim() || (menu.message.id ? String(menu.message.id) : "");
    if (!targetMessageId) return;
    try {
      await apiFetch("/v1/wa/messages", {
        method: "POST",
        body: {
          customer_id: Number(customerId),
          type: "reaction",
          reaction: { message_id: targetMessageId, emoji },
        },
      });
      setMenu(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send reaction.");
    }
  }

  function handleReactionEmojiClick(emojiData: EmojiClickData) {
    void reactToMessage(emojiData.emoji);
  }

  const allMessages = [...messages, ...appendedMessages]
    .sort((a, b) => a.timestamp - b.timestamp)
    .filter(
      (message, index, current) =>
        current.findIndex(
          (candidate) =>
            (message.wa_message_id && candidate.wa_message_id === message.wa_message_id) ||
            candidate.id === message.id,
        ) === index,
    );
  const reactionByMessageId = new Map<string, { emoji: string; userId: string }[]>();
  for (const message of allMessages) {
    if (message.type !== "reaction") continue;
    const targetId = reactionTargetId(message);
    const emoji = reactionEmoji(message);
    if (!targetId || emoji === undefined) continue;

    const targetMsg = allMessages.find((candidate) => {
      if (candidate.type === "reaction") return false;
      const candidateId = candidate.id !== undefined ? String(candidate.id) : undefined;
      const candidateWaId = candidate.wa_message_id?.trim();
      const candidatePayloadMsgId = toIdString(
        (candidate.payload as Record<string, unknown> | undefined)?.message_id,
      );
      const candidatePayloadWaId = toIdString(
        (candidate.payload as Record<string, unknown> | undefined)?.wa_message_id,
      );
      const candidatePayloadId = toIdString(
        (candidate.payload as Record<string, unknown> | undefined)?.id,
      );

      return (
        candidateId === targetId ||
        candidateWaId === targetId ||
        candidatePayloadMsgId === targetId ||
        candidatePayloadWaId === targetId ||
        candidatePayloadId === targetId
      );
    });

    const userId = reactionUserId(message);
    const primaryKey = targetMsg
      ? targetMsg.wa_message_id?.trim() || String(targetMsg.id)
      : targetId;

    const reactions = reactionByMessageId.get(primaryKey) ?? [];
    const existingIndex = reactions.findIndex((reaction) => reaction.userId === userId);
    if (existingIndex >= 0) {
      reactions.splice(existingIndex, 1);
    }
    if (emoji.trim() !== "") {
      reactions.push({ emoji, userId });
    }

    reactionByMessageId.set(primaryKey, reactions);
    if (targetId !== primaryKey) {
      reactionByMessageId.set(targetId, reactions);
    }
    if (targetMsg) {
      if (targetMsg.wa_message_id?.trim()) {
        reactionByMessageId.set(targetMsg.wa_message_id.trim(), reactions);
      }
      if (targetMsg.id !== undefined) {
        reactionByMessageId.set(String(targetMsg.id), reactions);
      }
      const pId = toIdString((targetMsg.payload as Record<string, unknown> | undefined)?.id);
      if (pId) reactionByMessageId.set(pId, reactions);
      const pWaId = toIdString((targetMsg.payload as Record<string, unknown> | undefined)?.wa_message_id);
      if (pWaId) reactionByMessageId.set(pWaId, reactions);
      const pMsgId = toIdString((targetMsg.payload as Record<string, unknown> | undefined)?.message_id);
      if (pMsgId) reactionByMessageId.set(pMsgId, reactions);
    }
  }
  const visibleMessages = allMessages.filter(isDisplayableMessage);

  function buttonResponseTargetMessage(message: Message) {
    const targetId = buttonResponseTargetId(message);
    if (!targetId) return undefined;
    return allMessages.find((candidate) => {
      const payload = candidate.payload as Record<string, unknown> | undefined;
      return (
        String(candidate.id) === targetId ||
        candidate.wa_message_id?.trim() === targetId ||
        toIdString(payload?.id) === targetId ||
        toIdString(payload?.wa_message_id) === targetId ||
        toIdString(payload?.message_id) === targetId
      );
    });
  }

  function messageByReferenceId(referenceId?: string) {
    if (!referenceId) return undefined;
    return allMessages.find((candidate) => {
      const payload = candidate.payload as Record<string, unknown> | undefined;
      return (
        String(candidate.id) === referenceId ||
        candidate.wa_message_id?.trim() === referenceId ||
        toIdString(payload?.id) === referenceId ||
        toIdString(payload?.wa_message_id) === referenceId ||
        toIdString(payload?.message_id) === referenceId
      );
    });
  }

  function scrollToMessage(message: Message | undefined, unavailableMessage: string) {
    if (!message) {
      toast.warning(unavailableMessage);
      return;
    }
    const targetKey = message.wa_message_id?.trim() || String(message.id);
    const targetElement = messageRefs.current.get(targetKey);
    if (!targetElement) {
      toast.warning(unavailableMessage);
      return;
    }
    targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
    setFlashedMessageKey(targetKey);
    window.setTimeout(() => setFlashedMessageKey(null), 1_000);
  }

  function scrollToButtonResponseTarget(message: Message) {
    scrollToMessage(buttonResponseTargetMessage(message), "Message not loaded in the current window");
  }

  function scrollToReplyTarget(message: Message) {
    scrollToMessage(messageByReferenceId(replyTargetId(message)), "The previous message is not available");
  }

  const messageGroups = groupMessagesByDate(visibleMessages, hydrated);
  const emojiPickerTheme = resolvedTheme === "dark" ? Theme.DARK : Theme.LIGHT;

  return (
    <div className="pb-20">
      {showScrollToLatest ? (
        <Button
          type="button"
          size="icon-lg"
          variant="outline"
          className="fixed right-4 bottom-20 z-10 size-11 animate-bounce rounded-full border-0 bg-[#00a884] text-white shadow-md hover:bg-[#008f72] dark:bg-[#00a884] dark:text-white dark:hover:bg-[#008f72]"
          aria-label="Scroll to latest message"
          onClick={scrollToLatest}
        >
          <ArrowDown className="size-5" />
        </Button>
      ) : null}
      {page >= numberOfPages && visibleMessages.length > 0 ? <p className="mb-3 text-center text-xs text-muted-foreground">No more message</p> : null}
      {loading ? <p className="mb-3 text-center text-xs text-muted-foreground">Loading...</p> : null}
      {visibleMessages.length === 0 && !loading ? (
        <div className="flex min-h-[calc(100svh-18rem)] flex-col items-center justify-center gap-3 pb-20 text-muted-foreground">
          <MessageCircle aria-hidden="true" className="size-10 opacity-70" strokeWidth={1.5} />
          <p className="text-2xl font-normal opacity-70">No message</p>
        </div>
      ) : null}
      {messageGroups.map((group) => (
        <section key={group.date}>
          <p className="sticky top-[68px] z-30 mx-auto mb-3 w-fit rounded-md bg-[#e9edef] px-2 py-0.5 text-[0.6875rem] leading-5 text-[#54656f] shadow-sm dark:bg-[#182229] dark:text-[#8696a0]">{group.date}</p>
          {group.messages.map((message) => (
            <div
              key={message.id}
              ref={(element) => {
                const messageKey = message.wa_message_id?.trim() || String(message.id);
                if (element) messageRefs.current.set(messageKey, element);
                else messageRefs.current.delete(messageKey);
              }}
              className={`mb-4 flex flex-col rounded-md transition-colors ${message.sending ? "items-end" : "items-start"} ${flashedMessageKey === (message.wa_message_id?.trim() || String(message.id)) ? "bg-yellow-200/70 dark:bg-yellow-400/20" : ""}`}
            >
              <div
                className={`flex ${message.type === "image" ? "w-full max-w-full sm:w-fit sm:max-w-[80%]" : "w-fit max-w-[80%]"} flex-col ${
                  message.sending ? "items-end" : "items-start"
                }`}
              >
                <div
                  onContextMenu={(event) => {
                    event.preventDefault();
                    setShowEmojis(false);
                    setMenu({ message, x: event.clientX, y: event.clientY });
                  }}
                  className={
                    message.type === "message" || message.type === "sticker" || message.type === "template" || message.type === "document" || message.type === "audio"
                      ? "relative mb-1.5 w-full text-base leading-[1.35]"
                      : message.sending
                        ? `relative mb-1.5 min-w-0 w-full overflow-hidden rounded-md [overflow-wrap:anywhere] ${["image", "video", "location"].includes(message.type) ? "rounded-[4px] px-0 py-0" : "rounded-[7.5px] px-2 py-1.5"} rounded-tr-none border border-[#edf0f1] bg-[#d9fdd3] text-base leading-[1.35] text-[#111b21] dark:border-[#087663] dark:bg-[#005c4b] dark:text-[#e9edef]`
                        : `relative mb-1.5 min-w-0 w-full overflow-hidden rounded-md [overflow-wrap:anywhere] ${["image", "video", "location"].includes(message.type) ? "rounded-[4px] px-0 py-0" : "rounded-[7.5px] px-2 py-1.5"} rounded-tl-none border border-[#edf0f1] bg-white text-base leading-[1.35] text-[#111b21] dark:border-[#314047] dark:bg-[#202c33] dark:text-[#e9edef]`
                  }
                >
                  <MessageContent
                    message={message}
                    onButtonResponseClick={message.type === "button" ? () => scrollToButtonResponseTarget(message) : undefined}
                    onReplyClick={message.type === "text" ? () => scrollToReplyTarget(message) : undefined}
                    buttonResponseContext={(() => {
                      const targetMessage = buttonResponseTargetMessage(message);
                      if (!targetMessage) return undefined;
                      const text = buttonResponseContextText(targetMessage);
                      if (!text) return undefined;
                      return text.length > 140 ? `${text.slice(0, 140)}...` : text;
                    })()}
                  />
                </div>
                {(() => {
                  const payloadId = toIdString((message.payload as Record<string, unknown> | undefined)?.id);
                  const payloadWaId = toIdString((message.payload as Record<string, unknown> | undefined)?.wa_message_id);
                  const payloadMsgId = toIdString((message.payload as Record<string, unknown> | undefined)?.message_id);

                  const reactions =
                    (message.wa_message_id ? reactionByMessageId.get(message.wa_message_id.trim()) : undefined) ??
                    (message.id !== undefined ? reactionByMessageId.get(String(message.id)) : undefined) ??
                    (payloadId ? reactionByMessageId.get(payloadId) : undefined) ??
                    (payloadWaId ? reactionByMessageId.get(payloadWaId) : undefined) ??
                    (payloadMsgId ? reactionByMessageId.get(payloadMsgId) : undefined);

                  const timeAndStatus = (
                    <span className="flex items-center gap-1 text-[0.6875rem] leading-none text-[#667781] dark:text-[#aebac1]">
                      {messageTime(message.timestamp, hydrated)}
                      {message.sending ? (
                        <>
                          {message.status?.toLowerCase() !== "failed" &&
                          message.status?.toLowerCase() !== "error" ? (
                            <MessageStatusIcon
                              status={message.status}
                              hasError={Boolean(message.error_message?.trim())}
                            />
                          ) : null}
                          <MessageInfoPopover
                            messageId={message.id}
                            hasError={
                              message.status?.toLowerCase() === "failed" ||
                              message.status?.toLowerCase() === "error" ||
                              Boolean(message.error_message?.trim())
                            }
                            errorMessage={message.error_message}
                          />
                        </>
                      ) : null}
                    </span>
                  );

                  const reactionElements = reactions?.length ? (
                    <div className="flex items-center gap-0.5">
                      {reactions.map((reaction) => (
                        <span
                          key={`${reaction.userId}-${reaction.emoji}`}
                          className="rounded-full bg-background px-1 text-xl leading-none shadow-sm"
                          aria-label={`Reaction: ${reaction.emoji}`}
                        >
                          {reaction.emoji}
                        </span>
                      ))}
                    </div>
                  ) : null;

                  if (message.sending) {
                    return (
                      <div
                        className={`mt-0.5 flex w-full items-center gap-2 ${
                          !reactionElements ? "justify-end" : "justify-between"
                        }`}
                      >
                        {reactionElements}
                        {timeAndStatus}
                      </div>
                    );
                  }

                  return (
                    <div
                      className={`mt-0.5 flex w-full items-center gap-2 ${
                        !reactionElements ? "justify-start" : "justify-between"
                      }`}
                    >
                      {timeAndStatus}
                      {reactionElements}
                    </div>
                  );
                })()}
              </div>
            </div>
          ))}
        </section>
      ))}
      {menu ? (
        <div ref={menuRef} className={`fixed z-50 max-w-[calc(100vw-1rem)] rounded-md bg-popover p-1 shadow-md ring-1 ring-[#edf0f1] dark:ring-foreground/10 ${showEmojis ? "w-[328px]" : "w-52"}`} style={{ left: Math.max(8, Math.min(menu.x, window.innerWidth - (showEmojis ? 336 : 216))), top: Math.max(8, Math.min(menu.y, window.innerHeight - (showEmojis ? 472 : 80))) }}>
          <Button type="button" variant="ghost" className="w-full justify-start" onClick={() => { setReplyTarget({ waMessageId: menu.message.wa_message_id, preview: messageBody(menu.message) }); setMenu(null); }}><Reply />Reply</Button>
          <Button type="button" variant="ghost" className="w-full justify-start" onClick={() => setShowEmojis(true)}><SmilePlus />React</Button>
          {showEmojis ? (
            <div className="border-t p-1.5">
              <EmojiPicker
                onEmojiClick={handleReactionEmojiClick}
                emojiStyle={EmojiStyle.NATIVE}
                theme={emojiPickerTheme}
                width={308}
                height={380}
                lazyLoadEmojis
                previewConfig={{ showPreview: false }}
                searchPlaceHolder="Search emoji"
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
