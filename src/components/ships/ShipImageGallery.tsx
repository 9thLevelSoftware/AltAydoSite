'use client';

import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'motion/react';
import { resolveShipImage, getShipPlaceholder } from '@/lib/ships/image';
import type { ShipImages, ShipImageView } from '@/lib/ships/image';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ShipImageGalleryProps {
  images: ShipImages;
  shipName: string;
}

/** Available view angles with display labels */
const views: { view: ShipImageView; label: string }[] = [
  { view: 'angled', label: 'Angled' },
  { view: 'side', label: 'Side' },
  { view: 'top', label: 'Top' },
  { view: 'store', label: 'Store' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ShipImageGallery({ images, shipName }: ShipImageGalleryProps) {
  const [activeView, setActiveView] = useState<ShipImageView>('angled');
  const [mainSrc, setMainSrc] = useState(() => resolveShipImage(images, 'angled'));

  // When view changes, resolve the new image URL
  const handleViewChange = useCallback(
    (view: ShipImageView) => {
      setActiveView(view);
      setMainSrc(resolveShipImage(images, view));
    },
    [images],
  );

  const handleMainError = useCallback(() => {
    setMainSrc(getShipPlaceholder());
  }, []);

  return (
    <div className="space-y-3">
      {/* Main Image */}
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-sm bg-[rgba(var(--mg-dark),0.6)]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0"
          >
            <Image
              src={mainSrc}
              alt={`${shipName} - ${activeView} view`}
              fill
              className="object-contain"
              sizes="480px"
              loading="eager"
              onError={handleMainError}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Thumbnail Strip */}
      <div className="flex justify-center gap-2">
        {views.map(({ view, label }) => {
          const isActive = activeView === view;
          return (
            <button
              key={view}
              type="button"
              onClick={() => handleViewChange(view)}
              className="flex flex-col items-center gap-1 group"
            >
              <div
                className={`
                  relative w-16 h-10 overflow-hidden rounded-sm border-2 transition-colors
                  ${isActive
                    ? 'border-[rgba(var(--mg-primary),0.8)]'
                    : 'border-[rgba(var(--mg-primary),0.2)] hover:border-[rgba(var(--mg-primary),0.4)]'
                  }
                `}
              >
                <Image
                  src={resolveShipImage(images, view)}
                  alt={`${shipName} - ${label}`}
                  fill
                  className="object-cover"
                  sizes="64px"
                  loading="eager"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    target.src = getShipPlaceholder();
                  }}
                />
              </div>
              <span
                className={`
                  text-[10px] uppercase tracking-wider transition-colors
                  ${isActive
                    ? 'text-[rgba(var(--mg-primary),0.8)]'
                    : 'text-[rgba(var(--mg-text),0.5)] group-hover:text-[rgba(var(--mg-text),0.7)]'
                  }
                `}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
