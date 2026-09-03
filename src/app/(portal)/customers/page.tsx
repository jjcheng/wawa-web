import type { Metadata } from "next";

import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import type { Customer } from "@/lib/api/types";
import { formatPhoneNumber } from "@/lib/format";
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
  const rows = customers.items.map((customer) => ({
    Name: customer.display_name,
    Phone: formatPhoneNumber(customer.phone_number, customer.country_code),
    Tags: customer.tags?.join(", ") ?? "",
  }));

  return (
    <>
      <CustomersShell initialRows={rows} />
    </>
  );
}
