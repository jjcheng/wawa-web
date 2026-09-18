"use client";

import { ExternalLink } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useState } from "react";
import { toast } from "@/lib/toast";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import type { SampleTemplate } from "@/lib/api/types";
import type { Template } from "@/lib/api/types";
import { whatsappLanguageLabel } from "@/lib/whatsapp-languages";
import { TemplateSourceProvider } from "./template-source-context";
import { TemplatePreviewHtml } from "@/components/template-preview-html";

export function TemplateSourceTabs({
  newTemplate,
  managerUrl,
  sampleTemplates,
  sampleLoadError,
}: {
  newTemplate: ReactNode;
  managerUrl: string | null;
  sampleTemplates: SampleTemplate[];
  sampleLoadError: string | null;
}) {
  const [selectedSample, setSelectedSample] = useState<SampleTemplate | null>(null);
  const [sampleName, setSampleName] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createdTemplateUrl, setCreatedTemplateUrl] = useState<string | null>(null);
  const normalizedSampleName = sampleName.trim();
  const sampleNameError = !normalizedSampleName
    ? "Enter a new template name."
    : !/^[a-z0-9_]+$/.test(normalizedSampleName)
      ? "Use lowercase letters, numbers and underscores only."
      : normalizedSampleName === selectedSample?.name?.trim()
        ? "The new name must be different from the sample template name."
        : null;
  const managerLink = managerUrl ? (
    <a
      href={managerUrl}
      target="_blank"
      rel="noreferrer"
      className="text-foreground inline-flex items-center gap-1 font-semibold underline underline-offset-2"
    >
      WhatsApp Manager
      <ExternalLink className="size-3.5" />
    </a>
  ) : (
    "WhatsApp Manager"
  );

  const createMutation = useMutation({
    mutationFn: () => {
      if (!selectedSample) throw new Error("Select a sample template first.");
      return apiFetch<Template>("v1/wa/templates/from-sample", {
        method: "POST",
        body: {
          sample_template_id: selectedSample.id,
          name: sampleName.trim(),
        },
      });
    },
    onSuccess: (template) => {
      setCreatedTemplateUrl(template.meta_edit_template_url ?? null);
      toast.success("Template created.");
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  return (
    <>
      <TemplateSourceProvider sampleTemplate={selectedSample}>
        <Tabs
          defaultValue="library"
          onValueChange={(value) => {
            if (value === "library") setSelectedSample(null);
          }}
        >
          <TabsList className="mb-4">
            <TabsTrigger className="cursor-pointer" value="library">
              From Sample
            </TabsTrigger>
            <TabsTrigger className="cursor-pointer" value="new">
              Create New
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="space-y-4">
            {sampleLoadError ? (
              <p className="text-destructive text-sm">{sampleLoadError}</p>
            ) : null}
            <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
              {sampleTemplates.map((template) => (
                <div
                  key={template.id}
                  className="mb-4 inline-block w-full break-inside-avoid space-y-3 rounded-lg border p-4 align-top"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">
                      {template.name || "Unnamed template"}
                    </p>
                    <Badge variant="secondary">{template.category || "—"}</Badge>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {whatsappLanguageLabel(template.language) || "—"}
                  </p>
                  {template.preview_html || template.preview_dark_html ? (
                    <TemplatePreviewHtml
                      lightHtml={template.preview_html}
                      darkHtml={template.preview_dark_html}
                    />
                  ) : null}
                  <Button
                    size="sm"
                    variant="default"
                    className="w-full"
                    onClick={() => {
                      setSelectedSample(template);
                      setSampleName("");
                      setCreatedTemplateUrl(null);
                      setCreateDialogOpen(true);
                    }}
                  >
                    Use This Template
                  </Button>
                </div>
              ))}
              {sampleTemplates.length === 0 && !sampleLoadError ? (
                <p className="text-muted-foreground text-sm">No sample templates available.</p>
              ) : null}
            </div>
          </TabsContent>

          <TabsContent value="new" className="space-y-4">
            <Card>
              <CardContent>
                <p className="text-muted-foreground mb-4 text-sm">
                  For complete template creation features, use {managerLink}, this is
                  recommended by Meta. Use this page only to create a simple templates with no
                  variable.
                </p>
                {newTemplate}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </TemplateSourceProvider>
      <Dialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          if (!createMutation.isPending) setCreateDialogOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create from sample template</DialogTitle>
            <DialogDescription>
              We will create a template same as the sample template, you have to go to WhatsApp
              Manager to edit the components.
            </DialogDescription>
          </DialogHeader>
          {createdTemplateUrl ? (
            <Button asChild className="w-full">
              <a href={createdTemplateUrl} target="_blank" rel="noreferrer">
                Go to WhatsApp Manager
                <ExternalLink className="size-4" />
              </a>
            </Button>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="sample-template-name">New template name</Label>
              <Input
                id="sample-template-name"
                value={sampleName}
                onChange={(event) => setSampleName(event.target.value.replace(/\s/g, "_"))}
                placeholder="my_template_name"
                disabled={createMutation.isPending}
              />
              {sampleNameError ? (
                <p className="text-destructive text-sm">{sampleNameError}</p>
              ) : null}
            </div>
          )}
          {!createdTemplateUrl ? (
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={Boolean(sampleNameError) || createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Create template"}
              </Button>
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
