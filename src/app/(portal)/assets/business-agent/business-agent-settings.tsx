"use client";

import { useEffect, useState } from "react";
import { Info, Loader2, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import { toast } from "@/lib/toast";

type UnitType = "token" | "ai_turn";
type TimeWindow = "one_day" | "seven_days" | "fourteen_days" | "thirty_days";

type Budget = {
  budget_id?: string;
  max_budget: number | "";
  unit_type: UnitType;
  time_window: TimeWindow;
};

function parseBudgets(response: unknown): Budget[] {
  if (Array.isArray(response)) return response as Budget[];
  if (response && typeof response === "object" && "budgets" in response) {
    const budgets = (response as { budgets?: unknown }).budgets;
    if (Array.isArray(budgets)) return budgets as Budget[];
  }
  return [];
}

function BudgetFieldHelp({ text }: { text: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon-xs" aria-label={text} title={text}>
          <Info />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 text-sm leading-5">
        {text}
      </PopoverContent>
    </Popover>
  );
}

export function BusinessAgentSettings() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadBudgets() {
      try {
        const response = await apiFetch<unknown>("v1/wa/business-agent/budgets");
        if (active) setBudgets(parseBudgets(response));
      } catch (requestError) {
        if (active) setError(toApiError(requestError).message);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadBudgets();
    return () => {
      active = false;
    };
  }, []);

  function updateBudget(index: number, updates: Partial<Budget>) {
    setBudgets((current) => current.map((budget, itemIndex) =>
      itemIndex === index ? { ...budget, ...updates } : budget,
    ));
  }

  async function saveBudgets() {
    if (saving || budgets.some((budget) =>
      budget.max_budget === "" || !Number.isInteger(budget.max_budget) || budget.max_budget < 1,
    )) return;

    setSaving(true);
    try {
      const response = await apiFetch<unknown>("v1/wa/business-agent/budgets", {
        method: "PUT",
        body: {
          budgets: budgets.map((budget) => ({
            ...budget,
            max_budget: budget.max_budget === "" ? 0 : budget.max_budget,
          })),
        },
      });
      const savedBudgets = parseBudgets(response);
      if (savedBudgets.length > 0) setBudgets(savedBudgets);
      toast.success("Business agent budgets saved.");
    } catch (requestError) {
      toast.error(toApiError(requestError).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          Add budgets to limit usage.
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={loading || Boolean(error)}
          onClick={() => setBudgets((current) => [
            ...current,
            { max_budget: "", unit_type: "token", time_window: "one_day" },
          ])}
        >
          Add budget
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin" /></div>
      ) : error ? (
        <p className="text-destructive text-sm">{error}</p>
      ) : budgets.length === 0 ? (
        <p className="text-muted-foreground rounded-md border p-4 text-sm">No budgets configured.</p>
      ) : (
        <div className="divide-border divide-y rounded-md border">
          {budgets.map((budget, index) => (
            <div key={budget.budget_id ?? `new-${index}`} className="grid gap-3 p-3 sm:grid-cols-[minmax(8rem,1fr)_minmax(8rem,1fr)_minmax(9rem,1fr)_auto] sm:items-end">
              <label className="grid gap-1.5 text-sm">
                <span className="flex items-center gap-1">
                  Max usage
                  <BudgetFieldHelp text="The maximum allowed usage in the specified window." />
                </span>
                <Input
                  type="number"
                  value={budget.max_budget}
                  onChange={(event) => updateBudget(index, {
                    max_budget: event.target.value === "" ? "" : Number(event.target.value),
                  })}
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="flex items-center gap-1">
                  Unit
                  <BudgetFieldHelp text="Token usage across the Business Portfolio or AI agent turns within each conversation." />
                </span>
                <Select value={budget.unit_type} onValueChange={(value) => updateBudget(index, { unit_type: value as UnitType })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="token">Tokens</SelectItem>
                    <SelectItem value="ai_turn">AI turns</SelectItem>
                  </SelectContent>
                </Select>
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="flex items-center gap-1">
                  Time window
                  <BudgetFieldHelp text="The period the usage is totalled over. Windows roll rather than resetting on a fixed calendar boundary, and are measured in the timezone of the WhatsApp Business Account." />
                </span>
                <Select value={budget.time_window} onValueChange={(value) => updateBudget(index, { time_window: value as TimeWindow })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_day">1 day</SelectItem>
                    <SelectItem value="seven_days">7 days</SelectItem>
                    <SelectItem value="fourteen_days">14 days</SelectItem>
                    <SelectItem value="thirty_days">30 days</SelectItem>
                  </SelectContent>
                </Select>
              </label>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Remove budget"
                title="Remove budget"
                onClick={() => setBudgets((current) => current.filter((_, itemIndex) => itemIndex !== index))}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
      )}

      {!loading && !error ? (
        <div className="flex justify-start">
          <Button
            type="button"
            onClick={() => void saveBudgets()}
            disabled={saving || budgets.some((budget) =>
              budget.max_budget === "" || !Number.isInteger(budget.max_budget) || budget.max_budget < 1,
            )}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Save
          </Button>
        </div>
      ) : null}
    </section>
  );
}