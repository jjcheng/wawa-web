"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import type { User, UserStatus, UserType } from "@/lib/api/types";
import { formatPhoneNumber } from "@/lib/format";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableEmptyState } from "@/components/table-empty-state";

const USER_TYPES: UserType[] = ["OPERATOR", "MASTER"];
const USER_STATUSES: UserStatus[] = ["ACTIVE", "INACTIVE"];
type PendingChange = {
  field: "type" | "status";
  value: UserType | UserStatus;
};
type UserUpdateErrors = {
  type?: string;
  status?: string;
};

function UserRow({ user, currentUserId }: { user: User; currentUserId: number }) {
  const [type, setType] = useState<UserType | undefined>(user.type);
  const [status, setStatus] = useState<UserStatus | undefined>(user.status);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState<"type" | "status" | null>(null);
  const [errors, setErrors] = useState<UserUpdateErrors>({});
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);

  function updateType(nextType: string) {
    const previousType = type;
    if (!USER_TYPES.includes(nextType as UserType) || nextType === previousType) return;
    setPendingChange({ field: "type", value: nextType as UserType });
  }

  function updateStatus(nextStatus: string) {
    const previousStatus = status;
    if (!USER_STATUSES.includes(nextStatus as UserStatus) || nextStatus === previousStatus) return;
    setPendingChange({ field: "status", value: nextStatus as UserStatus });
  }

  async function confirmChange() {
    if (!pendingChange) return;
    setSaving(pendingChange.field);
    setErrors((current) => ({ ...current, [pendingChange.field]: undefined }));
    try {
      await apiFetch(
        pendingChange.field === "type" ? "v1/admin/user-type" : "v1/admin/user-status",
        {
          method: "PATCH",
          body: { id: user.id, [pendingChange.field]: pendingChange.value },
        },
      );
      if (pendingChange.field === "type") setType(pendingChange.value as UserType);
      else setStatus(pendingChange.value as UserStatus);
      setPendingChange(null);
    } catch (requestError) {
      setErrors((current) => ({
        ...current,
        [pendingChange.field]: toApiError(requestError).message,
      }));
    } finally {
      setSaving(null);
    }
  }

  const isMaster = user.type === "MASTER";
  const isCurrentUser = user.id === currentUserId;

  return (
    <>
      <TableRow>
      <TableCell className="font-medium">{user.name || "—"}</TableCell>
      <TableCell>{formatPhoneNumber(user.phone_number, user.country_code) || "—"}</TableCell>
      <TableCell>{user.email || "—"}</TableCell>
      <TableCell>
        {editing ? (
          <Select value={type} onValueChange={updateType} disabled={saving !== null}>
            <SelectTrigger className="w-32" aria-label={`Type for ${user.name || "user"}`}>
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              {USER_TYPES.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          type || "—"
        )}
        {errors.type ? <p className="mt-1 text-xs text-destructive">{errors.type}</p> : null}
      </TableCell>
      <TableCell>
        {editing ? (
          <Select value={status} onValueChange={updateStatus} disabled={saving !== null}>
            <SelectTrigger className="w-32" aria-label={`Status for ${user.name || "user"}`}>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {USER_STATUSES.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          status || "—"
        )}
        {errors.status ? <p className="mt-1 text-xs text-destructive">{errors.status}</p> : null}
      </TableCell>
      <TableCell className="text-right">
        {isCurrentUser ? (
          "Myself"
        ) : !isMaster ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setEditing((current) => !current)}
            disabled={saving !== null}
          >
            {editing ? "Done" : "Edit"}
          </Button>
        ) : null}
      </TableCell>
      </TableRow>
      <Dialog
        open={pendingChange !== null}
        onOpenChange={(open) => {
          if (!open && !saving) setPendingChange(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm user update</DialogTitle>
            <DialogDescription>
              Change {pendingChange?.field} for {user.name || "this user"} to{" "}
              <strong className="text-foreground">{pendingChange?.value}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingChange(null)}
              disabled={saving !== null}
            >
              Cancel
            </Button>
            <Button type="button" onClick={() => void confirmChange()} disabled={saving !== null}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function UsersTable({
  users,
  currentUserId,
}: {
  users: User[];
  currentUserId: number;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.length === 0 ? (
          <TableEmptyState colSpan={6}>No users found.</TableEmptyState>
        ) : (
          users.map((user) => (
            <UserRow key={user.id} user={user} currentUserId={currentUserId} />
          ))
        )}
      </TableBody>
    </Table>
  );
}
