'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'motion/react';
import { resolveShipImage } from '@/lib/ships/image';
import { formatCrew, formatCargo, formatSpeed, formatProductionStatus, formatSize } from '@/lib/ships/format';
import type { UserShip } from '@/types/user';
import type { ShipDocument } from '@/types/ship';

interface ProfileShipCardProps {
  ship: UserShip;
  resolved: ShipDocument | undefined;
}

export default function ProfileShipCard({ ship, resolved }: ProfileShipCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const imgSrc = resolved && !imgError
    ? resolveShipImage(resolved.images, 'store')
    : null;

  const displayName = resolved?.name ?? ship.name;
  const displayManufacturer = resolved?.manufacturer.name ?? ship.manufacturer;

  // Only allow expand when we have resolved data
  const canExpand = !!resolved;

  return (
    <div>
      {/* Compact card */}
      <button
        type="button"
        onClick={() => canExpand && setExpanded((prev) => !prev)}
        className={`w-full flex items-center gap-3 h-24 px-3 bg-[rgba(var(--mg-panel-dark),0.4)] border border-[rgba(var(--mg-primary),0.15)] rounded-sm transition-colors ${
          canExpand ? 'cursor-pointer hover:border-[rgba(var(--mg-primary),0.3)] hover:bg-[rgba(var(--mg-panel-dark),0.6)]' : 'cursor-default'
        }`}
      >
        {/* Thumbnail */}
        <div className="relative w-[80px] h-[60px] flex-shrink-0 overflow-hidden rounded-sm bg-[rgba(var(--mg-panel-dark),0.6)]">
          {imgSrc ? (
            <Image
              src={imgSrc}
              alt={displayName}
              width={80}
              height={60}
              loading="lazy"
              className="object-cover w-full h-full"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[rgba(var(--mg-text),0.2)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>

        {/* Ship name and manufacturer */}
        <div className="flex-1 min-w-0 text-left">
          <p className="text-[rgba(var(--mg-primary),0.9)] font-quantify text-sm truncate">
            {displayName}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {resolved?.manufacturer.logo && (
              <Image
                src={resolved.manufacturer.logo}
                alt={displayManufacturer}
                width={14}
                height={14}
                className="object-contain flex-shrink-0"
              />
            )}
            <span className="text-[rgba(var(--mg-text),0.5)] text-xs truncate">
              {displayManufacturer}
            </span>
          </div>
        </div>

        {/* Right side: size badge and role */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {resolved?.size && (
            <span className="text-[10px] px-1.5 py-0.5 bg-[rgba(var(--mg-primary),0.1)] border border-[rgba(var(--mg-primary),0.2)] text-[rgba(var(--mg-primary),0.7)] rounded-sm">
              {formatSize(resolved.size)}
            </span>
          )}
          {resolved?.classificationLabel && (
            <span className="text-[10px] text-[rgba(var(--mg-text),0.5)] truncate max-w-[100px]">
              {resolved.classificationLabel}
            </span>
          )}
        </div>

        {/* Expand indicator */}
        {canExpand && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-4 w-4 text-[rgba(var(--mg-primary),0.4)] flex-shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {/* Expanded detail section */}
      <AnimatePresence>
        {expanded && resolved && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 py-3 bg-[rgba(var(--mg-panel-dark),0.3)] border-x border-b border-[rgba(var(--mg-primary),0.1)] rounded-b-sm space-y-2">
              {/* Specs row */}
              <div className="flex items-center gap-3 text-xs text-[rgba(var(--mg-text),0.6)]">
                <span title="Crew">Crew: {formatCrew(resolved.crew.min, resolved.crew.max)}</span>
                <span className="text-[rgba(var(--mg-primary),0.2)]">|</span>
                <span title="Cargo">Cargo: {formatCargo(resolved.cargo)}</span>
                <span className="text-[rgba(var(--mg-primary),0.2)]">|</span>
                <span title="SCM Speed">Speed: {formatSpeed(resolved.scmSpeed)}</span>
              </div>

              {/* Description */}
              {resolved.description && (
                <p className="text-xs text-[rgba(var(--mg-text),0.5)] leading-relaxed">
                  {resolved.description.length > 200
                    ? `${resolved.description.slice(0, 200)}...`
                    : resolved.description}
                </p>
              )}

              {/* Production status */}
              {resolved.productionStatus && (
                <span className="inline-block text-[10px] px-1.5 py-0.5 bg-[rgba(var(--mg-primary),0.08)] border border-[rgba(var(--mg-primary),0.15)] text-[rgba(var(--mg-primary),0.6)] rounded-sm">
                  {formatProductionStatus(resolved.productionStatus)}
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded fallback when not resolved */}
      <AnimatePresence>
        {expanded && !resolved && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 py-3 bg-[rgba(var(--mg-panel-dark),0.3)] border-x border-b border-[rgba(var(--mg-primary),0.1)] rounded-b-sm">
              <p className="text-xs text-[rgba(var(--mg-text),0.4)]">Ship details unavailable</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
