import { addDays } from "./date";
import { occurrenceKey, taskOccursOn } from "./recurrence";
import {
  emptyState,
  isMit,
  loadState,
  newTask,
  occurrenceCompleted,
  occurrenceSkipped,
  parseImportedState,
  saveState,
} from "./storage";
import type { AppState, Area, Recurrence, Task } from "./types";

export function tasksForDate(state: AppState, date: string): Task[] {
  return state.tasks.filter(
    (task) => taskOccursOn(task, date) && !occurrenceSkipped(state, task.id, date),
  );
}

export function toggleComplete(state: AppState, taskId: string, date: string, now = new Date()): AppState {
  const key = occurrenceKey(taskId, date);
  const completions = { ...state.completions };
  if (completions[key]) delete completions[key];
  else completions[key] = now.toISOString();
  return { ...state, completions };
}

export function toggleMit(state: AppState, taskId: string, date: string): AppState {
  const current = state.mits[date] ?? [];
  const next = current.includes(taskId)
    ? current.filter((id) => id !== taskId)
    : [...current, taskId];
  return { ...state, mits: { ...state.mits, [date]: next } };
}

export function addTask(
  state: AppState,
  input: {
    title: string;
    notes?: string;
    area: Area;
    startDate: string;
    recurrence?: Recurrence | null;
    mit?: boolean;
  },
): AppState {
  const task = newTask(input);
  const next: AppState = { ...state, tasks: [...state.tasks, task] };
  if (input.mit) return toggleMit(next, task.id, input.startDate);
  return next;
}

export function updateTask(state: AppState, taskId: string, patch: Partial<Task>): AppState {
  return {
    ...state,
    tasks: state.tasks.map((task) => (task.id === taskId ? { ...task, ...patch, id: task.id } : task)),
  };
}

export function skipOccurrence(state: AppState, taskId: string, date: string): AppState {
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) return state;
  if (!task.recurrence) {
    return deleteSeries(state, taskId);
  }
  const key = occurrenceKey(taskId, date);
  const skipped = { ...state.skipped, [key]: true as const };
  const completions = { ...state.completions };
  delete completions[key];
  const mits = { ...state.mits };
  mits[date] = (mits[date] ?? []).filter((id) => id !== taskId);
  return { ...state, skipped, completions, mits };
}

export function deleteSeries(state: AppState, taskId: string): AppState {
  const prefix = `${taskId}::`;
  const completions = Object.fromEntries(
    Object.entries(state.completions).filter(([key]) => !key.startsWith(prefix)),
  );
  const skipped = Object.fromEntries(
    Object.entries(state.skipped).filter(([key]) => !key.startsWith(prefix)),
  ) as AppState["skipped"];
  const mits = Object.fromEntries(
    Object.entries(state.mits).map(([date, ids]) => [date, ids.filter((id) => id !== taskId)]),
  );
  return {
    ...state,
    tasks: state.tasks.filter((task) => task.id !== taskId),
    completions,
    skipped,
    mits,
  };
}

export function moveOccurrence(
  state: AppState,
  taskId: string,
  fromDate: string,
  days = 1,
): AppState {
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) return state;
  const toDate = addDays(fromDate, days);
  if (!task.recurrence) {
    let next = updateTask(state, taskId, { startDate: toDate });
    if (isMit(state, taskId, fromDate)) {
      next = toggleMit(next, taskId, fromDate);
      if (!isMit(next, taskId, toDate)) next = toggleMit(next, taskId, toDate);
    }
    return next;
  }
  let next = skipOccurrence(state, taskId, fromDate);
  const oneShot = newTask({
    title: task.title,
    notes: task.notes,
    area: task.area,
    startDate: toDate,
  });
  next = { ...next, tasks: [...next.tasks, oneShot] };
  if (isMit(state, taskId, fromDate)) next = toggleMit(next, oneShot.id, toDate);
  return next;
}

export { isMit, loadState, occurrenceCompleted, parseImportedState, saveState, emptyState };
