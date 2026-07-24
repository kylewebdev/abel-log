# PRD / Technical Spec: Estate Sale Sold Item Log App

## 1. Product Summary

Build a lightweight web/mobile-friendly app for an estate sale business to log sold items for estate sale client reporting.

The app is not a POS system, not a payment processor, not inventory management, and not accounting software. It is a structured sold-item log that helps crews record items sold at or above the target reporting threshold, currently $25 and up, then allows management to clean up, categorize, review, and generate organized sale reports.

The real-world workflow must support both:

1. Paper-first logging during rush periods.
2. Direct app entry by power users when practical.

Most estate sales have a 2-hour rush at the beginning where paper notes are faster and more comfortable for some employees. After the rush, the checkout person or team can enter those handwritten notes into the app.

The app should preserve the speed of the current checkout workflow while creating clean, standardized reporting data for management and clients.

---

## 2. Core Problem

The estate sale business currently has multiple teams running estate sales. At checkout, employees are supposed to write down items that sold for $25 and up so the estate client can later receive an itemized report of higher-value sold items.

Problems today:

* Each crew has its own way of writing item descriptions.
* Notes are handwritten and inconsistent.
* Categories are not standardized.
* During rush periods, employees cannot slow down to use a complex app.
* Customers often buy multiple items in one transaction.
* Items may have pre-set prices, but prices can also be negotiated at checkout.
* The business uses a cash box and Square for payments, but this app should stay separate from the money/POS system.
* Management needs a cleaner, more standardized way to review and report what sold.

---

## 3. Goals

### Primary Goals

* Let teams quickly log sold items for an estate sale.
* Support paper-first workflows during busy periods.
* Let teams retroactively enter handwritten notes into the app.
* Require as little setup as possible before logging items.
* Let management review, clean up, categorize, and approve entries.
* Produce an organized sale view grouped by category and sorted highest to lowest.
* Keep archived entries in the database while excluding them from reports and analytics.
* Allow flexible team-specific wording while giving management a clean category system.

### Secondary Goals

* Let team phones create estate sale records on-site if management has not already created them.
* Support address autocomplete to reduce duplicate or inconsistent estate sale records.
* Learn team-specific terms and offer helpful suggestions over time.
* Allow future exports such as PDF, CSV, Excel, or copy/paste client summaries.

---

## 4. Non-Goals for V1

Do not build these in v1:

* POS integration.
* Square integration.
* Cash reconciliation.
* Customer records.
* Receipt/order tracking.
* Payment method tracking.
* Individual employee performance tracking.
* Required photo uploads.
* OCR/handwriting recognition.
* Full offline mode.
* Client portal.
* Complex analytics dashboard.
* Per-day report separation.

The first version should stay focused on logging and cleaning up sold item records.

---

## 5. Users and Roles

### 5.1 Team Device User

Each estate sale team will likely have a dedicated phone or device logged in as that team.

Example accounts:

* Team A
* Team B
* Team C
* Team D
* Team E

Employees are mostly fixed to their teams, but if someone calls out, employees from another team may help. Since the team phone is the main app access point, entries should be attributed to the team/device, not the individual employee.

Team users can:

* View all active estate sales.
* Create a new estate sale by entering only the address.
* Add sold item entries.
* Edit items submitted by their own team.
* Archive items submitted by their own team.
* Permanently delete items submitted by their own team.
* View their recently submitted items.

Team users cannot:

* Edit another team’s submitted items.
* Finalize reports.
* Edit global category rules.
* Restore archived entries unless explicitly allowed later.
* Manage users or teams.

### 5.2 Management User

Management users can:

* View all sales.
* Create and edit estate sale records.
* Edit any sold item entry.
* Archive and restore entries.
* Clean up item descriptions.
* Assign/report categories.
* Manage category aliases and suggestions.
* Review and approve entries.
* View grouped sale reports.
* Export reports later, if export features are added.

---

## 6. Core Workflow

### 6.1 Management-Created Sale Flow

1. Management creates an estate sale record before the team arrives.
2. Only address is required.
3. Optional fields may be filled out:

   * Sale name
   * Client name
   * Notes
   * Start date
   * End date
   * Assigned/default team
4. Status defaults to Active.
5. Team opens the active sale and begins adding items.

### 6.2 Team-Created Sale Flow

If the team arrives and the estate sale has not been created yet:

1. Team taps “New Estate Sale.”
2. Team enters/selects the address.
3. Team taps “Create.”
4. The sale is immediately created and opened.
5. Team can start entering sold items right away.

No other fields should block creation.

Required sale creation field:

* Address only.

Automatic defaults:

* Status: Active
* Created by: Current team/account
* Created at: Current timestamp
* Report threshold: 25
* Assigned/submitting team: Current team if created from a team login

Optional details can be filled in later.

### 6.3 Rush-Hour Paper Flow

During the opening rush, employees may use a paper sheet to jot down items.

Paper log should capture:

* Item or bundle sold
* Final sold price
* Optional team label/category/area
* Optional initials or notes

After the rush:

1. Team opens the app.
2. Selects the estate sale.
3. Taps “Batch Enter Paper Notes.”
4. Enters rows from the handwritten sheet.
5. Submits entries.
6. Entries go into the sale log.

### 6.4 Direct App Entry Flow

Power users can enter items directly during checkout.

The app should support a fast mobile entry screen:

* Current estate sale clearly displayed.
* Item description field.
* Final sold price field.
* Optional team label/category field.
* Save + Add Another button.
* Recent terms and category suggestions.
* Large tap targets for phone use.

---

## 7. Estate Sale Requirements

### 7.1 Estate Sale Identity

The address is the required and primary identifying field for an estate sale.

Sale name is optional and should only be a friendly label.

Examples:

Without sale name:

* 123 Main St, Sacramento, CA

With sale name:

* Johnson Estate
* 123 Main St, Sacramento, CA

### 7.2 Address Autocomplete

Use address autocomplete to reduce bad or duplicated addresses.

Preferred approach:

* Use Google Places Autocomplete or similar provider.
* Store the selected formatted address.
* Store structured address parts when available.
* Store a Google place ID or provider place ID when available.
* Store latitude/longitude if available.

Address autocomplete should help users select the right address, but manual address entry should still be possible in case autocomplete fails.

### 7.3 Duplicate Handling

When a user creates a new estate sale, check for an existing active estate sale with the same normalized address or place ID.

If a match exists, show a warning:

“An active estate sale already exists for this address. Open existing sale?”

The user should be able to open the existing sale instead of creating a duplicate.

Do not use sale name as the unique identifier.

---

## 8. Sold Item Requirements

### 8.1 Definition

One sold item or bundle equals one log entry.

Examples:

* Dining table, $250
* Brass lamp, $35
* Bundle of garden tools, $40
* Box of hand tools, $45
* Kitchen utensil bundle, $30

If multiple items are bought in a single checkout transaction, each reportable item or bundle is entered as its own row.

The app does not need to know the customer, transaction number, receipt number, cash/Square payment method, or POS details.

### 8.2 Price Rule

The business target is to log items sold for $25 and up.

However, the app should allow any price without warning or blocking.

Reason:

* Employees will be trained to focus on $25 and up.
* Management may want flexibility.
* Some under-$25 entries may still be useful.
* The report can default to only showing items at or above the threshold.

Default report threshold:

* $25

The threshold should be configurable per sale, but should default to 25.

### 8.3 Final Sold Price

Only the final sold price matters.

Do not track:

* Original tag price
* Negotiated discount
* Payment method
* Tax
* Fees
* Customer
* Receipt number

### 8.4 Bundles

Bundles should be logged as a single item entry.

Examples:

* Bundle of tools, $60
* Box of kitchen items, $35
* Lot of framed pictures, $75

Do not require bundle items to be broken apart.

### 8.5 Sale Report Groups

One estate sale may need multiple client-facing reports without duplicating the
sale record. Management can create color-coded report groups such as Blue,
Red, Sister, or Consignor A within the sale.

When active report groups exist:

* Each phone or browser chooses an active group for that sale.
* The choice persists on that device and sale until changed.
* Quick-entry and batch-entry items are tagged with the active group.
* A group must be selected before saving new items.
* An item’s group can be corrected from the item edit screen.
* Pausing a group removes it from new-entry selection but preserves all
  historical item assignments and reports.

Reports support:

* All items across the sale.
* One report group with its own item count and total.
* Unassigned items, including entries created before groups were enabled.
* The existing threshold and archived-item filters within any group view.

Existing items are not automatically assigned when report groups are added.

---

## 9. Category and Label Model

Categories are hard because each team/person has their own vocabulary. The app should support team-specific wording without letting reporting categories become messy.

Use two separate concepts:

### 9.1 Team Label

This is what the team typed naturally.

Examples:

* couch
* sofa
* garage stuff
* patio lot
* kitchen bundle
* picture
* wall art
* tools
* misc tools

This field is flexible and can be freeform.

### 9.2 Report Category

This is the cleaned-up category used for management and client reports.

Examples:

* Furniture
* Tools
* Outdoor / Garden
* Kitchen
* Art / Decor
* Collectibles
* Miscellaneous
* Bundle

Management controls report categories.

Teams should not be forced to pick a perfect report category during checkout.

### 9.3 Alias Learning

The app should learn team-specific terms and suggest them later.

Example:

Team A often types “garage stuff.”

Management maps “garage stuff” to “Tools” or “Garage.”

Next time Team A starts typing “garage,” the app can suggest:

* garage stuff → Tools

Important rule:

Do not automatically turn every typed word into a new report category.

Instead:

* Save team-entered labels.
* Track frequency.
* Let management approve aliases.
* Use approved aliases for cleaner suggestions.
* Keep report categories controlled.

---

## 10. Entry Status, Deletion, and Archiving

### 10.1 Deletion

Teams can permanently delete entries submitted by their own team while the sale remains assigned to them. Management can permanently delete any entry.

Deletion must always be authorized against the entry's submitting team, even if an entry from another team is visible.

Teams should also be able to archive their own entries.

Management should be able to archive and restore any entry.

### 10.2 Archived Behavior

Archived entries:

* Stay in the database.
* Are hidden from normal sale reports.
* Are excluded from analytics.
* Are excluded from client-facing views.
* Can be viewed through an Archived filter by management.
* Should retain who archived them and when.

Suggested fields:

* is_archived
* archived_at
* archived_by
* archive_reason optional

### 10.3 Review Status

Each item should have a review status.

Suggested statuses:

* Needs Review
* Approved

Optional future statuses:

* Flagged
* Needs Cleanup
* Excluded

For v1, `is_archived` and `review_status` can be separate fields.

---

## 11. Reporting Requirements

### 11.1 Default Sale Report View

The default report view should show:

* One estate sale at a time.
* Non-archived entries only.
* Items with final sold price at or above the sale’s report threshold, default $25.
* Grouped by report category.
* Sorted from largest to smallest within each category.

Example:

Furniture

| Item         | Price |
| ------------ | ----: |
| Dining table |  $250 |
| Couch        |  $150 |
| Accent chair |   $65 |

Tools

| Item                  | Price |
| --------------------- | ----: |
| Bundle of power tools |  $120 |
| Box of hand tools     |   $45 |

Art / Decor

| Item            | Price |
| --------------- | ----: |
| Framed painting |   $65 |
| Brass lamp      |   $35 |

### 11.2 Whole-Sale Reporting

Most estate sales run Friday through Sunday, usually three days.

For now, reporting should combine the full estate sale.

Do not separate reports by day in v1.

Still store created date/sold date internally for future flexibility.

### 11.3 Alternative Views

The app should eventually support alternate views, but v1 can be simple.

Possible views:

* Group by category.
* Sort all items by price high to low.
* Filter by team.
* Filter missing category.
* Filter needs review.
* Filter archived.
* Show under-threshold items.

### 11.4 Exports

Final export format is not committed yet.

Design the data model so future export options are easy:

* PDF
* CSV
* Excel
* Copy/paste client summary
* Email body

PDF export is not required in v1 unless explicitly added later.

---

## 12. Permissions

### 12.1 Team Permissions

Team users can:

* View all active sales.
* Create a sale by address.
* Add items to any active sale.
* Edit items submitted by their own team.
* Archive items submitted by their own team.
* Permanently delete items submitted by their own team.

Team users cannot:

* Edit items submitted by another team.
* Archive items submitted by another team.
* Permanently delete items submitted by another team.
* Restore archived entries unless allowed later.
* Manage categories globally.
* Approve/finalize client reports.

### 12.2 Management Permissions

Management users can:

* View all sales and entries.
* Create/edit/archive estate sales.
* Edit all item entries.
* Archive/restore all item entries.
* Permanently delete all item entries.
* Manage report categories.
* Manage category aliases.
* Review and approve entries.
* View reports.

---

## 13. Core Screens

### 13.1 Login Screen

Support login by:

* Team account
* Management account

Team phones will likely remain logged in.

### 13.2 Active Sales List

Show all active estate sales.

Each sale card should show:

* Sale name if present
* Address
* Status
* Optional team
* Number of active entries
* Number of entries needing review
* Button: Add Items
* Button: View Sale

Since teams can see all active sales for now, make the selected sale very clear.

### 13.3 New Estate Sale Screen

This screen must be extremely simple.

Required:

* Address

Optional expandable fields:

* Sale name
* Client name
* Notes
* Start date
* End date
* Assigned team
* Report threshold

Default behavior:

* Address is the only required field.
* Status defaults to Active.
* Created by is automatic.
* Created at is automatic.
* Report threshold defaults to 25.
* After create, open the item entry screen immediately.

### 13.4 Quick Item Entry Screen

Mobile-first.

Fields:

* Item description
* Final sold price
* Team label or category hint, optional
* Entry source, default can be Live App or Paper depending on flow

Buttons:

* Save
* Save + Add Another
* Cancel

The current sale should be shown in a large sticky header:

“Entering items for: 123 Main St, Sacramento”

If the sale has a sale name:

“Entering items for: Johnson Estate, 123 Main St”

### 13.5 Batch Paper Entry Screen

This should feel like a spreadsheet or repeated row form.

Columns:

* Item description
* Final sold price
* Team label, optional
* Notes, optional

Features:

* Add row
* Remove unsaved row
* Save all
* Keyboard-friendly tabbing on desktop/tablet
* Mobile-friendly row entry if on phone

Use case:

After the 2-hour rush, the checkout person enters handwritten notes quickly.

### 13.6 Team Recent Entries Screen

Teams should be able to see their own submitted entries.

They can:

* Edit their own active entries.
* Archive their own active entries.
* See archived status if they archived something.
* Not edit other teams’ entries.

### 13.7 Management Review Queue

Show entries that need cleanup.

Useful filters:

* Missing report category
* Missing or vague team label
* Needs review
* Recently added
* By sale
* By team
* Under threshold
* Archived

Management can:

* Edit description
* Assign report category
* Approve entry
* Archive entry
* Restore archived entry
* Map team label to report category

### 13.8 Sale Report View

Default grouped report:

* Group by report category.
* Sort highest to lowest within each category.
* Hide archived items.
* Default to threshold $25 and up.
* Allow toggle to show under-threshold items.
* Allow toggle to show uncategorized items.

---

## 14. Suggested Data Model

This is framework-agnostic. Adapt naming to the chosen stack.

### 14.1 users

For login accounts.

Fields:

* id
* name
* email or username
* password_hash or auth_provider_id
* role: team or management
* team_id nullable
* is_active
* created_at
* updated_at

### 14.2 teams

Fields:

* id
* name
* slug
* is_active
* created_at
* updated_at

Examples:

* Team A
* Team B
* Team C
* Team D
* Team E

### 14.3 estate_sales

Fields:

* id
* address_raw
* formatted_address
* normalized_address
* address_line_1
* address_line_2 nullable
* city nullable
* state nullable
* postal_code nullable
* country nullable
* google_place_id nullable
* latitude nullable
* longitude nullable
* sale_name nullable
* client_name nullable
* notes nullable
* status default active
* report_threshold default 25
* start_date nullable
* end_date nullable
* assigned_team_id nullable
* created_by_user_id
* created_by_team_id nullable
* created_at
* updated_at
* archived_at nullable

Status values:

* active
* completed
* archived

Only address should be required from the user during creation.

### 14.4 sold_items

Fields:

* id
* estate_sale_id
* submitted_team_id
* created_by_user_id
* item_description
* final_sold_price
* team_label nullable
* report_category_id nullable
* entry_source nullable
* review_status default needs_review
* is_archived default false
* archived_at nullable
* archived_by_user_id nullable
* archive_reason nullable
* sold_date nullable
* created_at
* updated_at

Entry source values:

* paper
* live_app
* management
* other

Review status values:

* needs_review
* approved

### 14.5 report_categories

Fields:

* id
* name
* slug
* sort_order nullable
* is_active default true
* created_at
* updated_at

Initial seed categories can be adjusted later.

Possible seed categories:

* Furniture
* Tools
* Outdoor / Garden
* Kitchen
* Art / Decor
* Jewelry
* Electronics
* Appliances
* Collectibles
* Clothing
* Books / Media
* Garage
* Bundle
* Miscellaneous

### 14.6 category_aliases

Used to map team-specific terms to management-approved report categories.

Fields:

* id
* alias_text
* normalized_alias_text
* report_category_id
* team_id nullable
* scope: global or team
* is_approved default false
* usage_count default 0
* created_by_user_id nullable
* approved_by_user_id nullable
* approved_at nullable
* created_at
* updated_at

Examples:

* alias_text: couch

* report_category: Furniture

* scope: global

* alias_text: garage stuff

* report_category: Tools

* team_id: Team A

* scope: team

### 14.7 activity_logs optional but recommended

Fields:

* id
* actor_user_id
* actor_team_id nullable
* entity_type
* entity_id
* action
* before_json nullable
* after_json nullable
* created_at

Useful for auditing edits, archives, restores, and category cleanup.

---

## 15. Business Rules

### 15.1 Estate Sale Creation

* Address is required.
* All other fields are optional.
* Status defaults to active.
* Created by is automatic.
* Created team is automatic if a team account creates it.
* Report threshold defaults to 25.
* After creation, redirect to item entry.

### 15.2 Estate Sale Duplicate Detection

* If google_place_id exists, check for active sale with same google_place_id.
* If no google_place_id, check normalized_address.
* If an active duplicate is found, prompt user to open existing sale.
* Do not block historical/completed/archived sale reuse unless intentionally configured.

### 15.3 Item Entry

* Item description is required.
* Final sold price is required.
* Price can be under 25.
* Team label is optional.
* Report category is optional.
* Submitted team is automatic based on user/team account.
* Entry status starts as needs_review.
* Entry is not archived by default.

### 15.4 Editing

Team users:

* Can edit entries where submitted_team_id equals their team ID.
* Cannot edit other team entries.

Management users:

* Can edit all entries.

### 15.5 Archiving

Team users:

* Can archive their own team’s entries.

Management users:

* Can archive and restore all entries.

Archived entries:

* Excluded from default reports.
* Excluded from analytics.
* Kept in database.
* Visible through archive filters.

### 15.6 Deletion

Team users:

* Can permanently delete their own team's entries while the sale is assigned to their team.
* Cannot permanently delete another team's entries.

Management users:

* Can permanently delete all entries.

### 15.7 Reporting

Default report filters:

* estate_sale_id equals selected sale
* is_archived equals false
* final_sold_price greater than or equal to report_threshold
* group by report category
* sort by final_sold_price descending within each category

Uncategorized items should be shown under “Uncategorized” until management assigns categories.

---

## 16. UX Requirements

### 16.1 Speed Over Completeness

Do not force teams to fill out unnecessary fields.

The app must support fast entry, especially on a phone.

### 16.2 Clear Current Sale Context

Because all teams can see all active sales, the current selected sale must be very obvious.

Every item entry screen should display:

* Sale name if present
* Address
* Team submitting entries

### 16.3 Avoid Wrong-Sale Entries

When switching sales, consider showing a confirmation or clear visual transition.

Example:

“You are switching from 123 Main St to 456 Oak Ave.”

### 16.4 Mobile First

Team devices are likely dedicated phones.

Prioritize:

* Large buttons
* Simple screens
* Minimal typing
* Autocomplete
* Save + Add Another
* Sticky current sale header

### 16.5 Management Can Be More Detailed

Management screens can be denser and more table-like.

Prioritize:

* Filters
* Inline editing
* Review queue
* Category cleanup
* Report preview

---

## 17. Suggested API / Route Structure

Adapt as needed to the chosen framework.

### Auth

* POST /login
* POST /logout
* GET /me

### Estate Sales

* GET /estate-sales?status=active
* POST /estate-sales
* GET /estate-sales/:id
* PATCH /estate-sales/:id
* POST /estate-sales/:id/archive
* POST /estate-sales/:id/restore

### Sold Items

* GET /estate-sales/:id/items
* POST /estate-sales/:id/items
* POST /estate-sales/:id/items/batch
* PATCH /sold-items/:id
* POST /sold-items/:id/archive
* POST /sold-items/:id/restore

### Reports

* GET /estate-sales/:id/report
* GET /estate-sales/:id/report?include_under_threshold=true
* GET /estate-sales/:id/report?include_archived=true

### Categories

* GET /report-categories
* POST /report-categories
* PATCH /report-categories/:id

### Aliases and Suggestions

* GET /category-suggestions?q=garage&team_id=123
* POST /category-aliases
* PATCH /category-aliases/:id
* POST /category-aliases/:id/approve

---

## 18. Acceptance Criteria

### Estate Sale Creation

* A team user can create a new estate sale with only an address.
* Status defaults to active.
* Created by is automatically recorded.
* Report threshold defaults to 25.
* After creating the sale, the user is taken to item entry.
* Sale name, dates, notes, and client name are optional.
* Duplicate active addresses produce a warning or prompt to open the existing sale.

### Item Entry

* A team user can add an item with only description and price.
* The app allows prices under 25 without warning.
* Team label/category hint is optional.
* The submitted team is automatically recorded.
* The entry starts as needs review.
* The user can save and immediately add another item.

### Batch Entry

* A team user can enter multiple handwritten note rows at once.
* Each row supports description, price, and optional label.
* Saved rows become sold item entries tied to the selected estate sale.
* The submitting team is recorded for each row.

### Team Editing

* A team user can edit their own team’s entries.
* A team user cannot edit another team’s entries.
* A team user can archive their own entries.
* A team user can permanently delete their own entries.
* A team user cannot permanently delete another team’s entries.

### Management Review

* A management user can view entries from all teams.
* A management user can edit all entries.
* A management user can assign report categories.
* A management user can archive and restore entries.
* A management user can approve entries.

### Reporting

* The report view excludes archived entries by default.
* The report view defaults to showing items at or above the sale threshold.
* The report groups entries by report category.
* Entries within each category are sorted highest to lowest by final sold price.
* Uncategorized entries appear under an Uncategorized group.
* The report combines the whole estate sale and does not require day-by-day separation.

---

## 19. V1 Build Scope

Build:

1. Authentication for team and management accounts.
2. Teams table and team login support.
3. Active estate sale list.
4. New estate sale creation with address-only required.
5. Address autocomplete/provider abstraction if practical.
6. Duplicate active address detection.
7. Quick item entry.
8. Batch paper-note entry.
9. Team-only editing permissions.
10. Team-owned archiving and deletion.
11. Management review queue.
12. Report categories.
13. Team label and alias structure.
14. Grouped sale report view.
15. Basic responsive/mobile-first UI.

Do not build in v1 unless time allows:

* PDF export
* OCR
* Square/POS integration
* Photos
* Offline mode
* Individual employee accounts
* Client portal
* Advanced analytics

---

## 20. Future Enhancements

Potential v2/v3 features:

* PDF export.
* CSV/Excel export.
* AI cleanup suggestions for vague item descriptions.
* OCR-assisted entry from handwritten paper sheets.
* Photo upload for high-value items.
* Per-day report filtering.
* More advanced analytics.
* Team performance dashboard.
* Client-facing report portal.
* Square integration if the business later wants POS reconciliation.
* Offline-capable progressive web app behavior.
* Push reminders after opening rush to enter paper notes.

---

## 21. Suggested Implementation Notes for Coding Agent

Build the app with a simple, reliable architecture.

Important priorities:

1. Do not overbuild the POS side. This is only a sold-item logging/reporting app.
2. Make sale creation extremely fast: address only.
3. Make mobile item entry fast enough for a checkout environment.
4. Make paper-to-app batch entry efficient.
5. Preserve team-specific vocabulary while giving management clean report categories.
6. Use archiving instead of deletion.
7. Make permissions strict:

   * Teams edit/archive only their own entries.
   * Management controls all entries and reporting.
8. Treat address as the main estate sale identity.
9. Keep reports focused on the whole sale, not per-day details.
10. Store enough metadata to support future reporting and cleanup without forcing extra fields on users now.

The app should optimize for real estate sale conditions: rushed checkout, mixed tech comfort levels, multiple teams, inconsistent handwritten notes, and management needing a clean final report.
