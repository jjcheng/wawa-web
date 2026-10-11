"use client";

import { Info, Pencil } from "lucide-react";
import { BackBar } from "@/components/back-bar";
import { CustomerAgentSwitch } from "@/components/customer-agent-switch";
import { CustomerDetailsButton } from "@/components/customer-details-button";
import { CustomerInfo } from "@/components/customer-info";
import { useUpdatedCustomer } from "@/components/customer-updates";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Customer } from "@/lib/api/types";
import { BUSINESS_AGENT_ENABLED } from "@/lib/feature-flags";
import { formatPhoneNumber } from "@/lib/format";

export function ChatCustomerHeader({
  customer: initialCustomer,
  embedded,
  backHref,
}: {
  customer: Customer;
  embedded: boolean;
  backHref: string;
}) {
  const customer = useUpdatedCustomer(initialCustomer);
  const showAgentSwitch =
    BUSINESS_AGENT_ENABLED && Boolean(customer.sending_phone_number?.meta_agent_id?.trim());
  const actions = (
    <div className="flex items-center gap-2">
      {showAgentSwitch ? (
        <CustomerAgentSwitch
          key={`${customer.id}:${customer.agent_enabled}`}
          customerId={customer.id}
          initialOn={customer.agent_enabled === true}
        />
      ) : null}
      <CustomerDetailsButton
        customer={customer}
        startInEditMode
        deletedRedirectHref={backHref}
        trigger={
          <Button
            size="icon"
            variant="ghost"
            className="bg-muted rounded-full"
            aria-label="Edit customer"
            title="Edit customer"
          >
            <Pencil className="size-4" />
          </Button>
        }
      />
      <Popover>
        <PopoverTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="bg-muted rounded-full"
            aria-label="Customer details"
          >
            <Info className="size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 p-3">
          <CustomerInfo customer={customer} />
        </PopoverContent>
      </Popover>
    </div>
  );
  return (
    <>
      {!embedded ? <BackBar href={backHref} actions={actions} /> : null}
      <PageHeader
        title={customer.display_name}
        titleClassName="text-lg"
        action={embedded ? actions : undefined}
        description={
          customer.sending_phone_number?.display_phone_number
            ? `Sending from: ${customer.sending_phone_number.display_phone_number}`
            : undefined
        }
        titleAction={
          <>
            {customer.phone_number ? (
              <span className="text-muted-foreground text-sm">
                {formatPhoneNumber(customer.phone_number, customer.country_code)}
              </span>
            ) : null}
            {customer.tags?.length ? (
              <div className="flex flex-wrap gap-1.5">
                {customer.tags.map((tag) => (
                  <Badge
                    key={tag}
                    className="h-5 bg-green-100 px-1.5 text-[10px] leading-none text-green-700 dark:bg-green-950 dark:text-green-300"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : null}
          </>
        }
      />
    </>
  );
}
