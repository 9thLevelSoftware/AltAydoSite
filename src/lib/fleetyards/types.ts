/**
 * FleetYards API v1 Response Types
 *
 * These interfaces mirror the actual response shape from the FleetYards API
 * (https://api.fleetyards.net/v1/models). They represent RAW API data and
 * should NOT be used as internal storage types. For internal storage, see
 * ShipDocument in @/types/ship.ts.
 *
 * These types are maintained separately from Zod schemas to serve different
 * purposes: TypeScript interfaces here provide compile-time type safety for
 * API client code, while Zod schemas in ship.ts provide runtime validation
 * at the trust boundary.
 */

/**
 * Image object containing multiple resolution URLs. FleetYards has returned
 * both source/small/medium/large and url/smallUrl/mediumUrl/largeUrl shapes.
 */
export interface FleetYardsImageAsset {
  source?: string;
  url?: string;
  small?: string;
  smallUrl?: string;
  medium?: string;
  mediumUrl?: string;
  large?: string;
  largeUrl?: string;
  xlargeUrl?: string;
}

export type FleetYardsImageField = FleetYardsImageAsset | string | null;

/**
 * Ship manufacturer as returned by the FleetYards API.
 */
export interface FleetYardsManufacturer {
  name: string;
  longName: string;
  slug: string;
  code: string;
  logo: FleetYardsImageField;
}

/**
 * Full ship object from the FleetYards /v1/models endpoint.
 * All fields are typed to match the live API response shape.
 */
export interface FleetYardsShipResponse {
  /** UUID identifier */
  id: string;
  /** Ship display name */
  name: string;
  /** URL-friendly slug */
  slug: string;
  /** Star Citizen in-game identifier */
  scIdentifier: string | null;
  /** RSI website ID */
  rsiId: number | null;
  /** RSI website name */
  rsiName: string | null;
  /** RSI website slug */
  rsiSlug: string | null;
  /** Ship manufacturer details */
  manufacturer: FleetYardsManufacturer;
  /** Ship classification (e.g., "combat", "transport") */
  classification: string;
  /** Human-readable classification label */
  classificationLabel: string;
  /** Ship focus/role */
  focus: string;
  /** Production status (e.g., "flight-ready", "in-concept") */
  productionStatus: string;
  /** Ship size category */
  size: string;
  /** Crew capacity */
  crew: {
    min: number;
    max: number;
    minLabel: string;
    maxLabel: string;
  };
  /** Cargo capacity in SCU */
  cargo: number;
  /** Mass in kg */
  mass: number;
  /** Length in meters */
  length: number;
  /** Beam (width) in meters */
  beam: number;
  /** Height in meters */
  height: number;
  /** Hydrogen fuel tank size */
  hydrogenFuelTankSize: number | null;
  /** Quantum fuel tank size */
  quantumFuelTankSize: number | null;
  /** Standard Combat Maneuvering speed */
  scmSpeed: number | null;
  /** Pledge price in USD */
  pledgePrice: number | null;
  /** In-game price in aUEC */
  price: number | null;
  /** Ship description text */
  description: string | null;
  /** Store image URL */
  storeImage: FleetYardsImageField;
  /** RSI store URL */
  storeUrl: string | null;
  /** Angled view image URL (flat string in current API format) */
  angledView: FleetYardsImageField;
  /** Side view image URL (flat string in current API format) */
  sideView: FleetYardsImageField;
  /** Top view image URL (flat string in current API format) */
  topView: FleetYardsImageField;
  /** Front view image URL (flat string in current API format) */
  frontView: FleetYardsImageField;
  /** Fleet chart comparison image URL */
  fleetchartImage: FleetYardsImageField;
  /** Nested media object with full resolution image views (current API format) */
  media?: {
    angledView?: FleetYardsImageField;
    sideView?: FleetYardsImageField;
    topView?: FleetYardsImageField;
    frontView?: FleetYardsImageField;
    storeImage?: FleetYardsImageField;
    fleetchartImage?: FleetYardsImageField;
  };
  /** Whether the ship is currently on sale */
  onSale: boolean;
  /** Whether the ship has gallery images */
  hasImages: boolean;
  /** Whether the ship has paint variants */
  hasPaints: boolean;
  /** ISO 8601 timestamp of last data update */
  lastUpdatedAt: string;
  /** ISO 8601 timestamp of record creation */
  createdAt: string;
  /** ISO 8601 timestamp of last record update */
  updatedAt: string;
}
