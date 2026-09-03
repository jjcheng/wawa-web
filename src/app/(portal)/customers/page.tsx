import type { Metadata } from "next";

import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import type { Customer } from "@/lib/api/types";
import { CustomersShell } from "./customers-shell";

export const metadata: Metadata = { title: "Customers" };

export default async function CustomersPage() {
  const customers = await serverFetch<{
    items: Customer[];
    next_page_offset?: unknown;
  }>("/v1/customers", { query: { page: "1", page_size: "100" } }).catch((error) => {
    if (error instanceof ApiError) return { items: [] as Customer[] };
    throw error;
  });
  return (
    <>
      <CustomersShell initialRows={customers.items} />
    </>
  );
}
