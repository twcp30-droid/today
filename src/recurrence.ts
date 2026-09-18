import { addDays, diffDays, weekday } from './dates'
import type { Recurrence, Task } from './types'

export function firstWeeklyOnOrAfter(start: string, targetWeekday: number): string {
  const offset = (targetWeekday - weekday(start) + 7) % 7
  return addDays(start, offset)
}

export function occursOn(task: Task, date: string): boolean {
  const start = task.dueDate
  const rec = task.recurrence

  switch (rec.kind) {
    case 'once':
      return date === start
    case 'daily':
      return date >= start
    case 'weekdays': {
      const day = weekday(date)
      return date >= start && day >= 1 && day <= 5
    }
    case 'weekly':
      return date >= firstWeeklyOnOrAfter(start, rec.weekday) && weekday(date) === rec.weekday
    case 'every_n': {
      const n = Math.max(1, rec.n)
      if (date < start) return false
      return diffDays(start, date) % n === 0
    }
  }
}

export function nextOccurrence(task: Task, afterDate: string): string | null {
  if (task.recurrence.kind === 'once') {
    return task.dueDate > afterDate ? task.dueDate : null
  }

  for (let i = 1; i <= 400; i += 1) {
    const date = addDays(afterDate, i)
    if (occursOn(task, date)) return date
  }
  return null
}

/** Latest scheduled day strictly before `beforeDate`, if any. */
export function previousOccurrence(task: Task, beforeDate: string): string | null {
  if (task.recurrence.kind === 'once') {
    return task.dueDate < beforeDate ? task.dueDate : null
  }

  const seriesStart =
    task.recurrence.kind === 'weekly'
      ? firstWeeklyOnOrAfter(task.dueDate, task.recurrence.weekday)
      : task.dueDate

  for (let i = 1; i <= 400; i += 1) {
    const date = addDays(beforeDate, -i)
    if (occursOn(task, date)) return date
    if (date <= seriesStart) return null
  }
  return null
}

/**
 * Incomplete work rolls forward without cloning a series.
 *
 * A task appears on `date` when it is scheduled that day, completed that day
 * (catch-up on a gap day), or still open from the previous scheduled instance
 * and `date` is before the next scheduled instance.
 */
export function appearsOn(task: Task, date: string): boolean {
  if (occursOn(task, date) || isCompletedOn(task, date)) return true

  const prev = previousOccurrence(task, date)
  if (!prev || isCompletedOn(task, prev)) return false
  if (task.completedDates.some((completed) => completed > prev && completed < date)) return false

  const next = nextOccurrence(task, prev)
  if (next !== null && date >= next) return false
  return true
}

export function isOpenOn(task: Task, date: string): boolean {
  return appearsOn(task, date) && !isCompletedOn(task, date)
}

/** Scheduled day this row rolled from, or null when it is due on `date`. */
export function rolledFrom(task: Task, date: string): string | null {
  if (occursOn(task, date) || !appearsOn(task, date)) return null
  return previousOccurrence(task, date)
}

export function recurrenceLabel(rec: Recurrence): string {
  switch (rec.kind) {
    case 'once':
      return 'Once'
    case 'daily':
      return 'Daily'
    case 'weekdays':
      return 'Weekdays'
    case 'weekly': {
      const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      return `Weekly · ${names[rec.weekday]}`
    }
    case 'every_n':
      return rec.n === 1 ? 'Daily' : `Every ${rec.n} days`
  }
}

export function isCompletedOn(task: Task, date: string): boolean {
  return task.completedDates.includes(date)
}
