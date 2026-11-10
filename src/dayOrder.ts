import { isCompletedOn } from './recurrence'
import type { Task } from './types'

/**
 * Order for the normal task list on the Today day view.
 * The Most Important Task stays in its own slot and is not passed in.
 *
 * Tasks finished on the viewed day sink below open work, and each group is
 * ordered on its own: priority (P1 first), earliest due date (none last),
 * then oldest creation time, then id so equal timestamps stay put.
 */
export function orderDayTasks(tasks: readonly Task[], date: string): Task[] {
  return [...tasks].sort((a, b) => compareDayTasks(a, b, date))
}

export function compareDayTasks(a: Task, b: Task, date: string): number {
  const doneDelta = Number(isCompletedOn(a, date)) - Number(isCompletedOn(b, date))
  if (doneDelta !== 0) return doneDelta

  if (a.priority !== b.priority) return a.priority - b.priority

  const dueDelta = compareDueDate(a.dueDate, b.dueDate)
  if (dueDelta !== 0) return dueDelta

  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1

  return a.id.localeCompare(b.id)
}

function compareDueDate(a: string, b: string): number {
  const aMissing = a.trim() === ''
  const bMissing = b.trim() === ''
  if (aMissing || bMissing) {
    if (aMissing && bMissing) return 0
    return aMissing ? 1 : -1
  }
  if (a === b) return 0
  return a < b ? -1 : 1
}
