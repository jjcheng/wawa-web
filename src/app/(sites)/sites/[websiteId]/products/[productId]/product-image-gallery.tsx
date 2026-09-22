"use client";

import { ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import { useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

export function ProductImageGallery({
  images,
  productName,
}: {
  images: string[];
  productName: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const hasAdditionalImages = images.length > 1;

  if (images.length === 0) return <div className="bg-muted aspect-square rounded-lg" />;

  return (
    <>
      <div className="relative aspect-square overflow-hidden rounded-lg border bg-muted">
        <button
          type="button"
          className="group size-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={`View ${productName} image ${activeIndex + 1} fullscreen`}
          onClick={() => setSelectedIndex(activeIndex)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[activeIndex]}
            alt={activeIndex === 0 ? productName : ""}
            className="size-full object-cover"
          />
          <span className="absolute right-3 top-3 rounded-md bg-black/60 p-2 text-white opacity-0 transition-opacity group-hover:opacity-100">
            <Maximize2 className="size-4" />
          </span>
        </button>
        {hasAdditionalImages ? (
          <>
            <button
              type="button"
              aria-label="Previous image"
              className="absolute left-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/85 text-foreground shadow-sm backdrop-blur hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setActiveIndex((current) => (current - 1 + images.length) % images.length)}
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              aria-label="Next image"
              className="absolute right-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/85 text-foreground shadow-sm backdrop-blur hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setActiveIndex((current) => (current + 1) % images.length)}
            >
              <ChevronRight className="size-5" />
            </button>
            <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white">
              {activeIndex + 1} / {images.length}
            </span>
          </>
        ) : null}
      </div>
      <Lightbox
        open={selectedIndex !== null}
        index={selectedIndex ?? 0}
        close={() => setSelectedIndex(null)}
        carousel={{ finite: true }}
        slides={images.map((src) => ({ src }))}
      />
    </>
  );
}