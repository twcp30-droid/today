import { QUOTES, type Quote } from './quotes'

const FNV_OFFSET = 0x811c9dc5
const FNV_PRIME = 0x01000193

/** Stable bucket for a calendar day. The same date always lands on the same quote. */
export function quoteIndex(isoDate: string, length = QUOTES.length): number {
  if (length <= 0) return 0
  let hash = FNV_OFFSET
  for (let i = 0; i < isoDate.length; i += 1) {
    hash ^= isoDate.charCodeAt(i)
    hash = Math.imul(hash, FNV_PRIME)
  }
  return (hash >>> 0) % length
}

export function quoteForDate(isoDate: string, quotes: readonly Quote[] = QUOTES): Quote {
  return quotes[quoteIndex(isoDate, quotes.length)]
}
