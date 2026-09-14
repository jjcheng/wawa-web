"use client";

export function TemplatePreviewHtml({
  lightHtml,
  darkHtml,
  className = "",
}: {
  lightHtml?: string;
  darkHtml?: string;
  className?: string;
}) {
  if (!lightHtml && !darkHtml) return null;

  const baseClass =
    "min-w-0 overflow-hidden [&>div:first-child]:!w-auto [&>div:first-child]:!max-w-none [&>div:first-child]:!bg-transparent [&>div:first-child]:!p-0 [&_*]:max-w-full";

  if (lightHtml && darkHtml && lightHtml !== darkHtml) {
    return (
      <div className={className}>
        <div
          className={`dark:hidden ${baseClass}`}
          dangerouslySetInnerHTML={{ __html: lightHtml }}
        />
        <div
          className={`hidden dark:block ${baseClass}`}
          dangerouslySetInnerHTML={{ __html: darkHtml }}
        />
      </div>
    );
  }

  const html = lightHtml || darkHtml || "";

  return (
    <div className={className}>
      <div
        className={baseClass}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
