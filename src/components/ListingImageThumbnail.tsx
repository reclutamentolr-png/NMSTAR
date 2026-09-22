'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

// Community listing photos were fixed-crop and inert (no way to see the
// full image) — this adds a click-to-enlarge lightbox without changing the
// card's compact thumbnail layout.
export default function ListingImageThumbnail({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className="mb-3 h-40 cursor-zoom-in overflow-hidden rounded-lg bg-gray-100"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="h-full w-full object-cover transition-transform hover:scale-105" />
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setOpen(false)}
        >
          <button
            onClick={() => setOpen(false)}
            aria-label="Chiudi"
            className="absolute right-4 top-4 text-white transition-colors hover:text-gray-300"
          >
            <X className="h-8 w-8" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
          />
        </div>
      )}
    </>
  )
}
