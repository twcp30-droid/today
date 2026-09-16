# Today

Mobile-first task tracker for **Systems**, **SCADA**, and **Me**.

**Live site:** https://twcp30-droid.github.io/today/

Each section has one Most Important Task plus regular work. Pick a calendar day to see what is due, including daily / weekday / weekly / every-N-days repeats. Off-day repeaters land in **Upcoming**.

Each device keeps a **localStorage** cache. Optional **passphrase-encrypted sync** shares one encrypted blob through a free Supabase project. Tasks are encrypted in the browser before upload. The Pages repo never stores plaintext tasks.

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
3. The planner (`today-tasks-v1`: tasks, MITs, completions, recurrence) is encrypted with **Web Crypto AES-GCM**. The key is **PBKDF2-SHA-256** (210,000 iterations) using a random salt stored only inside the ciphertext envelope.
4. Supabase stores `{ id, ciphertext, updated_at }`. The database cannot read your tasks.
5. **Merge (v1):** last-write-wins for the whole document, using `updatedAt`. Sync the device that already has tasks first, then the empty phone/PC so it pulls instead of uploading a blank planner.

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

## GitHub Pages

Pushes to `main` build `dist/` and deploy it with GitHub Actions. Assets use `base: '/today/'`. The workflow is free for public repositories. Sync env vars are optional; the app still works as a local-only tracker without them.
