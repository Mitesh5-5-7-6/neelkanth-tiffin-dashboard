# Neelkanth Tiffin Dashboard — Deep Workflow Reference

> Last updated: 2026-05-16  
> Stack: Next.js 16 App Router · MongoDB/Mongoose · NextAuth 4 · TanStack Query/Form/Table · shadcn/ui · Zod · Vercel Cron

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Authentication & Session System](#2-authentication--session-system)
3. [Middleware Pipeline](#3-middleware-pipeline)
4. [API Deep Reference](#4-api-deep-reference)
   - [Customers](#41-customers)
   - [Payments](#42-payments)
   - [Tiffin Entries](#43-tiffin-entries)
   - [Backup & Restore](#44-backup--restore)
5. [UI Workflows](#5-ui-workflows)
   - [Login](#51-login-flow)
   - [Customer Management](#52-customer-management)
   - [Tiffin Entries](#53-tiffin-entries-daily-workflow)
   - [Payments](#54-payment-workflow)
   - [Dashboard](#55-dashboard)
6. [Data Models & Validation](#6-data-models--validation)
7. [State Management Pattern](#7-state-management-pattern)
8. [Backup & Cron System](#8-backup--cron-system)
9. [Error Handling Contract](#9-error-handling-contract)
10. [Rate Limiting Rules](#10-rate-limiting-rules)

---

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BROWSER / CLIENT                             │
│                                                                     │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────────┐   │
│  │  Login Page  │   │  AppShell    │   │  Feature Pages       │   │
│  │  /login      │   │  + Sidebar   │   │  /dashboard          │   │
│  └──────┬───────┘   └──────┬───────┘   │  /customers          │   │
│         │                  │           │  /payments           │   │
│         │         TanStack │ Query     │  /tiffin-entries     │   │
│         │         (hooks)  │           └──────────────────────┘   │
└─────────┼──────────────────┼───────────────────────────────────────┘
          │ NextAuth         │ fetch() API calls
          ▼                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  NEXT.JS SERVER (Vercel)                            │
│                                                                     │
│  middleware.ts  ──►  Rate Limit Check  ──►  JWT Token Check        │
│       │                                                             │
│       ▼                                                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                     API ROUTES                              │   │
│  │                                                             │   │
│  │  /api/auth/[...nextauth]   — NextAuth signin / JWT          │   │
│  │  /api/customers            — Customer CRUD                  │   │
│  │  /api/customers/stats      — Count aggregation              │   │
│  │  /api/customers/[id]       — Single customer ops            │   │
│  │  /api/payments             — Payment CRUD                   │   │
│  │  /api/payments/stats       — Financial aggregation          │   │
│  │  /api/payments/[id]        — Single payment ops             │   │
│  │  /api/payments/generate-bill   — Bill calculation           │   │
│  │  /api/payments/monthly-report  — Month summary              │   │
│  │  /api/payments/customer-summary/[id] — Per-customer totals  │   │
│  │  /api/tiffin-entries       — Fetch by date                  │   │
│  │  /api/tiffin-entries/preview   — Preview rows               │   │
│  │  /api/tiffin-entries/bulk  — Bulk upsert                    │   │
│  │  /api/cron/backup          — Scheduled export               │   │
│  │  /api/backup/restore       — Manual restore                 │   │
│  └────────────────────────────┬────────────────────────────────┘   │
│                               │                                     │
│          checkAuth() ─────────┘ ──► lib/authOptions (getServerSession)
└───────────────────────────────────────────────────────────────────--┘
          │
          ▼
┌─────────────────────────┐        ┌───────────────────────────┐
│      MongoDB Atlas      │        │    OneDrive (Graph API)   │
│                         │        │                           │
│  collections:           │        │  backups/                 │
│  • customers            │        │    2026/05/               │
│  • payments             │◄──────►│      backup-2026-05-15.zip│
│  • DailyTiffinEntry     │        │                           │
└─────────────────────────┘        └───────────────────────────┘
```

---

## 2. Authentication & Session System

### How it works end-to-end

```
 BROWSER                    NEXT.JS SERVER                GLOBALTHIS
    │                             │                            │
    │  POST /api/auth/signin      │                            │
    │  { email, password }        │                            │
    │────────────────────────────►│                            │
    │                             │                            │
    │                    safeCompare(email, LOGIN_EMAIL)       │
    │                    safeCompare(pass,  LOGIN_PASSWORD)    │
    │                    (sha256 + timingSafeEqual)            │
    │                             │                            │
    │                    randomUUID() → sessionId              │
    │                             │                            │
    │                             │  registerSession(id) ─────►│
    │                             │  g.__ntSessionId = id      │
    │                             │                            │
    │                    JWT token signed with:                │
    │                    { email, role, sessionId, exp }       │
    │◄────────────────────────────│                            │
    │                             │                            │
    │  (Next request with JWT)    │                            │
    │────────────────────────────►│                            │
    │                             │  middleware.ts:            │
    │                             │  getToken(request)         │
    │                             │  token.exp < now → 401     │
    │                             │                            │
    │                             │  checkAuth():              │
    │                             │  getServerSession()        │
    │                             │                            │
    │  ⚠ New login elsewhere      │                            │
    │────────────────────────────►│                            │
    │                             │  registerSession(newId) ───►│
    │                             │  g.__ntSessionId = newId   │
    │                             │                            │
    │  jwt callback fires:        │                            │
    │  isActiveSession(old) = false                            │
    │  → token.exp = 0           │                            │
    │  → all old requests: 401   │                            │
```

**Key implementation details:**

| File | Purpose |
|---|---|
| [lib/authOptions.ts](lib/authOptions.ts) | CredentialsProvider, JWT callbacks, session callbacks |
| [lib/session-store.ts](lib/session-store.ts) | `registerSession()` / `isActiveSession()` on `globalThis` |
| [lib/checkAuth.ts](lib/checkAuth.ts) | `getServerSession(authOptions)` — returns `{session}` or `{error: 401}` |
| [middleware.ts](middleware.ts) | `getToken()` + `token.exp` check before every `/api/*` request |

**Single-session enforcement rule:**
- Only one active `sessionId` is kept in `globalThis.__ntSessionId`
- Every new login calls `registerSession(newId)` which overwrites the previous
- The JWT callback sets `token.exp = 0` if `isActiveSession(token.sessionId)` returns false
- Middleware rejects any request with `token.exp < now` as `401 Unauthorized`

---

## 3. Middleware Pipeline

Every request to `/api/*` (except `/api/auth/*`) passes through this pipeline:

```
 Incoming Request
       │
       ▼
  Is /api/* ?  ──── No ──► add x-pathname header, pass through
       │
      Yes
       │
       ▼
  Is /api/auth/* ? ── Yes ──► pass through (NextAuth handles own auth)
       │
      No
       ▼
  Extract client IP
  x-forwarded-for[0] | x-real-ip | 'unknown'
       │
       ▼
  Determine rate limit tier:
  ┌─────────────────────────────────────────┐
  │  path includes /bulk  → key: bulk:{ip}  │  max: 20/min
  │  POST|PATCH|PUT|DELETE → key: write:{ip}│  max: 50/min
  │  GET                  → key: read:{ip}  │  max: 200/min
  └─────────────────────────────────────────┘
       │
       ▼
  rateLimit(key, max, 60_000)
  sliding window in globalThis Map
       │
  ┌────┴─────┐
  │ exceeded │── Yes ──► 429 { Retry-After: N }
  └────┬─────┘
      No
       │
       ▼
  getToken(request)  [NextAuth JWT]
       │
  ┌──────────────────┐
  │ !token || expired│── Yes ──► 401 { code: UNAUTHORIZED }
  └────┬─────────────┘
      No
       │
       ▼
  NextResponse.next()  ──►  Route Handler
```

---

## 4. API Deep Reference

### Standard Response Envelope

Every route returns this shape (via [lib/apiResponse.ts](lib/apiResponse.ts)):

```jsonc
// Success
{
  "success": true,
  "message": "Human-readable message",
  "data": { /* payload */ },
  "error": null,
  "meta": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 }  // paginated only
}

// Error
{
  "success": false,
  "message": "Human-readable message",
  "data": null,
  "error": { "code": "VALIDATION_ERROR", "details": { /* field errors */ } }
}
```

| Status | Code constant | When |
|---|---|---|
| 200 | `success()` | Successful GET or PATCH |
| 201 | `created()` | Resource created (POST) |
| 400 | `badRequest()` | Zod validation failure or bad input |
| 401 | `unauthorized()` | No session / expired token |
| 404 | `notFound()` | Document not found by ID |
| 409 | `conflict()` | Duplicate key (e.g. phone) |
| 429 | middleware | Rate limit exceeded |
| 500 | `internalServerError()` | Uncaught exception |

---

### 4.1 Customers

#### `GET /api/customers`

Fetches paginated list of **active** customers with optional search.

**Auth:** Required  
**Rate limit:** read tier (200/min)

**Query parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | number | `1` | Page number (min 1) |
| `limit` | number | `10` | Items per page (max 100) |
| `search` | string | `""` | Case-insensitive regex on `full_name` OR `phone` |

**MongoDB query built:**
```js
filter = { is_active: true }
if (search) filter.$or = [
  { full_name: { $regex: search, $options: 'i' } },
  { phone:     { $regex: search, $options: 'i' } }
]

Customer.find(filter)
  .sort({ createdAt: -1 })
  .skip((page-1) * limit)
  .limit(limit)
  .lean()

// Parallel: Customer.countDocuments(filter)
```

**Response `data`:** Array of customer documents  
**Response `meta`:** `{ page, limit, total, totalPages }`

---

#### `POST /api/customers`

Creates a new customer after validating and checking for duplicate phone.

**Auth:** Required  
**Rate limit:** write tier (50/min)

**Request body (Zod-validated):**
```jsonc
{
  "full_name": "Ramesh Patel",          // string, 2–100 chars, trimmed
  "phone": "9876543210",               // 10-digit Indian mobile [6-9]\d{9}
  "address": "12 MG Road",            // optional, max 200 chars
  "notes": "No onion",                // optional, max 500 chars
  "tiffin_defaults": {
    "morning": true,
    "morning_qty": 1,                  // integer 1–10
    "morning_price": 30,              // number 1–10000
    "evening": true,
    "evening_qty": 1,
    "evening_price": 30
  }
}
```

**Business logic:**
```
1. Zod parse → 400 on failure
2. Customer.findOne({ phone }) → 409 if duplicate
3. Customer.create(parsed.data) → 201
```

---

#### `GET /api/customers/[id]`

Fetch a single customer by MongoDB ObjectId.

**Auth:** Required  
**Rate limit:** read tier

```
Customer.findById(id).lean()
→ 404 if not found
→ 200 with customer document
```

---

#### `PATCH /api/customers/[id]`

Partial update of any customer field.

**Auth:** Required  
**Rate limit:** write tier

**Request body:** Same shape as POST but all fields optional (`updateCustomerSchema = createCustomerSchema.partial()`)

**Business logic:**
```
1. Zod partial parse → 400 on failure
2. If phone in payload: findOne({ phone, _id: {$ne: id} }) → 409 if taken
3. findByIdAndUpdate(id, { $set: parsed }, { new: true, runValidators: true })
→ 404 if not found
→ 200 with updated document
```

---

#### `DELETE /api/customers/[id]`

**Soft delete** — sets `is_active: false`. Data is NOT removed from the database.

**Auth:** Required  
**Rate limit:** write tier

```
Customer.findByIdAndUpdate(id, { $set: { is_active: false } }, { new: true })
→ 404 if not found
→ 200 with deactivated document ("Customer deactivated successfully")
```

> Customers with `is_active: false` are excluded from all list queries and the tiffin-entry preview.

---

#### `GET /api/customers/stats`

Returns total/active/inactive counts in a single parallel query.

**Auth:** Required  
**Rate limit:** read tier

**MongoDB queries (parallel):**
```js
Promise.all([
  Customer.countDocuments(),               // total
  Customer.countDocuments({ is_active: true }),
  Customer.countDocuments({ is_active: false }),
])
```

**Response `data`:**
```jsonc
{ "total": 45, "active": 42, "inactive": 3, "outstanding": 0 }
```

> `outstanding` is always 0 here — actual outstanding balance comes from `/api/payments/stats`

---

### 4.2 Payments

#### `GET /api/payments`

Paginated payment list with MongoDB aggregation pipeline (joins customer for search).

**Auth:** Required  
**Rate limit:** read tier

**Query parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | number | `1` | Page number |
| `limit` | number | `10` | Items per page (max 100) |
| `search` | string | `""` | Search on `customer.full_name` or `customer.phone` |
| `status` | string | `""` | Filter by `payment_status` enum |
| `start_date` | string | `""` | `payment_date >= YYYY-MM-DD` |
| `end_date` | string | `""` | `payment_date <= YYYY-MM-DD` |
| `customer_id` | string | `""` | Filter by customer ObjectId |

**Aggregation pipeline:**
```
$match (payment fields) → pre-filter before join
  └── payment_status, customer_id, payment_date range
$lookup (customers collection)
  └── joins { full_name, phone, address } as customer{}
$unwind customer
$match (post-join, only if search param present)
  └── customer.full_name | customer.phone regex
$sort { payment_date: -1, createdAt: -1 }
$skip / $limit
```

> The pipeline runs twice in parallel: once with `$count` for total, once with `$skip/$limit` for the page.

**Response `data`:** Array of payment documents with embedded `customer` object

---

#### `POST /api/payments`

Records a new payment with auto-calculated `remaining_amount` and `payment_status`.

**Auth:** Required  
**Rate limit:** write tier

**Request body:**
```jsonc
{
  "customer_id": "664abc...",
  "payment_date": "2026-05-15",       // YYYY-MM-DD
  "billing_start_date": "2026-05-01",
  "billing_end_date": "2026-05-15",
  "total_bill_amount": 900,           // number >= 0
  "paid_amount": 600,                 // number >= 0
  "payment_method": "cash",           // cash|upi|bank_transfer|cheque
  "reference_number": "UPI123",       // optional, max 100 chars
  "notes": "May installment",         // optional, max 500 chars
  "collected_by": "Admin"             // optional, defaults to session email
}
```

**Status auto-calculation logic:**
```
paid_amount <= 0              → "pending"
paid_amount > total_bill      → "advance"
paid_amount === total_bill    → "completed"
paid_amount < total_bill      → "partial"

remaining_amount = total_bill_amount - paid_amount
```

**Date parsing:** `"2026-05-15"` → `new Date(Date.UTC(2026, 4, 15))` (always UTC midnight)

**Validation refinement:** `billing_end_date >= billing_start_date` — else 400

---

#### `GET /api/payments/[id]`

Fetches a single payment with customer joined.

**Auth:** Required  
**Rate limit:** read tier

```
Payment.aggregate([
  { $match: { _id: ObjectId(id) } },
  { $lookup: { from: 'customers', ..., pipeline: [{ $project: { full_name, phone, address } }] } },
  { $unwind: '$customer' }
])
→ 404 if ObjectId invalid or not found
→ 200 with payment + embedded customer
```

---

#### `PATCH /api/payments/[id]`

Partial update — recalculates `remaining_amount` and `payment_status` based on new `paid_amount`.

**Auth:** Required  
**Rate limit:** write tier

**Updatable fields only:**
```
paid_amount        → triggers recalculation of remaining + status
payment_method     → cash|upi|bank_transfer|cheque
payment_date       → YYYY-MM-DD
reference_number
notes
collected_by
```

> `total_bill_amount`, `billing_start_date`, `billing_end_date`, `customer_id` are **not updatable** via PATCH. The bill amount is fixed on creation.

**Recalculation:**
```
new_paid = parsed.paid_amount ?? existing.paid_amount
remaining = existing.total_bill_amount - new_paid
status = calcStatus(new_paid, existing.total_bill_amount)
```

---

#### `DELETE /api/payments/[id]`

**Hard delete** — permanently removes the payment record.

**Auth:** Required  
**Rate limit:** write tier

```
Payment.findByIdAndDelete(id)
→ 404 if not found
→ 200 { data: null, message: "Payment deleted" }
```

> Unlike customers, payments are fully removed (no soft delete).

---

#### `GET /api/payments/stats`

Full-collection aggregation for the financial summary widget.

**Auth:** Required  
**Rate limit:** read tier

**Aggregation:**
```js
Payment.aggregate([
  {
    $group: {
      _id: null,
      total_collected:  { $sum: '$paid_amount' },
      total_pending:    { $sum: { $cond: [{ $gt: ['$remaining_amount', 0] }, '$remaining_amount', 0] } },
      partial_count:    { $sum: { $cond: [{ $eq: ['$payment_status', 'partial'] }, 1, 0] } },
      advance_balance:  { $sum: { $cond: [{ $eq: ['$payment_status', 'advance'] }, { $abs: '$remaining_amount' }, 0] } }
    }
  }
])
```

**Response `data`:**
```jsonc
{
  "total_collected": 45000,
  "total_pending": 8200,
  "partial_count": 5,
  "advance_balance": 300
}
```

---

#### `POST /api/payments/generate-bill`

Calculates a customer's bill for a date range from TiffinEntry records, accounting for prior payment history.

**Auth:** Required  
**Rate limit:** write tier

**Request body:**
```jsonc
{
  "customer_id": "664abc...",
  "billing_start_date": "2026-05-01",
  "billing_end_date": "2026-05-15"
}
```

**Three parallel DB queries:**
```
1. Customer.findById(customer_id)

2. TiffinEntry.aggregate [match customer + date range]
   → $group: { total_amount: $sum total_amount, total_entries: $sum 1 }

3. Payment.aggregate [payments whose billing_end_date < start of this period]
   → $group: { total_billed: $sum total_bill_amount, total_paid: $sum paid_amount }
```

**Bill calculation:**
```
total_amount      = sum of tiffin entries in range
prev_balance      = prev_billed - prev_paid   (from older payments)
previous_pending  = max(0, prev_balance)       (positive = customer owes)
advance_deduction = abs(min(0, prev_balance))  (negative = credit)
final_payable     = max(0, total_amount + previous_pending - advance_deduction)
```

**Response `data`:**
```jsonc
{
  "customer_id": "664abc...",
  "customer_name": "Ramesh Patel",
  "billing_start_date": "2026-05-01",
  "billing_end_date": "2026-05-15",
  "total_entries": 28,
  "total_amount": 840,
  "previous_pending": 60,
  "advance_deduction": 0,
  "final_payable": 900
}
```

---

#### `GET /api/payments/monthly-report`

Monthly aggregation with top-5 paying customers.

**Auth:** Required  
**Rate limit:** read tier

**Query parameters:**

| Param | Type | Default |
|---|---|---|
| `year` | number | current year |
| `month` | number | current month (1–12) |

**Two parallel aggregations:**
```
1. Payment.aggregate [match payment_date in month range]
   $group: total_collected, total_pending, total_partial,
           advance_count, payment_count, unique_customers (addToSet)

2. Payment.aggregate [same match]
   $group by customer_id, sum paid
   $sort paid DESC, $limit 5
   $lookup customers → full_name
```

**Response `data`:**
```jsonc
{
  "year": 2026, "month": 5,
  "total_collected": 18000,
  "total_pending": 3200,
  "total_partial": 3,
  "advance_count": 1,
  "payment_count": 22,
  "customer_count": 18,
  "top_customers": [
    { "customer_id": "664abc...", "full_name": "Ramesh Patel", "paid": 1800 },
    ...
  ]
}
```

---

#### `GET /api/payments/customer-summary/[id]`

All-time payment summary for a single customer: total billed vs paid vs outstanding.

**Auth:** Required  
**Rate limit:** read tier

**Four parallel queries:**
```
1. Customer.findById(id)

2. TiffinEntry.aggregate [match customer_id]
   $group: { total: $sum total_amount }   → all-time tiffin bill

3. Payment.aggregate [match customer_id]
   $group: { total_paid: $sum paid_amount,
             advance_balance: $sum abs(remaining) where status=advance }

4. Payment.find({ customer_id }).sort({ payment_date: -1 })
   → full payment history list
```

**Response `data`:**
```jsonc
{
  "customer_id": "664abc...",
  "full_name": "Ramesh Patel",
  "phone": "9876543210",
  "address": "12 MG Road",
  "total_bill": 12600,
  "total_paid": 11200,
  "outstanding": 1400,
  "advance_balance": 0,
  "payments": [ /* full payment records array */ ]
}
```

---

### 4.3 Tiffin Entries

#### `GET /api/tiffin-entries?date=YYYY-MM-DD`

Fetches all saved tiffin entries for a specific calendar date.

**Auth:** Required  
**Rate limit:** read tier

**Query:** date is required, must match `/^\d{4}-\d{2}-\d{2}$/`

**MongoDB query:**
```js
TiffinEntry.find({
  entry_date: { $gte: dateObj, $lt: nextDay }  // midnight to midnight UTC
})
.populate('customer_id', 'full_name phone address')
.lean()
```

**Response `data`:** Array of TiffinEntry documents with `customer_id` populated  
**Response `meta`:** `{ date, count }`

---

#### `GET /api/tiffin-entries/preview?date=YYYY-MM-DD[&fromDate=YYYY-MM-DD]`

The core "entry form" loader. Returns one row per active customer with smart pre-filled values.

**Auth:** Required  
**Rate limit:** read tier

**Three parallel queries:**
```
1. Customer.find({ is_active: true })           → all active customers
2. TiffinEntry.find({ entry_date: targetDate }) → already-saved entries for today
3. TiffinEntry.find({ entry_date: fromDate })   → source entries (only if fromDate given)
```

**Row priority logic (per customer):**
```
Priority 1 — has_existing_entry: true
  An entry already exists for `date`
  → Use that entry's qty, price, paid flags exactly
  → has_existing_entry = true

Priority 2 — fromDate entries exist
  No entry for `date`, but source date has one
  → Copy qty and price from source
  → Reset paid flags to false (new day)
  → has_existing_entry = false

Priority 3 — customer defaults
  No entry and no source date data
  → Use customer.tiffin_defaults
  → morning/evening qty, price from defaults
  → has_existing_entry = false
```

**Response `data`:** Array of `TiffinPreviewRow`:
```jsonc
{
  "customer_id": "664abc...",
  "name": "Ramesh Patel",
  "address": "12 MG Road",
  "morning": true,
  "morning_qty": 1,
  "morning_price": 30,
  "morning_paid": false,
  "evening": true,
  "evening_qty": 1,
  "evening_price": 30,
  "evening_paid": false,
  "has_existing_entry": false
}
```

---

#### `POST /api/tiffin-entries/bulk`

Bulk upsert — saves or updates all tiffin entries for a date in a single DB operation.

**Auth:** Required  
**Rate limit:** bulk tier (20/min)

**Request body:**
```jsonc
{
  "entry_date": "2026-05-15",         // YYYY-MM-DD, required
  "entries": [                         // 1–500 items
    {
      "customer_id": "664abc...",
      "morning_qty": 1,               // integer 0–10
      "morning_price": 30,            // number 0–10000
      "evening_qty": 1,
      "evening_price": 30,
      "morning_paid": false,          // optional, default false
      "evening_paid": false,
      "is_manual_price": false,       // optional, default false
      "notes": ""                     // optional, max 500 chars
    }
  ]
}
```

**Amount calculation (server-side):**
```
total_qty    = morning_qty + evening_qty
total_amount = (morning_qty > 0 ? morning_price : 0)
             + (evening_qty > 0 ? evening_price : 0)
```

> If qty is 0, the price for that slot is NOT counted, even if a price is specified.

**MongoDB bulkWrite operation:**
```js
entries.map(entry => ({
  updateOne: {
    filter: { customer_id: entry.customer_id, entry_date: dateObj },
    update:  { $set: { morning_qty, morning_price, ..., total_qty, total_amount } },
    upsert:  true
  }
}))

TiffinEntry.bulkWrite(ops, { ordered: false })
```

**Response `data`:**
```jsonc
{ "inserted": 3, "updated": 27, "total": 30 }
```

---

### 4.4 Backup & Restore

#### `GET /api/cron/backup`

Triggered by Vercel Cron at **19:30 IST daily**. Exports MongoDB → ZIP → uploads to OneDrive.

**Auth:** `Authorization: Bearer <CRON_SECRET>` header (NOT session-based)  
**Vercel config:** `maxDuration: 300`, `runtime: 'nodejs'`, `dynamic: 'force-dynamic'`

**Full pipeline:**

```
Step 1 — Security
  Check header: Authorization === "Bearer " + process.env.CRON_SECRET
  → 401 if missing or mismatch

Step 2 — Derive IST date string
  now = new Date()
  istMs = now.getTime() + 5.5 * 60 * 60 * 1000
  dateStr = "2026-05-15"
  remotePath = "backups/2026/05/backup-2026-05-15.zip"

Step 3 — Export collections (lib/backup/mongo-export.ts)
  exportCollections()
  → connects to MongoDB
  → queries every collection → JSON arrays
  → returns { collections, stats, errors, database }

Step 4 — Build payload
  BackupPayload = {
    metadata: { backup_date, generated_at, database, version, counts },
    collections: { customers: [...], payments: [...], DailyTiffinEntry: [...] }
  }

Step 5 — Compress (lib/backup/zip-generator.ts)
  generateBackupZip(filename, payload)
  → uses fflate to create ZIP
  → includes metadata.json + one {collection}.json per collection
  → returns Buffer

Step 6 — Upload (lib/backup/onedrive-upload.ts)
  uploadToOneDrive(zipBuffer, remotePath)
  → POST to Microsoft Graph: /v1.0/me/drive/root:/{path}:/content
  → auto-refreshes access token using ONEDRIVE_REFRESH_TOKEN
  → returns { web_url, size }

Step 7 — Respond
  { filename, onedrive_path, web_url, size_bytes,
    collections: { customers: 42, ... }, total_records, duration_ms }
```

---

#### `POST /api/backup/restore`

Downloads a backup from OneDrive and restores all or one collection.

**Auth:** Session required  
**Vercel config:** `maxDuration: 300`, `runtime: 'nodejs'`

**Request body:**
```jsonc
{
  "date": "2026-05-15",          // YYYY-MM-DD, required — which backup to restore
  "collection": "customers"      // optional — omit to restore FULL database
}
```

**Pipeline:**
```
1. checkAuth() → 401 if no session
2. Validate body: date format, collection type
3. downloadBackup(date) — fetch ZIP from OneDrive for that date, decompress, parse JSON
4a. collection specified → restoreCollection(payload, collectionName)
      → drop collection
      → insertMany(records from backup)
4b. no collection → restoreFullDatabase(payload)
      → drop ALL collections
      → insertMany for each collection
5. Return { restored_count, collections_restored, duration_ms }
```

> **Warning:** Full restore is destructive — it drops all existing data before inserting.

---

## 5. UI Workflows

### 5.1 Login Flow

```
 User opens browser
        │
        ▼
  app/(private)/layout.tsx
  getServerSession()
        │
   No session ─────────────────────────────────────►  /login page
        │                                                  │
   Session OK                              Enter email + password
        │                                                  │
        ▼                                         Submit form
  Render protected page                                    │
                                         POST /api/auth/signin
                                                           │
                                    ┌──── Invalid creds ───┘
                                    │    Show error toast
                                    │
                                    └──── Valid creds ──────►
                                         JWT stored in cookie
                                         Redirect to /dashboard
```

---

### 5.2 Customer Management

```
 ┌──────────────────────────────────────────────────────────────┐
 │  /customers  page                                            │
 │                                                              │
 │  ┌─────────────────────────────────────────────┐            │
 │  │  CustomerStats bar                          │            │
 │  │  [Total: 45] [Active: 42] [Inactive: 3]     │◄── GET /api/customers/stats
 │  └─────────────────────────────────────────────┘            │
 │                                                              │
 │  [Search box]  [+ Add Customer]                              │
 │                                                              │
 │  ┌─────────────────────────────────────────────┐            │
 │  │  CustomerTable (TanStack Table)             │◄── GET /api/customers?page=1&search=...
 │  │  Name | Phone | Address | Status | Actions │            │
 │  │  ─────────────────────────────────────────  │            │
 │  │  Ramesh P  9876... 12 MG Rd  Active  [✏][🗑]│            │
 │  │  Suresh K  9812... 5 Ring Rd Active  [✏][🗑]│            │
 │  │  ...                                        │            │
 │  │  [← Prev]  Page 1 of 5  [Next →]           │            │
 │  └─────────────────────────────────────────────┘            │
 └──────────────────────────────────────────────────────────────┘

 Click [+ Add Customer]
        │
        ▼
 ┌──────────────────────────────────┐
 │  CustomerForm (Dialog / Drawer) │
 │                                  │
 │  Full Name *                     │
 │  Phone *  (10-digit Indian)      │
 │  Address                         │
 │  Notes                           │
 │  ── Tiffin Defaults ──           │
 │  [✓] Morning  Qty [1] ₹[30]     │
 │  [✓] Evening  Qty [1] ₹[30]     │
 │                                  │
 │  [Cancel]  [Save]                │
 └──────────┬───────────────────────┘
            │
     Submit form
            │
     TanStack Form validates client-side (Zod mirror)
            │
     POST /api/customers
            │
   ┌────────┴────────┐
   │ 400 Validation  │  → show field errors inline
   │ 409 Dup phone   │  → toast "Phone already exists"
   │ 201 Created     │  → close modal, invalidate useCustomers cache
   └─────────────────┘

 Click [✏] Edit
        │ Pre-fill CustomerForm with existing data
        │ PATCH /api/customers/[id]

 Click [🗑] Deactivate
        │ Confirm dialog: "Deactivate Ramesh Patel?"
        │ DELETE /api/customers/[id]  → is_active: false
        │ Row disappears from active list

 Click row → /customers/[id]
 ┌─────────────────────────────────────────────────────────┐
 │  Customer Detail Page                                   │
 │                                                         │
 │  Profile card                  Tiffin Defaults card     │
 │  Name, Phone, Address          Morning / Evening config │
 │                                                         │
 │  Payment Summary                                        │
 │  Total Bill: ₹12,600                                    │
 │  Total Paid: ₹11,200           ◄── GET /api/payments/customer-summary/[id]
 │  Outstanding: ₹1,400                                    │
 │                                                         │
 │  Payment History list                                   │
 │  [May 1 – May 15]  ₹900  Paid  Cash  ✓                 │
 │  [Apr 1 – Apr 30]  ₹1800 Partial UPI ⚠                 │
 │                                                         │
 │  ── Bulk Copy Section ──                                │
 │  Copy entries from [date picker] to [date picker]       │
 └─────────────────────────────────────────────────────────┘
```

---

### 5.3 Tiffin Entries — Daily Workflow

```
 /tiffin-entries page
        │
        ▼
 Date picker (default: today)
        │
        ▼
 GET /api/tiffin-entries/preview?date=2026-05-15
        │
        ▼
 Preview API runs 3 parallel queries:
  [active customers] + [today's saved entries] + [fromDate entries if set]
        │
        ▼
 Builds preview rows with priority logic:
  saved entry > copied from date > customer defaults

 ┌───────────────────────────────────────────────────────────────┐
 │  Tiffin Entry Table (all active customers)                    │
 │                                                               │
 │  Customer     │ Morning      │ Evening      │ Paid            │
 │  ─────────────┼──────────────┼──────────────┼───────────────  │
 │  Ramesh Patel │ [✓] [1] ₹30  │ [✓] [1] ₹30  │ [M☐] [E☐]     │
 │  Suresh Kumar │ [✓] [2] ₹30  │ [☐] [0] ₹30  │ [M☐]           │
 │  Gita Sharma  │ [☐] [0] ₹30  │ [✓] [1] ₹35  │ [E☐]           │
 │                                                               │
 │         ★ has_existing_entry rows shown with green indicator  │
 │                                                               │
 │  [Copy From Previous Date]    [Save All Entries]             │
 └───────────────────────────────────────────────────────────────┘

 Click [Copy From Previous Date]
        │
        ▼
 ┌────────────────────────────────┐
 │  BulkCopyModal                 │
 │  Select source date: [2026-05-14]
 │  [Cancel]  [Load]              │
 └───────────────┬────────────────┘
                 │
                 ▼
 GET /api/tiffin-entries/preview?date=2026-05-15&fromDate=2026-05-14
                 │
 Table re-renders with source date values pre-filled
 (paid flags reset to false, has_existing_entry stays accurate)

 User edits quantities → Click [Save All Entries]
        │
        ▼
 POST /api/tiffin-entries/bulk
 Body: { entry_date: "2026-05-15", entries: [ 30 customer rows ] }
        │
 Rate limit: 20/min (bulk tier)
        │
 bulkWrite with upsert — creates new or updates existing per customer+date
        │
 Response: { inserted: 5, updated: 25, total: 30 }
        │
 Toast: "Saved 30 tiffin entries for 2026-05-15"
 Invalidate ['tiffin-entries', '2026-05-15'] cache
```

---

### 5.4 Payment Workflow

```
 /payments page
 ┌──────────────────────────────────────────────────────────────┐
 │  PaymentStats bar                                            │
 │  Collected: ₹45,000  Pending: ₹8,200  Partial: 5  Adv: ₹300 │
 │                                    ◄── GET /api/payments/stats│
 │  [Search] [Filter: Status ▼] [Date From] [Date To]          │
 │  [+ Record Payment]                                          │
 │                                                              │
 │  PaymentTable                                                │
 │  Customer   │ Date     │ Method │ Billed │ Paid │ Status     │
 │  ───────────┼──────────┼────────┼────────┼──────┼─────────── │
 │  Ramesh P   │ May 15   │ Cash   │ ₹900   │ ₹900 │ ✅ Paid    │
 │  Suresh K   │ May 10   │ UPI    │ ₹1800  │ ₹600 │ ⚠ Partial  │
 │  Gita S     │ May 1    │ —      │ ₹840   │ ₹0   │ 🔴 Pending │
 └──────────────────────────────────────────────────────────────┘

 Click [+ Record Payment]
        │
        ▼
 ┌────────────────────────────────────────┐
 │  PaymentForm                           │
 │                                        │
 │  Customer *  [Select ▼]               │
 │  Payment Date *  [2026-05-15]          │
 │  Billing Period  [May 1] to [May 15]   │
 │                                        │
 │  [Generate Bill] ← POST generate-bill │
 │                                        │
 │  Total Bill Amount *  [₹ 900]          │
 │  Paid Amount *        [₹ 900]          │
 │                                        │
 │  Status: ✅ Completed  (auto-calc)     │
 │  Remaining: ₹0         (auto-calc)     │
 │                                        │
 │  Method *  [Cash ▼]                   │
 │  Reference  [UPI ref...]               │
 │  Notes  [...]                          │
 │                                        │
 │  [Cancel]  [Save Payment]              │
 └──────────────────┬─────────────────────┘
                    │
             POST /api/payments
                    │
        ┌───────────┴───────────┐
        │ 201 Created           │  → close modal
        │ invalidate queries    │  → toast "Payment recorded"
        │                       │
        │ 400 Validation error  │  → show field errors
        └───────────────────────┘

 Click [Generate Bill] inside form:
        │
        POST /api/payments/generate-bill
        { customer_id, billing_start_date, billing_end_date }
        │
        Returns: { total_amount: 840, previous_pending: 60, final_payable: 900 }
        │
        Auto-fills "Total Bill Amount" field with final_payable

 Click row → PaymentDetailPanel (slide-in drawer)
        │
        GET /api/payments/[id]
        → Shows full details + edit inline
        │
        Click [Edit] → PATCH /api/payments/[id]
        Click [Delete] → DELETE /api/payments/[id]  (hard delete, confirm required)
```

---

### 5.5 Dashboard

```
 /dashboard
 ┌──────────────────────────────────────────────────────────────┐
 │                                                              │
 │   ┌────────────┐  ┌────────────┐  ┌────────────┐           │
 │   │ Today's    │  │ Revenue    │  │ Pending    │           │
 │   │ Tiffins    │  │ Today      │  │ Payments   │           │
 │   │   58       │  │  ₹1,740   │  │  ₹8,200   │           │
 │   └────────────┘  └────────────┘  └────────────┘           │
 │                                                              │
 │   ┌─────────────────────────────────────────────────────┐   │
 │   │  Customer Overview                                  │   │
 │   │  Total: 45  Active: 42  Inactive: 3                 │◄──── GET /api/customers/stats
 │   └─────────────────────────────────────────────────────┘   │
 │                                                              │
 │   ┌─────────────────────────────────────────────────────┐   │
 │   │  Payment Overview                                   │   │
 │   │  Collected: ₹45,000  Pending: ₹8,200                │◄──── GET /api/payments/stats
 │   │  Partial: 5 orders   Advance: ₹300                  │   │
 │   └─────────────────────────────────────────────────────┘   │
 └──────────────────────────────────────────────────────────────┘

Data loading: parallel React Query hooks
  useCustomerStats()  → GET /api/customers/stats
  usePaymentStats()   → GET /api/payments/stats
  useTiffinEntries(today) → GET /api/tiffin-entries?date=today
```

---

## 6. Data Models & Validation

### Customer (Zod schema)

```
createCustomerSchema:
  full_name   → string, min 2, max 100, trim
  phone       → string, regex /^[6-9]\d{9}$/ (10-digit Indian mobile)
  address     → string?, max 200, trim
  notes       → string?, max 500, trim
  tiffin_defaults:
    morning       → boolean
    morning_qty   → integer, min 1, max 10
    morning_price → number,  min 1, max 10000
    evening       → boolean
    evening_qty   → integer, min 1, max 10
    evening_price → number,  min 1, max 10000

updateCustomerSchema = createCustomerSchema.partial()  (all fields optional)
```

### Payment (Zod schema)

```
createPaymentSchema:
  customer_id        → string, min 1
  payment_date       → string, regex YYYY-MM-DD
  billing_start_date → string, regex YYYY-MM-DD
  billing_end_date   → string, regex YYYY-MM-DD
  total_bill_amount  → number, min 0
  paid_amount        → number, min 0
  payment_method     → enum: cash|upi|bank_transfer|cheque
  reference_number   → string?, max 100
  notes              → string?, max 500
  collected_by       → string?, max 100
  .refine: billing_end_date >= billing_start_date

updatePaymentSchema:
  paid_amount        → number?, min 0
  payment_method     → enum?
  payment_date       → string? YYYY-MM-DD
  reference_number   → string?
  notes              → string?
  collected_by       → string?

generateBillSchema:
  customer_id, billing_start_date, billing_end_date
  .refine: end >= start
```

### TiffinEntry (Zod schema)

```
bulkEntryInputSchema (per entry):
  customer_id   → string, min 1
  morning_qty   → integer, 0–10
  morning_price → number, 0–10000
  evening_qty   → integer, 0–10
  evening_price → number, 0–10000
  is_manual_price → boolean?, default false
  morning_paid    → boolean?, default false
  evening_paid    → boolean?, default false
  notes           → string?, max 500

bulkSaveSchema:
  entry_date → string, YYYY-MM-DD
  entries    → array of bulkEntryInputSchema, min 1, max 500
```

### Mongoose Indexes

```
customers:          phone (unique), text(full_name,phone), is_active, createdAt DESC
payments:           (customer_id,payment_date) compound, payment_date DESC,
                    payment_status, (billing_start_date,billing_end_date)
DailyTiffinEntry:   (customer_id,entry_date) unique compound,
                    entry_date DESC, customer_id
```

---

## 7. State Management Pattern

All server state lives in **TanStack React Query**. No global store (no Redux/Zustand/Context for data).

```
 Component
    │
    │  const { data, isLoading, error } = useCustomers({ page, search })
    │                                            │
    │                                     queryKey: ['customers', { page, search }]
    │                                     queryFn:  fetch('/api/customers?page=...')
    │
    │  const { mutate } = useCreateCustomer()
    │                              │
    │                       mutationFn: POST /api/customers
    │                       onSuccess:  queryClient.invalidateQueries(['customers'])
    │                                   queryClient.invalidateQueries(['customers','stats'])
    │
    ▼
```

**Cache invalidation map:**

| Mutation | Invalidates |
|---|---|
| Create/Update/Delete customer | `['customers']`, `['customers','stats']` |
| Create/Update/Delete payment | `['payments']`, `['payments','stats']` |
| Generate bill | `['payments','bill']` |
| Bulk save tiffin | `['tiffin-entries', date]`, `['tiffin-entries','preview', date]` |

**Query key conventions:**
```
['customers']               → list (with params in key object)
['customers', id]           → single
['customers', 'stats']      → stats
['payments']                → list
['payments', id]            → single
['payments', 'stats']       → stats
['payments', 'monthly', year, month]
['payments', 'summary', customerId]
['tiffin-entries', date]    → entries for date
['tiffin-entries', 'preview', date, fromDate]
```

---

## 8. Backup & Cron System

```
  Vercel Cron (19:30 IST = 14:00 UTC daily)
         │
         │  GET /api/cron/backup
         │  Authorization: Bearer CRON_SECRET
         │
         ▼
  ┌──────────────────────────────────────────────────────┐
  │  lib/backup/mongo-export.ts                         │
  │  exportCollections()                                │
  │  ├── connect MongoDB                               │
  │  ├── list all collection names                     │
  │  └── for each: collection.find({}).toArray()        │
  └──────────────────┬───────────────────────────────────┘
                     │
                     ▼
  ┌──────────────────────────────────────────────────────┐
  │  lib/backup/zip-generator.ts                        │
  │  generateBackupZip(filename, payload)               │
  │  ├── metadata.json: { date, version, db, counts }   │
  │  ├── customers.json: [ ... ]                        │
  │  ├── payments.json: [ ... ]                         │
  │  └── DailyTiffinEntry.json: [ ... ]                 │
  │  → fflate.zipSync() → Uint8Array → Buffer           │
  └──────────────────┬───────────────────────────────────┘
                     │
                     ▼
  ┌──────────────────────────────────────────────────────┐
  │  lib/backup/onedrive-upload.ts                      │
  │  uploadToOneDrive(buffer, remotePath)               │
  │  ├── POST /oauth2/v2.0/token (refresh token flow)   │
  │  │   → new access_token                             │
  │  └── PUT /v1.0/me/drive/root:/{path}:/content       │
  │      Content-Type: application/zip                  │
  │      → { web_url, size }                            │
  └──────────────────┬───────────────────────────────────┘
                     │
                     ▼
  OneDrive path: backups/{year}/{month}/backup-{YYYY-MM-DD}.zip

  ──────────────────────────────────────────────────────────

  Manual Restore:
  POST /api/backup/restore { date: "2026-05-15", collection?: "payments" }
         │
  lib/backup/restore.ts
  ├── downloadBackup(date)
  │   └── GET /v1.0/me/drive/root:/{path}:/content
  │       → decompress ZIP → parse JSONs
  │
  ├── restoreCollection(payload, name)
  │   ├── db.collection(name).drop()
  │   └── db.collection(name).insertMany(records)
  │
  └── restoreFullDatabase(payload)
      ├── for each collection: drop()
      └── for each collection: insertMany()
```

---

## 9. Error Handling Contract

```
 Route Handler
      │
      ├── checkAuth() → returns { error: Response } or { session }
      │   if error: return error  (401 Unauthorized)
      │
      ├── Zod parse → if !parsed.success
      │   return badRequest('Validation failed', parsed.error.flatten().fieldErrors)
      │   HTTP 400: { error: { code: 'VALIDATION_ERROR', details: { fieldName: ['msg'] } } }
      │
      ├── findById / findOne → if !doc
      │   return notFound('...')
      │   HTTP 404: { error: { code: 'NOT_FOUND' } }
      │
      ├── duplicate key → conflict('...')
      │   HTTP 409: { error: { code: 'CONFLICT' } }
      │
      └── try/catch → internalServerError(e)
          HTTP 500: { error: { code: 'INTERNAL_SERVER_ERROR', details: e.message } }
```

---

## 10. Rate Limiting Rules

```
  Algorithm: In-memory sliding window (Map<key, { count, resetAt }>)
  Scope:     Per IP address
  Window:    60 seconds (rolling)

  ┌───────────────────────────────────────────────────────────┐
  │  Request type            Key format     Max per 60s       │
  │  ─────────────────────── ─────────────  ──────────────    │
  │  GET (any endpoint)      read:{ip}      200               │
  │  POST/PATCH/PUT/DELETE   write:{ip}     50                │
  │  Any path with /bulk     bulk:{ip}      20                │
  └───────────────────────────────────────────────────────────┘

  Exceeded response:
  HTTP 429
  { success: false, error: { code: 'RATE_LIMIT_EXCEEDED',
    details: { retryAfter: 47 } } }  ← seconds until window resets
  Header: Retry-After: 47

  Exempt:
  /api/auth/*  — rate limiting skipped entirely (NextAuth handles this)

  ⚠ Note: Uses globalThis Map — works only on single Vercel instance.
    Multi-instance deployments need Redis-backed rate limiting.
```

---

## Environment Variables Reference

```bash
# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname

# NextAuth
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=<32+ byte random string, base64>

# Single admin user credentials
LOGIN_EMAIL=admin@example.com
LOGIN_PASSWORD=your_secure_password

# Cron job security token (sent by Vercel in Authorization header)
CRON_SECRET=<32+ byte random string, base64>

# Microsoft Graph (OneDrive backup)
ONEDRIVE_CLIENT_ID=<Azure AD application (client) ID>
ONEDRIVE_CLIENT_SECRET=<Azure AD client secret value>
ONEDRIVE_REFRESH_TOKEN=<OAuth2 long-lived refresh token with Files.ReadWrite.All>

# Optional
NEXT_API_BASE_URL=https://your-domain.vercel.app
```

---

## 11. TypeScript Type System

Every layer has its own type: Mongoose document interface → client-side API shape → query params → aggregation results.

### Type Layer Separation

```
 MongoDB Document          API Response (serialised)      Query Params
 ─────────────────         ────────────────────────       ─────────────
 ICustomer                 Customer                       CustomerQueryParams
   └─ extends Document       └─ _id: string                └─ page?, limit?
   └─ _id: ObjectId          └─ createdAt: string            search?, sort?

 IPayment                  Payment                        PaymentQueryParams
   └─ customer_id: ObjectId   └─ customer_id: string       └─ page?, limit?
   └─ payment_date: Date       └─ customer?: {...}            status?, start_date?
                                                              end_date?, customer_id?

 ITiffinEntry              TiffinEntry                    (date string param)
   └─ customer_id: ObjectId   └─ customer_id: string
   └─ entry_date: Date         └─ customer?: {...}
```

### All Enums

```typescript
// payment.type.ts
PaymentStatus = 'pending' | 'partial' | 'completed' | 'advance'
PaymentMethod = 'cash' | 'upi' | 'bank_transfer' | 'cheque'

// common.types.ts  (legacy, kept for BulkCopyModal compat)
PaymentMethod  = 'Cash' | 'Upi' | 'Cheque'
PaymentStatus  = 'PENDING' | 'COMPLETE' | 'PARTIAL'
TiffinShift    = 'morning' | 'evening' | 'both'
Month          = 'Jan' | 'Feb' | ... | 'Dec'
```

### Key Aggregation Result Interfaces

```typescript
// Customer stats (GET /api/customers/stats)
interface CustomerStats {
    total: number;       // countDocuments()
    active: number;      // countDocuments({ is_active: true })
    inactive: number;    // countDocuments({ is_active: false })
    outstanding: number; // always 0 here — real value from payments/stats
}

// Payment stats (GET /api/payments/stats)
interface PaymentStats {
    total_collected: number;  // $sum paid_amount (all records)
    total_pending: number;    // $sum remaining_amount where remaining > 0
    partial_count: number;    // $sum 1 where status = 'partial'
    advance_balance: number;  // $sum |remaining_amount| where status = 'advance'
}

// Customer payment summary (GET /api/payments/customer-summary/[id])
interface CustomerPaymentSummary {
    customer_id, full_name, phone, address
    total_bill: number;      // $sum TiffinEntry.total_amount (all-time)
    total_paid: number;      // $sum Payment.paid_amount (all-time)
    outstanding: number;     // max(0, total_bill - total_paid)
    advance_balance: number; // |remaining| where status = 'advance'
    payments: Payment[];     // full payment history, sorted date DESC
}

// Bill calculation result (POST /api/payments/generate-bill)
interface GenerateBillResult {
    total_entries: number;     // count of tiffin entries in range
    total_amount: number;      // sum of tiffin entry amounts in range
    previous_pending: number;  // unpaid from older billing periods
    advance_deduction: number; // credit from overpaid older periods
    final_payable: number;     // total_amount + previous_pending - advance_deduction
}

// Monthly report (GET /api/payments/monthly-report)
interface MonthlyReport {
    total_collected, total_pending, total_partial
    advance_count: number;    // count of advance payments in month
    payment_count: number;    // total payment records in month
    customer_count: number;   // unique customers who paid in month
    top_customers: [{ customer_id, full_name, paid }] // top 5 by amount
}

// Backup result (GET /api/cron/backup)
interface BackupResult {
    filename: string;          // "backup-2026-05-15.zip"
    onedrive_path: string;     // "backups/2026/05/backup-2026-05-15.zip"
    web_url: string;           // OneDrive share URL
    size_bytes: number;
    collections: { [name: string]: number };  // record counts
    total_records: number;
    export_errors: { [name: string]: string };
    duration_ms: number;
    generated_at: string;      // ISO timestamp
}

// Tiffin preview row (GET /api/tiffin-entries/preview)
interface TiffinPreviewRow {
    customer_id, name, address?
    morning, morning_qty, morning_price, morning_paid
    evening, evening_qty, evening_price, evening_paid
    has_existing_entry: boolean  // true = already saved for this date
}

// Bulk save response (POST /api/tiffin-entries/bulk)
{ inserted: number, updated: number, total: number }
```

### Deprecated Types (kept for backward compat)

```typescript
// types/tiffin.type.ts — DO NOT USE in new code
/** @deprecated Use TiffinPreviewRow */
type BulkPreviewRow = TiffinPreviewRow & { morning: boolean; evening: boolean; price: number }

/** @deprecated Use BulkSavePayload */
interface BulkSavePayloadLegacy {
    date: string
    entries: { customerId: string; morning: boolean; evening: boolean; price: number }[]
}
```

---

## 12. Complete Hook Reference

All hooks are `"use client"` — they run only in the browser.

### useCustomers hook family

```typescript
// ── QUERIES ────────────────────────────────────────────────────────────────

useCustomers(params: CustomerQueryParams)
  queryKey : ["customers", "list", params]
  queryFn  : GET /api/customers?page=&limit=&search=
  enabled  : always
  returns  : { data: CustomerListResponse, isLoading, error }

useCustomer(id: string)
  queryKey : ["customers", "detail", id]
  queryFn  : GET /api/customers/{id}
  enabled  : !!id   ← skipped if id is empty/undefined
  returns  : { data: CustomerResponse, isLoading, error }

useCustomerStats()
  queryKey : ["customers", "stats"]
  queryFn  : GET /api/customers/stats
  enabled  : always
  returns  : { data: StatsResponse }

// ── MUTATIONS ──────────────────────────────────────────────────────────────

useCreateCustomer()
  mutationFn : POST /api/customers  body: CreateCustomerInput
  onSuccess  : invalidateQueries(["customers"])
               (invalidates list + stats because key prefix matches)

useUpdateCustomer()
  mutationFn : PATCH /api/customers/{id}  body: UpdateCustomerInput
  onSuccess  : invalidateQueries(["customers"])
               invalidateQueries(["customers", "detail", id])

useDeleteCustomer()
  mutationFn : DELETE /api/customers/{id}
  onSuccess  : invalidateQueries(["customers"])
```

### usePayments hook family

```typescript
// ── QUERIES ────────────────────────────────────────────────────────────────

usePayments(params: PaymentQueryParams)
  queryKey : ["payments", "list", params]
  queryFn  : GET /api/payments?page=&limit=&search=&status=&start_date=&end_date=&customer_id=
  enabled  : always

usePayment(id: string)
  queryKey : ["payments", "detail", id]
  queryFn  : GET /api/payments/{id}
  enabled  : !!id

usePaymentStats()
  queryKey : ["payments", "stats"]
  queryFn  : GET /api/payments/stats

useCustomerPaymentSummary(customerId: string)
  queryKey : ["payments", "customer-summary", customerId]
  queryFn  : GET /api/payments/customer-summary/{customerId}
  enabled  : !!customerId

useMonthlyReport(year: number, month: number)
  queryKey : ["payments", "monthly-report", year, month]
  queryFn  : GET /api/payments/monthly-report?year={year}&month={month}

// ── MUTATIONS ──────────────────────────────────────────────────────────────

useCreatePayment()
  mutationFn : POST /api/payments  body: CreatePaymentInput
  onSuccess  : invalidateQueries(["payments"])

useUpdatePayment()
  mutationFn : PATCH /api/payments/{id}  body: UpdatePaymentInput
  onSuccess  : invalidateQueries(["payments"])
               invalidateQueries(["payments", "detail", id])

useDeletePayment()
  mutationFn : DELETE /api/payments/{id}
  onSuccess  : invalidateQueries(["payments"])

useGenerateBill()
  mutationFn : POST /api/payments/generate-bill  body: GenerateBillInput
  onSuccess  : (no cache invalidation — read-only calculation)
  note       : returns GenerateBillResult directly, not saved to DB
```

### useTiffinEntries hook family

```typescript
// ── QUERIES ────────────────────────────────────────────────────────────────

useTiffinEntries(date: string | null)
  queryKey  : ["tiffin-entries", "list", date]
  queryFn   : GET /api/tiffin-entries?date={date}
  enabled   : !!date
  note      : fetches already-saved entries only (not preview rows)

useTiffinPreview(date: string | null, fromDate?: string | null)
  queryKey  : ["tiffin-entries", "preview", date, fromDate ?? null]
  queryFn   : GET /api/tiffin-entries/preview?date={date}[&fromDate={fromDate}]
  enabled   : !!date
  staleTime : 30_000ms  ← preview stays fresh for 30s, avoids refetch on focus

// ── MUTATIONS ──────────────────────────────────────────────────────────────

useBulkSaveTiffinEntries()
  mutationFn : POST /api/tiffin-entries/bulk  body: BulkSavePayload
  onSuccess  : invalidateQueries(["tiffin-entries"])
               (invalidates both list and preview queries for all dates)
```

### Error handling in hooks

All hooks share the same `apiFetch` helper:
```typescript
async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...options })
    const json = await res.json()
    if (!res.ok) throw json   // ← throws the full ApiError object
    return json as T
}
// TanStack Query catches the thrown ApiError and puts it in error.message
// Components read: mutation.error?.message  or  query.error?.message
```

---

## 13. UI Component Tree & Rendering Hierarchy

### Full Component Tree

```
app/layout.tsx  (server component)
├── <html lang="en" className={sora.className}>
├── <SessionWrapper>           ← wraps NextAuth SessionProvider (client)
│   └── <TooltipProvider>      ← Radix UI tooltip context (client)
│
├── app/login/page.tsx         ← public route (no auth check)
│
└── app/(private)/layout.tsx   (server component)
    │   getServerSession(authOptions)
    │   → no session: redirect('/login?callbackUrl=...')
    │
    └── <AppShell>             ← client component, SidebarContext
        │   useState(open)     ← sidebar open/close state
        │   usePathname()      ← auto-close on mobile nav
        │
        ├── Mobile backdrop overlay (fixed, z-30)
        │
        ├── Sidebar wrapper div (transition-transform)
        │   └── <Sidebar>      ← client component
        │       ├── Logo + TiffinTrack title + toggle button
        │       ├── <nav> items:
        │       │   ├── Dashboard     /dashboard       (LayoutDashboard icon)
        │       │   ├── Customers     /customers       (Users icon)
        │       │   ├── Tiffin Entries  (collapsible group, UtensilsCrossed icon)
        │       │   │   └── Daily Entries /tiffin-entries  (CalendarDays icon)
        │       │   ├── Payments      /payments        (Wallet icon)
        │       │   ├── Expenses      /expenses        (ShoppingCart icon) ← page TBD
        │       │   └── Reports       /reports         (BarChart3 icon)    ← page TBD
        │       ├── Settings      /settings            (Settings icon)
        │       └── User profile bar (Admin / Owner avatar)
        │
        ├── Main content area (flex-1, overflow-hidden)
        │   └── {children} — one of:
        │       ├── app/(private)/dashboard/page.tsx
        │       ├── app/(private)/customers/page.tsx
        │       │   └── CustomerStats + CustomerTable + CustomerForm (Dialog)
        │       ├── app/(private)/customers/[id]/page.tsx
        │       │   └── CustomerDetailPanel + BulkCopySection
        │       ├── app/(private)/payments/page.tsx
        │       │   └── PaymentStats + PaymentTable + PaymentForm (Drawer/Dialog)
        │       └── app/(private)/tiffin-entries/page.tsx
        │           └── date picker + preview table + BulkCopyModal
        │
        └── <Toaster />  ← Sonner toast container (bottom-right)
```

### AppShell Responsive Behaviour

```
 Viewport < 768px (mobile)
 ┌────────────────────────────┐
 │  ☰  TiffinTrack            │  ← Sidebar hidden (translate-x-full)
 │  ──────────────────────── │
 │  [page content full width] │
 └────────────────────────────┘
         │
  User taps ☰ toggle
         │
 ┌─────────────────────────┬──┐
 │████████████████████████ │  │  ← Black overlay (z-30) behind sidebar
 │██ Sidebar (z-40) ██████ │  │  ← Sidebar slides in (translate-x-0)
 │████████████████████████ │  │
 └─────────────────────────┴──┘
         │
  User taps overlay OR navigates
         │
  close()  → setOpen(false)  → sidebar slides out
  (usePathname change triggers auto-close on mobile)

 Viewport ≥ 768px (desktop)
 ┌──────────────┬────────────────────────────┐
 │              │                            │
 │   Sidebar    │      Page content          │
 │   w-64       │      flex-1                │
 │  (part of    │                            │
 │  flex flow)  │                            │
 └──────────────┴────────────────────────────┘
         │
  User clicks toggle
         │
 ┌────────────────────────────┐
 │  Sidebar: w-0 overflow-hidden │  ← collapses to zero width
 │  Page content takes full width │
 └────────────────────────────┘
```

### Sidebar Active State Logic

```
Sidebar uses usePathname() to determine active state:

Simple links:
  isActive = pathname === href
  e.g. pathname "/payments" → isActive for Payments link

Tiffin group (collapsible):
  tiffinGroupActive = pathname.startsWith("/customers")
                   || pathname.startsWith("/tiffin-entries")

Child link active:
  isChildActive = pathname === childHref
               || (childHref === "/tiffin-entries" && pathname.startsWith("/tiffin-entries"))

Active style:   bg-white/10  text-white  icon: text-sidebar-primary
Inactive style: text-slate-400  hover:text-white  hover:bg-white/5
```

---

## 14. MongoDB Connection & Pooling

### Connection Pattern

```typescript
// lib/mongodb.ts

// Uses globalThis to survive HMR hot-reloads in dev
// and connection reuse across serverless invocations

global.mongooseCache = { conn: null, promise: null }

export async function dbConnect() {
    // 1. Already connected — return cached connection
    if (cached.conn) return cached.conn

    // 2. Connection in progress — wait for it
    if (!cached.promise) {
        cached.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false })
    }

    // 3. New connection — connect and cache
    cached.conn = await cached.promise
    return cached.conn
}
```

### Why `bufferCommands: false`

```
bufferCommands: false
  → Mongoose will NOT queue operations if connection is down
  → Operations fail immediately with an error
  → Prevents silent hangs in serverless cold starts
  → Each route handler calls dbConnect() before any DB operation
```

### Connection Lifecycle in Serverless

```
 Cold start (first request to a serverless instance)
        │
        ▼
  dbConnect() → cached.conn = null → mongoose.connect()
        │
  Connected → cached.conn = mongoose instance
        │
 Warm requests (same instance, within ~5 min)
        │
        ▼
  dbConnect() → cached.conn exists → return immediately (no reconnect)

 Different Vercel instance
        │
        ▼
  Fresh globalThis → cold start again
  (each Vercel function instance has its own globalThis)
```

---

## 15. Request / Response Examples

### Create Customer

```bash
POST /api/customers
Content-Type: application/json
Cookie: next-auth.session-token=...

{
  "full_name": "Ramesh Patel",
  "phone": "9876543210",
  "address": "12 MG Road, Ahmedabad",
  "tiffin_defaults": {
    "morning": true, "morning_qty": 1, "morning_price": 30,
    "evening": true, "evening_qty": 1, "evening_price": 30
  }
}

─── Success 201 ──────────────────────────────────────────────
{
  "success": true,
  "message": "Customer created successfully",
  "data": {
    "_id": "664abc123def456789012345",
    "full_name": "Ramesh Patel",
    "phone": "9876543210",
    "is_active": true,
    "tiffin_defaults": { ... },
    "createdAt": "2026-05-15T08:30:00.000Z",
    "updatedAt": "2026-05-15T08:30:00.000Z"
  },
  "error": null
}

─── Conflict 409 ─────────────────────────────────────────────
{
  "success": false,
  "message": "A customer with phone 9876543210 already exists",
  "data": null,
  "error": { "code": "CONFLICT" }
}

─── Validation 400 ───────────────────────────────────────────
{
  "success": false,
  "message": "Validation failed",
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "details": {
      "phone": ["Enter a valid 10-digit Indian mobile number"],
      "full_name": ["Name must be at least 2 characters"]
    }
  }
}
```

### Bulk Save Tiffin Entries

```bash
POST /api/tiffin-entries/bulk
Content-Type: application/json

{
  "entry_date": "2026-05-15",
  "entries": [
    { "customer_id": "664abc...", "morning_qty": 1, "morning_price": 30,
      "evening_qty": 1, "evening_price": 30, "morning_paid": false, "evening_paid": false },
    { "customer_id": "664def...", "morning_qty": 2, "morning_price": 30,
      "evening_qty": 0, "evening_price": 30 }
  ]
}

─── Success 200 ──────────────────────────────────────────────
{
  "success": true,
  "message": "Saved 2 tiffin entries for 2026-05-15",
  "data": { "inserted": 1, "updated": 1, "total": 2 },
  "error": null
}
```

### Generate Bill

```bash
POST /api/payments/generate-bill
Content-Type: application/json

{
  "customer_id": "664abc...",
  "billing_start_date": "2026-05-01",
  "billing_end_date": "2026-05-15"
}

─── Success 200 ──────────────────────────────────────────────
{
  "success": true,
  "message": "Bill calculated successfully",
  "data": {
    "customer_id": "664abc...",
    "customer_name": "Ramesh Patel",
    "billing_start_date": "2026-05-01",
    "billing_end_date": "2026-05-15",
    "total_entries": 28,
    "total_amount": 840,
    "previous_pending": 60,
    "advance_deduction": 0,
    "final_payable": 900
  },
  "error": null
}
```

### Record Payment

```bash
POST /api/payments
Content-Type: application/json

{
  "customer_id": "664abc...",
  "payment_date": "2026-05-15",
  "billing_start_date": "2026-05-01",
  "billing_end_date": "2026-05-15",
  "total_bill_amount": 900,
  "paid_amount": 600,
  "payment_method": "upi",
  "reference_number": "UPI2026051512345",
  "notes": "May first installment"
}

─── Success 201 ──────────────────────────────────────────────
{
  "success": true,
  "message": "Payment recorded successfully",
  "data": {
    "_id": "665xyz...",
    "customer_id": "664abc...",
    "payment_date": "2026-05-15T00:00:00.000Z",
    "total_bill_amount": 900,
    "paid_amount": 600,
    "remaining_amount": 300,
    "payment_method": "upi",
    "payment_status": "partial",
    "reference_number": "UPI2026051512345",
    "collected_by": "admin@example.com",
    "createdAt": "2026-05-15T09:00:00.000Z"
  },
  "error": null
}
```

### Paginated Payments with Filters

```bash
GET /api/payments?page=1&limit=10&status=partial&start_date=2026-05-01&end_date=2026-05-31

─── Success 200 ──────────────────────────────────────────────
{
  "success": true,
  "message": "Payments fetched",
  "data": [
    {
      "_id": "665xyz...",
      "customer_id": "664abc...",
      "payment_status": "partial",
      "paid_amount": 600,
      "remaining_amount": 300,
      "customer": {
        "_id": "664abc...",
        "full_name": "Ramesh Patel",
        "phone": "9876543210",
        "address": "12 MG Road"
      },
      ...
    }
  ],
  "meta": { "page": 1, "limit": 10, "total": 3, "totalPages": 1 },
  "error": null
}
```

### Rate Limit Exceeded

```bash
GET /api/customers  (201st request in 60 seconds from same IP)

─── 429 Too Many Requests ────────────────────────────────────
Retry-After: 47

{
  "success": false,
  "message": "Too many requests. Please slow down.",
  "data": null,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "details": { "retryAfter": 47 }
  }
}
```

---

## 16. Cross-Module Data Relationships

```
 ┌────────────────────────────────────────────────────────────┐
 │                    DATA RELATIONSHIPS                      │
 └────────────────────────────────────────────────────────────┘

  customers
  ──────────
  _id ──────────────────────────────────────────────────┐
  full_name, phone, address, notes                       │ ref
  is_active                                              │
  tiffin_defaults { morning_qty, morning_price, ... }    │
                                                         │
  DailyTiffinEntry                                       │
  ────────────────                                       │
  customer_id ◄─────────────────────────────────────────┘
  entry_date  ◄── unique together with customer_id       │
  morning_qty, morning_price                             │ used by
  evening_qty, evening_price                             │
  total_qty (= morning + evening)                        │
  total_amount (= qty>0 ? price : 0 per slot)            │
  morning_paid, evening_paid                             │
                           │                             │
                           │ aggregated by               │
                           ▼                             │
  payments                                               │
  ────────                                               │
  customer_id ◄──────────────────────────────────────────┘
  billing_start_date, billing_end_date
  total_bill_amount  ◄── from generate-bill (sum of tiffin entries in range)
  paid_amount        ◄── user enters manually
  remaining_amount   ← auto: total_bill - paid
  payment_status     ← auto: calcStatus(paid, total_bill)
  payment_method, reference_number, collected_by

 ┌─────────────────────────────────────────────────────────────┐
 │  KEY RULE: TiffinEntry.total_amount ≠ Payment.total_bill    │
 │                                                             │
 │  TiffinEntry records the PHYSICAL daily tiffin usage.      │
 │  Payment records the FINANCIAL transaction.                 │
 │                                                             │
 │  generate-bill bridges them: it sums TiffinEntry.total_amount│
 │  for a date range, adds prior pending balance, returns      │
 │  the recommended total_bill_amount for the payment form.    │
 │                                                             │
 │  The user can override the suggested amount before saving.  │
 └─────────────────────────────────────────────────────────────┘
```

### Data flow: daily tiffin → monthly billing

```
 Day 1–30 of May
    │
    │  (daily)  POST /api/tiffin-entries/bulk
    │           Saves: customer × date → { morning_qty, evening_qty, total_amount }
    │
    ▼
 End of May
    │
    │  (billing)  POST /api/payments/generate-bill
    │             { customer_id, start: May-01, end: May-31 }
    │             Aggregates: SUM(DailyTiffinEntry.total_amount) in range
    │             Checks: older unpaid balances (previous_pending)
    │             Returns: final_payable
    │
    ▼
 User reviews bill → enters paid_amount
    │
    │  POST /api/payments
    │  { total_bill_amount: final_payable, paid_amount: collected, ... }
    │  Server computes: remaining = bill - paid, status = calcStatus(...)
    │
    ▼
 Payment saved → visible in:
    ├── /api/payments/stats           (global totals)
    ├── /api/payments/customer-summary/[id]  (per-customer)
    └── /api/payments/monthly-report  (month aggregation)
```

---

## 17. Vercel Deployment Architecture

```
 vercel.json
 ┌─────────────────────────────────────────┐
 │  {                                      │
 │    "crons": [{                          │
 │      "path": "/api/cron/backup",        │
 │      "schedule": "30 19 * * *"          │
 │                  ─────────────          │
 │                  Min Hr  * * *          │
 │                  30  19  = 19:30 UTC    │
 │                  = 01:00 IST next day   │
 │    }]                                   │
 │  }                                      │
 └─────────────────────────────────────────┘
```

> **Important:** `"30 19 * * *"` is 19:30 UTC = **01:00 IST** (next calendar day, not 19:30 IST).
> To fire at 19:30 IST (UTC+5:30), the correct UTC cron would be `"0 14 * * *"` (14:00 UTC = 19:30 IST).
> The code comment in the file says "19:30 IST" but the schedule `"30 19 * * *"` fires at 19:30 UTC.
> Verify this matches your desired backup timing.

### Vercel Function Configuration

```
/api/cron/backup:
  export const maxDuration = 300   // 5 min (Pro plan); use 60 for Hobby
  export const dynamic = 'force-dynamic'
  export const runtime = 'nodejs'  // required for mongoose, Buffer, fflate

/api/backup/restore:
  export const maxDuration = 300
  export const dynamic = 'force-dynamic'
  export const runtime = 'nodejs'

All other API routes:
  runtime = 'nodejs' (default, via AGENTS.md instruction)
  No maxDuration set — default applies (10s Hobby, 60s Pro)
```

### Vercel Cron Security Model

```
 Vercel Cron Scheduler
        │
        │  GET /api/cron/backup
        │  Authorization: Bearer {CRON_SECRET}
        │  (Vercel automatically sends this header when it triggers the cron)
        │
        ▼
 Route handler validates:
   authHeader === "Bearer " + process.env.CRON_SECRET
       │
   Mismatch → 401  (protects against manual unauthorized calls)
   Match    → proceed with backup
```

---

## 18. Development Conventions

### Date Handling Rules

```
Rule 1 — DB stores UTC
  All dates in MongoDB are UTC midnight: new Date(Date.UTC(y, m-1, d))
  Never use new Date(isoString) directly — timezone shifts break it
  Always use: const [y, m, d] = iso.split('-').map(Number)
              new Date(Date.UTC(y, m - 1, d))

Rule 2 — API receives YYYY-MM-DD strings
  Dates travel over the wire as "2026-05-15" strings
  Parsed server-side to UTC Date objects before saving
  Sent back as ISO strings in JSON responses

Rule 3 — Backup filenames use IST
  toISTDateString(utcDate) = new Date(utcMs + 5.5h).toISOString().slice(0,10)
  Ensures backup label matches the IST business day, not UTC day
```

### Soft Delete vs Hard Delete

```
customers  → SOFT DELETE (is_active: false)
  - Data preserved for billing history
  - Excluded from GET /api/customers list (filter: { is_active: true })
  - Excluded from tiffin-entries preview
  - Still referenced by existing TiffinEntry and Payment records

payments   → HARD DELETE (findByIdAndDelete)
  - Permanent removal
  - Use with caution — affects customer outstanding balance calculations

TiffinEntry → UPSERT only (never deleted individually)
  - Bulk save uses updateOne + upsert: true
  - Effectively "overwrite" a day's entry by saving again
```

### Amount Calculation Rules

```
TiffinEntry.total_amount:
  = (morning_qty > 0 ? morning_price : 0)
  + (evening_qty > 0 ? evening_price : 0)
  → price only counted when qty > 0
  → a customer who skips morning still doesn't get charged morning_price

Payment.remaining_amount:
  = total_bill_amount - paid_amount
  → can be negative (advance case)

Payment.payment_status:
  paid <= 0              → "pending"
  paid > total_bill      → "advance"
  paid === total_bill    → "completed"
  else                   → "partial"

Bill generation: final_payable:
  = max(0, total_amount + previous_pending - advance_deduction)
  → can't go below zero
```

### Validation Rules Summary

```
Phone:         /^[6-9]\d{9}$/  (Indian mobile only — starts with 6,7,8,9)
Name:          2–100 chars, trimmed
Address:       max 200 chars
Notes:         max 500 chars
Qty:           integer 0–10 (tiffin) or 1–10 (defaults)
Price:         0–10000 (tiffin entries), 1–10000 (customer defaults)
Date strings:  /^\d{4}-\d{2}-\d{2}$/ (YYYY-MM-DD)
billing_end:   must be >= billing_start_date (Zod .refine)
```

---

## 19. Known Limitations & Notes

| # | Area | Limitation | Notes |
|---|------|-----------|-------|
| 1 | Rate limiting | In-memory Map on `globalThis` | Works for single Vercel instance. Multi-region / concurrent instances need Redis. |
| 2 | Session store | `globalThis.__ntSessionId` single string | Survives HMR but resets on cold start. New deploy = all sessions invalidated. |
| 3 | Cron schedule | `"30 19 * * *"` | This fires at 19:30 UTC = ~01:00 IST. Verify intent vs `"0 14 * * *"` for 19:30 IST. |
| 4 | Expenses page | `/expenses` in sidebar | Route not yet implemented — ShoppingCart link goes nowhere. |
| 5 | Reports page | `/reports` in sidebar | Route not yet implemented — BarChart3 link goes nowhere. |
| 6 | Settings page | `/settings` in sidebar | Route not yet implemented — Settings link goes nowhere. |
| 7 | Customer stats | `outstanding: 0` hardcoded | `GET /api/customers/stats` always returns `outstanding: 0`. Real outstanding is in `payments/stats`. |
| 8 | Backup restore | Full restore is destructive | Drops all collections before inserting. No rollback if insertMany fails mid-way. |
| 9 | Legacy tiffin routes | `app/api/tiffin/*` | Old routes still exist alongside `tiffin-entries/*`. New code should use `tiffin-entries/*` only. |
| 10 | Deprecated types | `BulkPreviewRow`, `BulkSavePayloadLegacy` | Kept for BulkCopyModal compatibility. Marked `@deprecated` in `types/tiffin.type.ts`. |
| 11 | `maxDuration: 300` | Vercel Pro required | Hobby plan caps functions at 60s. Backup/restore will time out on large databases on Hobby. |

---

## 20. Quick-Reference Card

```
┌─────────────────────────────────────────────────────────────────────┐
│                    QUICK API REFERENCE                              │
├──────────────────────────┬────────────────────────┬────────────────┤
│  Endpoint                │ Method  │ Auth          │  Rate tier    │
├──────────────────────────┼─────────┼───────────────┼───────────────┤
│  /api/customers          │ GET     │ session       │  read  200/m  │
│  /api/customers          │ POST    │ session       │  write  50/m  │
│  /api/customers/stats    │ GET     │ session       │  read  200/m  │
│  /api/customers/[id]     │ GET     │ session       │  read  200/m  │
│  /api/customers/[id]     │ PATCH   │ session       │  write  50/m  │
│  /api/customers/[id]     │ DELETE  │ session       │  write  50/m  │
├──────────────────────────┼─────────┼───────────────┼───────────────┤
│  /api/payments           │ GET     │ session       │  read  200/m  │
│  /api/payments           │ POST    │ session       │  write  50/m  │
│  /api/payments/stats     │ GET     │ session       │  read  200/m  │
│  /api/payments/[id]      │ GET     │ session       │  read  200/m  │
│  /api/payments/[id]      │ PATCH   │ session       │  write  50/m  │
│  /api/payments/[id]      │ DELETE  │ session       │  write  50/m  │
│  /api/payments/generate-bill    │ POST │ session  │  write  50/m  │
│  /api/payments/monthly-report   │ GET  │ session  │  read  200/m  │
│  /api/payments/customer-summary/[id] │ GET │ session│ read 200/m  │
├──────────────────────────┼─────────┼───────────────┼───────────────┤
│  /api/tiffin-entries     │ GET     │ session       │  read  200/m  │
│  /api/tiffin-entries/preview    │ GET │ session  │  read  200/m  │
│  /api/tiffin-entries/bulk       │ POST│ session  │  bulk   20/m  │
├──────────────────────────┼─────────┼───────────────┼───────────────┤
│  /api/cron/backup        │ GET     │ CRON_SECRET   │  (cron only)  │
│  /api/backup/restore     │ POST    │ session       │  write  50/m  │
├──────────────────────────┼─────────┼───────────────┼───────────────┤
│  /api/auth/[...nextauth] │ any     │ none          │  exempt       │
└──────────────────────────┴─────────┴───────────────┴───────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                 PAYMENT STATUS LOGIC                             │
│                                                                  │
│  paid <= 0            →  pending    (nothing collected)          │
│  0 < paid < total     →  partial    (some collected)             │
│  paid == total        →  completed  (fully settled)              │
│  paid > total         →  advance    (overpaid / credit)          │
│                                                                  │
│  remaining = total_bill - paid_amount  (can be negative)         │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                 TIFFIN AMOUNT RULE                               │
│                                                                  │
│  total_amount = (morning_qty > 0 ? morning_price : 0)            │
│              + (evening_qty  > 0 ? evening_price  : 0)           │
│                                                                  │
│  qty = 0  means "not delivered" — price is NOT charged           │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                 TIFFIN PREVIEW PRIORITY                          │
│                                                                  │
│  1. Saved entry for target date     (has_existing_entry: true)   │
│  2. Entry from fromDate if provided (has_existing_entry: false)  │
│  3. Customer tiffin_defaults        (has_existing_entry: false)  │
└──────────────────────────────────────────────────────────────────┘
```
