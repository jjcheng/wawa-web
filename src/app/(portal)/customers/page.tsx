import type { Metadata } from "next";

import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import type { CustomerListResponse } from "@/lib/api/types";
import { requireUser } from "@/lib/auth/session";
import { CustomersShell } from "./customers-shell";

export const metadata: Metadata = { title: "Customers" };
const PAGE_SIZES = ["10", "25", "50", "100", "500"];

export default async function CustomersPage({ searchParams }: PageProps<"/customers">) {
  const currentUser = await requireUser();
  const params = await searchParams;
  const requestedStatus = typeof params.status === "string" ? params.status : "ACTIVE";
  const status = requestedStatus === "INACTIVE" ? "INACTIVE" : "ACTIVE";
  const requestedPageSize = typeof params.page_size === "string" ? params.page_size : "100";
  const pageSize = PAGE_SIZES.includes(requestedPageSize) ? requestedPageSize : "100";
  const name = typeof params.name === "string" ? params.name : "";
  const tags = Array.isArray(params.tags)
    ? params.tags
    : typeof params.tags === "string"
      ? [params.tags]
      : [];
  const customers = await serverFetch<CustomerListResponse>("/v1/customers", {
    query: { page: "1", page_size: pageSize, status, tags },
  }).catch((error) => {
    if (error instanceof ApiError) return { items: [], number_of_pages: 0 };
    throw error;
  });
  return (
    <>
      <CustomersShell
        currentUserId={currentUser.id}
        initialRows={customers.items}
        initialNumberOfPages={customers.number_of_pages ?? 1}
        name={name}
        pageSize={pageSize}
        tags={tags}
        status={status}
      />
    </>
  );
}
