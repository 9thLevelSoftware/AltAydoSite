'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'motion/react';
import { XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { useShipDetail } from '@/hooks/useShipDetail';
import ShipImageGallery from '@/components/ships/ShipImageGallery';
import ShipSpecs from '@/components/ships/ShipSpecs';
import MobiGlasButton from '@/components/ui/mobiglas/MobiGlasButton';
import { formatProductionStatus } from '@/lib/ships/format';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ShipDetailPanelProps {
  shipId: string | null;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Map production status to a MobiGlas CSS variable colour token.
 */
function getStatusColor(status: string): string {
  switch (status) {
    case 'flight-ready':
      return '--mg-success';
    case 'in-concept':
      return '--mg-warning';
    case 'in-production':
      return '--mg-primary';
    default:
      return '--mg-text';
  }
}

// ---------------------------------------------------------------------------
// Skeleton Loader
// ---------------------------------------------------------------------------

function DetailSkeleton() {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      {/* Image skeleton */}
      <div className="aspect-[16/10] w-full rounded-sm bg-[rgba(var(--mg-primary),0.08)]" />
      {/* Thumbnail strip skeleton */}
      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="w-16 h-10 rounded-sm bg-[rgba(var(--mg-primary),0.06)]" />
        ))}
      </div>
      {/* Manufacturer skeleton */}
      <div className="flex items-center gap-2 px-0">
        <div className="w-12 h-5 rounded-sm bg-[rgba(var(--mg-primary),0.08)]" />
        <div className="w-32 h-4 rounded-sm bg-[rgba(var(--mg-primary),0.06)]" />
      </div>
      {/* Spec lines skeleton */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <div className="w-16 h-3 rounded-sm bg-[rgba(var(--mg-primary),0.06)]" />
            <div className="w-24 h-4 rounded-sm bg-[rgba(var(--mg-primary),0.08)]" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ShipDetailPanel({ shipId, onClose }: ShipDetailPanelProps) {
  const { ship, isLoading, error } = useShipDetail(shipId);
  const [descExpanded, setDescExpanded] = useState(false);

  // Close on Escape key
  useEffect(() => {
    if (!shipId) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shipId, onClose]);

  // Reset description collapse state when a new ship is selected
  useEffect(() => {
    setDescExpanded(false);
  }, [shipId]);

  // Prevent body scroll when panel is open
  useEffect(() => {
    if (shipId) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [shipId]);

  const handleBackdropClick = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <AnimatePresence>
      {shipId && (
        <>
          {/* Backdrop Overlay */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={handleBackdropClick}
          />

          {/* Slide-out Panel */}
          <motion.div
            key="panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed right-0 top-0 bottom-0 w-[480px] max-w-full z-[60] bg-[rgba(var(--mg-background),0.95)] border-l border-[rgba(var(--mg-primary),0.3)] overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-[rgba(var(--mg-background),0.95)] backdrop-blur-sm flex justify-between items-center p-4 border-b border-[rgba(var(--mg-primary),0.2)]">
              <h2 className="text-[rgba(var(--mg-primary),0.9)] text-lg font-quantify truncate mr-2">
                {ship?.name ?? 'Loading...'}
              </h2>
              <MobiGlasButton
                variant="ghost"
                size="sm"
                onClick={onClose}
                aria-label="Close detail panel"
              >
                <XMarkIcon className="w-5 h-5" />
              </MobiGlasButton>
            </div>

            {/* Panel Body */}
            {isLoading && <DetailSkeleton />}

            {error && (
              <div className="p-4 space-y-2">
                <p className="text-[rgba(var(--mg-danger),0.9)] text-sm">
                  {error}
                </p>
                <p className="text-[rgba(var(--mg-text),0.5)] text-xs">
                  Try selecting the ship again, or check your connection.
                </p>
              </div>
            )}

            {ship && !isLoading && (
              <div className="flex flex-col">
                {/* Image Gallery */}
                <div className="p-4">
                  <ShipImageGallery images={ship.images} shipName={ship.name} />
                </div>

                {/* Manufacturer + Status Bar */}
                <div className="flex items-center gap-3 px-4 pb-2">
                  {ship.manufacturer.logo ? (
                    <Image
                      src={ship.manufacturer.logo}
                      alt={ship.manufacturer.name}
                      width={20}
                      height={20}
                      className="object-contain flex-shrink-0"
                    />
                  ) : null}
                  <span className="bg-[rgba(var(--mg-primary),0.1)] text-[rgba(var(--mg-primary),0.8)] px-2 py-0.5 text-xs font-mono rounded-sm">
                    {ship.manufacturer.code}
                  </span>
                  <span className="text-[rgba(var(--mg-text),0.7)] text-sm">
                    {ship.manufacturer.name}
                  </span>
                  <span
                    className="ml-auto text-xs px-2 py-0.5 rounded-sm border"
                    style={{
                      color: `rgba(var(${getStatusColor(ship.productionStatus)}),0.9)`,
                      borderColor: `rgba(var(${getStatusColor(ship.productionStatus)}),0.3)`,
                      backgroundColor: `rgba(var(${getStatusColor(ship.productionStatus)}),0.1)`,
                    }}
                  >
                    {formatProductionStatus(ship.productionStatus)}
                  </span>
                </div>

                {/* Specs Section */}
                <div className="p-4 pt-2">
                  <ShipSpecs ship={ship} />
                </div>

                {/* Description Section (Collapsible) */}
                {ship.description && (
                  <div className="border-t border-[rgba(var(--mg-primary),0.15)]">
                    <button
                      type="button"
                      onClick={() => setDescExpanded((prev) => !prev)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-[rgba(var(--mg-primary),0.05)] transition-colors"
                    >
                      <span className="text-[rgba(var(--mg-text),0.7)] text-sm font-quantify uppercase tracking-wider">
                        Description
                      </span>
                      <motion.span
                        animate={{ rotate: descExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDownIcon className="w-4 h-4 text-[rgba(var(--mg-text),0.5)]" />
                      </motion.span>
                    </button>
                    <AnimatePresence initial={false}>
                      {descExpanded && (
                        <motion.div
                          key="description"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <p className="text-[rgba(var(--mg-text),0.7)] text-sm leading-relaxed px-4 pb-4">
                            {ship.description}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Store URL Link */}
                {ship.storeUrl && (
                  <div className="p-4 border-t border-[rgba(var(--mg-primary),0.15)]">
                    <a
                      href={ship.storeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[rgba(var(--mg-primary),0.7)] text-xs hover:text-[rgba(var(--mg-primary),1)] transition-colors underline underline-offset-2"
                    >
                      View on RSI Store
                    </a>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
