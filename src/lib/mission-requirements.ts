import type {
  MissionPersonnelRequirement,
  MissionShipRequirement,
  ShipCategory,
  ShipSize,
} from '@/types/MissionPlanning';
import type { MissionImage, MissionLeader, MissionShip, PlannedMission } from '@/types/PlannedMission';

interface RequirementSource {
  shipRequirements?: MissionShipRequirement[];
  personnelRequirements?: MissionPersonnelRequirement[];
  ships?: MissionShip[];
}

const VALID_SHIP_SIZES: ShipSize[] = ['Small', 'Medium', 'Large', 'Capital'];
const VALID_SHIP_CATEGORIES: ShipCategory[] = ['Fighter', 'Transport', 'Industrial', 'Medical'];

export function normalizeShipSize(size?: string): ShipSize {
  const normalized = (size || '').trim().toLowerCase();
  if (normalized === 'capital' || normalized === 'cap') return 'Capital';
  if (normalized === 'large' || normalized === 'l') return 'Large';
  if (normalized === 'small' || normalized === 's') return 'Small';
  return 'Medium';
}

export function inferShipCategory(ship: MissionShip): ShipCategory {
  const roleText = [
    ship.shipName,
    ship.size,
    ship.manufacturer,
    ...(Array.isArray(ship.role) ? ship.role : []),
    ship.notes || '',
  ].join(' ').toLowerCase();

  if (roleText.includes('medical') || roleText.includes('medivac') || roleText.includes('rescue')) {
    return 'Medical';
  }

  if (
    roleText.includes('mining') ||
    roleText.includes('salvage') ||
    roleText.includes('industrial') ||
    roleText.includes('refinery') ||
    roleText.includes('repair') ||
    roleText.includes('tow')
  ) {
    return 'Industrial';
  }

  if (
    roleText.includes('fighter') ||
    roleText.includes('combat') ||
    roleText.includes('bomber') ||
    roleText.includes('gunship') ||
    roleText.includes('interceptor') ||
    roleText.includes('military') ||
    roleText.includes('escort')
  ) {
    return 'Fighter';
  }

  return 'Transport';
}

export function deriveShipRequirementsFromShips(ships?: MissionShip[]): MissionShipRequirement[] {
  if (!ships || ships.length === 0) return [];

  const grouped = new Map<string, MissionShipRequirement>();
  const validShips = ships.filter((ship): ship is MissionShip => !!ship && typeof ship === 'object');

  validShips.forEach((ship) => {
    const size = normalizeShipSize(ship.size);
    const category = inferShipCategory(ship);
    const key = `${size}:${category}`;
    const count = Math.max(1, Math.floor(Number(ship.quantity) || 1));
    const existing = grouped.get(key);

    if (existing) {
      existing.count += count;
    } else {
      grouped.set(key, { size, category, count });
    }
  });

  return Array.from(grouped.values()).sort((a, b) => {
    const sizeDiff = VALID_SHIP_SIZES.indexOf(a.size) - VALID_SHIP_SIZES.indexOf(b.size);
    if (sizeDiff !== 0) return sizeDiff;
    return VALID_SHIP_CATEGORIES.indexOf(a.category) - VALID_SHIP_CATEGORIES.indexOf(b.category);
  });
}

export function getMissionShipRequirements(source: RequirementSource): MissionShipRequirement[] {
  if (source.shipRequirements && source.shipRequirements.length > 0) {
    return cloneShipRequirements(source.shipRequirements);
  }

  return deriveShipRequirementsFromShips(source.ships);
}

export function getMissionPersonnelRequirements(source: RequirementSource): MissionPersonnelRequirement[] {
  return clonePersonnelRequirements(source.personnelRequirements || []);
}

export function getShipRequirementCount(source: RequirementSource): number {
  return getMissionShipRequirements(source).reduce((total, requirement) => total + requirement.count, 0);
}

export function getPersonnelRequirementCount(source: RequirementSource): number {
  return getMissionPersonnelRequirements(source).reduce((total, requirement) => total + requirement.count, 0);
}

export function createMissionCopyDraft(source: PlannedMission): Partial<PlannedMission> {
  return {
    name: source.name ? `Copy of ${source.name}` : '',
    scheduledDateTime: '',
    duration: source.duration,
    location: source.location,
    operationType: source.operationType,
    primaryActivity: source.primaryActivity,
    secondaryActivity: source.secondaryActivity,
    tertiaryActivity: source.tertiaryActivity,
    leaders: cloneLeaders(source.leaders),
    shipRequirements: getMissionShipRequirements(source),
    personnelRequirements: getMissionPersonnelRequirements(source),
    ships: [],
    objectives: source.objectives || '',
    briefing: source.briefing || '',
    equipmentNotes: source.equipmentNotes,
    images: cloneImages(source.images),
    expectedParticipants: [],
    confirmedParticipants: [],
    status: 'DRAFT',
  };
}

function cloneShipRequirements(requirements: MissionShipRequirement[]): MissionShipRequirement[] {
  return requirements.map((requirement) => ({
    size: requirement.size,
    category: requirement.category,
    count: requirement.count,
  }));
}

function clonePersonnelRequirements(requirements: MissionPersonnelRequirement[]): MissionPersonnelRequirement[] {
  return requirements.map((requirement) => ({
    profession: requirement.profession,
    count: requirement.count,
  }));
}

function cloneLeaders(leaders?: MissionLeader[]): MissionLeader[] {
  return (leaders || []).map((leader) => ({ ...leader }));
}

function cloneImages(images?: MissionImage[]): MissionImage[] {
  return (images || []).map((image) => ({ ...image }));
}
