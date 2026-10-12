import type { Metadata } from "next";

import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import type { CustomerListResponse } from "@/lib/api/types";
import { requireUser } from "@/lib/auth/session";
import { ChatsView } from "./chats-view";
import { ChatPanel } from "@/components/chat-panel";
import { MessageCircle } from "lucide-react";

export const metadata: Metadata = { title: "Chats" };

export default async function ChatsPage({ searchParams }: PageProps<"/chats">) {
  const currentUser = await requireUser();
  const params = await searchParams;
  const name = typeof params.name === "string" ? params.name : "";
  const selectedTags = Array.isArray(params.tags)
    ? params.tags
    : typeof params.tags === "string"
      ? [params.tags]
      : [];
  const status = params.status === "INACTIVE" ? "INACTIVE" : "ACTIVE";
  const selectedCustomerId =
    typeof params.customer_id === "string" && /^[1-9]\d*$/.test(params.customer_id)
      ? params.customer_id
      : undefined;

  const [customers, tags] = await Promise.all([
    serverFetch<CustomerListResponse>("/v1/customers", {
      query: { page: "1", page_size: "500", status, tags: selectedTags },
    }).catch((error) => {
      if (error instanceof ApiError) return { items: [], number_of_pages: 1 };
      throw error;
    }),
    serverFetch<string[]>("/v1/customers/tags").catch(() => [] as string[]),
  ]);

  return (
    <div className="md:grid md:h-[calc(100svh-6.5rem)] md:grid-cols-[minmax(0,300px)_minmax(0,1fr)] md:gap-4 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
      <section aria-label="Customers" className="min-h-0 min-w-0">
        <ChatsView
          customers={customers.items ?? []}
          numberOfPages={customers.number_of_pages ?? 1}
          tags={tags}
          name={name}
          selectedTags={selectedTags}
          status={status}
          currentUserId={currentUser.id}
          selectedCustomerId={selectedCustomerId}
        />
      </section>
      <section
        aria-label="Conversation"
        data-chat-customer-id={selectedCustomerId}
        className="bg-card hidden min-h-0 min-w-0 rounded-xl border md:block"
      >
        {selectedCustomerId ? (
          <ChatPanel
            key={selectedCustomerId}
            customerId={selectedCustomerId}
            embedded
          />
        ) : (
          <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-3 p-4 text-center">
            <MessageCircle className="size-10" aria-hidden="true" />
            <p>Select a customer to chat.</p>
          </div>
        )}
      </section>
    </div>
  );
}
