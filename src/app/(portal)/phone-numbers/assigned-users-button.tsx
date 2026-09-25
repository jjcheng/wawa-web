"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { User } from "@/lib/api/types";

function userDisplayName(user: User) {
  return user.name || user.phone_number || "Unnamed user";
}

export function AssignedUsersButton({ users }: { users: User[] }) {
  if (users.length === 0) return <span className="text-muted-foreground">—</span>;

  const visibleUsers = users.slice(0, 5);
  const additionalCount = users.length - visibleUsers.length;
  const compactText = [
    ...visibleUsers.map((user) => userDisplayName(user)),
    ...(additionalCount > 0 ? [`and ${additionalCount} more`] : []),
  ].join(", ");

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="block max-w-[190px] cursor-pointer text-left text-sm text-primary underline underline-offset-2 decoration-from-font"
          aria-label={`View assigned users: ${users.map(userDisplayName).join(", ")}`}
        >
          {compactText}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3">
        <div className="space-y-2">
          <p className="text-sm font-medium">Assigned users</p>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {users.map((user) => (
              <li key={user.id}>{userDisplayName(user)}</li>
            ))}
          </ul>
        </div>
      </PopoverContent>
    </Popover>
  );
}