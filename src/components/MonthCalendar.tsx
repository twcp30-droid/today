import { daysInMonth, toISODate, weekday, monthLabel } from '../dates'
import { isOpenOn } from '../recurrence'
import type { Task } from '../types'

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

interface MonthCalendarProps {
  year: number
  month: number
  selectedDate: string
  todayDate: string
  tasks: Task[]
  onSelectDate: (iso: string) => void
  onPrevMonth: () => void
  onNextMonth: () => void
}

export function MonthCalendar({
  year,
  month,
  selectedDate,
  todayDate,
  tasks,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
}: MonthCalendarProps) {
  const firstWeekday = weekday(toISODate(new Date(year, month, 1)))
  const count = daysInMonth(year, month)
  const cells: Array<{ iso: string; inMonth: boolean } | null> = []

  for (let i = 0; i < firstWeekday; i += 1) cells.push(null)
  for (let day = 1; day <= count; day += 1) {
    cells.push({ iso: toISODate(new Date(year, month, day)), inMonth: true })
  }

  return (
    <section className="cal" aria-label="Month calendar">
      <div className="cal-head">
        <button type="button" className="icon-btn" onClick={onPrevMonth} aria-label="Previous month">
          ‹
        </button>
        <h2>{monthLabel(year, month)}</h2>
        <button type="button" className="icon-btn" onClick={onNextMonth} aria-label="Next month">
          ›
        </button>
      </div>
      <div className="cal-grid" role="grid" aria-label={monthLabel(year, month)}>
        {DOW.map((label, index) => (
          <span key={`${label}-${index}`} className="cal-dow" role="columnheader">
            {label}
          </span>
        ))}
        {cells.map((cell, index) => {
          if (!cell) return <span key={`empty-${index}`} className="cal-empty" />
          const isToday = cell.iso === todayDate
          const isSelected = cell.iso === selectedDate
          const hasOpen = tasks.some((task) => isOpenOn(task, cell.iso))
          return (
            <button
              key={cell.iso}
              type="button"
              role="gridcell"
              aria-pressed={isSelected}
              aria-current={isToday ? 'date' : undefined}
              className={[
                'cal-day',
                isToday ? 'is-today' : '',
                isSelected ? 'is-selected' : '',
                hasOpen ? 'has-tasks' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onSelectDate(cell.iso)}
            >
              <span>{Number(cell.iso.slice(-2))}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
