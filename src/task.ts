import { DEFAULT_PRIORITY, type Priority, type Recurrence, type SectionId, type Task } from './types'

export interface NewTaskInput {
  title: string
  section: SectionId
  dueDate: string
  description?: string
  priority?: Priority
  isMit?: boolean
  recurrence?: Recurrence
  completedDates?: string[]
  completionUpdatedAt?: Record<string, string>
  id?: string
  createdAt?: string
  updatedAt?: string
}

export function newTask(input: NewTaskInput): Task {
  const task: Task = {
    id: input.id ?? crypto.randomUUID(),
    title: input.title,
    description: input.description ?? '',
    section: input.section,
    isMit: input.isMit ?? false,
    dueDate: input.dueDate,
    priority: input.priority ?? DEFAULT_PRIORITY,
    recurrence: input.recurrence ?? { kind: 'once' },
    completedDates: input.completedDates ?? [],
    createdAt: input.createdAt ?? new Date().toISOString(),
  }
  if (input.updatedAt) task.updatedAt = input.updatedAt
  if (input.completionUpdatedAt && Object.keys(input.completionUpdatedAt).length > 0) {
    task.completionUpdatedAt = input.completionUpdatedAt
  }
  return task
}

export function patchTask(task: Task, updates: Partial<Task>): Task {
  return { ...task, ...updates }
}

/**
 * Add or remove one day in `completedDates`. Same list the day view toggles.
 * Records the action time without bumping `updatedAt`, so a check-off is not
 * treated as a newer edit of the task body.
 */
export function toggleCompletedOn(task: Task, date: string, at = new Date().toISOString()): Task {
  const done = task.completedDates.includes(date)
  return {
    ...task,
    completedDates: done
      ? task.completedDates.filter((entry) => entry !== date)
      : [...task.completedDates, date],
    completionUpdatedAt: { ...task.completionUpdatedAt, [date]: at },
  }
}
