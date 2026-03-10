# Poker Tracker PWA — Build Spec

## Overview
Rebuild the Android "Poker Ledger" app as a Progressive Web App (PWA). Must import the existing SQLite database (830 sessions of real data). Mobile-first, installable, works offline.

## Tech Stack
- **Frontend:** React + TypeScript + Vite
- **UI:** Tailwind CSS (mobile-first, teal/dark-teal theme matching original app)
- **Storage:** IndexedDB via Dexie.js (client-side, offline-capable)
- **Charts:** Chart.js or Recharts (profit over time line chart, profit by day bar chart)
- **DB Import:** sql.js (SQLite compiled to WASM) for reading the .db file on import
- **PWA:** vite-plugin-pwa for service worker + manifest

## Color Scheme (match original)
- Primary: Teal (#00796B or similar Material teal)
- App bar: Dark teal with white text
- Section headers: Light mint/pale teal background, black bold text
- Positive values: Green (#2E7D32)
- Negative values: Red (#D32F2F), displayed in parentheses e.g. ($1.91)
- Background: White
- Dividers: Light gray

## Database Schema (from original SQLite)

### sessions
- session_id INTEGER PK
- start INTEGER (unix ms)
- end INTEGER (unix ms)
- buy_in REAL
- cash_out REAL
- game INTEGER (FK → games.game_id)
- game_format INTEGER (FK → game_formats.game_format_id)
- location INTEGER (FK → locations.location_id)
- state INTEGER (0 = completed, 1 = active/in-progress)
- filtered INTEGER

### cash (links session to blinds for cash games)
- session_id INTEGER (FK → sessions)
- blinds INTEGER (FK → blinds.blind_id)

### games
- game_id INTEGER PK
- game VARCHAR(40) — e.g. "No Limit Hold'em", "Pot Limit Omaha"
- filtered INTEGER

### locations
- location_id INTEGER PK
- location VARCHAR(40) — e.g. "DP", "HP", "MGM Springfield"
- filtered INTEGER

### blinds
- blind_id INTEGER PK
- sb REAL
- bb REAL
- straddle REAL
- bring_in REAL
- ante REAL
- per_point REAL
- filtered INTEGER

### game_formats
- game_format_id INTEGER PK
- game_format VARCHAR(50) — e.g. "Full Ring"
- base_format INTEGER (FK → base_formats)
- filtered INTEGER

### base_formats
- base_format_id INTEGER PK
- base_format VARCHAR(20) — "Cash Game" or "Tournament"

### tournament
- session_id INTEGER
- entrants INTEGER
- placed INTEGER

### breaks
- break_id INTEGER PK
- session_id INTEGER
- start INTEGER (unix ms)
- end INTEGER (unix ms)

### notes
- note_id INTEGER PK
- session_id INTEGER
- note TEXT

## Existing Data
- 830 sessions (793 completed, some active/filtered)
- 15 locations: HP, PX, ML, DP, MGM, DD, BG, Oceans, SH, Joe, Jax, PL, Tch Spring, Horseshoe Baltimore, MGM Springfield
- 3 games: No Limit Hold'em, Pot Limit Omaha, Pot Limit Omaha HiLo
- 8 blind levels: $1/$2, $2/$5, $1/$3, $10/$10, $10/$10/$20, $5/$10, $2/$2, $5/$5
- 2 base formats: Cash Game, Tournament
- 58 breaks across sessions
- 5 notes
- Total profit: ~$221K over ~4,958 hours ($44.54/hr)

## Screens

### 1. Dashboard (Home)
- **Active Games** section: shows any in-progress sessions with location, game type, current buy-in, running timer
- **Overview** section: Total Profit, Time Played, Hourly Wage
- **Best Results** section: Best Game (by hourly rate), Best Location (by hourly rate)
- **Breakdown** section: Hierarchical tree — Format > Game Type > Blinds, each showing $/hr × hours

### 2. New/Edit Session
- Buy In (number input)
- Location (dropdown with "+" to add new)
- Game (dropdown with "+" to add new)
- Game Format (dropdown with "+" to add new)
- Blinds (dropdown with "+" to add new)
- Start Time (date + time picker, defaults to now)
- Save button
- For active sessions: End Session button that prompts for cash_out

### 3. History
- **Summary** bar: Profit, Time Played, Hourly Wage (for filtered period)
- **Period selector**: Weekly / Monthly / Yearly / All with < > navigation
- **Session list**: Each row shows Location, Blinds+Game, Date, Duration, Profit/Loss
- Tap a session to view/edit details

### 4. Graphs
- **Profit Over Time**: Cumulative line chart (x=hours, y=dollars)
- **Profit By Day of Week**: Bar chart (Sun-Sat)

### 5. Filters
- Checkboxes for: Locations, Games, Game Formats, Blinds
- Save button applies filters to all views
- All checked by default

### 6. Notes
- List of session notes
- Add/edit notes per session

### 7. Settings
- Manage Locations (add/edit/delete/set default)
- Manage Games (add/edit/delete/set default)
- Manage Game Formats (add/edit/delete/set default)
- Manage Blinds (add/edit/delete/set default)
- Import SQLite DB (.db file upload — reads with sql.js, converts to IndexedDB)
- Export CSV
- Export/Import JSON backup

## Import Flow (Critical)
1. User clicks "Import Database" in Settings
2. File picker opens, user selects the .db SQLite file
3. App uses sql.js (WASM) to read the SQLite file in-browser
4. Parses all tables and inserts into IndexedDB via Dexie
5. Shows import summary (X sessions, X locations, etc.)
6. Redirects to Dashboard

## Key Behaviors
- Timestamps stored as unix milliseconds (matching original)
- Duration = (end - start) minus sum of break durations for that session
- Profit = cash_out - buy_in
- Hourly = profit / hours
- Negative values shown in red with parentheses: ($500)
- Blinds displayed as "$sb/$bb" or "$sb/$bb/$straddle" if straddle > 0
- Active game shows running timer that updates every second
- All calculations respect active filters

## PWA Requirements
- Installable (manifest.json with app name, icons, theme color)
- Offline-capable (service worker caches app shell)
- All data stored locally in IndexedDB
- No backend/server required — 100% client-side

## File Structure
```
poker-tracker/
├── pokerledger.db          # Original SQLite (for reference/import testing)
├── SPEC.md                 # This file
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html
├── public/
│   └── manifest.json
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── db/                 # Dexie database setup + import logic
    ├── components/         # React components
    ├── pages/              # Dashboard, History, Graphs, Filters, Settings
    ├── hooks/              # Custom hooks for data queries
    ├── utils/              # Formatters, calculators
    └── styles/             # Tailwind config
```

## Priority Order
1. Database layer (Dexie schema + SQLite import)
2. Dashboard with overview stats
3. History view with period navigation
4. New/Edit session form
5. Graphs
6. Filters
7. Settings + export
8. PWA manifest + service worker
9. Active game timer
