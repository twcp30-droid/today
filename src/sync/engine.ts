import type { StoredState } from '../storage'
import { getRemoteBlob, putRemoteBlob, SyncNetworkError } from './client'
import type { SyncConfig } from './config'
import { blobIdFromPassphrase, CryptoError, decryptState, encryptState } from './crypto'
import { isUntouchedSeed, mergeStates, mergeSummary, samePlanner, serverTimeMs } from './merge'

export type SyncAction = 'pulled' | 'pushed' | 'unchanged' | 'seeded'

export type SyncSuccess = {
  ok: true
  state: StoredState
  action: SyncAction
  detail: string
}

export type SyncFailure = {
  ok: false
  error: string
}

export type SyncOutcome = SyncSuccess | SyncFailure

const MAX_PUSH_ATTEMPTS = 3

/**
 * Pull the remote blob, merge it with local, save the merge, then push.
 * A device that has never been edited (no document `updatedAt`, sample tasks
 * only) adopts the cloud copy so the sample planner is not unioned in.
 */
export async function syncAppState(options: {
  local: StoredState
  passphrase: string
  config: SyncConfig
  fetchFn?: typeof fetch
}): Promise<SyncOutcome> {
  const fetchFn = options.fetchFn ?? fetch
  let blobId: string
  try {
    blobId = await blobIdFromPassphrase(options.passphrase)
  } catch (error) {
    return fail(error)
  }

  let remote
  try {
    remote = await getRemoteBlob(options.config, blobId, fetchFn)
  } catch (error) {
    return fail(error)
  }

  if (!remote) {
    if (!options.local.updatedAt) {
      return {
        ok: true,
        state: options.local,
        action: 'unchanged',
        detail: 'No cloud data yet. Edit a task, then Sync now to create the encrypted blob.',
      }
    }
    return push(options.local, options.passphrase, blobId, options.config, fetchFn, 'seeded', 'Uploaded this device’s tasks.', 0)
  }

  let remoteState: StoredState
  try {
    remoteState = await decryptState(remote.ciphertext, options.passphrase)
  } catch (error) {
    return fail(error)
  }

  if (isUntouchedSeed(options.local)) {
    return {
      ok: true,
      state: remoteState,
      action: 'pulled',
      detail: 'Loaded tasks from the other device.',
    }
  }

  const merged = mergeStates(options.local, remoteState)
  if (samePlanner(merged.state, remoteState)) {
    if (samePlanner(merged.state, options.local)) {
      return {
        ok: true,
        state: options.local,
        action: 'unchanged',
        detail: 'Already in sync.',
      }
    }
    return {
      ok: true,
      state: merged.state,
      action: 'pulled',
      detail: merged.changes > 0 ? mergeSummary(merged.changes) : 'Already in sync.',
    }
  }

  const detail = merged.changes > 0 ? mergeSummary(merged.changes) : 'Uploaded newer tasks from this device.'
  return push(
    merged.state,
    options.passphrase,
    blobId,
    options.config,
    fetchFn,
    'pushed',
    detail,
    merged.changes,
    remote.updated_at,
  )
}

async function push(
  state: StoredState,
  passphrase: string,
  blobId: string,
  config: SyncConfig,
  fetchFn: typeof fetch,
  action: 'pushed' | 'seeded',
  detail: string,
  pendingChanges: number,
  serverUpdatedAt?: string,
): Promise<SyncOutcome> {
  let current = state
  let stampBasis = serverUpdatedAt
  let changes = pendingChanges
  let message = detail

  for (let attempt = 0; attempt < MAX_PUSH_ATTEMPTS; attempt += 1) {
    const stamped: StoredState = { ...current, updatedAt: nextBlobStamp(stampBasis) }
    let ciphertext: string
    try {
      ciphertext = await encryptState(stamped, passphrase)
    } catch (error) {
      return fail(error)
    }

    let stored
    try {
      stored = await putRemoteBlob(
        config,
        { id: blobId, ciphertext, updatedAt: stamped.updatedAt! },
        fetchFn,
      )
    } catch (error) {
      return fail(error)
    }

    if (stored.ciphertext === ciphertext) {
      return { ok: true, state: stamped, action, detail: message }
    }

    let winner: StoredState
    try {
      winner = await decryptState(stored.ciphertext, passphrase)
    } catch (error) {
      return fail(error)
    }

    const again = mergeStates(stamped, winner)
    current = again.state
    stampBasis = stored.updated_at
    changes += again.changes
    if (changes > 0) message = mergeSummary(changes)
    action = 'pushed'
  }

  return { ok: false, error: 'Sync conflicted with the other device. Try again.' }
}

/**
 * The blob row is still last-write-wins in Postgres. Stamp the upload at
 * least 1ms after the row we just read so a slow device clock can still
 * store the merge. Field conflicts inside the document use their own clocks.
 */
function nextBlobStamp(serverUpdatedAt?: string): string {
  const serverMs = serverUpdatedAt ? serverTimeMs(serverUpdatedAt) : 0
  return new Date(Math.max(Date.now(), serverMs + 1)).toISOString()
}

function fail(error: unknown): SyncFailure {
  if (error instanceof CryptoError || error instanceof SyncNetworkError) {
    return { ok: false, error: error.message }
  }
  if (error instanceof Error && error.message) {
    return { ok: false, error: error.message }
  }
  return { ok: false, error: 'Sync failed' }
}
