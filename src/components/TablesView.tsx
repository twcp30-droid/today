import { SECTIONS, type SectionId, type Task } from '../types'
import { TaskTable } from './TaskTable'

interface TablesViewProps {
  tasks: Task[]
  onSave: (task: Task) => void
  onEdit: (task: Task) => void
}

export function TablesView({ tasks, onSave, onEdit }: TablesViewProps) {
  return (
    <div className="tables-view">
      <p className="tables-lede">
        Same tasks as Today, grouped by section. Click <strong>Priority</strong> or{' '}
        <strong>Due date</strong> to sort (the other column stays as a tie-breaker).
      </p>
      {SECTIONS.map((section: SectionId) => (
        <TaskTable key={section} section={section} tasks={tasks} onSave={onSave} onEdit={onEdit} />
      ))}
    </div>
  )
}
