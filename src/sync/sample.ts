import type { StoredState } from '../storage'
import type { Task } from '../types'

export function sampleTask(title: string, updatedAt: string): StoredState {
  const task: Task = {
    id: 't1',
    title,
    section: 'scada',
    isMit: true,
    dueDate: '2026-09-16',
    recurrence: { kind: 'weekdays' },
    completedDates: ['2026-09-16'],
    createdAt: updatedAt,
  }
  return { version: 1, tasks: [task], updatedAt }
}
