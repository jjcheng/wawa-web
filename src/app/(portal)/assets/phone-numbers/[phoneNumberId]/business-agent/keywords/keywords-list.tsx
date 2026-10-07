"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import { toast } from "@/lib/toast";

type Keyword = {
  id?: number | string;
  keyword: string;
  notification_title?: string;
};

function parseKeywords(response: unknown): Keyword[] {
  const values = Array.isArray(response)
    ? response
    : response && typeof response === "object" && "keywords" in response
      ? (response as { keywords?: unknown }).keywords
      : null;

  if (values == null) return [];
  if (!Array.isArray(values)) {
    throw new Error("The keywords response has an unexpected format.");
  }

  return values.map((value) => {
    if (typeof value === "string") return { keyword: value };
    if (
      value &&
      typeof value === "object" &&
      "keyword" in value &&
      typeof value.keyword === "string"
    ) {
      const id =
        "id" in value && (typeof value.id === "string" || typeof value.id === "number")
          ? value.id
          : undefined;
      const notificationTitle =
        "notification_title" in value && typeof value.notification_title === "string"
          ? value.notification_title
          : undefined;
      return { id, keyword: value.keyword, notification_title: notificationTitle };
    }
    throw new Error("The keywords response contains an invalid keyword.");
  });
}

function KeywordDialogBody({
  phoneNumberId,
  existingKeyword,
  onSaved,
  onDelete,
}: {
  phoneNumberId: number;
  existingKeyword: (Keyword & { id: number | string }) | null;
  onSaved: () => void;
  onDelete?: () => void;
}) {
  const [keyword, setKeyword] = useState(existingKeyword?.keyword ?? "");
  const [notificationTitle, setNotificationTitle] = useState(
    existingKeyword?.notification_title ?? "",
  );
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const keywordError =
    keyword.trim().length < 10 ? "Keyword must contain at least 10 characters." : null;

  async function submit() {
    if (submitting) return;
    if (keywordError) {
      setShowErrors(true);
      return;
    }

    setSubmitting(true);
    try {
      const basePath = `v1/wa/phone-numbers/${phoneNumberId}/business-agent/keywords`;
      await apiFetch(
        existingKeyword
          ? `${basePath}/${encodeURIComponent(String(existingKeyword.id))}`
          : basePath,
        {
          method: existingKeyword ? "PUT" : "POST",
          body: {
            keyword: keyword.trim(),
            notification_title: notificationTitle.trim(),
          },
        },
      );
      toast.success(existingKeyword ? "Keyword updated." : "Keyword added.");
      onSaved();
    } catch (error) {
      toast.error(toApiError(error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{existingKeyword ? "Edit keyword" : "Add keyword"}</DialogTitle>
        <DialogDescription>
          Send me a notification when a message contains the keyword text
        </DialogDescription>
      </DialogHeader>
      <div className="-mx-1 grid min-h-0 flex-1 content-start gap-4 !overflow-y-auto px-1 pb-1">
        <label className="grid gap-1.5 text-sm font-medium">
          Keyword
          <Textarea
            autoFocus
            rows={4}
            value={keyword}
            minLength={10}
            disabled={submitting}
            aria-invalid={(showErrors && Boolean(keywordError)) || undefined}
            onChange={(event) => setKeyword(event.target.value)}
          />
          {showErrors && keywordError ? (
            <span className="text-destructive text-xs font-normal">{keywordError}</span>
          ) : (
            <span className="text-muted-foreground text-xs font-normal">
              At least 10 characters.
            </span>
          )}
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Notification title
          <Input
            value={notificationTitle}
            disabled={submitting}
            onChange={(event) => setNotificationTitle(event.target.value)}
          />
        </label>
      </div>
      <DialogFooter>
        {onDelete ? (
          <Button
            type="button"
            variant="destructive"
            className="sm:mr-auto"
            onClick={onDelete}
            disabled={submitting}
          >
            Delete
          </Button>
        ) : null}
        <Button type="button" onClick={() => void submit()} disabled={submitting}>
          {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {existingKeyword ? "Update" : "Add"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function KeywordsList({
  phoneNumberId,
  description,
}: {
  phoneNumberId: number;
  description: string;
}) {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingKeyword, setEditingKeyword] = useState<
    (Keyword & { id: number | string }) | null
  >(null);
  const [deleteTarget, setDeleteTarget] = useState<(Keyword & { id: number | string }) | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await apiFetch(
        `v1/wa/phone-numbers/${phoneNumberId}/business-agent/keywords/${encodeURIComponent(String(deleteTarget.id))}`,
        { method: "DELETE" },
      );
      setKeywords((current) => current.filter((keyword) => keyword.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast.success("Keyword deleted.");
    } catch (error) {
      toast.error(toApiError(error).message);
    } finally {
      setDeleting(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function loadKeywords() {
      setLoading(true);
      setLoadError(null);
      try {
        const response = await apiFetch<unknown>(
          `v1/wa/phone-numbers/${phoneNumberId}/business-agent/keywords`,
        );
        const result = parseKeywords(response);
        if (active) setKeywords(result);
      } catch (error) {
        if (active) setLoadError(toApiError(error).message);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadKeywords();
    return () => {
      active = false;
    };
  }, [phoneNumberId, refreshKey]);

  const filteredKeywords = useMemo(() => {
    const indexed = keywords.map((keyword, index) => ({ keyword, index }));
    const query = search.trim().toLowerCase();
    if (!query) return indexed;
    return indexed.filter(({ keyword }) =>
      [keyword.keyword, keyword.notification_title].some((value) =>
        value?.toLowerCase().includes(query),
      ),
    );
  }, [keywords, search]);

  return (
    <>
      <div className="mb-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Keywords</h1>
          <Button
            type="button"
            size="sm"
            className="shrink-0"
            onClick={() => {
              setEditingKeyword(null);
              setDialogOpen(true);
            }}
          >
            Add keyword
          </Button>
        </div>
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      </div>
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="text-muted-foreground size-5 animate-spin" />
        </div>
      ) : loadError ? (
        <div className="space-y-2">
          <p role="alert" className="text-destructive text-sm">
            {loadError}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => setRefreshKey((value) => value + 1)}
          >
            Retry
          </Button>
        </div>
      ) : (
        <div className="bg-card divide-border divide-y overflow-hidden rounded-lg border">
          <div className="flex items-center gap-2 px-4 py-2">
            <div className="relative min-w-0 flex-1">
              <Search
                aria-hidden="true"
                className="text-muted-foreground pointer-events-none absolute inset-y-0 left-2 my-auto size-4"
              />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search keywords"
                aria-label="Search keywords"
                className="h-8 border-none bg-transparent pr-7 pl-8 shadow-none focus-visible:ring-0"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-2 flex items-center"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </div>
          </div>
          {filteredKeywords.length === 0 ? (
            <div className="flex min-h-32 flex-col items-center justify-center gap-2 p-6 text-center">
              <p className="text-muted-foreground text-base">
                {search ? "No keywords found." : "No keywords yet."}
              </p>
              {search ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setSearch("")}
                >
                  Reset filter
                </Button>
              ) : null}
            </div>
          ) : (
            filteredKeywords.map(({ keyword, index }) => (
              <button
                key={keyword.id ?? `${keyword.keyword}-${index}`}
                type="button"
                disabled={keyword.id == null || keyword.id === ""}
                onClick={() => {
                  if (keyword.id == null || keyword.id === "") return;
                  setEditingKeyword({ ...keyword, id: keyword.id });
                  setDialogOpen(true);
                }}
                className="hover:bg-accent/60 flex w-full min-w-0 cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors disabled:cursor-default disabled:hover:bg-transparent"
              >
                <span className="bg-accent text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-medium tabular-nums">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="mb-1 truncate leading-5 font-medium">{keyword.keyword}</p>
                  {keyword.notification_title ? (
                    <p className="text-muted-foreground truncate text-sm">
                      {keyword.notification_title}
                    </p>
                  ) : null}
                </div>
              </button>
            ))
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden">
          {dialogOpen ? (
            <KeywordDialogBody
              key={editingKeyword?.id ?? "new"}
              phoneNumberId={phoneNumberId}
              existingKeyword={editingKeyword}
              onDelete={
                editingKeyword
                  ? () => {
                      setDialogOpen(false);
                      setDeleteTarget(editingKeyword);
                    }
                  : undefined
              }
              onSaved={() => {
                setDialogOpen(false);
                setRefreshKey((value) => value + 1);
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete keyword?</DialogTitle>
            <DialogDescription>
              You will no longer receive notifications for this keyword. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          {deleteTarget ? (
            <p className="bg-muted rounded-md px-3 py-2 text-sm font-medium break-words">
              {deleteTarget.keyword}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void confirmDelete()}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="size-4 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
