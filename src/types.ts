export const SECTIONS = ['systems', 'scada', 'me'] as const
export type SectionId = (typeof SECTIONS)[number]

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
  section: SectionId
  isMit: boolean
  dueDate: string
  recurrence: Recurrence
  completedDates: string[]
  createdAt: string
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
