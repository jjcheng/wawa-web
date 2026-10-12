"use client";

import Link from "next/link";
import {
  Loader2,
  Megaphone,
  MessageCircle,
  Plus,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadMoreButton } from "@/components/load-more-button";
import { CUSTOMER_UPDATED_EVENT } from "@/components/customer-updates";
import { RelativeTime } from "@/components/relative-time";
import { useNavigationProgress } from "@/components/nav/navigation-progress";
import { apiFetch } from "@/lib/api/client";
import { removeUnreadChats, setChatUnread } from "@/lib/unread-chats-store";
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
import { applyCustomerNotification, type CustomerNotification } from "./customer-notifications";

export function ChatsView({
  customers: initialCustomers,
  numberOfPages: initialNumberOfPages,
  tags,
  name,
  selectedTags,
  status,
  currentUserId,
  selectedCustomerId,
}: {
  customers: Customer[];
  numberOfPages: number;
  tags: string[];
  name: string;
  selectedTags: string[];
  status: "ACTIVE" | "INACTIVE";
  currentUserId: number;
  selectedCustomerId?: string;
}) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [nameInput, setNameInput] = useState(name);
  const [currentPage, setCurrentPage] = useState(1);
  const [numberOfPages, setNumberOfPages] = useState(initialNumberOfPages);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [broadcastPending, setBroadcastPending] = useState(false);
  const [statusPending, setStatusPending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteIds, setDeleteIds] = useState<number[]>([]);
  const router = useRouter();
  const { startNavigationProgress } = useNavigationProgress();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filterKey = JSON.stringify({ name, selectedTags, status });
  const previousSelection = useRef({ selectedCustomerId, filterKey });
  const notifications = useRef(new Map<number, CustomerNotification>());
  const notificationOrder = useRef(0);
  const listGeneration = useRef(0);
  const markingReadIds = useRef(new Set<number>());
  const markedReadOrders = useRef(new Map<number, number | undefined>());
  const markReadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filteredCustomers = useMemo(() => {
    const query = nameInput.trim().toLowerCase();
    return customers.filter((customer) =>
      (customer.display_name ?? "").toLowerCase().includes(query),
    );
  }, [customers, nameInput]);
  const hasFilters = Boolean(nameInput) || selectedTags.length > 0 || status !== "ACTIVE";
  const allSelected =
    filteredCustomers.length > 0 &&
    filteredCustomers.every((customer) => selectedIds.has(customer.id));
  const someSelected =
    !allSelected && filteredCustomers.some((customer) => selectedIds.has(customer.id));

  function isCustomerConversationVisible(customerId: number) {
    const currentId = new URLSearchParams(window.location.search).get("customer_id");
    const panel = document.querySelector<HTMLElement>(`[data-chat-customer-id="${customerId}"]`);
    return String(customerId) === selectedCustomerId &&
      currentId === String(customerId) &&
      document.visibilityState === "visible" &&
      Boolean(panel?.checkVisibility());
  }

  useEffect(() => {
    const previous = previousSelection.current;
    previousSelection.current = { selectedCustomerId, filterKey };
    if (
      previous.selectedCustomerId !== selectedCustomerId &&
      previous.filterKey === filterKey
    ) {
      return;
    }
    queueMicrotask(() => {
      listGeneration.current += 1;
      notifications.current.clear();
      setCustomers(initialCustomers);
      setCurrentPage(1);
      setNumberOfPages(initialNumberOfPages);
      setSelectedIds(new Set());
    });
  }, [initialCustomers, initialNumberOfPages, selectedCustomerId, filterKey]);

  useEffect(() => {
    for (const customer of customers) {
      setChatUnread(customer.id, customer.latest_message_read === false);
    }
  }, [customers]);

  const handleIncomingMessage = useEffectEvent(async (
    message: IncomingChatMessage,
    signal: AbortSignal,
    pendingCustomers: Set<number>,
  ) => {
    const generation = listGeneration.current;
    notifications.current.set(message.customer_id, {
      message,
      receivedAt: new Date().toISOString(),
      order: ++notificationOrder.current,
      read: message.sending === true || isCustomerConversationVisible(message.customer_id),
    });
    setCustomers((current) => applyCustomerNotification(
      current, message.customer_id, notifications.current, status, selectedTags,
    ));
    if (!message.sending && isCustomerConversationVisible(message.customer_id)) {
      if (markReadTimer.current !== null) clearTimeout(markReadTimer.current);
      markReadTimer.current = setTimeout(() => {
        markReadTimer.current = null;
        markOpenCustomerRead(message.customer_id);
      }, 5000);
    }
    if (customers.some((row) => row.id === message.customer_id) ||
      pendingCustomers.has(message.customer_id)) return;
    pendingCustomers.add(message.customer_id);
    try {
      const customer = await apiFetch<Customer>(`v1/customers/${message.customer_id}`, {
        query: { id: String(message.customer_id) },
        signal,
      });
      if (signal.aborted || generation !== listGeneration.current) return;
      setCustomers((current) => applyCustomerNotification(
        current, message.customer_id, notifications.current, status, selectedTags, customer,
      ));
    } catch (error) {
      if (!signal.aborted && generation === listGeneration.current) {
        toast.error(toApiError(error).message);
      }
    } finally {
      pendingCustomers.delete(message.customer_id);
    }
  });

  useEffect(() => {
    const controller = new AbortController();
    const pendingCustomers = new Set<number>();
    function onIncomingMessage(event: Event) {
      void handleIncomingMessage(
        (event as CustomEvent<IncomingChatMessage>).detail, controller.signal, pendingCustomers,
      );
    }
    window.addEventListener(PHONE_NUMBER_MESSAGE_EVENT, onIncomingMessage);
    return () => {
      controller.abort();
      window.removeEventListener(PHONE_NUMBER_MESSAGE_EVENT, onIncomingMessage);
    };
  }, [filterKey]);

  const markOpenCustomerRead = useEffectEvent((customerId: number) => {
    if (!isCustomerConversationVisible(customerId)) return;
    const order = notifications.current.get(customerId)?.order;
    if (markedReadOrders.current.has(customerId) &&
      markedReadOrders.current.get(customerId) === order) return;
    if (markingReadIds.current.has(customerId)) {
      markReadTimer.current = setTimeout(() => {
        markReadTimer.current = null;
        markOpenCustomerRead(customerId);
      }, 5000);
      return;
    }
    void markCustomerRead(customerId, true);
  });

  const markSelectedCustomerRead = useEffectEvent(() => {
    if (selectedCustomerId) void markCustomerRead(Number(selectedCustomerId));
  });

  useEffect(() => {
    markSelectedCustomerRead();
    return () => {
      if (markReadTimer.current !== null) {
        clearTimeout(markReadTimer.current);
        markReadTimer.current = null;
      }
    };
  }, [selectedCustomerId, filterKey]);

  async function markCustomerRead(customerId: number, force = false) {
    if (!isCustomerConversationVisible(customerId) ||
      (!force && customers.find((customer) => customer.id === customerId)?.latest_message_read !== false) ||
      markingReadIds.current.has(customerId)) return;
    markingReadIds.current.add(customerId);
    const notificationOrder = notifications.current.get(customerId)?.order;
    try {
      await apiFetch("v1/wa/messages/mark-read", {
        method: "POST",
        query: { customer_id: String(customerId) },
      });
      markedReadOrders.current.set(customerId, notificationOrder);
      const notification = notifications.current.get(customerId);
      if (notification?.order !== notificationOrder) return;
      if (notification) notifications.current.set(customerId, { ...notification, read: true });
      setCustomers((current) => current.map((row) =>
        row.id === customerId ? { ...row, latest_message_read: true } : row,
      ));
    } catch (error) {
      toast.error(toApiError(error).message);
    } finally {
      markingReadIds.current.delete(customerId);
    }
  }

  async function deleteSelectedCustomers() {
    if (deletePending || deleteIds.length === 0) return;
    const ids = [...deleteIds];
    setDeletePending(true);
    try {
      await apiFetch("v1/customers", { method: "DELETE", body: { ids } });
      setCustomers((current) => current.filter((customer) => !ids.includes(customer.id)));
      setSelectedIds((current) => new Set([...current].filter((id) => !ids.includes(id))));
      for (const id of ids) notifications.current.delete(id);
      removeUnreadChats(ids);
      setDeleteIds([]);
      toast.success(ids.length === 1 ? "Customer deleted." : "Customers deleted.");
      if (selectedCustomerId && ids.includes(Number(selectedCustomerId))) {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("customer_id");
        router.replace(`${pathname}?${params.toString()}`);
      } else {
        router.refresh();
      }
    } catch (error) {
      toast.error(toApiError(error).message);
    } finally {
      setDeletePending(false);
    }
  }

  useEffect(() => {
    function onCustomerUpdated(event: Event) {
      const updated = (event as CustomEvent<Customer>).detail;
      setCustomers((current) => current.flatMap((customer) => {
        if (customer.id !== updated.id) return [customer];
        if (updated.status !== status ||
          !selectedTags.every((tag) => updated.tags?.includes(tag))) return [];
        return [{ ...customer, ...updated }];
      }));
    }
    window.addEventListener(CUSTOMER_UPDATED_EVENT, onCustomerUpdated);
    return () => window.removeEventListener(CUSTOMER_UPDATED_EVENT, onCustomerUpdated);
  }, [status, selectedTags]);

  async function loadMore() {
    if (isLoadingMore || currentPage >= numberOfPages) return;
    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const result = await apiFetch<CustomerListResponse>("v1/customers", {
        query: {
          page: String(nextPage),
          page_size: "500",
          status,
          tags: selectedTags,
        },
      });
      setCustomers((current) => {
        const existingIds = new Set(current.map((customer) => customer.id));
        return [...current, ...result.items.filter((customer) => !existingIds.has(customer.id))];
      });
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

  function toggleRow(id: number) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function startBroadcast() {
    const invalidCustomers = customers.filter(
      (customer) => selectedIds.has(customer.id) && !customer.wa_id,
    );
    if (invalidCustomers.length > 0) {
      toast.error(
        "Some selected customers have an invalid phone number. Please open their chat and edit their details to correct them.",
      );
      return;
    }
    sessionStorage.setItem("new-broadcast-customer-ids", JSON.stringify([...selectedIds]));
    setBroadcastPending(true);
    router.push("/chats/new-broadcast");
  }

  async function updateSelectedStatus() {
    if (statusPending || selectedIds.size === 0) return;
    const nextStatus = status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const ids = [...selectedIds];
    setStatusPending(true);
    try {
      await apiFetch("v1/customers/status", {
        method: "PATCH",
        body: { ids, status: nextStatus },
      });
      setCustomers((current) => current.filter((customer) => !ids.includes(customer.id)));
      setSelectedIds(new Set());
      toast.success(
        nextStatus === "INACTIVE" ? "Customers archived." : "Customers unarchived.",
      );
      router.refresh();
    } catch (error) {
      toast.error(toApiError(error).message);
    } finally {
      setStatusPending(false);
    }
  }

  return (
    <div className="relative flex min-h-48 flex-col md:h-full">
      <div className="min-h-0 flex-1 pb-20 md:overflow-y-auto">
        <div className="bg-card divide-border divide-y rounded-md border">
          <div className="bg-card sticky top-14 z-10 rounded-t-md shadow-sm md:top-0">
            <div className="flex items-center gap-2 px-4 py-2">
              <Checkbox
                checked={allSelected}
                ref={(element) => {
                  if (element) element.indeterminate = someSelected;
                }}
                disabled={filteredCustomers.length === 0}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setSelectedIds((current) => {
                    const next = new Set(current);
                    for (const customer of filteredCustomers) {
                      if (checked) next.add(customer.id);
                      else next.delete(customer.id);
                    }
                    return next;
                  });
                }}
                aria-label="Select all customers"
              />
              <ChatsSearchInput value={nameInput} onChange={setNameInput} />
              <ChatsFilterPopover tags={tags} selectedTags={selectedTags} status={status} />
            </div>
            {selectedIds.size > 0 ? (
              <div className="flex flex-wrap items-center gap-2 border-t px-4 py-2">
                <Button
                  type="button"
                  size="sm"
                  className="bg-green-600 text-white hover:bg-green-700"
                  onClick={startBroadcast}
                  disabled={broadcastPending || statusPending || deletePending}
                >
                  {broadcastPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Megaphone className="size-4" />
                  )}
                  Broadcast
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="bg-accent text-accent-foreground hover:bg-accent/80"
                  onClick={updateSelectedStatus}
                  disabled={statusPending || broadcastPending || deletePending}
                >
                  {statusPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : null}
                  {status === "ACTIVE" ? "Archive" : "Unarchive"}
                </Button>
                {status === "INACTIVE" ? (
                  <Button type="button" size="sm" variant="destructive" onClick={() => setDeleteIds([...selectedIds])} disabled={statusPending || broadcastPending || deletePending}>
                    Delete
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
          {filteredCustomers.length === 0 ? (
            <div className="flex min-h-32 flex-col items-center justify-center gap-2 p-6 text-center">
              <MessageCircle className="text-muted-foreground size-8" />
              <p className="text-muted-foreground text-base">No customers found.</p>
              {hasFilters ? (
                <Button type="button" size="sm" variant="outline" onClick={resetFilters}>
                  Reset filters
                </Button>
              ) : null}
            </div>
          ) : (
            filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                className={`hover:bg-accent/60 relative flex items-center gap-3 px-4 py-3 transition-colors ${String(customer.id) === selectedCustomerId ? "md:bg-accent" : ""}`}
              >
                <div className="relative shrink-0">
                  <Checkbox
                    checked={selectedIds.has(customer.id)}
                    onChange={() => toggleRow(customer.id)}
                    aria-label={`Select ${customer.display_name}`}
                  />
                </div>
                <Link
                  href={`/chats/${customer.id}/chat?return_to=%2Fchats`}
                  data-navigation-progress="manual"
                  className="flex min-w-0 flex-1 items-start gap-3"
                  aria-current={
                    String(customer.id) === selectedCustomerId ? "page" : undefined
                  }
                  onClick={(event) => {
                    if (String(customer.id) === selectedCustomerId) void markCustomerRead(customer.id);
                    if (
                      !window.matchMedia("(min-width: 768px)").matches ||
                      event.metaKey ||
                      event.ctrlKey ||
                      event.shiftKey ||
                      event.altKey
                    )
                      return;
                    event.preventDefault();
                    if (String(customer.id) === selectedCustomerId) return;
                    const params = new URLSearchParams(searchParams);
                    params.set("customer_id", String(customer.id));
                    const nextRoute = `/chats?${params}`;
                    startNavigationProgress(nextRoute);
                    router.push(nextRoute, { scroll: false });
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                      <p className="min-w-0 truncate leading-5 font-medium">
                        {customer.display_name}
                      </p>
                      {customer.tags?.length ? (
                        <div className="flex flex-wrap gap-1">
                          {customer.tags.map((customerTag) => (
                            <Badge
                              key={customerTag}
                              className="h-5 bg-green-100 px-1.5 text-[10px] leading-none text-green-700 dark:bg-green-950 dark:text-green-300"
                            >
                              {customerTag}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    {customer.latest_message_content ? (
                      <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                        {customer.latest_message_content}
                      </p>
                    ) : (
                      <p className="text-muted-foreground text-sm">No message</p>
                    )}
                  </div>
                  <div className="ml-auto flex max-w-[45%] shrink-0 flex-col items-end gap-1 text-right">
                    {customer.status === "INACTIVE" ? (
                      <Badge variant="secondary">Inactive</Badge>
                    ) : null}
                    <div className="flex flex-col items-end gap-1 whitespace-nowrap">
                      {customer.latest_message_content && customer.latest_message_timestamp ? (
                        <p className="text-muted-foreground text-xs">
                          <RelativeTime value={customer.latest_message_timestamp} />
                        </p>
                      ) : null}
                      {customer.latest_message_read === false ? (
                        <span
                          role="img"
                          aria-label="Unread messages"
                          className="pointer-events-none mt-2 size-2.5 shrink-0 rounded-full bg-red-500"
                        />
                      ) : null}
                    </div>
                  </div>
                </Link>
              </div>
            ))
          )}
        </div>
        {customers.length > 0 && currentPage < numberOfPages ? (
          <LoadMoreButton loading={isLoadingMore} onClick={loadMore} />
        ) : null}
      </div>
      <div className="fixed right-4 bottom-[calc(var(--tab-bar-height)+1rem)] z-20 flex flex-col items-end gap-2 md:absolute md:right-4 md:bottom-4 md:z-10">
        <AddCustomerMenu
          currentUserId={currentUserId}
          onCreated={() => router.refresh()}
          trigger={
            <Button
              type="button"
              size="icon-lg"
              aria-label="Add customer"
              className="size-12 shadow-lg"
            >
              <Plus className="size-6" />
            </Button>
          }
        />
      </div>
      <Dialog open={deleteIds.length > 0} onOpenChange={(open) => { if (!open && !deletePending) setDeleteIds([]); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{deleteIds.length === 1 ? "Delete this customer?" : "Delete selected customers?"}</DialogTitle>
            <DialogDescription>
              {deleteIds.length === 1 ? "The selected customer will" : `${deleteIds.length} selected customers will`} be permanently removed from your customers.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row items-center justify-between gap-3 sm:justify-between">
            <Button type="button" variant="outline" onClick={() => setDeleteIds([])} disabled={deletePending}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={() => void deleteSelectedCustomers()} disabled={deletePending}>
              {deletePending ? <Loader2 className="size-4 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
