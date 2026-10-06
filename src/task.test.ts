import { isCompletedOn } from './recurrence'
import { newTask, toggleCompletedOn } from './task'

describe('toggleCompletedOn', () => {
  const task = newTask({
    id: 'a',
    title: 'Walk the plant',
    section: 'systems',
    dueDate: '2026-09-21',
    completedDates: ['2026-09-20'],
    createdAt: '2026-09-01T00:00:00.000Z',
  })

  it('records the due date the Tables checkbox completes', () => {
    const next = toggleCompletedOn(task, task.dueDate)
    expect(next.completedDates).toEqual(['2026-09-20', '2026-09-21'])
    expect(isCompletedOn(next, next.dueDate)).toBe(true)
    expect(next).toMatchObject({ id: task.id, title: task.title, dueDate: task.dueDate })
  })

  it('clears that date again without dropping other completions', () => {
    const done = toggleCompletedOn(task, task.dueDate)
    const undone = toggleCompletedOn(done, done.dueDate)
    expect(undone.completedDates).toEqual(['2026-09-20'])
    expect(isCompletedOn(undone, undone.dueDate)).toBe(false)
  })

  it('records the check and uncheck time without marking the task body edited', () => {
    const stamped = { ...task, updatedAt: '2026-09-01T00:00:00.000Z' }
    const at = '2026-09-21T15:00:00.000Z'
    const done = toggleCompletedOn(stamped, task.dueDate, at)
    expect(done.updatedAt).toBe(stamped.updatedAt)
    expect(done.completionUpdatedAt).toEqual({ [task.dueDate]: at })
    const undone = toggleCompletedOn(done, task.dueDate, '2026-09-21T16:00:00.000Z')
    expect(undone.completedDates).toEqual(['2026-09-20'])
    expect(undone.completionUpdatedAt?.[task.dueDate]).toBe('2026-09-21T16:00:00.000Z')
    expect(undone.updatedAt).toBe(stamped.updatedAt)
  })
})
