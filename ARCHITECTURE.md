# Neelkanth Tiffin — Production Architecture Upgrade

> Target: Feature-Driven + Domain-Driven Architecture
> Status: Upgrade Plan (2026)
> Replaces: NextAuth + scattered utils pattern

---

## Table of Contents

1. [Why Upgrade](#1-why-upgrade)
2. [Layer Separation Principles](#2-layer-separation-principles)  ← **Read this first**
3. [New Project Structure](#3-new-project-structure)
4. [Auth Module — Custom JWT](#4-auth-module--custom-jwt)
5. [Database Layer — Connection & Repositories](#5-database-layer--connection--repositories)
6. [Customer Module — Identity Layer](#6-customer-module--identity-layer)
7. [Tiffin Module — Immutable Entries](#7-tiffin-module--immutable-entries)
8. [Billing Engine](#8-billing-engine)
9. [Payment Module](#9-payment-module)
10. [Customer Summary API — Computed Read Layer](#10-customer-summary-api--computed-read-layer)
11. [Master Ledger System](#11-master-ledger-system)
12. [Reports Module](#12-reports-module)
13. [Query Factory & Cache Strategy](#13-query-factory--cache-strategy)
14. [Typed API Client](#14-typed-api-client)
15. [UI Architecture](#15-ui-architecture)
16. [Backup System Upgrade](#16-backup-system-upgrade)
17. [Security Hardening](#17-security-hardening)
18. [TypeScript Conventions](#18-typescript-conventions)
19. [Route Handler Pattern](#19-route-handler-pattern)
20. [Data Flow Diagrams](#20-data-flow-diagrams)
21. [Migration Path from Current Architecture](#21-migration-path-from-current-architecture)

---

## 1. Why Upgrade

| Current Problem | Impact | Fix |
|---|---|---|
| NextAuth for single-admin dashboard | Heavyweight, JWT callbacks are black-box | Custom JWT in `httpOnly` cookie |
| Billing calculation spread across 3 API routes | Totals mismatch between screens | Central `billing.engine.ts` |
| No bill snapshot — dynamic recalculation | Editing an old entry silently changes May bill in June | Immutable `customer_bills` collection + `is_billed` lock |
| No ledger — money flows untraceable | Impossible audit trail | `customer_ledger` with typed transaction events |
| Rate limit in `globalThis` Map | Breaks on Vercel multi-instance | Upstash Redis sliding window |
| No repository pattern — queries inside route handlers | Route handlers grow to 200 lines | `repositories/` + `services/` separation |
| No query factory — raw string query keys | Cache invalidation bugs across features | `lib/query/keys.ts` key factories |
| No typed API client — raw `fetch` in hooks | Frontend/backend type drift | `lib/api/client.ts` generic fetcher |
| No `customer_bills` collection | `generate-bill` result is ephemeral, never stored | Freeze bill snapshots before payment |
| `outstanding: 0` hardcoded in customer stats | Misleading dashboard number | Derive from ledger running balance |

---

## 2. Layer Separation Principles

> **This is the most important architectural rule in the entire system.**
> Every design decision in every module flows from this.

### The Four Layers

```
┌─────────────────────────────────────────────────────────────────────────┐
│  LAYER 1 — IDENTITY LAYER          (customers collection)               │
│                                                                         │
│  WHO the customer is.                                                   │
│  Stable. Changes rarely.                                                │
│  Examples: name, phone, address, default pricing, active status         │
│                                                                         │
│  ✗ NEVER stores: pending balance, total paid, payment history,          │
│                  current bill amount, outstanding amount                │
└─────────────────────────────────────────────────────────────────────────┘
                          │
                          │ customer_id reference only
                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  LAYER 2 — OPERATIONAL LAYER       (tiffin_entries collection)          │
│                                                                         │
│  WHAT was delivered each day.                                           │
│  Append-only. Locked once billed.                                       │
│  Examples: date, qty, price snapshot, delivery status                   │
│                                                                         │
│  ✗ NEVER stores: payment status, pending amount, customer profile       │
│  ✓ STORES: actual price at time of delivery (snapshot, immutable)       │
└─────────────────────────────────────────────────────────────────────────┘
                          │
                          │ aggregated by billing engine
                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  LAYER 3 — FINANCIAL LAYER         (customer_bills + payments)          │
│                                                                         │
│  HOW MUCH is owed and collected.                                        │
│  Transaction-based. Append-only payment records.                        │
│  Examples: bill snapshots, payment amounts, methods, references         │
│                                                                         │
│  ✗ NEVER writes back to Customer Master                                 │
│  ✗ NEVER modifies tiffin entries (only reads them)                      │
│  ✓ DERIVES pending from: SUM(tiffin entries) - SUM(payments)            │
└─────────────────────────────────────────────────────────────────────────┘
                          │
                          │ aggregated by report engine
                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  LAYER 4 — ANALYTICAL LAYER        (read-only aggregations)             │
│                                                                         │
│  INSIGHT across layers.                                                 │
│  Computed on demand. Never persisted as customer fields.                │
│  Examples: monthly summaries, pending reports, top customers            │
└─────────────────────────────────────────────────────────────────────────┘
```

### The One Rule That Prevents All Accounting Bugs

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  Financial values are CALCULATED, never STORED on Customer Master.      │
│                                                                         │
│  pending_amount   → SUM(tiffin entries) − SUM(payments)                 │
│  total_paid       → SUM(Payment.paid_amount) WHERE customer_id = X      │
│  advance_balance  → SUM(|remaining|) WHERE payment_status = 'advance'   │
│  outstanding      → LedgerEngine.getBalance(customerId)                 │
│                                                                         │
│  These values appear in the UI via the Customer Summary API.            │
│  They are NEVER stored as fields on the Customer document.              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Why Storing Derived Values on Customer is Dangerous

```
Bad design (DO NOT DO):
┌──────────────────────────────────┐
│  customers collection            │
│  {                               │
│    name: "Raj",                  │
│    pending_amount: 2300   ← ✗    │  ← stale from 3 days ago
│    total_paid: 14500      ← ✗    │  ← off by one partial payment
│  }                               │
└──────────────────────────────────┘

Problems this creates:
  1. A payment arrives → you must UPDATE both payments + customers → race condition
  2. An old tiffin entry is corrected → customers.pending is now wrong
  3. A payment is deleted → did you remember to subtract from customers.total_paid?
  4. You scale to multiple server instances → two requests update pending simultaneously
  5. You query the ledger for audit → it disagrees with customers.pending_amount
  6. Admin asks "why does this say ₹2300?" → you have no history of how it got there

Correct design:
  customers collection = identity only (no numbers that change)
  pending amount = computed by /api/payments/customer-summary/:id at query time
  shown in UI via React Query with its own query key
  stale after 60s, re-fetched on demand
```

### Module Boundary Rules — What Each Module May and May Not Do

```
┌──────────────┬────────────────────────────────┬──────────────────────────────────┐
│  Module      │  MAY                           │  MAY NOT                         │
├──────────────┼────────────────────────────────┼──────────────────────────────────┤
│  customers   │  CRUD customer profile         │  Store payment totals            │
│              │  Manage defaults + preferences │  Store pending balance           │
│              │  Activate / deactivate         │  Write to payments or ledger     │
├──────────────┼────────────────────────────────┼──────────────────────────────────┤
│  tiffin      │  Save daily entries            │  Modify customer profile         │
│              │  Read customer defaults        │  Trigger billing or payments     │
│              │  Apply price snapshot          │  Change is_billed after locking  │
├──────────────┼────────────────────────────────┼──────────────────────────────────┤
│  billing     │  Read tiffin entries           │  Modify tiffin entries directly  │
│              │  Create frozen bill snapshots  │  Write to Customer Master        │
│              │  Lock entries (is_billed=true) │  Modify payment records          │
│              │  Write BILL_GENERATED to ledger│                                  │
├──────────────┼────────────────────────────────┼──────────────────────────────────┤
│  payments    │  Create payment records        │  Write to Customer Master        │
│              │  Link payments to bills        │  Modify tiffin entries           │
│              │  Update bill_status            │  Recalculate bill amounts        │
│              │  Write PAYMENT_RECEIVED to     │  Delete bills                    │
│              │  ledger                        │                                  │
├──────────────┼────────────────────────────────┼──────────────────────────────────┤
│  reports     │  Read all layers               │  Write to any collection         │
│              │  Aggregate and compute         │  Mutate any data                 │
│              │  Return computed summaries     │                                  │
└──────────────┴────────────────────────────────┴──────────────────────────────────┘
```

### Cross-Layer Data Access Pattern

```typescript
// ✗ BAD — Payment service writing back to Customer Master
export const PaymentService = {
    async createPayment(data: CreatePaymentInput) {
        const payment = await PaymentRepository.create(data)
        // NEVER DO THIS:
        await CustomerRepository.update(data.customer_id, {
            pending_amount: newPending,   // ← sync bug waiting to happen
            total_paid: newTotal,         // ← will drift from ledger
        })
        return payment
    }
}

// ✓ CORRECT — Payment service only writes to payments + ledger
export const PaymentService = {
    async createPayment(data: CreatePaymentInput) {
        const payment = await PaymentRepository.create(data)
        await BillingRepository.updateBillStatus(data.bill_id, newStatus)
        await LedgerEngine.record({ type: 'PAYMENT_RECEIVED', ... })
        // Customer Master is NEVER touched
        return payment
    }
}

// ✓ CORRECT — UI reads computed values via Customer Summary API
// hooks/useCustomerSummary.ts
export function useCustomerSummary(customerId: string) {
    return useQuery({
        queryKey: summaryKeys.customer(customerId),      // SEPARATE query key
        queryFn: () => apiClient.get(`/api/payments/customer-summary/${customerId}`),
        staleTime: 60_000,    // recomputed every 60s, not stored on customer
    })
}
```

---

## 3. New Project Structure

```
src/
│
├── app/
│   ├── (public)/
│   │   └── login/
│   │       └── page.tsx
│   │
│   ├── (private)/
│   │   ├── layout.tsx              ← JWT cookie check → redirect /login
│   │   ├── dashboard/page.tsx
│   │   ├── customers/
│   │   │   ├── page.tsx
│   │   │   ├── [id]/page.tsx
│   │   │   └── components/
│   │   ├── tiffin/
│   │   │   ├── page.tsx
│   │   │   └── components/
│   │   ├── payments/
│   │   │   ├── page.tsx
│   │   │   ├── [id]/page.tsx
│   │   │   └── components/
│   │   ├── reports/
│   │   │   └── page.tsx
│   │   └── settings/
│   │       └── page.tsx
│   │
│   └── api/
│       ├── auth/
│       │   ├── login/route.ts
│       │   └── logout/route.ts
│       ├── customers/
│       │   ├── route.ts
│       │   ├── [id]/route.ts
│       │   └── stats/route.ts
│       ├── tiffin/
│       │   ├── route.ts
│       │   ├── preview/route.ts
│       │   └── bulk/route.ts
│       ├── billing/
│       │   ├── route.ts            ← list bills
│       │   ├── [id]/route.ts
│       │   └── generate/route.ts   ← create bill snapshot
│       ├── payments/
│       │   ├── route.ts
│       │   ├── [id]/route.ts
│       │   └── stats/route.ts
│       ├── reports/
│       │   ├── monthly/route.ts
│       │   ├── customer-balance/route.ts
│       │   └── daily-ops/route.ts
│       ├── backup/
│       │   └── restore/route.ts
│       └── cron/
│           └── backup/route.ts
│
├── modules/
│   ├── auth/
│   │   ├── auth.service.ts         ← login, logout, token issue
│   │   ├── auth.middleware.ts      ← JWT cookie validation
│   │   └── auth.types.ts
│   │
│   ├── customers/
│   │   ├── customer.repository.ts  ← all DB queries
│   │   ├── customer.service.ts     ← orchestration
│   │   ├── customer.types.ts
│   │   └── customer.validators.ts
│   │
│   ├── tiffin/
│   │   ├── tiffin.repository.ts
│   │   ├── tiffin.service.ts
│   │   ├── tiffin.types.ts
│   │   └── tiffin.validators.ts
│   │
│   ├── billing/
│   │   ├── billing.repository.ts
│   │   ├── billing.service.ts      ← orchestrates engine + repo
│   │   ├── billing.types.ts
│   │   └── billing.validators.ts
│   │
│   ├── payments/
│   │   ├── payment.repository.ts
│   │   ├── payment.service.ts
│   │   ├── payment.types.ts
│   │   └── payment.validators.ts
│   │
│   ├── reports/
│   │   ├── report.repository.ts
│   │   ├── report.service.ts
│   │   └── report.types.ts
│   │
│   └── backup/
│       ├── backup.service.ts
│       ├── backup.repository.ts    ← backup_logs collection
│       └── backup.types.ts
│
├── lib/
│   ├── api/
│   │   ├── client.ts               ← typed fetch wrapper
│   │   └── response.ts             ← success/error helpers
│   │
│   ├── db/
│   │   ├── connect.ts              ← mongoose connection pool
│   │   └── models/
│   │       ├── customer.model.ts
│   │       ├── tiffin-entry.model.ts
│   │       ├── customer-bill.model.ts
│   │       ├── payment.model.ts
│   │       ├── ledger.model.ts
│   │       └── backup-log.model.ts
│   │
│   ├── auth/
│   │   ├── jwt.ts                  ← sign, verify, extract from cookie
│   │   └── middleware.ts           ← Next.js middleware
│   │
│   ├── query/
│   │   └── keys.ts                 ← query key factories
│   │
│   ├── calculations/
│   │   ├── billing.engine.ts       ← THE billing calculation truth
│   │   ├── payment.engine.ts       ← status, remaining
│   │   └── ledger.engine.ts        ← running balance
│   │
│   ├── validators/
│   │   └── common.ts               ← shared Zod primitives
│   │
│   ├── backup/
│   │   ├── mongo-export.ts
│   │   ├── zip-generator.ts
│   │   └── onedrive-upload.ts
│   │
│   └── utils/
│       ├── date.ts                 ← parseUTC, toIST, formatDisplay
│       ├── currency.ts             ← formatINR
│       └── cn.ts                  ← clsx + tailwind-merge
│
├── hooks/
│   ├── useCustomers.ts
│   ├── useTiffin.ts
│   ├── useBilling.ts
│   ├── usePayments.ts
│   └── useReports.ts
│
├── types/
│   ├── api.types.ts                ← ApiSuccess, ApiError, PaginationMeta
│   ├── auth.types.ts
│   ├── customer.types.ts
│   ├── tiffin.types.ts
│   ├── billing.types.ts
│   ├── payment.types.ts
│   ├── ledger.types.ts
│   └── report.types.ts
│
├── constants/
│   ├── payment.constants.ts
│   └── tiffin.constants.ts
│
└── config/
    └── app.config.ts               ← env vars typed + validated at startup
```

---

## 3. Auth Module — Custom JWT

### Why Remove NextAuth

NextAuth adds `~35KB` of dependencies, JWT callback indirection, and a session layer that wraps a simple env-var credential check. A single-admin dashboard needs none of that.

### New Auth Flow

```
 POST /api/auth/login
        │
        ▼
 auth.service.ts → loginAdmin(email, password)
   1. safeCompare(email,    process.env.ADMIN_EMAIL)
   2. safeCompare(password, process.env.ADMIN_PASSWORD)
   3. On match: signJwt({ sub: 'admin', role: 'admin', iat, exp: +7d })
   4. Set cookie: httpOnly, secure, sameSite=strict, path=/
        │
        ▼
 Returns: 200 { message: "Login successful" }
        │
 Subsequent requests:
        │
 middleware.ts (Next.js middleware, runs on edge)
   verifyJwt(cookie) → 401 if missing/expired
   sets x-user-id header for route handlers
        │
        ▼
 Route handler calls:
   getAuthContext(request) → { userId, role }
```

### JWT Implementation

```typescript
// lib/auth/jwt.ts

import { SignJWT, jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET)
const ALGORITHM = 'HS256'
const EXPIRY = '7d'

export interface JwtPayload {
    sub: string
    role: 'admin'
    iat: number
    exp: number
}

export async function signJwt(payload: Omit<JwtPayload, 'iat' | 'exp'>): Promise<string> {
    return new SignJWT(payload)
        .setProtectedHeader({ alg: ALGORITHM })
        .setIssuedAt()
        .setExpirationTime(EXPIRY)
        .sign(SECRET)
}

export async function verifyJwt(token: string): Promise<JwtPayload> {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as JwtPayload
}
```

### Middleware (Edge Compatible)

```typescript
// lib/auth/middleware.ts  (used by Next.js middleware.ts)

import { verifyJwt } from './jwt'
import { NextResponse, type NextRequest } from 'next/server'

const COOKIE_NAME = 'nt_session'

export async function authMiddleware(request: NextRequest) {
    const token = request.cookies.get(COOKIE_NAME)?.value

    if (!token) {
        return NextResponse.json({ success: false, message: 'Unauthorized',
            data: null, error: { code: 'UNAUTHORIZED' } }, { status: 401 })
    }

    try {
        const payload = await verifyJwt(token)
        const response = NextResponse.next()
        response.headers.set('x-user-role', payload.role)
        return response
    } catch {
        return NextResponse.json({ success: false, message: 'Token expired',
            data: null, error: { code: 'TOKEN_EXPIRED' } }, { status: 401 })
    }
}
```

### Auth Service

```typescript
// modules/auth/auth.service.ts

import { createHash, timingSafeEqual } from 'crypto'
import { signJwt } from '@/lib/auth/jwt'
import { cookies } from 'next/headers'

const COOKIE_NAME = 'nt_session'
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
}

function safeCompare(a: string, b: string): boolean {
    const ha = createHash('sha256').update(a).digest()
    const hb = createHash('sha256').update(b).digest()
    return timingSafeEqual(ha, hb)
}

export async function loginAdmin(email: string, password: string): Promise<boolean> {
    const validEmail = process.env.ADMIN_EMAIL ?? ''
    const validPassword = process.env.ADMIN_PASSWORD ?? ''

    if (!safeCompare(email, validEmail) || !safeCompare(password, validPassword)) {
        return false
    }

    const token = await signJwt({ sub: 'admin', role: 'admin' })
    const cookieStore = await cookies()
    cookieStore.set(COOKIE_NAME, token, COOKIE_OPTIONS)
    return true
}

export async function logoutAdmin(): Promise<void> {
    const cookieStore = await cookies()
    cookieStore.delete(COOKIE_NAME)
}
```

---

## 4. Database Layer — Connection & Repositories

### Connection (unchanged pattern, moved to `lib/db/connect.ts`)

```typescript
// lib/db/connect.ts
import mongoose from 'mongoose'

const g = globalThis as typeof globalThis & {
    _mongoConn: typeof mongoose | null
    _mongoPromise: Promise<typeof mongoose> | null
}
if (!g._mongoConn)    g._mongoConn = null
if (!g._mongoPromise) g._mongoPromise = null

export async function dbConnect() {
    const uri = process.env.MONGODB_URI
    if (!uri) throw new Error('MONGODB_URI is not set')
    if (g._mongoConn) return g._mongoConn
    if (!g._mongoPromise)
        g._mongoPromise = mongoose.connect(uri, { bufferCommands: false })
    try {
        g._mongoConn = await g._mongoPromise
    } catch (e) {
        g._mongoPromise = null
        throw e
    }
    return g._mongoConn
}
```

### Repository Pattern

Every module gets a repository that owns all Mongoose queries. Route handlers and services never call Mongoose directly.

```typescript
// modules/customers/customer.repository.ts

import Customer from '@/lib/db/models/customer.model'
import type { CreateCustomerInput, UpdateCustomerInput } from './customer.validators'
import type { CustomerQueryParams } from './customer.types'

export const CustomerRepository = {

    async findAll(params: CustomerQueryParams) {
        const { page = 1, limit = 10, search = '' } = params
        const filter: Record<string, unknown> = { is_active: true }
        if (search.trim()) {
            filter.$or = [
                { full_name: { $regex: search.trim(), $options: 'i' } },
                { phone:     { $regex: search.trim(), $options: 'i' } },
            ]
        }
        const [docs, total] = await Promise.all([
            Customer.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
            Customer.countDocuments(filter),
        ])
        return { docs, total }
    },

    async findById(id: string) {
        return Customer.findById(id).lean()
    },

    async findByPhone(phone: string) {
        return Customer.findOne({ phone }).lean()
    },

    async create(data: CreateCustomerInput) {
        return Customer.create(data)
    },

    async update(id: string, data: UpdateCustomerInput) {
        return Customer.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true }).lean()
    },

    async deactivate(id: string) {
        return Customer.findByIdAndUpdate(id, { $set: { is_active: false } }, { new: true }).lean()
    },

    async countStats() {
        const [total, active, inactive] = await Promise.all([
            Customer.countDocuments(),
            Customer.countDocuments({ is_active: true }),
            Customer.countDocuments({ is_active: false }),
        ])
        return { total, active, inactive }
    },
}
```

### Service Pattern

Services orchestrate across repositories and engines. Never contain Mongoose queries.

```typescript
// modules/customers/customer.service.ts

import { dbConnect } from '@/lib/db/connect'
import { CustomerRepository } from './customer.repository'
import type { CreateCustomerInput, UpdateCustomerInput } from './customer.validators'
import type { CustomerQueryParams } from './customer.types'

export const CustomerService = {

    async list(params: CustomerQueryParams) {
        await dbConnect()
        return CustomerRepository.findAll(params)
    },

    async getById(id: string) {
        await dbConnect()
        const customer = await CustomerRepository.findById(id)
        if (!customer) return null
        return customer
    },

    async create(data: CreateCustomerInput) {
        await dbConnect()
        const existing = await CustomerRepository.findByPhone(data.phone)
        if (existing) throw { code: 'CONFLICT', message: `Phone ${data.phone} already registered` }
        return CustomerRepository.create(data)
    },

    async update(id: string, data: UpdateCustomerInput) {
        await dbConnect()
        if (data.phone) {
            const dup = await CustomerRepository.findByPhone(data.phone)
            if (dup && String(dup._id) !== id)
                throw { code: 'CONFLICT', message: `Phone ${data.phone} is already in use` }
        }
        const updated = await CustomerRepository.update(id, data)
        if (!updated) throw { code: 'NOT_FOUND', message: 'Customer not found' }
        return updated
    },

    async deactivate(id: string) {
        await dbConnect()
        const customer = await CustomerRepository.deactivate(id)
        if (!customer) throw { code: 'NOT_FOUND', message: 'Customer not found' }
        return customer
    },

    async stats() {
        await dbConnect()
        return CustomerRepository.countStats()
    },
}
```

### Route Handler — Thin Shell

```typescript
// app/api/customers/route.ts

import { CustomerService } from '@/modules/customers/customer.service'
import { createCustomerSchema } from '@/modules/customers/customer.validators'
import { success, created, badRequest, conflict, internalServerError } from '@/lib/api/response'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
    try {
        const sp = request.nextUrl.searchParams
        const params = {
            page:   parseInt(sp.get('page')  ?? '1'),
            limit:  parseInt(sp.get('limit') ?? '10'),
            search: sp.get('search') ?? '',
        }
        const { docs, total } = await CustomerService.list(params)
        const page = params.page, limit = params.limit
        return success(docs, 'Customers fetched', { page, limit, total, totalPages: Math.ceil(total / limit) })
    } catch (e) {
        return internalServerError(e)
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const parsed = createCustomerSchema.safeParse(body)
        if (!parsed.success) return badRequest('Validation failed', parsed.error.flatten().fieldErrors)

        const customer = await CustomerService.create(parsed.data)
        return created(customer, 'Customer created successfully')
    } catch (e: unknown) {
        if (typeof e === 'object' && e !== null && 'code' in e) {
            const err = e as { code: string; message: string }
            if (err.code === 'CONFLICT') return conflict(err.message)
        }
        return internalServerError(e)
    }
}
```

---

## 6. Customer Module — Identity Layer

### What the Customer Document Is (and Is Not)

```
┌─────────────────────────────────────────────────────────────────┐
│  CUSTOMER MASTER = IDENTITY ONLY                                │
│                                                                 │
│  ✓ STORE (stable master data):                                  │
│     customer_code, full_name, phone, alternate_phone            │
│     address, delivery_area, delivery_notes, notes               │
│     default_morning_qty / price, default_evening_qty / price    │
│     meal_type, delivery_shift                                   │
│     is_active, joined_date, stopped_date                        │
│                                                                 │
│  ✗ NEVER STORE (transactional / derived values):                │
│     pending_amount      ← changes on every payment              │
│     total_paid          ← changes on every payment              │
│     outstanding         ← derived: tiffin_sum - payment_sum     │
│     wallet_balance      ← derived from ledger                   │
│     advance_balance     ← derived from payment aggregation      │
│     current_bill        ← belongs to customer_bills             │
│     last_payment_date   ← query payments collection             │
│     payment_history     ← separate payments collection          │
└─────────────────────────────────────────────────────────────────┘
```

> **Why this rule exists:** Every financial value on the Customer document would need to stay
> in sync with payment and tiffin events. Sync = eventual inconsistency.
> One missed update and the dashboard shows the wrong number permanently, silently.
> Derived values are always recomputed from source-of-truth collections.

### Customer Model

```typescript
// lib/db/models/customer.model.ts

const CustomerSchema = new Schema({
    customer_code:     { type: String, unique: true },     // "NT-0042" — auto-generated
    full_name:         { type: String, required: true, trim: true },
    phone:             { type: String, required: true, unique: true, trim: true },
    alternate_phone:   { type: String, trim: true },
    address:           { type: String, trim: true },
    delivery_area:     { type: String, trim: true },
    delivery_notes:    { type: String, trim: true },
    notes:             { type: String, trim: true },

    // Default tiffin preferences — only used as DEFAULTS for new entries.
    // Actual entry prices are snapshotted in TiffinEntry at delivery time.
    default_morning_qty:   { type: Number, default: 1, min: 0, max: 10 },
    default_evening_qty:   { type: Number, default: 1, min: 0, max: 10 },
    default_morning_price: { type: Number, default: 30 },
    default_evening_price: { type: Number, default: 30 },

    meal_type:      { type: String, enum: ['veg', 'non-veg', 'jain'], default: 'veg' },
    delivery_shift: { type: String, enum: ['morning', 'evening', 'both'], default: 'both' },

    is_active:    { type: Boolean, default: true },
    joined_date:  { type: Date, default: Date.now },
    stopped_date: { type: Date },

    // NO financial fields here. See Layer Separation Principles (Section 2).
}, { timestamps: true })

CustomerSchema.index({ phone: 1 }, { unique: true })
CustomerSchema.index({ customer_code: 1 }, { unique: true, sparse: true })
CustomerSchema.index({ full_name: 'text', phone: 'text' })
CustomerSchema.index({ is_active: 1 })
CustomerSchema.index({ delivery_area: 1 })
```

### Customer API Boundaries

The Customer API handles **identity only**. It has no knowledge of payments.

```
GET  /api/customers           → list with profile fields only
POST /api/customers           → create customer profile
GET  /api/customers/[id]      → customer profile only
PATCH /api/customers/[id]     → update profile / defaults / status
DELETE /api/customers/[id]    → soft deactivate (is_active: false)
GET  /api/customers/stats     → { total, active, inactive } — COUNT only

Financial data for a customer:
GET  /api/payments/customer-summary/:id  ← SEPARATE computed API (Section 10)
```

### Customer List — How Pending Balance Appears Without Being Stored

```
 Customer List page loads
        │
        ├── useCustomers(params)
        │   queryKey: customerKeys.list(params)
        │   GET /api/customers
        │   Returns: profile fields only (name, phone, area, is_active)
        │
        └── useCustomerSummaries(customerIds)
            queryKey: summaryKeys.batch(customerIds)
            GET /api/payments/customer-summary?ids=id1,id2,...
            Returns: { [customerId]: { outstanding, last_payment_date } }

 Table renders:
  Name          Phone       Area      Outstanding   Last Payment
  ─────────────────────────────────────────────────────────────
  Ramesh Patel  9876543210  MG Road   ₹300         May 15       ← from summary API
  Suresh Kumar  9812345678  CG Road   ₹0           May 10       ← from summary API

 Customer document was never modified. Outstanding is computed fresh every time.
```

### Customer Code Auto-Generation

```typescript
// modules/customers/customer.service.ts

async function generateCustomerCode(): Promise<string> {
    const lastCustomer = await Customer.findOne().sort({ createdAt: -1 }).select('customer_code').lean()
    const lastNum = lastCustomer?.customer_code
        ? parseInt(lastCustomer.customer_code.split('-')[1] ?? '0')
        : 0
    return `NT-${String(lastNum + 1).padStart(4, '0')}`   // NT-0001, NT-0042, NT-1337
}
```

---

## 6. Tiffin Module — Immutable Entries

### Why Immutability Matters

```
Scenario WITHOUT snapshot pricing:

May 1 — Customer pays ₹30/tiffin
May 15 — Price changed to ₹35 in customer defaults

June 1 — Someone re-runs May report:
  All 30 May entries now calculate at ₹35
  May bill jumps by ₹150
  Customer complains
  Admin has no idea what happened
```

### Updated TiffinEntry Model

```typescript
// lib/db/models/tiffin-entry.model.ts

const TiffinEntrySchema = new Schema({
    customer_id: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    entry_date:  { type: Date, required: true },

    morning_qty:   { type: Number, default: 0, min: 0, max: 10 },
    evening_qty:   { type: Number, default: 0, min: 0, max: 10 },

    // SNAPSHOT — captured at time of entry, NEVER changes after
    morning_price_snapshot: { type: Number, required: true },
    evening_price_snapshot: { type: Number, required: true },

    is_manual_price: { type: Boolean, default: false },

    delivery_status: {
        type: String,
        enum: ['delivered', 'skipped', 'partial'],
        default: 'delivered'
    },

    // Calculated fields
    total_qty:    { type: Number, required: true, default: 0 },
    total_amount: { type: Number, required: true, default: 0 },

    // Billing lock — set when a bill snapshot is generated for this entry
    is_billed:  { type: Boolean, default: false },
    billed_at:  { type: Date },
    billing_id: { type: Schema.Types.ObjectId, ref: 'CustomerBill' },

    morning_paid: { type: Boolean, default: false },
    evening_paid: { type: Boolean, default: false },

    notes:      { type: String, trim: true },
    created_by: { type: String, trim: true },
}, { timestamps: true })

// Unique: one entry per customer per day
TiffinEntrySchema.index({ customer_id: 1, entry_date: 1 }, { unique: true })
TiffinEntrySchema.index({ entry_date: -1 })
TiffinEntrySchema.index({ customer_id: 1 })
TiffinEntrySchema.index({ is_billed: 1 })
TiffinEntrySchema.index({ billing_id: 1 })
```

### Snapshot Capture on Bulk Save

```typescript
// modules/tiffin/tiffin.service.ts

async function bulkSave(entryDate: string, entries: BulkEntryInput[], createdBy: string) {
    await dbConnect()

    // Load all customer defaults for snapshot
    const customerIds = entries.map(e => e.customer_id)
    const customers = await CustomerRepository.findByIds(customerIds)
    const customerMap = new Map(customers.map(c => [String(c._id), c]))

    const ops = entries.map(entry => {
        const customer = customerMap.get(entry.customer_id)

        // Snapshot: use manual override price if provided, else customer default
        const morning_price_snapshot = entry.is_manual_price
            ? entry.morning_price
            : customer?.default_morning_price ?? entry.morning_price

        const evening_price_snapshot = entry.is_manual_price
            ? entry.evening_price
            : customer?.default_evening_price ?? entry.evening_price

        const total_qty    = entry.morning_qty + entry.evening_qty
        const total_amount = (entry.morning_qty > 0 ? morning_price_snapshot : 0)
                           + (entry.evening_qty > 0 ? evening_price_snapshot : 0)

        return {
            updateOne: {
                filter: { customer_id: entry.customer_id, entry_date: parseUTC(entryDate), is_billed: false },
                // ↑ is_billed: false guard — prevents overwriting locked entries
                update: {
                    $set: {
                        morning_qty, morning_price_snapshot,
                        evening_qty, evening_price_snapshot,
                        is_manual_price: entry.is_manual_price ?? false,
                        total_qty, total_amount,
                        morning_paid: entry.morning_paid ?? false,
                        evening_paid: entry.evening_paid ?? false,
                        created_by: createdBy,
                    },
                },
                upsert: true,
            },
        }
    })

    return TiffinEntry.bulkWrite(ops, { ordered: false })
}
```

> **Key guard:** `filter: { ..., is_billed: false }` — once an entry is locked into a bill, bulk save cannot overwrite it. The client must handle the returned `matchedCount` vs `upsertedCount` to warn the user about locked entries.

---

## 7. Billing Engine

This is the most important module. All billing numbers in the system — customer summary, stats, reports, payment form — must come from this single engine.

### Customer Bill Model

```typescript
// lib/db/models/customer-bill.model.ts

const CustomerBillSchema = new Schema({
    customer_id: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },

    billing_start_date: { type: Date, required: true },
    billing_end_date:   { type: Date, required: true },

    total_entries: { type: Number, required: true },
    total_amount:  { type: Number, required: true },   // sum of tiffin entries

    previous_pending:    { type: Number, default: 0 }, // unpaid from older bills
    advance_adjustment:  { type: Number, default: 0 }, // credit from advance payments

    final_payable: { type: Number, required: true },   // amount customer owes

    bill_status: {
        type: String,
        enum: ['unpaid', 'partial', 'paid', 'overpaid'],
        default: 'unpaid'
    },

    generated_at: { type: Date, default: Date.now },
    generated_by: { type: String },
}, { timestamps: true })

CustomerBillSchema.index({ customer_id: 1, billing_start_date: -1 })
CustomerBillSchema.index({ bill_status: 1 })
CustomerBillSchema.index({ generated_at: -1 })
```

### Billing Engine

```typescript
// lib/calculations/billing.engine.ts

import TiffinEntry from '@/lib/db/models/tiffin-entry.model'
import CustomerBill from '@/lib/db/models/customer-bill.model'
import Payment from '@/lib/db/models/payment.model'
import mongoose from 'mongoose'

export interface BillCalculation {
    customer_id: string
    billing_start_date: string
    billing_end_date:   string
    total_entries:  number
    total_amount:   number
    previous_pending:   number
    advance_adjustment: number
    final_payable:  number
}

export async function calculateBill(
    customerId: string,
    startDate: Date,
    endDate: Date
): Promise<BillCalculation> {
    const objectId = new mongoose.Types.ObjectId(customerId)

    // Include full end day: endDate + 23:59:59.999
    const endInclusive = new Date(endDate.getTime() + 86_400_000 - 1)

    const [tiffinAgg, prevPending, advanceBalance] = await Promise.all([

        // 1. Sum all tiffin entry amounts in the period
        TiffinEntry.aggregate([
            { $match: { customer_id: objectId, entry_date: { $gte: startDate, $lte: endInclusive } } },
            { $group: { _id: null, total: { $sum: '$total_amount' }, count: { $sum: 1 } } },
        ]),

        // 2. Unpaid balance from bills BEFORE this period
        CustomerBill.aggregate([
            {
                $match: {
                    customer_id: objectId,
                    billing_end_date: { $lt: startDate },
                    bill_status: { $in: ['unpaid', 'partial'] },
                },
            },
            {
                $group: {
                    _id: null,
                    // Sum remaining: what was still unpaid on those bills
                    total: {
                        $sum: {
                            $subtract: [
                                '$final_payable',
                                { $ifNull: ['$amount_collected', 0] },
                            ],
                        },
                    },
                },
            },
        ]),

        // 3. Advance balance (overpayments from past)
        Payment.aggregate([
            { $match: { customer_id: objectId, payment_status: 'advance' } },
            { $group: { _id: null, total: { $sum: { $abs: '$remaining_amount' } } } },
        ]),
    ])

    const total_amount       = (tiffinAgg[0]?.total    as number) ?? 0
    const total_entries      = (tiffinAgg[0]?.count    as number) ?? 0
    const previous_pending   = Math.max(0, (prevPending[0]?.total    as number) ?? 0)
    const advance_adjustment = Math.max(0, (advanceBalance[0]?.total as number) ?? 0)
    const final_payable      = Math.max(0, total_amount + previous_pending - advance_adjustment)

    return {
        customer_id:        customerId,
        billing_start_date: startDate.toISOString().slice(0, 10),
        billing_end_date:   endDate.toISOString().slice(0, 10),
        total_entries,
        total_amount,
        previous_pending,
        advance_adjustment,
        final_payable,
    }
}

// Lock tiffin entries and create a frozen bill snapshot
export async function generateBillSnapshot(
    customerId: string,
    startDate: Date,
    endDate: Date,
    generatedBy: string
) {
    const calc = await calculateBill(customerId, startDate, endDate)
    const objectId = new mongoose.Types.ObjectId(customerId)
    const endInclusive = new Date(endDate.getTime() + 86_400_000 - 1)

    // Create frozen bill snapshot
    const bill = await CustomerBill.create({
        customer_id:        objectId,
        billing_start_date: startDate,
        billing_end_date:   endDate,
        total_entries:      calc.total_entries,
        total_amount:       calc.total_amount,
        previous_pending:   calc.previous_pending,
        advance_adjustment: calc.advance_adjustment,
        final_payable:      calc.final_payable,
        bill_status:        'unpaid',
        generated_by:       generatedBy,
    })

    // Lock all tiffin entries in the period
    await TiffinEntry.updateMany(
        { customer_id: objectId, entry_date: { $gte: startDate, $lte: endInclusive }, is_billed: false },
        { $set: { is_billed: true, billed_at: new Date(), billing_id: bill._id } }
    )

    return bill
}
```

### Payment Engine

```typescript
// lib/calculations/payment.engine.ts

export type PaymentStatus = 'pending' | 'partial' | 'completed' | 'advance'

export function calcPaymentStatus(paidAmount: number, totalBill: number): PaymentStatus {
    if (paidAmount <= 0)          return 'pending'
    if (paidAmount > totalBill)   return 'advance'
    if (paidAmount === totalBill) return 'completed'
    return 'partial'
}

export function calcRemaining(paidAmount: number, totalBill: number): number {
    return totalBill - paidAmount   // negative = advance credit
}

export function calcBillStatus(totalPaid: number, finalPayable: number): 'unpaid' | 'partial' | 'paid' | 'overpaid' {
    if (totalPaid <= 0)               return 'unpaid'
    if (totalPaid > finalPayable)     return 'overpaid'
    if (totalPaid === finalPayable)   return 'paid'
    return 'partial'
}
```

---

## 9. Payment Module

### Payment Module Boundary Rules

```
Payment Module OWNS:
  ├── payments collection      (create, read, update, delete payments)
  ├── customer_bills.bill_status (update when payment changes bill status)
  └── customer_ledger          (append PAYMENT_RECEIVED / ADVANCE_USED events)

Payment Module NEVER TOUCHES:
  ├── customers collection     — Customer Master is read-only from here
  ├── tiffin_entries collection — only billing engine locks entries
  └── Any field on Customer    — pending_amount, total_paid, wallet_balance

Payment read-back of customer data:
  ✓ PaymentRepository.create(data)          — writes to payments only
  ✓ BillingRepository.updateStatus(billId)  — updates bill_status only
  ✓ LedgerEngine.record(PAYMENT_RECEIVED)   — appends ledger entry only
  ✗ CustomerRepository.update(id, {...})    — NEVER
```

### Updated Payment Model

```typescript
// lib/db/models/payment.model.ts

const PaymentSchema = new Schema({
    customer_id: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    bill_id:     { type: Schema.Types.ObjectId, ref: 'CustomerBill' },  // links payment to a bill

    payment_date: { type: Date, required: true },

    paid_amount:  { type: Number, required: true, min: 0 },
    payment_method: {
        type: String,
        enum: ['cash', 'upi', 'bank_transfer', 'cheque'],
        required: true,
    },
    reference_number: { type: String, trim: true },

    // Computed by payment engine at save time
    remaining_after_payment: { type: Number, required: true },
    payment_status: {
        type: String,
        enum: ['pending', 'partial', 'completed', 'advance'],
        required: true,
    },

    notes:        { type: String, trim: true },
    collected_by: { type: String, trim: true },
}, { timestamps: true })

PaymentSchema.index({ customer_id: 1, payment_date: -1 })
PaymentSchema.index({ bill_id: 1 })
PaymentSchema.index({ payment_date: -1 })
PaymentSchema.index({ payment_status: 1 })
```

### Payment Service — Bill-Linked Flow

```typescript
// modules/payments/payment.service.ts

export const PaymentService = {

    async createForBill(data: CreatePaymentInput, collectedBy: string) {
        await dbConnect()

        const bill = await BillingRepository.findById(data.bill_id)
        if (!bill) throw { code: 'NOT_FOUND', message: 'Bill not found' }

        // Sum all previous payments against this bill
        const previousPayments = await PaymentRepository.sumByBillId(data.bill_id)
        const total_paid_so_far = previousPayments + data.paid_amount

        const remaining = calcRemaining(total_paid_so_far, bill.final_payable)
        const status    = calcPaymentStatus(total_paid_so_far, bill.final_payable)

        const payment = await PaymentRepository.create({
            customer_id: bill.customer_id,
            bill_id:     bill._id,
            payment_date: parseUTC(data.payment_date),
            paid_amount:  data.paid_amount,
            payment_method: data.payment_method,
            reference_number: data.reference_number,
            remaining_after_payment: remaining,
            payment_status: status,
            notes:        data.notes,
            collected_by: collectedBy,
        })

        // Update bill status
        const billStatus = calcBillStatus(total_paid_so_far, bill.final_payable)
        await BillingRepository.updateStatus(String(bill._id), billStatus)

        // Write ledger entry
        await LedgerEngine.record({
            customer_id:  String(bill.customer_id),
            type:         'PAYMENT_RECEIVED',
            amount:       data.paid_amount,
            reference_id: String(payment._id),
            note:         `Payment via ${data.payment_method}`,
        })

        return payment
    },
}
```

---

## 10. Customer Summary API — Computed Read Layer

This is a **read-only** computed endpoint. It never writes to any collection.
It is the only correct way to display financial data for a customer on the frontend.

### What it Computes On Demand

```
GET /api/payments/customer-summary/:customerId

Three parallel aggregation queries:

  1. TiffinEntry aggregate [match customer_id]
     → total_billed = SUM(total_amount) across all entries

  2. Payment aggregate [match customer_id]
     → total_paid        = SUM(paid_amount)
     → advance_balance   = SUM(|remaining_amount|) WHERE status = 'advance'

  3. Payment.find [match customer_id, sort by payment_date DESC]
     → payment history list

Calculated in memory (no DB write):
     outstanding = max(0, total_billed - total_paid)

Returns:
{
  customer_id, full_name, phone, address,
  total_billed,      ← sum of all tiffin entries ever
  total_paid,        ← sum of all payments ever
  outstanding,       ← computed: total_billed - total_paid
  advance_balance,   ← computed: overpayment credit
  payments: [...]    ← full payment history
}
```

### Separation From Customer Master

```typescript
// modules/payments/payment.service.ts

export const PaymentSummaryService = {

    async getCustomerSummary(customerId: string): Promise<CustomerSummary> {
        await dbConnect()
        const objectId = new mongoose.Types.ObjectId(customerId)

        const [customer, tiffinAgg, paymentAgg, payments] = await Promise.all([
            // Identity from Customer collection (read-only, no write)
            CustomerRepository.findById(customerId),

            // Financial totals from TiffinEntry collection (read-only)
            TiffinEntryRepository.aggregateTotalByCustomer(customerId),

            // Financial totals from Payment collection (read-only)
            PaymentRepository.aggregateTotalByCustomer(customerId),

            // Payment history (read-only)
            PaymentRepository.findByCustomer(customerId),
        ])

        if (!customer) throw { code: 'NOT_FOUND', message: 'Customer not found' }

        const total_billed    = tiffinAgg.total ?? 0
        const total_paid      = paymentAgg.total_paid ?? 0
        const advance_balance = paymentAgg.advance_balance ?? 0
        const outstanding     = Math.max(0, total_billed - total_paid)

        // ✗ We do NOT: customer.pending_amount = outstanding
        // ✗ We do NOT: CustomerRepository.update(customerId, { pending_amount: outstanding })
        // ✓ We return the computed value directly as a response

        return {
            customer_id:   customerId,
            full_name:     customer.full_name,
            phone:         customer.phone,
            address:       customer.address,
            total_billed,
            total_paid,
            outstanding,
            advance_balance,
            payments,
        }
    },
}
```

### Frontend: Two Separate Queries, Two Separate Caches

```typescript
// Customer profile data — cached under customerKeys
const { data: customer } = useCustomer(id)
// queryKey: ['customers', 'detail', id]
// source:   GET /api/customers/[id]
// staleTime: 5 min (changes rarely)

// Financial summary — cached under summaryKeys (SEPARATE)
const { data: summary } = useCustomerSummary(id)
// queryKey: ['summary', 'customer', id]
// source:   GET /api/payments/customer-summary/[id]
// staleTime: 60s (changes frequently)

// These two caches are NEVER linked.
// Paying a bill invalidates summaryKeys, NOT customerKeys.
// Editing a customer name invalidates customerKeys, NOT summaryKeys.
```

---

## 11. Master Ledger System

Every financial event writes a ledger entry. This makes the system auditable: every rupee has a history.

### Ledger Model

```typescript
// lib/db/models/ledger.model.ts

export const LEDGER_EVENT_TYPES = [
    'BILL_GENERATED',
    'PAYMENT_RECEIVED',
    'ADVANCE_ADDED',
    'ADVANCE_USED',
    'ADJUSTMENT',
    'REFUND',
] as const

export type LedgerEventType = typeof LEDGER_EVENT_TYPES[number]

const LedgerSchema = new Schema({
    customer_id:  { type: Schema.Types.ObjectId, ref: 'Customer', required: true },

    type:         { type: String, enum: LEDGER_EVENT_TYPES, required: true },

    amount:       { type: Number, required: true },
    // positive = customer owes more / money received
    // negative = credit / advance deduction

    running_balance: { type: Number, required: true },
    // balance AFTER this event (+ = customer owes, - = advance credit)

    reference_id:  { type: Schema.Types.ObjectId },  // bill._id or payment._id
    reference_type: { type: String },                 // 'CustomerBill' | 'Payment'

    note:         { type: String, trim: true },
    recorded_by:  { type: String },
}, { timestamps: true })

LedgerSchema.index({ customer_id: 1, createdAt: -1 })
LedgerSchema.index({ type: 1 })
LedgerSchema.index({ createdAt: -1 })
```

### Ledger Engine

```typescript
// lib/calculations/ledger.engine.ts

import Ledger from '@/lib/db/models/ledger.model'
import mongoose from 'mongoose'

interface LedgerRecordInput {
    customer_id:    string
    type:           LedgerEventType
    amount:         number
    reference_id?:  string
    reference_type?: string
    note?:          string
    recorded_by?:   string
}

export const LedgerEngine = {

    async record(input: LedgerRecordInput) {
        const objectId = new mongoose.Types.ObjectId(input.customer_id)

        // Get current running balance for this customer
        const lastEntry = await Ledger.findOne({ customer_id: objectId })
            .sort({ createdAt: -1 })
            .select('running_balance')
            .lean()

        const currentBalance = lastEntry?.running_balance ?? 0

        // BILL_GENERATED = customer owes more (+)
        // PAYMENT_RECEIVED = balance decreases (-)
        const delta = ['BILL_GENERATED', 'ADJUSTMENT'].includes(input.type)
            ? +input.amount
            : -input.amount

        const running_balance = currentBalance + delta

        return Ledger.create({
            customer_id:    objectId,
            type:           input.type,
            amount:         input.amount,
            running_balance,
            reference_id:   input.reference_id ? new mongoose.Types.ObjectId(input.reference_id) : undefined,
            reference_type: input.reference_type,
            note:           input.note,
            recorded_by:    input.recorded_by,
        })
    },

    async getBalance(customerId: string): Promise<number> {
        const lastEntry = await Ledger.findOne({
            customer_id: new mongoose.Types.ObjectId(customerId)
        }).sort({ createdAt: -1 }).select('running_balance').lean()

        return lastEntry?.running_balance ?? 0
    },

    async getHistory(customerId: string, limit = 50) {
        return Ledger.find({ customer_id: new mongoose.Types.ObjectId(customerId) })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean()
    },
}
```

### Ledger Event Timeline

```
 Customer "Ramesh Patel" — May 2026

 Date       Event              Amount    Running Balance
 ─────────  ─────────────────  ────────  ───────────────
 May 31     BILL_GENERATED     +₹900     +₹900  (owes ₹900)
 May 31     PAYMENT_RECEIVED   -₹600     +₹300  (still owes ₹300)
 Jun 5      PAYMENT_RECEIVED   -₹300     ₹0     (settled)
 Jun 30     BILL_GENERATED     +₹840     +₹840  (owes ₹840)
 Jun 30     PAYMENT_RECEIVED   -₹1000    -₹160  (advance credit ₹160)
 Jul 31     BILL_GENERATED     +₹870     +₹710  (advance applied)
 Jul 31     ADVANCE_USED       -₹160     +₹550  (net payable = ₹550)
```

---

## 10. Reports Module

Separate reporting engine that reads from all collections.

### Report Types

```typescript
// modules/reports/report.types.ts

export interface CollectionReport {
    period: { start: string; end: string }
    total_collected: number
    total_pending:   number
    payment_count:   number
    customer_count:  number
    top_customers:   TopCustomer[]
    by_method:       ByMethod[]
}

export interface PendingReport {
    customers: {
        customer_id:   string
        full_name:     string
        phone:         string
        outstanding:   number   // from ledger running balance
        last_payment?: string
    }[]
    total_outstanding: number
}

export interface CustomerBalanceReport {
    customer_id:     string
    full_name:       string
    total_billed:    number
    total_paid:      number
    current_balance: number   // from ledger
    ledger_history:  LedgerEntry[]
    payment_history: Payment[]
    bill_history:    CustomerBill[]
}

export interface DailyOpsReport {
    date:             string
    total_customers:  number
    morning_count:    number
    evening_count:    number
    total_qty:        number
    total_amount:     number
    delivered_count:  number
    skipped_count:    number
}

export interface MonthlyReport {
    year:  number
    month: number
    weeks: WeeklySummary[]
    total_collected:  number
    total_pending:    number
    new_customers:    number
    churned_customers: number
    top_customers:    TopCustomer[]
}
```

---

## 13. Query Factory & Cache Strategy

### Why Separate Query Keys Per Layer

Each architectural layer gets **its own query key namespace**. This means:
- Paying a bill invalidates `summaryKeys`, not `customerKeys`
- Editing a customer name invalidates `customerKeys`, not `summaryKeys`
- Saving tiffin entries invalidates `tiffinKeys`, not `paymentKeys`
- Cache invalidation is surgical, not shotgun

### Query Key Factories

Prevents query key chaos. All query keys live in one file. No raw strings in hooks.

```typescript
// lib/query/keys.ts

export const customerKeys = {
    all:    ()           => ['customers']                           as const,
    lists:  ()           => [...customerKeys.all(), 'list']        as const,
    list:   (p: object)  => [...customerKeys.lists(), p]           as const,
    details:()           => [...customerKeys.all(), 'detail']      as const,
    detail: (id: string) => [...customerKeys.details(), id]        as const,
    stats:  ()           => [...customerKeys.all(), 'stats']       as const,
}

export const tiffinKeys = {
    all:     ()                           => ['tiffin']             as const,
    entries: (date: string)              => ['tiffin', 'entries', date]    as const,
    preview: (date: string, from?: string) => ['tiffin', 'preview', date, from ?? null] as const,
}

export const billingKeys = {
    all:      ()           => ['billing']                         as const,
    lists:    ()           => [...billingKeys.all(), 'list']      as const,
    list:     (p: object)  => [...billingKeys.lists(), p]         as const,
    detail:   (id: string) => [...billingKeys.all(), 'detail', id] as const,
    calculate:(customerId: string, start: string, end: string) =>
        [...billingKeys.all(), 'calculate', customerId, start, end] as const,
}

export const paymentKeys = {
    all:     ()           => ['payments']                         as const,
    lists:   ()           => [...paymentKeys.all(), 'list']       as const,
    list:    (p: object)  => [...paymentKeys.lists(), p]          as const,
    detail:  (id: string) => [...paymentKeys.all(), 'detail', id] as const,
    stats:   ()           => [...paymentKeys.all(), 'stats']      as const,
    summary: (cId: string)=> [...paymentKeys.all(), 'summary', cId] as const,
}

export const reportKeys = {
    monthly:  (y: number, m: number) => ['reports', 'monthly', y, m]   as const,
    pending:  ()                      => ['reports', 'pending']          as const,
    balance:  (cId: string)           => ['reports', 'balance', cId]    as const,
    dailyOps: (date: string)          => ['reports', 'daily-ops', date] as const,
}

// ── Customer Summary — SEPARATE namespace from customers ──────────────────────
// These are computed read-only values. NEVER co-locate with customerKeys.
// Invalidated by payment/billing events, NOT by customer profile edits.
export const summaryKeys = {
    all:      ()            => ['summary']                              as const,
    customer: (id: string)  => ['summary', 'customer', id]             as const,
    batch:    (ids: string[])=> ['summary', 'batch', ids.sort().join(',')] as const,
}
```

### Cache Invalidation Strategy — Which Event Invalidates What

```
 Event                          Invalidates                    Does NOT Invalidate
 ─────────────────────────────  ─────────────────────────────  ───────────────────────────
 Customer created/updated       customerKeys.all()             summaryKeys (no financial change)
 Customer deactivated           customerKeys.all()             summaryKeys, paymentKeys

 Tiffin entry saved (bulk)      tiffinKeys (date + preview)    customerKeys, paymentKeys
 Tiffin entry locked (billed)   tiffinKeys (date)              billingKeys handled by billing svc

 Bill snapshot generated        billingKeys.all()              customerKeys
                                summaryKeys.customer(id)       tiffinKeys
                                paymentKeys.stats()

 Payment created/updated        paymentKeys.all()              customerKeys (NO write-back)
                                summaryKeys.customer(id)       tiffinKeys
                                billingKeys.detail(billId)

 Payment deleted                paymentKeys.all()              customerKeys
                                summaryKeys.customer(id)

 Backup run                     (no React Query cache involved)
```

```typescript
// hooks/usePayments.ts — correct invalidation on payment create
export function useCreatePayment() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (data: CreatePaymentInput) => apiClient.post('/api/payments', data),
        onSuccess: (_, variables) => {
            qc.invalidateQueries({ queryKey: paymentKeys.all() })
            qc.invalidateQueries({ queryKey: summaryKeys.customer(variables.customer_id) })
            qc.invalidateQueries({ queryKey: billingKeys.detail(variables.bill_id) })
            // ↑ DO NOT invalidate customerKeys — Customer Master unchanged
        },
    })
}

// hooks/useCustomers.ts — profile edit does NOT touch financial cache
export function useUpdateCustomer() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, data }) => apiClient.patch(`/api/customers/${id}`, data),
        onSuccess: (_, { id }) => {
            qc.invalidateQueries({ queryKey: customerKeys.all() })
            // ↑ DO NOT invalidate summaryKeys — financial data unchanged
        },
    })
}
```

### Usage in hooks

```typescript
// hooks/useCustomers.ts

import { customerKeys } from '@/lib/query/keys'

export function useCustomers(params: CustomerQueryParams) {
    return useQuery({
        queryKey: customerKeys.list(params),      // ← from factory, not raw string
        queryFn:  () => apiClient.get('/api/customers', params),
    })
}

export function useCreateCustomer() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (data: CreateCustomerInput) => apiClient.post('/api/customers', data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: customerKeys.all() })
            // ↑ invalidates ALL customer queries: list, detail, stats
        },
    })
}
```

---

## 12. Typed API Client

One place for all fetch logic. Never write raw `fetch` in hooks or components.

```typescript
// lib/api/client.ts

import type { ApiSuccess, ApiError } from '@/types/api.types'

type ApiResponse<T> = ApiSuccess<T> | ApiError

class ApiClient {
    private baseUrl: string

    constructor(baseUrl = '') {
        this.baseUrl = baseUrl
    }

    private async request<T>(
        method: string,
        path: string,
        body?: unknown,
        params?: Record<string, string | number | undefined>
    ): Promise<ApiSuccess<T>> {
        let url = this.baseUrl + path

        if (params) {
            const sp = new URLSearchParams()
            Object.entries(params).forEach(([k, v]) => {
                if (v !== undefined && v !== '') sp.set(k, String(v))
            })
            const qs = sp.toString()
            if (qs) url += '?' + qs
        }

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: body ? JSON.stringify(body) : undefined,
            credentials: 'include',   // sends httpOnly cookie
        })

        const json: ApiResponse<T> = await res.json()

        if (!res.ok || !json.success) {
            throw json as ApiError
        }

        return json as ApiSuccess<T>
    }

    get<T>(path: string, params?: Record<string, string | number | undefined>) {
        return this.request<T>('GET', path, undefined, params)
    }
    post<T>(path: string, body: unknown) {
        return this.request<T>('POST', path, body)
    }
    patch<T>(path: string, body: unknown) {
        return this.request<T>('PATCH', path, body)
    }
    delete<T>(path: string) {
        return this.request<T>('DELETE', path)
    }
}

export const apiClient = new ApiClient()
```

---

## 13. UI Architecture

### Component Responsibility Rules

```
app/(private)/[feature]/page.tsx
    → data fetching (hooks only)
    → layout composition
    → NO business logic

components/[feature]/FeatureTable.tsx
    → TanStack Table
    → column definitions
    → NO API calls

components/[feature]/FeatureForm.tsx
    → TanStack Form
    → field rendering
    → calls mutation from parent via prop

components/forms/FormField.tsx
    → reusable field wrapper (label + error + input)
    → used inside every TanStack Form
```

### Table Standardization

Every data table must implement:

```typescript
// components/tables/DataTable.tsx

interface DataTableProps<TData, TValue> {
    columns:        ColumnDef<TData, TValue>[]
    data:           TData[]
    isLoading?:     boolean
    pagination?:    PaginationMeta
    onPageChange?:  (page: number) => void
    searchValue?:   string
    onSearchChange?:(value: string) => void
    filters?:       FilterConfig[]         // column visibility, status filter
    onExportCSV?:   () => void
    stickyHeader?:  boolean
    selectable?:    boolean
    onRowSelect?:   (rows: TData[]) => void
}
```

### UX Patterns by Action Type

```
Action              Component           Notes
──────────────────  ──────────────────  ─────────────────────────────
Create / Edit       <Drawer>            Slides from right, form inside
Delete              <AlertDialog>       "Are you sure?" confirm required
Filters panel       <Sheet>             Full height, from right
Row detail view     Side panel          Splits screen, no navigation
Mobile quick action Bottom Sheet       Vaul Drawer from bottom
Confirmation step   <Dialog>           Centered modal for critical ops
```

### Form Pattern with TanStack Form

```typescript
// components/forms/PaymentForm.tsx

import { useForm } from '@tanstack/react-form'
import { createPaymentSchema } from '@/modules/payments/payment.validators'

export function PaymentForm({ onSubmit }: { onSubmit: (data: CreatePaymentInput) => void }) {
    const form = useForm({
        defaultValues: { paid_amount: 0, payment_method: 'cash' as const },
        onSubmit: async ({ value }) => {
            const parsed = createPaymentSchema.safeParse(value)
            if (!parsed.success) return
            onSubmit(parsed.data)
        },
    })

    return (
        <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}>
            <form.Field name="paid_amount" validators={{ onChange: ({ value }) =>
                value <= 0 ? 'Amount must be greater than 0' : undefined
            }}>
                {(field) => (
                    <FormField label="Paid Amount" error={field.state.meta.errors[0]}>
                        <Input
                            type="number"
                            value={field.state.value}
                            onChange={e => field.handleChange(Number(e.target.value))}
                        />
                    </FormField>
                )}
            </form.Field>
            {/* ... */}
        </form>
    )
}
```

---

## 14. Backup System Upgrade

### Backup Log Collection

```typescript
// lib/db/models/backup-log.model.ts

const BackupLogSchema = new Schema({
    filename:       { type: String, required: true },
    onedrive_path:  { type: String, required: true },
    web_url:        { type: String },
    size_bytes:     { type: Number },
    duration_ms:    { type: Number },
    status:         { type: String, enum: ['success', 'failed'], required: true },
    error_message:  { type: String },
    collections:    { type: Map, of: Number },   // { customers: 42, payments: 130, ... }
    total_records:  { type: Number },
    triggered_by:   { type: String, default: 'cron' },  // 'cron' | 'manual'
}, { timestamps: true })

BackupLogSchema.index({ createdAt: -1 })
BackupLogSchema.index({ status: 1 })
```

### Backup Verification Step

```typescript
// modules/backup/backup.service.ts

export async function runBackup(triggeredBy = 'cron') {
    const startedAt = Date.now()
    let logEntry: Partial<BackupLog> = { triggered_by: triggeredBy, status: 'failed' }

    try {
        // 1. Export
        const { collections, stats } = await exportCollections()

        // 2. Compress
        const zipBuffer = generateBackupZip(payload)

        // 3. Upload
        const { web_url, size } = await uploadToOneDrive(zipBuffer, remotePath)

        // 4. VERIFY — download back and check record count
        const verifyPayload = await downloadBackup(dateStr)
        const verifyCount   = Object.values(verifyPayload.collections)
            .reduce((s, c) => s + (c as unknown[]).length, 0)

        if (verifyCount !== totalRecords) {
            throw new Error(`Verification failed: uploaded ${totalRecords} records, downloaded ${verifyCount}`)
        }

        logEntry = {
            filename, onedrive_path: remotePath, web_url,
            size_bytes: size, duration_ms: Date.now() - startedAt,
            status: 'success', collections: stats, total_records: totalRecords,
            triggered_by: triggeredBy,
        }
    } catch (e) {
        logEntry.error_message = e instanceof Error ? e.message : String(e)
        logEntry.duration_ms   = Date.now() - startedAt
        throw e
    } finally {
        await BackupLog.create(logEntry)  // always write log, success or failure
    }
}
```

### Backup Structure on OneDrive

```
backups/
├── daily/
│   ├── 2026/
│   │   ├── 05/
│   │   │   ├── backup-2026-05-15.zip
│   │   │   └── backup-2026-05-16.zip
│   │   └── 06/
├── weekly/              ← kept for 4 weeks (Sunday snapshots)
│   └── 2026-W20.zip
└── manual/              ← triggered via /api/backup/restore UI
    └── backup-manual-2026-05-16T14-30-00.zip
```

---

## 15. Security Hardening

### Required Headers (via Next.js config)

```typescript
// next.config.ts

const securityHeaders = [
    { key: 'X-DNS-Prefetch-Control',  value: 'on' },
    { key: 'X-Frame-Options',         value: 'SAMEORIGIN' },
    { key: 'X-Content-Type-Options',  value: 'nosniff' },
    { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy',      value: 'camera=(), microphone=(), geolocation=()' },
    {
        key: 'Content-Security-Policy',
        value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-eval' 'unsafe-inline'",   // Next.js needs these
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob:",
            "connect-src 'self'",
        ].join('; ')
    },
]
```

### Cookie Security

```typescript
// httpOnly    → not readable by JavaScript (XSS proof)
// secure      → only sent over HTTPS in production
// sameSite    → 'strict' prevents CSRF
// path        → '/' so all routes get the cookie
// maxAge      → 7 days, explicit expiry
```

### Audit Log

```typescript
// lib/db/models/audit-log.model.ts

const AuditLogSchema = new Schema({
    action:      { type: String, required: true },    // 'customer.create', 'payment.delete'
    resource_id: { type: Schema.Types.ObjectId },
    resource_type: { type: String },
    performed_by:  { type: String, required: true },  // session user email
    ip_address:    { type: String },
    changes:       { type: Schema.Types.Mixed },       // { before: {}, after: {} }
    success:       { type: Boolean, default: true },
}, { timestamps: true })

AuditLogSchema.index({ action: 1 })
AuditLogSchema.index({ createdAt: -1 })
AuditLogSchema.index({ performed_by: 1 })
```

---

## 16. TypeScript Conventions

### Strict Mode Required

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true
  }
}
```

### Never Use `any` — Alternatives

```typescript
// ✗ BAD
function process(data: any) { return data.value }

// ✓ For unknown external data
function process(data: unknown) {
    if (typeof data === 'object' && data !== null && 'value' in data) {
        return (data as { value: string }).value
    }
    throw new Error('Invalid data shape')
}

// ✓ For service errors
type ServiceError = { code: string; message: string }
function isServiceError(e: unknown): e is ServiceError {
    return typeof e === 'object' && e !== null && 'code' in e && 'message' in e
}

// ✓ Discriminated union for API responses
type Result<T> = { ok: true; data: T } | { ok: false; error: string }
```

### Shared API Types

```typescript
// types/api.types.ts

export type ApiSuccess<T> = {
    success: true
    message: string
    data:    T
    error:   null
    meta?:   PaginationMeta
}

export type ApiError = {
    success: false
    message: string
    data:    null
    error:   { code: ErrorCode; details?: unknown }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

export type PaginationMeta = {
    page:       number
    limit:      number
    total:      number
    totalPages: number
}

export type ErrorCode =
    | 'VALIDATION_ERROR'
    | 'UNAUTHORIZED'
    | 'TOKEN_EXPIRED'
    | 'NOT_FOUND'
    | 'CONFLICT'
    | 'RATE_LIMIT_EXCEEDED'
    | 'BILLING_LOCKED'        // entry is_billed = true
    | 'INTERNAL_SERVER_ERROR'
```

---

## 17. Route Handler Pattern

Every route handler follows this exact structure. No exceptions.

```typescript
// Template for any route handler

import { NextRequest } from 'next/server'
import { FeatureService } from '@/modules/feature/feature.service'
import { createFeatureSchema } from '@/modules/feature/feature.validators'
import { success, created, badRequest, notFound, conflict, internalServerError } from '@/lib/api/response'
import { getAuthContext } from '@/lib/auth/context'

export async function GET(request: NextRequest) {
    // 1. Auth (auth is handled by middleware but context extraction here)
    const auth = getAuthContext(request)   // reads x-user-role header set by middleware

    try {
        // 2. Parse query params
        const sp     = request.nextUrl.searchParams
        const params = { page: parseInt(sp.get('page') ?? '1') }

        // 3. Call service
        const result = await FeatureService.list(params)

        // 4. Return
        return success(result.docs, 'Fetched', { page: params.page, ...result.meta })
    } catch (e) {
        return internalServerError(e)
    }
}

export async function POST(request: NextRequest) {
    const auth = getAuthContext(request)

    try {
        // 1. Parse + validate body
        const body   = await request.json()
        const parsed = createFeatureSchema.safeParse(body)
        if (!parsed.success)
            return badRequest('Validation failed', parsed.error.flatten().fieldErrors)

        // 2. Call service
        const result = await FeatureService.create(parsed.data, auth.userId)

        // 3. Return
        return created(result, 'Created successfully')
    } catch (e: unknown) {
        if (isServiceError(e)) {
            if (e.code === 'NOT_FOUND') return notFound(e.message)
            if (e.code === 'CONFLICT')  return conflict(e.message)
        }
        return internalServerError(e)
    }
}
```

---

## 18. Data Flow Diagrams

### Complete Billing Flow (New)

```
 ┌─────────────────────────────────────────────────────────────────┐
 │                     DAILY OPERATIONS                           │
 └─────────────────────────────────────────────────────────────────┘

  Each day (morning / evening):
  GET /api/tiffin/preview?date=TODAY[&fromDate=YESTERDAY]
        │
        ▼
  Shows all active customers with defaults / copied values
        │
  User adjusts quantities
        │
  POST /api/tiffin/bulk
        │
  ┌─────────────────────────────────────┐
  │  For each entry:                    │
  │  1. Capture price snapshot from     │
  │     customer defaults (or override) │
  │  2. Calculate total_amount          │
  │  3. Upsert IF is_billed = false     │
  └─────────────────────────────────────┘
        │
  Entries saved as immutable historical records

 ┌─────────────────────────────────────────────────────────────────┐
 │                     END OF BILLING PERIOD                      │
 └─────────────────────────────────────────────────────────────────┘

  POST /api/billing/generate
  { customer_id, billing_start_date, billing_end_date }
        │
        ▼
  billing.engine.ts → calculateBill()
  ├── SUM(TiffinEntry.total_amount) in date range
  ├── previous_pending from older open bills
  └── advance_adjustment from overpayments
        │
        ▼
  generateBillSnapshot()
  ├── Creates CustomerBill document (frozen snapshot)
  └── Locks tiffin entries → is_billed: true, billing_id: bill._id
        │
        ▼
  Ledger.record({ type: 'BILL_GENERATED', amount: final_payable })
        │
  running_balance += final_payable

 ┌─────────────────────────────────────────────────────────────────┐
 │                     PAYMENT COLLECTION                         │
 └─────────────────────────────────────────────────────────────────┘

  POST /api/payments
  { bill_id, paid_amount, payment_method, ... }
        │
        ▼
  payment.service.ts
  ├── Fetch bill → get final_payable
  ├── Sum existing payments for this bill
  ├── payment.engine.ts → calcPaymentStatus(total_paid, final_payable)
  ├── Create Payment document
  ├── Update CustomerBill.bill_status
  └── LedgerEngine.record({ type: 'PAYMENT_RECEIVED', amount: paid })
        │
  running_balance -= paid_amount

 ┌─────────────────────────────────────────────────────────────────┐
 │               LEDGER BALANCE = CUSTOMER TRUTH                  │
 └─────────────────────────────────────────────────────────────────┘

  CustomerStats.outstanding
  = LedgerEngine.getBalance(customerId)
  → positive = customer owes
  → negative = advance credit
```

### Module Dependency Graph

```
  app/api/*/route.ts
        │ calls
        ▼
  modules/*/service.ts              ← orchestration only
        │ calls
        ├──► modules/*/repository.ts   ← DB queries only
        │           │
        │           └──► lib/db/models/
        │
        ├──► lib/calculations/billing.engine.ts
        │                    payment.engine.ts
        │                    ledger.engine.ts
        │
        └──► lib/api/response.ts        ← response helpers

  No arrows should go UPWARD.
  No circular dependencies.
  Engines have no deps on repositories.
  Repositories have no deps on services.
```

---

## 19. Migration Path from Current Architecture

### Phase 1 — Foundation (no user-visible changes)

```
1. Create lib/db/connect.ts       (move from lib/mongodb.ts)
2. Create lib/auth/jwt.ts         (new custom JWT)
3. Create lib/api/client.ts       (typed fetch wrapper)
4. Create lib/api/response.ts     (move from lib/apiResponse.ts)
5. Create lib/query/keys.ts       (query factories)
6. Create lib/calculations/payment.engine.ts  (extract from route handlers)
7. Add customer_bills model
8. Add ledger model
9. Add backup_log model
10. Run DB migrations: add is_billed, billing_id fields to TiffinEntry
```

### Phase 2 — Module Extraction (behind the scenes)

```
1. Create modules/customers/  (repository + service + validators)
   → Move logic from app/api/customers/* routes
2. Create modules/tiffin/
   → Move logic from app/api/tiffin-entries/* routes
3. Create modules/billing/
   → Billing engine + generate bill snapshot flow
4. Create modules/payments/
   → Bill-linked payment creation
5. Wire LedgerEngine into billing + payment services
```

### Phase 3 — Auth Migration

```
1. Add new POST /api/auth/login route (custom JWT)
2. Add new GET  /api/auth/logout route
3. Update middleware.ts → use lib/auth/middleware.ts (remove next-auth)
4. Update app/(private)/layout.tsx → read JWT cookie instead of getServerSession
5. Remove next-auth package
```

### Phase 4 — Frontend Hooks Migration

```
1. Replace raw string queryKeys → lib/query/keys.ts factories
2. Replace inline apiFetch → lib/api/client.ts
3. Update hooks to use new billing hooks (useBilling, useGenerateBillSnapshot)
4. Add ledger balance to customer detail page
```

### Phase 5 — Rate Limiting Upgrade

```
1. Add Upstash Redis (npm install @upstash/ratelimit @upstash/redis)
2. Replace lib/rateLimit.ts globalThis Map with Upstash sliding window
3. Add UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN to env vars
```

```typescript
// lib/rateLimit.ts (Upstash version)
import { Ratelimit } from '@upstash/ratelimit'
import { Redis }     from '@upstash/redis'

const redis = new Redis({
    url:   process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export const rateLimiters = {
    read:  new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(200, '60s') }),
    write: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(50,  '60s') }),
    bulk:  new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20,  '60s') }),
}
```

### Backward Compatibility During Migration

```
Keep old routes running while new ones are built:

  /api/customers  ← old (still works)
  /api/customers  ← new (same path, thin handler calling new service)

  Since route handlers become thin shells calling services,
  the migration is transparent to the frontend.
  Swap service implementation, not the URL.
```

---

## Environment Variables (Updated)

```bash
# Database
MONGODB_URI=mongodb+srv://...

# Custom JWT (replaces NextAuth)
JWT_SECRET=<64-byte random hex>

# Admin credentials
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your_secure_password

# Cron security
CRON_SECRET=<32+ byte base64>

# OneDrive backup (Microsoft Graph)
ONEDRIVE_CLIENT_ID=<Azure AD client ID>
ONEDRIVE_CLIENT_SECRET=<Azure AD client secret>
ONEDRIVE_REFRESH_TOKEN=<OAuth2 refresh token>

# Rate limiting (Phase 5)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# App
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```
