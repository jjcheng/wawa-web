"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/page-header";
import { RelativeTime } from "@/components/relative-time";
import type { Customer } from "@/lib/api/types";
import { ChatsSearchButton } from "./chats-search-button";
import { ChatsTagFilter } from "./chats-tag-filter";

function initials(customer: Customer) {
  return (customer.display_name || "?").slice(0, 2).toUpperCase();
}

export function ChatsView({
  customers,
  tags,
  name,
  tag,
}: {
  customers: Customer[];
  tags: string[];
  name: string;
  tag: string;
}) {
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  function toggleSelecting() {
    setSelecting((current) => !current);
    setSelectedIds(new Set());
  }

  function toggleRow(id: number) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <>
      <PageHeader
        title="Chats"
        action={
          <Button type="button" variant="ghost" size="sm" onClick={toggleSelecting}>
            {selecting ? "Done" : "Select"}
          </Button>
        }
      />
      <div className="mb-2 flex items-center gap-2">
        <ChatsTagFilter tags={tags} activeTag={tag} />
        <ChatsSearchButton initialName={name} />
      </div>
      {customers.length === 0 ? (
        <div className="flex min-h-32 flex-col items-center justify-center gap-2 text-center">
          <MessageCircle className="text-muted-foreground size-8" />
          <p className="text-muted-foreground text-sm">No customers found.</p>
        </div>
      ) : (
        <div className="bg-card divide-border overflow-hidden divide-y rounded-2xl border">
          {customers.map((customer) => {
            const content = (
              <>
                {selecting ? (
                  <Checkbox
                    checked={selectedIds.has(customer.id)}
                    onChange={() => toggleRow(customer.id)}
                    aria-label={`Select ${customer.display_name}`}
                  />
                ) : null}
                <Avatar className="size-10 shrink-0">
                  <AvatarFallback>{initials(customer)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{customer.display_name}</p>
                  {customer.latest_message_content ? (
                    <p className="text-muted-foreground line-clamp-2 text-sm">
                      {customer.latest_message_content}
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-sm">No message</p>
                  )}
                </div>
                {customer.last_updated_at ? (
                  <span className="text-muted-foreground shrink-0 text-xs">
                    <RelativeTime value={customer.last_updated_at} />
                  </span>
                ) : null}
              </>
            );

            if (selecting) {
              return (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => toggleRow(customer.id)}
                  className="hover:bg-accent/60 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
                >
                  {content}
                </button>
              );
            }

            return (
              <Link
                key={customer.id}
                href={`/customers/${customer.id}/chat?return_to=%2Fchats`}
                className="hover:bg-accent/60 flex items-center gap-3 px-4 py-3 transition-colors"
              >
                {content}
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
