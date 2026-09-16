import { todayISO } from './dates'
import { buildSeed } from './seed'
import type { Task } from './types'

const STORAGE_KEY = 'today-tasks-v1'

interface StoredState {
  version: 1
  tasks: Task[]
}

export function loadTasks(): Task[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw === null) return buildSeed(todayISO())

  try {
    const parsed = JSON.parse(raw) as StoredState
    if (!Array.isArray(parsed.tasks)) return buildSeed(todayISO())
    return parsed.tasks
  } catch {
    return buildSeed(todayISO())
  }
}

export function saveTasks(tasks: Task[]): void {
  const payload: StoredState = { version: 1, tasks }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}
