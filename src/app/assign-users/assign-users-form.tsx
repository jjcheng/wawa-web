"use client";

import { useMutation } from "@tanstack/react-query";
import { Info, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
import type { User } from "@/lib/api/types";
import { formatPhoneNumber } from "@/lib/format";
import { toast } from "@/lib/toast";

export function AssignUsersForm({
  phoneNumberId,
  users,
  assignedUserIds,
}: {
  phoneNumberId: number;
  users: User[];
  assignedUserIds: number[];
}) {
  const router = useRouter();
  const [selectedUserIds, setSelectedUserIds] = useState(() => new Set(assignedUserIds));
  const originalAssignedUserIds = useState(() => new Set(assignedUserIds))[0];

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch("v1/admin/assign-users", {
        method: "POST",
        body: {
          phone_number_id: Number(phoneNumberId),
          user_ids: [...selectedUserIds].map(Number),
        },
      }),
    onSuccess: () => {
      toast.success("Users assigned.");
      router.push("/assets/phone-numbers");
      router.refresh();
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  function toggleUser(userId: number, checked: boolean) {
    setSelectedUserIds((current) => {
      const next = new Set(current);
      if (checked) next.add(userId);
      else next.delete(userId);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="max-h-[50vh] overflow-y-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Name</TableHead>
              <TableHead>
                <span className="flex items-center gap-1">
                  Phone
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" aria-label="About the login phone number">
                        <Info className="text-muted-foreground size-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={6}>
                      This is the phone number used to login, the same user can manage other WhatsApp phone numbers.
                    </TooltipContent>
                  </Tooltip>
                </span>
              </TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="w-24 text-right">Assigned</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableEmptyState colSpan={5}>No users found.</TableEmptyState>
            ) : (
              users.map((user) => {
                const isOriginallyAssigned = originalAssignedUserIds.has(user.id);
                const isSelected = selectedUserIds.has(user.id);

                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onChange={(event) => toggleUser(user.id, event.target.checked)}
                        aria-label={`Assign ${user.name || "user"}`}
                      />
                    </TableCell>
                    <TableCell>{user.name || "—"}</TableCell>
                    <TableCell>{formatPhoneNumber(user.phone_number, user.country_code) || "—"}</TableCell>
                    <TableCell>{user.email || "—"}</TableCell>
                    <TableCell className="text-right">
                      <span
                        className={isOriginallyAssigned ? "font-medium text-green-600" : "text-muted-foreground"}
                      >
                        {isOriginallyAssigned ? "Yes" : "No"}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" onClick={() => router.push("/assets/phone-numbers")} disabled={mutation.isPending}>
          Skip
        </Button>
        <Button onClick={() => mutation.mutate()} disabled={selectedUserIds.size === 0 || mutation.isPending}>
          {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Assign
        </Button>
      </div>
    </div>
  );
}