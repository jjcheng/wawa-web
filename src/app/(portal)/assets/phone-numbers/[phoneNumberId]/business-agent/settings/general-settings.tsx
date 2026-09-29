"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import { toast } from "@/lib/toast";

type AgentSettings = {
  ai_audience?: string;
  followup?: { enabled?: boolean; followup_interval_in_seconds?: number; message?: string } | null;
  handoff?: { enabled?: boolean; message?: string; message_selection?: string } | null;
  never_say_phrases?: string[] | null;
  rollout?: { enabled?: boolean } | null;
};

type FormValues = {
  aiAudience: string;
  rolloutEnabled: boolean;
  handoffEnabled: boolean;
  handoffMessage: string;
  followupEnabled: boolean;
  followupSeconds: string;
  followupMessage: string;
  neverSayPhrases: string;
};

const FOLLOWUP_INTERVALS = [300, 900, 1800, 3600, 7200, 28800, 86400];

function toFormValues(settings: AgentSettings): FormValues {
  const seconds = settings.followup?.followup_interval_in_seconds;
  return {
    aiAudience: settings.ai_audience || "EVERYONE",
    rolloutEnabled: settings.rollout?.enabled ?? false,
    handoffEnabled: settings.handoff?.enabled ?? false,
    handoffMessage: settings.handoff?.message ?? "",
    followupEnabled: settings.followup?.enabled ?? false,
    followupSeconds: String(seconds && FOLLOWUP_INTERVALS.includes(seconds) ? seconds : 3600),
    followupMessage: settings.followup?.message ?? "",
    neverSayPhrases: (settings.never_say_phrases ?? []).join("\n"),
  };
}

function Toggle({
  checked,
  label,
  disabled,
  onChange,
}: {
  checked: boolean;
  label: string;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60 ${checked ? "bg-green-600" : "bg-muted-foreground/40"}`}
    >
      <span className={`size-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
    </button>
  );
}

function Section({
  title,
  description,
  toggle,
  children,
}: {
  title: string;
  description: string;
  toggle?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-medium">{title}</h2>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
        {toggle}
      </div>
      {children ? <div className="mt-3 grid gap-3">{children}</div> : null}
    </section>
  );
}

export function GeneralSettings({ phoneNumberId }: { phoneNumberId: number }) {
  const [values, setValues] = useState<FormValues | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      try {
        const response = await apiFetch<AgentSettings | null>("v1/wa/business-agent/settings", {
          query: { phone_number_id: String(phoneNumberId) },
        });
        if (active) setValues(toFormValues(response ?? {}));
      } catch (error) {
        if (active) setLoadError(toApiError(error).message);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadSettings();
    return () => {
      active = false;
    };
  }, [phoneNumberId]);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="text-muted-foreground size-5 animate-spin" />
      </div>
    );
  }

  if (loadError || !values) return <p className="text-destructive text-sm">{loadError}</p>;

  const form = values;
  const handoffMessageError =
    form.handoffEnabled && !form.handoffMessage.trim() ? "Handoff message is required." : null;

  function update<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    setValues((current) => (current ? { ...current, [field]: value } : current));
  }

  async function save() {
    if (saving) return;
    if (handoffMessageError) {
      setShowErrors(true);
      return;
    }
    const payload: AgentSettings = {
      ai_audience: form.aiAudience,
      rollout: { enabled: form.rolloutEnabled },
      handoff: {
        enabled: form.handoffEnabled,
        message_selection: "CUSTOM",
        message: form.handoffMessage.trim(),
      },
      followup: {
        enabled: form.followupEnabled,
        followup_interval_in_seconds: Number(form.followupSeconds),
        message: form.followupMessage.trim(),
      },
      never_say_phrases: form.neverSayPhrases
        .split(/\r?\n/)
        .map((phrase) => phrase.trim())
        .filter(Boolean),
    };
    setSaving(true);
    try {
      await apiFetch("v1/wa/business-agent/settings", {
        method: "PUT",
        query: { phone_number_id: String(phoneNumberId) },
        body: payload,
      });
      setShowErrors(false);
      toast.success("Settings saved.");
    } catch (error) {
      toast.error(toApiError(error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-card divide-border divide-y overflow-hidden rounded-lg border">
        <Section
          title="Handoff"
          description="Whether the agent will release thread control after sending a handoff message."
          toggle={
            <Toggle
              checked={form.handoffEnabled}
              label="Handoff"
              disabled={saving}
              onChange={(checked) => update("handoffEnabled", checked)}
            />
          }
        >
          {form.handoffEnabled ? (
            <label className="grid gap-1.5 text-sm font-medium">
              Message
              <Textarea
                rows={2}
                placeholder="Connecting you to a human agent"
                value={form.handoffMessage}
                aria-invalid={showErrors && handoffMessageError ? true : undefined}
                disabled={saving}
                onChange={(event) => update("handoffMessage", event.target.value)}
              />
              {showErrors && handoffMessageError ? (
                <span className="text-destructive text-xs font-normal">{handoffMessageError}</span>
              ) : null}
            </label>
          ) : null}
        </Section>
        <Section
          title="Follow-up"
          description="Send a follow-up message when the customer goes quiet."
          toggle={
            <Toggle
              checked={form.followupEnabled}
              label="Follow-up"
              disabled={saving}
              onChange={(checked) => update("followupEnabled", checked)}
            />
          }
        >
          {form.followupEnabled ? (
            <>
            <div className="grid gap-1.5 text-sm font-medium">
              <span id="followup-interval">Interval</span>
              <Select
                value={form.followupSeconds}
                onValueChange={(value) => update("followupSeconds", value)}
                disabled={saving}
              >
                <SelectTrigger aria-labelledby="followup-interval" className="w-full sm:w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FOLLOWUP_INTERVALS.map((seconds) => (
                    <SelectItem key={seconds} value={String(seconds)}>
                      {seconds / 60} minutes
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="grid gap-1.5 text-sm font-medium">
              Message
              <Textarea
                rows={2}
                placeholder="Is there anything else I can help with?"
                value={form.followupMessage}
                disabled={saving}
                onChange={(event) => update("followupMessage", event.target.value)}
              />
            </label>
            </>
          ) : null}
        </Section>
        <Section title="Never say phrases" description="Phrases the agent must never use in replies. One per line.">
          <Textarea
            rows={4}
            aria-label="Never say phrases"
            placeholder={"We guarantee\nFree forever"}
            value={form.neverSayPhrases}
            disabled={saving}
            onChange={(event) => update("neverSayPhrases", event.target.value)}
          />
        </Section>
      </div>
      <Button type="button" onClick={() => void save()} disabled={saving}>
        {saving ? <Loader2 className="size-4 animate-spin" /> : null}
        Save
      </Button>
    </div>
  );
}
