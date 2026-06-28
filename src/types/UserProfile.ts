import { UserShip } from './user';
import { TIMEZONE_OPTIONS } from '@/lib/timezone';

export interface UserProfile {
  name: string;
  handle: string;
  photo: string;
  subsidiary: string;
  payGrade: string;
  position: string;
  email: string;
  timezone: string;
  preferredGameplayLoops: string[];
  ships: UserShip[];
}

// Predefined options for the dropdown fields
export const subsidiaryOptions = [
  'AydoCorp HQ',
  'Aydo Express',
  'Aydo Mining',
  'Aydo Salvage',
  'Aydo Security',
  'Aydo Research',
  'Aydo Medical',
  'Aydo Exploration',
];

export const payGradeOptions = ['Entry Level', 'Junior', 'Senior', 'Lead', 'Director', 'Executive'];

// IANA timezone identifiers (compatible with the Intl `timeZone` option).
// Derived from the canonical list in `@/lib/timezone` so the value set stays in
// sync; friendly labels live on TIMEZONE_OPTIONS for components that need them.
// Previously these were `UTC+HH:MM` offset strings, which are invalid as Intl
// time zones and broke timezone-aware formatting (hooks-&-ty-18).
export const timezoneOptions: string[] = TIMEZONE_OPTIONS.map((tz) => tz.value);

export const gameplayLoopOptions = [
  'Mining',
  'Salvage',
  'Bounty Hunting',
  'Security',
  'Medical',
  'Trading',
  'Exploration',
  'Combat',
  'Transportation',
  'Escort',
  'Search & Rescue',
];
