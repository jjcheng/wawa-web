import type { ReactNode } from "react";

export function formatWhatsAppText(value: string) {
  const parts: ReactNode[] = [];
  let remaining = value;
  let key = 0;

  while (remaining.length > 0) {
    if (remaining.startsWith("```")) {
      const closingIndex = remaining.indexOf("```", 3);
      if (closingIndex >= 0) {
        parts.push(
          <code
            key={key++}
            className="rounded bg-black/10 px-1 font-mono text-[0.9em] dark:bg-white/10"
          >
            {remaining.slice(3, closingIndex)}
          </code>,
        );
        remaining = remaining.slice(closingIndex + 3);
        continue;
      }
    }

    const marker = remaining[0];
    if (marker === "*" || marker === "_" || marker === "~") {
      const closingIndex = remaining.indexOf(marker, 1);
      if (closingIndex > 1) {
        const content = remaining.slice(1, closingIndex);
        if (marker === "*") {
          parts.push(<strong key={key++}>{content}</strong>);
        } else if (marker === "_") {
          parts.push(<em key={key++}>{content}</em>);
        } else {
          parts.push(<del key={key++}>{content}</del>);
        }
        remaining = remaining.slice(closingIndex + 1);
        continue;
      }
    }

    const nextSpecial = remaining.search(/[\*_~`]/);
    const textLength = nextSpecial < 0 ? remaining.length : nextSpecial === 0 ? 1 : nextSpecial;
    parts.push(remaining.slice(0, textLength));
    remaining = remaining.slice(textLength);
  }

  return parts;
}