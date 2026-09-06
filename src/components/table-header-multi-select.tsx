"use client";

import { ChevronDown } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type TableHeaderMultiSelectProps = {
  label: string;
  options: string[];
  selectedValues: Set<string>;
  onSelectedValuesChange: (values: Set<string>) => void;
  emptyMessage?: string;
};

export function TableHeaderMultiSelect({
  label,
  options,
  selectedValues,
  onSelectedValuesChange,
  emptyMessage = "No options available.",
}: TableHeaderMultiSelectProps) {
  function toggleOption(option: string, checked: boolean) {
    const next = new Set(selectedValues);
    if (checked) next.add(option);
    else next.delete(option);
    onSelectedValuesChange(next);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Filter by ${label.toLowerCase()}`}
          className="border-input focus-visible:border-ring focus-visible:ring-ring/50 text-foreground dark:bg-input/30 dark:hover:bg-input/50 flex h-8 w-fit items-center justify-between gap-1.5 rounded-lg border-none bg-transparent px-0 pl-1 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3"
        >
          {selectedValues.size > 0 ? `${label} (${selectedValues.size})` : label}
          <ChevronDown className="text-muted-foreground size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-1">
        {options.length > 0 ? (
          <div>
            {options.map((option) => (
              <label
                key={option}
                className="hover:bg-accent hover:text-accent-foreground flex cursor-pointer items-center gap-2 rounded-md py-1 pr-1.5 pl-1.5 text-sm"
              >
                <Checkbox
                  checked={selectedValues.has(option)}
                  onChange={(event) => toggleOption(option, event.target.checked)}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground px-1.5 py-1 text-sm">{emptyMessage}</p>
        )}
      </PopoverContent>
    </Popover>
  );
}