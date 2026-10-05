"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import { toast } from "@/lib/toast";

type DaySchedule = { enabled: boolean; start: string; end: string };

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

type Day = (typeof DAYS)[number];

const DEFAULT_SCHEDULE: Record<Day, DaySchedule> = {
  Monday: { enabled: true, start: "09:00", end: "18:00" },
  Tuesday: { enabled: true, start: "09:00", end: "18:00" },
  Wednesday: { enabled: true, start: "09:00", end: "18:00" },
  Thursday: { enabled: true, start: "09:00", end: "18:00" },
  Friday: { enabled: true, start: "09:00", end: "18:00" },
  Saturday: { enabled: false, start: "09:00", end: "18:00" },
  Sunday: { enabled: false, start: "09:00", end: "18:00" },
};

function Toggle({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${checked ? "bg-green-600" : "bg-muted-foreground/40"}`}
    >
      <span className={`size-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
    </button>
  );
}

export function ScheduleSettings({ phoneNumberId }: { phoneNumberId: number }) {
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE);
  const [saving, setSaving] = useState(false);

  function updateDay(day: Day, change: Partial<DaySchedule>) {
    setSchedule((current) => ({ ...current, [day]: { ...current[day], ...change } }));
  }

  async function save() {
    if (saving) return;
    if (scheduleEnabled && DAYS.some((day) => schedule[day].enabled && schedule[day].start >= schedule[day].end)) {
      toast.error("Fix the highlighted hours before saving.");
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`v1/wa/phone-numbers/${phoneNumberId}/business-agent/schedule`, {
        method: "PUT",
        body: {
          enabled: scheduleEnabled,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          days: DAYS.map((day) => ({ day: day.toUpperCase(), ...schedule[day] })),
        },
      });
      toast.success("Schedule saved.");
    } catch (error) {
      toast.error(toApiError(error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
    <div className="bg-card divide-border divide-y overflow-hidden rounded-lg border">
      <section className="flex items-start justify-between gap-3 px-4 py-4">
        <div className="min-w-0">
          <h2 className="text-sm font-medium">Schedule to turn on/off business agent</h2>
          <p className="text-muted-foreground text-sm">
            The agent only replies to customers during the selected days and hours.
          </p>
        </div>
        <Toggle
          checked={scheduleEnabled}
          label="Schedule to turn on/off business agent"
          onChange={setScheduleEnabled}
        />
      </section>
      <ul className="divide-border">
          {DAYS.map((day) => {
            const value = schedule[day];
            const invalid = value.enabled && value.start >= value.end;
            return (
              <li key={day} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                <label className="flex w-36 items-center gap-2 text-sm font-medium">
                  <Checkbox
                    checked={value.enabled}
                    onChange={(event) => updateDay(day, { enabled: event.target.checked })}
                  />
                  {day}
                </label>
                {value.enabled ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      type="time"
                      aria-label={`${day} start time`}
                      className="h-8 w-28 px-2 text-sm"
                      value={value.start}
                      aria-invalid={invalid || undefined}
                      onChange={(event) => updateDay(day, { start: event.target.value })}
                    />
                    <span className="text-muted-foreground text-sm">to</span>
                    <Input
                      type="time"
                      aria-label={`${day} end time`}
                      className="h-8 w-28 px-2 text-sm"
                      value={value.end}
                      aria-invalid={invalid || undefined}
                      onChange={(event) => updateDay(day, { end: event.target.value })}
                    />
                    {invalid ? (
                      <span className="text-destructive text-xs">End time must be after start time.</span>
                    ) : null}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">Closed</span>
                )}
              </li>
            );
          })}
        </ul>
      <div className="px-4 py-4">
        <Button type="button" onClick={() => void save()} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          Save
        </Button>
      </div>
    </div>
    </div>
  );
}
