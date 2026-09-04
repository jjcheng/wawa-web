"use client";

import { useEffect, useRef } from "react";

export function TemplateRawPreview({
  html,
  highlightedVariable,
  variableSubstitutions,
  highlightedButton,
}: {
  html: string;
  highlightedVariable: { name: string; occurrenceIndexes: number[] } | null;
  variableSubstitutions: {
    name: string;
    occurrenceIndexes: number[];
    value: string;
  }[];
  highlightedButton: { index: number; label: string } | null;
}) {
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const preview = previewRef.current;
    if (!preview) return;
    preview.innerHTML = html;
    const pattern = /{{\s*([^}]+?)\s*}}/g;
    const variableOccurrences = new Map<string, number>();
    const walker = document.createTreeWalker(preview, NodeFilter.SHOW_TEXT);
    const matches: Text[] = [];
    let node = walker.nextNode();
    while (node) {
      if (node.textContent && pattern.test(node.textContent)) matches.push(node as Text);
      pattern.lastIndex = 0;
      node = walker.nextNode();
    }

    for (const textNode of matches) {
      const text = textNode.textContent ?? "";
      const fragment = document.createDocumentFragment();
      let offset = 0;
      for (const match of text.matchAll(pattern)) {
        fragment.append(text.slice(offset, match.index));
        const variable = match[1].trim();
        const occurrenceIndex = variableOccurrences.get(variable) ?? 0;
        variableOccurrences.set(variable, occurrenceIndex + 1);
        const substitution = variableSubstitutions.find(
          (entry) =>
            entry.name === variable && entry.occurrenceIndexes.includes(occurrenceIndex),
        );
        const replacement = substitution?.value || match[0];
        if (
          variable === highlightedVariable?.name &&
          highlightedVariable.occurrenceIndexes.includes(occurrenceIndex)
        ) {
          const mark = document.createElement("mark");
          mark.className = "rounded bg-yellow-300 px-0.5 text-black ring-2 ring-yellow-400";
          mark.textContent = replacement;
          fragment.append(mark);
        } else {
          fragment.append(replacement);
        }
        offset = (match.index ?? 0) + match[0].length;
      }
      fragment.append(text.slice(offset));
      textNode.replaceWith(fragment);
    }

    if (highlightedButton) {
      const controls = [...preview.querySelectorAll<HTMLElement>("a, button")];
      const label = highlightedButton.label.trim().toLowerCase();
      const button =
        controls.find((control) =>
          control.textContent?.trim().toLowerCase().includes(label),
        ) ?? controls[highlightedButton.index];
      if (button) {
        button.style.outline = "3px solid rgb(234 179 8)";
        button.style.outlineOffset = "-3px";
        button.style.backgroundColor = "rgb(254 249 195)";
      }
    }
  }, [highlightedButton, highlightedVariable, html, variableSubstitutions]);

  return (
    <div
      ref={previewRef}
      className="overflow-hidden [&_*]:max-w-full [&>div:first-child]:!w-auto [&>div:first-child]:!max-w-none [&>div:first-child]:!bg-transparent [&>div:first-child]:!p-0"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
