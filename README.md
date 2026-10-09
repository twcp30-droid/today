# Today

Mobile-first task tracker for **Systems**, **SCADA**, and **Me**.

**Live site:** https://twcp30-droid.github.io/today/

Each section has one Most Important Task plus regular work. Pick a calendar day to see what is due, including daily / weekday / weekly / every-N-days repeats. Incomplete work from an earlier day stays on the list until you complete it. Off-day repeaters that are not rolled onto the selected day land in **Upcoming**.

A standing **Most Important Objective** sits above the month calendar. It is text only (no checkbox, no due date) and stays the same every day until you edit it.

**Tables** (bottom nav, or `#/tables`) is a second screen with one spreadsheet-style table per section. Each row has a **Done** checkbox, **priority** (1–5, default 3), **title**, **description**, and **due date**. Done checks or unchecks that row’s due date in `completedDates` — the same list the Today day view uses — so a completion on either screen shows up on the other and in the encrypted sync blob. Click a sortable header to sort ascending/descending; the other column is kept as a tie-breaker. Adds and edits write the same `today-tasks-v1` document as the day view. Older tasks without priority land at 3.

Each device keeps a **localStorage** cache. Optional **passphrase-encrypted sync** shares one encrypted blob through a free Supabase project. Tasks and the standing objective are encrypted in the browser before upload. The Pages repo never stores plaintext tasks.

## Run locally

```bash
npm install
npm test
npm run dev
```

Vite is configured with `base: '/today/'`, so the app is at:

http://localhost:5173/today/

```bash
npm run build
npm run preview
```

Preview is at http://localhost:4173/today/.

## How sync works

1. You pick a passphrase and enter it on every device (**Sync** in the header).
2. The app derives a blob id: `SHA-256(app-salt || normalized passphrase)`. There are no user accounts.
3. The planner (`today-tasks-v1`: tasks, MITs, completions, recurrence, standing objective) is encrypted with **Web Crypto AES-GCM**. The key is **PBKDF2-SHA-256** (210,000 iterations) using a random salt stored only inside the ciphertext envelope.
4. Supabase stores `{ id, ciphertext, updated_at }`. The database cannot read your tasks.
5. **Merge:** Sync pulls and decrypts the cloud blob, merges it with this device, and saves the result locally. It uploads that merged blob when it differs from the cloud copy. It does not replace one side with the other.

### Conflict rules

- **Tasks** merge by id. A task that exists on only one device is kept. Title, description, priority, due date, recurrence, section, and the Most Important Task flag travel as one snapshot. Each task has `updatedAt`, set on create and on every edit of those fields. The newer snapshot wins. A missing timestamp counts as 0, so the first merge of two older copies keeps the union of tasks.
- **Equal timestamps** (clock skew, or two old copies) do not flip-flop. The same task keeps the lexicographically later canonical snapshot. If a section ends up with two Most Important Tasks, the newer one stays and a tie breaks to the greater task id.
- **Completions** merge per task and per date. Checking a box on either device survives. Unchecking writes a per-date timestamp, and the latest action for that date wins. When those timestamps tie, including two copies that have no timestamps yet, the date stays complete if either side completed it.
- **Deletes** write a tombstone `{ id, deletedAt }` instead of only dropping the row. The other device will not bring the task back. A task edited *after* the delete is kept (its `updatedAt` is strictly newer than `deletedAt`). If the edit is older or the timestamps are equal, the delete wins. A completion check does not count as that newer edit. Tombstones older than 60 days are dropped; a device that stayed offline longer than that can reintroduce the task.
- **Most Important Objective** has its own `mostImportantObjectiveUpdatedAt`. The newer text wins. If the timestamps tie, a non-empty note beats an empty one.
- **First launch** has no document `updatedAt`. That sample planner is not merged into an existing cloud blob; the device loads the cloud copy. After you edit anything, this device joins the merge.

### Passphrase tips

- Use a **long random phrase** (four or more unrelated words, or a password-manager entry). Do not reuse a site password.
- The passphrase is the only secret. Anyone who can guess it can download and decrypt that blob.
- Optional **Forget passphrase on this device** removes it from localStorage. Tasks stay cached locally until you delete site data.

### Security note

- GitHub Pages is public. The Vite **anon key** is baked into the JS bundle on purpose. That key can only call the get/put RPCs for a blob id you already know. It cannot list every row.
- Encryption happens **client-side**. Never put the Supabase `service_role` key in this app or in GitHub Pages.
- A weak passphrase can be brute-forced offline against a stolen ciphertext. Strength matters.
- Two people who pick the same phrase share a blob.

## Enable Supabase (once)

Free tier only. No paid plans.

1. Create a project at [supabase.com](https://supabase.com) (Free).
2. In the SQL editor, paste and run [`supabase/migrations/001_today_blobs.sql`](supabase/migrations/001_today_blobs.sql).
   If you already ran an older `001` and Sync fails with `column reference "id" is ambiguous`, run [`supabase/migrations/002_fix_blob_rpc_ambiguity.sql`](supabase/migrations/002_fix_blob_rpc_ambiguity.sql) instead. New installs only need `001`.
3. Project Settings → API: copy **Project URL** and the **anon public** key. Leave `service_role` on the server.
4. Add GitHub Actions repository secrets:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Re-run **Deploy static content to Pages**. Vite inlines the values at build time. Until they are set, Sync shows a message to add the env keys and no-ops.

Locally:

```bash
cp .env.example .env.local
# paste the real URL + anon key into .env.local (gitignored)
npm run dev
```

Do not invent or commit production secrets. `.env.example` is placeholders only.

## Incomplete tasks roll forward

Rollover is derived from the existing task document (`dueDate`, recurrence, and `completedDates`). Nothing extra is stored, so the same open work syncs across devices with the passphrase blob.

- **One-offs** stay visible on every later day until they are completed. Completing on a later day closes that item; it does not create a second copy.
- **Recurring series keep their cadence.** A missed daily / weekday / weekly / every-N instance stays visible on the gap days *before the next scheduled occurrence*. Completing it on a gap day closes that instance. The next scheduled day is still the same series (same task id), not a duplicate.
- Checking a box records completion on the day you are viewing. The original scheduled day stays incomplete in history if you did not check it then.

## Most Important Objective

The field at the top of the home screen (above the month calendar) is a standing note, not a task. Tap to edit, then save. It has no completion checkbox and no due date. The text carries to every day until you change it, and it is saved in `today-tasks-v1` with the rest of the planner (localStorage and the encrypted sync payload).

## GitHub Pages

Pushes to `main` build `dist/` and deploy it with GitHub Actions. Assets use `base: '/today/'`. The workflow is free for public repositories. Sync env vars are optional; the app still works as a local-only tracker without them.
