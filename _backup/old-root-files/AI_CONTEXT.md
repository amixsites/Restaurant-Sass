# Restaurant POS SaaS — AI Context Document

This document provides a comprehensive overview of the Restaurant POS SaaS application for AI models to quickly understand the codebase without scanning the entire repository.

## 1. Tech Stack
- **Frontend Framework**: React 19 (via Vite 8)
- **Language**: TypeScript 6
- **Styling**: Tailwind CSS, shadcn/ui, Radix UI
- **Backend / Database**: Supabase (PostgreSQL, Auth, Realtime, Storage, Edge Functions)
- **Data Fetching / Caching**: TanStack Query (React Query v5)
- **Global State Management**: Zustand v5
- **Routing**: React Router DOM v7
- **Forms & Validation**: React Hook Form + Zod
- **Icons**: Lucide React
- **Deployment**: Vercel (frontend) + Supabase (backend)

## 2. Core Architecture & Multi-Tenancy
The application is a multi-tenant SaaS platform where multiple restaurants operate independently.
- **Tenant Isolation**: Every major table has a `restaurant_id` column.
- **Row Level Security (RLS)**: Supabase RLS ensures users can only read/write their own restaurant's data.
- **Query Caching**: All TanStack Query keys MUST include `restaurantId` (e.g., `['menu_categories', restaurantId]`) to prevent cross-tenant data leakage.

## 3. User Roles & Authentication
Authentication via Supabase Auth (Email/Password). On login, user profile is fetched from `users` table.

**Roles:**
1. `SUPER_ADMIN` → `/super-admin` — Creates restaurants, manages all tenants
2. `RESTAURANT_ADMIN` → `/admin` — Full restaurant management
3. `MANAGER` → `/admin` — Same as admin (shares admin dashboard)
4. `WAITER` → `/waiter` — Takes orders, manages tables
5. `KITCHEN` → `/kitchen` — Kitchen Display System (KDS)
6. `CASHIER` → `/admin/billing` — Billing and payment processing
7. `CUSTOMER` → `/m/:restaurantId/:tableId` — QR menu (no login required)

## 4. Database Schema (Supabase)
Key tables:
- `restaurants`: id, name, slug, address, phone, is_active
- `users`: id (matches auth.users), email, role, restaurant_id, full_name, is_active
- `subscriptions`: restaurant_id, plan_name, status, valid_until
- `menu_categories`: id, restaurant_id, name, description, image_url, sort_order, is_active
- `menu_items`: id, restaurant_id, category_id, name, description, price, type (veg/non-veg/egg), image_url, is_available
- `tables`: id, restaurant_id, table_number, table_name, table_type, capacity, status, qr_code_url
- `orders`: id, restaurant_id, table_id, waiter_id, status (PENDING/PREPARING/READY/SERVED/COMPLETED/CANCELLED), total_amount
- `order_items`: id, order_id, menu_item_id, quantity, unit_price, total_price, notes, status
- `invoices`: id, restaurant_id, order_id, invoice_number, subtotal, tax_amount, discount_amount, total_amount, payment_method, payment_status

## 5. State Management (Zustand)
- `useAuthStore` (`src/store/authStore.ts`): session, user, role, restaurantId, isSubscriptionExpired, isInitialized
- `useTenantStore` (`src/store/tenantStore.ts`): restaurantId, restaurantName for active tenant
- `useCartStore` (`src/store/cartStore.ts`): Customer QR menu shopping cart
- `useTakeOrderCart` (`src/store/useTakeOrderCart.ts`): Waiter take-order cart

## 6. Project Structure
```
src/
├── components/          # Reusable UI components
│   ├── layout/          # AppSidebar, TopBar, MobileNav
│   └── ui/              # shadcn/ui primitives
├── guards/              # ProtectedRoute (RBAC)
├── hooks/
│   └── api/             # TanStack Query hooks (Supabase data layer)
├── layouts/             # AdminLayout, TabletLayout, CustomerLayout
├── lib/                 # supabase.ts, logger.ts, utils.ts
├── pages/               # Page components by domain
├── services/            # whatsappService.ts (currently mocked)
└── store/               # Zustand stores
```

## 7. API Hooks (src/hooks/api/)
| Hook | Tables | Realtime |
|---|---|---|
| `useMenu.ts` | menu_categories, menu_items | No |
| `useTables.ts` | tables | Yes — postgres_changes |
| `useOrders.ts` | orders, order_items | Yes — postgres_changes |
| `useKitchenActions.ts` | orders, order_items | No (mutations) |
| `useAnalytics.ts` | invoices, orders, tables, users, order_items | No (polls 30s) |
| `useRestaurants.ts` | restaurants | No |
| `useStaff.ts` | users | No |
| `useCustomerMenu.ts` | menu_categories, menu_items | No |
| `useTakeOrder.ts` | orders, order_items, tables | No (mutation) |

## 8. Logging Standard
Use `logger` from `src/lib/logger.ts` for all significant operations. Logs are suppressed in production (`import.meta.env.PROD`).

```typescript
import { logger } from '@/lib/logger';

logger.start('MODULE', 'ACTION', 'Starting...', optionalPayload);
logger.success('MODULE', 'ACTION', 'Done!', optionalPayload);
logger.error('MODULE', 'ACTION', error, 'Optional message');
logger.warn('MODULE', 'ACTION', 'Warning message');
logger.info('MODULE', 'ACTION', 'Info message');
```

Modules: `AUTH | MENU | TABLES | ORDERS | BILLING | STAFF | ANALYTICS | SYSTEM | KITCHEN`

## 9. Critical Rules for AI Modifications
- **NEVER** use generic cache invalidation without `restaurantId` in the key
- **NEVER** assume Supabase schema migrations run automatically — implement frontend fallbacks for new columns
- **ALWAYS** use `logger.*` instead of `console.log` for new code
- **ALWAYS** check for undefined `restaurantId` before Supabase queries
- **ALWAYS** include `restaurantId` in TanStack Query keys for tenant-scoped data
- **DO NOT** expose the Supabase service role key in frontend code — use Edge Functions

## 10. Known Incomplete Features
- **WhatsApp Service** (`src/services/whatsappService.ts`): Fully mocked. Real implementation requires Meta WhatsApp Cloud API credentials in `.env`.
- **Subscription Management**: Manual via Supabase SQL. No self-service upgrade flow yet.
