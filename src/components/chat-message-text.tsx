import type { ReactNode } from "react";

const IMAGE_EXTENSION = /\.(jpe?g|png|gif|webp|bmp|svg|tiff?|avif)$/i;
const TOKEN = /!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)|https?:\/\/[^\s<>"]+/g;

function isImageUrl(url: string) {
  try {
    return IMAGE_EXTENSION.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

/** Renders message text as-is, showing any image URLs (plain or markdown) inline. */
export function ChatMessageText({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  let last = 0;
  let key = 0;

  for (const match of text.matchAll(TOKEN)) {
    const url = match[1] ?? match[0];
    if (!isImageUrl(url)) continue;
    const start = match.index ?? 0;
    if (start > last) parts.push(text.slice(last, start));
    parts.push(
      <a key={key++} href={url} target="_blank" rel="noreferrer" className="my-1 block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt=""
          loading="lazy"
          className="max-h-80 max-w-full rounded-md object-contain"
        />
      </a>,
    );
    last = start + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));

  return <div className="break-words whitespace-pre-wrap">{parts}</div>;
}
