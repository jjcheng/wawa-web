"use client";

import { Filter, Info, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { User, UserStatus } from "@/lib/api/types";
import { formatPhoneNumber } from "@/lib/format";
import { AssignedPhoneNumbersButton } from "./assigned-phone-numbers-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function UsersTable({
  users,
  currentUserId,
  currentUserIsMaster,
}: {
  users: User[];
  currentUserId: number;
  currentUserIsMaster: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | UserStatus>("ALL");
  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) =>
      (statusFilter === "ALL" || user.status === statusFilter) &&
      (!query || [user.name, user.phone_number, user.email]
        .some((value) => value?.toLowerCase().includes(query))),
    );
  }, [search, statusFilter, users]);

  return (
    <div className="bg-card divide-border overflow-hidden divide-y rounded-lg border">
      <div className="flex items-center gap-2 px-4 py-2">
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden="true"
            className="text-muted-foreground pointer-events-none absolute inset-y-0 left-2 my-auto size-4"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search users"
            aria-label="Search users"
            className="h-8 border-none bg-transparent pr-7 pl-8 shadow-none focus-visible:ring-0"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-2 flex items-center"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="shrink-0 gap-1.5">
              <Filter className="size-3.5" />
              Filter
              {statusFilter !== "ALL" ? (
                <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">1</Badge>
              ) : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 space-y-3 p-3">
            <div className="space-y-1.5">
              <p className="text-muted-foreground text-xs font-medium">Status</p>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
                <SelectTrigger className="h-8 w-full" aria-label="Filter users by status">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                  <SelectItem value="PENDING_PASSWORD">Pending password</SelectItem>
                  <SelectItem value="PENDING_ASSIGNMENT">Pending assignment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      {filteredUsers.length === 0 ? (
        <div className="flex min-h-32 flex-col items-center justify-center gap-2 p-6 text-center">
          <p className="text-muted-foreground text-sm">
            {search || statusFilter !== "ALL" ? "No users match these filters." : "No users found."}
          </p>
          {search || statusFilter !== "ALL" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setSearch("");
                setStatusFilter("ALL");
              }}
            >
              Reset filters
            </Button>
          ) : null}
        </div>
      ) : (
        filteredUsers.map((user) => {
          const isMaster = user.type === "MASTER";
          const isCurrentUser = user.id === currentUserId;
          const shouldDisableEdit = isMaster || (isCurrentUser && currentUserIsMaster);
          const displayName = user.name || "Unnamed user";
          const initials = displayName.slice(0, 2).toUpperCase();

          return (
            <div
              key={user.id}
              className="hover:bg-accent/60 flex min-w-0 flex-wrap items-center gap-3 px-4 py-3 transition-colors sm:flex-nowrap"
            >
              <span className="bg-accent flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-medium">
                {initials}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <p className="truncate font-medium">{displayName}</p>
                  {isCurrentUser ? (
                    <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                      Myself
                    </span>
                  ) : null}
                  {user.type ? <Badge variant="outline">{user.type}</Badge> : null}
                </div>
                <div className="text-muted-foreground mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className="inline-flex min-w-0 items-center gap-1">
                    <span className="shrink-0">{formatPhoneNumber(user.phone_number, user.country_code) || "—"}</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" aria-label="About the login phone number">
                          <Info className="size-3.5 shrink-0" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" sideOffset={6}>
                        This is the phone number used to login, the same user can manage other WhatsApp phone numbers.
                      </TooltipContent>
                    </Tooltip>
                  </span>
                </div>
                <div className="mt-1 flex min-w-0 items-baseline gap-1 text-sm sm:hidden">
                  <span className="text-muted-foreground shrink-0 text-sm">Managing</span>
                  <AssignedPhoneNumbersButton phoneNumbers={user.assigned_phone_numbers ?? []} />
                </div>
              </div>
              <div className="hidden min-w-0 shrink-0 sm:flex sm:w-48 sm:flex-col sm:items-start sm:justify-center">
                <span className="text-muted-foreground shrink-0 text-sm sm:mb-0.5">Managing</span>
                <AssignedPhoneNumbersButton phoneNumbers={user.assigned_phone_numbers ?? []} />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="ml-auto shrink-0"
                disabled={shouldDisableEdit}
                onClick={() => {
                  if (!shouldDisableEdit) router.push(`/users/${user.id}`);
                }}
              >
                Edit
              </Button>
            </div>
          );
        })
      )}
    </div>
  );
}
