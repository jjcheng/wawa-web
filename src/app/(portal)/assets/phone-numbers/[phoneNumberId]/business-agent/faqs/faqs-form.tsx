"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Loader2, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import { toast } from "@/lib/toast";

type Faq = { id?: number | string; question: string; answer: string };
type FaqRow = Faq & { key: string };

function toFaqRow(faq: Faq): FaqRow {
  return { ...faq, key: faq.id != null ? `faq-${faq.id}` : crypto.randomUUID() };
}

type FaqValues = { question: string; answer: string };

const MAX_CSV_BYTES = 1024 * 1024;
const MAX_CSV_ROWS = 500;

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function readCsvRows(text: string): string[][] {
  return parseCsv(text.replace(/^\uFEFF/, "")).filter((row) => row.some((cell) => cell.trim()));
}

function rowsToFaqs(rows: string[][]): { faqs: FaqValues[]; skipped: number } {
  const faqs = rows
    .map((row) => ({ question: (row[0] ?? "").trim(), answer: (row[1] ?? "").trim() }))
    .filter((faq) => faq.question && faq.answer);
  return { faqs, skipped: rows.length - faqs.length };
}

type CsvPreview = { fileName: string; rows: string[][] };

function FaqDialog({
  open,
  faq,
  onOpenChange,
  onSubmit,
  onDelete,
}: {
  open: boolean;
  faq: FaqRow | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: FaqValues) => Promise<void>;
  onDelete: (faq: FaqRow) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden">
        {open ? (
          <FaqDialogBody
            key={faq?.key ?? "new"}
            faq={faq}
            onSubmit={onSubmit}
            onDelete={faq?.id != null ? () => onDelete(faq) : undefined}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function FaqDialogBody({
  faq,
  onSubmit,
  onDelete,
}: {
  faq: FaqRow | null;
  onSubmit: (values: FaqValues) => Promise<void>;
  onDelete?: () => void;
}) {
  const [question, setQuestion] = useState(faq?.question ?? "");
  const [answer, setAnswer] = useState(faq?.answer ?? "");
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const questionError = showErrors && !question.trim();
  const answerError = showErrors && !answer.trim();

  async function submit() {
    if (submitting) return;
    if (!question.trim() || !answer.trim()) {
      setShowErrors(true);
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({ question: question.trim(), answer: answer.trim() });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{faq ? "Edit FAQ" : "Add FAQ"}</DialogTitle>
        <DialogDescription>The agent uses this answer when customers ask a similar question.</DialogDescription>
      </DialogHeader>
      <div className="-mx-1 grid min-h-0 flex-1 content-start gap-4 !overflow-y-auto px-1 pb-1">
        <label className="grid gap-1.5 text-sm font-medium">
          Question
          <Input
            autoFocus
            placeholder="Do you offer international shipping?"
            value={question}
            aria-invalid={questionError || undefined}
            onChange={(event) => setQuestion(event.target.value)}
          />
          {questionError ? <span className="text-destructive text-xs font-normal">Question is required.</span> : null}
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Answer
          <Textarea
            rows={4}
            placeholder="Yes, we ship to over 50 countries."
            value={answer}
            aria-invalid={answerError || undefined}
            onChange={(event) => setAnswer(event.target.value)}
          />
          {answerError ? <span className="text-destructive text-xs font-normal">Answer is required.</span> : null}
        </label>
      </div>
      <DialogFooter>
        {onDelete ? (
          <Button type="button" variant="destructive" className="sm:mr-auto" onClick={onDelete} disabled={submitting}>
            Delete
          </Button>
        ) : null}
        <Button type="button" onClick={() => void submit()} disabled={submitting}>
          {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {faq ? "Update" : "Add"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function FaqsForm({ phoneNumberId, description }: { phoneNumberId: number; description: string }) {
  const [faqs, setFaqs] = useState<FaqRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FaqRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FaqRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [csvPreview, setCsvPreview] = useState<CsvPreview | null>(null);
  const [skipFirstRow, setSkipFirstRow] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;

    async function loadFaqs() {
      try {
        const response = await apiFetch<Faq[] | { faqs?: Faq[] | null } | null>(`v1/wa/phone-numbers/${phoneNumberId}/business-agent/faqs`);
        const list = Array.isArray(response) ? response : response?.faqs ?? [];
        if (active) {
          setFaqs(list.map((faq) => toFaqRow({ id: faq.id, question: faq.question ?? "", answer: faq.answer ?? "" })));
        }
      } catch (error) {
        if (active) setLoadError(toApiError(error).message);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadFaqs();
    return () => {
      active = false;
    };
  }, [phoneNumberId]);

  const filteredFaqs = useMemo(() => {
    const indexed = faqs.map((faq, index) => ({ faq, index }));
    const query = search.trim().toLowerCase();
    if (!query) return indexed;
    return indexed.filter(({ faq }) =>
      faq.question.toLowerCase().includes(query) || faq.answer.toLowerCase().includes(query),
    );
  }, [faqs, search]);

  const csvResult = useMemo(
    () => (csvPreview ? rowsToFaqs(skipFirstRow ? csvPreview.rows.slice(1) : csvPreview.rows) : null),
    [csvPreview, skipFirstRow],
  );
  const csvTooMany = (csvResult?.faqs.length ?? 0) > MAX_CSV_ROWS;

  function openDialog(faq: FaqRow | null) {
    setEditingFaq(faq);
    setDialogOpen(true);
  }

  async function submitFaq(values: FaqValues) {
    if (editingFaq) {
      try {
        await apiFetch(`v1/wa/phone-numbers/${phoneNumberId}/business-agent/faqs/${encodeURIComponent(String(editingFaq.id))}`, {
          method: "PUT",
          body: values,
        });
        setFaqs((current) => current.map((faq) => (faq.key === editingFaq.key ? { ...faq, ...values } : faq)));
        setDialogOpen(false);
        toast.success("FAQ updated.");
      } catch (error) {
        toast.error(toApiError(error).message);
      }
      return;
    }
    try {
      const created = await apiFetch<{ id: number | string }>(`v1/wa/phone-numbers/${phoneNumberId}/business-agent/faqs`, {
        method: "POST",
        body: values,
      });
      setFaqs((current) => [...current, toFaqRow({ ...values, id: created.id })]);
      setDialogOpen(false);
      toast.success("FAQ added.");
    } catch (error) {
      toast.error(toApiError(error).message);
    }
  }

  function openCsvDialog() {
    setCsvPreview(null);
    setCsvDialogOpen(true);
  }

  async function selectCsv(file: File) {
    if (file.size > MAX_CSV_BYTES) {
      toast.error("CSV file must be 1 MB or smaller.");
      return;
    }
    const rows = readCsvRows(await file.text());
    if (rows.length === 0) {
      toast.error("No rows found in this CSV file.");
      return;
    }
    setCsvPreview({ fileName: file.name, rows });
  }

  async function importCsv() {
    if (importing || !csvResult || csvTooMany || csvResult.faqs.length === 0) return;
    const rows = csvResult.faqs;
    setImporting(true);
    setImportedCount(0);
    let imported = 0;
    try {
      for (const values of rows) {
        const created = await apiFetch<{ id: number | string }>(`v1/wa/phone-numbers/${phoneNumberId}/business-agent/faqs`, {
          method: "POST",
          body: values,
        });
        setFaqs((current) => [...current, toFaqRow({ ...values, id: created.id })]);
        imported++;
        setImportedCount(imported);
      }
      setCsvDialogOpen(false);
      setCsvPreview(null);
      toast.success(`Imported ${imported} FAQ${imported === 1 ? "" : "s"}.`);
    } catch (error) {
      // Keep only the rows that were not created so Import can be retried.
      setCsvPreview((current) =>
        current ? { ...current, rows: rows.slice(imported).map((faq) => [faq.question, faq.answer]) } : current,
      );
      setSkipFirstRow(false);
      toast.error(`Imported ${imported} of ${rows.length} FAQs. ${toApiError(error).message}`);
    } finally {
      setImporting(false);
    }
  }

  function requestDelete(faq: FaqRow) {
    setDialogOpen(false);
    setDeleteTarget(faq);
  }

  async function confirmDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await apiFetch(`v1/wa/phone-numbers/${phoneNumberId}/business-agent/faqs/${encodeURIComponent(String(deleteTarget.id))}`, {
        method: "DELETE",
      });
      setFaqs((current) => current.filter((faq) => faq.key !== deleteTarget.key));
      setDeleteTarget(null);
      toast.success("FAQ deleted.");
    } catch (error) {
      toast.error(toApiError(error).message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="mb-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">FAQs</h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" size="sm" className="shrink-0">
                Add FAQ
                <ChevronDown className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => openDialog(null)}>
                Enter manually
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={openCsvDialog}>
                Import CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
        <div className="space-y-4">
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
                  placeholder="Search FAQs"
                  aria-label="Search FAQs"
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
            {filteredFaqs.length === 0 ? (
              <div className="flex min-h-32 flex-col items-center justify-center gap-2 p-6 text-center">
                <p className="text-muted-foreground text-base">
                  {search ? "No FAQs found." : "No FAQs yet."}
                </p>
                {search ? (
                  <Button type="button" size="sm" variant="outline" onClick={() => setSearch("")}>
                    Reset filter
                  </Button>
                ) : null}
              </div>
            ) : (
              filteredFaqs.map(({ faq, index }) => (
                <button
                  key={faq.key}
                  type="button"
                  onClick={() => openDialog(faq)}
                  className="hover:bg-accent/60 flex w-full min-w-0 cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors"
                >
                  <span className="bg-accent text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-medium tabular-nums">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium leading-5 mb-1">{faq.question}</p>
                    <p className="text-muted-foreground line-clamp-2 text-sm">{faq.answer}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      <FaqDialog
        open={dialogOpen}
        faq={editingFaq}
        onOpenChange={setDialogOpen}
        onSubmit={submitFaq}
        onDelete={requestDelete}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void selectCsv(file);
        }}
      />

      <Dialog
        open={csvDialogOpen}
        onOpenChange={(open) => {
          if (!importing) setCsvDialogOpen(open);
        }}
      >
        <DialogContent className={csvPreview ? "max-h-[90vh] sm:max-w-[90vw]" : undefined}>
          <DialogHeader>
            <DialogTitle>Import FAQs from CSV</DialogTitle>
            <DialogDescription>
              The first column is used as the question and the second column as the answer. Rows
              missing either value are skipped. Up to {MAX_CSV_ROWS} FAQs, 1 MB max.
            </DialogDescription>
          </DialogHeader>
          <label className="flex w-fit cursor-pointer items-center gap-2 text-sm">
            <Checkbox
              checked={skipFirstRow}
              onChange={(event) => setSkipFirstRow(event.target.checked)}
              disabled={importing}
            />
            Skip first row
          </label>
          {csvPreview && csvResult ? (
            <div className="grid min-w-0 gap-2">
              <p className="text-sm">
                <span className="font-medium break-all">{csvPreview.fileName}</span>
                <span className="text-muted-foreground">
                  {" "}
                  · {csvResult.faqs.length} FAQ{csvResult.faqs.length === 1 ? "" : "s"} to import
                  {csvResult.skipped ? `, ${csvResult.skipped} skipped` : ""}
                </span>
              </p>
              {csvTooMany ? (
                <p className="text-destructive text-sm">
                  This file has more than {MAX_CSV_ROWS} FAQs. Split it into smaller files.
                </p>
              ) : null}
              <div className="max-h-[50vh] rounded-md border !overflow-auto">
                <Table containerClassName="overflow-visible">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="bg-background sticky top-0 z-10 w-12">#</TableHead>
                      <TableHead className="bg-background sticky top-0 z-10">Question</TableHead>
                      <TableHead className="bg-background sticky top-0 z-10">Answer</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvResult.faqs.map((faq, index) => (
                      <TableRow key={index}>
                        <TableCell className="text-muted-foreground align-top tabular-nums">{index + 1}</TableCell>
                        <TableCell className="max-w-64 align-top font-medium whitespace-normal break-words">{faq.question}</TableCell>
                        <TableCell className="max-w-80 align-top whitespace-normal break-words">{faq.answer}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            {csvPreview ? (
              <Button
                type="button"
                variant="outline"
                className="sm:mr-auto"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
              >
                Choose another file
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={() => setCsvDialogOpen(false)} disabled={importing}>
              Cancel
            </Button>
            {csvResult ? (
              <Button
                type="button"
                onClick={() => void importCsv()}
                disabled={importing || csvTooMany || csvResult.faqs.length === 0}
              >
                {importing ? <Loader2 className="size-4 animate-spin" /> : null}
                {importing ? `Importing ${importedCount}/${csvResult.faqs.length}...` : "Import"}
              </Button>
            ) : (
              <Button type="button" onClick={() => fileInputRef.current?.click()}>
                Select CSV
              </Button>
            )}
          </DialogFooter>
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
            <DialogTitle>Delete FAQ?</DialogTitle>
            <DialogDescription>
              The agent will no longer use this FAQ. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteTarget ? (
            <p className="bg-muted rounded-md px-3 py-2 text-sm font-medium break-words">{deleteTarget.question}</p>
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
