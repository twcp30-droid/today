import { TOMBSTONE_TTL_MS, type StoredState, type Tombstone } from '../storage'
import type { Task } from '../types'

export interface MergeResult {
  state: StoredState
  /**
   * Visible differences between the first document and the merge:
   * tasks added or removed, task-body edits, completion flips, and
   * a changed Most Important Objective.
   */
  changes: number
}

/**
 * Field-level merge for two planner documents.
 *
 * Tasks merge by id. A task that exists on only one side is kept.
 * Task-body fields travel together and the newer `updatedAt` wins.
 * A missing timestamp is 0, so the first merge of two old copies unions
 * tasks. Equal timestamps pick the lexicographically later canonical body
 * so the result does not depend on which device syncs.
 *
 * Completions merge per task and per date. The newer check or uncheck
 * wins. Equal timestamps (including 0) keep the date if either side
 * completed it.
 *
 * A tombstone `{ id, deletedAt }` wins unless the task's `updatedAt` is
 * strictly newer than `deletedAt`. Tombstones older than 60 days are dropped.
 *
 * `mostImportantObjective` uses `mostImportantObjectiveUpdatedAt`. The newer
 * text wins. Equal timestamps keep a non-empty value over an empty one, then
 * the lexicographically later string.
 *
 * One Most Important Task per section: if a merge leaves more than one,
 * the newest `updatedAt` stays and ties break to the greater task id.
 * The other flags are cleared and that clear is stamped just new enough
 * that the duplicate does not come back on the next merge.
 */
export function mergeStates(local: StoredState, remote: StoredState, now = Date.now()): MergeResult {
  const localTasks = indexTasks(local.tasks)
  const remoteTasks = indexTasks(remote.tasks)
  const localTombs = indexTombstones(local.tombstones)
  const remoteTombs = indexTombstones(remote.tombstones)

  const ids = new Set<string>([
    ...localTasks.keys(),
    ...remoteTasks.keys(),
    ...localTombs.keys(),
    ...remoteTombs.keys(),
  ])

  const tasks: Task[] = []
  const tombstones: Tombstone[] = []

  for (const id of [...ids].sort()) {
    const left = localTasks.get(id)
    const right = remoteTasks.get(id)
    const task = left && right ? mergeTask(left, right) : left ?? right
    let tomb = freshestTombstone(localTombs.get(id), remoteTombs.get(id))
    if (tomb && !tombstoneIsFresh(tomb, now)) tomb = undefined

    if (task && tomb && fieldTimestamp(task.updatedAt) > fieldTimestamp(tomb.deletedAt)) {
      tasks.push(task)
      continue
    }
    if (task && tomb) {
      tombstones.push(tomb)
      continue
    }
    if (task) tasks.push(task)
    else if (tomb) tombstones.push(tomb)
  }

  const objective = mergeObjective(local, remote)
  const updatedAt = laterStamp(local.updatedAt, remote.updatedAt)
  const state: StoredState = {
    version: 1,
    tasks: resolveSectionMits(tasks),
    mostImportantObjective: objective.mostImportantObjective,
  }
  if (objective.mostImportantObjectiveUpdatedAt) {
    state.mostImportantObjectiveUpdatedAt = objective.mostImportantObjectiveUpdatedAt
  }
  if (tombstones.length > 0) state.tombstones = tombstones
  if (updatedAt) state.updatedAt = updatedAt

  return { state, changes: countChanges(local, state) }
}

/** True when tasks, completions, the objective, and tombstones match. Ignores document `updatedAt`. */
export function samePlanner(a: StoredState, b: StoredState): boolean {
  return JSON.stringify(projectPlanner(a)) === JSON.stringify(projectPlanner(b))
}

export function mergeSummary(changes: number): string {
  const label = changes === 1 ? 'change' : 'changes'
  return `Synced, merged ${changes} ${label}`
}

export function serverTimeMs(updatedAt: string): number {
  const value = Date.parse(updatedAt)
  return Number.isNaN(value) ? 0 : value
}

export function fieldTimestamp(value: string | undefined): number {
  if (!value) return 0
  return serverTimeMs(value)
}

/**
 * A first launch stores the sample planner and never sets document `updatedAt`.
 * That copy must not be merged into a real cloud planner.
 * Any save through the app sets `updatedAt`, so edited planners are not samples.
 */
export function isUntouchedSeed(state: StoredState): boolean {
  if (state.updatedAt) return false
  if (state.mostImportantObjective) return false
  if (state.mostImportantObjectiveUpdatedAt) return false
  if (state.tombstones && state.tombstones.length > 0) return false
  return state.tasks.every(
    (task) =>
      task.id.startsWith('seed-') &&
      !task.updatedAt &&
      !task.completionUpdatedAt &&
      task.completedDates.length === 0,
  )
}

function mergeTask(left: Task, right: Task): Task {
  const body = winningBody(left, right)
  const completions = mergeCompletions(left, right)
  const task: Task = {
    id: body.id,
    title: body.title,
    description: body.description,
    section: body.section,
    isMit: body.isMit,
    dueDate: body.dueDate,
    priority: body.priority,
    recurrence: body.recurrence,
    completedDates: completions.completedDates,
    createdAt: body.createdAt,
  }
  if (fieldTimestamp(body.updatedAt) > 0 && body.updatedAt) task.updatedAt = body.updatedAt
  if (completions.completionUpdatedAt) task.completionUpdatedAt = completions.completionUpdatedAt
  return task
}

function winningBody(left: Task, right: Task): Task {
  const leftAt = fieldTimestamp(left.updatedAt)
  const rightAt = fieldTimestamp(right.updatedAt)
  if (leftAt !== rightAt) return leftAt > rightAt ? left : right
  const leftBody = canonicalBody(left)
  const rightBody = canonicalBody(right)
  if (leftBody !== rightBody) return leftBody > rightBody ? left : right
  const leftStamp = left.updatedAt ?? ''
  const rightStamp = right.updatedAt ?? ''
  if (leftStamp !== rightStamp) return leftStamp > rightStamp ? left : right
  return left
}

interface Opinion {
  completed: boolean
  at: number
  iso?: string
}

function mergeCompletions(left: Task, right: Task): Pick<Task, 'completedDates' | 'completionUpdatedAt'> {
  const dates = new Set<string>([
    ...left.completedDates,
    ...right.completedDates,
    ...Object.keys(left.completionUpdatedAt ?? {}),
    ...Object.keys(right.completionUpdatedAt ?? {}),
  ])
  const completedDates: string[] = []
  const completionUpdatedAt: Record<string, string> = {}
  for (const date of [...dates].sort()) {
    const chosen = preferOpinion(opinion(left, date), opinion(right, date))
    if (chosen.completed) completedDates.push(date)
    if (chosen.at > 0 && chosen.iso) completionUpdatedAt[date] = chosen.iso
  }
  return {
    completedDates,
    ...(Object.keys(completionUpdatedAt).length > 0 ? { completionUpdatedAt } : {}),
  }
}

function opinion(task: Task, date: string): Opinion {
  const iso = task.completionUpdatedAt?.[date]
  const at = fieldTimestamp(iso)
  return {
    completed: task.completedDates.includes(date),
    at,
    iso: at > 0 ? iso : undefined,
  }
}

function preferOpinion(left: Opinion, right: Opinion): Opinion {
  if (left.at !== right.at) return left.at > right.at ? left : right
  const completed = left.completed || right.completed
  const iso = [left, right]
    .filter((item) => item.completed === completed)
    .map((item) => item.iso ?? '')
    .sort()
    .at(-1)
  return { completed, at: left.at, iso: iso || undefined }
}

function mergeObjective(local: StoredState, remote: StoredState): Pick<
  StoredState,
  'mostImportantObjective' | 'mostImportantObjectiveUpdatedAt'
> {
  const leftAt = fieldTimestamp(local.mostImportantObjectiveUpdatedAt)
  const rightAt = fieldTimestamp(remote.mostImportantObjectiveUpdatedAt)
  let winner = local
  if (leftAt !== rightAt) {
    winner = leftAt > rightAt ? local : remote
  } else {
    const leftText = local.mostImportantObjective ?? ''
    const rightText = remote.mostImportantObjective ?? ''
    if (leftText === rightText) winner = local
    else if (!leftText) winner = remote
    else if (!rightText) winner = local
    else winner = leftText >= rightText ? local : remote
  }
  const stamp = fieldTimestamp(winner.mostImportantObjectiveUpdatedAt)
  return {
    mostImportantObjective: winner.mostImportantObjective ?? '',
    ...(stamp > 0 && winner.mostImportantObjectiveUpdatedAt
      ? { mostImportantObjectiveUpdatedAt: winner.mostImportantObjectiveUpdatedAt }
      : {}),
  }
}

function resolveSectionMits(tasks: Task[]): Task[] {
  const grouped = new Map<string, Task[]>()
  for (const task of tasks) {
    if (!task.isMit) continue
    const list = grouped.get(task.section) ?? []
    list.push(task)
    grouped.set(task.section, list)
  }

  const demote = new Map<string, string>()
  for (const mits of grouped.values()) {
    if (mits.length < 2) continue
    const ranked = [...mits].sort((a, b) => {
      const delta = fieldTimestamp(b.updatedAt) - fieldTimestamp(a.updatedAt)
      if (delta !== 0) return delta
      return a.id < b.id ? 1 : a.id > b.id ? -1 : 0
    })
    const winner = ranked[0]
    const winnerAt = fieldTimestamp(winner.updatedAt)
    for (const loser of ranked.slice(1)) {
      const loserAt = fieldTimestamp(loser.updatedAt)
      const nextAt = loserAt >= winnerAt ? loserAt + 1 : winnerAt
      demote.set(loser.id, new Date(nextAt).toISOString())
    }
  }

  if (demote.size === 0) return tasks
  return tasks.map((task) => {
    const updatedAt = demote.get(task.id)
    if (!updatedAt) return task
    return { ...task, isMit: false, updatedAt }
  })
}

function countChanges(before: StoredState, after: StoredState): number {
  let changes = 0
  if ((before.mostImportantObjective ?? '') !== (after.mostImportantObjective ?? '')) changes += 1

  const beforeTasks = indexTasks(before.tasks)
  const afterTasks = indexTasks(after.tasks)
  const ids = new Set<string>([...beforeTasks.keys(), ...afterTasks.keys()])
  for (const id of ids) {
    const left = beforeTasks.get(id)
    const right = afterTasks.get(id)
    if (!left || !right) {
      changes += 1
      continue
    }
    if (canonicalBody(left) !== canonicalBody(right)) changes += 1
    const dates = new Set<string>([...left.completedDates, ...right.completedDates])
    for (const date of dates) {
      if (left.completedDates.includes(date) !== right.completedDates.includes(date)) changes += 1
    }
  }

  const beforeTombs = indexTombstones(before.tombstones)
  const afterTombs = indexTombstones(after.tombstones)
  for (const [id, tomb] of afterTombs) {
    const prev = beforeTombs.get(id)
    if (!prev) {
      if (!beforeTasks.has(id)) changes += 1
      continue
    }
    if (prev.deletedAt !== tomb.deletedAt && !afterTasks.has(id)) changes += 1
  }
  return changes
}

function indexTasks(tasks: Task[]): Map<string, Task> {
  const map = new Map<string, Task>()
  for (const task of tasks) map.set(task.id, task)
  return map
}

function indexTombstones(tombstones: Tombstone[] | undefined): Map<string, Tombstone> {
  const map = new Map<string, Tombstone>()
  for (const tomb of tombstones ?? []) {
    const prev = map.get(tomb.id)
    if (!prev || fieldTimestamp(tomb.deletedAt) >= fieldTimestamp(prev.deletedAt)) map.set(tomb.id, tomb)
  }
  return map
}

function freshestTombstone(left?: Tombstone, right?: Tombstone): Tombstone | undefined {
  if (!left) return right
  if (!right) return left
  const leftAt = fieldTimestamp(left.deletedAt)
  const rightAt = fieldTimestamp(right.deletedAt)
  if (leftAt !== rightAt) return leftAt > rightAt ? left : right
  return (left.deletedAt ?? '') >= (right.deletedAt ?? '') ? left : right
}

function tombstoneIsFresh(tomb: Tombstone, now: number): boolean {
  const at = fieldTimestamp(tomb.deletedAt)
  if (at === 0) return false
  return now - at <= TOMBSTONE_TTL_MS
}

function laterStamp(left?: string, right?: string): string | undefined {
  const leftAt = fieldTimestamp(left)
  const rightAt = fieldTimestamp(right)
  if (leftAt === 0 && rightAt === 0) return undefined
  if (leftAt !== rightAt) return leftAt > rightAt ? left : right
  return (left ?? '') >= (right ?? '') ? left : right
}

function canonicalBody(task: Task): string {
  return JSON.stringify({
    id: task.id,
    title: task.title,
    description: task.description,
    section: task.section,
    isMit: task.isMit,
    dueDate: task.dueDate,
    priority: task.priority,
    recurrence: task.recurrence,
    createdAt: task.createdAt,
  })
}

function projectPlanner(state: StoredState) {
  return {
    objective: state.mostImportantObjective ?? '',
    objectiveAt: state.mostImportantObjectiveUpdatedAt ?? '',
    tasks: [...state.tasks]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        section: task.section,
        isMit: task.isMit,
        dueDate: task.dueDate,
        priority: task.priority,
        recurrence: task.recurrence,
        completedDates: [...task.completedDates].sort(),
        createdAt: task.createdAt,
        updatedAt: task.updatedAt ?? '',
        completionUpdatedAt: sortedRecord(task.completionUpdatedAt),
      })),
    tombstones: [...(state.tombstones ?? [])]
      .map((tomb) => ({ id: tomb.id, deletedAt: tomb.deletedAt }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  }
}

function sortedRecord(record: Record<string, string> | undefined): Record<string, string> {
  const sorted: Record<string, string> = {}
  for (const key of Object.keys(record ?? {}).sort()) sorted[key] = record?.[key] ?? ''
  return sorted
}
