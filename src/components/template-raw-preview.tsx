"use client";

import { useEffect, useRef } from "react";

export function TemplateRawPreview({
  html,
  highlightedVariable,
  variableSubstitutions,
  highlightedButton,
  location,
}: {
  html: string;
  highlightedVariable: { name: string; occurrenceIndexes: number[] } | null;
  variableSubstitutions: {
    name: string;
    occurrenceIndexes: number[];
    value: string;
  }[];
  highlightedButton: { index: number; label: string } | null;
  location?: {
    name: string;
    address: string;
    latitude?: number;
    longitude?: number;
  } | null;
}) {
  const previewRef = useRef<HTMLDivElement>(null);
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

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

    if (location) {
      const locationMap = preview.querySelector<HTMLImageElement>('img[alt="Location map"]');
      const locationFields = locationMap?.nextElementSibling?.querySelectorAll(":scope > div");
      if (
        locationMap &&
        googleMapsApiKey &&
        Number.isFinite(location.latitude) &&
        Number.isFinite(location.longitude)
      ) {
        const coordinates = `${location.latitude},${location.longitude}`;
        const mapUrl = new URL("https://maps.googleapis.com/maps/api/staticmap");
        mapUrl.searchParams.set("center", coordinates);
        mapUrl.searchParams.set("zoom", "15");
        mapUrl.searchParams.set("size", "500x500");
        mapUrl.searchParams.set("maptype", "roadmap");
        mapUrl.searchParams.set("markers", `color:red|${coordinates}`);
        mapUrl.searchParams.set("key", googleMapsApiKey);
        locationMap.src = mapUrl.toString();
      }
      if (locationFields?.[0]) locationFields[0].textContent = location.name;
      if (locationFields?.[1]) locationFields[1].textContent = location.address;
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
  }, [
    googleMapsApiKey,
    highlightedButton,
    highlightedVariable,
    html,
    location,
    variableSubstitutions,
  ]);

  return (
    <div
      ref={previewRef}
      className="overflow-hidden [&_*]:max-w-full [&>div:first-child]:!w-auto [&>div:first-child]:!max-w-none [&>div:first-child]:!bg-transparent [&>div:first-child]:!p-0"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
