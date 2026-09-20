import { hashForView, viewFromHash } from './view'

describe('hash views', () => {
  it('treats tables as the secondary screen', () => {
    expect(viewFromHash('#/tables')).toBe('tables')
    expect(viewFromHash('#tables')).toBe('tables')
    expect(viewFromHash('#/tables/')).toBe('tables')
  })

  it('falls back to today for anything else', () => {
    expect(viewFromHash('')).toBe('today')
    expect(viewFromHash('#/')).toBe('today')
    expect(viewFromHash('#/nope')).toBe('today')
  })

  it('writes a GitHub Pages-friendly hash', () => {
    expect(hashForView('tables')).toBe('#/tables')
    expect(hashForView('today')).toBe('#/')
  })
})
