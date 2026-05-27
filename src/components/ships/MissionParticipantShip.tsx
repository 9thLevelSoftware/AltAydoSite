'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { resolveShipImage, shouldOptimizeShipImage } from '@/lib/ships/image';
import { formatCrew, formatCargo } from '@/lib/ships/format';
import { formatSize } from '@/lib/ships/format';
import type { MissionParticipant } from '@/types/Mission';
import type { ShipDocument } from '@/types/ship';

interface MissionParticipantShipProps {
  participant: MissionParticipant;
  resolved: ShipDocument | undefined;
}

export default function MissionParticipantShip({ participant, resolved }: MissionParticipantShipProps) {
  const [imgError, setImgError] = useState(false);

  const hasShip = !!(participant.shipId || participant.shipName);
  const imgSrc = resolved && hasShip && !imgError
    ? resolveShipImage(resolved.images, 'store')
    : null;

  // Determine if contextual specs should be shown (INT-05)
  const showCrew = resolved && resolved.crew.max > 1;
  const showCargo = resolved && (
    resolved.classification === 'transport' ||
    resolved.classification === 'freight' ||
    resolved.classificationLabel?.toLowerCase().includes('hauling') ||
    resolved.classificationLabel?.toLowerCase().includes('transport')
  );

  return (
    <div className="flex items-start gap-3">
      {/* Avatar / Ship thumbnail area */}
      <div className="flex-shrink-0">
        {imgSrc ? (
          <div className="relative w-[48px] h-[32px] overflow-hidden rounded-sm bg-[rgba(var(--mg-panel-dark),0.6)] border border-[rgba(var(--mg-primary),0.15)]">
            <Image
              src={imgSrc}
              alt={participant.shipName || 'Ship'}
              width={48}
              height={32}
              className="object-cover w-full h-full"
              unoptimized={!shouldOptimizeShipImage(imgSrc)}
              onError={() => setImgError(true)}
            />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-[rgba(var(--mg-primary),0.2)] border border-[rgba(var(--mg-primary),0.4)] flex items-center justify-center text-base flex-shrink-0">
            {participant.userName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        {/* Participant name -- always shown */}
        <p className="mg-text font-semibold truncate">{participant.userName}</p>

        {/* Roles */}
        {participant.roles && participant.roles.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {participant.roles.map((role, index) => (
              <span
                key={index}
                className="inline-block text-xs px-2 py-0.5 bg-[rgba(var(--mg-primary),0.1)] border border-[rgba(var(--mg-primary),0.2)] rounded-sm"
              >
                {role}
              </span>
            ))}
          </div>
        )}

        {/* Ship info */}
        {hasShip && (
          <div className="mt-1.5">
            {resolved ? (
              /* Resolved ship -- show name, size badge, classification */
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-[rgba(var(--mg-primary),0.7)] font-quantify truncate">
                  {resolved.name}
                </span>
                {resolved.size && (
                  <span className="text-[10px] px-1 py-0.5 bg-[rgba(var(--mg-primary),0.1)] border border-[rgba(var(--mg-primary),0.2)] text-[rgba(var(--mg-primary),0.6)] rounded-sm">
                    {formatSize(resolved.size)}
                  </span>
                )}
                {resolved.classificationLabel && (
                  <span className="text-[10px] text-[rgba(var(--mg-text),0.4)]">
                    {resolved.classificationLabel}
                  </span>
                )}
              </div>
            ) : (
              /* Unresolved ship -- show name and type only, NO image, NO placeholder */
              <div className="flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-[rgba(var(--mg-primary),0.5)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-xs text-[rgba(var(--mg-text),0.5)]">
                  {participant.shipName}
                  {participant.shipType && participant.shipType !== participant.shipName && (
                    <span className="text-[rgba(var(--mg-text),0.3)]"> ({participant.shipType})</span>
                  )}
                </span>
              </div>
            )}

            {/* Contextual specs for resolved ships (INT-05) */}
            {resolved && (showCrew || showCargo) && (
              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[rgba(var(--mg-text),0.4)]">
                {showCrew && (
                  <span>Crew: {formatCrew(resolved.crew.min, resolved.crew.max)}</span>
                )}
                {showCrew && showCargo && (
                  <span className="text-[rgba(var(--mg-primary),0.15)]">|</span>
                )}
                {showCargo && (
                  <span>Cargo: {formatCargo(resolved.cargo)}</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
