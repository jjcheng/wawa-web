import { ApiErrorToast } from "@/components/api-error-toast";
import { BackBar } from "@/components/back-bar";
import { Chat } from "@/components/chat";
import { ChatViewport } from "@/components/chat-viewport";
import { ChatComposeProvider, type ChatMessage } from "@/components/chat-compose-context";
import { ChatMessageComposer } from "@/components/chat-message-composer";
import { ChatCustomerHeader } from "@/components/chat-customer-header";
import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ApiError, toApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import type { Customer, PhoneNumberListResponse } from "@/lib/api/types";

type MessageListResponse = {
  items: ChatMessage[];
  number_of_pages?: number;
  number_of_items: number;
};

export async function ChatPanel({
  customerId,
  backHref = "/chats",
  embedded = false,
}: {
  customerId: string;
  backHref?: string;
  embedded?: boolean;
}) {
  let customer: Customer | null = null;
  let customerLoadError: string | null = null;
  try {
    customer = await serverFetch<Customer>(`/v1/customers/${encodeURIComponent(customerId)}`, {
      query: { id: customerId },
    });
  } catch (error) {
    customerLoadError = toApiError(error).message;
  }

  if (!customer) {
    return (
      <div className={embedded ? "flex h-full min-h-0 flex-col p-4" : undefined}>
        {!embedded ? <BackBar href={backHref} /> : null}
        <PageHeader title="Customer chat" />
        <ApiErrorToast message={customerLoadError} />
      </div>
    );
  }

  let messages: ChatMessage[] = [];
  let numberOfMessagePages: number | undefined = 1;
  let phoneNumberId = "";
  let loadError: string | null = null;
  try {
    const phoneNumbers = await serverFetch<PhoneNumberListResponse>("/v1/wa/phone-numbers", {
      query: { page: "1", page_size: "10" },
    });
    phoneNumberId = phoneNumbers.items[0]?.meta_phone_number_id ?? "";
    if (!phoneNumberId) throw new Error("No WhatsApp phone number is available.");
    const response = await serverFetch<MessageListResponse>("/v1/wa/messages", {
      query: { customer_id: customerId, page: "1", page_size: "50" },
    });
    messages = response.items.sort((first, second) => first.timestamp - second.timestamp);
    numberOfMessagePages = response.number_of_pages;
  } catch (error) {
    loadError =
      error instanceof ApiError || error instanceof Error
        ? error.message
        : "Could not load messages.";
  }

  return (
    <div className={embedded ? "flex h-full min-h-0 flex-col" : undefined}>
      <div className={embedded ? "shrink-0 px-4 pt-4" : undefined}>
        <ChatCustomerHeader customer={customer} embedded={embedded} backHref={backHref} />
      </div>
      {loadError ? (
        <Alert variant="destructive" className={embedded ? "mx-4 w-auto" : undefined}>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : (
        <ConversationViewport embedded={embedded}>
          <ChatComposeProvider key={customerId}>
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
              messageId={
                [...messages]
                  .reverse()
                  .find((message) => !message.sending && message.type !== "reaction")?.id
              }
            />
          </ChatComposeProvider>
        </ConversationViewport>
      )}
    </div>
  );
}

function ConversationViewport({
  embedded,
  children,
}: {
  embedded: boolean;
  children: React.ReactNode;
}) {
  return embedded ? <ChatViewport>{children}</ChatViewport> : children;
}
