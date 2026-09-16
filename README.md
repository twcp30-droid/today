# Today

Personal daily planner for **Systems**, **SCADA**, and **Me**.

Live: [https://twcp30-droid.github.io/today/](https://twcp30-droid.github.io/today/)

The app is a free static PWA. Tasks, MITs, completions, and recurrence live in `localStorage` on this device. There is no account, no paid API, and no server of your own to run.

## What it does

- **Today view** with three lanes: Systems, SCADA, Me
- **MITs** — star a task to pin it as a most-important item for that day
- **Monthly calendar** with area dots and a day drawer
- **Recurrence** — once, daily, weekdays, weekly (pick days), monthly (month-end safe)
- **Move +1 day**, skip one occurrence, or delete a series
- **Export / import** JSON backups
- **Installable PWA** with a service worker

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

Pushes to `main` build the app and publish it with GitHub Pages (Actions). The workflow is free for public repositories.
