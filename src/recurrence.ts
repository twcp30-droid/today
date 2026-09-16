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
