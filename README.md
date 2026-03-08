# Sheets Lite

Lightweight, real-time, collaborative spreadsheet — Google Sheets stripped to its bones.

**Stack:** Next.js 16 (App Router) · TypeScript (strict) · Tailwind CSS · Firebase Auth + Firestore

## Features

### Core
- **Document dashboard** — Create, list, delete spreadsheets with title, owner, and relative timestamps
- **Editable grid** — 100 rows × 26 columns (A-Z), scrollable, click-to-select, double-click-to-edit
- **Formula engine** — Recursive-descent parser supporting `=SUM(A1:A10)`, arithmetic (`+`, `-`, `*`, `/`), parentheses, and cell references
- **Real-time sync** — Firestore `onSnapshot` propagates changes to all open sessions within ~100ms
- **Write-state indicator** — Green (saved) / yellow (pending) dot using Firestore metadata
- **Presence** — See who else is viewing the document with colored avatars; remote cursors highlighted on cells
- **Identity** — Google sign-in or anonymous guest login with custom display name; color persists per user

### Bonus
- **Cell formatting** — Bold, italic, text color per cell (persisted)
- **Column/row resize** — Drag edge of headers to resize; widths/heights stored in Firestore
- **Column reorder** — Drag-and-drop column headers to rearrange
- **Keyboard navigation** — Arrow keys, Tab/Shift+Tab, Enter to edit, Escape to cancel, type to start editing
- **Export** — Download as CSV or Excel (.xlsx)

## Architecture

```
src/
├── app/
│   ├── layout.tsx          # Root layout with AuthProvider
│   ├── page.tsx            # Dashboard (doc list)
│   ├── login/page.tsx      # Auth page
│   └── doc/[id]/page.tsx   # Editor route
├── components/
│   ├── SpreadsheetEditor.tsx  # Main editor (state, grid, keyboard)
│   ├── Toolbar.tsx            # Format buttons, export
│   ├── FormulaBar.tsx         # Shows active cell + formula
│   ├── PresenceBar.tsx        # Active user avatars
│   └── SyncIndicator.tsx      # Write-state dot
├── contexts/
│   └── AuthContext.tsx      # Firebase Auth state
└── lib/
    ├── firebase.ts          # App init
    ├── firestore.ts         # All Firestore reads/writes
    ├── formula.ts           # Formula parser + evaluator
    ├── types.ts             # TypeScript interfaces
    ├── colors.ts            # Deterministic user colors
    └── utils.ts             # cn() classname helper
```

### Data model (Firestore)
```
documents/{docId}
  title, ownerId, ownerName, createdAt, updatedAt
  grid: { "A1": { value, formula?, format? }, ... }   # sparse — only non-empty cells
  columnOrder: ["A", "B", ...]
  colWidths: { "A": 120, ... }
  rowHeights: { "1": 48, ... }

documents/{docId}/presence/{userId}
  displayName, color, activeCell, lastSeen
```

### Conflict strategy
Each cell edit is an atomic Firestore field update (`grid.A1`). **Last-write-wins at cell granularity** — acceptable because simultaneous edits to the *same* cell are rare in practice. Firestore's `onSnapshot` with `includeMetadataChanges` drives the sync indicator.

Presence uses a subcollection with 10-second heartbeat; entries older than 30 seconds are filtered on read.

### Design decisions
| Decision | Rationale |
|----------|-----------|
| Flat cell map instead of 2D array | Sparse storage — only non-empty cells consume Firestore reads/writes |
| No virtualization | 100×26 = 2,600 cells is well within DOM performance budgets |
| Recursive-descent parser (not eval) | Safe, extensible, ~150 LOC. No code injection risk |
| No undo/redo | Adds significant state complexity; out of scope for "stripped to bones" |
| No offline-first | Firestore has basic offline support; explicit offline UX is out of scope |
| No permissions model | All authenticated users can access all documents — keeps scope minimal |

## Setup

### Prerequisites
- Node.js 18+
- A Firebase project with **Authentication** (Google + Anonymous providers enabled) and **Firestore**

### Install & run

```bash
git clone <repo-url> && cd trademarkia-front-end-task
npm install
cp .env.example .env.local
# Fill in your Firebase config values in .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Firestore rules (minimal, for dev)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /documents/{docId} {
      allow read, write: if request.auth != null;
      match /presence/{userId} {
        allow read, write: if request.auth != null;
      }
    }
  }
}
```

### Deploy to Vercel

```bash
npm run build   # verify locally first
vercel --prod   # or connect via Vercel dashboard
```

Set the same env variables from `.env.local` in Vercel's project settings.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build (strict TS, no errors) |
| `npm run start` | Start production server |
| `npm run lint` | ESLint check |
