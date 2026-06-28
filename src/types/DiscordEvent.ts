// Discord recurrence frequency (matches Discord API integer values)
export enum DiscordRecurrenceFrequency {
  YEARLY = 0,
  MONTHLY = 1,
  WEEKLY = 2,
  DAILY = 3,
}

// Nested "Nth weekday" specifier used by monthly recurrence rules
export interface DiscordRecurrenceNWeekday {
  n: number; // week number within the month (1-5)
  day: number; // weekday (0 = Monday ... 6 = Sunday)
}

// Narrow shape for a Discord scheduled event recurrence rule
// See: https://discord.com/developers/docs/resources/guild-scheduled-event#guild-scheduled-event-recurrence-rule-object
export interface DiscordRecurrenceRule {
  start: string; // ISO8601 timestamp the recurrence interval starts
  end?: string | null; // ISO8601 timestamp the recurrence interval ends (nullable)
  frequency: DiscordRecurrenceFrequency; // how often the event occurs
  interval: number; // spacing between events, defined by frequency
  by_weekday?: number[] | null; // set of weekdays the event occurs on
  by_n_weekday?: DiscordRecurrenceNWeekday[] | null; // set of "Nth weekday" specifiers
  by_month?: number[] | null; // set of months the event occurs on (1-12)
  by_month_day?: number[] | null; // set of days within a month the event occurs on (1-31)
  by_year_day?: number[] | null; // set of days within a year the event occurs on (1-364)
  count?: number | null; // total number of times the event will recur before stopping
}

// Discord API types for scheduled events
export interface DiscordScheduledEvent {
  id: string;
  guild_id: string;
  channel_id?: string;
  creator_id?: string;
  name: string;
  description?: string;
  scheduled_start_time: string;
  scheduled_end_time?: string;
  privacy_level: number;
  status: number;
  entity_type: number;
  entity_id?: string;
  entity_metadata?: {
    location?: string;
  };
  creator?: {
    id: string;
    username: string;
    avatar?: string;
  };
  user_count?: number;
  image?: string;
  recurrence_rule?: DiscordRecurrenceRule | null; // raw Discord recurrence rule (if recurring)
}

// Discord API Response
export interface DiscordEventsResponse {
  events: DiscordScheduledEvent[];
  error?: string;
}

// Event status enum
export enum DiscordEventStatus {
  SCHEDULED = 1,
  ACTIVE = 2,
  COMPLETED = 3,
  CANCELED = 4,
}

// Entity type enum
export enum DiscordEntityType {
  STAGE_INSTANCE = 1,
  VOICE = 2,
  EXTERNAL = 3,
}

// Privacy level enum
export enum DiscordPrivacyLevel {
  GUILD_ONLY = 2,
}
