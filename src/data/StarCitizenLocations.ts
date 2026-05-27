/**
 * Star Citizen Location Data
 * Organized by System > Planet/Body > Moon/Station
 * Reference: https://starcitizen.tools/
 */

export interface LocationOption {
  value: string;
  label: string;
  type: 'system' | 'planet' | 'moon' | 'station' | 'landmark';
  parent?: string;
}

export interface SystemData {
  name: string;
  star: string;
  planets: PlanetData[];
  stations?: StationData[];
  landmarks?: string[];
}

export interface PlanetData {
  name: string;
  designation?: string; // e.g., "Pyro II" for Monox
  moons?: string[];
  stations?: string[];
  landingZones?: string[];
}

export interface StationData {
  name: string;
  orbiting?: string;
}

// Stanton System - Currently playable
export const STANTON_SYSTEM: SystemData = {
  name: 'Stanton',
  star: 'Stanton (G-type)',
  planets: [
    {
      name: 'Hurston',
      moons: ['Ariel', 'Aberdeen', 'Magda', 'Ita'],
      landingZones: ['Lorville'],
      stations: ['Everus Harbor'],
    },
    {
      name: 'Crusader',
      moons: ['Cellin', 'Daymar', 'Yela'],
      landingZones: ['Orison'],
      stations: ['Port Olisar', 'Seraphim Station'],
    },
    {
      name: 'ArcCorp',
      moons: ['Lyria', 'Wala'],
      landingZones: ['Area 18'],
      stations: ['Baijini Point'],
    },
    {
      name: 'microTech',
      moons: ['Calliope', 'Clio', 'Euterpe'],
      landingZones: ['New Babbage'],
      stations: ['Port Tressler'],
    },
  ],
  landmarks: ['Aaron Halo (Asteroid Belt)'],
};

// Pyro System - Lawless frontier
export const PYRO_SYSTEM: SystemData = {
  name: 'Pyro',
  star: 'Pyro (Orange Dwarf)',
  planets: [
    {
      name: 'Pyro I',
      designation: 'Pyro I',
    },
    {
      name: 'Monox',
      designation: 'Pyro II',
    },
    {
      name: 'Bloom',
      designation: 'Pyro III',
    },
    {
      name: 'Pyro IV',
      designation: 'Pyro IV (Moon of Pyro V)',
    },
    {
      name: 'Pyro V',
      designation: 'Pyro V',
      moons: ['Adir', 'Ignis', 'Fairo', 'Fuego', 'Vatra', 'Vuur'],
    },
    {
      name: 'Terminus',
      designation: 'Pyro VI',
      stations: ['Ruin Station'],
    },
  ],
  stations: [{ name: 'Ruin Station', orbiting: 'Pyro VI' }],
};

// Nyx System - Unclaimed frontier
export const NYX_SYSTEM: SystemData = {
  name: 'Nyx',
  star: 'Nyx (F-type main sequence)',
  planets: [
    {
      name: 'Nyx I',
    },
    {
      name: 'Nyx II',
    },
    {
      name: 'Delamar',
      landingZones: ['Levski'],
    },
    {
      name: 'Nyx III',
    },
  ],
  stations: [
    { name: "People's Service Station Alpha" },
    { name: "People's Service Station Delta" },
    { name: "People's Service Station Theta" },
    { name: "People's Service Station Lambda" },
  ],
  landmarks: ['Glaciem Ring', 'Keeger Belt'],
};

// All systems combined
export const STAR_SYSTEMS: SystemData[] = [STANTON_SYSTEM, PYRO_SYSTEM, NYX_SYSTEM];

/**
 * Generate a flat list of location options for dropdown menus
 * Format: "System - Location" (e.g., "Stanton - Hurston", "Stanton - Hurston - Lorville")
 */
export function getLocationOptions(): LocationOption[] {
  const options: LocationOption[] = [];

  for (const system of STAR_SYSTEMS) {
    // Add system-level option
    options.push({
      value: system.name,
      label: system.name,
      type: 'system',
    });

    for (const planet of system.planets) {
      // Add planet option
      const planetLabel = planet.designation
        ? `${system.name} - ${planet.designation}`
        : `${system.name} - ${planet.name}`;

      options.push({
        value: planetLabel,
        label: planetLabel,
        type: 'planet',
        parent: system.name,
      });

      // Add landing zones
      if (planet.landingZones) {
        for (const lz of planet.landingZones) {
          options.push({
            value: `${system.name} - ${planet.name} - ${lz}`,
            label: `${system.name} - ${planet.name} - ${lz}`,
            type: 'landmark',
            parent: planet.name,
          });
        }
      }

      // Add moons
      if (planet.moons) {
        for (const moon of planet.moons) {
          options.push({
            value: `${system.name} - ${planet.name} - ${moon}`,
            label: `${system.name} - ${planet.name} - ${moon}`,
            type: 'moon',
            parent: planet.name,
          });
        }
      }

      // Add orbital stations
      if (planet.stations) {
        for (const station of planet.stations) {
          options.push({
            value: `${system.name} - ${planet.name} - ${station}`,
            label: `${system.name} - ${planet.name} - ${station}`,
            type: 'station',
            parent: planet.name,
          });
        }
      }
    }

    // Add system-level stations
    if (system.stations) {
      for (const station of system.stations) {
        const label = station.orbiting
          ? `${system.name} - ${station.orbiting} - ${station.name}`
          : `${system.name} - ${station.name}`;
        options.push({
          value: label,
          label: label,
          type: 'station',
          parent: system.name,
        });
      }
    }

    // Add landmarks (like asteroid belts)
    if (system.landmarks) {
      for (const landmark of system.landmarks) {
        options.push({
          value: `${system.name} - ${landmark}`,
          label: `${system.name} - ${landmark}`,
          type: 'landmark',
          parent: system.name,
        });
      }
    }
  }

  return options;
}

/**
 * Get locations grouped by system for hierarchical display
 */
export function getLocationsBySystem(): Map<string, LocationOption[]> {
  const options = getLocationOptions();
  const grouped = new Map<string, LocationOption[]>();

  for (const option of options) {
    if (option.type === 'system') {
      if (!grouped.has(option.value)) {
        grouped.set(option.value, []);
      }
    } else {
      const systemName = option.value.split(' - ')[0];
      const existing = grouped.get(systemName) || [];
      existing.push(option);
      grouped.set(systemName, existing);
    }
  }

  return grouped;
}

/**
 * Simple flat array of location strings for basic dropdowns
 */
export function getSimpleLocationList(): string[] {
  return getLocationOptions().map((opt) => opt.value);
}

// Export pre-computed options for performance
export const LOCATION_OPTIONS = getLocationOptions();
export const SIMPLE_LOCATIONS = getSimpleLocationList();
