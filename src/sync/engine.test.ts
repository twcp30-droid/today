import { emptyState, type StoredState } from '../storage'
import type { Task } from '../types'
import { decryptState, encryptState } from './crypto'
import { syncAppState } from './engine'
import { mergeSummary } from './merge'
import { sampleTask } from './sample'

const config = {
  url: 'https://abcd.supabase.co',
  anonKey: 'eyJtest',
}

describe('sync engine', () => {
  const passphrase = 'unit-test-passphrase'

  it('seeds the cloud when local has an updatedAt and remote is empty', async () => {
    const local = sampleTask('Local only', '2026-09-16T12:00:00.000Z')
    const fetchFn: typeof fetch = async (input, init) => {
      const url = String(input)
      if (url.includes('today_get_blob')) {
        return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } })
      }
      expect(url).toContain('today_put_blob')
      const body = JSON.parse(String(init?.body)) as { blob_ciphertext: string; blob_id: string; blob_updated_at: string }
      expect(body.blob_ciphertext).not.toContain('Local only')
      expect(body.blob_id).toMatch(/^[0-9a-f]{64}$/)
      return new Response(
        JSON.stringify([
          {
            id: body.blob_id,
            ciphertext: body.blob_ciphertext,
            updated_at: body.blob_updated_at,
          },
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const result = await syncAppState({ local, passphrase, config, fetchFn })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.action).toBe('seeded')
  })

  it('pulls a newer remote blob', async () => {
    const local = sampleTask('Stale phone', '2026-09-16T10:00:00.000Z')
    const remote = sampleTask('Work PC', '2026-09-16T12:00:00.000Z')
    const ciphertext = await encryptState(remote, passphrase)

    const fetchFn: typeof fetch = async (input) => {
      const url = String(input)
      expect(url).toContain('today_get_blob')
      return new Response(
        JSON.stringify([{ id: 'x', ciphertext, updated_at: remote.updatedAt }]),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const result = await syncAppState({ local, passphrase, config, fetchFn })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.action).toBe('pulled')
      expect(result.state.tasks[0].title).toBe('Work PC')
      expect(result.detail).toBe(mergeSummary(1))
    }
  })

  it('merges both devices and uploads the combined planner', async () => {
    const phoneOnly = makeTask('phone-only', 'Call the operator', '2026-09-16T11:00:00.000Z')
    const sharedLocal = makeTask('shared', 'Old title', '2026-09-16T10:00:00.000Z')
    const sharedRemote = makeTask('shared', 'New title', '2026-09-16T12:00:00.000Z')
    sharedRemote.completedDates = ['2026-09-16']
    sharedRemote.completionUpdatedAt = { '2026-09-16': '2026-09-16T12:00:00.000Z' }
    const pcOnly = makeTask('pc-only', 'Order filters', '2026-09-16T12:00:00.000Z')
    const local: StoredState = {
      version: 1,
      tasks: [phoneOnly, sharedLocal],
      mostImportantObjective: '',
      updatedAt: '2026-09-16T11:00:00.000Z',
    }
    const remote: StoredState = {
      version: 1,
      tasks: [sharedRemote, pcOnly],
      mostImportantObjective: '',
      updatedAt: '2026-09-16T12:00:00.000Z',
    }
    const ciphertext = await encryptState(remote, passphrase)
    let pushed: StoredState | undefined

    const fetchFn: typeof fetch = async (input, init) => {
      const url = String(input)
      if (url.includes('today_get_blob')) {
        return new Response(JSON.stringify([{ id: 'x', ciphertext, updated_at: '2099-01-01T00:00:00.000Z' }]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      const body = JSON.parse(String(init?.body)) as { blob_ciphertext: string; blob_updated_at: string }
      expect(Date.parse(body.blob_updated_at)).toBeGreaterThan(Date.parse('2099-01-01T00:00:00.000Z'))
      pushed = await decryptState(body.blob_ciphertext, passphrase)
      return new Response(
        JSON.stringify([{ id: 'x', ciphertext: body.blob_ciphertext, updated_at: body.blob_updated_at }]),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const result = await syncAppState({ local, passphrase, config, fetchFn })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.action).toBe('pushed')
      expect(result.detail).toBe('Synced, merged 3 changes')
    }
    expect(pushed?.tasks.map((item) => item.id).sort()).toEqual(['pc-only', 'phone-only', 'shared'])
    expect(pushed?.tasks.find((item) => item.id === 'shared')).toMatchObject({
      title: 'New title',
      completedDates: ['2026-09-16'],
    })
    expect(pushed?.tasks.some((item) => item.title === 'Call the operator')).toBe(true)
  })

  it('merges again when the blob row changed during the upload', async () => {
    const local = stateWith([makeTask('local-task', 'On this device', '2026-09-16T12:00:00.000Z')])
    const remote = stateWith([makeTask('remote-task', 'Already in the cloud', '2026-09-16T11:00:00.000Z')])
    const intruder = stateWith([makeTask('racer', 'Won the row', '2026-09-16T12:00:01.000Z')])
    const remoteCipher = await encryptState(remote, passphrase)
    const intruderCipher = await encryptState(intruder, passphrase)
    let puts = 0

    const fetchFn: typeof fetch = async (input, init) => {
      const url = String(input)
      if (url.includes('today_get_blob')) {
        return new Response(JSON.stringify([{ id: 'x', ciphertext: remoteCipher, updated_at: remote.updatedAt }]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      puts += 1
      const body = JSON.parse(String(init?.body)) as { blob_ciphertext: string; blob_updated_at: string }
      const ciphertext = puts === 1 ? intruderCipher : body.blob_ciphertext
      return new Response(JSON.stringify([{ id: 'x', ciphertext, updated_at: body.blob_updated_at }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const result = await syncAppState({ local, passphrase, config, fetchFn })
    expect(puts).toBe(2)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.tasks.map((item) => item.id).sort()).toEqual(['local-task', 'racer', 'remote-task'])
    }
  })

  it('does not upload a never-edited device', async () => {
    const fetchFn: typeof fetch = async (input) => {
      const url = String(input)
      if (url.includes('today_put_blob')) {
        throw new Error('should not put')
      }
      return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    const result = await syncAppState({
      local: emptyState(),
      passphrase,
      config,
      fetchFn,
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.action).toBe('unchanged')
  })

  it('surfaces a missing-migration 404', async () => {
    const fetchFn: typeof fetch = async () => new Response('not found', { status: 404 })
    const result = await syncAppState({
      local: sampleTask('x', '2026-09-16T12:00:00.000Z'),
      passphrase,
      config,
      fetchFn,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/001_today_blobs/i)
  })
})

function makeTask(id: string, title: string, updatedAt: string): Task {
  return {
    id,
    title,
    description: '',
    section: 'systems',
    isMit: false,
    dueDate: '2026-09-16',
    priority: 3,
    recurrence: { kind: 'once' },
    completedDates: [],
    createdAt: updatedAt,
    updatedAt,
  }
}

function stateWith(tasks: Task[]): StoredState {
  return {
    version: 1,
    tasks,
    mostImportantObjective: '',
    updatedAt: '2026-09-16T12:00:00.000Z',
  }
}
