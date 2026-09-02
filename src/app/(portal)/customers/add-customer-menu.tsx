"use client";

import { ChevronDown } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MEDIUM_BUTTON_HEIGHT } from "@/lib/utils";

export function AddCustomerMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className={MEDIUM_BUTTON_HEIGHT}>
          Add Customer
          <ChevronDown className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onSelect={() => toast.info("Creating customers isn't available yet.")}
        >
          Create customer
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => toast.info("Importing customers isn't available yet.")}
        >
          Import customers
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
