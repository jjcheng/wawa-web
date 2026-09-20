"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "@/lib/toast";

import { LoadMoreButton } from "@/components/load-more-button";
import { PageHeader } from "@/components/page-header";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import { AddCustomerMenu } from "./add-customer-menu";
import { CustomerList } from "./customer-list";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Customer, CustomerListResponse } from "@/lib/api/types";

const PAGE_SIZES = ["10", "25", "50", "100", "500"];

export function CustomersShell({
  initialRows,
  initialNumberOfPages,
  name,
  pageSize,
  tags,
  status,
}: {
  initialRows: Customer[];
  initialNumberOfPages: number;
  name: string;
  pageSize: string;
  tags: string[];
  status: "ACTIVE" | "INACTIVE";
}) {
  const [rows, setRows] = useState(initialRows);
  const [newTags, setNewTags] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [numberOfPages, setNumberOfPages] = useState(initialNumberOfPages);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    queueMicrotask(() => {
      setRows(initialRows);
      setCurrentPage(1);
      setNumberOfPages(initialNumberOfPages);
    });
  }, [initialRows, initialNumberOfPages]);

  async function loadMore() {
    if (isLoadingMore || currentPage >= numberOfPages) return;
    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const result = await apiFetch<CustomerListResponse>("v1/customers", {
        query: { page: String(nextPage), page_size: pageSize, status, name, tags },
      });
      setRows((currentRows) => [...currentRows, ...result.items]);
      setCurrentPage(nextPage);
      setNumberOfPages(result.number_of_pages ?? numberOfPages);
    } catch (error) {
      toast.error(toApiError(error).message);
    } finally {
      setIsLoadingMore(false);
    }
  }

  function setPageSize(value: string) {
    const params = new URLSearchParams(searchParams);
    params.set("page_size", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <>
      <PageHeader
        title="Customers"
        description="You can only see your own customers. Select at least one to start a broadcast."
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
        name={name}
        initialTags={tags}
        status={status}
        newTags={newTags}
        onUpdated={(customer) => {
          setRows((currentRows) =>
            currentRows.map((row) => (row.id === customer.id ? customer : row)),
          );
        }}
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
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Customers per page</span>
          <Select value={pageSize} onValueChange={setPageSize}>
            <SelectTrigger className="w-20" aria-label="Customers per page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((size) => (
                <SelectItem key={size} value={size}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {currentPage < numberOfPages ? (
          <LoadMoreButton loading={isLoadingMore} onClick={loadMore} withTopMargin={false} />
        ) : null}
      </div>
    </>
  );
}
