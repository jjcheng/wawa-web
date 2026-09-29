"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Search, X } from "lucide-react";

import { LocalDateTime } from "@/components/local-date-time";
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

type WebsiteRules = {
  included_sub_domains?: string[] | null;
  included_url_patterns?: string[] | null;
  excluded_sub_domains?: string[] | null;
  excluded_url_patterns?: string[] | null;
  single_urls?: string[] | null;
};

type BusinessAgentWebsite = WebsiteRules & {
  id?: number | string;
  url?: string;
  name?: string;
  title?: string;
  status?: string;
  crawl_status?: string | null;
  crawl_error?: string | null;
  pages_crawled?: number | null;
  created_at?: string | number;
};

type RuleField = keyof WebsiteRules;

const RULE_FIELDS: { field: RuleField; label: string; placeholder: string }[] = [
  { field: "included_sub_domains", label: "Included subdomains", placeholder: "mx.example.com" },
  { field: "included_url_patterns", label: "Included URL patterns", placeholder: "/mx/" },
  { field: "excluded_sub_domains", label: "Excluded subdomains", placeholder: "br.example.com" },
  { field: "excluded_url_patterns", label: "Excluded URL patterns", placeholder: "/br/" },
  { field: "single_urls", label: "Single URLs", placeholder: "https://www.example.com/mx/help" },
];

const HOSTNAME_PATTERN = /^(?=.{1,253}$)([a-z\d]([a-z\d-]{0,61}[a-z\d])?\.)+[a-z]{2,63}$/i;

function toLines(values?: string[] | null) {
  return (values ?? []).join("\n");
}

function fromLines(text: string) {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function websiteUrl(website: BusinessAgentWebsite) {
  return website.url || "Unknown URL";
}

function websiteTitle(website: BusinessAgentWebsite) {
  return website.title || website.name || "";
}

// Accepts unix seconds, unix milliseconds, or date strings.
function toTimestamp(value?: string | number) {
  if (value == null || value === "") return null;
  const numeric = typeof value === "number" ? value : /^\d+$/.test(value) ? Number(value) : null;
  if (numeric == null) return value;
  return numeric < 1e12 ? numeric * 1000 : numeric;
}

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    if ((url.protocol !== "http:" && url.protocol !== "https:") || !url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function WebsiteDialogBody({
  phoneNumberId,
  website,
  onCancel,
  onSaved,
  onDelete,
}: {
  phoneNumberId: number;
  website: BusinessAgentWebsite | null;
  onCancel: () => void;
  onSaved: (website: BusinessAgentWebsite) => void;
  onDelete?: () => void;
}) {
  const [value, setValue] = useState(website?.url ?? "");
  const [rules, setRules] = useState<Record<RuleField, string>>(() => ({
    included_sub_domains: toLines(website?.included_sub_domains),
    included_url_patterns: toLines(website?.included_url_patterns),
    excluded_sub_domains: toLines(website?.excluded_sub_domains),
    excluded_url_patterns: toLines(website?.excluded_url_patterns),
    single_urls: toLines(website?.single_urls),
  }));
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const url = normalizeUrl(value);
  const urlError = !value.trim() ? "URL is required." : !url ? "Enter a valid http or https URL." : null;
  const ruleErrors: Partial<Record<RuleField, string>> = {};
  for (const field of ["included_sub_domains", "excluded_sub_domains"] as const) {
    const invalid = fromLines(rules[field]).find((line) => !HOSTNAME_PATTERN.test(line));
    if (invalid) ruleErrors[field] = `"${invalid}" is not a valid domain.`;
  }
  const invalidSingleUrl = fromLines(rules.single_urls).find((line) => !normalizeUrl(line));
  if (invalidSingleUrl) ruleErrors.single_urls = `"${invalidSingleUrl}" is not a valid URL.`;
  const hasErrors = Boolean(urlError) || Object.keys(ruleErrors).length > 0;

  async function submit() {
    if (submitting) return;
    if (hasErrors || !url) {
      setShowErrors(true);
      return;
    }
    const payload = {
      ...(website?.id != null ? { id: String(website.id) } : {}),
      url,
      included_sub_domains: fromLines(rules.included_sub_domains),
      included_url_patterns: fromLines(rules.included_url_patterns),
      excluded_sub_domains: fromLines(rules.excluded_sub_domains),
      excluded_url_patterns: fromLines(rules.excluded_url_patterns),
      single_urls: fromLines(rules.single_urls).map((line) => normalizeUrl(line) ?? line),
    };
    setSubmitting(true);
    try {
      const response = await apiFetch<BusinessAgentWebsite | null>("v1/wa/business-agent/websites", {
        method: website ? "PUT" : "POST",
        query: { phone_number_id: String(phoneNumberId) },
        body: payload,
      });
      onSaved({ ...website, ...payload, id: website?.id ?? payload.id, ...response });
      toast.success(website ? "Website updated." : "Website added.");
    } catch (submitError) {
      toast.error(toApiError(submitError).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{website ? "Edit website" : "Add website"}</DialogTitle>
        <DialogDescription>
          The agent can reference content from this website. Enter one value per line in the optional fields.
        </DialogDescription>
      </DialogHeader>
      <div className="-mx-1 grid gap-4 px-1 !overflow-y-auto">
        <label className="grid gap-1.5 text-sm font-medium">
          URL
          <Input
            autoFocus
            type="url"
            inputMode="url"
            placeholder="https://www.example.com"
            value={value}
            aria-invalid={showErrors && urlError ? true : undefined}
            onChange={(event) => setValue(event.target.value)}
          />
          {showErrors && urlError ? <span className="text-destructive text-xs font-normal">{urlError}</span> : null}
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          {RULE_FIELDS.map(({ field, label, placeholder }) => {
            const error = showErrors ? ruleErrors[field] : undefined;
            return (
              <label
                key={field}
                className={`grid content-start gap-1.5 text-sm font-medium ${field === "single_urls" ? "sm:col-span-2" : ""}`}
              >
                {label}
                <Textarea
                  rows={3}
                  placeholder={placeholder}
                  value={rules[field]}
                  aria-invalid={error ? true : undefined}
                  onChange={(event) => setRules((current) => ({ ...current, [field]: event.target.value }))}
                />
                {error ? <span className="text-destructive text-xs font-normal">{error}</span> : null}
              </label>
            );
          })}
        </div>
      </div>
      <DialogFooter>
        {onDelete ? (
          <Button type="button" variant="destructive" className="sm:mr-auto" onClick={onDelete} disabled={submitting}>
            Delete
          </Button>
        ) : null}
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="button" onClick={() => void submit()} disabled={submitting}>
          {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {website ? "Update" : "Add"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function WebsitesList({ phoneNumberId, description }: { phoneNumberId: number; description: string }) {
  const [websites, setWebsites] = useState<BusinessAgentWebsite[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BusinessAgentWebsite | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!deleteTarget || deleteTarget.id == null || deleting) return;
    setDeleting(true);
    try {
      await apiFetch(`v1/wa/business-agent/websites/${encodeURIComponent(String(deleteTarget.id))}`, {
        method: "DELETE",
        query: { phone_number_id: String(phoneNumberId) },
      });
      setWebsites((current) => current.filter((website) => website !== deleteTarget));
      setDeleteTarget(null);
      toast.success("Website deleted.");
    } catch (error) {
      toast.error(toApiError(error).message);
    } finally {
      setDeleting(false);
    }
  }
  const [editingWebsite, setEditingWebsite] = useState<BusinessAgentWebsite | null>(null);
  const [websiteDetail, setWebsiteDetail] = useState<BusinessAgentWebsite | null>(null);
  const detailRequestRef = useRef(0);

  async function openEdit(website: BusinessAgentWebsite) {
    setEditingWebsite(website);
    setWebsiteDetail(null);
    setAddOpen(true);
    if (website.id == null) {
      setWebsiteDetail(website);
      return;
    }
    const requestId = ++detailRequestRef.current;
    try {
      const response = await apiFetch<BusinessAgentWebsite | null>(
        `v1/wa/business-agent/websites/${encodeURIComponent(String(website.id))}`,
        { query: { phone_number_id: String(phoneNumberId) } },
      );
      if (requestId === detailRequestRef.current) setWebsiteDetail({ ...website, ...response });
    } catch (error) {
      if (requestId !== detailRequestRef.current) return;
      toast.error(toApiError(error).message);
      setAddOpen(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function loadWebsites() {
      try {
        const response = await apiFetch<BusinessAgentWebsite[] | { websites?: BusinessAgentWebsite[] | null } | null>(
          "v1/wa/business-agent/websites",
          { query: { phone_number_id: String(phoneNumberId) } },
        );
        if (active) setWebsites(Array.isArray(response) ? response : response?.websites ?? []);
      } catch (error) {
        if (active) setLoadError(toApiError(error).message);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadWebsites();
    return () => {
      active = false;
    };
  }, [phoneNumberId]);

  const filteredWebsites = useMemo(() => {
    const indexed = websites.map((website, index) => ({ website, index }));
    const query = search.trim().toLowerCase();
    if (!query) return indexed;
    return indexed.filter(({ website }) =>
      [websiteUrl(website), websiteTitle(website)].some((value) => value.toLowerCase().includes(query)),
    );
  }, [websites, search]);

  return (
    <>
      <div className="mb-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Websites</h1>
          <Button
            type="button"
            size="sm"
            className="shrink-0"
            onClick={() => {
              detailRequestRef.current++;
              setEditingWebsite(null);
              setAddOpen(true);
            }}
          >
            Add website
          </Button>
        </div>
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="text-muted-foreground size-5 animate-spin" />
        </div>
      ) : loadError ? (
        <p className="text-destructive text-sm">{loadError}</p>
      ) : (
        <div className="bg-card divide-border overflow-hidden divide-y rounded-lg border">
          <div className="flex items-center gap-2 px-4 py-2">
            <div className="relative min-w-0 flex-1">
              <Search
                aria-hidden="true"
                className="text-muted-foreground pointer-events-none absolute inset-y-0 left-2 my-auto size-4"
              />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search websites"
                aria-label="Search websites"
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
          {filteredWebsites.length === 0 ? (
            <div className="flex min-h-32 flex-col items-center justify-center gap-2 p-6 text-center">
              <p className="text-muted-foreground text-base">{search ? "No websites found." : "No websites yet."}</p>
              {search ? (
                <Button type="button" size="sm" variant="outline" onClick={() => setSearch("")}>
                  Reset filter
                </Button>
              ) : null}
            </div>
          ) : (
            filteredWebsites.map(({ website, index }) => {
              const title = websiteTitle(website);
              const crawlStatus = website.crawl_status
                ? website.crawl_status.charAt(0).toUpperCase() + website.crawl_status.slice(1).toLowerCase().replace(/_/g, " ")
                : null;
              const pagesCrawled =
                website.pages_crawled != null
                  ? `${website.pages_crawled} page${website.pages_crawled === 1 ? "" : "s"} crawled`
                  : null;
              const crawlDetails = [crawlStatus, pagesCrawled].filter(Boolean).join(" · ");
              return (
                <button
                  key={website.id ?? index}
                  type="button"
                  onClick={() => void openEdit(website)}
                  className="hover:bg-accent/60 flex w-full min-w-0 cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors"
                >
                  <span className="bg-accent text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-medium tabular-nums">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 truncate font-medium leading-5">{websiteUrl(website)}</p>
                    {website.created_at ? (
                      <LocalDateTime value={toTimestamp(website.created_at)} className="text-muted-foreground block truncate text-sm" />
                    ) : null}
                    {title ? <p className="text-muted-foreground truncate text-sm">{title}</p> : null}
                    {crawlDetails ? <p className="text-muted-foreground truncate text-sm md:hidden">{crawlDetails}</p> : null}
                    {website.crawl_error ? (
                      <p className="text-destructive line-clamp-2 text-sm md:hidden" title={website.crawl_error}>
                        {website.crawl_error}
                      </p>
                    ) : null}
                  </div>
                  {crawlDetails || website.crawl_error ? (
                    <div className="ml-auto hidden w-48 shrink-0 self-stretch text-right md:flex md:flex-col md:justify-center">
                      {crawlStatus ? <span className="mb-0.5 block truncate text-sm font-medium">{crawlStatus}</span> : null}
                      {pagesCrawled ? <span className="text-muted-foreground block truncate text-sm">{pagesCrawled}</span> : null}
                      {website.crawl_error ? (
                        <span className="text-destructive line-clamp-2 block text-sm" title={website.crawl_error}>
                          {website.crawl_error}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-2xl">
          {addOpen && editingWebsite && !websiteDetail ? (
            <>
              <DialogHeader>
                <DialogTitle>Edit website</DialogTitle>
                <DialogDescription className="truncate">{websiteUrl(editingWebsite)}</DialogDescription>
              </DialogHeader>
              <div className="flex justify-center py-10">
                <Loader2 className="text-muted-foreground size-5 animate-spin" />
              </div>
            </>
          ) : addOpen ? (
            <WebsiteDialogBody
              key={editingWebsite ? String(editingWebsite.id ?? editingWebsite.url) : "new"}
              phoneNumberId={phoneNumberId}
              website={editingWebsite ? websiteDetail : null}
              onCancel={() => setAddOpen(false)}
              onSaved={(website) => {
                setWebsites((current) =>
                  editingWebsite
                    ? current.map((item) => (item === editingWebsite ? website : item))
                    : [...current, website],
                );
                setAddOpen(false);
              }}
              onDelete={
                editingWebsite?.id != null
                  ? () => {
                      setDeleteTarget(editingWebsite);
                      setAddOpen(false);
                    }
                  : undefined
              }
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
            <DialogTitle>Delete website?</DialogTitle>
            <DialogDescription>
              The agent will no longer reference this website. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteTarget ? (
            <p className="bg-muted rounded-md px-3 py-2 text-sm font-medium break-all">{websiteUrl(deleteTarget)}</p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={() => void confirmDelete()} disabled={deleting}>
              {deleting ? <Loader2 className="size-4 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
