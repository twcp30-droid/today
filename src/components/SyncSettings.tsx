import { useEffect, useState } from "react";
import { normalizePassphrase } from "../sync/crypto";
import type { SyncStatus } from "../sync/useSync";

export function SyncSettings(props: {
  status: SyncStatus;
  passphrase: string;
  onClose: () => void;
  onSavePassphrase: (passphrase: string) => void;
  onSyncNow: () => void;
  onForget: () => void;
}) {
  const [phrase, setPhrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const saved = Boolean(props.passphrase);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") props.onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props]);

  function savePhrase() {
    const normalized = normalizePassphrase(phrase);
    if (normalized.length < 8) {
      setFormError("Use at least 8 characters. A long random phrase is much safer.");
      return;
    }
    if (phrase !== confirm) {
      setFormError("Passphrases do not match.");
      return;
    }
    setFormError(null);
    props.onSavePassphrase(normalized);
    setPhrase("");
    setConfirm("");
  }

  return (
    <div className="overlay sync-overlay" role="presentation" onClick={props.onClose}>
      <section
        className="modal sync-modal"
        role="dialog"
        aria-labelledby="sync-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="sync-title">Sync</h2>
        <p className="blurb">
          Same passphrase on your phone and work PC. Tasks are encrypted in the browser with
          AES-GCM, then stored as an opaque blob. This device still keeps a localStorage cache.
        </p>
        <p className="hint">
          Merge is last-write-wins for the whole planner (by <code>updatedAt</code>). Sync the
          device that already has tasks first, then the empty one.
        </p>

        {props.status.configured ? (
          <p className="sync-banner ok">Supabase is configured on this build.</p>
        ) : (
          <p className="sync-banner warn">
            Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>, then
            rebuild. Until then, Sync now does nothing. See the README.
          </p>
        )}

        {saved ? (
          <p className="hint">
            A passphrase is saved on this device. Enter a new one below to replace it.
          </p>
        ) : (
          <p className="hint">Set the passphrase before the first sync.</p>
        )}

        <label htmlFor="sync-passphrase">Passphrase</label>
        <input
          id="sync-passphrase"
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={phrase}
          onChange={(event) => setPhrase(event.target.value)}
          placeholder={saved ? "••••••••" : "Long phrase you will reuse"}
        />

        <label htmlFor="sync-passphrase-confirm">Confirm</label>
        <input
          id="sync-passphrase-confirm"
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
        />

        {formError ? <p className="sync-error">{formError}</p> : null}

        <div className="modal-actions wrap">
          <button className="primary" onClick={savePhrase}>
            Save passphrase
          </button>
          <button
            className="ghost"
            disabled={props.status.syncing}
            onClick={() => props.onSyncNow()}
          >
            {props.status.syncing ? "Syncing…" : "Sync now"}
          </button>
        </div>

        <div className="sync-status-block" aria-live="polite">
          <h3>Status</h3>
          {props.status.syncing ? <p>Syncing…</p> : null}
          {props.status.error ? <p className="sync-error">{props.status.error}</p> : null}
          {props.status.detail && !props.status.error ? (
            <p className="hint">{props.status.detail}</p>
          ) : null}
          <p className="progress">
            Last synced: {props.status.lastSynced ? formatStamp(props.status.lastSynced) : "never"}
          </p>
        </div>

        <div className="danger-row wrap">
          {saved ? (
            <button className="text-btn danger" onClick={props.onForget}>
              Forget passphrase on this device
            </button>
          ) : null}
          <button className="text-btn" onClick={props.onClose}>
            Close
          </button>
        </div>
      </section>
    </div>
  );
}

function formatStamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}
