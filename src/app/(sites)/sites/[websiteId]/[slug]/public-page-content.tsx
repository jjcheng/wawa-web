"use client";

import { useRef, useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

export function PublicPageContent({ html }: { html: string }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [images, setImages] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  function openGallery(event: React.MouseEvent<HTMLDivElement>) {
    const target = event.target;
    if (!(target instanceof HTMLImageElement) || !contentRef.current?.contains(target)) return;

    const pageImages = [...contentRef.current.querySelectorAll("img")]
      .map((image) => image.currentSrc || image.src)
      .filter(Boolean);
    const selectedImage = target.currentSrc || target.src;
    const imageIndex = pageImages.indexOf(selectedImage);
    if (imageIndex < 0) return;

    event.preventDefault();
    setImages(pageImages);
    setSelectedIndex(imageIndex);
  }

  return (
    <>
      <div
        ref={contentRef}
        className="text-muted-foreground mt-8 cursor-pointer text-base leading-7 [&_h1]:my-3 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:my-2 [&_h2]:text-base [&_h2]:font-medium [&_img]:my-4 [&_img]:max-w-full [&_img]:rounded-md"
        onClick={openGallery}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <Lightbox
        open={selectedIndex !== null}
        index={selectedIndex ?? 0}
        close={() => setSelectedIndex(null)}
        carousel={{ finite: true }}
        controller={{ closeOnPullDown: true }}
        slides={images.map((src) => ({ src }))}
      />
    </>
  );
}
