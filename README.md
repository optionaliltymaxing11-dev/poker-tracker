# Poker Tracker PWA

A mobile-first Progressive Web App for tracking live poker sessions. Built with React, TypeScript, Tailwind CSS, and Dexie.js (IndexedDB). Installable, works offline, and runs entirely in the browser — no server or account needed.

## 🔗 Links

| URL | What it is |
|-----|-----------|
| **[Live App](https://optionaliltymaxing11-dev.github.io/poker-tracker/)** | The real app. Opens with an empty database — import your own data via Settings, or start logging sessions manually. All data stays in your browser's IndexedDB. |
| **[Demo Mode](https://optionaliltymaxing11-dev.github.io/poker-tracker/?demo=true)** | Same app, loaded with ~7 years of realistic fake session data (~830 sessions, $1M+ profit). Great for exploring the UI, graphs, and filters without entering anything. Append `?demo=true` to any page URL to activate. |

## Features

- **Session Tracking** — Start live sessions with a running timer, or add completed past sessions manually
- **Pause/Resume** — Pause active sessions (tracks breaks separately), resume when ready
- **Session History** — View, edit, and delete past sessions with color-coded hourly rates
- **6 Analytics Graphs:**
  1. Cumulative Profit Over Time
  2. Session Heatmap Calendar (GitHub-style)
  3. Rolling Hourly Rate by Stake (toggleable per stake)
  4. Session Length vs Hourly Rate (scatter/bar toggle with stake filter)
  5. Downswing/Upswing Tracker
  6. Location Comparison (horizontal bars, 5+ session minimum)
- **Filters** — Filter by date range, location, game type, and stakes
- **8 Color Themes** — Teal Classic, Ocean Blue, Slate, Dark Mode, Midnight, AMOLED Black, Matrix, Neon Cyber
- **Google Drive Backup** — Sign in with Google for automatic daily backups (7-day daily retention + monthly snapshots)
- **Local Backup** — Download/restore JSON backups manually
- **SQLite Import** — Import an existing Poker Ledger `.db` file via Settings
- **PWA** — Installable on any device, works offline via service worker

## Tech Stack

- React 19 + TypeScript
- Vite 7
- Tailwind CSS v4
- Dexie.js (IndexedDB)
- sql.js (WASM SQLite for .db import)
- Recharts
- vite-plugin-pwa + Workbox

## Development

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

## License

MIT
