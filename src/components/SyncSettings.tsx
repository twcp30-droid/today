import { useEffect, useId, useRef, useState } from 'react'
import { normalizePassphrase } from '../sync/crypto'
import type { SyncStatus } from '../sync/useSync'

export function SyncSettings(props: {
  open: boolean
  status: SyncStatus
  passphrase: string
  onClose: () => void
  onSavePassphrase: (passphrase: string) => void
  onSyncNow: () => void
  onForget: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [phrase, setPhrase] = useState('')
  const [confirm, setConfirm] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const saved = Boolean(props.passphrase)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (props.open && !dialog.open) dialog.showModal()
    if (!props.open && dialog.open) dialog.close()
  }, [props.open])

  function savePhrase() {
    const normalized = normalizePassphrase(phrase)
    if (normalized.length < 8) {
      setFormError('Use at least 8 characters. A long random phrase is much safer.')
      return
    }
    if (phrase !== confirm) {
      setFormError('Passphrases do not match.')
      return
    }
    setFormError(null)
    props.onSavePassphrase(normalized)
    setPhrase('')
    setConfirm('')
  }

  return (
    <dialog
      ref={dialogRef}
      className="sheet"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        props.onClose()
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) props.onClose()
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault()
          savePhrase()
        }}
      >
        <h2 id={titleId}>Sync</h2>
        <p className="upcoming-hint">
          Same passphrase on your phone and work PC. Tasks are encrypted in the browser with AES-GCM,
          then stored as an opaque blob. This device still keeps a localStorage cache.
        </p>
        <p className="upcoming-hint">
          Merge is last-write-wins for the whole planner (by updatedAt). Sync the device that already
          has tasks first, then the empty one.
        </p>

        {props.status.configured ? (
          <p className="sync-banner ok">Supabase is configured on this build.</p>
        ) : (
          <p className="sync-banner warn">
            Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then rebuild. Until then, Sync now does
            nothing. See the README.
          </p>
        )}

        {saved ? (
          <p className="upcoming-hint">
            A passphrase is saved on this device. Enter a new one below to replace it.
          </p>
        ) : (
          <p className="upcoming-hint">Set the passphrase before the first sync.</p>
        )}

        <label>
          Passphrase
          <input
            type="password"
            autoComplete="new-password"
            spellCheck={false}
            value={phrase}
            onChange={(event) => setPhrase(event.target.value)}
            placeholder={saved ? '••••••••' : 'Long phrase you will reuse'}
          />
        </label>

        <label>
          Confirm
          <input
            type="password"
            autoComplete="new-password"
            spellCheck={false}
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
          />
        </label>

        {formError ? <p className="sync-error">{formError}</p> : null}

        <div className="sheet-actions wrap">
          <button type="submit" className="primary">
            Save passphrase
          </button>
          <button
            type="button"
            className="ghost-btn"
            disabled={props.status.syncing}
            onClick={() => props.onSyncNow()}
          >
            {props.status.syncing ? 'Syncing…' : 'Sync now'}
          </button>
        </div>

        <div aria-live="polite">
          <p className="mit-label">Status</p>
          {props.status.syncing ? <p className="upcoming-hint">Syncing…</p> : null}
          {props.status.error ? <p className="sync-error">{props.status.error}</p> : null}
          {props.status.detail && !props.status.error ? (
            <p className="upcoming-hint">{props.status.detail}</p>
          ) : null}
          <p className="upcoming-hint">
            Last synced: {props.status.lastSynced ? formatStamp(props.status.lastSynced) : 'never'}
          </p>
        </div>

        <div className="sheet-actions wrap">
          {saved ? (
            <button type="button" className="danger" onClick={props.onForget}>
              Forget passphrase on this device
            </button>
          ) : null}
          <button type="button" className="ghost-btn" onClick={props.onClose}>
            Close
          </button>
        </div>
      </form>
    </dialog>
  )
}

function formatStamp(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString()
}
