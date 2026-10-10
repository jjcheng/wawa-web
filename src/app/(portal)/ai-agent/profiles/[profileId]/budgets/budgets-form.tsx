"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import type { InputError } from "@/lib/api/types";
import { toast } from "@/lib/toast";
import { parseBudget, validateBudgets } from "./budget-format";
import { parseTimezoneOffset, TIMEZONE_OFFSETS } from "./timezone-offsets";

export type Budgets = {
  budget_daily: number;
  budget_7_days: number;
};

const fields = [
  {
    name: "budget_daily",
    label: "Daily budget",
    note: "Max USD can be spent in a day, resets at 00:00 local time.",
  },
  {
    name: "budget_7_days",
    label: "7-day budget",
    note: "Max USD can be spent in 7 days, resets at every Monday 00:00 local time.",
  },
] as const;

export function BudgetsForm({
  profileId,
  initialBudgets,
  initialValues,
  initialUtcOffsetHours,
}: {
  profileId: number;
  initialBudgets: Budgets;
  initialValues: Record<keyof Budgets, string>;
  initialUtcOffsetHours?: number;
}) {
  const [values, setValues] = useState(initialValues);
  const [utcOffsetHours, setUtcOffsetHours] = useState(
    initialUtcOffsetHours === undefined ? "" : String(initialUtcOffsetHours),
  );
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
      };
      const validationErrors = validateBudgets(budgets);
      if (validationErrors.length > 0) {
        setInputErrors(validationErrors);
        return;
      }
      let offsetHours: number;
      try {
        offsetHours = parseTimezoneOffset(utcOffsetHours);
      } catch (offsetError) {
        if (!(offsetError instanceof Error)) throw offsetError;
        setInputErrors([{ field: "utc_offset_hours", message: offsetError.message }]);
        return;
      }
      await apiFetch(`v1/ai-agent/profiles/${profileId}/budgets`, {
        method: "PATCH",
        body: { ...budgets, utc_offset_hours: offsetHours },
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
    <form className="mt-5 w-full max-w-md space-y-4" noValidate onSubmit={(event) => void save(event)}>
      <div className="bg-card space-y-4 rounded-xl border p-4">
        <div className="space-y-2">
          <Label htmlFor="utc_offset_hours">Timezone</Label>
          <Select
            name="utc_offset_hours"
            value={utcOffsetHours}
            onValueChange={setUtcOffsetHours}
            disabled={saving}
          >
            <SelectTrigger
              id="utc_offset_hours"
              className="w-full"
              aria-invalid={inputErrors.some((inputError) => inputError.field === "utc_offset_hours")}
              aria-describedby="timezone-note"
            >
              <SelectValue placeholder="Select a timezone" />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONE_OFFSETS.map((option) => (
                <SelectItem key={option.hours} value={String(option.hours)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p id="timezone-note" className="text-muted-foreground text-sm">
            Budget resets use this fixed UTC offset.
          </p>
        </div>
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
      </div>
    </form>
  );
}
