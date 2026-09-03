"use client";

import { useState } from "react";

import { PageHeader } from "@/components/page-header";
import { AddCustomerMenu } from "./add-customer-menu";
import { CustomerList } from "./customer-list";
import type { Customer } from "@/lib/api/types";
import { formatPhoneNumber } from "@/lib/format";

function customerRow(customer: Customer): Record<string, string> {
  return {
    Name: customer.display_name,
    Phone: formatPhoneNumber(customer.phone_number, customer.country_code),
    Tags: customer.tags?.join(", ") ?? "",
  };
}

export function CustomersShell({ initialRows }: { initialRows: Record<string, string>[] }) {
  const [rows, setRows] = useState(initialRows);
  const [newTags, setNewTags] = useState<string[]>([]);

  return (
    <>
      <PageHeader
        title="Customers"
        description="People who have messaged your WhatsApp Business numbers."
        action={
          <div className="mt-2">
            <AddCustomerMenu
              onCreated={(customer) => {
                setRows((currentRows) => [customerRow(customer), ...currentRows]);
                setNewTags((currentTags) => [
                  ...new Set([...currentTags, ...(customer.tags ?? [])]),
                ]);
              }}
            />
          </div>
        }
      />
      <CustomerList rows={rows} newTags={newTags} />
    </>
  );
}
