"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import type { InputError } from "@/lib/api/types";
import { toast } from "@/lib/toast";

export function OtherSettingsForm({
  profileId,
  initialHandoverMessage,
  initialNeverSayPhrases,
}: {
  profileId: number;
  initialHandoverMessage: string;
  initialNeverSayPhrases: string[];
}) {
  const [handoverMessage, setHandoverMessage] = useState(initialHandoverMessage);
  const [neverSayPhrases, setNeverSayPhrases] = useState(initialNeverSayPhrases.join("\n"));
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
      await apiFetch(`v1/ai-agent/profiles/${profileId}/other-settings`, {
        method: "PATCH",
        body: {
          handover_message: handoverMessage,
          never_say_phrases: neverSayPhrases
            .split(/\r?\n/)
            .map((phrase) => phrase.trim())
            .filter((phrase) => phrase.length > 0),
        },
      });
      toast.success("Other settings saved.");
    } catch (requestError) {
      const apiError = toApiError(requestError);
      setError(apiError.message);
      setInputErrors(apiError.inputErrors);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="w-full max-w-xl space-y-4" onSubmit={(event) => void save(event)}>
      <div className="bg-card space-y-4 rounded-xl border p-4">
        <div className="space-y-2">
          <Label htmlFor="handover-message">Handover message</Label>
          <Textarea
            id="handover-message"
            name="handover_message"
            placeholder="We will get back to you shortly"
            rows={3}
            value={handoverMessage}
            disabled={saving}
            aria-invalid={inputErrors.some((item) => item.field === "handover_message")}
            onChange={(event) => setHandoverMessage(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="never-say-phrases">Never say phrases</Label>
          <Textarea
            id="never-say-phrases"
            name="never_say_phrases"
            placeholder={"we guarantee\nyou cannot"}
            rows={5}
            value={neverSayPhrases}
            disabled={saving}
            aria-describedby="never-say-phrases-note"
            aria-invalid={inputErrors.some((item) => item.field === "never_say_phrases")}
            onChange={(event) => setNeverSayPhrases(event.target.value)}
          />
          <p id="never-say-phrases-note" className="text-muted-foreground text-xs">
            Enter one phrase per line. Blank lines are ignored.
          </p>
        </div>
        {error || inputErrors.length > 0 ? (
          <div className="text-destructive space-y-1 text-sm" role="alert">
            {error ? <p className="whitespace-pre-line">{error}</p> : null}
            {inputErrors.map((item, index) => (
              <p key={`${item.field}-${index}`} className="whitespace-pre-line">
                {item.field ? `${item.field}: ` : ""}
                {item.message}
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
