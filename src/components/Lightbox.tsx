"use client";

import { useCallback, useEffect, useState } from "react";
import type { GalleryPhoto } from "@/lib/photos";

export function Lightbox({
  photos,
  startIndex,
  onClose,
}: {
  photos: GalleryPhoto[];
  startIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const photo = photos[index];

  const goNext = useCallback(() => {
    setIndex((current) => (current + 1) % photos.length);
  }, [photos.length]);

  const goPrev = useCallback(() => {
    setIndex((current) => (current - 1 + photos.length) % photos.length);
  }, [photos.length]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") goNext();
      if (event.key === "ArrowLeft") goPrev();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goNext, goPrev, onClose]);

  if (!photo) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {photos.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous photo"
            onClick={(event) => {
              event.stopPropagation();
              goPrev();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-white hover:bg-white/20"
          >
            &larr;
          </button>
          <button
            type="button"
            aria-label="Next photo"
            onClick={(event) => {
              event.stopPropagation();
              goNext();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-white hover:bg-white/20"
          >
            &rarr;
          </button>
        </>
      )}

      <figure
        className="flex max-h-full max-w-full flex-col items-center gap-3"
        onClick={(event) => event.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.url}
          alt={photo.caption ?? "Family photo"}
          className="block max-h-[80vh] max-w-[90vw] rounded-md object-contain"
        />
        {photo.caption && (
          <figcaption className="text-sm text-white/80">{photo.caption}</figcaption>
        )}
      </figure>
    </div>
  );
}
