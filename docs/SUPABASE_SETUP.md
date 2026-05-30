# Supabase Setup Guide

## Project Configuration

### Required Tables

Run `supabase/schema.sql` in the SQL Editor to create:

| Table | Purpose |
|---|---|
| `restaurants` | Multi-tenant core — one row per restaurant |
| `users` | Extends `auth.users` with role + restaurant_id |
| `subscriptions` | Subscription status and expiry per restaurant |
| `menu_categories` | Menu sections (e.g., Starters, Mains, Desserts) |
| `menu_items` | Individual dishes with price, type, availability |
| `tables` | Restaurant seating with QR code URLs |
| `orders` | Order lifecycle tracking |
| `order_items` | Individual items within each order |
| `invoices` | Billing records with payment details |

### Phase 2 Migrations

Run `supabase/migrations/phase2_schema.sql` to add:
- `menu_categories.description`, `image_url`, `is_active`
- `tables.table_name`, `table_type`, `qr_code_url`
- `users.is_active`

---

## Row Level Security (RLS)

RLS is enabled on all tables. Key policies:

### Tenant Isolation Pattern
```sql
-- Users can only see data from their own restaurant
CREATE POLICY "tenant_isolation" ON orders
  FOR ALL USING (restaurant_id = get_auth_user_restaurant_id());
```

### Helper Functions
```sql
-- Returns the restaurant_id of the currently authenticated user
get_auth_user_restaurant_id() → UUID

-- Returns the role of the currently authenticated user
get_auth_user_role() → user_role
```

### Customer (Unauthenticated) Access

Customers browse the menu without logging in. You need to add a policy allowing public read access to menu data:

```sql
-- Allow unauthenticated users to read menu for a specific restaurant
CREATE POLICY "public_menu_read" ON menu_categories
  FOR SELECT USING (is_active = true);

CREATE POLICY "public_menu_items_read" ON menu_items
  FOR SELECT USING (is_available = true);

-- Allow customers to insert orders (they provide restaurant_id via QR URL)
CREATE POLICY "customer_insert_orders" ON orders
  FOR INSERT WITH CHECK (true);

CREATE POLICY "customer_insert_order_items" ON order_items
  FOR INSERT WITH CHECK (true);
```

---

## Storage Setup

Run `supabase/create_bucket.sql` or manually:

1. Go to Supabase Dashboard → Storage
2. Create bucket: `menu-images`
3. Set to **Public** (images are served publicly)
4. Add storage policy:

```sql
-- Allow authenticated users to upload to their restaurant's folder
CREATE POLICY "restaurant_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'menu-images' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = get_auth_user_restaurant_id()::text
  );

-- Allow public read access to all menu images
CREATE POLICY "public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'menu-images');
```

---

## Realtime Configuration

Enable realtime for live order updates:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE tables;
```

In Supabase Dashboard → Database → Replication, verify these tables appear under `supabase_realtime`.

---

## Edge Functions

### manage-users

**Purpose:** Creates staff accounts with admin privileges (bypasses normal signup restrictions).

**Deployment:**
```bash
supabase functions deploy manage-users
```

**Called by:** `AddStaffDrawer.tsx` via `supabase.functions.invoke('manage-users', { body: {...} })`

**Authorization:** Verifies the caller's JWT and checks their role before creating any user.

---

## Performance Recommendations

### Indexes to Add

```sql
-- Speed up tenant-scoped queries
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_id ON menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_tables_restaurant_id ON tables(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_restaurant_id ON invoices(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);
```

### Connection Pooling

For production, enable **PgBouncer** in Supabase Dashboard → Database → Connection Pooling.
Use the pooler connection string for high-traffic scenarios.

---

## Subscription Management

The `subscriptions` table controls access:

```sql
-- Active subscription
INSERT INTO subscriptions (restaurant_id, plan_name, status, valid_until)
VALUES ('restaurant-uuid', 'Professional', 'active', NOW() + INTERVAL '1 year');

-- Expire a subscription
UPDATE subscriptions SET status = 'expired' WHERE restaurant_id = 'restaurant-uuid';
```

When a subscription expires, users are redirected to `/expired` and cannot access the POS until renewed.
