"use client";

import { useEffect, useState } from "react";
import type { Customer } from "@/lib/api/types";

export const CUSTOMER_UPDATED_EVENT = "wawa:customer-updated";

export function notifyCustomerUpdated(customer: Customer) {
  window.dispatchEvent(
    new CustomEvent<Customer>(CUSTOMER_UPDATED_EVENT, { detail: customer }),
  );
}

export function useUpdatedCustomer(customer: Customer): Customer {
  const [update, setUpdate] = useState<{ source: Customer; customer: Customer } | null>(null);
  useEffect(() => {
    function onUpdated(event: Event) {
      const updated = (event as CustomEvent<Customer>).detail;
      if (updated.id === customer.id) setUpdate({ source: customer, customer: updated });
    }
    window.addEventListener(CUSTOMER_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(CUSTOMER_UPDATED_EVENT, onUpdated);
  }, [customer]);
  return update?.source === customer ? update.customer : customer;
}
