'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { UserShip } from '@/types/user';
import { resolveShipImage } from '@/lib/ships/image';
import { shipDocumentToUserShip } from '@/lib/ships/mappers';
import { MobiGlasButton } from '@/components/ui/mobiglas';
import FleetShipPickerModal from '@/components/ships/FleetShipPickerModal';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import type { ShipDocument } from '@/types/ship';

interface UserFleetBuilderProps {
  isEditing: boolean;
  userShips: UserShip[];
  resolvedShips: Map<string, ShipDocument>;
  onAddShip: (ship: UserShip) => void;
  onRemoveShip: (index: number) => void;
}

const UserFleetBuilder: React.FC<UserFleetBuilderProps> = ({
  isEditing,
  userShips = [],
  resolvedShips,
  onAddShip,
  onRemoveShip
}) => {
  const { confirm } = useConfirmDialog();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});

  // Handle ship selection from modal picker
  const handleSelectShip = (shipDoc: ShipDocument) => {
    const userShip = shipDocumentToUserShip(shipDoc);
    onAddShip(userShip);
  };

  // Handle ship removal with confirmation
  const handleRemoveShip = async (index: number) => {
    const ship = userShips[index];
    const confirmed = await confirm({
      title: 'Remove Ship',
      message: `Are you sure you want to remove ${ship?.name || 'this ship'} from your fleet?`,
      confirmLabel: 'Remove',
      cancelLabel: 'Keep',
      variant: 'warning'
    });
    if (!confirmed) return;
    onRemoveShip(index);
  };

  // Handle image load error
  const handleImageError = (shipId: string) => {
    setImageErrors(prev => ({ ...prev, [shipId]: true }));
  };

  // Handle image load success
  const handleImageLoad = (shipId: string) => {
    setLoadedImages(prev => ({ ...prev, [shipId]: true }));
  };

  // Group ships by manufacturer for display (memoized to prevent recalculation on every render)
  const shipsByManufacturer = useMemo(() => {
    return (userShips || []).reduce<Record<string, UserShip[]>>((acc, ship) => {
      if (!acc[ship.manufacturer]) {
        acc[ship.manufacturer] = [];
      }
      acc[ship.manufacturer].push(ship);
      return acc;
    }, {});
  }, [userShips]);

  return (
    <div className="mt-6">
      {isEditing && (
        <div className="mb-6">
          <MobiGlasButton
            onClick={() => setPickerOpen(true)}
            size="sm"
          >
            ADD SHIP
          </MobiGlasButton>

          <FleetShipPickerModal
            isOpen={pickerOpen}
            onClose={() => setPickerOpen(false)}
            onSelect={handleSelectShip}
          />
        </div>
      )}

      {/* Display ships by manufacturer */}
      <div className="space-y-8">
        {Object.entries(shipsByManufacturer).length > 0 ? (
          Object.entries(shipsByManufacturer).map(([manufacturer, ships]) => (
            <div key={manufacturer} className="border border-[rgba(var(--mg-primary),0.2)] bg-[rgba(var(--mg-panel-dark),0.4)] p-4 rounded-sm">
              <h4 className="text-sm font-semibold text-[rgba(var(--mg-primary),0.9)] mb-4">{manufacturer}</h4>
              <div className="grid grid-cols-1 gap-6">
                {ships.map((ship, index) => {
                  const shipIndex = userShips.findIndex(s =>
                    s.manufacturer === ship.manufacturer && s.name === ship.name
                  );

                  const shipId = `${ship.manufacturer}-${ship.name}`;
                  const resolved = resolvedShips.get(ship.fleetyardsId);
                  const imageSrc = resolved
                    ? resolveShipImage(resolved.images, 'angled')
                    : null;
                  const useDefaultImage = imageErrors[shipId] || !imageSrc;
                  const isLoaded = loadedImages[shipId];

                  return (
                    <div key={`${shipId}-${index}`} className="relative border border-[rgba(var(--mg-primary),0.1)] bg-[rgba(var(--mg-panel-dark),0.6)] p-4 rounded-sm">
                      {isEditing && (
                        <button
                          onClick={() => handleRemoveShip(shipIndex)}
                          className="absolute top-2 right-2 text-[rgba(var(--mg-error),0.8)] hover:text-[rgba(var(--mg-error),1)] p-1 bg-[rgba(var(--mg-panel-dark),0.7)] rounded-sm"
                          title="Remove Ship"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}

                      <div className="flex flex-col md:flex-row items-center">
                        {/* Ship image with loading state */}
                        <div className="w-full md:w-48 h-48 mb-4 md:mb-0 md:mr-6 flex-shrink-0 relative">
                          {imageSrc && !isLoaded && !imageErrors[shipId] && (
                            <div className="absolute inset-0 flex items-center justify-center bg-[rgba(var(--mg-panel-dark),0.4)]">
                              <div className="w-8 h-8 border-2 border-[rgba(var(--mg-primary),0.2)] border-t-[rgba(var(--mg-primary),0.8)] rounded-full animate-spin"></div>
                            </div>
                          )}
                          {imageSrc && !useDefaultImage ? (
                            <Image
                              src={imageSrc}
                              alt={ship.name}
                              width={192}
                              height={192}
                              className={`w-full h-full object-contain transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                              onError={() => handleImageError(shipId)}
                              onLoad={() => handleImageLoad(shipId)}
                              priority={index < 2}
                            />
                          ) : (
                            <div className="flex items-center justify-center w-full h-full bg-[rgba(var(--mg-panel-dark),0.6)] border border-[rgba(var(--mg-primary),0.15)] rounded">
                              <span className="text-xs text-[rgba(var(--mg-primary),0.3)]">No image</span>
                            </div>
                          )}
                        </div>

                        {/* Ship details */}
                        <div className="flex-1 text-center md:text-left">
                          <h5 className="text-lg font-medium text-[rgba(var(--mg-text),0.9)] mb-2">{ship.name}</h5>
                          <div className="flex items-center gap-1.5 justify-center md:justify-start mb-1">
                            {resolved?.manufacturer.logo && (
                              <Image
                                src={resolved.manufacturer.logo}
                                alt={ship.manufacturer}
                                width={16}
                                height={16}
                                className="object-contain flex-shrink-0"
                              />
                            )}
                            <p className="text-sm text-[rgba(var(--mg-text),0.7)]">{ship.manufacturer}</p>
                          </div>
                          {resolved && (
                            <div className="flex items-center gap-2 text-[rgba(var(--mg-text),0.5)] text-xs mt-2 justify-center md:justify-start">
                              {resolved.crew && (
                                <span title="Crew">
                                  Crew: {resolved.crew.min === resolved.crew.max
                                    ? resolved.crew.max
                                    : `${resolved.crew.min}-${resolved.crew.max}`}
                                </span>
                              )}
                              {resolved.size && (
                                <>
                                  <span className="text-[rgba(var(--mg-primary),0.2)]">|</span>
                                  <span title="Size" className="capitalize">{resolved.size}</span>
                                </>
                              )}
                              {resolved.classificationLabel && (
                                <>
                                  <span className="text-[rgba(var(--mg-primary),0.2)]">|</span>
                                  <span title="Classification">{resolved.classificationLabel}</span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="text-sm text-[rgba(var(--mg-text),0.5)] py-2">No ships added to your fleet yet</div>
        )}
      </div>
    </div>
  );
};

export default UserFleetBuilder;
