# Today

Mobile-first task tracker for **Systems**, **SCADA**, and **Me**.

**Live site:** https://twcp30-droid.github.io/today/

Each section has one Most Important Task plus regular work. Pick a calendar day to see what is due, including daily / weekday / weekly / every-N-days repeats. Off-day repeaters land in **Upcoming**. Data stays in `localStorage`.

## Run locally

```bash
npm install
npm run dev
```

Vite is configured with `base: '/today/'`, so the app is at:

http://localhost:5173/today/

```bash
npm run build
npm run preview
```

Preview is at http://localhost:4173/today/.

## GitHub Pages

Pushes to `main` run GitHub Actions: `npm run build`, then publish `dist/` to the `gh-pages` branch. Assets are built with `base: '/today/'`.

If https://twcp30-droid.github.io/today/ 404s, enable Pages once (repo admin):

1. Open **Settings → Pages**
2. **Build and deployment → Source:** Deploy from a branch
3. Branch **gh-pages**, folder **/ (root)**
4. Save

No paid hosting and no secrets are required.
