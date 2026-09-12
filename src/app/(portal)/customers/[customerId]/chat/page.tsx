import { notFound } from "next/navigation";
import { Cake, ContactRound, Info, MapPin, Phone } from "lucide-react";

import { ChatMediaViewer } from "@/components/chat-media-viewer";
import { ChatComposeProvider } from "@/components/chat-compose-context";
import { ChatMessageComposer } from "@/components/chat-message-composer";
import { Chat } from "@/components/chat";
import { CustomerInfo } from "@/components/customer-info";
import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { BackBar } from "@/components/back-bar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import type { Customer, PhoneNumberListResponse } from "@/lib/api/types";

type MessageContext = {
  id: string;
  from: string;
  from_user_id?: string;
};

type TextMessagePayload = {
  id: string;
  from: string;
  text: { body: string };
  type: "text";
  context?: MessageContext;
  timestamp: string;
  from_user_id?: string;
};

type DocumentMessagePayload = {
  id: string;
  from: string;
  type: "document";
  document: {
    id: string;
    url: string;
    sha256: string;
    caption?: string;
    filename: string;
    mime_type: string;
  };
  timestamp: string;
  from_user_id?: string;
};

type ImageMessagePayload = {
  id: string;
  from: string;
  type: "image";
  image: {
    id: string;
    url: string;
    sha256: string;
    caption?: string;
    mime_type: string;
  };
  timestamp: string;
  from_user_id?: string;
};

type LocationMessagePayload = {
  id: string;
  from: string;
  type: "location";
  location: {
    name?: string;
    address?: string;
    latitude: number;
    longitude: number;
  };
  timestamp: string;
  from_user_id?: string;
};

type ContactMessagePayload = {
  id: string;
  from: string;
  type: "contacts";
  contacts: {
    org?: { company?: string };
    name: {
      first_name?: string;
      last_name?: string;
      formatted_name: string;
    };
    phones?: { type?: string; phone: string; wa_id?: string }[];
    birthday?: string;
    vcard?: string;
    origin?: string;
  }[];
  timestamp: string;
  from_user_id?: string;
};

type AudioMessagePayload = {
  id: string;
  from: string;
  type: "audio";
  audio: {
    id: string;
    url: string;
    voice?: boolean;
    sha256: string;
    mime_type: string;
  };
  timestamp: string;
  from_user_id?: string;
};

type VideoMessagePayload = {
  id: string;
  from: string;
  type: "video";
  video: {
    id: string;
    url: string;
    sha256: string;
    caption?: string;
    mime_type: string;
  };
  timestamp: string;
  from_user_id?: string;
};

type Message = {
  id: number;
  wa_message_id: string;
  sending: boolean;
  timestamp: number;
  type:
    | "text"
    | "document"
    | "image"
    | "location"
    | "contacts"
    | "audio"
    | "video"
    | string;
  attachment_url?: string;
  payload:
    | TextMessagePayload
    | DocumentMessagePayload
    | ImageMessagePayload
    | LocationMessagePayload
    | ContactMessagePayload
    | AudioMessagePayload
    | VideoMessagePayload
    | Record<string, unknown>;
};

type MessageListResponse = {
  items: Message[];
  number_of_pages: number;
  number_of_items: number;
};

function isTextMessage(message: Message): message is Message & { payload: TextMessagePayload } {
  return message.type === "text" && "text" in message.payload;
}

function isDocumentMessage(
  message: Message,
): message is Message & { payload: DocumentMessagePayload } {
  return message.type === "document" && "document" in message.payload;
}

function isImageMessage(message: Message): message is Message & { payload: ImageMessagePayload } {
  return message.type === "image" && "image" in message.payload;
}

function isLocationMessage(
  message: Message,
): message is Message & { payload: LocationMessagePayload } {
  return message.type === "location" && "location" in message.payload;
}

function isContactMessage(
  message: Message,
): message is Message & { payload: ContactMessagePayload } {
  return message.type === "contacts" && "contacts" in message.payload;
}

function isAudioMessage(message: Message): message is Message & { payload: AudioMessagePayload } {
  return message.type === "audio" && "audio" in message.payload;
}

function isVideoMessage(message: Message): message is Message & { payload: VideoMessagePayload } {
  return message.type === "video" && "video" in message.payload;
}

function formatMessageTime(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Singapore",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(timestamp * 1000));
}

function messageDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Singapore",
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(timestamp * 1000));
}

function groupMessagesByDate(messages: Message[]) {
  return messages.reduce<{ date: string; messages: Message[] }[]>((groups, message) => {
    const date = messageDate(message.timestamp);
    const group = groups.at(-1);
    if (group?.date === date) {
      group.messages.push(message);
    } else {
      groups.push({ date, messages: [message] });
    }
    return groups;
  }, []);
}

export default async function CustomerChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ customerId: string }>;
  searchParams: Promise<{ identity?: string; return_to?: string }>;
}) {
  const { customerId } = await params;
  const { return_to: returnTo } = await searchParams;
  const backHref = returnTo?.startsWith("/customers") ? returnTo : "/customers";
  let customer: Customer;
  try {
    customer = await serverFetch<Customer>(`/v1/customers/${encodeURIComponent(customerId)}`, {
      query: { id: customerId },
    });
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) notFound();
    throw error;
  }

  let messages: Message[] = [];
  let numberOfMessagePages = 1;
  let phoneNumberId = "";
  let loadError: string | null = null;
  try {
    const phoneNumbers = await serverFetch<PhoneNumberListResponse>("/v1/wa/user-phone-numbers", {
      query: { page: "1", page_size: "10" },
    });
    phoneNumberId = phoneNumbers.items[0]?.meta_phone_number_id ?? "";
    if (!phoneNumberId) throw new Error("No WhatsApp phone number is available.");
    const response = await serverFetch<MessageListResponse>("/v1/wa/messages", {
      query: {
        customer_id: customerId,
        page: "1",
        page_size: "50",
      },
    });
    messages = response.items.sort((first, second) => first.timestamp - second.timestamp);
    numberOfMessagePages = response.number_of_pages;
  } catch (error) {
    loadError = error instanceof ApiError || error instanceof Error ? error.message : "Could not load messages.";
  }
  const messageGroups = groupMessagesByDate(messages);
  const lastCustomerMessageTimestamp = messages.reduce<number | null>(
    (latestTimestamp, message) =>
      !message.sending && (latestTimestamp === null || message.timestamp > latestTimestamp)
        ? message.timestamp
        : latestTimestamp,
    null,
  );

  return (
    <>
      <BackBar
        href={backHref}
        actions={
          <Popover>
            <PopoverTrigger asChild>
              <Button size="icon-sm" variant="outline" aria-label="Customer details">
                <Info className="size-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-3">
              <CustomerInfo customer={customer} />
            </PopoverContent>
          </Popover>
        }
      />
      <PageHeader
        title={customer.display_name}
        titleAction={
          customer.tags?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {customer.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null
        }
      />
      {loadError ? (
        <Alert variant="destructive">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="hidden">
            {messageGroups.length > 0 ? (
              messageGroups.map((group) => (
              <div key={group.date} className="mb-4">
                <p className="mx-auto mb-3 w-fit rounded-lg bg-[#e9edef] px-3 py-1.5 text-xs text-[#54656f] shadow-[0_1px_1px_rgba(11,20,26,0.08)] dark:bg-[#182229] dark:text-[#8696a0]">
                  {group.date}
                </p>
                {group.messages.map((message) => (
                  <div
                    key={message.id}
                    className={
                      message.sending
                        ? "relative mb-2 ml-auto w-fit max-w-[80%] rounded-[7.5px] rounded-tr-none border border-[#edf0f1] bg-[#d9fdd3] px-2 py-1.5 text-sm leading-[1.35] text-[#111b21] shadow-[0_1px_1px_rgba(11,20,26,0.16)] after:absolute after:top-0 after:-right-2 after:size-2 after:bg-[#d9fdd3] after:outline after:outline-1 after:outline-[#edf0f1] after:[clip-path:polygon(0_0,100%_0,0_100%)] dark:border-[#087663] dark:bg-[#005c4b] dark:text-[#e9edef] dark:after:bg-[#005c4b] dark:after:outline-[#087663]"
                        : "relative mb-2 w-fit max-w-[80%] rounded-[7.5px] rounded-tl-none border border-[#edf0f1] bg-white px-2 py-1.5 text-sm leading-[1.35] text-[#111b21] shadow-[0_1px_1px_rgba(11,20,26,0.1)] after:absolute after:top-0 after:-left-3 after:size-3 after:bg-[#edf0f1] after:[clip-path:polygon(0_0,100%_0,100%_100%)] before:absolute before:top-px before:-left-2 before:z-10 before:size-2 before:bg-white before:[clip-path:polygon(0_0,100%_0,100%_100%)] dark:border-[#314047] dark:bg-[#202c33] dark:text-[#e9edef] dark:after:bg-[#314047] dark:before:bg-[#202c33]"
                    }
                  >
                    {isTextMessage(message) && message.payload.context ? (
                      <p
                        className={
                          message.sending
                            ? "mb-1.5 rounded-md border-l-4 border-[#06cf9c] bg-[#cfeecb] px-2 py-1.5 text-xs text-[#54656f] dark:bg-black/15 dark:text-[#aebac1]"
                            : "mb-1.5 rounded-md border-l-4 border-[#06cf9c] bg-[#e4e7e9] px-2 py-1.5 text-xs text-[#54656f] dark:bg-black/15 dark:text-[#aebac1]"
                        }
                      >
                        Replying to previous message
                      </p>
                    ) : null}
                    {isTextMessage(message) ? (
                      <p className="whitespace-pre-wrap">{message.payload.text.body}</p>
                    ) : null}
                    {isDocumentMessage(message) ? (
                      <>
                        <ChatMediaViewer
                          mediaId={message.payload.document.id}
                          waMessageId={message.wa_message_id}
                          mediaUrl={message.attachment_url}
                          type="document"
                          mimeType={message.payload.document.mime_type}
                          filename={message.payload.document.filename}
                        />
                        {message.payload.document.caption ? (
                          <p className="mt-2 whitespace-pre-wrap">
                            {message.payload.document.caption}
                          </p>
                        ) : null}
                      </>
                    ) : null}
                    {isImageMessage(message) ? (
                      <>
                        <ChatMediaViewer
                          mediaId={message.payload.image.id}
                          waMessageId={message.wa_message_id}
                          mediaUrl={message.attachment_url}
                          type="image"
                          mimeType={message.payload.image.mime_type}
                        />
                        {message.payload.image.caption ? (
                          <p className="mt-2 whitespace-pre-wrap">{message.payload.image.caption}</p>
                        ) : null}
                      </>
                    ) : null}
                    {isLocationMessage(message) ? (
                      <a
                        href={`https://www.google.com/maps?q=${message.payload.location.latitude},${message.payload.location.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-start gap-3 rounded-md bg-black/5 p-2 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15"
                      >
                        <MapPin className="mt-0.5 size-5 shrink-0" />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium">
                            {message.payload.location.name || "Location"}
                          </span>
                          {message.payload.location.address ? (
                            <span className="mt-0.5 block text-xs opacity-70">
                              {message.payload.location.address}
                            </span>
                          ) : null}
                        </span>
                      </a>
                    ) : null}
                    {isContactMessage(message) ? (
                      <div className="space-y-2">
                        {message.payload.contacts.map((contact, index) => (
                          <div
                            key={`${contact.name.formatted_name}-${index}`}
                            className="rounded-md bg-black/5 p-3 dark:bg-white/10"
                          >
                            <div className="flex items-center gap-2">
                              <ContactRound className="size-5 shrink-0" />
                              <p className="text-sm font-medium">{contact.name.formatted_name}</p>
                            </div>
                            {contact.org?.company && contact.org.company !== "null" ? (
                              <p className="mt-2 text-xs opacity-70">{contact.org.company}</p>
                            ) : null}
                            {contact.phones?.map((phone, phoneIndex) => (
                              <div
                                key={`${phone.phone}-${phoneIndex}`}
                                className="mt-2 flex items-center gap-2 text-sm"
                              >
                                <Phone className="size-3.5 shrink-0 opacity-70" />
                                <span>{phone.phone}</span>
                                {phone.type ? (
                                  <span className="text-xs opacity-70">{phone.type}</span>
                                ) : null}
                              </div>
                            ))}
                            {contact.birthday ? (
                              <div className="mt-2 flex items-center gap-2 text-sm">
                                <Cake className="size-3.5 shrink-0 opacity-70" />
                                <span>{contact.birthday}</span>
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {isAudioMessage(message) ? (
                      <ChatMediaViewer
                        mediaId={message.payload.audio.id}
                        waMessageId={message.wa_message_id}
                        mediaUrl={message.attachment_url}
                        type="audio"
                        mimeType={message.payload.audio.mime_type}
                      />
                    ) : null}
                    {isVideoMessage(message) ? (
                      <>
                        <ChatMediaViewer
                          mediaId={message.payload.video.id}
                          waMessageId={message.wa_message_id}
                          mediaUrl={message.attachment_url}
                          type="video"
                          mimeType={message.payload.video.mime_type}
                        />
                        {message.payload.video.caption ? (
                          <p className="mt-2 whitespace-pre-wrap">{message.payload.video.caption}</p>
                        ) : null}
                      </>
                    ) : null}
                    {!isTextMessage(message) &&
                    !isDocumentMessage(message) &&
                    !isImageMessage(message) &&
                    !isLocationMessage(message) &&
                    !isContactMessage(message) &&
                    !isAudioMessage(message) &&
                    !isVideoMessage(message) ? (
                      <p>{message.type}</p>
                    ) : null}
                    <p className="mt-0.5 text-right text-[0.6875rem] leading-none text-[#667781] dark:text-[#aebac1]">
                      {formatMessageTime(message.timestamp)}
                    </p>
                  </div>
                ))}
              </div>
              ))
            ) : (
              <p className="text-center text-sm text-[#54656f] dark:text-[#8696a0]">
                No messages yet.
              </p>
            )}
          </div>
          <ChatComposeProvider>
            <Chat
              initialMessages={messages}
              numberOfPages={numberOfMessagePages}
              phoneNumberId={phoneNumberId}
              customerId={customerId}
              customerWAId={
                customer.bsuid ? undefined : `${customer.country_code}${customer.phone_number}`
              }
              customerMetaUserId={customer.bsuid}
              recipient={customer.bsuid || `${customer.country_code}${customer.phone_number}`}
            />
            <ChatMessageComposer
              customerId={customerId}
              lastCustomerMessageTimestamp={lastCustomerMessageTimestamp}
            />
          </ChatComposeProvider>
        </>
      )}
    </>
  );
}