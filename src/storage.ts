import { todayISO } from './dates'
import { buildSeed } from './seed'
import { SECTIONS, type Recurrence, type SectionId, type Task } from './types'

export const STORAGE_KEY = 'today-tasks-v1'

export interface StoredState {
  version: 1
  tasks: Task[]
  /** Standing north-star text. Not a task: no due date or completion. */
  mostImportantObjective: string
  /** Last user mutation. Used for whole-document last-write-wins sync. */
  updatedAt?: string
}

export function emptyState(): StoredState {
  return { version: 1, tasks: [], mostImportantObjective: '' }
}

export function loadState(): StoredState {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw === null) return { version: 1, tasks: buildSeed(todayISO()), mostImportantObjective: '' }

  try {
    return parseStoredState(raw)
  } catch {
    return { version: 1, tasks: buildSeed(todayISO()), mostImportantObjective: '' }
  }
}

export function saveState(state: StoredState): void {
  const payload: StoredState = {
    version: 1,
    tasks: state.tasks,
    mostImportantObjective: state.mostImportantObjective ?? '',
    updatedAt: state.updatedAt,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

export function loadTasks(): Task[] {
  return loadState().tasks
}

export function saveTasks(tasks: Task[]): void {
  const current = loadState()
  saveState({ ...current, tasks })
}

export function touchState(state: StoredState, now = new Date()): StoredState {
  return { ...state, updatedAt: now.toISOString() }
}

export function stateTimestamp(state: Pick<StoredState, 'updatedAt'>): number {
  if (!state.updatedAt) return 0
  const value = Date.parse(state.updatedAt)
  return Number.isNaN(value) ? 0 : value
}

export function parseStoredState(raw: string): StoredState {
  const parsed: unknown = JSON.parse(raw)
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('invalid payload')
  }
  const record = parsed as Record<string, unknown>
  const tasks = Array.isArray(record.tasks) ? record.tasks.filter(isValidTask) : []
  const mostImportantObjective =
    typeof record.mostImportantObjective === 'string' ? record.mostImportantObjective : ''
  const updatedAt =
    typeof record.updatedAt === 'string' && !Number.isNaN(Date.parse(record.updatedAt))
      ? record.updatedAt
      : undefined
  return { version: 1, tasks, mostImportantObjective, updatedAt }
}

function isValidTask(value: unknown): value is Task {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const task = value as Record<string, unknown>
  if (typeof task.id !== 'string' || typeof task.title !== 'string') return false
  if (!SECTIONS.includes(task.section as SectionId)) return false
  if (typeof task.dueDate !== 'string' || typeof task.createdAt !== 'string') return false
  if (typeof task.isMit !== 'boolean') return false
  if (!isValidRecurrence(task.recurrence)) return false
  if (!Array.isArray(task.completedDates) || !task.completedDates.every((d) => typeof d === 'string')) {
    return false
  }
  return true
}

function isValidRecurrence(value: unknown): value is Recurrence {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const rec = value as Record<string, unknown>
  if (rec.kind === 'once' || rec.kind === 'daily' || rec.kind === 'weekdays') return true
  if (rec.kind === 'weekly') return typeof rec.weekday === 'number'
  if (rec.kind === 'every_n') return typeof rec.n === 'number'
  return false
}
