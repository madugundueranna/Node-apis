# AirproX CRM API – OTP Login, Current User, Logout, Dashboard

Base path: `/api/v1/airpropx`

Supported roles (`master_role.name`): `Sales Director`, `Franchise Sales Manager`

| Role | Identity table | Franchise types |
|---|---|---|
| Sales Director | `airpropx_sales_directors` (`role_id` → `master_role.id`) | `airpropx_sales_director_franchise_types` |
| Franchise Sales Manager | `users` (`role_id` → `master_role.id`) | `airpropx_franchise_sales_manager_franchise_types` |

A role can log in only while `master_role.role_status = 'A'` and its `airpropx_franchise_crm_role_access` row is `Active` with `can_login = 'Y'`.

## Authentication

- Login is **mobile + role + OTP**: `POST /auth/request-otp`, then `POST /auth/verify-otp`. There is no password login.
- Both steps require a user who has that mobile number **and** holds the requested role. A mobile number that belongs to a different role does not match.
- OTPs are stored in the shared `user_otps` table (same mechanism as `nodeapi-services-terraterri`).
  - They are 6 digits, valid for 5 minutes (`OTP_EXPIRY_MINUTES`) and sent by SMS.
  - A new request replaces earlier OTPs for that mobile.
  - A verified OTP is deleted and cannot be used again.
- A successful verification sets the JWT in an **HttpOnly cookie** (`JWT_COOKIE_NAME`, default `airpropx_token`). The token is never in the response body.
- Browsers send the cookie automatically. Cross-origin frontends must use `credentials: "include"` (fetch) or `withCredentials: true` (axios/jQuery), and their origin must be listed in `AIRPROPX_CORS_ALLOWED_ORIGINS`.
- JWT claims: `sub`, `user_id`, `role`, `iat`, `exp`, `iss`, `aud` (HS256, `JWT_SECRET`, lifetime `JWT_EXPIRES_IN`).
- Every authenticated request reloads the user from the database. Deactivating the user, the role or the role access ends the session on its next request.
- Tokens are stateless. Logout clears the cookie, but a copied token stays valid until `exp`.

All responses use `{ "success": boolean, "message": string, "data"?: object }`.

---

## POST /auth/request-otp

Public. `Content-Type: application/json` is required (other body types get a 400).

The OTP is sent only if the mobile number and role match an active account that is allowed to log in. The OTP is never included in the response.

```json
{ "mobile": "9505036142", "role": "Sales Director" }
```

`mobile`: 10 digits. Spaces, `-` and a country prefix such as `+91` are ignored (the last 10 digits are used).

**200**

```json
{ "success": true, "message": "OTP sent successfully" }
```

| Status | When | message |
|---|---|---|
| 400 | Body is not JSON / invalid JSON | `Request body must be JSON (Content-Type: application/json)` / `Invalid JSON request body` |
| 400 | Missing field | `Missing required fields: mobile, role` |
| 400 | Invalid mobile | `Please enter a valid 10-digit mobile number` |
| 400 | Unsupported role | `Invalid role` |
| 401 | No user with this mobile **and** role | `Invalid mobile number or role` |
| 403 | Matching account inactive | `Your account is currently inactive. Please contact your administrator` |
| 403 | Role inactive or no login access | `You don't have access. Please contact the administrator` |
| 409 | More than one active account with this mobile and role | `Multiple active accounts found for this mobile number and role. Please contact the administrator` |
| 429 | Another OTP requested within `OTP_RESEND_COOLDOWN_SECONDS` | `Please wait a moment before requesting another OTP` |
| 429 | More than `OTP_MAX_REQUESTS` requests for the mobile in the window | `Too many OTP requests. Please try again later` |
| 502 | SMS provider failed or is not configured (no OTP is left stored) | `Unable to send OTP right now. Please try again` |
| 503 | Database unreachable or not configured | `Service temporarily unavailable. Please try again later` |

---

## POST /auth/verify-otp

Public. Checks the account again (the same checks and errors as `request-otp`), then verifies the OTP against the latest one sent to the mobile number and consumes it.

```json
{ "mobile": "9505036142", "role": "Sales Director", "otp": "123456" }
```

**200** – also sets `Set-Cookie: airpropx_token=<jwt>; Max-Age=86400; Path=/; HttpOnly; SameSite=Lax` (plus `Secure` in production)

```json
{
  "success": true,
  "message": "Login Successful",
  "data": {
    "authenticated": true,
    "expiresAt": "2026-09-18T10:30:00.000Z",
    "user": {
      "id": 15,
      "name": "Nanud",
      "mobile": "9505036142",
      "email": "Nanud60@gmail.com",
      "profileImage": "https://...",
      "role": "Sales Director",
      "roleId": 14,
      "roleName": "Sales Director",
      "location": "Hyderabad",
      "franchiseTypes": [
        { "id": 40, "name": "Airpropx", "code": "AIRP HYD 02", "cityName": "Hyderabad", "status": "Active" }
      ]
    },
    "permissions": {
      "leadScope": "OWN",
      "canAddLead": true,
      "canEditLead": true,
      "canImportLeads": true,
      "canChangeFranchiseType": true
    },
    "shortcuts": [
      { "label": "Meetings Scheduled", "icon": "fa fa-calendar", "moduleCode": "FR-TODAY", "statusCode": "OFFICE_VISIT_GMEET" }
    ]
  }
}
```

`user.id` is the id in the role's identity table (see the table above).

Errors: the account errors of `request-otp` (400 validation, 401, 403, 409), plus:

| Status | When | message |
|---|---|---|
| 400 | Missing OTP | `Missing required fields: otp` |
| 400 | OTP is not 6 digits | `Please enter a valid 6-digit OTP` |
| 401 | No OTP for the mobile, or already used | `OTP not found or expired` |
| 401 | Wrong OTP | `Invalid OTP` |
| 401 | Correct OTP after its expiry (the OTP is removed) | `OTP expired` |
| 429 | More than `OTP_MAX_FAILED_ATTEMPTS` failed verifications for the mobile in the window | `Too many failed OTP attempts. Please try again later` |
| 500 / 503 | Server error / database unavailable | generic messages, no details |

---

## GET /auth/me

Authenticated (cookie). The user is reloaded from the JWT's user id and role, never from a mobile number.

**200** – `data` has the same shape as the `verify-otp` response (`authenticated`, `expiresAt`, `user`, `permissions`, `shortcuts`).

```json
{ "success": true, "message": "User details fetched successfully", "data": { "authenticated": true, "expiresAt": "…", "user": { "id": 15, "name": "Nanud", "mobile": "9505036142", "role": "Sales Director" }, "permissions": {}, "shortcuts": [] } }
```

Errors: the same 401 responses as the dashboard (`Authentication required`, expired / invalid session, revoked access).

---

## POST /auth/logout

Public. Always clears the auth cookie (`Set-Cookie: airpropx_token=; Expires=Thu, 01 Jan 1970 ...`), even when the session has already expired.

**200**

```json
{ "success": true, "message": "Logout Successful" }
```

---

## GET /dashboard

Authenticated (cookie). Roles: `Sales Director`, `Franchise Sales Manager`.

This is the data behind the Franchise Lead Dashboard.

Query: `franchiseType` (optional, positive integer). Limits the counts to one franchise type.

Which leads are counted (`airpropx_franchise_leads`, not deleted, `status <> 'Inactive'`) depends on the role's `lead_scope`:

| lead_scope | Sales Director | Franchise Sales Manager |
|---|---|---|
| OWN | Leads with `sales_director_id` = own id, plus unassigned leads of own franchise types | Unassigned leads of own franchise types |
| FRANCHISE_TYPES | All leads of own franchise types | All leads of own franchise types |
| ALL | All leads | All leads |

`sales_director_id` is a foreign key to `airpropx_sales_directors`. Because of that, a Franchise Sales Manager's `users.id` is never compared with it.

A lead's status and date come from its current `airpropx_franchise_lead_status_history` row. A lead with no current row is at the entry status and counts as "today". Buckets use `future_status_date` and "today" in `APP_TIMEZONE`:

- `today`, `pending` and `future` modules count their own bucket.
- `none` modules (Post Sale) count all buckets.

**200**

```json
{
  "success": true,
  "message": "Dashboard details fetched successfully",
  "data": {
    "selectedFranchiseTypeId": null,
    "franchiseTypes": [
      { "id": 40, "name": "Airpropx", "code": "AIRP HYD 02", "label": "Airpropx (AIRP HYD 02)", "cityId": 1, "cityName": "Hyderabad" }
    ],
    "summaryCards": [
      { "systemCode": "VISITED", "name": "Visited", "icon": "https://...", "count": 1, "moduleCode": "FR-POST-SALE" }
    ],
    "modules": [
      {
        "id": 6, "code": "FR-TODAY", "name": "Today", "dateFilterType": "today", "layout": "GROUPED",
        "groups": [
          {
            "id": 12, "name": "Pre Meet",
            "statuses": [
              { "id": 4, "systemCode": "CALL", "name": "Calls", "icon": "https://...", "count": 2, "moduleCode": "FR-TODAY" }
            ]
          }
        ],
        "statuses": [ "…all statuses of the module, flattened in group order…" ]
      }
    ]
  }
}
```

- `layout: "FLAT"` modules are shown as one card row (use `statuses`).
- `GROUPED` modules are shown by `groups`.

| Status | When | message |
|---|---|---|
| 400 | `franchiseType` not a positive integer | `franchiseType must be a positive integer` |
| 401 | No cookie | `Authentication required` |
| 401 | Expired token (cookie cleared) | `Your session has expired. Please login again` |
| 401 | Invalid or tampered token (cookie cleared) | `Unauthorized: Invalid session. Please login again` |
| 401 | User, role or role access no longer active (cookie cleared) | `Your access has been revoked. Please contact the administrator` |
| 403 | Authenticated role not allowed on the route | `You do not have permission to access this resource` |
| 500 | Server error | `Something went wrong. Please try again` |
| 503 | Database unreachable or not configured | `Service temporarily unavailable. Please try again later` |

---

## Environment

| Variable | Default | Notes |
|---|---|---|
| `DATABASE_URL` | – | Prisma MySQL URL for `prod_api_terraterri`, e.g. `mysql://USER:PASSWORD@HOST:3306/DATABASE` |
| `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`, `DB_CONNECTION_LIMIT` | – | Used only when `DATABASE_URL` is empty. `DB_HOST` may be a Unix socket path |
| `JWT_SECRET` | – | Required, at least 32 characters |
| `JWT_EXPIRES_IN` | `1d` | Seconds (`86400`) or a timespan (`12h`) |
| `JWT_COOKIE_NAME` | `airpropx_token` | |
| `JWT_COOKIE_SAMESITE` | `lax` | `lax`, `strict` or `none` (`none` forces Secure) |
| `JWT_COOKIE_SECURE` | `false` | Always Secure when `NODE_ENV` or `ENVIRONMENT` is `production` |
| `JWT_COOKIE_DOMAIN` | – | Optional |
| `AIRPROPX_CORS_ALLOWED_ORIGINS` | – | Comma-separated exact origins. `*` is ignored. Empty means same-origin only |
| `APP_TIMEZONE` | `Asia/Kolkata` | Sets "today" for the dashboard buckets |
| `OTP_EXPIRY_MINUTES` | `5` | The SMS text states this value, so a different value needs a matching DLT template |
| `OTP_RESEND_COOLDOWN_SECONDS` | `30` | Minimum gap between OTP requests for one mobile (`0` disables it) |
| `OTP_MAX_REQUESTS`, `OTP_MAX_FAILED_ATTEMPTS`, `OTP_RATE_LIMIT_WINDOW_MINUTES` | `5`, `5`, `15` | Per mobile number, in memory per server instance |
| `SMS_HOST`, `SMS_PORT`, `SMS_USERNAME`, `SMS_PASSWORD`, `SMS_SENDER`, `SMS_ENTITY_ID`, `SMS_TMID` | – | SMS provider (same variables as `nodeapi-services-terraterri`). `SMS_PORT`, `SMS_ENTITY_ID` and `SMS_TMID` are optional |
| `SMS_OTP_TEMPLATE_ID` | – | DLT template id of the OTP text (`1707174625464679504` in `nodeapi-services-terraterri`) |
| `SMS_TLS_REJECT_UNAUTHORIZED` | `true` | `false` skips the provider's TLS certificate check (what `nodeapi-services-terraterri` does). With `true`, a certificate that is not valid for `SMS_HOST` makes every OTP request fail with 502 |
