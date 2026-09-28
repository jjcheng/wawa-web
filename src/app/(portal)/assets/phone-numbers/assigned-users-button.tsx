"use client";

import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import type { PhoneNumber, User } from "@/lib/api/types";
import { formatPhoneNumber } from "@/lib/format";
import { toast } from "@/lib/toast";

function userDisplayName(user: User) {
  return user.name || user.phone_number || "Unnamed user";
}

export function AssignedUsersSummary({
  phoneNumber,
  variant = "text",
}: {
  phoneNumber: PhoneNumber;
  variant?: "text" | "manage";
}) {
  const router = useRouter();
  const users = phoneNumber.assigned_users ?? [];
  const [dialogOpen, setDialogOpen] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(
    () => new Set(users.map((user) => Number(user.id))),
  );

  useEffect(() => {
    if (!dialogOpen) return;
    const controller = new AbortController();
    let active = true;

    async function loadUsers() {
      try {
        const response = await apiFetch<User[]>("v1/admin/users", {
          signal: controller.signal,
        });
        if (active) setAvailableUsers(Array.isArray(response) ? response : []);
      } catch (error) {
        if (active) setUsersError(toApiError(error).message);
      } finally {
        if (active) setUsersLoading(false);
      }
    }

    void loadUsers();
    return () => {
      active = false;
      controller.abort();
    };
  }, [dialogOpen]);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiFetch("v1/admin/assign-users", {
        method: "POST",
        body: {
          phone_number_id: Number(phoneNumber.id),
          user_ids: [...selectedUserIds],
        },
      }),
    onSuccess: () => {
      setDialogOpen(false);
      toast.success("Users assigned.");
      router.refresh();
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  const firstUserName = users[0] ? userDisplayName(users[0]) : "";
  const additionalUsers = users.length - 1;
  const assignedNames = users.length === 0
    ? "0 users"
    : `${firstUserName}${additionalUsers > 0 ? ` and ${additionalUsers} more` : ""}`;

  function openManageDialog() {
    setSelectedUserIds(new Set(users.map((user) => Number(user.id))));
    setUsersLoading(true);
    setUsersError(null);
    setDialogOpen(true);
  }

  function toggleUser(userId: number, checked: boolean) {
    setSelectedUserIds((current) => {
      const next = new Set(current);
      if (checked) next.add(userId);
      else next.delete(userId);
      return next;
    });
  }

  return (
    <>
      {variant === "text" ? (
        <div className="min-w-0 max-w-[190px] text-sm md:w-full md:max-w-full">
          <span className="block min-w-0 max-w-full truncate md:text-right">{assignedNames}</span>
        </div>
      ) : (
        <Button type="button" size="sm" variant="outline" className="mt-2" onClick={openManageDialog}>
          Manage
        </Button>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign WhatsApp number to users</DialogTitle>
            <DialogDescription>
              {formatPhoneNumber(phoneNumber.display_phone_number || phoneNumber.phone_number) || "—"}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] min-h-0 !overflow-y-auto">
            {usersLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : usersError ? (
              <p className="text-destructive p-3 text-sm">{usersError}</p>
            ) : availableUsers.length === 0 ? (
              <p className="text-muted-foreground p-3 text-sm">No users are available.</p>
            ) : (
              <ul className="divide-y">
                {availableUsers.map((user) => {
                  const label = user.name || "Unnamed user";

                  return (
                    <li key={user.id}>
                      <label className="flex cursor-pointer items-center gap-3 py-1.5">
                        <Checkbox
                          checked={selectedUserIds.has(user.id)}
                          onChange={(event) => toggleUser(user.id, event.target.checked)}
                          aria-label={`Assign ${label}`}
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{label}</span>
                          <span className="text-muted-foreground block text-xs">
                            {formatPhoneNumber(user.phone_number, user.country_code) || "—"}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={usersLoading || Boolean(usersError) || selectedUserIds.size === 0 || saveMutation.isPending}
            >
              {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}