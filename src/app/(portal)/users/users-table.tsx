"use client";

import { Info } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { User } from "@/lib/api/types";
import { formatPhoneNumber } from "@/lib/format";
import { AssignedPhoneNumbersButton } from "./assigned-phone-numbers-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableEmptyState } from "@/components/table-empty-state";

function UserRow({
  user,
  currentUserId,
  currentUserIsMaster,
}: {
  user: User;
  currentUserId: number;
  currentUserIsMaster: boolean;
}) {
  const router = useRouter();
  const isMaster = user.type === "MASTER";
  const isCurrentUser = user.id === currentUserId;
  const shouldDisableEdit = isMaster || (isCurrentUser && currentUserIsMaster);

  return (
    <TableRow>
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          <span>{user.name || "—"}</span>
          {isCurrentUser ? (
            <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              Myself
            </span>
          ) : null}
        </div>
      </TableCell>
      <TableCell>{formatPhoneNumber(user.phone_number, user.country_code) || "—"}</TableCell>
      <TableCell>{user.email || "—"}</TableCell>
      <TableCell>{user.type || "—"}</TableCell>
      <TableCell>{user.status || "—"}</TableCell>
      <TableCell className="w-[220px] max-w-[220px] align-top">
        <AssignedPhoneNumbersButton phoneNumbers={user.assigned_phone_numbers ?? []} />
      </TableCell>
      <TableCell className="text-right">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={shouldDisableEdit}
          onClick={() => {
            if (!shouldDisableEdit) router.push(`/users/${user.id}`);
          }}
        >
          Edit
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function UsersTable({
  users,
  currentUserId,
  currentUserIsMaster,
}: {
  users: User[];
  currentUserId: number;
  currentUserIsMaster: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
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
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Assigned to</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.length === 0 ? (
          <TableEmptyState colSpan={7}>No users found.</TableEmptyState>
        ) : (
          users.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              currentUserId={currentUserId}
              currentUserIsMaster={currentUserIsMaster}
            />
          ))
        )}
      </TableBody>
    </Table>
  );
}
