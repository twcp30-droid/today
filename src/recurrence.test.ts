import { appearsOn, isOpenOn, nextOccurrence, occursOn, previousOccurrence, rolledFrom } from './recurrence'
import type { Recurrence, Task } from './types'

function makeTask(overrides: Partial<Task> & Pick<Task, 'dueDate' | 'recurrence'>): Task {
  return {
    id: 't1',
    title: 'Task',
    section: 'systems',
    isMit: false,
    completedDates: [],
    createdAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  }
}

const once: Recurrence = { kind: 'once' }
const daily: Recurrence = { kind: 'daily' }
const weekdays: Recurrence = { kind: 'weekdays' }
const weeklyMonday: Recurrence = { kind: 'weekly', weekday: 1 }
const every7: Recurrence = { kind: 'every_n', n: 7 }

describe('incomplete task rollover', () => {
  it('keeps an incomplete one-off visible on later days until it is completed', () => {
    const task = makeTask({ dueDate: '2026-09-14', recurrence: once })
    expect(occursOn(task, '2026-09-14')).toBe(true)
    expect(appearsOn(task, '2026-09-15')).toBe(true)
    expect(appearsOn(task, '2026-09-18')).toBe(true)
    expect(isOpenOn(task, '2026-09-18')).toBe(true)
    expect(rolledFrom(task, '2026-09-18')).toBe('2026-09-14')
    expect(previousOccurrence(task, '2026-09-18')).toBe('2026-09-14')
  })

  it('does not show a one-off before its due date', () => {
    const task = makeTask({ dueDate: '2026-09-21', recurrence: once })
    expect(appearsOn(task, '2026-09-18')).toBe(false)
    expect(nextOccurrence(task, '2026-09-18')).toBe('2026-09-21')
  })

  it('stops rolling a one-off after it is completed on a later day', () => {
    const task = makeTask({
      dueDate: '2026-09-14',
      recurrence: once,
      completedDates: ['2026-09-16'],
    })
    expect(isOpenOn(task, '2026-09-15')).toBe(true)
    expect(appearsOn(task, '2026-09-16')).toBe(true)
    expect(isOpenOn(task, '2026-09-16')).toBe(false)
    expect(appearsOn(task, '2026-09-17')).toBe(false)
  })

  it('does not roll a one-off that was completed on its due date', () => {
    const task = makeTask({
      dueDate: '2026-09-14',
      recurrence: once,
      completedDates: ['2026-09-14'],
    })
    expect(appearsOn(task, '2026-09-15')).toBe(false)
  })

  it('lets a missed weekly instance fill gap days without cloning the series', () => {
    const task = makeTask({ dueDate: '2026-09-14', recurrence: weeklyMonday })
    expect(occursOn(task, '2026-09-14')).toBe(true)
    expect(occursOn(task, '2026-09-15')).toBe(false)
    expect(appearsOn(task, '2026-09-15')).toBe(true)
    expect(appearsOn(task, '2026-09-20')).toBe(true)
    expect(occursOn(task, '2026-09-21')).toBe(true)
    expect(appearsOn(task, '2026-09-21')).toBe(true)
    expect(rolledFrom(task, '2026-09-21')).toBe(null)
    expect(nextOccurrence(task, '2026-09-14')).toBe('2026-09-21')
  })

  it('hides weekly gap days after the instance is completed', () => {
    const doneMonday = makeTask({
      dueDate: '2026-09-14',
      recurrence: weeklyMonday,
      completedDates: ['2026-09-14'],
    })
    expect(appearsOn(doneMonday, '2026-09-15')).toBe(false)

    const caughtUpWednesday = makeTask({
      dueDate: '2026-09-14',
      recurrence: weeklyMonday,
      completedDates: ['2026-09-16'],
    })
    expect(isOpenOn(caughtUpWednesday, '2026-09-15')).toBe(true)
    expect(appearsOn(caughtUpWednesday, '2026-09-16')).toBe(true)
    expect(isOpenOn(caughtUpWednesday, '2026-09-16')).toBe(false)
    expect(appearsOn(caughtUpWednesday, '2026-09-17')).toBe(false)
    expect(occursOn(caughtUpWednesday, '2026-09-21')).toBe(true)
  })

  it('rolls a missed weekday instance onto the weekend until the next weekday', () => {
    const task = makeTask({ dueDate: '2026-09-14', recurrence: weekdays })
    expect(occursOn(task, '2026-09-18')).toBe(true)
    expect(occursOn(task, '2026-09-19')).toBe(false)
    expect(appearsOn(task, '2026-09-19')).toBe(true)
    expect(appearsOn(task, '2026-09-20')).toBe(true)
    expect(occursOn(task, '2026-09-21')).toBe(true)
    expect(rolledFrom(task, '2026-09-19')).toBe('2026-09-18')
  })

  it('does not duplicate daily series: each day is still one instance of the same task', () => {
    const task = makeTask({ dueDate: '2026-09-14', recurrence: daily })
    expect(occursOn(task, '2026-09-14')).toBe(true)
    expect(occursOn(task, '2026-09-15')).toBe(true)
    expect(appearsOn(task, '2026-09-15')).toBe(true)
    expect(rolledFrom(task, '2026-09-15')).toBe(null)
  })

  it('rolls a missed every-n instance until the next cadence day', () => {
    const task = makeTask({ dueDate: '2026-09-14', recurrence: every7 })
    expect(occursOn(task, '2026-09-14')).toBe(true)
    expect(appearsOn(task, '2026-09-16')).toBe(true)
    expect(occursOn(task, '2026-09-21')).toBe(true)
    expect(rolledFrom(task, '2026-09-16')).toBe('2026-09-14')
    expect(rolledFrom(task, '2026-09-21')).toBe(null)
  })
})
