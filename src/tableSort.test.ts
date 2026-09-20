import { DEFAULT_PRIORITY, type Task } from './types'
import { compareTasks, DEFAULT_TABLE_SORT, sortTasks, toggleSort, type SortSpec } from './tableSort'

function task(overrides: Partial<Task> & Pick<Task, 'id' | 'title'>): Task {
  return {
    description: '',
    section: 'systems',
    isMit: false,
    dueDate: '2026-09-20',
    priority: DEFAULT_PRIORITY,
    recurrence: { kind: 'once' },
    completedDates: [],
    createdAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('table sort', () => {
  const a = task({ id: 'a', title: 'Alpha', priority: 3, dueDate: '2026-09-22' })
  const b = task({ id: 'b', title: 'Bravo', priority: 1, dueDate: '2026-09-21' })
  const c = task({ id: 'c', title: 'Charlie', priority: 1, dueDate: '2026-09-20' })

  it('defaults to priority then due date, both ascending', () => {
    expect(sortTasks([a, b, c], DEFAULT_TABLE_SORT).map((item) => item.id)).toEqual(['c', 'b', 'a'])
  })

  it('sorts due date independently when it is the primary key', () => {
    const spec: SortSpec = { primary: { key: 'dueDate', dir: 'desc' } }
    expect(sortTasks([a, b, c], spec).map((item) => item.id)).toEqual(['a', 'b', 'c'])
  })

  it('uses the secondary key when the primary values tie', () => {
    const spec: SortSpec = {
      primary: { key: 'priority', dir: 'asc' },
      secondary: { key: 'dueDate', dir: 'desc' },
    }
    expect(sortTasks([a, b, c], spec).map((item) => item.id)).toEqual(['b', 'c', 'a'])
  })

  it('toggles the active column direction', () => {
    const next = toggleSort(DEFAULT_TABLE_SORT, 'priority')
    expect(next.primary).toEqual({ key: 'priority', dir: 'desc' })
    expect(next.secondary).toEqual({ key: 'dueDate', dir: 'asc' })
  })

  it('promotes the other column to primary and keeps the previous as secondary', () => {
    const next = toggleSort(DEFAULT_TABLE_SORT, 'dueDate')
    expect(next.primary).toEqual({ key: 'dueDate', dir: 'asc' })
    expect(next.secondary).toEqual({ key: 'priority', dir: 'asc' })
  })

  it('breaks remaining ties with title then id', () => {
    const twins = [
      task({ id: 'z', title: 'Same', priority: 2, dueDate: '2026-09-20' }),
      task({ id: 'm', title: 'Same', priority: 2, dueDate: '2026-09-20' }),
    ]
    expect(compareTasks(twins[0], twins[1], DEFAULT_TABLE_SORT)).toBeGreaterThan(0)
    expect(sortTasks(twins, DEFAULT_TABLE_SORT).map((item) => item.id)).toEqual(['m', 'z'])
  })
})
