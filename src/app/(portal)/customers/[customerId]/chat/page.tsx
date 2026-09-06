import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import type { Customer, PhoneNumber } from "@/lib/api/types";
import { formatPhoneNumber } from "@/lib/format";

type Message = {
  id: number;
  sending: boolean;
  timestamp: number;
  type: string;
  payload: Record<string, unknown>;
};

type MessageListResponse = { items: Message[] };

function messageText(message: Message) {
  const text = message.payload.text;
  if (text && typeof text === "object" && "body" in text && typeof text.body === "string") {
    return text.body;
  }
  return message.type;
}

function formatMessageTime(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Singapore",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp * 1000));
}

export default async function CustomerChatPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  const customers = await serverFetch<{ items: Customer[] }>("/v1/customers", {
    query: { page: "1", page_size: "100" },
  });
  const customer = customers.items.find((item) => item.id === Number(customerId));
  if (!customer) notFound();

  let messages: Message[] = [];
  let loadError: string | null = null;
  try {
    const phoneNumbers = await serverFetch<PhoneNumber[]>("/v1/wa/user-phone-numbers");
    const phoneNumberId = phoneNumbers[0]?.meta_phone_number_id;
    if (!phoneNumberId) throw new Error("No WhatsApp phone number is available.");
    const response = await serverFetch<MessageListResponse>("/v1/wa/messages", {
      query: {
        phone_number_id: phoneNumberId,
        customer_phone_number: customer.bsuid
          ? undefined
          : `${customer.country_code}${customer.phone_number}`,
        customer_meta_user_id: customer.bsuid,
      },
    });
    messages = response.items;
  } catch (error) {
    loadError = error instanceof ApiError || error instanceof Error ? error.message : "Could not load messages.";
  }

  return (
    <>
      <Button asChild variant="ghost" className="-mt-2 mb-2 -ml-2">
        <Link href="/customers">
          <ArrowLeft className="size-4" />
          Back
        </Link>
      </Button>
      <PageHeader
        title={customer.display_name}
        description={formatPhoneNumber(customer.phone_number, customer.country_code)}
      />
      {loadError ? (
        <Alert variant="destructive">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : (
        <>
          {messages.length > 0 ? (
            messages.map((message) => (
              <div
                key={message.id}
                className={
                  message.sending
                    ? "mb-2 w-fit max-w-[80%] rounded-lg rounded-tl-none bg-white px-3 py-2 text-[#111b21] shadow-sm dark:bg-[#202c33] dark:text-[#e9edef]"
                    : "mb-2 ml-auto w-fit max-w-[80%] rounded-lg rounded-tr-none bg-[#d9fdd3] px-3 py-2 text-[#111b21] dark:bg-[#005c4b] dark:text-[#e9edef]"
                }
              >
                <p className="whitespace-pre-wrap">{messageText(message)}</p>
                <p className="mt-1 text-right text-[0.6875rem] text-[#667781] dark:text-[#aebac1]">
                  {formatMessageTime(message.timestamp)}
                </p>
              </div>
            ))
          ) : (
            <p className="text-center text-sm text-[#54656f] dark:text-[#8696a0]">
              No messages yet.
            </p>
          )}
        </>
      )}
    </>
  );
}