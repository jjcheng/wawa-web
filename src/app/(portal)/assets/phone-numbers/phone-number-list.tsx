"use client";

import { Circle, Filter, Phone, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { PhoneNumber } from "@/lib/api/types";
import { formatPhoneNumber } from "@/lib/format";
import { AssignedUsersSummary } from "./assigned-users-button";
import { PhoneNumberStatusFilter } from "./phone-number-status-filter";
import { PhoneNumberViewButton } from "./phone-number-view-button";

export function PhoneNumberList({
  phoneNumbers,
  status,
  isMaster,
}: {
  phoneNumbers: PhoneNumber[];
  status: string;
  isMaster: boolean;
}) {
  const [search, setSearch] = useState("");
  const filteredPhoneNumbers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return phoneNumbers;
    return phoneNumbers.filter((number) => {
      const displayNumber = formatPhoneNumber(number.display_phone_number || number.phone_number);
      return [number.name, number.display_phone_number, number.phone_number, displayNumber]
        .some((value) => value?.toLowerCase().includes(query));
    });
  }, [phoneNumbers, search]);

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
            placeholder="Search phone numbers"
            aria-label="Search phone numbers"
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
              {status !== "ALL" ? (
                <span className="bg-secondary text-secondary-foreground inline-flex size-4 items-center justify-center rounded-full text-[10px]">1</span>
              ) : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 space-y-2 p-3">
            <p className="text-muted-foreground text-xs font-medium">Status</p>
            <PhoneNumberStatusFilter value={status} popoverStyle />
          </PopoverContent>
        </Popover>
      </div>
      {filteredPhoneNumbers.length === 0 ? (
        <div className="flex min-h-32 flex-col items-center justify-center gap-2 p-6 text-center">
          <p className="text-muted-foreground text-base">
            {search
              ? "No phone numbers found."
              : status !== "ALL"
                ? "No phone numbers found."
                : "No phone numbers found."}
          </p>
          {search ? (
            <Button type="button" size="sm" variant="outline" onClick={() => setSearch("")}>
              Reset filter
            </Button>
          ) : status !== "ALL" ? (
            <Button asChild size="sm" variant="outline">
              <Link href="/assets/phone-numbers">Reset filters</Link>
            </Button>
          ) : null}
        </div>
      ) : (
        filteredPhoneNumbers.map((number) => {
          const connected = number.status?.toUpperCase() === "CONNECTED";
          const displayStatus = number.status
            ? number.status.charAt(0) + number.status.slice(1).toLowerCase()
            : "Unknown status";

          return (
            <PhoneNumberViewButton
              key={number.id}
              id={number.id}
              name={number.name || "This number"}
              status={number.status}
              addedAt={number.added_at}
              isMaster={isMaster}
              trigger={
                <div className="hover:bg-accent/60 flex min-w-0 cursor-pointer items-center gap-3 px-4 py-3 transition-colors">
                  <span className="bg-accent text-muted-foreground relative flex size-10 shrink-0 items-center justify-center rounded-full">
                    <Phone className="size-4" />
                    <span aria-label={displayStatus} title={displayStatus} className="absolute -top-0.5 -left-0.5">
                      <Circle
                        aria-hidden="true"
                        className={`size-2.5 fill-current stroke-card stroke-2 ${connected ? "text-green-600" : "text-muted-foreground"}`}
                      />
                    </span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium leading-5 mb-1">{number.name || "Unnamed number"}</p>
                    <p className="text-muted-foreground truncate text-sm">
                      {formatPhoneNumber(number.display_phone_number || number.phone_number) || "Number unavailable"}
                    </p>
                    {isMaster ? (
                      <div className="mt-1 flex items-baseline gap-1 text-sm md:hidden">
                        <span className="text-muted-foreground">Assigned to</span>
                        <AssignedUsersSummary phoneNumber={number} />
                      </div>
                    ) : null}
                  </div>
                  {isMaster ? (
                    <div className="ml-auto hidden w-48 shrink-0 self-stretch text-right md:flex md:flex-col md:justify-center">
                      <span className="text-muted-foreground mb-0.5 block text-sm">Assigned to</span>
                      <AssignedUsersSummary phoneNumber={number} />
                    </div>
                  ) : null}
                </div>
              }
            />
          );
        })
      )}
    </div>
  );
}