import type { Task } from './types'

export type SortKey = 'priority' | 'dueDate'
export type SortDir = 'asc' | 'desc'

export interface SortColumn {
  key: SortKey
  dir: SortDir
}

export interface SortSpec {
  primary: SortColumn
  secondary?: SortColumn
}

export const DEFAULT_TABLE_SORT: SortSpec = {
  primary: { key: 'priority', dir: 'asc' },
  secondary: { key: 'dueDate', dir: 'asc' },
}

export function toggleSort(current: SortSpec, clicked: SortKey): SortSpec {
  if (current.primary.key === clicked) {
    return {
      primary: { key: clicked, dir: current.primary.dir === 'asc' ? 'desc' : 'asc' },
      secondary: current.secondary,
    }
  }

  return {
    primary: { key: clicked, dir: 'asc' },
    secondary: current.primary,
  }
}

function compareKey(a: Task, b: Task, key: SortKey, dir: SortDir): number {
  const left = key === 'priority' ? a.priority : a.dueDate
  const right = key === 'priority' ? b.priority : b.dueDate
  const delta = left < right ? -1 : left > right ? 1 : 0
  return dir === 'asc' ? delta : -delta
}

export function compareTasks(a: Task, b: Task, spec: SortSpec): number {
  const primary = compareKey(a, b, spec.primary.key, spec.primary.dir)
  if (primary !== 0) return primary
  if (spec.secondary && spec.secondary.key !== spec.primary.key) {
    const secondary = compareKey(a, b, spec.secondary.key, spec.secondary.dir)
    if (secondary !== 0) return secondary
  }
  return a.title.localeCompare(b.title) || a.id.localeCompare(b.id)
}

export function sortTasks(tasks: Task[], spec: SortSpec): Task[] {
  return [...tasks].sort((a, b) => compareTasks(a, b, spec))
}
