"use client";

import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "@/lib/toast";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TableEmptyState } from "@/components/table-empty-state";
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
import type { PhoneNumber, User } from "@/lib/api/types";
import { formatPhoneNumber } from "@/lib/format";

function AssignPhoneNumberButton({
  phoneNumberId,
  phoneNumberLabel,
  users,
}: {
  phoneNumberId: number;
  phoneNumberLabel: string;
  users: User[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());
  const allSelected = users.length > 0 && users.every((user) => selectedUserIds.has(user.id));

  function toggleAllUsers(checked: boolean) {
    setSelectedUserIds(checked ? new Set(users.map((user) => user.id)) : new Set());
  }

  function toggleUser(userId: number, checked: boolean) {
    setSelectedUserIds((current) => {
      const next = new Set(current);
      if (checked) next.add(userId);
      else next.delete(userId);
      return next;
    });
  }

  const mutation = useMutation({
    mutationFn: () =>
      Promise.all(
        [...selectedUserIds].map((userId) =>
          apiFetch("v1/admin/assign-phone-numbers", {
            method: "POST",
            body: { user_id: userId, phone_number_ids: [phoneNumberId] },
          }),
        ),
      ),
    onSuccess: () => {
      setOpen(false);
      toast.success(`${phoneNumberLabel} assigned.`);
      router.push("/chats");
      router.refresh();
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!mutation.isPending) {
          setOpen(nextOpen);
          if (!nextOpen) setSelectedUserIds(new Set());
        }
      }}
    >
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Assign
      </Button>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign {phoneNumberLabel}</DialogTitle>
          <DialogDescription>Select the user(s) to assign this phone number to.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[50vh] overflow-y-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected}
                    onChange={(event) => toggleAllUsers(event.target.checked)}
                    aria-label="Select all users"
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableEmptyState colSpan={4}>No users found.</TableEmptyState>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedUserIds.has(user.id)}
                        onChange={(event) => toggleUser(user.id, event.target.checked)}
                        aria-label={`Select ${user.name || "user"}`}
                      />
                    </TableCell>
                    <TableCell>{user.name || "—"}</TableCell>
                    <TableCell>{formatPhoneNumber(user.phone_number, user.country_code)}</TableCell>
                    <TableCell>{user.email || "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <DialogFooter>
          <Button
            onClick={() => mutation.mutate()}
            disabled={selectedUserIds.size === 0 || mutation.isPending}
          >
            {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AssignPhoneNumbersTable({
  phoneNumbers,
  users,
}: {
  phoneNumbers: PhoneNumber[];
  users: User[];
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Number</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {phoneNumbers.length === 0 ? (
          <TableEmptyState colSpan={3}>No unassigned phone numbers.</TableEmptyState>
        ) : (
          phoneNumbers.map((phoneNumber) => {
            const label =
              formatPhoneNumber(phoneNumber.display_phone_number || phoneNumber.phone_number) ||
              phoneNumber.name ||
              "This number";
            return (
              <TableRow key={phoneNumber.id}>
                <TableCell>{phoneNumber.name || "Unnamed number"}</TableCell>
                <TableCell>
                  {formatPhoneNumber(phoneNumber.display_phone_number || phoneNumber.phone_number)}
                </TableCell>
                <TableCell className="text-right">
                  <AssignPhoneNumberButton
                    phoneNumberId={Number(phoneNumber.id)}
                    phoneNumberLabel={label}
                    users={users}
                  />
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}
