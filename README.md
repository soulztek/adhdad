# ADHDad (PWA)

An installable, offline-capable app for an ADHD dad: daily checklist with Full/Minimum versions, family chores, parenting reminders, connection habits (Vitamin A affirmations, 20-second hugs), easy kettlebell/dumbbell home workouts, ADHD mind check-ins, phone/social self-report, and quick reset tools.

Live: https://soulztek.github.io/adhdad/

- `npm install && npm run build` → `dist/` (Vite + React; `scripts/gen-sw.mjs` writes the service worker).
- `npm test` runs the never-miss-twice streak / rewards / pattern tests.
- Deploys to GitHub Pages via `.github/workflows/pages.yml` on push to `main`.
- Data stays on the device in localStorage (`adhdad-v1` and `adhdad-ui`). No backend, no tracking. Use More → Backup to export/import.
- Exercise demos: [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (Unlicense), built by `scripts/gen-demos.py`. Icons: `scripts/gen-icons.py`.
