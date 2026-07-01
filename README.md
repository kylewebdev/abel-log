# Estate Sale Sold Item Log

Working MVP for the estate sale sold-item logging workflow described in `PRD.md`.

This is a small internal business app built with Next.js App Router, TypeScript, Tailwind, shadcn-style local UI primitives, Prisma, and SQLite for local development. The Prisma schema keeps the data model portable for a later move to Postgres or a hosted database.

## What Is Built

- Team and management login using seeded local accounts.
- Five seeded teams: Team A, Team B, Team C, Team D, and Team E.
- Address-first estate sale creation with Active status and $25 report threshold defaults.
- Active sales list for team and management users.
- Quick sold-item entry for one item at a time.
- Batch paper-note entry for rush-hour handwritten sheets.
- Team ownership permissions: teams edit/archive only their own active entries.
- Management permissions: edit, archive, restore, categorize, approve, and review all entries.
- Report categories and approved category aliases.
- Management review queue for missing categories, needs-review entries, under-threshold entries, recent entries, and archived visibility.
- Grouped sale report view that defaults to non-archived items at or above the sale threshold, grouped by report category and sorted by price.

## Not In This MVP

Square integration, POS features, payment tracking, customer tracking, OCR, photos, full offline mode, client portal, exports, and advanced analytics are intentionally left out.

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create the local environment file:

   ```bash
   cp .env.example .env
   ```

3. Create and migrate the SQLite database:

   ```bash
   npm run db:migrate
   ```

4. Seed sample data:

   ```bash
   npm run db:seed
   ```

5. Start the development server:

   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000).

## Seeded Logins

All seeded accounts use the password `password`.

- Management: `management`
- Team users: `team-a`, `team-b`, `team-c`, `team-d`, `team-e`

## Useful Commands

```bash
npm run dev          # Start the local Next.js app
npm run db:migrate   # Prepare SQLite and apply Prisma migrations
npm run db:seed      # Seed teams, users, categories, aliases, and sample data
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript checks
npm run build        # Generate Prisma Client and build the app
```

The local SQLite database is `prisma/dev.db` and is ignored by git.

## Core Workflow

Team-created sale flow:

1. Log in as a team user.
2. Go to `New Estate Sale`.
3. Enter only an address.
4. Create the sale.
5. Start adding items immediately.

Paper-note flow:

1. Open an active sale.
2. Choose `Batch Paper`.
3. Enter handwritten rows with description, price, optional label, and optional notes.
4. Save all rows.

Management cleanup flow:

1. Log in as `management`.
2. Open `Review`.
3. Filter by missing category, needs review, archived, under threshold, or recent.
4. Assign categories, approve entries, archive/restore rows, or save team-specific aliases.
5. Open a sale report to review grouped output.
