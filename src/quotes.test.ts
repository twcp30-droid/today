import { addDays } from './dates'
import { quoteForDate, quoteIndex } from './quoteSelection'
import { QUOTES } from './quotes'

describe('daily quotes', () => {
  it('ships a bundled list of at least 60 attributed quotes', () => {
    expect(QUOTES.length).toBeGreaterThanOrEqual(60)
    const texts = QUOTES.map((quote) => quote.text)
    expect(new Set(texts).size).toBe(texts.length)
    for (const quote of QUOTES) {
      expect(quote.text.trim().length).toBeGreaterThan(12)
      expect(quote.author.trim().length).toBeGreaterThan(2)
    }
  })

  it('picks the same quote for a date every time', () => {
    const first = quoteForDate('2026-10-04')
    expect(quoteForDate('2026-10-04')).toEqual(first)
    expect(first).toBe(QUOTES[quoteIndex('2026-10-04')])
  })

  it('depends only on the date string', () => {
    expect(quoteIndex('2026-10-04', 1000)).toBe(quoteIndex('2026-10-04', 1000))
    expect(quoteIndex('2026-10-04')).toBeGreaterThanOrEqual(0)
    expect(quoteIndex('2026-10-04')).toBeLessThan(QUOTES.length)
    expect(quoteIndex('2026-10-05')).not.toBe(quoteIndex('2026-10-04'))
  })

  it('spreads a year of days across many quotes', () => {
    const seen = new Set(
      Array.from({ length: 366 }, (_, offset) => quoteForDate(addDays('2026-01-01', offset)).text),
    )
    expect(seen.size).toBeGreaterThan(40)
  })
})
