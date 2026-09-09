"use client";

import { useTheme } from "next-themes";

export function TemplatePreviewHtml({
  lightHtml,
  darkHtml,
  className = "",
}: {
  lightHtml?: string;
  darkHtml?: string;
  className?: string;
}) {
  const { resolvedTheme } = useTheme();
  const html = resolvedTheme === "dark" ? darkHtml || lightHtml : lightHtml || darkHtml;

  if (!html) return null;

  return (
    <div
      className={`min-w-0 overflow-hidden [&>div:first-child]:!w-auto [&>div:first-child]:!max-w-none [&>div:first-child]:!bg-transparent [&>div:first-child]:!p-0 [&_*]:max-w-full ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
