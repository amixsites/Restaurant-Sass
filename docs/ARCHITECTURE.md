# Restaurant POS SaaS — Architecture Overview

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + TypeScript |
| Styling | Tailwind CSS + shadcn/ui + Radix UI |
| State Management | Zustand (global) + TanStack Query (server state) |
| Routing | React Router DOM v7 |
| Forms & Validation | React Hook Form + Zod |
| Backend / Database | Supabase (PostgreSQL + Auth + Realtime + Storage + Edge Functions) |
| Deployment | Vercel (frontend) + Supabase (backend) |

---

## Project Structure

```
restaurant-pos/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── layout/          # AppSidebar, TopBar, MobileNav
│   │   └── ui/              # shadcn/ui primitives
│   ├── guards/              # ProtectedRoute (RBAC enforcement)
│   ├── hooks/
│   │   └── api/             # TanStack Query hooks (Supabase data layer)
│   ├── layouts/             # AdminLayout, TabletLayout, CustomerLayout
│   ├── lib/                 # supabase.ts, logger.ts, utils.ts
│   ├── pages/               # Page components by domain
│   │   ├── Customer/        # QR menu, cart, order success
│   │   ├── Kitchen/         # KDS (Kitchen Display System)
│   │   ├── RestaurantAdmin/ # Menu, Tables, Billing, Analytics, Staff
│   │   ├── SuperAdmin/      # Restaurant management
│   │   ├── TakeOrder/       # Waiter order-taking flow
│   │   └── Waiter/          # Waiter dashboard
│   ├── services/            # External service integrations (WhatsApp)
│   └── store/               # Zustand stores (auth, tenant, cart)
├── supabase/
│   ├── functions/           # Deno Edge Functions
│   │   └── manage-users/    # Privileged user creation
│   ├── migrations/          # Schema migration SQL files
│   └── schema.sql           # Full database schema
├── docs/                    # Project documentation
├── vercel.json              # Vercel deployment config
└── .env.example             # Environment variable template
```

---

## Multi-Tenancy Architecture

Every restaurant is a **tenant**. Tenant isolation is enforced at two levels:

1. **Database (Supabase RLS):** Every table has a `restaurant_id` column. Row Level Security policies ensure users can only read/write their own restaurant's data.

2. **Frontend (Query Keys):** All TanStack Query cache keys include `restaurantId` to prevent cross-tenant data leakage in the client cache.

```typescript
// Correct — tenant-scoped cache key
queryKey: ['orders', restaurantId]

// Wrong — would mix data across tenants
queryKey: ['orders']
```

---

## User Roles & Access Control

| Role | Dashboard | Permissions |
|---|---|---|
| `SUPER_ADMIN` | `/super-admin` | Create restaurants, manage all tenants |
| `RESTAURANT_ADMIN` | `/admin` | Full restaurant management |
| `MANAGER` | `/admin` | Same as admin, cannot delete restaurant |
| `WAITER` | `/waiter` | Take orders, manage tables |
| `KITCHEN` | `/kitchen` | View orders, update status (KDS) |
| `CASHIER` | `/admin/billing` | Generate bills, process payments |
| `CUSTOMER` | `/m/:restaurantId/:tableId` | Browse menu, place orders via QR |

---

## Authentication Flow

```
User visits app
    ↓
AuthInitializer (wraps entire app)
    ↓
supabase.auth.getSession() → check existing session
    ↓
Fetch user profile from public.users (role + restaurant_id)
    ↓
Check subscription status (if restaurant user)
    ↓
Set Zustand authStore + tenantStore
    ↓
RoleRedirect → navigate to role-appropriate dashboard
    ↓
ProtectedRoute → enforce role-based access on every route
```

---

## Realtime Architecture

Supabase Realtime (postgres_changes) is used for live updates:

| Channel | Table | Filter | Purpose |
|---|---|---|---|
| `schema-db-changes-orders` | `orders` | `restaurant_id=eq.{id}` | New orders, status changes |
| `schema-db-changes-order-items` | `order_items` | None (RLS enforces isolation) | Item status updates |
| `tables-changes` | `tables` | `restaurant_id=eq.{id}` | Table availability changes |

Backup polling is also active:
- Orders: every 10 seconds
- Analytics: every 30 seconds

---

## Database Schema Summary

```
restaurants          → Core tenant table
users                → Extends auth.users with role + restaurant_id
subscriptions        → Tenant subscription status + expiry
menu_categories      → Menu organization per restaurant
menu_items           → Individual dishes with pricing
tables               → Restaurant seating with QR codes
orders               → Order lifecycle (PENDING → COMPLETED)
order_items          → Individual items within an order
invoices             → Billing records with payment details
```

---

## Supabase Edge Functions

| Function | Purpose | Caller |
|---|---|---|
| `manage-users` | Creates staff accounts bypassing RLS (uses service role key) | `AddStaffDrawer.tsx` |

---

## Key Design Decisions

- **No separate backend server** — All data operations go directly to Supabase from the frontend using the anon key + RLS. This eliminates infrastructure complexity.
- **Edge Functions for privileged ops** — Operations requiring the service role key (like creating users) are handled by Supabase Edge Functions, keeping the service key server-side only.
- **Dual realtime + polling** — Realtime subscriptions provide instant updates; polling acts as a fallback for missed events.
- **Structured logging** — Custom `logger` class with module/action/status format. Logs are suppressed in production (`import.meta.env.PROD`).
