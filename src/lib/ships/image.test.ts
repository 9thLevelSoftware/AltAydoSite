import { describe, expect, it } from 'vitest';
import { isFleetYardsImageUrl, shouldOptimizeShipImage } from './image';

describe('ship image helpers', () => {
  it('detects FleetYards image hosts that should bypass Next image optimization', () => {
    expect(isFleetYardsImageUrl('https://api.fleetyards.net/files/blobs/redirect/model.png')).toBe(true);
    expect(isFleetYardsImageUrl('https://cdn.fleetyards.net/uploads/model.png')).toBe(true);
    expect(isFleetYardsImageUrl('https://fleetyards.net/files/representations/redirect/model.png')).toBe(true);
    expect(isFleetYardsImageUrl('https://images.aydocorp.space/ships/ship-1/store.png')).toBe(false);
  });

  it('keeps mirrored ship images eligible for optimization', () => {
    expect(shouldOptimizeShipImage('https://images.aydocorp.space/ships/ship-1/store.png')).toBe(true);
    expect(shouldOptimizeShipImage('https://api.fleetyards.net/files/blobs/redirect/model.png')).toBe(false);
    expect(shouldOptimizeShipImage('')).toBe(false);
  });
});
