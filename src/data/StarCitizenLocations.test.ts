import { describe, expect, it } from 'vitest';
import { LOCATION_OPTIONS, STAR_SYSTEMS } from './StarCitizenLocations';

const locationValues = LOCATION_OPTIONS.map((option) => option.value);

describe('StarCitizenLocations', () => {
  it('includes Nyx as a selectable star system', () => {
    expect(STAR_SYSTEMS.map((system) => system.name)).toContain('Nyx');
    expect(locationValues).toContain('Nyx');
  });

  it('includes core Nyx bodies and landmarks', () => {
    expect(locationValues).toEqual(
      expect.arrayContaining([
        'Nyx - Nyx I',
        'Nyx - Nyx II',
        'Nyx - Delamar',
        'Nyx - Delamar - Levski',
        'Nyx - Nyx III',
        'Nyx - Glaciem Ring',
        'Nyx - Keeger Belt',
      ])
    );
  });

  it("includes Nyx People's Service Stations", () => {
    expect(locationValues).toEqual(
      expect.arrayContaining([
        "Nyx - People's Service Station Alpha",
        "Nyx - People's Service Station Delta",
        "Nyx - People's Service Station Theta",
        "Nyx - People's Service Station Lambda",
      ])
    );
  });

  it('keeps representative Stanton and Pyro options available', () => {
    expect(locationValues).toEqual(
      expect.arrayContaining([
        'Stanton',
        'Stanton - Hurston',
        'Stanton - Hurston - Lorville',
        'Pyro',
        'Pyro - Pyro II',
        'Pyro - Pyro VI - Ruin Station',
      ])
    );
  });
});
