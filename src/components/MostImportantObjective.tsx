import { useEffect, useId, useRef, useState, type FormEvent } from 'react'

interface MostImportantObjectiveProps {
  value: string
  onSave: (value: string) => void
}

export function MostImportantObjective({ value, onSave }: MostImportantObjectiveProps) {
  const labelId = useId()
  const inputId = useId()
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  function startEditing() {
    setDraft(value)
    setEditing(true)
  }

  function cancel() {
    setDraft(value)
    setEditing(false)
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    onSave(draft)
    setEditing(false)
  }

  return (
    <section className="objective" aria-labelledby={labelId}>
      <div className="objective-mark" aria-hidden="true">
        <svg className="objective-icon" viewBox="0 0 24 24" width="22" height="22">
          <path
            fill="currentColor"
            d="M12 2.2 14.7 8.3l6.6.6-5 4.3 1.5 6.4L12 16.4 6.2 19.6 7.7 13.2l-5-4.3 6.6-.6L12 2.2z"
          />
        </svg>
      </div>
      <div className="objective-body">
        <h2 id={labelId} className="objective-label">
          Most Important Objective
        </h2>
        {editing ? (
          <form onSubmit={submit}>
            <label htmlFor={inputId} className="sr-only">
              Most Important Objective
            </label>
            <textarea
              id={inputId}
              ref={inputRef}
              rows={3}
              maxLength={280}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault()
                  cancel()
                }
              }}
              placeholder="What matters most until you change this?"
            />
            <div className="objective-actions">
              <button type="button" className="ghost-btn" onClick={cancel}>
                Cancel
              </button>
              <button type="submit" className="primary">
                Save
              </button>
            </div>
          </form>
        ) : (
          <button type="button" className={`objective-text ${value ? '' : 'is-empty'}`} onClick={startEditing}>
            {value || 'Tap to set'}
          </button>
        )}
      </div>
    </section>
  )
}
