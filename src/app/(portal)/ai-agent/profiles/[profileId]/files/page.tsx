import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { BackBar } from "@/components/back-bar";
import { PageHeader } from "@/components/page-header";
import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import { requireUser } from "@/lib/auth/session";
import { BUSINESS_AGENT_ENABLED } from "@/lib/feature-flags";
import { AddFileButton } from "./add-file-button";
import { FilesList, type AgentFile } from "./files-list";

export const metadata: Metadata = { title: "Files" };

export default async function AgentFilesPage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  if (!BUSINESS_AGENT_ENABLED) redirect("/chats");
  const user = await requireUser();
  if (user.type !== "MASTER") redirect("/chats");

  const { profileId } = await params;
  const id = Number(profileId);
  if (!Number.isSafeInteger(id) || id < 1) notFound();

  let files: AgentFile[] = [];
  let errorMessage: string | null = null;
  try {
    const response = await serverFetch<AgentFile[] | null>(
      `/v1/ai-agent/profiles/${id}/files`,
    );
    if (response != null) {
      if (!Array.isArray(response)) {
        throw new Error("Unexpected response while loading agent files.");
      }
      files = response;
    }
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) notFound();
    if (!(error instanceof ApiError)) throw error;
    errorMessage = error.message;
  }

  return (
    <>
      <BackBar href={`/ai-agent/profiles/${id}`} />
      <PageHeader
        title="Files"
        description="Files this AI agent can reference."
        action={<AddFileButton profileId={id} />}
      />
      {errorMessage ? (
        <div
          className="border-destructive/40 bg-destructive/5 text-destructive rounded-md border p-3 text-sm"
          role="alert"
        >
          {errorMessage}
        </div>
      ) : (
        <FilesList files={files} profileId={id} />
      )}
    </>
  );
}
