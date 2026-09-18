import { appearsOn } from '../recurrence'
import { SECTION_META, type SectionId, type Task } from '../types'
import { TaskRow } from './TaskRow'

interface SectionCardProps {
  section: SectionId
  date: string
  tasks: Task[]
  onAdd: (isMit: boolean) => void
  onToggle: (id: string) => void
  onEdit: (task: Task) => void
}

export function SectionCard({ section, date, tasks, onAdd, onToggle, onEdit }: SectionCardProps) {
  const meta = SECTION_META[section]
  const dayTasks = tasks.filter((task) => appearsOn(task, date))
  const mit = dayTasks.find((task) => task.isMit)
  const rest = dayTasks.filter((task) => !task.isMit)

  return (
    <section className={`section section-${section}`}>
      <header className="section-head">
        <div>
          <h3>{meta.label}</h3>
          <p>{meta.hint}</p>
        </div>
        <button type="button" className="add-btn" onClick={() => onAdd(false)}>
          + Add
        </button>
      </header>

      <div className="mit-slot">
        <div className="mit-label">Most Important Task</div>
        {mit ? (
          <TaskRow
            task={mit}
            date={date}
            featured
            onToggle={() => onToggle(mit.id)}
            onEdit={() => onEdit(mit)}
          />
        ) : (
          <button type="button" className="empty-mit" onClick={() => onAdd(true)}>
            Set a MIT for this day
          </button>
        )}
      </div>

      <div className="task-list">
        {rest.length === 0 ? (
          <p className="empty">No other tasks for this day.</p>
        ) : (
          rest.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              date={date}
              onToggle={() => onToggle(task.id)}
              onEdit={() => onEdit(task)}
            />
          ))
        )}
      </div>
    </section>
  )
}
