'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { motion } from 'motion/react';
import MobiGlasPanel from '@/components/ui/mobiglas/MobiGlasPanel';
import { resolveShipImage } from '@/lib/ships/image';
import { formatCrew, formatCargo, formatSpeed } from '@/lib/ships/format';
import type { ShipDocument } from '@/types/ship';

interface ShipCardProps {
  ship: ShipDocument;
  onClick: (ship: ShipDocument) => void;
}

export default function ShipCard({ ship, onClick }: ShipCardProps) {
  const [imgSrc] = useState(() => resolveShipImage(ship.images, 'store'));
  const [imgError, setImgError] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className="cursor-pointer"
      onClick={() => onClick(ship)}
    >
      <MobiGlasPanel
        variant="dark"
        cornerAccents={true}
        cornerSize="sm"
        padding="sm"
        className="h-full"
      >
        {/* Ship Image */}
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-sm mb-3">
          {imgSrc && !imgError ? (
            <Image
              src={imgSrc}
              alt={ship.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full bg-[rgba(var(--mg-panel-dark),0.6)] border border-[rgba(var(--mg-primary),0.15)] rounded">
              <span className="text-xs text-[rgba(var(--mg-primary),0.3)]">No image</span>
            </div>
          )}
        </div>

        {/* Ship Info */}
        <div className="space-y-1.5">
          <h3 className="text-[rgba(var(--mg-primary),0.9)] font-quantify text-sm truncate">
            {ship.name}
          </h3>
          <div className="flex items-center gap-1.5">
            {ship.manufacturer.logo ? (
              <Image
                src={ship.manufacturer.logo}
                alt={ship.manufacturer.name}
                width={16}
                height={16}
                className="object-contain flex-shrink-0"
              />
            ) : null}
            <span className="text-[rgba(var(--mg-text),0.6)] text-xs truncate">
              {ship.manufacturer.name}
            </span>
          </div>
          {ship.classificationLabel && (
            <span className="inline-block bg-[rgba(var(--mg-primary),0.1)] border border-[rgba(var(--mg-primary),0.2)] text-[rgba(var(--mg-primary),0.7)] text-xs px-1.5 py-0.5 rounded-sm">
              {ship.classificationLabel}
            </span>
          )}
          <div className="flex items-center gap-2 text-[rgba(var(--mg-text),0.5)] text-xs mt-1">
            <span title="Crew">{formatCrew(ship.crew.min, ship.crew.max)}</span>
            <span className="text-[rgba(var(--mg-primary),0.2)]">|</span>
            <span title="Cargo">{formatCargo(ship.cargo)}</span>
            <span className="text-[rgba(var(--mg-primary),0.2)]">|</span>
            <span title="SCM Speed">{formatSpeed(ship.scmSpeed)}</span>
          </div>
        </div>
      </MobiGlasPanel>
    </motion.div>
  );
}
