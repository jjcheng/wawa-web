import type { Metadata } from "next";

import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import type { CustomerListResponse } from "@/lib/api/types";
import { requireUser } from "@/lib/auth/session";
import { ChatsView } from "./chats-view";

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

  const [customers, tags] = await Promise.all([
    serverFetch<CustomerListResponse>("/v1/customers", {
      query: { page: "1", page_size: "50", status, tags: selectedTags },
    }).catch((error) => {
      if (error instanceof ApiError) return { items: [], number_of_pages: 1 };
      throw error;
    }),
    serverFetch<string[]>("/v1/customers/tags").catch(() => [] as string[]),
  ]);

  return (
    <ChatsView
      customers={customers.items ?? []}
      numberOfPages={customers.number_of_pages ?? 1}
      tags={tags}
      name={name}
      selectedTags={selectedTags}
      status={status}
      currentUserId={currentUser.id}
    />
  );
}
