'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ProductImageGalleryProps {
  images: string[];
  alt: string;
  fallback?: React.ReactNode;
}

export default function ProductImageGallery({
  images,
  alt,
  fallback,
}: ProductImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const touchRef = useRef<HTMLDivElement>(null);

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  if (!images || images.length === 0) {
    return (
      <div className="w-full aspect-4/3 rounded-site bg-card-bg border border-stroke flex items-center justify-center">
        {fallback || <span className="text-secondary">No Image</span>}
      </div>
    );
  }

  const hasMultiple = images.length > 1;

  const goTo = (index: number) => {
    if (index < 0) setSelectedIndex(images.length - 1);
    else if (index >= images.length) setSelectedIndex(0);
    else setSelectedIndex(index);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      goTo(selectedIndex + 1);
    } else if (isRightSwipe) {
      goTo(selectedIndex - 1);
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Main Image */}
      <div
        ref={touchRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="relative w-full aspect-4/3 rounded-site overflow-hidden border border-stroke group touch-pan-y"
      >
        <Image
          src={images[selectedIndex]}
          alt={alt}
          fill
          className="object-cover transition-opacity"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
          unoptimized
        />

        {/* Nav Arrows */}
        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={() => goTo(selectedIndex - 1)}
              className="absolute start-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
              aria-label="Previous image"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => goTo(selectedIndex + 1)}
              className="absolute end-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
              aria-label="Next image"
            >
              <ChevronRight size={18} />
            </button>

            {/* Dots */}
            <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-1.5">
              {images.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setSelectedIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === selectedIndex
                      ? 'bg-white w-4'
                      : 'bg-white/50 hover:bg-white/70'
                  }`}
                  aria-label={`Image ${index + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {hasMultiple && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((image, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setSelectedIndex(index)}
              className={`relative w-16 h-16 rounded-lg overflow-hidden shrink-0 border-2 transition-colors ${
                index === selectedIndex
                  ? 'border-success'
                  : 'border-stroke hover:border-success/50'
              }`}
            >
              <Image
                src={image}
                alt={`${alt} ${index + 1}`}
                fill
                className="object-cover"
                sizes="64px"
                unoptimized
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
