import { quoteForDate } from '../quoteSelection'

interface DailyQuoteProps {
  date: string
}

export function DailyQuote({ date }: DailyQuoteProps) {
  const quote = quoteForDate(date)
  return (
    <figure className="daily-quote">
      <blockquote>{quote.text}</blockquote>
      <figcaption>{quote.author}</figcaption>
    </figure>
  )
}
