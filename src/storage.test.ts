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
})
