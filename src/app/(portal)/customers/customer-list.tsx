"use client";

import { Megaphone } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { TableEmptyState } from "@/components/table-empty-state";
import { CustomerDetailsButton } from "@/components/customer-details-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import type { Customer } from "@/lib/api/types";
import { formatPhoneNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const COLUMNS = ["Name", "Phone", "Tags", "Actions"];

export function CustomerList({
  rows,
  newTags = [],
  onDeleted,
}: {
  rows: Customer[];
  newTags?: string[];
  onDeleted?: (customerId: number) => void;
}) {
  const [tags, setTags] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState("All");
  const [tagError, setTagError] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  useEffect(() => {
    apiFetch<string[]>("v1/customers/tags")
      .then((result) => setTags(Array.isArray(result) ? result : []))
      .catch((error) => setTagError(toApiError(error).message));
  }, []);

  const tagOptions = ["All", ...new Set([...tags, ...newTags])];
  const filteredRows =
    selectedTag === "All"
      ? rows
      : rows.filter((row) => (row.tags ?? []).includes(selectedTag));
  const allFilteredRowsSelected =
    filteredRows.length > 0 && filteredRows.every((row) => selectedRows.has(row.id));

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

  function handleDeleted(customer: Customer) {
    const remainingRows = rows.filter((row) => row.id !== customer.id);
    if (
      customer.tags?.includes(selectedTag) &&
      !remainingRows.some((row) => row.tags?.includes(selectedTag)) &&
      !newTags.includes(selectedTag)
    ) {
      setSelectedTag("All");
    }
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

  return (
    <div className="space-y-4">
      {rows.length > 0 ? (
        <>
          <div className="flex flex-wrap gap-2">
            {tagOptions.map((tag) => (
              <Button
                key={tag}
                size="sm"
                variant={selectedTag === tag ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedTag(tag)}
              >
                {tag}
              </Button>
            ))}
          </div>
          {tagError ? <p className="text-destructive text-sm">{tagError}</p> : null}
        </>
      ) : null}

      <Card>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-left">
                <th className="px-2 py-2 font-medium">
                  <Checkbox
                    checked={allFilteredRowsSelected}
                    onChange={(event) => toggleAllRows(event.target.checked)}
                    aria-label="Select all customers"
                  />
                </th>
                {COLUMNS.map((column) => (
                  <th
                    key={column}
                    className={cn(
                      "px-2 py-2 font-medium",
                      column === "Actions" && "text-right",
                    )}
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <TableEmptyState colSpan={COLUMNS.length + 1}>
                  {rows.length === 0 ? "No customers yet." : "No customers match this tag."}
                </TableEmptyState>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="px-2 py-2">
                      <Checkbox
                        checked={selectedRows.has(row.id)}
                        onChange={(event) => toggleRow(row.id, event.target.checked)}
                        aria-label={`Select ${row.display_name}`}
                      />
                    </td>
                    <td className="px-2 py-2">{row.display_name}</td>
                    <td className="px-2 py-2">
                      {formatPhoneNumber(row.phone_number, row.country_code)}
                    </td>
                    <td className="px-2 py-2">{row.tags?.join(", ")}</td>
                    <td className="px-2 py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <CustomerDetailsButton
                          customer={row}
                          onDeleted={() => handleDeleted(row)}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toast.info("Customer chat is not available yet.")}
                        >
                          Chat
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
      {selectedRows.size > 0 ? (
        <div className="flex justify-end">
          <Button asChild>
            <Link href={`/customers/new-campaign?customer_ids=${[...selectedRows].join(",")}`}>
              <Megaphone className="size-4" />
              New Campaign
            </Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
