'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { motion } from 'motion/react';
import { resolveShipImage } from '@/lib/ships/image';
import { formatCrew, formatCargo, formatSpeed } from '@/lib/ships/format';
import type { ShipDocument } from '@/types/ship';

interface ShipCardListProps {
  ship: ShipDocument;
  onClick: (ship: ShipDocument) => void;
}

export default function ShipCardList({ ship, onClick }: ShipCardListProps) {
  const [imgSrc] = useState(() => resolveShipImage(ship.images, 'store'));
  const [imgError, setImgError] = useState(false);
  const [logoError, setLogoError] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-3 p-2 border-b border-[rgba(var(--mg-primary),0.1)] hover:bg-[rgba(var(--mg-primary),0.05)] cursor-pointer transition-colors"
      onClick={() => onClick(ship)}
    >
      {/* Thumbnail */}
      <div className="relative w-16 h-10 flex-shrink-0 overflow-hidden rounded-sm">
        {imgSrc && !imgError ? (
          <Image
            src={imgSrc}
            alt={ship.name}
            fill
            className="object-cover"
            sizes="64px"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full bg-[rgba(var(--mg-panel-dark),0.6)] border border-[rgba(var(--mg-primary),0.15)] rounded">
            <span className="text-xs text-[rgba(var(--mg-primary),0.3)]">No image</span>
          </div>
        )}
      </div>

      {/* Ship Name */}
      <span className="text-[rgba(var(--mg-primary),0.9)] text-sm font-quantify flex-1 min-w-0 truncate">
        {ship.name}
      </span>

      {/* Manufacturer */}
      <span className="text-[rgba(var(--mg-text),0.6)] text-xs w-32 truncate hidden sm:flex items-center gap-1.5">
        {ship.manufacturer.logo && !logoError ? (
          <Image
            src={ship.manufacturer.logo}
            alt={ship.manufacturer.name}
            width={14}
            height={14}
            className="object-contain flex-shrink-0"
            onError={() => setLogoError(true)}
          />
        ) : null}
        <span className="truncate">{ship.manufacturer.name}</span>
      </span>

      {/* Spec Columns */}
      <span
        className="text-[rgba(var(--mg-text),0.5)] text-xs w-12 text-right hidden md:block"
        title="Crew"
      >
        {formatCrew(ship.crew.min, ship.crew.max)}
      </span>
      <span
        className="text-[rgba(var(--mg-text),0.5)] text-xs w-16 text-right hidden lg:block"
        title="Cargo"
      >
        {formatCargo(ship.cargo)}
      </span>
      <span
        className="text-[rgba(var(--mg-text),0.5)] text-xs w-16 text-right hidden lg:block"
        title="Speed"
      >
        {formatSpeed(ship.scmSpeed)}
      </span>

      {/* Classification Badge */}
      {ship.classificationLabel && (
        <span className="inline-block bg-[rgba(var(--mg-primary),0.1)] border border-[rgba(var(--mg-primary),0.2)] text-[rgba(var(--mg-primary),0.7)] text-xs px-1.5 py-0.5 rounded-sm flex-shrink-0">
          {ship.classificationLabel}
        </span>
      )}
    </motion.div>
  );
}
