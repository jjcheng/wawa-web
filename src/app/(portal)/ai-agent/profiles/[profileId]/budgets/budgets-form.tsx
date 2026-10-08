"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import type { InputError } from "@/lib/api/types";
import { toast } from "@/lib/toast";
import { parseBudget, validateBudgets } from "./budget-format";

export type Budgets = {
  budget_daily: number;
  budget_7_days: number;
  budget_30_days: number;
};

const fields = [
  {
    name: "budget_daily",
    label: "Daily budget",
    note: "Max USD can be spent in in rolling 24 hours.",
  },
  {
    name: "budget_7_days",
    label: "7-day budget",
    note: "Max USD can be spent in rolling 7 days.",
  },
  {
    name: "budget_30_days",
    label: "30-day budget",
    note: "Max USD can be spent in rolling 30 days.",
  },
] as const;

export function BudgetsForm({
  profileId,
  initialBudgets,
  initialValues,
}: {
  profileId: number;
  initialBudgets: Budgets;
  initialValues: Record<keyof Budgets, string>;
}) {
  const [values, setValues] = useState(initialValues);
  const [saved, setSaved] = useState({ values: initialValues, budgets: initialBudgets });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputErrors, setInputErrors] = useState<InputError[]>([]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setError(null);
    setInputErrors([]);

    setSaving(true);
    try {
      function amount(name: keyof Budgets) {
        // Preserve API precision when a rounded display value has not been edited.
        return values[name] === saved.values[name]
          ? saved.budgets[name]
          : parseBudget(values[name]);
      }
      const budgets = {
        budget_daily: amount("budget_daily"),
        budget_7_days: amount("budget_7_days"),
        budget_30_days: amount("budget_30_days"),
      };
      const validationErrors = validateBudgets(budgets);
      if (validationErrors.length > 0) {
        setInputErrors(validationErrors);
        return;
      }
      await apiFetch(`v1/ai-agent/profiles/${profileId}/budgets`, {
        method: "PATCH",
        body: budgets,
      });
      setSaved({ values, budgets });
      toast.success("Budgets saved.");
    } catch (requestError) {
      const apiError = toApiError(requestError);
      setError(apiError.message);
      setInputErrors(apiError.inputErrors);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="mt-5 space-y-4" noValidate onSubmit={(event) => void save(event)}>
      <div className="bg-card space-y-4 rounded-xl border p-4">
        {fields.map(({ name, label, note }) => (
          <div key={name} className="space-y-2">
            <Label htmlFor={name}>{label}</Label>
            <div className="flex">
              <Input
                value="USD"
                readOnly
                tabIndex={-1}
                aria-label={`${label} currency`}
                className="bg-muted w-16 shrink-0 rounded-r-none border-r-0 text-center"
              />
              <Input
                id={name}
                name={name}
                type="number"
                min="0.01"
                step="0.01"
                required
                disabled={saving}
                value={values[name]}
                className="min-w-0 rounded-l-none"
                aria-invalid={inputErrors.some((inputError) => inputError.field === name)}
                onChange={(event) =>
                  setValues((current) => ({ ...current, [name]: event.target.value }))
                }
              />
            </div>
            <p className="text-muted-foreground text-sm">
              {note}
            </p>
          </div>
        ))}
      </div>
      {error || inputErrors.length > 0 ? (
        <div className="text-destructive space-y-1 text-sm" role="alert">
          {error ? <p className="whitespace-pre-line">{error}</p> : null}
          {inputErrors.map((inputError, index) => (
            <p key={`${inputError.field}-${index}`} className="whitespace-pre-line">
              {inputError.field ? `${inputError.field}: ` : ""}
              {inputError.message}
            </p>
          ))}
        </div>
      ) : null}
      <Button type="submit" disabled={saving}>
        {saving ? <Loader2 className="size-4 animate-spin" /> : null}
        {saving ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}
