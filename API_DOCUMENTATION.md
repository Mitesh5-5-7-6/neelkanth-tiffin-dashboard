# Neelkanth Tiffin Dashboard — API Documentation

**Version**: 1.0  
**Base URL**: `/api`  
**Auth**: JWT via NextAuth (all routes unless noted)  
**Date format**: `YYYY-MM-DD` everywhere

---

## Table of Contents

1. [Global Conventions](#1-global-conventions)
2. [Authentication](#2-authentication)
3. [Customers](#3-customers)
4. [Tiffin Entries](#4-tiffin-entries)
5. [Payments](#5-payments)
6. [Grouped Payments (NTS v1)](#6-grouped-payments-nts-v1)
7. [Expenses](#7-expenses)
8. [Vendors](#8-vendors)
9. [Dashboard (Legacy)](#9-dashboard-legacy)
10. [Dashboard v2 (NTS v1)](#10-dashboard-v2-nts-v1)
11. [Backup & Restore](#11-backup--restore)
12. [Data Models](#12-data-models)
13. [Error Reference](#13-error-reference)

---

## 1. Global Conventions

### Rate Limits

| Operation type | Limit |
|---|---|
| Read (GET) | 200 req / min |
| Write (POST, PATCH, PUT, DELETE) | 50 req / min |
| Bulk operations | 20 req / min |

### Standard Response Envelope

Every response is wrapped in this envelope:

```json
// Success
{
  "success": true,
  "message": "Human-readable message",
  "data": { /* payload */ },
  "error": null,
  "meta": { /* pagination or extra info, optional */ }
}

// Error
{
  "success": false,
  "message": "Human-readable message",
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "details": { /* optional validation details */ }
  }
}
```

### Pagination Meta (list endpoints)

```json
{
  "page": 1,
  "limit": 10,
  "total": 42,
  "totalPages": 5
}
```

### MongoDB ObjectId

All `id` / `_id` / `*_id` fields are MongoDB ObjectId strings (24-char hex).

---

## 2. Authentication

### `POST /api/auth/[...nextauth]`

NextAuth credentials provider. Single-user system — credentials come from environment variables.

**Auth required**: No (public)

**Request body**

```json
{
  "email": "string   // must match LOGIN_EMAIL env var",
  "password": "string // must match LOGIN_PASSWORD env var"
}
```

**Success response** — HTTP 200

```json
{
  "user": {
    "id": "string",
    "email": "string",
    "name": "string",
    "role": "string",
    "sessionId": "string"
  }
}
```

**Notes**
- Comparison is timing-safe (prevents timing attacks).
- On success a JWT is issued and stored as an HTTP-only cookie.
- Session tracking is maintained in an in-memory store.

---

## 3. Customers

### `GET /api/customers`

List active customers with search and pagination.

**Query parameters**

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | number | 1 | Page number (1–1000) |
| `limit` | number | 10 | Records per page (1–100) |
| `search` | string | — | Regex search on `full_name` and `phone` |

**Success response** — HTTP 200

```json
{
  "data": [ /* Customer[] */ ],
  "meta": { "page": 1, "limit": 10, "total": 25, "totalPages": 3 }
}
```

**Notes**: Returns only `is_active: true` customers, sorted newest first.

---

### `POST /api/customers`

Create a new customer.

**Request body**

| Field | Type | Required | Rules |
|---|---|---|---|
| `full_name` | string | Yes | 2–100 chars |
| `phone` | string | Yes | 10-digit Indian mobile (starts 6–9) |
| `address` | string | No | Max 200 chars |
| `notes` | string | No | Max 500 chars |
| `tiffin_defaults.morning` | boolean | Yes | — |
| `tiffin_defaults.morning_qty` | number | Yes | 1–10 |
| `tiffin_defaults.morning_price` | number | Yes | 1–10000 |
| `tiffin_defaults.evening` | boolean | Yes | — |
| `tiffin_defaults.evening_qty` | number | Yes | 1–10 |
| `tiffin_defaults.evening_price` | number | Yes | 1–10000 |

**Success response** — HTTP 201

```json
{ "data": { /* Customer */ } }
```

**Error cases**

| HTTP | Code | Reason |
|---|---|---|
| 409 | `CONFLICT` | Phone number already registered |
| 422 | `VALIDATION_ERROR` | Invalid field values |

---

### `GET /api/customers/:id`

Fetch a single customer by ID.

**Success response** — HTTP 200 — returns full `Customer` object including `tiffin_defaults`.

**Error cases**

| HTTP | Code | Reason |
|---|---|---|
| 404 | `NOT_FOUND` | No customer with that ID |

---

### `PATCH /api/customers/:id`

Partially update a customer. All fields optional; same validation rules as POST.

**Notes**: Phone uniqueness is validated excluding the current customer.

**Success response** — HTTP 200 — returns updated `Customer`.

---

### `DELETE /api/customers/:id`

Soft-delete a customer (sets `is_active: false`). Data is preserved.

**Success response** — HTTP 200

```json
{ "data": null, "message": "Customer deleted" }
```

---

### `GET /api/customers/stats`

Aggregate customer counts.

**Success response** — HTTP 200

```json
{
  "data": {
    "total": 30,
    "active": 27,
    "inactive": 3,
    "outstanding": 0
  }
}
```

---

## 4. Tiffin Entries

### `GET /api/tiffin-entries`

Fetch all tiffin entries for a specific date, including customer details.

**Query parameters**

| Param | Type | Required | Description |
|---|---|---|---|
| `date` | string | Yes | `YYYY-MM-DD` |

**Success response** — HTTP 200

```json
{
  "data": [
    {
      "_id": "string",
      "customer_id": "string",
      "entry_date": "ISO date",
      "morning_qty": 2,
      "morning_price": 60,
      "morning_paid": false,
      "evening_qty": 1,
      "evening_price": 50,
      "evening_paid": true,
      "total_qty": 3,
      "total_amount": 170,
      "customer": {
        "full_name": "string",
        "phone": "string",
        "address": "string"
      }
    }
  ]
}
```

---

### `POST /api/tiffin-entries/bulk`

Upsert tiffin entries for a date (one entry per customer per date).

**Request body**

| Field | Type | Required | Rules |
|---|---|---|---|
| `entry_date` | string | Yes | `YYYY-MM-DD` |
| `entries` | array | Yes | 1–500 items |
| `entries[].customer_id` | string | Yes | Valid ObjectId |
| `entries[].morning_qty` | number | Yes | 0–10 |
| `entries[].morning_price` | number | Yes | 0–10000 |
| `entries[].evening_qty` | number | Yes | 0–10 |
| `entries[].evening_price` | number | Yes | 0–10000 |
| `entries[].is_manual_price` | boolean | No | — |
| `entries[].morning_paid` | boolean | No | — |
| `entries[].evening_paid` | boolean | No | — |
| `entries[].notes` | string | No | Max 500 chars |

**Success response** — HTTP 200

```json
{
  "data": {
    "inserted": 5,
    "updated": 3,
    "total": 8
  }
}
```

**Notes**: `total_qty` and `total_amount` are calculated server-side. `created_by` is set from the authenticated user's email.

---

### `GET /api/tiffin-entries/preview`

Generate a preview row per active customer for a target date using a 3-tier merge strategy:

1. Existing entry for `date` (if any) → use as-is
2. Entry from `fromDate` (if provided) → copy values, reset paid flags
3. Customer's `tiffin_defaults` → fallback

**Query parameters**

| Param | Type | Required | Description |
|---|---|---|---|
| `date` | string | Yes | Target date (`YYYY-MM-DD`) |
| `fromDate` | string | No | Source date to copy from |

**Success response** — HTTP 200

```json
{
  "data": [
    {
      "customer_id": "string",
      "name": "string",
      "address": "string",
      "morning": true,
      "morning_qty": 2,
      "morning_price": 60,
      "morning_paid": false,
      "evening": true,
      "evening_qty": 1,
      "evening_price": 50,
      "evening_paid": false,
      "has_existing_entry": true
    }
  ]
}
```

---

### `GET /api/tiffin` *(Legacy)*

Fetch tiffin entries for a date using the legacy tiffin model.

**Query parameters**: `date` (YYYY-MM-DD, required)

---

### `GET /api/tiffin/preview` *(Legacy)*

Preview for bulk copy from a source date.

**Query parameters**: `fromDate` (YYYY-MM-DD, required)

---

### `POST /api/tiffin/bulk` *(Legacy)*

Simplified bulk upsert with unified pricing.

**Request body**

```json
{
  "date": "YYYY-MM-DD",
  "entries": [
    {
      "customerId": "string",
      "morning": true,
      "evening": false,
      "price": 60
    }
  ]
}
```

---

## 5. Payments

### `GET /api/payments`

List payments with filtering, search, and pagination.

**Query parameters**

| Param | Type | Description |
|---|---|---|
| `page` | number | Default: 1 |
| `limit` | number | Default: 10, max: 100 |
| `search` | string | Customer `full_name` or `phone` |
| `status` | string | `pending` \| `partial` \| `completed` \| `advance` |
| `start_date` | string | `YYYY-MM-DD` filter |
| `end_date` | string | `YYYY-MM-DD` filter |
| `customer_id` | string | Filter by customer ObjectId |

**Success response** — HTTP 200 — array of Payment objects with embedded customer details + pagination meta.

---

### `POST /api/payments`

Record a new payment.

**Request body**

| Field | Type | Required | Rules |
|---|---|---|---|
| `customer_id` | string | Yes | Valid ObjectId |
| `payment_date` | string | Yes | `YYYY-MM-DD` |
| `billing_start_date` | string | Yes | `YYYY-MM-DD` |
| `billing_end_date` | string | Yes | `YYYY-MM-DD`, must be ≥ `billing_start_date` |
| `total_bill_amount` | number | Yes | ≥ 0 |
| `paid_amount` | number | Yes | ≥ 0 |
| `payment_method` | string | Yes | `cash` \| `upi` \| `bank_transfer` \| `cheque` |
| `reference_number` | string | No | Max 100 chars |
| `notes` | string | No | Max 500 chars |
| `collected_by` | string | No | Defaults to authenticated user's email |

**Server-calculated fields**

| Field | Calculation |
|---|---|
| `remaining_amount` | `total_bill_amount - paid_amount` |
| `payment_status` | `paid = 0` → `pending`; `0 < paid < total` → `partial`; `paid = total` → `completed`; `paid > total` → `advance` |

**Success response** — HTTP 201

```json
{ "data": { /* Payment */ } }
```

---

### `GET /api/payments/:id`

Fetch a single payment with embedded customer info.

**Success response** — HTTP 200 — full Payment object.

---

### `PATCH /api/payments/:id`

Partially update a payment. Recalculates `remaining_amount` and `payment_status` automatically.

**Request body** (all optional)

| Field | Type |
|---|---|
| `paid_amount` | number |
| `payment_method` | string |
| `payment_date` | string |
| `reference_number` | string |
| `notes` | string |
| `collected_by` | string |

**Success response** — HTTP 200 — updated Payment object.

---

### `DELETE /api/payments/:id`

Hard-delete a payment record (permanent).

**Success response** — HTTP 200

```json
{ "data": null, "message": "Payment deleted" }
```

---

### `GET /api/payments/stats`

Aggregate payment totals.

**Success response** — HTTP 200

```json
{
  "data": {
    "total_collected": 125000,
    "total_pending": 8400,
    "partial_count": 5,
    "advance_balance": 1200
  }
}
```

---

### `GET /api/payments/customer-summary/:customerId`

Full financial summary for a customer.

**Success response** — HTTP 200

```json
{
  "data": {
    "customer_id": "string",
    "full_name": "string",
    "phone": "string",
    "address": "string",
    "total_bill": 15000,
    "total_paid": 12000,
    "outstanding": 3000,
    "advance_balance": 0,
    "payments": [ /* Payment[] */ ]
  }
}
```

**Notes**: `outstanding` is floored at 0; advance balance is separately reported.

---

### `GET /api/payments/monthly-report`

Monthly financial report.

**Query parameters**

| Param | Type | Default |
|---|---|---|
| `year` | number | Current year |
| `month` | number (1–12) | Current month |

**Success response** — HTTP 200

```json
{
  "data": {
    "year": 2026,
    "month": 5,
    "total_collected": 98000,
    "total_pending": 4200,
    "total_partial": 3,
    "advance_count": 1,
    "payment_count": 45,
    "customer_count": 28,
    "top_customers": [
      { "customer_id": "string", "full_name": "string", "paid": 8000 }
    ]
  }
}
```

**Notes**: `top_customers` is limited to 5 records, sorted by `paid` descending.

---

### `POST /api/payments/generate-bill`

Calculate a bill for a customer over a date range, incorporating carryforward balances.

**Request body**

| Field | Type | Required | Rules |
|---|---|---|---|
| `customer_id` | string | Yes | Valid ObjectId |
| `billing_start_date` | string | Yes | `YYYY-MM-DD` |
| `billing_end_date` | string | Yes | `YYYY-MM-DD`, must be ≥ start |

**Success response** — HTTP 200

```json
{
  "data": {
    "customer_id": "string",
    "customer_name": "string",
    "billing_start_date": "2026-05-01",
    "billing_end_date": "2026-05-25",
    "total_entries": 22,
    "total_amount": 7920,
    "previous_pending": 500,
    "advance_deduction": 0,
    "final_payable": 8420
  }
}
```

**Notes**: Algorithm: `final_payable = total_amount + previous_pending - advance_deduction`.

---

## 6. Grouped Payments (NTS v1)

This is the newer tiffin-entry-based payment system. Payments are linked directly to individual tiffin entries and sync the `morning_paid` / `evening_paid` flags bidirectionally.

---

### `POST /api/nts/v1/payments`

Record a payment against a specific tiffin entry.

**Request body**

| Field | Type | Required | Rules |
|---|---|---|---|
| `customerId` | string | Yes | Valid ObjectId |
| `tiffinEntryId` | string | Yes | Valid ObjectId |
| `amount` | number | Yes | ≥ 0 |
| `paymentMethod` | string | Yes | `cash` \| `upi` \| `bank_transfer` \| `cheque` |
| `paymentFor` | string | Yes | `MORNING` \| `EVENING` \| `FULL_DAY` |
| `notes` | string | No | Max 500 chars |

**Success response** — HTTP 201

```json
{
  "data": {
    "paymentId": "string",
    "entryId": "string",
    "syncedFlags": {
      "morning_paid": true,
      "evening_paid": false
    }
  }
}
```

**Notes**: Creates a Payment record with `billing_start_date = billing_end_date` (single-day). Updates `morning_paid` / `evening_paid` on the TiffinEntry.

---

### `GET /api/nts/v1/payments/grouped`

Paginated list of customers grouped with their tiffin entry payment status.

**Query parameters**

| Param | Type | Default | Description |
|---|---|---|---|
| `startDate` | string | Month start | `YYYY-MM-DD` |
| `endDate` | string | Today | `YYYY-MM-DD` |
| `customerId` | string | — | Filter to one customer |
| `status` | string | — | `PAID` \| `PARTIAL` \| `PENDING` |
| `search` | string | — | Customer name or phone |
| `page` | number | 1 | — |
| `limit` | number | 20 | Max: 100 |

**Success response** — HTTP 200

```json
{
  "data": {
    "customers": [
      {
        "customerId": "string",
        "customerName": "string",
        "phone": "string",
        "address": "string",
        "totalAmount": 3600,
        "totalPaid": 2400,
        "totalPending": 1200,
        "entryCount": 18,
        "status": "PARTIAL",
        "entries": [
          {
            "entryId": "string",
            "date": "2026-05-25T00:00:00.000Z",
            "morningQty": 2,
            "morningPrice": 60,
            "morningPaid": true,
            "eveningQty": 1,
            "eveningPrice": 50,
            "eveningPaid": false,
            "totalAmount": 170,
            "paidAmount": 120,
            "pendingAmount": 50,
            "status": "PARTIAL"
          }
        ]
      }
    ],
    "summary": {
      "totalCustomers": 12,
      "totalAmount": 43200,
      "totalPaid": 38000,
      "totalPending": 5200
    }
  },
  "meta": { "page": 1, "limit": 20, "total": 12, "totalPages": 1 }
}
```

**Notes**: Entry `status` is derived from `morning_paid` / `evening_paid` flags. Customers sorted alphabetically by name.

---

### `PATCH /api/nts/v1/payments/:entryId/status`

Toggle morning/evening paid status on a tiffin entry. Recalculates amounts in place.

**Path parameter**: `entryId` — TiffinEntry ObjectId

**Request body**

| Field | Type | Required | Description |
|---|---|---|---|
| `morningStatus` | string | No | `PAID` \| `PENDING` |
| `eveningStatus` | string | No | `PAID` \| `PENDING` |
| `paymentMethod` | string | No | `cash` \| `upi` \| `bank_transfer` \| `cheque` |
| `notes` | string | No | — |

**Success response** — HTTP 200

```json
{
  "data": {
    "entryId": "string",
    "morning_paid": true,
    "evening_paid": false,
    "totalAmount": 170,
    "paidAmount": 120,
    "pendingAmount": 50,
    "status": "PARTIAL"
  }
}
```

---

## 7. Expenses

### `GET /api/expenses`

List expenses with multi-field filtering and pagination.

**Query parameters**

| Param | Type | Description |
|---|---|---|
| `page` | number | Default: 1 |
| `limit` | number | Default: 15, max: 100 |
| `search` | string | `title`, `vendor_name`, `notes` |
| `category` | string | See category enum below |
| `status` | string | `PENDING` \| `PAID` \| `PARTIAL` \| `CANCELLED` |
| `payment_method` | string | `cash` \| `upi` \| `bank_transfer` \| `cheque` \| `credit` |
| `start_date` | string | `YYYY-MM-DD` |
| `end_date` | string | `YYYY-MM-DD` |
| `vendor_id` | string | ObjectId |
| `is_recurring` | string | `"true"` \| `"false"` |

**Expense category enum**

`RAW_MATERIAL`, `VEGETABLES`, `MILK`, `GAS`, `SALARY`, `DELIVERY`, `TRANSPORT`, `RENT`, `ELECTRICITY`, `INTERNET`, `PACKAGING`, `MARKETING`, `MAINTENANCE`, `SOFTWARE`, `MISC`

**Notes**: Soft-deleted expenses (`is_deleted: true`) are always excluded.

---

### `POST /api/expenses`

Create a new expense.

**Request body**

| Field | Type | Required | Rules |
|---|---|---|---|
| `title` | string | Yes | 2–100 chars |
| `description` | string | No | Max 500 chars |
| `expense_category` | string[] | Yes | At least 1 value from enum |
| `expense_subcategory` | string[] | No | Each max 100 chars |
| `expense_date` | string | Yes | `YYYY-MM-DD` |
| `amount` | number | Yes | > 0 |
| `payment_method` | string | Yes | `cash` \| `upi` \| `bank_transfer` \| `cheque` \| `credit` |
| `vendor_id` | string | No | Valid ObjectId |
| `vendor_name` | string | No | Max 100 chars |
| `invoice_number` | string | No | Max 100 chars |
| `receipt_url` | string | No | Valid URL or empty string |
| `is_recurring` | boolean | No | Default: `false` |
| `recurring_type` | string | No | `DAILY` \| `WEEKLY` \| `MONTHLY` \| `YEARLY` |
| `expense_status` | string | No | Default: `PAID` |
| `paid_by` | string | No | Max 100 chars |
| `notes` | string | No | Max 500 chars |

**Success response** — HTTP 201

```json
{ "data": { /* Expense with auto-generated expense_code */ } }
```

**Side effects**: Creates an `ExpenseLedger` entry with event type `EXPENSE_CREATED`.

---

### `GET /api/expenses/:id`

Fetch a single expense (returns 404 if soft-deleted).

---

### `PATCH /api/expenses/:id`

Partially update an expense. All fields optional, same validation as POST.

**Side effects**: Creates an `ExpenseLedger` entry tracking status changes.

---

### `DELETE /api/expenses/:id`

Soft-delete an expense.

Sets `is_deleted: true`, `deleted_at: now()`, `deleted_by: user email`.

**Side effects**: Creates an `ExpenseLedger` entry with event type `EXPENSE_CANCELLED`.

**Success response** — HTTP 200

```json
{ "data": null, "message": "Expense deleted" }
```

---

### `GET /api/expenses/stats`

Expense analytics for a date range vs. previous period.

**Query parameters**

| Param | Type | Default |
|---|---|---|
| `start_date` | string | Month start |
| `end_date` | string | Today |

**Success response** — HTTP 200

```json
{
  "data": {
    "total_expense": 45000,
    "daily_average": 1800,
    "total_transactions": 25,
    "top_category": { "category": "VEGETABLES", "amount": 12000, "percentage": 26.7 },
    "prev_total_expense": 42000,
    "prev_total_transactions": 23,
    "today_expense": 1200,
    "monthly_expense": 45000,
    "pending_vendor_payments": 3500,
    "category_breakdown": [
      { "category": "VEGETABLES", "amount": 12000, "percentage": 26.7 }
    ],
    "payment_method_breakdown": [
      { "method": "cash", "amount": 30000, "percentage": 66.7 }
    ],
    "recent_expenses": [ /* 5 most recent Expense[] */ ],
    "start_date": "2026-05-01",
    "end_date": "2026-05-25",
    "days_in_period": 25
  }
}
```

**Notes**: Category breakdown uses only the first tag per expense to avoid double-counting. Previous period spans the same number of days immediately before `start_date`.

---

## 8. Vendors

### `GET /api/vendors`

List vendors with filtering.

**Query parameters**

| Param | Type | Description |
|---|---|---|
| `page` | number | Default: 1 |
| `limit` | number | Default: 20, max: 100 |
| `search` | string | Name or phone |
| `vendor_type` | string | See vendor type enum |
| `is_active` | string | `"true"` \| `"false"` |

**Vendor type enum**

`Vegetable Supplier`, `Milk Supplier`, `Gas Agency`, `Packaging Vendor`, `Internet Provider`, `Electrician`, `Delivery Partner`, `Software Vendor`, `Miscellaneous`

**Success response** — HTTP 200 — array sorted alphabetically by `name`.

---

### `POST /api/vendors`

Create a vendor.

**Request body**

| Field | Type | Required | Rules |
|---|---|---|---|
| `name` | string | Yes | 2–100 chars |
| `phone` | string | No | 10-digit Indian format or empty |
| `alternate_phone` | string | No | 10-digit Indian format or empty |
| `address` | string | No | Max 300 chars |
| `vendor_type` | string | Yes | From enum above |
| `payment_terms` | string | No | Max 200 chars |
| `notes` | string | No | Max 500 chars |

**Success response** — HTTP 201 — Vendor with auto-generated `vendor_code` (timestamp-based).

---

### `GET /api/vendors/:id`

Fetch a single vendor.

---

### `PATCH /api/vendors/:id`

Partially update a vendor (all fields optional).

---

### `DELETE /api/vendors/:id`

Soft-delete a vendor (sets `is_active: false`).

---

## 9. Dashboard (Legacy)

All endpoints require auth. No query parameters accepted (always "today" context).

### `GET /api/dashboard/stats`

Day-over-day KPIs.

```json
{
  "data": {
    "todayTiffin":   { "total": 48, "morning": 30, "evening": 18, "vsYesterday": 6.7 },
    "todayRevenue":  { "amount": 8640, "vsYesterday": -2.1 },
    "todayExpense":  { "amount": 1200, "vsYesterday": 15.0 },
    "todayProfit":   { "amount": 7440, "vsYesterday": -4.3 },
    "pendingPayments": { "amount": 8400, "customerCount": 5 }
  }
}
```

`vsYesterday` is percentage change.

---

### `GET /api/dashboard/tiffin-trend`

Last 7 days tiffin count by session.

```json
{
  "data": [
    { "date": "Mon", "morning": 28, "evening": 15 }
  ]
}
```

---

### `GET /api/dashboard/revenue-expense`

Last 7 days revenue vs expense.

```json
{
  "data": [
    { "date": "Mon", "revenue": 6000, "expense": 900 }
  ]
}
```

---

### `GET /api/dashboard/expense-categories`

Current month expense breakdown by category.

```json
{
  "data": [
    { "category": "VEGETABLES", "amount": 12000 }
  ]
}
```

---

### `GET /api/dashboard/recent-tiffins`

10 most recent tiffin entries.

```json
{
  "data": [
    { "id": "string", "date": "string", "customer": "string", "morning": 2, "evening": 1, "total": 3, "amount": 170 }
  ]
}
```

---

### `GET /api/dashboard/recent-expenses`

10 most recent expenses.

```json
{
  "data": [
    { "id": "string", "date": "string", "category": "string", "description": "string", "amount": 500 }
  ]
}
```

---

### `GET /api/dashboard/pending-payments`

Customers with outstanding balances.

```json
{
  "data": [
    { "id": "string", "customer": "string", "avatar": "AB", "pendingAmount": 1400, "lastPayment": "string", "daysOverdue": 7 }
  ]
}
```

---

### `GET /api/dashboard/top-customers`

Top 5 customers by tiffin amount this month.

```json
{
  "data": [
    { "rank": 1, "name": "string", "avatar": "AB", "totalTiffins": 48, "totalAmount": 8640 }
  ]
}
```

---

## 10. Dashboard v2 (NTS v1)

Enhanced dashboard endpoints that accept flexible date ranges. Uses cash-basis accounting (Payment.paid_amount) instead of accrual.

**Base path**: `/api/nts/v1/dashboard`

**Common query parameters**

| Param | Type | Description |
|---|---|---|
| `fromDate` | string | `YYYY-MM-DD` (optional) |
| `toDate` | string | `YYYY-MM-DD` (optional) |
| `range` | string | `DAY` \| `WEEK` \| `MONTH` (optional, defaults to current period) |

---

### `GET /api/nts/v1/dashboard/stats`

Same shape as legacy `/api/dashboard/stats` but respects the custom date range.

---

### `GET /api/nts/v1/dashboard/tiffin-trend`

One data point per day in the requested range (not capped at 7).

```json
{
  "data": [
    { "date": "Mon", "iso": "2026-05-19", "morning": 28, "evening": 15 }
  ]
}
```

---

### `GET /api/nts/v1/dashboard/revenue-expense`

Revenue (accrual) vs expense per day in range.

---

### `GET /api/nts/v1/dashboard/expense-categories`

Category breakdown for the requested date range.

---

### `GET /api/nts/v1/dashboard/recent-tiffins`

**Extra query param**: `limit` (default: 10, max: 50)

Recent tiffin entries within the date range.

---

### `GET /api/nts/v1/dashboard/recent-expenses`

**Extra query param**: `limit` (default: 10, max: 50)

Recent expenses within the date range.

---

### `GET /api/nts/v1/dashboard/pending-payments`

Same as legacy — no date filtering.

---

### `GET /api/nts/v1/dashboard/top-customers`

Top 5 customers by tiffin amount within the date range.

---

### `GET /api/nts/v1/dashboard/month-summary`

Current calendar month summary vs last month.

```json
{
  "data": {
    "tiffins":         { "total": 820, "avgPerDay": 32.8, "vsLastMonth": 4.2 },
    "revenue":         { "amount": 147600, "vsLastMonth": 6.1 },
    "expense":         { "amount": 42000, "vsLastMonth": -3.5 },
    "profit":          { "amount": 105600, "vsLastMonth": 9.8 },
    "activeCustomers": 27,
    "activeDays":      25
  }
}
```

---

## 11. Backup & Restore

### `GET /api/cron/backup`

Export all MongoDB collections, compress to ZIP, and upload to OneDrive.

**Auth**: Cron secret — `Authorization: Bearer <CRON_SECRET>` (not JWT)

**Success response** — HTTP 200

```json
{
  "success": true,
  "message": "Backup completed",
  "data": {
    "filename": "backup-2026-05-25.zip",
    "onedrive_path": "/Backups/2026/05/",
    "web_url": "https://...",
    "size_bytes": 204800,
    "collections": {
      "customers": 30,
      "tiffinEntries": 450,
      "payments": 120,
      "expenses": 95,
      "vendors": 8
    },
    "total_records": 703,
    "export_errors": {},
    "duration_ms": 4200,
    "generated_at": "2026-05-25T03:30:00.000Z"
  }
}
```

**Notes**: `maxDuration` is 300 s (Vercel Pro). Folder structure uses IST-based date strings. Data is exported as EJSON.

---

### `POST /api/backup/restore`

Download a backup from OneDrive and restore it.

**Auth**: Required (JWT)

**Request body**

| Field | Type | Required | Description |
|---|---|---|---|
| `date` | string | Yes | `YYYY-MM-DD` — which backup file to restore |
| `collection` | string | No | If provided, restores only this collection; omit for full restore |

**Success response** — HTTP 200

```json
{
  "success": true,
  "message": "Restore completed",
  "data": {
    "restoreType": "single_collection",
    "collectionName": "customers",
    "documentsRestored": 30
  },
  "duration_ms": 8100
}
```

**Notes**: `maxDuration` is 300 s. Full restore replaces all documents in all collections.

---

## 12. Data Models

### Customer

```typescript
{
  _id:             ObjectId
  full_name:       string
  phone:           string          // unique
  address?:        string
  notes?:          string
  is_active:       boolean         // default: true
  tiffin_defaults: {
    morning:       boolean
    morning_qty:   number          // 1–10
    morning_price: number
    evening:       boolean
    evening_qty:   number          // 1–10
    evening_price: number
  }
  createdAt:       Date
  updatedAt:       Date
}
```

### TiffinEntry

```typescript
{
  _id:             ObjectId
  customer_id:     ObjectId        // ref: Customer, unique per date
  entry_date:      Date
  morning_qty:     number          // 0–10
  morning_price:   number
  morning_paid:    boolean
  evening_qty:     number          // 0–10
  evening_price:   number
  evening_paid:    boolean
  total_qty:       number          // calculated
  total_amount:    number          // calculated
  is_manual_price: boolean
  notes?:          string
  created_by?:     string          // user email
  createdAt:       Date
  updatedAt:       Date
}
```

### Payment

```typescript
{
  _id:                ObjectId
  customer_id:        ObjectId        // ref: Customer
  payment_date:       Date
  billing_start_date: Date
  billing_end_date:   Date
  total_bill_amount:  number
  paid_amount:        number
  remaining_amount:   number          // calculated
  payment_method:     'cash' | 'upi' | 'bank_transfer' | 'cheque'
  payment_status:     'pending' | 'partial' | 'completed' | 'advance'
  reference_number?:  string
  notes?:             string
  collected_by?:      string          // user email
  createdAt:          Date
  updatedAt:          Date
}
```

### Expense

```typescript
{
  _id:                  ObjectId
  expense_code:         string          // unique, auto-generated
  title:                string
  description?:         string
  expense_category:     string[]        // at least 1
  expense_subcategory?: string[]
  expense_date:         Date
  amount:               number
  payment_method:       'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'credit'
  vendor_id?:           ObjectId        // ref: Vendor
  vendor_name?:         string
  invoice_number?:      string
  receipt_url?:         string
  is_recurring:         boolean
  recurring_type?:      'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
  expense_status:       'PENDING' | 'PAID' | 'PARTIAL' | 'CANCELLED'
  paid_by?:             string
  notes?:               string
  created_by?:          string
  is_deleted:           boolean
  deleted_at?:          Date
  deleted_by?:          string
  createdAt:            Date
  updatedAt:            Date
}
```

### Vendor

```typescript
{
  _id:             ObjectId
  vendor_code:     string          // unique, auto-generated
  name:            string
  phone?:          string
  alternate_phone?: string
  address?:        string
  vendor_type:     string          // from vendor type enum
  payment_terms?:  string
  is_active:       boolean         // default: true
  notes?:          string
  createdAt:       Date
  updatedAt:       Date
}
```

---

## 13. Error Reference

| HTTP | Code | Description |
|---|---|---|
| 400 | `BAD_REQUEST` | Missing required parameter or malformed request |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Valid token but insufficient permissions |
| 404 | `NOT_FOUND` | Resource does not exist |
| 409 | `CONFLICT` | Unique constraint violation (e.g. duplicate phone) |
| 422 | `VALIDATION_ERROR` | Zod validation failed; `details` contains field-level errors |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests — see rate limit table |
| 500 | `INTERNAL_SERVER_ERROR` | Unexpected server error |

**Validation error detail example**

```json
{
  "success": false,
  "message": "Validation failed",
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "details": {
      "phone": ["Invalid phone number format"],
      "tiffin_defaults.morning_qty": ["Number must be between 1 and 10"]
    }
  }
}
```

---

*Generated: 2026-05-25 | Project: Neelkanth Tiffin Dashboard*
