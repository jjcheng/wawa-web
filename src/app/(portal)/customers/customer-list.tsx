"use client";

import { Megaphone } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { TableEmptyState } from "@/components/table-empty-state";
import { TableHeaderMultiSelect } from "@/components/table-header-multi-select";
import { CustomerDetailsButton } from "@/components/customer-details-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import type { Customer } from "@/lib/api/types";
import { formatPhoneNumber } from "@/lib/format";

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
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [tags, setTags] = useState<string[]>([]);
  const [tagError, setTagError] = useState<string | null>(null);
  const tagOptions = [...new Set([...tags, ...newTags])].sort();
  const filteredRows =
    selectedTags.size === 0
      ? rows
      : rows.filter((row) => row.tags?.some((tag) => selectedTags.has(tag)));
  const allFilteredRowsSelected =
    filteredRows.length > 0 && filteredRows.every((row) => selectedRows.has(row.id));

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

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="overflow-x-auto">
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
                {COLUMNS.map((column) =>
                  column === "Tags" ? (
                    <TableHead key={column}>
                      <TableHeaderMultiSelect
                        label="Tags"
                        options={tagOptions}
                        selectedValues={selectedTags}
                        onSelectedValuesChange={setSelectedTags}
                        emptyMessage={tagError ?? "No tags available."}
                      />
                    </TableHead>
                  ) : (
                    <TableHead
                      key={column}
                      className={column === "Actions" ? "text-right" : undefined}
                    >
                      {column}
                    </TableHead>
                  ),
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.length === 0 ? (
                <TableEmptyState colSpan={COLUMNS.length + 1}>
                  {rows.length === 0 ? "No customers yet." : "No customers match these tags."}
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
                    <TableCell>{row.display_name}</TableCell>
                    <TableCell>
                      {formatPhoneNumber(row.phone_number, row.country_code)}
                    </TableCell>
                    <TableCell>{row.tags?.join(", ")}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <CustomerDetailsButton
                          customer={row}
                          onDeleted={() => handleDeleted(row)}
                        />
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/customers/${row.id}/chat`}>Chat</Link>
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
