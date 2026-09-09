"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";

export function CustomerTagsSelect({
  value,
  onChange,
  disabled,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
}) {
  const selectedTags = Array.isArray(value) ? value : [];
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiFetch<string[]>("v1/customers/tags")
      .then((tags) => {
        if (active) {
          setAvailableTags(Array.isArray(tags) ? tags : []);
        }
      })
      .catch((requestError) => {
        if (active) setError(toApiError(requestError).message);
      });
    return () => {
      active = false;
    };
  }, []);

  function toggleTag(tag: string, checked: boolean) {
    onChange(
      checked
        ? [...selectedTags, tag]
        : selectedTags.filter((selectedTag) => selectedTag !== tag),
    );
  }

  function removeTag(tag: string) {
    onChange(selectedTags.filter((selectedTag) => selectedTag !== tag));
  }

  function addTag() {
    const tag = newTag.trim();
    if (!tag || selectedTags.includes(tag)) return;
    onChange([...selectedTags, tag]);
    setAvailableTags((tags) => (tags.includes(tag) ? tags : [...tags, tag]));
    setNewTag("");
  }

  const matchingTags = [...new Set([...availableTags, ...selectedTags])].filter((tag) =>
    tag.toLowerCase().startsWith(newTag.trim().toLowerCase()),
  );

  return (
    <div className="space-y-2">
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <div
            className="border-input flex min-h-8 w-full flex-wrap items-center gap-1 rounded-lg border bg-transparent px-2 py-1"
            onClick={() => setPopoverOpen(true)}
          >
            {selectedTags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                {tag}
                <button
                  type="button"
                  aria-label={`Remove ${tag}`}
                  className="hover:text-destructive"
                  onClick={(event) => {
                    event.stopPropagation();
                    removeTag(tag);
                  }}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
            <Input
              value={newTag}
              onChange={(event) => {
                setNewTag(event.target.value);
                setPopoverOpen(true);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addTag();
                  setPopoverOpen(false);
                }
              }}
              placeholder={
                selectedTags.length === 0 ? "Type to find or create a tag" : "Add tag"
              }
              disabled={disabled}
              className="h-6 min-w-24 flex-1 border-none px-1 py-0 shadow-none focus-visible:ring-0"
            />
          </div>
        </PopoverTrigger>
        <PopoverContent onOpenAutoFocus={(event) => event.preventDefault()}>
          {matchingTags.map((tag) => (
            <label
              key={tag}
              className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm"
            >
              <input
                type="checkbox"
                checked={selectedTags.includes(tag)}
                onChange={(event) => toggleTag(tag, event.target.checked)}
              />
              {tag}
            </label>
          ))}
          {matchingTags.length === 0 ? (
            <p className="text-muted-foreground px-2 py-1 text-sm">No existing tags found.</p>
          ) : null}
        </PopoverContent>
      </Popover>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  );
}
