"use client";

import { useMutation } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { CountryCodeSelect } from "@/components/country-code-select";
import { CustomerInfo } from "@/components/customer-info";
import { CustomerTagsSelect } from "@/components/customer-tags-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ModalHeader } from "@/components/ui/modal-header";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import type { Customer } from "@/lib/api/types";
import { formatPhoneNumber } from "@/lib/format";

type AdditionalDataRow = {
  id: number;
  key: string;
  value: string;
};

export function CustomerDetailsButton({
  customer,
  onDeleted,
  onUpdated,
}: {
  customer: Customer;
  onDeleted?: () => void;
  onUpdated?: (customer: Customer) => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(customer.display_name);
  const [countryCode, setCountryCode] = useState(customer.country_code);
  const [phoneNumber, setPhoneNumber] = useState(customer.phone_number);
  const [tags, setTags] = useState(customer.tags ?? []);
  const [status, setStatus] = useState(customer.status || "ACTIVE");
  const [remarks, setRemarks] = useState(customer.remarks ?? "");
  const [additionalDataRows, setAdditionalDataRows] = useState<AdditionalDataRow[]>([]);
  const [saveErrors, setSaveErrors] = useState<{
    name?: string;
    countryCode?: string;
    phoneNumber?: string;
  }>({});

  function additionalDataRowsFromCustomer() {
    return Object.entries(customer.additional_data ?? {}).map(([key, value], index) => ({
      id: index,
      key,
      value: typeof value === "string" ? value : JSON.stringify(value),
    }));
  }

  function addAdditionalDataRow() {
    setAdditionalDataRows((current) => [
      ...current,
      { id: Date.now(), key: "", value: "" },
    ]);
  }

  function updateAdditionalDataRow(
    id: number,
    field: "key" | "value",
    value: string,
  ) {
    setAdditionalDataRows((current) =>
      current.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  }

  function removeAdditionalDataRow(id: number) {
    setAdditionalDataRows((current) => current.filter((row) => row.id !== id));
  }

  const updateMutation = useMutation({
    mutationFn: () =>
      apiFetch<Customer>(`v1/customers/${customer.id}`, {
        method: "PATCH",
        body: {
          display_name: displayName.trim(),
          country_code: countryCode.trim(),
          phone_number: phoneNumber.trim(),
          tags,
          status,
          remarks,
          additional_data: Object.fromEntries(
            additionalDataRows
              .map((row) => [row.key.trim(), row.value] as const)
              .filter(([key, value]) => key.length > 0 && value.trim().length > 0),
          ),
        },
      }),
    onSuccess: (updatedCustomer) => {
      onUpdated?.(updatedCustomer);
      setEditing(false);
      setOpen(false);
      toast.success("Customer details updated.");
    },
    onError: (error) => toast.error(toApiError(error).message),
  });
  const mutation = useMutation({
    mutationFn: () =>
      apiFetch("v1/customers", {
        method: "DELETE",
        body: { ids: [customer.id] },
      }),
    onSuccess: () => {
      setConfirmOpen(false);
      setOpen(false);
      onDeleted?.();
      toast.success("Customer deleted.");
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setEditing(false);
      setSaveErrors({});
      setDisplayName(customer.display_name);
      setCountryCode(customer.country_code);
      setPhoneNumber(customer.phone_number);
      setTags(customer.tags ?? []);
      setStatus(customer.status || "ACTIVE");
      setRemarks(customer.remarks ?? "");
      setAdditionalDataRows(additionalDataRowsFromCustomer());
    }
    setOpen(nextOpen);
  }

  function handleSave() {
    const errors: typeof saveErrors = {};
    if (!displayName.trim()) {
      errors.name = "Name is required.";
    }
    if (!countryCode.trim() || countryCode.trim() === ".") {
      errors.countryCode = "A valid country code is required.";
    }
    if (!phoneNumber.trim()) {
      errors.phoneNumber = "Phone number is required.";
    }
    if (Object.keys(errors).length > 0) {
      setSaveErrors(errors);
      return;
    }
    setSaveErrors({});
    updateMutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          View
        </Button>
      </DialogTrigger>
      <DialogContent
        className="flex max-h-[90vh] !w-[90vw] !max-w-[90vw] flex-col overflow-hidden sm:!w-[50vw] sm:!max-w-[50vw]"
        showCloseButton={false}
      >
        <ModalHeader
          title={editing ? "Edit customer" : customer.display_name}
          subtitle="Customer details"
        />
        <div className="min-h-0 flex-1 overflow-y-auto">
        {editing ? <div className="grid gap-3">
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Name</span>
            <input required value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="border-input h-9 rounded-md border bg-transparent px-3" />
            {saveErrors.name ? <p className="text-destructive text-sm">{saveErrors.name}</p> : null}
          </label>
          {customer.country_code === "." ? (
            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">Country code</span>
                <CountryCodeSelect
                  name="customer-country-code"
                  value={countryCode}
                  onValueChange={setCountryCode}
                  className="w-24"
                />
                {saveErrors.countryCode ? <p className="text-destructive text-sm">{saveErrors.countryCode}</p> : null}
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">Phone number</span>
                <input
                  required
                  maxLength={13}
                  inputMode="numeric"
                  value={phoneNumber}
                  onKeyDown={(event) => {
                    if (event.metaKey || event.ctrlKey || event.altKey || event.key.length !== 1) return;
                    if (!/\d/.test(event.key)) event.preventDefault();
                  }}
                  onChange={(event) => setPhoneNumber(event.target.value.replace(/\D/g, ""))}
                  className="border-input h-9 rounded-md border bg-transparent px-3"
                />
                {saveErrors.phoneNumber ? <p className="text-destructive text-sm">{saveErrors.phoneNumber}</p> : null}
              </label>
            </div>
          ) : (
            <p className="text-sm">Phone: {formatPhoneNumber(customer.phone_number, customer.country_code)}</p>
          )}
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Tags</span>
            <CustomerTagsSelect value={tags} onChange={setTags} />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Status</span>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full" aria-label="Customer status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                <SelectItem value="INACTIVE">INACTIVE</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Remarks</span>
            <Textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} rows={4} />
          </label>
          <div className="grid gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Additional data</span>
              <Button type="button" variant="outline" size="sm" onClick={addAdditionalDataRow}>
                <Plus className="size-4" />
                Add field
              </Button>
            </div>
            {additionalDataRows.length > 0 ? (
              <div className="grid gap-2">
                {additionalDataRows.map((row) => (
                  <div key={row.id} className="flex items-center gap-2">
                    <input
                      value={row.key}
                      onChange={(event) => updateAdditionalDataRow(row.id, "key", event.target.value)}
                      placeholder="Key"
                      aria-label="Additional data key"
                      className="border-input h-9 min-w-0 flex-1 rounded-md border bg-transparent px-3"
                    />
                    <input
                      value={row.value}
                      onChange={(event) => updateAdditionalDataRow(row.id, "value", event.target.value)}
                      placeholder="Value"
                      aria-label="Additional data value"
                      className="border-input h-9 min-w-0 flex-1 rounded-md border bg-transparent px-3"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeAdditionalDataRow(row.id)}
                      aria-label={`Remove ${row.key || "additional data"}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No additional data.</p>
            )}
          </div>
        </div> : <CustomerInfo customer={customer} />}
        </div>
        <DialogFooter className="shrink-0">
          {editing ? (
            <>
              <Button onClick={handleSave} disabled={updateMutation.isPending}>Save</Button>
            </>
          ) : <Button variant="outline" onClick={() => { setSaveErrors({}); setEditing(true); }}>Edit</Button>}
          <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this customer?</DialogTitle>
            <DialogDescription>
              {customer.display_name} will be permanently removed from your customers.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
