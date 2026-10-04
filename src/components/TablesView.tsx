import { useMemo } from 'react'
import { formatLong } from '../dates'
import { formatScore, scoreDay } from '../score'
import { SECTIONS, type SectionId, type Task } from '../types'
import { TaskTable } from './TaskTable'

interface TablesViewProps {
  date: string
  tasks: Task[]
  onSave: (task: Task) => void
  onToggleComplete: (id: string, date: string) => void
  onEdit: (task: Task) => void
}

export function TablesView({ date, tasks, onSave, onToggleComplete, onEdit }: TablesViewProps) {
  const scores = useMemo(() => scoreDay(tasks, date), [tasks, date])

  return (
    <div className="tables-view">
      <p className="tables-lede">
        Same tasks as Today, grouped by section. <strong>Done</strong> completes that row’s due
        date. Click <strong>Priority</strong> or <strong>Due date</strong> to sort (the other
        column stays as a tie-breaker).
      </p>
      <p className="day-score">
        <span className="day-score-label">{formatLong(date)}</span>
        <strong>
          {formatScore(scores.overall)}
          <span className="sr-only"> points</span>
        </strong>
      </p>
      {SECTIONS.map((section: SectionId) => (
        <TaskTable
          key={section}
          section={section}
          date={date}
          tasks={tasks}
          onSave={onSave}
          onToggleComplete={onToggleComplete}
          onEdit={onEdit}
        />
      ))}
    </div>
  )
}
