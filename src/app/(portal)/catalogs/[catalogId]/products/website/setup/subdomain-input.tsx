"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";

const MAX_SUBDOMAIN_LENGTH = 60;

function normalizeSubdomain(value: string) {
  return value.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, "");
}

export function SubdomainInput({ domain }: { domain: string }) {
  const [value, setValue] = useState("");

  return (
    <div className="space-y-1">
      <div className="flex w-full">
        <div className="relative min-w-0 flex-1">
          <Input
            id="website-subdomain"
            name="subdomain"
            value={value}
            onChange={(event) => setValue(normalizeSubdomain(event.target.value))}
            placeholder="my-store"
            required
            maxLength={MAX_SUBDOMAIN_LENGTH}
            aria-label="Subdomain prefix"
            className="min-w-0 rounded-r-none pr-12"
          />
          <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">
            {value.length}/{MAX_SUBDOMAIN_LENGTH}
          </span>
        </div>
        <div
          aria-label="Main domain"
          aria-readonly="true"
          className="bg-muted/50 text-muted-foreground flex min-w-0 items-center rounded-r-lg border px-3 text-sm"
        >
          .{domain}
        </div>
      </div>
    </div>
  );
}
