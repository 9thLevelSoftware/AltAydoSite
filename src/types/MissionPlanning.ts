// Shared mission planning types used by planned missions.

export type ActivityType = 'Mining' | 'Salvage' | 'Escort' | 'Transport' | 'Medical' | 'Combat';

export type OperationType = 'Ground Operations' | 'Space Operations';

export type ShipSize = 'Small' | 'Medium' | 'Large' | 'Capital';

export type ShipCategory = 'Fighter' | 'Transport' | 'Industrial' | 'Medical';

export type PersonnelProfession = 'Pilot' | 'Gunner' | 'Medic' | 'Infantry' | 'Engineer';

export interface MissionShipRequirement {
  size: ShipSize;
  category: ShipCategory;
  count: number;
}

export interface MissionPersonnelRequirement {
  profession: PersonnelProfession;
  count: number;
}

export const ACTIVITIES: ActivityType[] = ['Mining', 'Salvage', 'Escort', 'Transport', 'Medical', 'Combat'];

export const OPERATION_TYPES: OperationType[] = ['Ground Operations', 'Space Operations'];

export const SHIP_SIZES: ShipSize[] = ['Small', 'Medium', 'Large', 'Capital'];

export const SHIP_CATEGORIES: ShipCategory[] = ['Fighter', 'Transport', 'Industrial', 'Medical'];

export const PERSONNEL_PROFESSIONS: PersonnelProfession[] = ['Pilot', 'Gunner', 'Medic', 'Infantry', 'Engineer'];
