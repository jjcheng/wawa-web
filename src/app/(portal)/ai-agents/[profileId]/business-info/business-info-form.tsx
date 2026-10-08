"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";

import { BackBar } from "@/components/back-bar";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import type { InputError } from "@/lib/api/types";
import { toast } from "@/lib/toast";

const TITLE_MAX_LENGTH = 30;
const DESCRIPTION_MAX_LENGTH = 2000;

export type BusinessInfoItem = {
  title: string;
  description: string;
};

type BusinessInfoRow = BusinessInfoItem & {
  rowId: number;
};

export function BusinessInfoForm({
  profileId,
  profileName,
  initialBusinessInfo,
}: {
  profileId: number;
  profileName: string;
  initialBusinessInfo: BusinessInfoItem[];
}) {
  const [items, setItems] = useState<BusinessInfoRow[]>(() => {
    const initialItems = initialBusinessInfo.map((item, rowId) => ({ ...item, rowId }));
    return initialItems.length > 0 ? initialItems : [{ rowId: 0, title: "", description: "" }];
  });
  const [nextRowId, setNextRowId] = useState(items.length);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputErrors, setInputErrors] = useState<InputError[]>([]);

  const titleCounts = new Map<string, number>();
  for (const item of items) {
    const title = item.title.trim();
    if (title) titleCounts.set(title, (titleCounts.get(title) ?? 0) + 1);
  }
  const duplicateTitles = new Set(
    [...titleCounts].filter(([, count]) => count > 1).map(([title]) => title),
  );

  function updateItem(rowId: number, updates: Partial<BusinessInfoItem>) {
    setItems((current) =>
      current.map((item) => (item.rowId === rowId ? { ...item, ...updates } : item)),
    );
  }

  async function saveBusinessInfo() {
    if (saving) return;
    setError(null);
    setInputErrors([]);

    const businessInfo: BusinessInfoItem[] = [];
    const titles = new Set<string>();
    for (const item of items) {
      const title = item.title.trim();
      if (!title) {
        setError("Every item must have a title.");
        return;
      }
      if (title.length > TITLE_MAX_LENGTH) {
        setError(`Titles must be ${TITLE_MAX_LENGTH} characters or fewer.`);
        return;
      }
      if (item.description.length > DESCRIPTION_MAX_LENGTH) {
        setError(`Descriptions must be ${DESCRIPTION_MAX_LENGTH} characters or fewer.`);
        return;
      }
      if (titles.has(title)) {
        setError(`The title "${title}" is used more than once.`);
        return;
      }
      titles.add(title);
      businessInfo.push({ title, description: item.description });
    }

    setSaving(true);
    try {
      const payload = { items: businessInfo };
      await apiFetch(`v1/ai-agent/profiles/${profileId}/business-info`, {
        method: "PATCH",
        body: payload,
      });
      toast.success("Business info saved.");
    } catch (requestError) {
      const apiError = toApiError(requestError);
      setError(apiError.message);
      setInputErrors(apiError.inputErrors);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <BackBar
        href={`/ai-agent/profiles/${profileId}`}
        actions={
          <Button
            type="button"
            className="ml-auto"
            onClick={() => {
              setItems((current) => [
                ...current,
                { rowId: nextRowId, title: "", description: "" },
              ]);
              setNextRowId((current) => current + 1);
            }}
          >
            Add item
          </Button>
        }
      />
      <PageHeader
        title="Business info"
        description={`Business information for ${profileName || "this agent profile"}.`}
      />

      {items.map((item) => (
        <section key={item.rowId} className="bg-card space-y-3 rounded-lg border p-4">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor={`business-info-title-${item.rowId}`}>Title</Label>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove ${item.title || "business info"} item`}
              onClick={() =>
                setItems((current) => current.filter((row) => row.rowId !== item.rowId))
              }
            >
              <Trash2 />
            </Button>
          </div>
          <Input
            id={`business-info-title-${item.rowId}`}
            value={item.title}
            maxLength={TITLE_MAX_LENGTH}
            aria-invalid={duplicateTitles.has(item.title.trim())}
            aria-describedby={
              duplicateTitles.has(item.title.trim())
                ? `business-info-title-error-${item.rowId}`
                : undefined
            }
            onChange={(event) => updateItem(item.rowId, { title: event.target.value })}
            placeholder="Enter title. e.g. business profile, operating hour, address, payment methods, return policy"
          />
          {duplicateTitles.has(item.title.trim()) ? (
            <p
              id={`business-info-title-error-${item.rowId}`}
              className="text-destructive text-sm"
              role="alert"
            >
              This title is used more than once. Titles must be unique.
            </p>
          ) : null}
          <p className="text-muted-foreground text-right text-xs">
            {item.title.length}/{TITLE_MAX_LENGTH}
          </p>
          <Label htmlFor={`business-info-description-${item.rowId}`}>Description</Label>
          <Textarea
            id={`business-info-description-${item.rowId}`}
            rows={3}
            value={item.description}
            maxLength={DESCRIPTION_MAX_LENGTH}
            onChange={(event) => updateItem(item.rowId, { description: event.target.value })}
            placeholder="Enter description"
          />
          <p className="text-muted-foreground text-right text-xs">
            {item.description.length}/{DESCRIPTION_MAX_LENGTH}
          </p>
        </section>
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
      <Button
        type="button"
        onClick={() => void saveBusinessInfo()}
        disabled={saving || duplicateTitles.size > 0}
      >
        {saving ? <Loader2 className="size-4 animate-spin" /> : null}
        {saving ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}
