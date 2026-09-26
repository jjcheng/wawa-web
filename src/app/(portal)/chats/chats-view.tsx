"use client";

import Link from "next/link";
import { Archive, ArchiveRestore, Loader2, Megaphone, Pencil } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CustomerDetailsButton } from "@/components/customer-details-button";
import { LoadMoreButton } from "@/components/load-more-button";
import { PageHeader } from "@/components/page-header";
import { RelativeTime } from "@/components/relative-time";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import type { Customer, CustomerListResponse } from "@/lib/api/types";
import {
  PHONE_NUMBER_MESSAGE_EVENT,
  type IncomingChatMessage,
} from "@/components/phone-number-messages-provider";
import { toast } from "@/lib/toast";
import { AddCustomerMenu } from "../customers/add-customer-menu";
import { ChatsFilterPopover } from "./chats-filter-popover";
import { ChatsSearchInput } from "./chats-search-input";

function initials(customer: Customer) {
  return (customer.display_name || "?").slice(0, 2).toUpperCase();
}

export function ChatsView({
  customers: initialCustomers,
  numberOfPages: initialNumberOfPages,
  tags,
  name,
  selectedTags,
  status,
  currentUserId,
}: {
  customers: Customer[];
  numberOfPages: number;
  tags: string[];
  name: string;
  selectedTags: string[];
  status: "ACTIVE" | "INACTIVE";
  currentUserId: number;
}) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [nameInput, setNameInput] = useState(name);
  const [currentPage, setCurrentPage] = useState(1);
  const [numberOfPages, setNumberOfPages] = useState(initialNumberOfPages);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [unreadIds, setUnreadIds] = useState<Set<number>>(new Set());
  const [bulkActionPending, setBulkActionPending] = useState(false);
  const [broadcastPending, setBroadcastPending] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const filteredCustomers = useMemo(() => {
    const query = nameInput.trim().toLowerCase();
    return customers.filter((customer) =>
      (customer.display_name ?? "").toLowerCase().includes(query),
    );
  }, [customers, nameInput]);
  const allSelected = filteredCustomers.length > 0 && filteredCustomers.every((row) => selectedIds.has(row.id));
  const someSelected = selectedIds.size > 0 && !allSelected;
  const hasFilters = Boolean(nameInput) || selectedTags.length > 0 || status !== "ACTIVE";

  useEffect(() => {
    queueMicrotask(() => {
      setCustomers(initialCustomers);
      setCurrentPage(1);
      setNumberOfPages(initialNumberOfPages);
      setSelectedIds(new Set());
    });
  }, [initialCustomers, initialNumberOfPages]);

  function handleIncomingMessage(message: IncomingChatMessage) {
    setCustomers((current) => {
      if (!current.some((row) => row.id === message.customer_id)) return current;
      return current.map((row) =>
        row.id === message.customer_id
          ? { ...row, latest_message_content: message.notification_content }
          : row,
      );
    });
    setUnreadIds((current) => new Set(current).add(message.customer_id));
  }

  useEffect(() => {
    function onIncomingMessage(event: Event) {
      handleIncomingMessage((event as CustomEvent<IncomingChatMessage>).detail);
    }
    window.addEventListener(PHONE_NUMBER_MESSAGE_EVENT, onIncomingMessage);
    return () => window.removeEventListener(PHONE_NUMBER_MESSAGE_EVENT, onIncomingMessage);
  }, []);

  function clearUnread(customerId: number) {
    setUnreadIds((current) => {
      if (!current.has(customerId)) return current;
      const next = new Set(current);
      next.delete(customerId);
      return next;
    });
  }

  async function loadMore() {
    if (isLoadingMore || currentPage >= numberOfPages) return;
    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const result = await apiFetch<CustomerListResponse>("v1/customers", {
        query: {
          page: String(nextPage),
          page_size: "50",
          status,
          tags: selectedTags,
        },
      });
      setCustomers((current) => [...current, ...result.items]);
      setCurrentPage(nextPage);
      setNumberOfPages(result.number_of_pages ?? numberOfPages);
    } catch (error) {
      toast.error(toApiError(error).message);
    } finally {
      setIsLoadingMore(false);
    }
  }

  function resetFilters() {
    setNameInput("");
    router.push(pathname);
  }

  function toggleAll() {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const customer of filteredCustomers) {
        if (allSelected) next.delete(customer.id);
        else next.add(customer.id);
      }
      return next;
    });
  }

  function toggleRow(id: number) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function archiveSelected() {
    const nextStatus = status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setBulkActionPending(true);
    try {
      await apiFetch("v1/customers/status", {
        method: "PATCH",
        body: { ids: [...selectedIds], status: nextStatus },
      });
      setSelectedIds(new Set());
      router.refresh();
    } catch (error) {
      toast.error(toApiError(error).message);
    } finally {
      setBulkActionPending(false);
    }
  }

  function startBroadcast() {
    const invalidCustomers = customers.filter(
      (customer) => selectedIds.has(customer.id) && !customer.wa_id,
    );
    if (invalidCustomers.length > 0) {
      toast.error(
        "Some selected customers have an invalid phone number. Please use View -> Edit to correct them.",
      );
      return;
    }
    sessionStorage.setItem("new-broadcast-customer-ids", JSON.stringify([...selectedIds]));
    setBroadcastPending(true);
    router.push("/customers/new-broadcast");
  }

  return (
    <>
      <PageHeader
        title="Chats"
        action={
          selectedIds.size > 0 ? (
            <div className="flex items-center gap-2">
              {selectedIds.size === 1 ? (
                <CustomerDetailsButton
                  customer={customers.find((row) => selectedIds.has(row.id))!}
                  startInEditMode
                  onUpdated={() => router.refresh()}
                  trigger={
                    <Button type="button" size="sm" variant="outline">
                      <Pencil className="size-4" />
                      Edit
                    </Button>
                  }
                />
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={archiveSelected}
                disabled={bulkActionPending}
              >
                {bulkActionPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : status === "ACTIVE" ? (
                  <Archive className="size-4" />
                ) : (
                  <ArchiveRestore className="size-4" />
                )}
                {status === "ACTIVE" ? "Archive" : "Unarchive"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={startBroadcast}
                disabled={broadcastPending}
              >
                {broadcastPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Megaphone className="size-4" />
                )}
                {broadcastPending ? "Loading..." : "Broadcast"}
              </Button>
            </div>
          ) : (
            <AddCustomerMenu currentUserId={currentUserId} onCreated={() => router.refresh()} />
          )
        }
      />
      {filteredCustomers.length === 0 ? (
        <div className="bg-card divide-border divide-y overflow-hidden rounded-lg border">
          <div className="flex items-center gap-2 px-4 py-2">
            <Checkbox checked={false} disabled aria-label="Select all chats" />
            <ChatsSearchInput value={nameInput} onChange={setNameInput} />
            <ChatsFilterPopover tags={tags} selectedTags={selectedTags} status={status} />
          </div>
          <div className="flex min-h-32 flex-col items-center justify-center gap-2 p-6 text-center">
            <p className="text-muted-foreground text-sm">No customers found.</p>
            {hasFilters ? (
              <Button type="button" size="sm" variant="outline" onClick={resetFilters}>
                Reset filters
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="bg-card divide-border overflow-hidden divide-y rounded-lg border">
          <div className="flex items-center gap-2 px-4 py-2">
            <Checkbox
              checked={allSelected}
              ref={(element) => {
                if (element) element.indeterminate = someSelected;
              }}
              onChange={toggleAll}
              aria-label="Select all chats"
            />
            <ChatsSearchInput value={nameInput} onChange={setNameInput} />
            <ChatsFilterPopover tags={tags} selectedTags={selectedTags} status={status} />
          </div>
            {filteredCustomers.map((customer) => (
            <div
              key={customer.id}
              className="hover:bg-accent/60 flex items-center gap-3 px-4 py-3 transition-colors"
            >
              <Checkbox
                checked={selectedIds.has(customer.id)}
                onChange={() => toggleRow(customer.id)}
                aria-label={`Select ${customer.display_name}`}
              />
              <Link
                href={`/chats/${customer.id}/chat?return_to=%2Fchats`}
                className="flex min-w-0 flex-1 items-start gap-3"
                onClick={() => clearUnread(customer.id)}
              >
                <Avatar className="relative size-10 shrink-0">
                  <AvatarFallback>{initials(customer)}</AvatarFallback>
                  {unreadIds.has(customer.id) ? (
                    <span
                      aria-label="Unread messages"
                      className="border-background absolute -top-0.5 -left-0.5 size-2.5 rounded-full border-2 bg-red-500"
                    />
                  ) : null}
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{customer.display_name}</p>
                  {customer.latest_message_content ? (
                    <p className="text-muted-foreground line-clamp-2 text-sm">
                      {customer.latest_message_content}
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-xs">No message</p>
                  )}
                </div>
                <div className="ml-auto flex max-w-[45%] shrink-0 flex-col items-end gap-1 text-right">
                  {customer.tags?.length ? (
                    <div className="flex flex-wrap justify-end gap-1">
                      {customer.tags.slice(0, 2).map((customerTag) => (
                        <Badge
                          key={customerTag}
                          className="h-5 px-1.5 text-[10px] leading-none bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                        >
                          {customerTag}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                  {customer.status === "INACTIVE" ? <Badge variant="secondary">Inactive</Badge> : null}
                  {customer.latest_message_content && customer.last_message_timestamp ? (
                    <p className="text-muted-foreground text-xs">
                      <RelativeTime value={customer.last_message_timestamp} />
                    </p>
                  ) : null}
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
      {customers.length > 0 && currentPage < numberOfPages ? (
        <LoadMoreButton loading={isLoadingMore} onClick={loadMore} />
      ) : null}
    </>
  );
}
