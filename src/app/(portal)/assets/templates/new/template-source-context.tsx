"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { SampleTemplate } from "@/lib/api/types";

const TemplateSourceContext = createContext<SampleTemplate | null>(null);

export function TemplateSourceProvider({
  sampleTemplate,
  children,
}: {
  sampleTemplate: SampleTemplate | null;
  children: ReactNode;
}) {
  return <TemplateSourceContext value={sampleTemplate}>{children}</TemplateSourceContext>;
}

export function useSelectedSampleTemplate() {
  return useContext(TemplateSourceContext);
}
