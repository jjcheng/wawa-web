"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { User } from "@/lib/api/types";

export function AssignedUsersButton({ users }: { users: User[] }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="link"
          size="sm"
          className="h-auto cursor-pointer px-0 font-semibold text-primary underline underline-offset-2"
          aria-label={`View ${users.length} assigned user${users.length === 1 ? "" : "s"}`}
          disabled={users.length === 0}
        >
          {users.length}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assigned users</DialogTitle>
          <DialogDescription>Users who can manage this WhatsApp phone number.</DialogDescription>
        </DialogHeader>
        <ul className="list-disc space-y-1 pl-5">
          {users.map((user) => (
            <li key={user.id}>{user.name || "Unnamed user"}</li>
          ))}
        </ul>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}