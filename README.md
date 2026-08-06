# Estate Sale Sold Item Log

Working MVP for the estate sale sold-item logging workflow described in `PRD.md`.

This is a small internal business app built with Next.js App Router, TypeScript, Tailwind, shadcn-style local UI primitives, Prisma, and PostgreSQL.

## What Is Built

- Team and management login using seeded local accounts.
- Five seeded teams: Team A, Team B, Team C, Team D, and Team E.
- Address-first estate sale creation with Active status and $25 report threshold defaults.
- Date-sorted sales list, with ended sales separated below current/upcoming sales.
- Team-owned estate sales: team-created sales are assigned to that team; management can assign any active team.
- Quick sold-item entry for one item at a time.
- Batch paper-note entry for rush-hour handwritten sheets.
- Sale-specific, color-coded report groups with a sticky per-device selection
  for quick and batch entry.
- Team ownership permissions: teams access assigned sales and edit, archive, or delete only entries originally submitted by their team.
- Management permissions: assign teams, edit sales, restore entries, and permanently delete entries across all teams.
- Entries can be edited, archived, restored by management, or permanently deleted.
- Flat itemized sale report that defaults to non-archived items at or above the
  sale threshold, can be filtered to one report group or unassigned items, and
  is sorted by price.
- Basecamp Signed-column automation that idempotently creates a sale and an
  estate-sale project, grants the lead access, links the Sale Sheet, and
  completes the sale-created milestone.

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

3. Create a local PostgreSQL database named `abel_log`, then apply migrations:

   ```bash
   npm run db:migrate
   ```

4. To create disposable local demo data, set `ENABLE_DEMO_SEED=true` in
   `.env`, then run:

   ```bash
   npm run db:seed
   ```

5. Start the development server:

   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000).

## Demo Logins

The seed creates `management` and `team-a` through `team-e`. It generates a
random password for each newly created account and prints those passwords once.
You may instead configure the optional `SEED_PASSWORD_*` values shown in
`.env.example`; configured passwords must contain at least 12 characters.

The seed never changes passwords or reactivates existing accounts, refuses to
run without the explicit demo flag, and refuses to run in production.

## Useful Commands

```bash
npm run dev          # Start the local Next.js app
npm test             # Run authorization and business-rule tests
npm run db:migrate   # Apply migrations to the configured PostgreSQL database
npm run db:seed      # Seed disposable local demo data (explicit opt-in required)
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript checks
npm run build        # Generate Prisma Client and build the app
```

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

## Basecamp Setup

1. Apply the Prisma migrations and configure the `BASECAMP_*` values documented
   in `.env.example`. The actor must be an active management user.
2. Register the OAuth redirect URI exactly as
   `https://log.abeliquidators.com/oauth/basecamp/callback`.
3. Sign in to Abel Log as management and open `/oauth/basecamp` once to store
   the Basecamp refresh token server-side.
4. Register a `Kanban::Card` webhook on Basecamp project `48401748` pointing to
   `https://log.abeliquidators.com/hooks/basecamp?token=<BASECAMP_WEBHOOK_TOKEN>`.

The receiver acknowledges relevant events with HTTP 202, stores the card before
responding, and performs the Basecamp work after the response. The unique card
mapping prevents retries or repeated moves into Signed from creating duplicate
sales or projects. Partial failures are retained as `NEEDS_ATTENTION` and retry
from their last durable construction/project state if Basecamp delivers the card
again.

### Website lead intake

`POST /hooks/intake` creates a new card in the Triage column of the Basecamp
`Estate Consults & Leads` project. It is a server-to-server endpoint; do not call
it from browser code or expose its token in a `NEXT_PUBLIC_` variable.

Configure a long random `INTAKE_WEBHOOK_TOKEN` in Abel Log, and store the same
value as `ABEL_LOG_INTAKE_TOKEN` in the main website's server-side environment.
The website sends:

```http
Authorization: Bearer <ABEL_LOG_INTAKE_TOKEN>
Content-Type: application/json
```

```json
{
  "submissionId": "a-unique-id-for-this-form-submission",
  "name": "Jane Smith",
  "phone": "555-0100",
  "email": "jane@example.com",
  "propertyAddress": "123 Main St",
  "city": "Sacramento",
  "situation": "downsizing",
  "contactMethod": "phone",
  "description": "Looking for help with an estate sale."
}
```

`submissionId`, `name`, `email`, and `description` are required. Snake-case
`submission_id`, `property_address`, and `contact_method` aliases are also
accepted. Reusing a submission ID with the same data returns the existing card;
reusing it with different data is rejected. Intake records that encounter an
uncertain Basecamp failure are held for manual attention instead of retrying and
risking a duplicate card.

Report-group workflow:

1. Management opens a sale’s `Edit details` tab and creates the needed
   color-coded report groups.
2. Each entry device chooses its active group once for that sale.
3. Quick-entry and batch-entry items stay tagged with that group until the
   device switches it.
4. Open the report and choose `All items`, a specific group, or `Unassigned`.
5. Edit an item to correct its report group if it was logged under the wrong
   one.
