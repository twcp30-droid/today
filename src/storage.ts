import { todayISO } from './dates'
import { buildSeed } from './seed'
import { DEFAULT_PRIORITY, SECTIONS, isPriority, type Recurrence, type SectionId, type Task } from './types'

export const STORAGE_KEY = 'today-tasks-v1'

/** Deletes older than this are forgotten so a long-offline copy can resurface. */
export const TOMBSTONE_TTL_MS = 60 * 24 * 60 * 60 * 1000

export interface Tombstone {
  id: string
  deletedAt: string
}

export interface StoredState {
  version: 1
  tasks: Task[]
  /** Standing north-star text. Not a task: no due date or completion. */
  mostImportantObjective: string
  /** When `mostImportantObjective` was last saved. Missing means time 0. */
  mostImportantObjectiveUpdatedAt?: string
  /** Ids removed on this device. Stops the other device from resurrecting them. */
  tombstones?: Tombstone[]
  /**
   * Last local mutation. Starts auto-sync and marks a device as edited.
   * Task and objective conflicts use their own timestamps, not this one.
   */
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
  }
  if (state.mostImportantObjectiveUpdatedAt) {
    payload.mostImportantObjectiveUpdatedAt = state.mostImportantObjectiveUpdatedAt
  }
  if (state.tombstones && state.tombstones.length > 0) {
    payload.tombstones = state.tombstones
  }
  if (state.updatedAt) payload.updatedAt = state.updatedAt
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

export function stampTask(task: Task, updatedAt: string): Task {
  return { ...task, updatedAt }
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
  const tasks = Array.isArray(record.tasks)
    ? record.tasks.map(parseTask).filter((task): task is Task => task !== null)
    : []
  const mostImportantObjective =
    typeof record.mostImportantObjective === 'string' ? record.mostImportantObjective : ''
  const mostImportantObjectiveUpdatedAt = validTimestamp(record.mostImportantObjectiveUpdatedAt)
  const updatedAt = validTimestamp(record.updatedAt)
  const tombstones = parseTombstones(record.tombstones)
  const state: StoredState = { version: 1, tasks, mostImportantObjective }
  if (mostImportantObjectiveUpdatedAt) {
    state.mostImportantObjectiveUpdatedAt = mostImportantObjectiveUpdatedAt
  }
  if (tombstones) state.tombstones = tombstones
  if (updatedAt) state.updatedAt = updatedAt
  return state
}

function validTimestamp(value: unknown): string | undefined {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : undefined
}

function parseTombstones(value: unknown): Tombstone[] | undefined {
  if (!Array.isArray(value)) return undefined
  const tombstones: Tombstone[] = []
  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) continue
    const record = entry as Record<string, unknown>
    const deletedAt = validTimestamp(record.deletedAt)
    if (typeof record.id !== 'string' || !record.id || !deletedAt) continue
    tombstones.push({ id: record.id, deletedAt })
  }
  return tombstones.length > 0 ? tombstones : undefined
}

/** Accepts current and older task blobs. Missing priority/description get defaults. */
export function parseTask(value: unknown): Task | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  const task = value as Record<string, unknown>
  if (typeof task.id !== 'string' || typeof task.title !== 'string') return null
  if (!SECTIONS.includes(task.section as SectionId)) return null
  if (typeof task.dueDate !== 'string' || typeof task.createdAt !== 'string') return null
  if (typeof task.isMit !== 'boolean') return null
  if (!isValidRecurrence(task.recurrence)) return null
  if (!Array.isArray(task.completedDates) || !task.completedDates.every((d) => typeof d === 'string')) {
    return null
  }
  const updatedAt = validTimestamp(task.updatedAt)
  const completionUpdatedAt = parseCompletionUpdatedAt(task.completionUpdatedAt)
  const parsed: Task = {
    id: task.id,
    title: task.title,
    description: typeof task.description === 'string' ? task.description : '',
    section: task.section as SectionId,
    isMit: task.isMit,
    dueDate: task.dueDate,
    priority: isPriority(task.priority) ? task.priority : DEFAULT_PRIORITY,
    recurrence: task.recurrence,
    completedDates: task.completedDates,
    createdAt: task.createdAt,
  }
  if (updatedAt) parsed.updatedAt = updatedAt
  if (completionUpdatedAt) parsed.completionUpdatedAt = completionUpdatedAt
  return parsed
}

function parseCompletionUpdatedAt(value: unknown): Record<string, string> | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const stamps: Record<string, string> = {}
  for (const [date, at] of Object.entries(value)) {
    if (!date || typeof at !== 'string' || Number.isNaN(Date.parse(at))) continue
    stamps[date] = at
  }
  return Object.keys(stamps).length > 0 ? stamps : undefined
}

function isValidRecurrence(value: unknown): value is Recurrence {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const rec = value as Record<string, unknown>
  if (rec.kind === 'once' || rec.kind === 'daily' || rec.kind === 'weekdays') return true
  if (rec.kind === 'weekly') return typeof rec.weekday === 'number'
  if (rec.kind === 'every_n') return typeof rec.n === 'number'
  return false
}
