"use client";

import { useEffect, useState } from "react";
import { toast } from "@/lib/toast";

import { EditBroadcastForm } from "../../broadcasts/new/edit-broadcast-form";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import type { Customer, CustomerListResponse, Template } from "@/lib/api/types";

export function NewBroadcastContent({
  templates,
}: {
  templates: Template[];
}) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let customerIds: number[] = [];
    try {
      const stored = JSON.parse(sessionStorage.getItem("new-broadcast-customer-ids") ?? "[]");
      if (Array.isArray(stored)) {
        customerIds = stored.filter(
          (id): id is number => typeof id === "number" && Number.isInteger(id),
        );
      }
    } catch {
      customerIds = [];
    }

    if (customerIds.length === 0) {
      queueMicrotask(() => setLoading(false));
      return;
    }

    async function loadCustomers() {
      try {
        const loaded: Customer[] = [];
        let page = 1;
        let numberOfPages = 1;
        const selectedIds = new Set(customerIds);
        do {
          const response = await apiFetch<CustomerListResponse>("v1/customers", {
            query: { page: String(page), page_size: "500", status: "ACTIVE" },
          });
          loaded.push(...response.items.filter((customer) => selectedIds.has(customer.id)));
          numberOfPages = response.number_of_pages ?? page;
          page += 1;
        } while (page <= numberOfPages);
        if (active) setCustomers(loaded);
      } catch (error) {
        if (active) toast.error(toApiError(error).message);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadCustomers();
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <p className="text-muted-foreground text-sm">Loading customers...</p>;

  return <EditBroadcastForm customers={customers} templates={templates} />;
}
