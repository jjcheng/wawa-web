"use client";

import { Info, Loader2, Search, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "@/lib/toast";

import { TableEmptyState } from "@/components/table-empty-state";
import { TableHeaderMultiSelect } from "@/components/table-header-multi-select";
import { CustomerDetailsButton } from "@/components/customer-details-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import type { Customer } from "@/lib/api/types";
import { formatPhoneNumber } from "@/lib/format";

const COLUMNS = ["Name", "Phone", "Tags", "Actions"];
const NO_TAGS_OPTION = "No tags";

export function CustomerList({
  rows,
  newTags = [],
  onDeleted,
  onUpdated,
  name,
  initialTags,
  status,
}: {
  rows: Customer[];
  newTags?: string[];
  onDeleted?: (customerId: number) => void;
  onUpdated?: (customer: Customer) => void;
  name: string;
  initialTags: string[];
  status: "ACTIVE" | "INACTIVE";
}) {
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [selectedTags, setSelectedTags] = useState<Set<string>>(
    new Set(initialTags.map((tag) => (tag === "" ? NO_TAGS_OPTION : tag))),
  );
  const [tags, setTags] = useState<string[]>([]);
  const [tagError, setTagError] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState(name);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [bulkActionPending, setBulkActionPending] = useState(false);
  const [invalidPhonePopoverId, setInvalidPhonePopoverId] = useState<number | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tagOptions = [
    NO_TAGS_OPTION,
    ...[...new Set([...tags, ...newTags])].filter((tag) => tag !== NO_TAGS_OPTION).sort(),
  ];
  const filteredRows = useMemo(() => {
    const query = nameInput.trim().toLowerCase();
    return rows.filter((row) => (row.display_name ?? "").toLowerCase().includes(query));
  }, [nameInput, rows]);
  const allFilteredRowsSelected =
    filteredRows.length > 0 && filteredRows.every((row) => selectedRows.has(row.id));

  useEffect(() => {
    queueMicrotask(() =>
      setSelectedTags(new Set(initialTags.map((tag) => (tag === "" ? NO_TAGS_OPTION : tag)))),
    );
  }, [initialTags]);

  useEffect(() => {
    apiFetch<string[]>("v1/customers/tags")
      .then((result) => setTags(Array.isArray(result) ? result : []))
      .catch((error) => setTagError(toApiError(error).message));
  }, []);

  function toggleAllRows(checked: boolean) {
    setSelectedRows((current) => {
      const next = new Set(current);
      filteredRows.forEach((row) => {
        if (checked) next.add(row.id);
        else next.delete(row.id);
      });
      return next;
    });
  }

  function toggleRow(rowId: number, checked: boolean) {
    setSelectedRows((current) => {
      const next = new Set(current);
      if (checked) next.add(rowId);
      else next.delete(rowId);
      return next;
    });
  }

  function setStatus(value: string) {
    const params = new URLSearchParams(searchParams);
    params.set("status", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  function setTagsFilter(nextTags: Set<string>) {
    const params = new URLSearchParams(searchParams);
    params.delete("tags");
    if (nextTags.has(NO_TAGS_OPTION)) {
      params.set("tags", "");
    } else {
      nextTags.forEach((tag) => params.append("tags", tag));
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function clearSearch() {
    setNameInput("");
  }

  function resetFilters() {
    setNameInput("");
    setSelectedTags(new Set());
    const params = new URLSearchParams(searchParams);
    params.delete("name");
    params.delete("tags");
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleDeleted(customer: Customer) {
    const remainingRows = rows.filter((row) => row.id !== customer.id);
    setSelectedRows((current) => {
      const next = new Set(current);
      next.delete(customer.id);
      return next;
    });
    setTags((currentTags) =>
      currentTags.filter(
        (tag) =>
          !customer.tags?.includes(tag) ||
          remainingRows.some((row) => row.tags?.includes(tag)) ||
          newTags.includes(tag),
      ),
    );
    onDeleted?.(customer.id);
  }

  async function updateSelectedStatus(nextStatus: "ACTIVE" | "INACTIVE") {
    setBulkActionPending(true);
    try {
      const selectedCustomers = rows.filter((row) => selectedRows.has(row.id));
      await apiFetch("v1/customers/status", {
        method: "PATCH",
        body: { ids: selectedCustomers.map((customer) => customer.id), status: nextStatus },
      });
      selectedCustomers.forEach((customer) =>
        onUpdated?.({ ...customer, status: nextStatus }),
      );
      setSelectedRows(new Set());
      router.refresh();
    } catch (error) {
      toast.error(toApiError(error).message);
    } finally {
      setBulkActionPending(false);
    }
  }

  async function deleteSelectedCustomers() {
    setBulkActionPending(true);
    try {
      const selectedCustomerIds = [...selectedRows];
      await apiFetch("v1/customers", {
        method: "DELETE",
        body: { ids: selectedCustomerIds },
      });
      selectedCustomerIds.forEach((customerId) => onDeleted?.(customerId));
      setSelectedRows(new Set());
      setDeleteConfirmOpen(false);
    } catch (error) {
      toast.error(toApiError(error).message);
    } finally {
      setBulkActionPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs value={status} onValueChange={setStatus}>
          <TabsList aria-label="Filter customers by status">
            <TabsTrigger value="ACTIVE">Active</TabsTrigger>
            <TabsTrigger value="INACTIVE">Inactive</TabsTrigger>
          </TabsList>
        </Tabs>
        {status === "ACTIVE" ? (
          <div className="flex flex-wrap justify-end gap-2">
            {selectedRows.size > 0 ? (
              <>
                <Button
                  variant="outline"
                  onClick={() =>
                    updateSelectedStatus(status === "ACTIVE" ? "INACTIVE" : "ACTIVE")
                  }
                  disabled={bulkActionPending}
                >
                  {bulkActionPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  {status === "ACTIVE" ? "Archive" : "Activate"}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setDeleteConfirmOpen(true)}
                  disabled={bulkActionPending}
                >
                  Delete
                </Button>
              </>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (selectedRows.size === 0) {
                  toast.info("Select at least one customer to start a broadcast.");
                  return;
                }
                const invalidCustomers = rows.filter(
                  (customer) => selectedRows.has(customer.id) && !customer.wa_id,
                );
                if (invalidCustomers.length > 0) {
                  toast.error(
                    "Some selected customers have an invalid phone number. Please use View -> Edit to correct them.",
                  );
                  return;
                }
                sessionStorage.setItem(
                  "new-broadcast-customer-ids",
                  JSON.stringify([...selectedRows]),
                );
                router.push("/customers/new-broadcast");
              }}
            >
              New broadcast
            </Button>
          </div>
        ) : null}
      </div>
      <Card className="rounded-md py-0">
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Checkbox
                    checked={allFilteredRowsSelected}
                    onChange={(event) => toggleAllRows(event.target.checked)}
                    aria-label="Select all customers"
                  />
                </TableHead>
                <TableHead className="w-56">
                  <div className="relative">
                    <Search className="text-muted-foreground pointer-events-none absolute inset-y-0 left-0 my-auto box-content size-3.5 pl-1" />
                    <Input
                      value={nameInput}
                      onChange={(event) => setNameInput(event.target.value)}
                      placeholder="Search by name"
                      aria-label="Search customers by name"
                      className="h-7 border-none pr-6 pl-6 font-medium shadow-none focus-visible:ring-0"
                    />
                    {nameInput ? (
                      <button
                        type="button"
                        onClick={clearSearch}
                        aria-label="Clear name search"
                        className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex items-center pr-1"
                      >
                        <X className="size-3.5" />
                      </button>
                    ) : null}
                  </div>
                </TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>
                  <TableHeaderMultiSelect
                    label="Tags"
                    options={tagOptions}
                    selectedValues={selectedTags}
                    onSelectedValuesChange={setTagsFilter}
                    separatorAfter={NO_TAGS_OPTION}
                    emptyMessage={tagError ?? "No tags available."}
                  />
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.length === 0 ? (
                <TableEmptyState
                  colSpan={COLUMNS.length + 1}
                  action={
                    rows.length === 0 && selectedTags.size === 0 ? undefined : (
                      <Button size="sm" variant="outline" onClick={resetFilters}>
                        Reset filters
                      </Button>
                    )
                  }
                >
                  {rows.length === 0 && selectedTags.size === 0
                    ? "No customers yet."
                    : "No customers match these filters."}
                </TableEmptyState>
              ) : (
                filteredRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedRows.has(row.id)}
                        onChange={(event) => toggleRow(row.id, event.target.checked)}
                        aria-label={`Select ${row.display_name}`}
                      />
                    </TableCell>
                    <TableCell className="max-w-56 font-medium">
                      <p className="truncate">{row.display_name}</p>
                      {row.latest_message_content ? (
                        <p className="text-muted-foreground line-clamp-2 text-xs font-normal">
                          {row.latest_message_content}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span>{formatPhoneNumber(row.phone_number, row.country_code)}</span>
                        {!row.wa_id ? (
                          <Popover
                            open={invalidPhonePopoverId === row.id}
                            onOpenChange={(open) =>
                              setInvalidPhonePopoverId(open ? row.id : null)
                            }
                          >
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                onMouseEnter={() => setInvalidPhonePopoverId(row.id)}
                                onMouseLeave={() => setInvalidPhonePopoverId(null)}
                                aria-label="Invalid phone number"
                                title="Invalid phone number"
                              >
                                <Info className="text-muted-foreground" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-64 text-sm"
                              onMouseEnter={() => setInvalidPhonePopoverId(row.id)}
                              onMouseLeave={() => setInvalidPhonePopoverId(null)}
                            >
                              Invalid country code or phone number, please View -&gt; Edit
                            </PopoverContent>
                          </Popover>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>{row.tags?.join(", ")}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <CustomerDetailsButton
                          customer={row}
                          onDeleted={() => handleDeleted(row)}
                          onUpdated={onUpdated}
                        />
                        <Button size="sm" variant="outline" asChild>
                          <Link
                            href={`/customers/${row.id}/chat?return_to=${encodeURIComponent(
                              `${pathname}?${searchParams.toString()}`,
                            )}`}
                          >
                            Chat
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete selected customers?</DialogTitle>
            <DialogDescription>
              {selectedRows.size} customer{selectedRows.size === 1 ? "" : "s"} will be
              permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row items-center justify-between gap-3 sm:justify-between">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={bulkActionPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={deleteSelectedCustomers}
              disabled={bulkActionPending}
            >
              {bulkActionPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
