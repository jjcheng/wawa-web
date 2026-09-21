"use client";

import { Loader2 } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { createWebsiteAction, type WebsiteSetupState } from "./actions";
import { SubdomainInput } from "./subdomain-input";

function ContinueButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {pending ? "Creating website..." : "Create"}
    </Button>
  );
}

export function WebsiteSetupForm({
  catalogId,
  catalogName,
  domain,
}: {
  catalogId: string;
  catalogName: string;
  domain: string;
}) {
  const [state, formAction] = useActionState<WebsiteSetupState, FormData>(
    createWebsiteAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="meta_catalog_id" value={catalogId} />

      <div className="space-y-2">
        <Label htmlFor="website-subdomain">Subdomain</Label>
        <SubdomainInput domain={domain} />
        <p className="text-muted-foreground text-sm">
          You can configure your own custom domain later.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="catalog-name">Catalog name</Label>
        <Input
          id="catalog-name"
          value={catalogName}
          readOnly
          aria-readonly="true"
          className="bg-muted/50"
        />
      </div>

      {state.message ? (
        <p className={cn("text-destructive text-sm")} role="alert">
          {state.message}
        </p>
      ) : null}

      <div className="flex justify-end">
        <ContinueButton />
      </div>
    </form>
  );
}
