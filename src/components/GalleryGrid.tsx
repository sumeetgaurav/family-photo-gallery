"use client";

import { useState } from "react";
import type { GalleryPhoto } from "@/lib/photos";
import { Lightbox } from "@/components/Lightbox";

// Signed URLs are short-lived and per-request, so plain <img> is used
// instead of next/image (which would need a stable remote pattern and
// would cache a URL that's about to expire).
export function GalleryGrid({ photos }: { photos: GalleryPhoto[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {photos.map((photo, index) => (
          <div key={photo.id} className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => setOpenIndex(index)}
              className="group aspect-square overflow-hidden rounded-md bg-stone-200"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.thumbnailUrl}
                alt={photo.caption ?? "Family photo"}
                loading="lazy"
                className="h-full w-full object-cover object-top transition-transform duration-200 group-hover:scale-105"
              />
            </button>
            {photo.caption && (
              <p className="truncate text-xs text-stone-600" title={photo.caption}>
                {photo.caption}
              </p>
            )}
          </div>
        ))}
      </div>

      {openIndex !== null && (
        <Lightbox photos={photos} startIndex={openIndex} onClose={() => setOpenIndex(null)} />
      )}
    </>
  );
}
