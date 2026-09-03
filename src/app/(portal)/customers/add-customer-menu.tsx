"use client";

import { ChevronDown } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { CountryCodeSelect } from "@/components/country-code-select";
import { CustomerTagsSelect } from "@/components/customer-tags-select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import type { Customer } from "@/lib/api/types";
import { MEDIUM_BUTTON_HEIGHT } from "@/lib/utils";

export function AddCustomerMenu({ onCreated }: { onCreated?: (customer: Customer) => void }) {
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<Customer>("v1/customers", {
        method: "POST",
        body: {
          display_name: displayName.trim(),
          country_code: countryCode.trim(),
          phone_number: phoneNumber.trim(),
          tags,
        },
      }),
    onSuccess: (customer) => {
      onCreated?.(customer);
      setOpen(false);
      setDisplayName("");
      setCountryCode("");
      setPhoneNumber("");
      setTags([]);
      toast.success("Customer created.");
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className={MEDIUM_BUTTON_HEIGHT}>
            Add Customer
            <ChevronDown className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setOpen(true)}>Create customer</DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => toast.info("Importing customers isn't available yet.")}
          >
            Import customers
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => !mutation.isPending && setOpen(nextOpen)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add customer</DialogTitle>
            <DialogDescription>Add a customer to your account.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="customer-name">Name</Label>
              <Input
                id="customer-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="customer-country-code">Country code</Label>
                <CountryCodeSelect
                  name="customer-country-code"
                  value={countryCode}
                  onValueChange={setCountryCode}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-phone">Phone number</Label>
                <Input
                  id="customer-phone"
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-tags">Tags</Label>
              <CustomerTagsSelect
                value={tags}
                onChange={setTags}
                disabled={mutation.isPending}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={
                !displayName.trim() ||
                !countryCode.trim() ||
                !phoneNumber.trim() ||
                mutation.isPending
              }
            >
              {mutation.isPending ? "Adding..." : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
