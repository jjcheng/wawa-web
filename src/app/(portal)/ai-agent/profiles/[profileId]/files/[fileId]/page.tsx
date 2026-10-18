import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { BackBar } from "@/components/back-bar";
import { MarkdownContent } from "@/components/markdown-content";
import { PageHeader } from "@/components/page-header";
import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import { requireUser } from "@/lib/auth/session";
import { BUSINESS_AGENT_ENABLED } from "@/lib/feature-flags";

export const metadata: Metadata = { title: "File" };

type FileImage = {
  index?: number;
  filename?: string;
  content_type?: string;
  presigned_url?: string;
  category?: string;
};

type ImageMetadata = { total_count?: number; images?: FileImage[] | null };

type FileDetail = {
  file_id?: number;
  filename?: string;
  url?: string;
  markdown?: {
    pages?:
      | {
          page_number: number;
          markdown?: string;
          header?: string;
          footer?: string;
          success?: boolean;
        }[]
      | null;
  } | null;
  images_content_metadata?: ImageMetadata | null;
};

type AgentKnowledge = {
  id: string;
  type: string;
  category: string;
  category_id: number;
  profile_id: number;
  title: string;
  body: string;
  reference_id: string;
  enabled: boolean;
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Markdown refers to images by file name; swap in their presigned URLs.
function resolveImages(markdown: string, images: FileImage[]) {
  let result = markdown;
  for (const image of images) {
    if (!image.filename || !image.presigned_url) continue;
    const url = image.presigned_url;
    const names = [...new Set([image.filename, encodeURI(image.filename)])]
      .map(escapeRegExp)
      .join("|");
    result = result.replace(
      new RegExp(`(?<![\\w.%-])(?:[^\\s()<>"'\\]]*/)?(?:${names})(?![\\w%-])`, "g"),
      () => url,
    );
  }
  return result;
}

export default async function AgentFilePage({
  params,
}: {
  params: Promise<{ profileId: string; fileId: string }>;
}) {
  if (!BUSINESS_AGENT_ENABLED) redirect("/chats");
  const user = await requireUser();
  if (user.type !== "MASTER") redirect("/chats");

  const { profileId, fileId } = await params;
  const id = Number(profileId);
  const fileNumber = Number(fileId);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  if (!Number.isSafeInteger(fileNumber) || fileNumber < 1) notFound();

  let file: FileDetail | null = null;
  let errorMessage: string | null = null;
  let knowledgeReferenceIds: string[] = [];
  let knowledgeErrorMessage: string | null = null;
  try {
    file = await serverFetch<FileDetail>(`/v1/ai-agent/profiles/${id}/files/${fileNumber}`);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) notFound();
    if (!(error instanceof ApiError)) throw error;
    errorMessage = error.message;
  }
  if (!errorMessage) {
    try {
      const knowledges = await serverFetch<AgentKnowledge[] | null>(
        `/v1/ai-agent/profiles/${id}/knowledges`,
      );
      if (knowledges != null) {
        if (!Array.isArray(knowledges)) {
          throw new Error("Unexpected response while loading agent knowledges.");
        }
        knowledgeReferenceIds = knowledges.map((knowledge) => knowledge.reference_id);
      }
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      knowledgeErrorMessage = error.message;
    }
  }

  return (
    <>
      <BackBar href={`/ai-agent/profiles/${id}/files`} />
      <PageHeader title="File" description={file?.filename} />
      {errorMessage ? (
        <div
          className="border-destructive/40 bg-destructive/5 text-destructive rounded-md border p-3 text-sm"
          role="alert"
        >
          {errorMessage}
        </div>
      ) : (
        <>
          {knowledgeErrorMessage ? (
            <div
              className="border-destructive/40 bg-destructive/5 text-destructive mt-4 rounded-md border p-3 text-sm"
              role="alert"
            >
              {knowledgeErrorMessage}
            </div>
          ) : null}
          <FileContent
            file={file}
            indexedReferenceIds={new Set(knowledgeReferenceIds)}
            fileId={fileNumber}
          />
        </>
      )}
    </>
  );
}

function FileContent({
  file,
  fileId,
  indexedReferenceIds,
}: {
  file: FileDetail | null;
  fileId: number;
  indexedReferenceIds: Set<string>;
}) {
  const pages = file?.markdown?.pages ?? [];
  const images = file?.images_content_metadata?.images ?? [];

  if (pages.length === 0) {
    return (
      <div className="bg-card text-muted-foreground mt-5 rounded-lg border p-6 text-center text-sm">
        No content extracted from this file yet.
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-4">
      {file?.url ? (
        <a
          href={file.url}
          target="_blank"
          rel="noreferrer"
          className="text-primary block text-sm break-all underline underline-offset-2"
        >
          View original file
        </a>
      ) : null}
      {pages.map((page) => {
        const referenceId = `file_${fileId}_page_number_${page.page_number}`;
        const indexed = indexedReferenceIds.has(referenceId);

        return (
          <section
            key={page.page_number}
            className="bg-card min-w-0 space-y-3 rounded-lg border p-4 sm:p-6"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-muted-foreground text-sm font-medium">
                Page {page.page_number}
              </h2>
              {indexed ? (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-300">
                  Indexed
                </span>
              ) : null}
            </div>
            {page.header ? (
              <p className="text-muted-foreground text-xs">{page.header}</p>
            ) : null}
            {page.success === false ? (
              <p className="text-destructive text-sm">This page could not be processed.</p>
            ) : (
              <MarkdownContent
                content={resolveImages(page.markdown ?? "", images)}
                lazyLoadImages
              />
            )}
            {page.footer ? (
              <p className="text-muted-foreground text-xs">{page.footer}</p>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
