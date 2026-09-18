import { emptyState } from '../storage'
import { sampleTask } from './sample'
import { blobIdFromPassphrase, decryptState, encryptState, normalizePassphrase } from './crypto'

describe('passphrase crypto', () => {
  const passphrase = 'correct horse battery staple'

  it('normalizes unicode and trim', () => {
    expect(normalizePassphrase('  Café  ')).toBe('Café')
    expect(normalizePassphrase('\u2126')).toBe('Ω')
  })

  it('derives a stable 64-char blob id', async () => {
    const a = await blobIdFromPassphrase(` ${passphrase} `)
    const b = await blobIdFromPassphrase(passphrase)
    expect(a).toBe(b)
    expect(a).toMatch(/^[0-9a-f]{64}$/)
    expect(a).not.toBe(await blobIdFromPassphrase('different phrase'))
  })

  it('round-trips tasks without putting plaintext in the envelope', async () => {
    const state = sampleTask('SECRET_SCADA_WALKDOWN', '2026-09-16T12:00:00.000Z')
    const envelope = await encryptState(state, passphrase)
    expect(envelope).not.toContain('SECRET_SCADA_WALKDOWN')
    expect(envelope).not.toContain('scada')
    expect(JSON.stringify(state)).toContain('SECRET_SCADA_WALKDOWN')

    const roundTrip = await decryptState(envelope, passphrase)
    expect(roundTrip.tasks[0].title).toBe('SECRET_SCADA_WALKDOWN')
    expect(roundTrip.tasks[0].isMit).toBe(true)
    expect(roundTrip.tasks[0].completedDates).toEqual(['2026-09-16'])
  })

  it('round-trips the standing objective inside the encrypted blob', async () => {
    const state = {
      ...sampleTask('SECRET_SCADA_WALKDOWN', '2026-09-16T12:00:00.000Z'),
      mostImportantObjective: 'SECRET_NORTH_STAR',
    }
    const envelope = await encryptState(state, passphrase)
    expect(envelope).not.toContain('SECRET_NORTH_STAR')

    const roundTrip = await decryptState(envelope, passphrase)
    expect(roundTrip.mostImportantObjective).toBe('SECRET_NORTH_STAR')
    expect(roundTrip.tasks[0].title).toBe('SECRET_SCADA_WALKDOWN')
  })

  it('rejects the wrong passphrase', async () => {
    const envelope = await encryptState(emptyState(), passphrase)
    await expect(decryptState(envelope, 'wrong passphrase')).rejects.toThrow(/Wrong passphrase/)
  })
})
