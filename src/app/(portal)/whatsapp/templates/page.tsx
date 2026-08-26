import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteTemplateButton } from "@/components/whatsapp/delete-template-button";
import { TemplateStatusBadge } from "@/components/whatsapp/template-status-badge";
import { ViewTemplateButton } from "@/components/whatsapp/view-template-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import type { Template } from "@/lib/api/types";
import { MEDIUM_BUTTON_HEIGHT } from "@/lib/utils";

export const metadata: Metadata = { title: "Templates" };

function qualityVariant(score?: string) {
  switch (score?.toUpperCase()) {
    case "GREEN":
      return "default" as const;
    case "RED":
      return "destructive" as const;
    default:
      return "secondary" as const;
  }
}

export default async function TemplatesPage() {
  let templates: Template[] = [];
  let loadError: string | null = null;
  try {
    templates = (await serverFetch<Template[]>("/wa/v1/templates")) ?? [];
  } catch (error) {
    loadError =
      error instanceof ApiError ? error.message : "Could not load your message templates.";
  }

  return (
    <>
      <PageHeader
        title="Message templates"
        description="WhatsApp message templates from your business accounts, as approved by Meta."
        action={
          <Button asChild className={MEDIUM_BUTTON_HEIGHT}>
            <Link href="/whatsapp/templates/new">Create template</Link>
          </Button>
        }
      />

      {loadError ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}

      {!loadError && templates.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No templates yet</CardTitle>
            <CardDescription>
              Templates created in WhatsApp Manager will appear here once Meta has reviewed
              them.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {templates.length > 0 ? (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Quality</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.name || "—"}</TableCell>
                    <TableCell>{template.category || "—"}</TableCell>
                    <TableCell>{template.language || "—"}</TableCell>
                    <TableCell>
                      <TemplateStatusBadge
                        status={template.status}
                        reason={template.rejected_reason}
                      />
                    </TableCell>
                    <TableCell>
                      {template.quality_score?.score ? (
                        <Badge variant={qualityVariant(template.quality_score.score)}>
                          {template.quality_score.score}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <ViewTemplateButton template={template} />
                        <DeleteTemplateButton
                          id={template.id}
                          metaWabaId={template.meta_waba_id ?? ""}
                          name={template.name ?? ""}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
