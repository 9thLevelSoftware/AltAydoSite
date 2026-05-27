import { resolveShipImage } from '@/lib/ships/image';
import type { ShipDocument } from '@/types/ship';
import type { UserShip } from '@/types/user';

// ---------------------------------------------------------------------------
// ShipDocument -> UserShip Mapper
// ---------------------------------------------------------------------------

/**
 * Convert a ShipDocument (from the ship database) to a UserShip (for user
 * profile ship lists).
 *
 * Addresses Pitfall 4 (UserShip type mismatch) from research -- ensures
 * the image field is populated from the ship database images rather than
 * relying on legacy static image paths.
 */
export function shipDocumentToUserShip(ship: ShipDocument): UserShip {
  return {
    manufacturer: ship.manufacturer.name,
    name: ship.name,
    fleetyardsId: ship.fleetyardsId,
    image: resolveShipImage(ship.images, 'store'),
  };
}
