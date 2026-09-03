"use client";

import { useState } from "react";

import { PageHeader } from "@/components/page-header";
import { AddCustomerMenu } from "./add-customer-menu";
import { CustomerList } from "./customer-list";
import type { Customer } from "@/lib/api/types";
export function CustomersShell({ initialRows }: { initialRows: Customer[] }) {
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
                setRows((currentRows) => [customer, ...currentRows]);
                setNewTags((currentTags) => [
                  ...new Set([...currentTags, ...(customer.tags ?? [])]),
                ]);
              }}
            />
          </div>
        }
      />
      <CustomerList
        rows={rows}
        newTags={newTags}
        onDeleted={(customerId) => {
          setRows((currentRows) =>
            currentRows.filter((customer) => customer.id !== customerId),
          );
          setNewTags((currentTags) =>
            currentTags.filter((tag) =>
              rows.some(
                (customer) => customer.tags?.includes(tag) && customer.id !== customerId,
              ),
            ),
          );
        }}
      />
    </>
  );
}
