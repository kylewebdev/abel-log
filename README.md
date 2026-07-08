# Estate Sale Sold Item Log

Working MVP for the estate sale sold-item logging workflow described in `PRD.md`.

This is a small internal business app built with Next.js App Router, TypeScript, Tailwind, shadcn-style local UI primitives, Prisma, and SQLite for local development. The Prisma schema keeps the data model portable for a later move to Postgres or a hosted database.

## What Is Built

- Team and management login using seeded local accounts.
- Five seeded teams: Team A, Team B, Team C, Team D, and Team E.
- Address-first estate sale creation with Active status and $25 report threshold defaults.
- Date-sorted sales list, with ended sales separated below current/upcoming sales.
- Team-owned estate sales: team-created sales are assigned to that team; management can assign any active team.
- Quick sold-item entry for one item at a time.
- Batch paper-note entry for rush-hour handwritten sheets.
- Team ownership permissions: teams see and edit entries only for sales assigned to their team.
- Management permissions: assign teams, edit sales, and manage entries across all teams.
- Entries can be edited, archived, restored by management, or permanently deleted.
- Flat itemized sale report that defaults to non-archived items at or above the sale threshold, sorted by price.

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

Seeded accounts use phone-friendly passwords with `916abel` as the shared
prefix. ABEL stands for Attic to Basement Estate Liquidators.

| Account | Username | Password |
| --- | --- | --- |
| Management | `management` | `916abel0000` |
| Team A | `team-a` | `916abel1111` |
| Team B | `team-b` | `916abel2222` |
| Team C | `team-c` | `916abel3333` |
| Team D | `team-d` | `916abel4444` |
| Team E | `team-e` | `916abel5555` |

## Useful Commands

```bash
npm run dev          # Start the local Next.js app
npm run db:migrate   # Prepare SQLite and apply Prisma migrations
npm run db:seed      # Seed teams, users, and sample sale data
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
3. Enter handwritten rows with item or bundle description and price.
4. Save all rows.

Management workflow:

1. Log in as `management`.
2. Open any sale.
3. Edit sale details, assign teams, or update item descriptions and prices.
4. Archive, restore, or permanently delete entries as needed.
5. Open a sale report to check the client-facing itemized output.
