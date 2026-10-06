export const SECTIONS = ['systems', 'scada', 'me'] as const
export type SectionId = (typeof SECTIONS)[number]

export const PRIORITIES = [1, 2, 3, 4, 5] as const
export type Priority = (typeof PRIORITIES)[number]
export const DEFAULT_PRIORITY: Priority = 3

export type Recurrence =
  | { kind: 'once' }
  | { kind: 'daily' }
  | { kind: 'weekdays' }
  | { kind: 'weekly'; weekday: number }
  | { kind: 'every_n'; n: number }

export type RecurrenceKind = Recurrence['kind']

export interface Task {
  id: string
  title: string
  description: string
  section: SectionId
  isMit: boolean
  dueDate: string
  priority: Priority
  recurrence: Recurrence
  completedDates: string[]
  createdAt: string
  /**
   * Last edit of task fields (title, description, priority, due date,
   * recurrence, section, MIT flag, and the rest of the body).
   * Missing on older blobs; merge treats that as time 0.
   * Completion check-offs do not bump this.
   */
  updatedAt?: string
  /**
   * Last check or uncheck for each YYYY-MM-DD. A date listed here but absent
   * from `completedDates` was unchecked at that time, so the uncheck can win
   * over an older check from the other device.
   */
  completionUpdatedAt?: Record<string, string>
}

export function isPriority(value: unknown): value is Priority {
  return typeof value === 'number' && PRIORITIES.includes(value as Priority)
}

export const SECTION_META: Record<
  SectionId,
  { label: string; hint: string }
> = {
  systems: { label: 'Systems', hint: 'Plant, power, reliability' },
  scada: { label: 'SCADA', hint: 'Alarms, screens, data' },
  me: { label: 'Me', hint: 'Health, home, people' },
}

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
