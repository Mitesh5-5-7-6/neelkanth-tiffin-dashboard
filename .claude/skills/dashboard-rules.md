# Neelkanth Tiffin Dashboard — Claude Project Skill

## Project Type

Private Admin Dashboard for Tiffin Service Management.

Primary goals:

- Fast operational workflow
- Low-click daily entry system
- High-performance data tables
- Accurate billing/payment tracking
- Stable MongoDB architecture
- Scalable module structure

---

# Core Stack

## Frontend

- Next.js 16 App Router
- React 19
- TypeScript Strict Mode
- Tailwind CSS
- shadcn/ui

## State Management

- TanStack Query
- TanStack Table
- TanStack Form
- TanStack Virtual

## Backend

- Next.js Route Handlers
- MongoDB Atlas
- Mongoose ODM

## Validation

- Zod only

## Authentication

- JWT auth
- httpOnly cookie session
- Middleware-based protection

## Deployment

- Vercel
- MongoDB Atlas M0
- Vercel Cron
- OneDrive backup storage

---

# API Architecture Rules

## ALL API routes MUST follow:

/api/nts/v1/<module>

Examples:

/api/nts/v1/auth/login
/api/nts/v1/customers
/api/nts/v1/payments
/api/nts/v1/tiffin-entries/bulk
/api/nts/v1/expenses
/api/nts/v1/dashboard/stats

Never use:

- /api/users
- /api/customer
- /api/test
- inconsistent route naming

---

# API Standards

## Response Shape

Always use standardized API responses.

Success:

```ts
{
  success: true,
  message: string,
  data: T,
  meta?: {
    page?: number,
    limit?: number,
    total?: number,
    totalPages?: number
  }
}
```

Error:

```ts
{
  success: false,
  message: string,
  error?: {
    code: string,
    details?: unknown
  }
}
```

---

# Folder Structure Rules

Use feature-first modular architecture.

Example:

src/
├── app/
│ ├── (public)/
│ ├── (private)/
│ └── api/
│
├── components/
│ ├── common/
│ ├── ui/
│ ├── customers/
│ ├── payments/
│ ├── expenses/
│ └── tiffin/
│
├── modules/
│ ├── customers/
│ ├── payments/
│ ├── expenses/
│ └── dashboard/
│
├── services/
├── repositories/
├── lib/
├── hooks/
├── schemas/
├── models/
├── types/
└── constants/

---

# Route Group Rules

## Public Routes

app/(public)/

Contains:

- login
- forgot-password
- public pages

Public layout must NOT include sidebar.

---

## Private Routes

app/(private)/

Protected via middleware + server auth validation.

Contains:

- dashboard
- customers
- payments
- expenses
- reports
- settings

Private layout MUST include:

- Sidebar
- Header
- Session validation
- Role protection
- Responsive shell

---

# Authentication Rules

## MUST use:

- httpOnly cookies
- JWT verification
- middleware.ts
- server-side auth validation

## NEVER:

- store auth in localStorage
- expose token to client
- trust frontend auth state alone

---

# Server Actions Rules

Prefer:

```ts
"use server";
```

Use server actions for:

- mutations
- form submissions
- admin operations

Avoid exposing sensitive responses in browser network tab when possible.

BUT:

Do NOT overuse server actions for:

- heavy pagination
- table fetching
- filtering
- large list APIs

Use route handlers + TanStack Query there.

---

# Database Rules

## MongoDB Standards

Every collection MUST include:

```ts
{
  createdAt: Date;
  updatedAt: Date;
}
```

Enable timestamps in all schemas.

---

# Mongoose Rules

Always:

- use lean() for read queries
- use indexes
- validate ObjectId
- use typed models
- prevent model overwrite

Example:

```ts
export const UserModel = models.User || model<IUser>("User", UserSchema);
```

---

# TypeScript Rules

## STRICT MODE REQUIRED

Never use:

```ts
any;
```

Use:

- unknown
- generics
- proper interfaces
- discriminated unions

---

# Global Types Rules

Use:

types/
├── api.types.ts
├── auth.types.ts
├── common.types.ts
├── customer.types.ts
├── payment.types.ts
├── expense.types.ts
└── globals.d.ts

---

# UI/UX Rules

## Design Philosophy

Admin dashboard must feel:

- fast
- dense
- operational
- keyboard-friendly
- minimal-click

NOT:

- marketing website
- oversized cards
- excessive animations

---

# Component Rules

## Use shadcn/ui only

Primary UI patterns:

- Drawer CRUD
- Sheet panels
- Dialog confirmations
- TanStack Table grids
- Sticky table headers
- Reusable filters

---

# Table Rules

All tables MUST support:

- pagination
- search
- sorting
- column visibility
- loading skeleton
- empty states
- server-side filtering

Use:

- TanStack Table
- TanStack Virtual for large datasets

---

# Form Rules

Use:

- TanStack Form
- Zod resolver
- reusable form fields

Avoid:

- Formik
- uncontrolled forms
- duplicated validation

---

# Query Rules

Use TanStack Query everywhere.

## Query Keys

Examples:

```ts
["customers"][("customers", customerId)]["payments"][("payments", filters)][
  "expenses"
][("dashboard", "stats")];
```

---

# Mutation Rules

After mutation:

- invalidate queries
- optimistic update when possible
- show toast feedback

---

# Customer Module Rules

Customer is MASTER ENTITY.

Customer stores:

- personal info
- default tiffin configuration
- active status
- billing relationship
- payment history

Never duplicate customer data across modules unnecessarily.

---

# Tiffin Entry Rules

Daily tiffin entries are transactional records.

Unique key:

```ts
customer_id + entry_date;
```

Bulk operations preferred.

Use:

- bulkWrite
- upsert
- aggregation pipelines

---

# Payment Module Rules

Payment module must:

- auto-calculate remaining
- support partial payments
- support advance balance
- support bill generation
- track billing periods

Payment history must remain immutable.

---

# Expense Module Rules

Expenses are business operational costs.

Categories:

- vegetables
- milk
- gas
- salary
- packaging
- transport
- misc

Expense stats must integrate into dashboard profit calculations.

---

# Dashboard Rules

Dashboard should show:

- today's tiffins
- revenue
- pending collections
- expense totals
- active customers
- trends

All dashboard queries should run in parallel.

---

# Performance Rules

Always optimize for:

- low DB reads
- parallel fetching
- memoized columns
- pagination
- virtualized rendering

Avoid:

- N+1 queries
- client-side heavy filtering
- unnecessary rerenders

---

# Security Rules

Always:

- validate input
- sanitize payloads
- validate auth in API
- rate limit APIs
- hide server errors in production

Never:

- expose stack traces
- expose Mongo errors directly
- trust client payload blindly

---

# Middleware Rules

Middleware responsibilities:

- auth protection
- rate limiting
- route guarding
- pathname injection

Public routes bypass auth.

Private routes require valid JWT.

---

# Backup System Rules

Every day after 01:00 AM IST:

- export MongoDB JSON
- compress ZIP
- upload to OneDrive

Backup must include:

- customers
- payments
- tiffin entries
- expenses

---

# Code Style Rules

Prefer:

- small reusable utilities
- feature isolation
- descriptive naming
- async/await
- pure functions

Avoid:

- giant page.tsx files
- inline business logic
- deeply nested JSX
- duplicated fetch logic

---

# Naming Conventions

## Components

PascalCase

Example:
CustomerTable.tsx

## Hooks

useX

Example:
useCustomers.ts

## Actions

verbNoun

Example:
createCustomer

## API handlers

route.ts only

---

# Architecture Philosophy

This project is an operational business system.

Priority order:

1. Reliability
2. Speed
3. Data integrity
4. Low-click workflow
5. Developer maintainability
6. UI polish

Never sacrifice data integrity for fancy UI.

---

# Claude Development Behavior

When generating code for this project:

ALWAYS:

- use TypeScript strict types
- generate production-ready code
- follow existing module architecture
- use reusable abstractions
- optimize Mongo queries
- use server-safe patterns
- preserve API consistency

NEVER:

- use any
- introduce Redux
- introduce Formik
- create inconsistent response shapes
- create duplicated business logic
- use client-side auth-only protection
- generate oversized bloated components

---

# Preferred Development Pattern

## API

route.ts
→ validation
→ auth check
→ service layer
→ repository layer
→ standardized response

## UI

page.tsx
→ feature composition only

Business logic belongs in:

- hooks
- services
- actions
- reusable components

---

# Important Business Logic

## Soft Delete

Customers:

- NEVER hard delete
- use is_active=false

## Hard Delete

Allowed for:

- temporary draft records only

## Financial Records

Payments and expenses should remain auditable.

Avoid destructive edits.

---

# Deployment Notes

Environment:

- Vercel
- MongoDB Atlas M0

Optimize for:

- cold starts
- low memory
- minimal DB connections

Use global mongoose caching.

---

# Future Scalability

Architecture should support:

- multi-admin roles
- kitchen staff panel
- delivery tracking
- WhatsApp integration
- invoice PDF generation
- GST reporting
- mobile app support
- analytics dashboards

Do not hardcode assumptions that block future scaling.
