import { emptyState, parseStoredState } from './storage'

describe('parseStoredState', () => {
  it('defaults mostImportantObjective on older planner blobs', () => {
    const parsed = parseStoredState(
      JSON.stringify({
        version: 1,
        tasks: [],
        updatedAt: '2026-09-16T12:00:00.000Z',
      }),
    )
    expect(parsed.mostImportantObjective).toBe('')
    expect(parsed.updatedAt).toBe('2026-09-16T12:00:00.000Z')
  })

  it('keeps the standing objective in the planner document', () => {
    const parsed = parseStoredState(
      JSON.stringify({
        version: 1,
        tasks: [],
        mostImportantObjective: 'Ship the RTU cutover',
        updatedAt: '2026-09-18T12:00:00.000Z',
      }),
    )
    expect(parsed.mostImportantObjective).toBe('Ship the RTU cutover')
  })

  it('ignores a non-string objective field', () => {
    const parsed = parseStoredState(
      JSON.stringify({
        version: 1,
        tasks: [],
        mostImportantObjective: { text: 'nope' },
      }),
    )
    expect(parsed.mostImportantObjective).toBe('')
  })

  it('starts emptyState with a blank objective', () => {
    expect(emptyState()).toEqual({ version: 1, tasks: [], mostImportantObjective: '' })
  })

  it('migrates older tasks without priority or description', () => {
    const parsed = parseStoredState(
      JSON.stringify({
        version: 1,
        tasks: [
          {
            id: 'old-1',
            title: 'Legacy walkdown',
            section: 'systems',
            isMit: true,
            dueDate: '2026-09-14',
            recurrence: { kind: 'once' },
            completedDates: [],
            createdAt: '2026-09-01T00:00:00.000Z',
          },
        ],
      }),
    )
    expect(parsed.tasks).toHaveLength(1)
    expect(parsed.tasks[0].priority).toBe(3)
    expect(parsed.tasks[0].description).toBe('')
    expect(parsed.tasks[0].title).toBe('Legacy walkdown')
    expect(parsed.tasks[0].isMit).toBe(true)
  })

  it('keeps a stored priority and description', () => {
    const parsed = parseStoredState(
      JSON.stringify({
        version: 1,
        tasks: [
          {
            id: 'new-1',
            title: 'Triage alarms',
            description: 'Start with the flood.',
            section: 'scada',
            isMit: false,
            dueDate: '2026-09-16',
            priority: 1,
            recurrence: { kind: 'weekdays' },
            completedDates: [],
            createdAt: '2026-09-01T00:00:00.000Z',
          },
        ],
      }),
    )
    expect(parsed.tasks[0].priority).toBe(1)
    expect(parsed.tasks[0].description).toBe('Start with the flood.')
  })

  it('defaults an out-of-range priority', () => {
    const parsed = parseStoredState(
      JSON.stringify({
        version: 1,
        tasks: [
          {
            id: 'bad-prio',
            title: 'Odd priority',
            section: 'me',
            isMit: false,
            dueDate: '2026-09-16',
            priority: 9,
            recurrence: { kind: 'once' },
            completedDates: [],
            createdAt: '2026-09-01T00:00:00.000Z',
          },
        ],
      }),
    )
    expect(parsed.tasks[0].priority).toBe(3)
  })
})
