import { TOMBSTONE_TTL_MS, type StoredState } from '../storage'
import type { Task } from '../types'
import { mergeStates, mergeSummary, samePlanner } from './merge'

const T0 = '2026-09-16T10:00:00.000Z'
const T1 = '2026-09-16T11:00:00.000Z'
const T2 = '2026-09-16T12:00:00.000Z'
const NOW = Date.parse('2026-09-20T00:00:00.000Z')

function task(partial: Partial<Task> & Pick<Task, 'id' | 'title'>): Task {
  return {
    description: '',
    section: 'systems',
    isMit: false,
    dueDate: '2026-09-16',
    priority: 3,
    recurrence: { kind: 'once' },
    completedDates: [],
    createdAt: '2026-09-01T00:00:00.000Z',
    ...partial,
  }
}

function doc(partial: Partial<StoredState> & Pick<StoredState, 'tasks'>): StoredState {
  return {
    version: 1,
    mostImportantObjective: '',
    ...partial,
  }
}

describe('mergeStates', () => {
  it('keeps tasks that exist on only one side', () => {
    const local = doc({
      tasks: [task({ id: 'phone', title: 'Phone only', updatedAt: T1 })],
      updatedAt: T1,
    })
    const remote = doc({
      tasks: [task({ id: 'pc', title: 'PC only', updatedAt: T2 })],
      updatedAt: T2,
    })
    const merged = mergeStates(local, remote, NOW)
    expect(merged.state.tasks.map((item) => item.id).sort()).toEqual(['pc', 'phone'])
    expect(merged.changes).toBe(1)
    expect(samePlanner(mergeStates(remote, local, NOW).state, merged.state)).toBe(true)
  })

  it('lets the newer task edit win when both sides changed the same task', () => {
    const local = doc({
      tasks: [
        task({
          id: 'shared',
          title: 'Phone title',
          description: 'Phone notes',
          priority: 1,
          dueDate: '2026-09-18',
          recurrence: { kind: 'daily' },
          section: 'scada',
          isMit: true,
          updatedAt: T2,
        }),
      ],
      updatedAt: T2,
    })
    const remote = doc({
      tasks: [
        task({
          id: 'shared',
          title: 'PC title',
          description: 'PC notes',
          priority: 5,
          dueDate: '2026-09-12',
          recurrence: { kind: 'weekdays' },
          section: 'me',
          isMit: false,
          updatedAt: T1,
        }),
      ],
      updatedAt: T1,
    })
    const merged = mergeStates(local, remote, NOW)
    expect(merged.state.tasks).toHaveLength(1)
    expect(merged.state.tasks[0]).toMatchObject({
      title: 'Phone title',
      description: 'Phone notes',
      priority: 1,
      dueDate: '2026-09-18',
      recurrence: { kind: 'daily' },
      section: 'scada',
      isMit: true,
      updatedAt: T2,
    })
    expect(merged.changes).toBe(0)
    expect(mergeStates(remote, local, NOW).state.tasks[0].title).toBe('Phone title')
  })

  it('breaks an equal task timestamp deterministically, not by which side syncs', () => {
    const olderLooking = task({ id: 'shared', title: 'Zebra', updatedAt: T1 })
    const newerLooking = task({ id: 'shared', title: 'Alpha', updatedAt: T1 })
    const left = doc({ tasks: [olderLooking], updatedAt: T1 })
    const right = doc({ tasks: [newerLooking], updatedAt: T1 })
    const forward = mergeStates(left, right, NOW)
    const backward = mergeStates(right, left, NOW)
    expect(samePlanner(forward.state, backward.state)).toBe(true)
    expect(forward.state.tasks[0].title).toBe('Zebra')
  })

  it('unions completion checks made on different devices', () => {
    const local = doc({
      tasks: [
        task({
          id: 'shared',
          title: 'Walkdown',
          updatedAt: T1,
          completedDates: ['2026-09-16'],
          completionUpdatedAt: { '2026-09-16': T1 },
        }),
      ],
      updatedAt: T1,
    })
    const remote = doc({
      tasks: [
        task({
          id: 'shared',
          title: 'Walkdown',
          updatedAt: T1,
          completedDates: ['2026-09-17'],
          completionUpdatedAt: { '2026-09-17': T2 },
        }),
      ],
      updatedAt: T2,
    })
    const merged = mergeStates(local, remote, NOW)
    expect(merged.state.tasks[0].completedDates).toEqual(['2026-09-16', '2026-09-17'])
    expect(merged.changes).toBe(1)
  })

  it('lets a newer uncheck beat an older check, and a newer check beat an older uncheck', () => {
    const checked = task({
      id: 'shared',
      title: 'Walkdown',
      updatedAt: T0,
      completedDates: ['2026-09-16', '2026-09-17'],
      completionUpdatedAt: { '2026-09-16': T0, '2026-09-17': T0 },
    })
    const unchecked = task({
      id: 'shared',
      title: 'Walkdown',
      updatedAt: T0,
      completedDates: ['2026-09-17'],
      completionUpdatedAt: { '2026-09-16': T2, '2026-09-17': T0 },
    })
    const uncheckWins = mergeStates(
      doc({ tasks: [checked], updatedAt: T0 }),
      doc({ tasks: [unchecked], updatedAt: T2 }),
      NOW,
    )
    expect(uncheckWins.state.tasks[0].completedDates).toEqual(['2026-09-17'])
    expect(uncheckWins.state.tasks[0].completionUpdatedAt?.['2026-09-16']).toBe(T2)

    const rechecked = task({
      id: 'shared',
      title: 'Walkdown',
      updatedAt: T0,
      completedDates: ['2026-09-16', '2026-09-17'],
      completionUpdatedAt: { '2026-09-16': '2026-09-16T13:00:00.000Z', '2026-09-17': T0 },
    })
    const checkWins = mergeStates(
      doc({ tasks: [unchecked], updatedAt: T2 }),
      doc({ tasks: [rechecked], updatedAt: T2 }),
      NOW,
    )
    expect(checkWins.state.tasks[0].completedDates).toEqual(['2026-09-16', '2026-09-17'])
  })

  it('keeps a completion when the other side edited the title later', () => {
    const local = doc({
      tasks: [
        task({
          id: 'shared',
          title: 'Old title',
          completedDates: ['2026-09-16'],
          completionUpdatedAt: { '2026-09-16': T1 },
          updatedAt: T0,
        }),
      ],
      updatedAt: T0,
    })
    const remote = doc({
      tasks: [task({ id: 'shared', title: 'New title', updatedAt: T2 })],
      updatedAt: T2,
    })
    const merged = mergeStates(local, remote, NOW)
    expect(merged.state.tasks[0].title).toBe('New title')
    expect(merged.state.tasks[0].completedDates).toEqual(['2026-09-16'])
    expect(merged.changes).toBe(1)
  })

  it('drops a task when the delete is newer than the edit, and keeps it when the edit is newer', () => {
    const edited = task({ id: 'shared', title: 'Still wanted', updatedAt: T2 })
    const stale = task({ id: 'shared', title: 'Old copy', updatedAt: T0 })
    const deleted = doc({
      tasks: [],
      tombstones: [{ id: 'shared', deletedAt: T1 }],
      updatedAt: T1,
    })

    const deleteWins = mergeStates(doc({ tasks: [stale], updatedAt: T0 }), deleted, NOW)
    expect(deleteWins.state.tasks).toEqual([])
    expect(deleteWins.state.tombstones).toEqual([{ id: 'shared', deletedAt: T1 }])
    expect(deleteWins.changes).toBe(1)

    const editWins = mergeStates(doc({ tasks: [edited], updatedAt: T2 }), deleted, NOW)
    expect(editWins.state.tasks.map((item) => item.title)).toEqual(['Still wanted'])
    expect(editWins.state.tombstones).toBeUndefined()
  })

  it('lets a delete win a timestamp tie so an equal clock does not resurrect the task', () => {
    const merged = mergeStates(
      doc({ tasks: [task({ id: 'shared', title: 'Tie', updatedAt: T1 })], updatedAt: T1 }),
      doc({ tasks: [], tombstones: [{ id: 'shared', deletedAt: T1 }], updatedAt: T1 }),
      NOW,
    )
    expect(merged.state.tasks).toEqual([])
    expect(merged.state.tombstones).toEqual([{ id: 'shared', deletedAt: T1 }])
  })

  it('prunes tombstones older than 60 days and can then keep the surviving copy', () => {
    const deletedAt = new Date(NOW - TOMBSTONE_TTL_MS - 1000).toISOString()
    const fresh = new Date(NOW - TOMBSTONE_TTL_MS + 1000).toISOString()
    const merged = mergeStates(
      doc({
        tasks: [task({ id: 'back', title: 'Offline copy', updatedAt: T0 })],
        tombstones: [{ id: 'old-delete', deletedAt }],
        updatedAt: T0,
      }),
      doc({
        tasks: [],
        tombstones: [
          { id: 'back', deletedAt },
          { id: 'recent', deletedAt: fresh },
        ],
        updatedAt: T1,
      }),
      NOW,
    )
    expect(merged.state.tasks.map((item) => item.id)).toEqual(['back'])
    expect(merged.state.tombstones).toEqual([{ id: 'recent', deletedAt: fresh }])
  })

  it('unions timestamp-less tasks and completions', () => {
    const local = doc({
      tasks: [
        task({ id: 'only-local', title: 'Local', completedDates: ['2026-09-01'] }),
        task({ id: 'shared', title: 'Shared', completedDates: ['2026-09-02'] }),
      ],
    })
    const remote = doc({
      tasks: [
        task({ id: 'shared', title: 'Shared from PC', completedDates: ['2026-09-03'] }),
        task({ id: 'only-remote', title: 'Remote', completedDates: ['2026-09-04'] }),
      ],
      mostImportantObjective: 'Keep the plant up',
    })
    const merged = mergeStates(local, remote, NOW)
    expect(merged.state.tasks.map((item) => item.id)).toEqual(['only-local', 'only-remote', 'shared'])
    const shared = merged.state.tasks.find((item) => item.id === 'shared')
    expect(shared?.completedDates).toEqual(['2026-09-02', '2026-09-03'])
    expect(shared?.updatedAt).toBeUndefined()
    expect(merged.state.mostImportantObjective).toBe('Keep the plant up')
    expect(mergeStates(merged.state, local, NOW).changes).toBe(0)
    expect(mergeStates(merged.state, remote, NOW).changes).toBe(0)
  })

  it('gives the Most Important Objective to the newer edit', () => {
    const local = doc({
      tasks: [],
      mostImportantObjective: 'Phone objective',
      mostImportantObjectiveUpdatedAt: T2,
      updatedAt: T2,
    })
    const remote = doc({
      tasks: [],
      mostImportantObjective: 'PC objective',
      mostImportantObjectiveUpdatedAt: T1,
      updatedAt: T1,
    })
    expect(mergeStates(local, remote, NOW).state.mostImportantObjective).toBe('Phone objective')
    expect(mergeStates(remote, local, NOW).state.mostImportantObjective).toBe('Phone objective')
    const cleared = doc({
      tasks: [],
      mostImportantObjective: '',
      mostImportantObjectiveUpdatedAt: '2026-09-16T13:00:00.000Z',
      updatedAt: T2,
    })
    expect(mergeStates(local, cleared, NOW).state.mostImportantObjective).toBe('')
  })

  it('keeps a single Most Important Task per section and breaks ties by id', () => {
    const local = doc({
      tasks: [
        task({ id: 'a', title: 'A', section: 'scada', isMit: true, updatedAt: T1 }),
        task({ id: 'b', title: 'B', section: 'scada', isMit: false, updatedAt: T0 }),
      ],
      updatedAt: T1,
    })
    const remote = doc({
      tasks: [
        task({ id: 'a', title: 'A', section: 'scada', isMit: false, updatedAt: T0 }),
        task({ id: 'b', title: 'B', section: 'scada', isMit: true, updatedAt: T1 }),
      ],
      updatedAt: T1,
    })
    const merged = mergeStates(local, remote, NOW)
    const mits = merged.state.tasks.filter((item) => item.isMit)
    expect(mits.map((item) => item.id)).toEqual(['b'])
    const loser = merged.state.tasks.find((item) => item.id === 'a')
    expect(loser?.isMit).toBe(false)
    expect(Date.parse(loser?.updatedAt ?? '')).toBeGreaterThan(Date.parse(T1))
    expect(samePlanner(mergeStates(merged.state, local, NOW).state, merged.state)).toBe(true)
    expect(samePlanner(mergeStates(merged.state, remote, NOW).state, merged.state)).toBe(true)
    expect(samePlanner(mergeStates(remote, local, NOW).state, merged.state)).toBe(true)
  })

  it('is idempotent and commutative', () => {
    const local = doc({
      tasks: [
        task({
          id: 'shared',
          title: 'Phone',
          updatedAt: T2,
          completedDates: ['2026-09-16'],
          completionUpdatedAt: { '2026-09-16': T1 },
        }),
        task({ id: 'phone-only', title: 'Phone only', updatedAt: T1 }),
      ],
      tombstones: [{ id: 'gone', deletedAt: T1 }],
      mostImportantObjective: 'Phone star',
      mostImportantObjectiveUpdatedAt: T1,
      updatedAt: T2,
    })
    const remote = doc({
      tasks: [
        task({
          id: 'shared',
          title: 'PC',
          updatedAt: T0,
          completedDates: [],
          completionUpdatedAt: { '2026-09-16': T2 },
        }),
        task({ id: 'pc-only', title: 'PC only', updatedAt: T2 }),
        task({ id: 'edited-after-delete', title: 'Came back', updatedAt: T2 }),
      ],
      tombstones: [{ id: 'edited-after-delete', deletedAt: T1 }, { id: 'pc-deleted', deletedAt: T2 }],
      mostImportantObjective: 'PC star',
      mostImportantObjectiveUpdatedAt: T2,
      updatedAt: T2,
    })

    const once = mergeStates(local, remote, NOW)
    const twiceFromLocal = mergeStates(once.state, local, NOW)
    const twiceFromRemote = mergeStates(once.state, remote, NOW)
    const swapped = mergeStates(remote, local, NOW)
    const thrice = mergeStates(twiceFromRemote.state, once.state, NOW)

    expect(samePlanner(twiceFromLocal.state, once.state)).toBe(true)
    expect(samePlanner(twiceFromRemote.state, once.state)).toBe(true)
    expect(samePlanner(swapped.state, once.state)).toBe(true)
    expect(samePlanner(thrice.state, once.state)).toBe(true)
    expect(twiceFromLocal.changes).toBe(0)
    expect(twiceFromRemote.changes).toBe(0)
    expect(once.state.tasks.find((item) => item.id === 'shared')?.completedDates).toEqual([])
    expect(once.state.tasks.some((item) => item.id === 'edited-after-delete')).toBe(true)
    expect(once.state.tombstones?.map((tomb) => tomb.id)).toEqual(['gone', 'pc-deleted'])
    expect(once.state.mostImportantObjective).toBe('PC star')
  })

  it('heals two merges that raced from the same parent', () => {
    const parent = doc({
      tasks: [task({ id: 'base', title: 'Base', updatedAt: T0 })],
      updatedAt: T0,
    })
    const phone = doc({
      tasks: [
        task({ id: 'base', title: 'Base', updatedAt: T0 }),
        task({ id: 'phone', title: 'From phone', updatedAt: T1 }),
      ],
      updatedAt: T1,
    })
    const pc = doc({
      tasks: [
        task({ id: 'base', title: 'Base from PC', updatedAt: T2 }),
        task({ id: 'pc', title: 'From PC', updatedAt: T2 }),
      ],
      updatedAt: T2,
    })
    const phoneFirst = mergeStates(mergeStates(phone, parent, NOW).state, mergeStates(pc, parent, NOW).state, NOW)
    const pcFirst = mergeStates(mergeStates(pc, parent, NOW).state, mergeStates(phone, parent, NOW).state, NOW)
    expect(samePlanner(phoneFirst.state, pcFirst.state)).toBe(true)
    expect(phoneFirst.state.tasks.map((item) => item.id)).toEqual(['base', 'pc', 'phone'])
    expect(phoneFirst.state.tasks.find((item) => item.id === 'base')?.title).toBe('Base from PC')
  })

  it('summarizes a merge for the sync status line', () => {
    expect(mergeSummary(1)).toBe('Synced, merged 1 change')
    expect(mergeSummary(3)).toBe('Synced, merged 3 changes')
  })
})
