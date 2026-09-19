# AirproX CRM API – Leads, Lookups, Locations, Team

Base path: `/api/v1/airpropx`. Login, logout, `/auth/me` and the dashboard are documented in `AuthDashboardApi.md`.

Every endpoint except `GET /health` needs the login cookie. Most are open to both roles, **Sales Director** and **Franchise Sales Manager**; the table says when a route is for one role only.

| Response | When |
|---|---|
| 401 `Authentication required` | No or invalid session |
| 403 `You do not have permission to access this resource` | Route is for the other role |
| 403 `You do not have access to this action` | The role's `airpropx_franchise_crm_role_access` flag is `N` (`can_add_lead`, `can_edit_lead`, `can_import_leads`, `can_change_franchise_type`) |
| 400 | Invalid input. `message` holds the first problem; form endpoints also return `errors: { field: [messages] }` |
| 404 | Record not found or outside the user's scope (never 403, so other people's records are not revealed) |
| 409 | Duplicate lead mobile number |
| 500 / 503 | Server error / database unavailable (no internal details) |

Write requests need `Content-Type: application/json`.

## Which leads a user sees

Leads come from `airpropx_franchise_leads`: not deleted, `status <> 'Inactive'`. Which ones a user sees depends on the role's `lead_scope`:

| lead_scope | Sales Director | Franchise Sales Manager |
|---|---|---|
| OWN | Leads assigned to them, plus unassigned leads of their franchise types | Unassigned leads of their franchise types |
| FRANCHISE_TYPES | All leads of their franchise types | All leads of their franchise types |
| ALL | All leads | All leads |

Leads can be assigned only to Sales Directors (`sales_director_id` is a foreign key to `airpropx_sales_directors`):
- **Adding or importing:** a lead added or imported by a Sales Director is assigned to them. One added by a Franchise Sales Manager stays unassigned, so both they and the Sales Director of that franchise type see it.
- **Activities:** a Sales Director who records an activity on an unassigned lead takes it over.

A lead's status is the future status of its current history row (`airpropx_franchise_lead_status_history.is_current = 'Y'`). A lead with no history yet is at the entry status (`is_entry_status = 'Y'`). Status ids, codes and allowed moves come from `airpropx_franchise_status_types` and `airpropx_franchise_status_transitions`; nothing is hardcoded.

---

## Endpoints

| Method | Path | Roles | Purpose |
|---|---|---|---|
| GET | `/health` | public | Uptime + database check → `{ time }` |
| GET | `/lookups` | both | Dropdown data: `franchiseTypes`, `sources`, `statuses`, `modules`, `assignees`, `dropoutReasons`, `permissions` |
| GET | `/lead-statuses` | both | Status flow: each Active status with `isEntryStatus`, `requiresDropoutReason`, `isTerminal`, `next[]` |
| GET | `/leads` | both | Lead list (filters below) |
| POST | `/leads` | both | Add a lead |
| POST | `/leads/import` | both | Import rows (needs `can_import_leads`) |
| GET | `/leads/:id` | both | Lead details + `history`, `dropouts`, `transfers`, `permissions.canEdit` |
| PUT | `/leads/:id` | both | Edit contact details, source and comments |
| GET | `/leads/:id/next-activity` | both | Current status, allowed next statuses, dropout reasons, `canChangeFranchiseType` |
| POST | `/leads/:id/activity` | both | Move the lead to a next status, or change its franchise type |
| POST | `/leads/:id/no-response` | both | Keep the status, reschedule the follow-up |
| GET | `/change-type/internal?leadId=` | both | Internal Transfer franchise types for a lead |
| GET | `/change-type/countries` | both | Countries that have an Active franchise type |
| GET | `/change-type/states?countryId=` | both | States of a country with an Active franchise type |
| GET | `/change-type/cities?stateId=` | both | Cities of a state with an Active franchise type |
| GET | `/change-type/franchise-types?cityId=&leadId=` | both | Active franchise types of a city (without the lead's current type) |
| GET | `/locations/countries` | both | Countries (`search`, `status=active\|inactive\|all`) |
| GET | `/locations/states?countryCode=` | both | States |
| GET | `/locations/cities?countryCode=&stateCode=` | both | Cities |
| GET | `/locations/localities?cityCode=&page=&per_page=` | both | Localities, paginated (default 50, max 200) |
| GET | `/team/franchise-sales-managers` | Sales Director | Franchise Sales Managers who report to me, with their franchise types |
| GET | `/team/franchise-sales-managers/:id` | Sales Director | One of them (404 if not in my team) |
| GET | `/team/sales-director` | Franchise Sales Manager | The Sales Director I report to |
| GET | `/franchise-types/assignments?assignment=all\|assigned\|unassigned` | Sales Director | My franchise types and the Franchise Sales Managers assigned to each |

Master data (franchise types, sources, status types, modules), Sales Directors, Franchise Sales Managers, assignments and locations are **created and edited in the admin panel** (Laravel API, admin token). These CRM users only read them here.

---

## GET /leads

Query (all optional):

| Param | Values |
|---|---|
| `module` | `airpropx_franchise_modules.module_code`, e.g. `FR-TODAY`. Filters by the module's date bucket (today / pending / future / none) |
| `status` | status `system_code`, e.g. `CALL`, `FOLLOWUP` |
| `franchiseType`, `source` | ids |
| `assignedTo` | `me`, `unassigned` or a Sales Director id |
| `dateField` | `followup` (default) or `created` |
| `dateFrom`, `dateTo` | `YYYY-MM-DD` (business dates in `APP_TIMEZONE`) |
| `search` | name, mobile, email, franchise type name/code, source, assignee, status name (max 100 characters) |
| `page`, `per_page` | default 1 / 10, `per_page` at most 100; a page past the end returns the last page |
| `sort` | `name`, `date`, `phone`, `franchiseType`, `status`, `createdBy`, `createdAt` |
| `direction` | `asc` (default) or `desc` |

Default order: never-actioned leads first, then the latest follow-up date, then the newest lead.

```json
{
  "success": true,
  "message": "Franchise Leads",
  "data": {
    "items": [{
      "id": 12, "name": "Lead 12", "mobile": "8000000012", "email": null,
      "followUpDate": "2026-09-18", "followUpDateDisplay": "18-Sep-2026", "followUpTime": "10:30",
      "franchiseTypeId": 40, "franchiseTypeName": "Airpropx", "franchiseTypeCode": "AIRP HYD 02",
      "franchiseTypeLabel": "Airpropx (AIRP HYD 02)", "sourceId": 2, "sourceName": "Facebook",
      "statusCode": "VISITED", "statusName": "Visited", "isNew": false,
      "assignedToId": 15, "assignedToName": "Nanud", "createdBy": "Nanud",
      "createdDate": "18-Sep-2026", "origin": "Import"
    }],
    "pagination": { "page": 1, "perPage": 10, "total": 8, "lastPage": 1 },
    "meta": { "title": "All Leads", "moduleName": null, "statusName": null }
  }
}
```

## POST /leads · PUT /leads/:id

```json
{ "customerName": "Ravi", "mobileNumber": "9000011111", "emailId": "ravi@example.com", "sourceId": 2, "franchiseTypeId": 40, "comments": "Met at expo" }
```

- **Validation (400):**
  - `customerName` is required, at most 150 characters.
  - `mobileNumber` must be exactly 10 digits; spaces are removed.
  - `emailId` is optional and must be a valid address.
  - `sourceId` must be an Active source.
  - `franchiseTypeId` (create only) must be an Active type the user is assigned to ("Selected Franchise Type is not assigned to you.").
  - `comments`: at most 5000 characters.
- **Duplicates (409):** a live lead already has this mobile number ("Duplicate Lead: Mobile number … already exists.").
- **Responses:** 201 (create) / 200 (edit) return the lead.
- **Franchise type:** it can't be changed with PUT; use Change Franchise Type, which records the transfer.

## POST /leads/:id/activity

Move to a next status (`futureStatusTypeId` is any id of the target status; the canonical id is stored):

```json
{ "futureStatusTypeId": "8", "futureDate": "2026-09-20", "hours": "10", "minutes": "30", "comments": "Call back", "dropoutReasonIds": [] }
```

Change Franchise Type:

```json
{ "futureStatusTypeId": "change_franchise_type", "transferType": "internal", "franchiseTypeId": 39, "futureDate": "", "comments": "" }
```

- **Moves:** only transitions in `airpropx_franchise_status_transitions` are allowed ("That status change is not allowed from the lead's current status.").
- **Dropout reasons:** a status with `requires_dropout_reason = 'Y'` needs at least one Active dropout reason.
- **Terminal statuses:** a lead at a status with no onward move can't change franchise type.
- **Internal Transfer:** limited to the user's own Active types, checked on the server.
- **External Transfer:** hands the lead to the new type's Sales Director, when the type has one.
- **Concurrency:** every write locks the lead row, so parallel requests can't create two current history rows.

## POST /leads/:id/no-response

```json
{ "noResponseDate": "2026-09-21", "reason": "Not reachable" }
```

The status stays the same, the date becomes the next follow-up, and the history row is labelled with the status flagged `is_no_response_status`.

## POST /leads/import

This uses the same contract as the admin panel import. The client parses the sheet and sends rows:

```json
{ "original_filename": "leads.xlsx", "data": [
  { "row_number": 2, "customer_name": "Ravi", "mobile_number": "9100000001", "email_id": "", "Franchise_Type": "AIRP HYD 02", "source_id": "FACEBOOK", "comments": "" }
]}
```

- **Codes:** `Franchise_Type` is a franchise type code and `source_id` is a source code; both are case-insensitive.
- **Row limit:** at most `IMPORT_MAX_ROWS` rows (default 5000).
- **Response:** `summary` counts plus per-row `errors` and `duplicates`.
- **Stored records:** duplicates go to `airpropx_franchise_lead_import_duplicates`; the batch goes to `airpropx_franchise_lead_import_batches`.

---

## Database time zone

`created_at` columns are `TIMESTAMP`s stored in UTC. Prisma does not set the MySQL session time zone, so the MySQL server's `time_zone` must be UTC. That is Cloud SQL's default, and the other Terraterri apps rely on it too. `future_status_date` is a business date; "today" follows `APP_TIMEZONE`.
