import { formatShort } from '../dates'
import { appearsOn, nextOccurrence, recurrenceLabel } from '../recurrence'
import { SECTION_META, type Task } from '../types'

interface UpcomingListProps {
  tasks: Task[]
  date: string
  onEdit: (task: Task) => void
}

export function UpcomingList({ tasks, date, onEdit }: UpcomingListProps) {
  const items = tasks
    .filter((task) => !appearsOn(task, date))
    .map((task) => {
      const next = nextOccurrence(task, date)
      return next ? { task, next } : null
    })
    .filter((item): item is { task: Task; next: string } => item !== null)
    .sort((a, b) => a.next.localeCompare(b.next) || a.task.title.localeCompare(b.task.title))

  if (items.length === 0) return null

  return (
    <section className="upcoming">
      <h3>Upcoming</h3>
      <p className="upcoming-hint">Off-day repeaters and later one-offs</p>
      <ul>
        {items.map(({ task, next }) => (
          <li key={task.id}>
            <button type="button" onClick={() => onEdit(task)}>
              <span className="up-title">
                {task.isMit ? 'MIT · ' : ''}
                {task.title}
              </span>
              <span className="up-meta">
                {SECTION_META[task.section].label} · {recurrenceLabel(task.recurrence)} · {formatShort(next)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
