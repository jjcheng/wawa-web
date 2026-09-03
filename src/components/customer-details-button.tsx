"use client";

import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import type { Customer } from "@/lib/api/types";
import { formatPhoneNumber } from "@/lib/format";

export function CustomerDetailsButton({
  customer,
  onDeleted,
}: {
  customer: Customer;
  onDeleted?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const mutation = useMutation({
    mutationFn: () =>
      apiFetch(`v1/customers/${customer.id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      setConfirmOpen(false);
      setOpen(false);
      onDeleted?.();
      toast.success("Customer deleted.");
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          View
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{customer.display_name}</DialogTitle>
          <DialogDescription>Customer details</DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Phone</dt>
          <dd>{formatPhoneNumber(customer.phone_number, customer.country_code)}</dd>
          <dt className="text-muted-foreground">Tags</dt>
          <dd>{customer.tags?.join(", ") || "—"}</dd>
          <dt className="text-muted-foreground">BSUID</dt>
          <dd className="break-all">{customer.bsuid || "—"}</dd>
        </dl>
        <DialogFooter>
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
