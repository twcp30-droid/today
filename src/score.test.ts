import { scoreDay, scoreTasks, formatScore, pointsForPriority } from './score'
import type { Priority, Recurrence, SectionId, Task } from './types'

function makeTask(overrides: Partial<Task> & Pick<Task, 'dueDate' | 'recurrence'>): Task {
  return {
    id: overrides.id ?? 't1',
    title: 'Task',
    description: '',
    section: 'systems',
    isMit: false,
    priority: 3,
    completedDates: [],
    createdAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  }
}

const once: Recurrence = { kind: 'once' }
const daily: Recurrence = { kind: 'daily' }
const weeklyMonday: Recurrence = { kind: 'weekly', weekday: 1 }

describe('priority points', () => {
  it.each([
    [1, 5],
    [2, 4],
    [3, 3],
    [4, 2],
    [5, 1],
  ] as const)('P%s is worth %s points', (priority: Priority, points: number) => {
    expect(pointsForPriority(priority)).toBe(points)
  })

  it('formats earned over possible', () => {
    expect(formatScore({ earned: 12, possible: 20 })).toBe('12 / 20')
  })
})

describe('daily scores', () => {
  const monday = '2026-09-14'
  const tuesday = '2026-09-15'
  const wednesday = '2026-09-16'

  function task(
    id: string,
    section: SectionId,
    priority: Priority,
    recurrence: Recurrence,
    dueDate: string,
    completedDates: string[] = [],
  ): Task {
    return makeTask({ id, section, priority, recurrence, dueDate, completedDates })
  }

  it('scores only tasks visible on the selected day', () => {
    const tasks = [
      task('due', 'systems', 1, once, monday),
      task('later', 'systems', 1, once, '2026-09-20'),
      task('other', 'me', 5, once, tuesday),
    ]
    expect(scoreTasks(tasks, monday)).toEqual({ earned: 0, possible: 5 })
    expect(scoreDay(tasks, monday).sections.me).toEqual({ earned: 0, possible: 0 })
    expect(scoreDay(tasks, monday).sections.scada).toEqual({ earned: 0, possible: 0 })
  })

  it('earns points only when completedDates includes that day', () => {
    const open = [task('a', 'systems', 1, once, monday)]
    const done = [task('a', 'systems', 1, once, monday, [monday])]
    expect(scoreTasks(open, monday)).toEqual({ earned: 0, possible: 5 })
    expect(scoreTasks(done, monday)).toEqual({ earned: 5, possible: 5 })
    expect(formatScore(scoreTasks(done, monday))).toBe('5 / 5')
  })

  it('sums section scores into the overall total', () => {
    const tasks = [
      task('sys', 'systems', 1, once, monday, [monday]),
      task('scada', 'scada', 2, once, monday),
      task('me', 'me', 4, once, monday, [monday]),
    ]
    const scores = scoreDay(tasks, monday)
    expect(scores.sections.systems).toEqual({ earned: 5, possible: 5 })
    expect(scores.sections.scada).toEqual({ earned: 0, possible: 4 })
    expect(scores.sections.me).toEqual({ earned: 2, possible: 2 })
    expect(scores.overall).toEqual({ earned: 7, possible: 11 })
    expect(formatScore(scores.overall)).toBe('7 / 11')
  })

  it('counts a rolled one-off until it is completed on the viewed day', () => {
    const open = task('roll', 'scada', 2, once, monday)
    expect(scoreTasks([open], tuesday)).toEqual({ earned: 0, possible: 4 })

    const caughtUp = task('roll', 'scada', 2, once, monday, [wednesday])
    expect(scoreTasks([caughtUp], monday)).toEqual({ earned: 0, possible: 4 })
    expect(scoreTasks([caughtUp], wednesday)).toEqual({ earned: 4, possible: 4 })
    expect(scoreTasks([caughtUp], '2026-09-17')).toEqual({ earned: 0, possible: 0 })
  })

  it('does not keep scoring a one-off after it was completed on its due date', () => {
    const doneOnDue = task('once', 'me', 3, once, monday, [monday])
    expect(scoreTasks([doneOnDue], monday)).toEqual({ earned: 3, possible: 3 })
    expect(scoreTasks([doneOnDue], tuesday)).toEqual({ earned: 0, possible: 0 })
  })

  it('scores each day of a repeating series from that day’s completion', () => {
    const series = task('daily', 'systems', 5, daily, monday, [monday])
    expect(scoreTasks([series], monday)).toEqual({ earned: 1, possible: 1 })
    expect(scoreTasks([series], tuesday)).toEqual({ earned: 0, possible: 1 })

    const alsoTuesday = task('daily', 'systems', 5, daily, monday, [monday, tuesday])
    expect(scoreTasks([alsoTuesday], tuesday)).toEqual({ earned: 1, possible: 1 })
  })

  it('includes a missed weekly instance on the gap day, then the next occurrence', () => {
    const missed = task('weekly', 'me', 1, weeklyMonday, monday)
    expect(scoreTasks([missed], wednesday)).toEqual({ earned: 0, possible: 5 })

    const caughtUp = task('weekly', 'me', 1, weeklyMonday, monday, [wednesday])
    expect(scoreTasks([caughtUp], wednesday)).toEqual({ earned: 5, possible: 5 })
    expect(scoreTasks([caughtUp], '2026-09-17')).toEqual({ earned: 0, possible: 0 })
    expect(scoreTasks([caughtUp], '2026-09-21')).toEqual({ earned: 0, possible: 5 })
  })

  it('counts a most important task by its priority, same as any other task', () => {
    const mit = makeTask({
      id: 'mit',
      section: 'systems',
      isMit: true,
      priority: 1,
      dueDate: monday,
      recurrence: once,
      completedDates: [monday],
    })
    expect(scoreTasks([mit], monday)).toEqual({ earned: 5, possible: 5 })
  })

  it('is zero when nothing is visible', () => {
    expect(scoreDay([], monday)).toEqual({
      overall: { earned: 0, possible: 0 },
      sections: {
        systems: { earned: 0, possible: 0 },
        scada: { earned: 0, possible: 0 },
        me: { earned: 0, possible: 0 },
      },
    })
  })
})
