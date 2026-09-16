# Today

Personal daily planner for **Systems**, **SCADA**, and **Me**.

Live: [https://twcp30-droid.github.io/today/](https://twcp30-droid.github.io/today/)

The app is a free static PWA on GitHub Pages. Each device keeps a **localStorage cache**. Optional **passphrase-encrypted sync** shares one encrypted blob through a free Supabase project. Tasks are encrypted in the browser before upload. The Pages repo never stores plaintext tasks.

## What it does

- **Today view** with three lanes: Systems, SCADA, Me
- **MITs** — star a task to pin it as a most-important item for that day
- **Monthly calendar** with area dots and a day drawer
- **Recurrence** — once, daily, weekdays, weekly (pick days), monthly (month-end safe)
- **Move +1 day**, skip one occurrence, or delete a series
- **Export / import** JSON backups
- **Sync** — same passphrase on phone and work PC
- **Installable PWA** with a service worker

## How sync works

1. You pick a passphrase and enter it on every device (Sync in the menu or bottom nav).
2. The app derives a blob id: `SHA-256(app-salt || normalized passphrase)`. There are no user accounts.
3. The full planner (tasks, MITs, completions, skips, recurrence, calendar-day data) is encrypted with **Web Crypto AES-GCM**. The key is **PBKDF2-SHA-256** (210,000 iterations) using a random salt stored only inside the ciphertext envelope.
4. Supabase stores `{ id, ciphertext, updated_at }`. The database cannot read your tasks.
5. **Merge (v1):** last-write-wins for the whole document, using `updatedAt`. The newer device copy replaces the older one. Sync the device that already has tasks first, then the empty phone/PC so it pulls instead of uploading a blank planner.

localStorage remains the working copy. Sync now, a short debounce after edits, and coming back online / focusing the tab will pull or push as needed.

### Passphrase tips

- Use a **long random phrase** (four or more unrelated words, or a password-manager entry). Do not reuse a site password.
- The passphrase is the only secret. Anyone who can guess it can download and decrypt that blob.
- Optional **Forget passphrase on this device** removes it from localStorage. Tasks stay cached locally until you delete site data.

### Security note

- GitHub Pages is public. The Vite **anon key** is baked into the JS bundle on purpose. That key can only call the get/put RPCs for a blob id you already know. It cannot list every row.
- Encryption happens **client-side**. Never put the Supabase `service_role` key in this app or in GitHub Pages.
- A weak passphrase can be brute-forced offline against a stolen ciphertext. Strength matters.
- This is not E2E chat-grade identity: the blob id is derived from the passphrase, so two people who pick the same phrase share a blob.

## Enable Supabase (once)

Free tier only. No paid plans.

1. Create a project at [supabase.com](https://supabase.com) (Free).
2. In the SQL editor, paste and run [`supabase/migrations/001_today_blobs.sql`](supabase/migrations/001_today_blobs.sql). That creates `today_blobs`, enables RLS, revokes table access from `anon`, and exposes `today_get_blob` / `today_put_blob` so a client can read or write **one row by primary key** (no table listing).
3. Project Settings → API: copy **Project URL** and the **anon public** key. Leave `service_role` on the server; never paste it here.
4. For GitHub Pages, add repository secrets (Settings → Secrets and variables → Actions):
   - `VITE_SUPABASE_URL` — `https://YOUR_PROJECT.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` — the anon key
5. Re-run **Deploy to GitHub Pages** (push to `main` or Actions → Run workflow). Vite inlines the values at build time. Until they are set, Sync shows **Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY** and no-ops.

Locally:

```bash
cp .env.example .env.local
# paste the real URL + anon key into .env.local (gitignored)
npm run dev
```

Do not invent or commit production secrets. `.env.example` is placeholders only.

## Local development

```bash
npm install
npm test
npm run dev
```

Vite serves the app at `http://localhost:5173/today/` (`base` is `/today/` so GitHub Pages project URLs resolve).

```bash
npm run build
npm run preview
```

## Deploy

Pushes to `main` build the app and publish it with GitHub Pages (Actions). The workflow is free for public repositories. `base` stays `/today/`. Sync env vars are optional; the PWA still works as a local-only app without them.
