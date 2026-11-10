import { orderDayTasks } from './dayOrder'
import { DEFAULT_PRIORITY, type Priority, type Task } from './types'

const date = '2026-09-21'

function task(overrides: Partial<Task> & Pick<Task, 'id'>): Task {
  return {
    title: overrides.id,
    description: '',
    section: 'systems',
    isMit: false,
    dueDate: date,
    priority: DEFAULT_PRIORITY,
    recurrence: { kind: 'once' },
    completedDates: [],
    createdAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  }
}

function ids(tasks: Task[], viewed = date): string[] {
  return orderDayTasks(tasks, viewed).map((item) => item.id)
}

describe('day list order', () => {
  it('puts a newly added higher priority ahead of older lower priorities', () => {
    const older = task({
      id: 'older-p5',
      priority: 5,
      createdAt: '2026-09-01T00:00:00.000Z',
    })
    const added = task({
      id: 'added-p1',
      priority: 1,
      createdAt: '2026-09-21T12:00:00.000Z',
    })
    expect(ids([older, added])).toEqual(['added-p1', 'older-p5'])
  })

  it('orders P1 through P5 regardless of list position', () => {
    const tasks = [5, 3, 1, 4, 2].map((priority) =>
      task({ id: `p${priority}`, priority: priority as Priority }),
    )
    expect(ids(tasks)).toEqual(['p1', 'p2', 'p3', 'p4', 'p5'])
  })

  it('moves a task when its priority is edited', () => {
    const low = task({ id: 'edited', priority: 4 })
    const mid = task({ id: 'mid', priority: 2 })
    expect(ids([low, mid])).toEqual(['mid', 'edited'])
    expect(ids([{ ...low, priority: 1 }, mid])).toEqual(['edited', 'mid'])
  })

  it('breaks a priority tie with the earliest due date and puts a missing due date last', () => {
    const later = task({ id: 'later', priority: 2, dueDate: '2026-09-22' })
    const earlier = task({ id: 'earlier', priority: 2, dueDate: '2026-09-10' })
    const blank = task({ id: 'blank', priority: 2, dueDate: '' })
    const whitespace = task({ id: 'whitespace', priority: 2, dueDate: '   ' })
    expect(ids([later, whitespace, earlier, blank])).toEqual(['earlier', 'later', 'blank', 'whitespace'])
  })

  it('breaks a priority and due-date tie by creation time, oldest first', () => {
    const newer = task({
      id: 'newer',
      priority: 3,
      dueDate: '2026-09-21',
      createdAt: '2026-09-02T08:00:00.000Z',
    })
    const older = task({
      id: 'older',
      priority: 3,
      dueDate: '2026-09-21',
      createdAt: '2026-09-01T08:00:00.000Z',
    })
    expect(ids([newer, older])).toEqual(['older', 'newer'])
  })

  it('uses id when priority, due date, and creation time match', () => {
    const zed = task({ id: 'z', priority: 2, dueDate: '2026-09-21', createdAt: '2026-09-01T00:00:00.000Z' })
    const em = task({ id: 'm', priority: 2, dueDate: '2026-09-21', createdAt: '2026-09-01T00:00:00.000Z' })
    expect(ids([zed, em])).toEqual(['m', 'z'])
  })

  it('sinks tasks completed on the viewed day and sorts each group by priority', () => {
    const doneP1 = task({ id: 'done-p1', priority: 1, completedDates: [date] })
    const openP5 = task({ id: 'open-p5', priority: 5 })
    const openP2 = task({ id: 'open-p2', priority: 2 })
    const doneP3 = task({ id: 'done-p3', priority: 3, completedDates: [date] })
    expect(ids([doneP1, openP5, doneP3, openP2])).toEqual(['open-p2', 'open-p5', 'done-p1', 'done-p3'])
  })

  it('keeps a completion on another day in the open group for this day', () => {
    const checkedElsewhere = task({ id: 'other-day', priority: 4, completedDates: ['2026-09-20'] })
    const openP5 = task({ id: 'open-p5', priority: 5 })
    expect(ids([openP5, checkedElsewhere])).toEqual(['other-day', 'open-p5'])
  })

  it('does not treat the Most Important Task flag as a sort key', () => {
    const mit = task({ id: 'mit', priority: 5, isMit: true })
    const open = task({ id: 'open', priority: 1 })
    expect(ids([mit, open])).toEqual(['open', 'mit'])
  })

  it('does not mutate the input list', () => {
    const input = [task({ id: 'b', priority: 4 }), task({ id: 'a', priority: 1 })]
    const before = input.map((item) => item.id)
    expect(ids(input)).toEqual(['a', 'b'])
    expect(input.map((item) => item.id)).toEqual(before)
  })
})
