export type Area = "systems" | "scada" | "me";

export type Frequency = "daily" | "weekly" | "monthly";

export interface Recurrence {
  frequency: Frequency;
  /** Repeat every N days / weeks / months. Minimum 1. */
  interval: number;
  /** 0 = Sunday … 6 = Saturday. Used for weekly rules. */
  weekdays?: number[];
}

export interface Task {
  id: string;
  title: string;
  notes: string;
  area: Area;
  startDate: string;
  recurrence: Recurrence | null;
  createdAt: string;
  /** When set, the series stops appearing after this date (inclusive last day). */
  archived?: boolean;
}

export interface AppState {
  version: 1;
  tasks: Task[];
  /** `${taskId}::${yyyy-mm-dd}` → ISO timestamp */
  completions: Record<string, string>;
  /** Hidden single occurrences for a recurring series. */
  skipped: Record<string, true>;
  /** Per-day MIT task ids, newest last. */
  mits: Record<string, string[]>;
  onboarded: boolean;
  /** Last local mutation time. Used for whole-document last-write-wins sync. */
  updatedAt?: string;
}

export type ViewMode = "today" | "month";

export const AREAS: { id: Area; label: string; blurb: string }[] = [
  {
    id: "systems",
    label: "Systems",
    blurb: "Home, tools, and the processes that keep things running.",
  },
  {
    id: "scada",
    label: "SCADA",
    blurb: "Operations, controls, plant, and work that cannot slip.",
  },
  {
    id: "me",
    label: "Me",
    blurb: "Health, people, learning, and the rest of a life.",
  },
];

export const WEEKDAYS = [
  { id: 0, label: "Sun", short: "S" },
  { id: 1, label: "Mon", short: "M" },
  { id: 2, label: "Tue", short: "T" },
  { id: 3, label: "Wed", short: "W" },
  { id: 4, label: "Thu", short: "T" },
  { id: 5, label: "Fri", short: "F" },
  { id: 6, label: "Sat", short: "S" },
];
