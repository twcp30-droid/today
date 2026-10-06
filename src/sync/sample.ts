import type { StoredState } from '../storage'
import type { Task } from '../types'

export function sampleTask(title: string, updatedAt: string): StoredState {
  const task: Task = {
    id: 't1',
    title,
    description: 'Keep the historian honest.',
    section: 'scada',
    isMit: true,
    dueDate: '2026-09-16',
    priority: 2,
    recurrence: { kind: 'weekdays' },
    completedDates: ['2026-09-16'],
    createdAt: updatedAt,
    updatedAt,
  }
  return { version: 1, tasks: [task], mostImportantObjective: '', updatedAt }
}
