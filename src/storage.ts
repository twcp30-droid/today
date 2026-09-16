import type { AppState, Area, Recurrence, Task } from "./types";
import { occurrenceKey } from "./recurrence";

export const STORAGE_KEY = "today-app:v1";

export function emptyState(): AppState {
  return {
    version: 1,
    tasks: [],
    completions: {},
    skipped: {},
    mits: {},
    onboarded: false,
  };
}

export function occurrenceCompleted(
  state: AppState,
  taskId: string,
  date: string,
): boolean {
  return Boolean(state.completions[occurrenceKey(taskId, date)]);
}

export function occurrenceSkipped(
  state: AppState,
  taskId: string,
  date: string,
): boolean {
  return Boolean(state.skipped[occurrenceKey(taskId, date)]);
}

export function isMit(state: AppState, taskId: string, date: string): boolean {
  return (state.mits[date] ?? []).includes(taskId);
}

export function newTask(input: {
  title: string;
  notes?: string;
  area: Area;
  startDate: string;
  recurrence?: Recurrence | null;
  now?: Date;
}): Task {
  const now = input.now ?? new Date();
  return {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    notes: (input.notes ?? "").trim(),
    area: input.area,
    startDate: input.startDate,
    recurrence: input.recurrence ?? null,
    createdAt: now.toISOString(),
  };
}

export function exportState(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

export function parseImportedState(raw: string): AppState {
  const parsed: unknown = JSON.parse(raw);
  return migrate(parsed);
}

export function loadState(
  storage: Pick<Storage, "getItem"> = localStorage,
): AppState {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    return migrate(JSON.parse(raw));
  } catch {
    return emptyState();
  }
}

export function saveState(
  state: AppState,
  storage: Pick<Storage, "setItem"> = localStorage,
): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function migrate(raw: unknown): AppState {
  const base = emptyState();
  if (!isRecord(raw)) return base;

  const tasks = Array.isArray(raw.tasks)
    ? raw.tasks.filter(isValidTask)
    : [];
  const completions: Record<string, string> = isRecord(raw.completions)
    ? Object.fromEntries(
        Object.entries(raw.completions).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string",
        ),
      )
    : {};
  const skipped = isRecord(raw.skipped)
    ? Object.fromEntries(
        Object.entries(raw.skipped)
          .filter(([key, value]) => typeof key === "string" && value === true)
          .map(([key]) => [key, true as const]),
      )
    : {};
  const mits = isRecord(raw.mits)
    ? Object.fromEntries(
        Object.entries(raw.mits).filter(
          (entry): entry is [string, string[]] =>
            typeof entry[0] === "string" &&
            Array.isArray(entry[1]) &&
            entry[1].every((id) => typeof id === "string"),
        ),
      )
    : {};

  return {
    version: 1,
    tasks,
    completions,
    skipped,
    mits,
    onboarded: Boolean(raw.onboarded),
  };
}

function isValidTask(value: unknown): value is Task {
  if (!isRecord(value)) return false;
  const area = value.area;
  if (area !== "systems" && area !== "scada" && area !== "me") return false;
  if (typeof value.id !== "string" || typeof value.title !== "string") return false;
  if (typeof value.startDate !== "string") return false;
  return true;
}
