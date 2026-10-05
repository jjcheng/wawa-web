"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Loader2, Search, X } from "lucide-react";

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
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import { toast } from "@/lib/toast";

const SUPPORTED_EXTENSIONS = ["pdf", "doc", "docx", "png", "jpg", "jpeg", "csv", "xlsx"];
const MAX_FILE_BYTES = 15 * 1024 * 1024;

type BusinessAgentFile = {
  id?: number | string;
  name?: string;
  file_name?: string;
  filename?: string;
  mime_type?: string;
  size?: number;
  status?: string;
  created_at?: string;
};

function fileName(file: BusinessAgentFile) {
  return file.name || file.file_name || file.filename || "Untitled file";
}

function formatSize(bytes?: number) {
  if (bytes == null || !Number.isFinite(bytes)) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function validateFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!file.name.includes(".") || !SUPPORTED_EXTENSIONS.includes(extension)) {
    return "Unsupported file format.";
  }
  if (file.size > MAX_FILE_BYTES) return "File must be 15 MB or smaller.";
  if (file.size === 0) return "File is empty.";
  return null;
}

function AddFileDialogBody({
  phoneNumberId,
  onCancel,
  onAdded,
}: {
  phoneNumberId: number;
  onCancel: () => void;
  onAdded: (file: BusinessAgentFile) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  function selectFile(file: File) {
    const validationError = validateFile(file);
    setSelected(validationError ? null : file);
    setError(validationError);
  }

  async function upload() {
    if (!selected || uploading) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file_name", selected.name);
      formData.append("file", selected, selected.name);
      // Serialize via Response to get the multipart boundary in the content type.
      const encoded = new Response(formData);
      const response = await apiFetch<BusinessAgentFile | null>(`v1/wa/phone-numbers/${phoneNumberId}/business-agent/files`, {
        method: "POST",
        rawBody: await encoded.arrayBuffer(),
        contentType: encoded.headers.get("content-type") ?? undefined,
      });
      onAdded({ file_name: selected.name, size: selected.size, ...response });
      toast.success("File added.");
    } catch (uploadError) {
      toast.error(toApiError(uploadError).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add file</DialogTitle>
        <DialogDescription>
          Supported formats: {SUPPORTED_EXTENSIONS.map((extension) => extension.toUpperCase()).join(", ")}. Max 15 MB.
        </DialogDescription>
      </DialogHeader>
      <input
        ref={inputRef}
        type="file"
        accept={SUPPORTED_EXTENSIONS.map((extension) => `.${extension}`).join(",")}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) selectFile(file);
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="hover:bg-accent/60 flex w-full min-w-0 items-center gap-3 rounded-lg border border-dashed px-4 py-4 text-left transition-colors disabled:opacity-60"
      >
        <span className="bg-accent text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-full">
          <FileText className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{selected ? selected.name : "Select a file"}</span>
          <span className="text-muted-foreground block text-sm">
            {selected ? formatSize(selected.size) : "Click to browse your device"}
          </span>
        </span>
      </button>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={uploading}>
          Cancel
        </Button>
        <Button type="button" onClick={() => void upload()} disabled={!selected || uploading}>
          {uploading ? <Loader2 className="size-4 animate-spin" /> : null}
          Upload
        </Button>
      </DialogFooter>
    </>
  );
}

export function FilesList({ phoneNumberId, description }: { phoneNumberId: number; description: string }) {
  const [files, setFiles] = useState<BusinessAgentFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [viewFile, setViewFile] = useState<BusinessAgentFile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BusinessAgentFile | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadFiles() {
      try {
        const response = await apiFetch<BusinessAgentFile[] | { files?: BusinessAgentFile[] | null } | null>(
          `v1/wa/phone-numbers/${phoneNumberId}/business-agent/files`,
        );
        if (active) setFiles(Array.isArray(response) ? response : response?.files ?? []);
      } catch (error) {
        if (active) setLoadError(toApiError(error).message);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadFiles();
    return () => {
      active = false;
    };
  }, [phoneNumberId]);

  const filteredFiles = useMemo(() => {
    const indexed = files.map((file, index) => ({ file, index }));
    const query = search.trim().toLowerCase();
    if (!query) return indexed;
    return indexed.filter(({ file }) => fileName(file).toLowerCase().includes(query));
  }, [files, search]);

  async function confirmDelete() {
    if (!deleteTarget || deleteTarget.id == null || deleting) return;
    setDeleting(true);
    try {
      await apiFetch(`v1/wa/phone-numbers/${phoneNumberId}/business-agent/files/${encodeURIComponent(String(deleteTarget.id))}`, {
        method: "DELETE",
      });
      setFiles((current) => current.filter((file) => file !== deleteTarget));
      setDeleteTarget(null);
      toast.success("File deleted.");
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
          <h1 className="text-2xl font-semibold tracking-tight">Files</h1>
          <Button type="button" size="sm" className="shrink-0" onClick={() => setAddOpen(true)}>
            Add file
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
                placeholder="Search files"
                aria-label="Search files"
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
          {filteredFiles.length === 0 ? (
            <div className="flex min-h-32 flex-col items-center justify-center gap-2 p-6 text-center">
              <p className="text-muted-foreground text-base">{search ? "No files found." : "No files yet."}</p>
              {search ? (
                <Button type="button" size="sm" variant="outline" onClick={() => setSearch("")}>
                  Reset filter
                </Button>
              ) : null}
            </div>
          ) : (
            filteredFiles.map(({ file, index }) => {
              const details = [file.mime_type, formatSize(file.size), file.status].filter(Boolean).join(" · ");
              return (
                <button
                  key={file.id ?? index}
                  type="button"
                  onClick={() => setViewFile(file)}
                  className="hover:bg-accent/60 flex w-full min-w-0 cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors"
                >
                  <span className="bg-accent text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-medium tabular-nums">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 truncate font-medium leading-5">{fileName(file)}</p>
                    {details ? <p className="text-muted-foreground truncate text-sm">{details}</p> : null}
                  </div>
                  {file.created_at ? (
                    <LocalDateTime value={file.created_at} className="text-muted-foreground ml-auto hidden shrink-0 text-sm sm:block" />
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          {addOpen ? (
            <AddFileDialogBody
              phoneNumberId={phoneNumberId}
              onCancel={() => setAddOpen(false)}
              onAdded={(file) => {
                setFiles((current) => [...current, file]);
                setAddOpen(false);
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={viewFile !== null} onOpenChange={(open) => !open && setViewFile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="break-all">{viewFile ? fileName(viewFile) : "File"}</DialogTitle>
            <DialogDescription>File the business agent can learn from.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            {viewFile?.id != null ? (
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  setDeleteTarget(viewFile);
                  setViewFile(null);
                }}
              >
                Delete
              </Button>
            ) : null}
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
            <DialogTitle>Delete file?</DialogTitle>
            <DialogDescription>
              The agent will no longer use this file. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteTarget ? (
            <p className="bg-muted rounded-md px-3 py-2 text-sm font-medium break-all">{fileName(deleteTarget)}</p>
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
