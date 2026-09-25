import type { Metadata } from "next";

import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import type { CustomerListResponse } from "@/lib/api/types";
import { ChatsView } from "./chats-view";

export const metadata: Metadata = { title: "Chats" };

export default async function ChatsPage({ searchParams }: PageProps<"/chats">) {
  const params = await searchParams;
  const name = typeof params.name === "string" ? params.name : "";
  const tag = typeof params.tag === "string" ? params.tag : "";

  const [customers, tags] = await Promise.all([
    serverFetch<CustomerListResponse>("/v1/customers", {
      query: { page: "1", page_size: "100", status: "ACTIVE", name, tags: tag ? [tag] : [] },
    }).catch((error) => {
      if (error instanceof ApiError) return { items: [] };
      throw error;
    }),
    serverFetch<string[]>("/v1/customers/tags").catch(() => [] as string[]),
  ]);

  return <ChatsView customers={customers.items ?? []} tags={tags} name={name} tag={tag} />;
}
