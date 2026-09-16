import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { weekday } from '../dates'
import type { Recurrence, RecurrenceKind, SectionId, Task } from '../types'
import { SECTIONS, SECTION_META, WEEKDAYS } from '../types'

interface TaskSheetProps {
  open: boolean
  date: string
  presetSection: SectionId
  presetMit: boolean
  editing: Task | null
  onClose: () => void
  onSave: (task: Task) => void
  onDelete?: (id: string) => void
}

interface Draft {
  title: string
  section: SectionId
  isMit: boolean
  dueDate: string
  kind: RecurrenceKind
  weekday: number
  everyN: number
}

function recurrenceFromDraft(draft: Draft): Recurrence {
  switch (draft.kind) {
    case 'weekly':
      return { kind: 'weekly', weekday: draft.weekday }
    case 'every_n':
      return { kind: 'every_n', n: Math.max(1, draft.everyN) }
    default:
      return { kind: draft.kind }
  }
}

function draftFromTask(task: Task): Draft {
  return {
    title: task.title,
    section: task.section,
    isMit: task.isMit,
    dueDate: task.dueDate,
    kind: task.recurrence.kind,
    weekday: task.recurrence.kind === 'weekly' ? task.recurrence.weekday : weekday(task.dueDate),
    everyN: task.recurrence.kind === 'every_n' ? task.recurrence.n : 2,
  }
}

export function TaskSheet({
  open,
  date,
  presetSection,
  presetMit,
  editing,
  onClose,
  onSave,
  onDelete,
}: TaskSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [draft, setDraft] = useState<Draft>(() =>
    editing
      ? draftFromTask(editing)
      : {
          title: '',
          section: presetSection,
          isMit: presetMit,
          dueDate: date,
          kind: 'once',
          weekday: weekday(date),
          everyN: 2,
        },
  )

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  function submit(event: FormEvent) {
    event.preventDefault()
    const title = draft.title.trim()
    if (!title) return
    const task: Task = {
      id: editing?.id ?? crypto.randomUUID(),
      title,
      section: draft.section,
      isMit: draft.isMit,
      dueDate: draft.dueDate,
      recurrence: recurrenceFromDraft(draft),
      completedDates: editing?.completedDates ?? [],
      createdAt: editing?.createdAt ?? new Date().toISOString(),
    }
    onSave(task)
    onClose()
  }

  return (
    <dialog
      ref={dialogRef}
      className="sheet"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose()
      }}
    >
      <form onSubmit={submit}>
        <h2 id={titleId}>{editing ? 'Edit task' : 'New task'}</h2>

        <label>
          Title
          <input
            autoFocus
            value={draft.title}
            onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="What needs to happen?"
            required
          />
        </label>

        <fieldset>
          <legend>Section</legend>
          <div className="seg">
            {SECTIONS.map((section) => (
              <button
                key={section}
                type="button"
                className={draft.section === section ? 'is-on' : ''}
                onClick={() => setDraft((prev) => ({ ...prev, section }))}
              >
                {SECTION_META[section].label}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="check-row">
          <input
            type="checkbox"
            checked={draft.isMit}
            onChange={(event) => setDraft((prev) => ({ ...prev, isMit: event.target.checked }))}
          />
          Most Important Task for this section
        </label>

        <label>
          Assigned day
          <input
            type="date"
            value={draft.dueDate}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                dueDate: event.target.value,
                weekday: weekday(event.target.value || prev.dueDate),
              }))
            }
            required
          />
        </label>

        <fieldset>
          <legend>Repeats</legend>
          <div className="seg wrap">
            {(
              [
                ['once', 'Once'],
                ['daily', 'Daily'],
                ['weekdays', 'Weekdays'],
                ['weekly', 'Weekly'],
                ['every_n', 'Every N days'],
              ] as const
            ).map(([kind, label]) => (
              <button
                key={kind}
                type="button"
                className={draft.kind === kind ? 'is-on' : ''}
                onClick={() => setDraft((prev) => ({ ...prev, kind }))}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        {draft.kind === 'weekly' ? (
          <fieldset>
            <legend>Weekday</legend>
            <div className="seg">
              {WEEKDAYS.map((label, index) => (
                <button
                  key={label}
                  type="button"
                  className={draft.weekday === index ? 'is-on' : ''}
                  onClick={() => setDraft((prev) => ({ ...prev, weekday: index }))}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
        ) : null}

        {draft.kind === 'every_n' ? (
          <label>
            Every N days
            <input
              type="number"
              min={1}
              max={365}
              value={draft.everyN}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, everyN: Math.max(1, Number(event.target.value) || 1) }))
              }
            />
          </label>
        ) : null}

        <div className="sheet-actions">
          {editing && onDelete ? (
            <button
              type="button"
              className="danger"
              onClick={() => {
                onDelete(editing.id)
                onClose()
              }}
            >
              Delete
            </button>
          ) : (
            <span />
          )}
          <button type="button" className="ghost-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="primary">
            Save
          </button>
        </div>
      </form>
    </dialog>
  )
}
