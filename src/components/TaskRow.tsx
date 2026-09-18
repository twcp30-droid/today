import { formatShort } from '../dates'
import { isCompletedOn, recurrenceLabel, rolledFrom } from '../recurrence'
import type { Task } from '../types'

interface TaskRowProps {
  task: Task
  date: string
  featured?: boolean
  onToggle: () => void
  onEdit: () => void
}

export function TaskRow({ task, date, featured = false, onToggle, onEdit }: TaskRowProps) {
  const done = isCompletedOn(task, date)
  const origin = rolledFrom(task, date)

  return (
    <article className={`task ${featured ? 'is-mit' : ''} ${done ? 'is-done' : ''}`}>
      <button
        type="button"
        className="check"
        aria-pressed={done}
        aria-label={done ? `Mark ${task.title} incomplete` : `Complete ${task.title}`}
        onClick={onToggle}
      >
        {done ? '✓' : ''}
      </button>
      <div className="task-body">
        <p className="task-title">{task.title}</p>
        <p className="task-meta">
          {recurrenceLabel(task.recurrence)}
          {origin ? ` · rolled from ${formatShort(origin)}` : ''}
        </p>
      </div>
      <button type="button" className="ghost-btn" onClick={onEdit} aria-label={`Edit ${task.title}`}>
        Edit
      </button>
    </article>
  )
}
