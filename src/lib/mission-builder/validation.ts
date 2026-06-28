import { z } from 'zod';
import type {
  BuilderMissionStatus,
  BuilderMissionType,
  MissionDraft,
} from '@/types/mission-builder';

export const missionStatusValues: readonly BuilderMissionStatus[] = [
  'Planning',
  'Briefing',
  'In Progress',
  'Debriefing',
  'Completed',
  'Archived',
  'Cancelled',
] as const;

export const missionTypeValues: readonly BuilderMissionType[] = [
  'Cargo Haul',
  'Salvage Operation',
  'Bounty Hunting',
  'Exploration',
  'Reconnaissance',
  'Medical Support',
  'Combat Patrol',
  'Escort Duty',
  'Mining Expedition',
] as const;

export const waypointSchema = z.object<z.ZodRawShape>({
  id: z.string().min(1),
  system: z.string().optional(),
  x: z.number().finite().optional(),
  y: z.number().finite().optional(),
  z: z.number().finite().optional(),
  note: z.string().optional(),
});

export const rewardSchema = z.object<z.ZodRawShape>({
  credits: z.number().int().nonnegative().optional(),
  rep: z.number().int().optional(),
  items: z.array(z.string().min(1)).optional(),
});

export const participantDraftSchema = z.object<z.ZodRawShape>({
  userId: z.string().min(1, 'userId is required'),
  userName: z.string().min(1, 'userName is required'),
  shipId: z.string().optional(),
  shipName: z.string().optional(),
  shipType: z.string().optional(),
  manufacturer: z.string().optional(),
  fleetyardsId: z.string().optional(),
  image: z.string().optional(),
  crewRequirement: z.number().int().nonnegative().optional(),
  isGroundSupport: z.boolean().optional(),
  roles: z.array(z.string().min(1)).optional(),
});

export const missionDraftSchema = z.object<z.ZodRawShape>({
  id: z.string().optional(),
  name: z.string().min(3, 'Name must be at least 3 characters'),
  type: z.enum(missionTypeValues as [BuilderMissionType, ...BuilderMissionType[]]),
  scheduledDateTime: z
    .string()
    .datetime({ offset: true, message: 'scheduledDateTime must be an ISO 8601 date-time string' }),
  status: z.enum(missionStatusValues as [BuilderMissionStatus, ...BuilderMissionStatus[]]),
  briefSummary: z.string().default(''),
  details: z.string().default(''),
  location: z.string().optional(),
  leaderId: z.string().optional(),
  leaderName: z.string().optional(),
  images: z.array(z.string().min(1)).default([]),
  participants: z.array(participantDraftSchema).default([]),
  waypoints: z.array(waypointSchema).optional(),
  rewards: rewardSchema.optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  version: z.number().int().optional(),
});

export type MissionDraftInput = z.input<typeof missionDraftSchema>;
export type MissionDraftOutput = z.output<typeof missionDraftSchema>;

export type FieldErrors = Record<string, string>;

export function validateMissionDraft(
  data: unknown
): { success: true; data: MissionDraftOutput } | { success: false; errors: FieldErrors } {
  const result = missionDraftSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join('.') || 'root';
    if (!errors[path]) {
      errors[path] = issue.message;
    }
  }
  return { success: false, errors };
}

export function isMissionDraftValid(data: unknown): data is MissionDraftOutput {
  return missionDraftSchema.safeParse(data).success;
}

// Normalize any parseable date string to a canonical ISO 8601 (UTC, "Z") value so
// that legacy/non-Z values still satisfy the tightened scheduledDateTime validation.
// Falls back to "now" when the input is missing or unparseable.
function normalizeScheduledDateTime(value: unknown): string {
  if (typeof value === 'string') {
    const ts = Date.parse(value);
    if (!Number.isNaN(ts)) return new Date(ts).toISOString();
  }
  return new Date().toISOString();
}

export function coerceToMissionDraft(data: Partial<MissionDraft>): MissionDraft {
  // Coerce partial/legacy shapes to a structurally valid MissionDraft while
  // preserving values. Unlike a strict schema.parse, this never throws on
  // incomplete input (e.g. an empty draft name) so it is safe to call from the
  // store reducer and Provider initialization.
  const d = data ?? {};
  return {
    id: d.id,
    name: typeof d.name === 'string' ? d.name : '',
    type:
      d.type && (missionTypeValues as readonly string[]).includes(d.type as string)
        ? (d.type as BuilderMissionType)
        : 'Cargo Haul',
    scheduledDateTime: normalizeScheduledDateTime(d.scheduledDateTime),
    status:
      d.status && (missionStatusValues as readonly string[]).includes(d.status as string)
        ? (d.status as BuilderMissionStatus)
        : 'Planning',
    briefSummary: typeof d.briefSummary === 'string' ? d.briefSummary : '',
    details: typeof d.details === 'string' ? d.details : '',
    location: d.location,
    leaderId: d.leaderId,
    leaderName: d.leaderName,
    images: Array.isArray(d.images)
      ? d.images.filter((x): x is string => typeof x === 'string' && x.length > 0)
      : [],
    participants: Array.isArray(d.participants) ? d.participants : [],
    waypoints: d.waypoints,
    rewards: d.rewards,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    version: d.version,
  };
}
