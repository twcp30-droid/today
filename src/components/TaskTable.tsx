import { useState } from 'react'
import { todayISO } from '../dates'
import { newTask, patchTask } from '../task'
import { DEFAULT_TABLE_SORT, sortTasks, toggleSort, type SortKey, type SortSpec } from '../tableSort'
import {
  DEFAULT_PRIORITY,
  PRIORITIES,
  SECTION_META,
  type Priority,
  type SectionId,
  type Task,
} from '../types'

interface TaskTableProps {
  section: SectionId
  tasks: Task[]
  onSave: (task: Task) => void
  onEdit: (task: Task) => void
}

export function TaskTable({ section, tasks, onSave, onEdit }: TaskTableProps) {
  const meta = SECTION_META[section]
  const [sort, setSort] = useState<SortSpec>(DEFAULT_TABLE_SORT)
  const rows = sortTasks(
    tasks.filter((task) => task.section === section),
    sort,
  )

  function sortAria(key: SortKey): 'ascending' | 'descending' | 'none' {
    if (sort.primary.key !== key) return 'none'
    return sort.primary.dir === 'asc' ? 'ascending' : 'descending'
  }

  function sortLabel(key: SortKey): string {
    const marks: string[] = []
    if (sort.primary.key === key) marks.push(sort.primary.dir === 'asc' ? '↑' : '↓')
    else if (sort.secondary?.key === key) marks.push(sort.secondary.dir === 'asc' ? '↑' : '↓')
    return marks.join(' ')
  }

  return (
    <section className={`section table-card section-${section}`}>
      <header className="section-head">
        <div>
          <h3>{meta.label}</h3>
          <p>
            {meta.hint} · {rows.length} {rows.length === 1 ? 'task' : 'tasks'}
          </p>
        </div>
      </header>

      <div className="table-scroll">
        <table className="task-table">
          <thead>
            <tr>
              <th aria-sort={sortAria('priority')}>
                <button type="button" className="sort-btn" onClick={() => setSort((prev) => toggleSort(prev, 'priority'))}>
                  Priority <span aria-hidden="true">{sortLabel('priority')}</span>
                </button>
              </th>
              <th>Title</th>
              <th>Description</th>
              <th aria-sort={sortAria('dueDate')}>
                <button type="button" className="sort-btn" onClick={() => setSort((prev) => toggleSort(prev, 'dueDate'))}>
                  Due date <span aria-hidden="true">{sortLabel('dueDate')}</span>
                </button>
              </th>
              <th>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="table-empty">
                  No tasks yet. Add a row below.
                </td>
              </tr>
            ) : (
              rows.map((task) => (
                <TaskTableRow key={task.id} task={task} onSave={onSave} onEdit={onEdit} />
              ))
            )}
          </tbody>
          <tfoot>
            <AddTaskRow section={section} onSave={onSave} />
          </tfoot>
        </table>
      </div>
    </section>
  )
}

function TaskTableRow({
  task,
  onSave,
  onEdit,
}: {
  task: Task
  onSave: (task: Task) => void
  onEdit: (task: Task) => void
}) {
  return (
    <tr>
      <td>
        <PrioritySelect
          value={task.priority}
          labelledBy={`priority-${task.id}`}
          onChange={(priority) => onSave(patchTask(task, { priority }))}
        />
        <span className="sr-only" id={`priority-${task.id}`}>
          Priority for {task.title}
        </span>
      </td>
      <td>
        <div className="title-cell">
          {task.isMit ? <span className="mit-chip">MIT</span> : null}
          <BlurInput
            value={task.title}
            aria-label={`Title for ${task.title}`}
            required
            onCommit={(title) => onSave(patchTask(task, { title }))}
          />
        </div>
      </td>
      <td>
        <BlurInput
          value={task.description}
          aria-label={`Description for ${task.title}`}
          allowEmpty
          onCommit={(description) => onSave(patchTask(task, { description }))}
        />
      </td>
      <td>
        <input
          type="date"
          value={task.dueDate}
          aria-label={`Due date for ${task.title}`}
          required
          onChange={(event) => {
            if (!event.target.value) return
            onSave(patchTask(task, { dueDate: event.target.value }))
          }}
        />
      </td>
      <td className="table-actions">
        <button type="button" className="ghost-btn" onClick={() => onEdit(task)} aria-label={`Edit ${task.title}`}>
          Edit
        </button>
      </td>
    </tr>
  )
}

function AddTaskRow({ section, onSave }: { section: SectionId; onSave: (task: Task) => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Priority>(DEFAULT_PRIORITY)
  const [dueDate, setDueDate] = useState(() => todayISO())

  function reset() {
    setTitle('')
    setDescription('')
    setPriority(DEFAULT_PRIORITY)
    setDueDate(todayISO())
  }

  function submit() {
    const nextTitle = title.trim()
    if (!nextTitle || !dueDate) return
    onSave(
      newTask({
        title: nextTitle,
        description: description.trim(),
        section,
        priority,
        dueDate,
      }),
    )
    reset()
  }

  return (
    <tr className="add-row">
      <td>
        <PrioritySelect value={priority} labelledBy={`add-priority-${section}`} onChange={setPriority} />
        <span className="sr-only" id={`add-priority-${section}`}>
          Priority for new {SECTION_META[section].label} task
        </span>
      </td>
      <td>
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              submit()
            }
          }}
          placeholder="New task title"
          aria-label={`New ${SECTION_META[section].label} title`}
        />
      </td>
      <td>
        <input
          type="text"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              submit()
            }
          }}
          placeholder="Description"
          aria-label={`New ${SECTION_META[section].label} description`}
        />
      </td>
      <td>
        <input
          type="date"
          value={dueDate}
          required
          aria-label={`New ${SECTION_META[section].label} due date`}
          onChange={(event) => setDueDate(event.target.value)}
        />
      </td>
      <td className="table-actions">
        <button type="button" className="add-btn" onClick={submit} disabled={!title.trim()}>
          Add
        </button>
      </td>
    </tr>
  )
}

function PrioritySelect({
  value,
  onChange,
  labelledBy,
}: {
  value: Priority
  onChange: (priority: Priority) => void
  labelledBy: string
}) {
  return (
    <select
      className={`prio-select prio-${value}`}
      value={value}
      aria-labelledby={labelledBy}
      onChange={(event) => onChange(Number(event.target.value) as Priority)}
    >
      {PRIORITIES.map((priority) => (
        <option key={priority} value={priority}>
          {priority}
        </option>
      ))}
    </select>
  )
}

function BlurInput({
  value,
  onCommit,
  allowEmpty = false,
  required = false,
  'aria-label': ariaLabel,
}: {
  value: string
  onCommit: (value: string) => void
  allowEmpty?: boolean
  required?: boolean
  'aria-label': string
}) {
  return (
    <input
      key={value}
      type="text"
      defaultValue={value}
      required={required}
      aria-label={ariaLabel}
      onBlur={(event) => {
        const next = event.target.value.trim()
        if (!next && !allowEmpty) {
          event.target.value = value
          return
        }
        if (next !== value) onCommit(next)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          event.currentTarget.blur()
        }
      }}
    />
  )
}
