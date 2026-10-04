import { appearsOn, isCompletedOn } from './recurrence'
import { SECTIONS, type Priority, type SectionId, type Task } from './types'

/** P1 is worth the most. Scores are derived; nothing is stored on the task. */
export const PRIORITY_POINTS: Record<Priority, number> = {
  1: 5,
  2: 4,
  3: 3,
  4: 2,
  5: 1,
}

export interface DayScore {
  earned: number
  possible: number
}

export interface DayScores {
  overall: DayScore
  sections: Record<SectionId, DayScore>
}

export function pointsForPriority(priority: Priority): number {
  return PRIORITY_POINTS[priority]
}

export function formatScore(score: DayScore): string {
  return `${score.earned} / ${score.possible}`
}

/**
 * Points for tasks visible on `date` (due that day, or still showing via rollover),
 * and points earned when `completedDates` includes that same day.
 */
export function scoreTasks(tasks: readonly Task[], date: string): DayScore {
  let earned = 0
  let possible = 0
  for (const task of tasks) {
    if (!appearsOn(task, date)) continue
    const points = pointsForPriority(task.priority)
    possible += points
    if (isCompletedOn(task, date)) earned += points
  }
  return { earned, possible }
}

export function scoreDay(tasks: readonly Task[], date: string): DayScores {
  const sections = {} as Record<SectionId, DayScore>
  for (const section of SECTIONS) {
    sections[section] = scoreTasks(
      tasks.filter((task) => task.section === section),
      date,
    )
  }
  return { overall: scoreTasks(tasks, date), sections }
}
