-- ============================================================
-- new_DB.sql
-- Production-Ready Supabase Schema for Fresh Setup
-- ============================================================

-- 1. DROP EXISTING CONSTRUCTS (Clean Reset)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.is_super_admin();
DROP FUNCTION IF EXISTS public.is_restaurant_admin();
DROP FUNCTION IF EXISTS public.get_auth_user_restaurant_id();
DROP FUNCTION IF EXISTS public.get_auth_user_role();

DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.customer_sessions CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.tables CASCADE;
DROP TABLE IF EXISTS public.menu_items CASCADE;
DROP TABLE IF EXISTS public.menu_categories CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.restaurants CASCADE;

DROP TYPE IF EXISTS public.user_role CASCADE;
DROP TYPE IF EXISTS public.subscription_status CASCADE;
DROP TYPE IF EXISTS public.order_status CASCADE;
DROP TYPE IF EXISTS public.table_status CASCADE;
DROP TYPE IF EXISTS public.payment_status CASCADE;
DROP TYPE IF EXISTS public.payment_method CASCADE;

-- 2. CREATE CUSTOM ENUMS
CREATE TYPE public.user_role AS ENUM ('superadmin', 'admin', 'waiter', 'cashier', 'kitchen');
CREATE TYPE public.subscription_status AS ENUM ('active', 'expired', 'cancelled', 'trial');
CREATE TYPE public.order_status AS ENUM ('PENDING', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED');
CREATE TYPE public.table_status AS ENUM ('available', 'occupied', 'reserved');
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
CREATE TYPE public.payment_method AS ENUM ('CASH', 'UPI', 'CARD', 'SPLIT');

-- 3. CREATE TABLES

-- RESTAURANTS
CREATE TABLE public.restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    logo_url TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- USERS (Extends auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role public.user_role NOT NULL DEFAULT 'waiter'::public.user_role,
    phone VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SUBSCRIPTIONS
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    plan_name VARCHAR(100) NOT NULL,
    status public.subscription_status NOT NULL DEFAULT 'active'::public.subscription_status,
    valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MENU CATEGORIES
CREATE TABLE public.menu_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    description TEXT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MENU ITEMS
CREATE TABLE public.menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.menu_categories(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    image_url TEXT,
    is_available BOOLEAN DEFAULT true,
    type VARCHAR(50) DEFAULT 'veg', -- 'veg', 'non-veg', 'egg'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLES
CREATE TABLE public.tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    table_number VARCHAR(50) NOT NULL,
    capacity INTEGER DEFAULT 4,
    status public.table_status NOT NULL DEFAULT 'available'::public.table_status,
    current_order_id UUID,
    table_name VARCHAR(100),
    table_type VARCHAR(50) DEFAULT 'indoor',
    qr_code_url TEXT,
    qr_token VARCHAR(100) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ORDERS
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    table_id UUID REFERENCES public.tables(id) ON DELETE SET NULL,
    waiter_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    customer_phone VARCHAR(50),
    status public.order_status NOT NULL DEFAULT 'PENDING'::public.order_status,
    approval_status VARCHAR(50) DEFAULT 'PENDING_APPROVAL',
    total_amount DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add self-referential foreign key constraint to tables after creating orders
ALTER TABLE public.tables ADD CONSTRAINT fk_tables_orders FOREIGN KEY (current_order_id) REFERENCES public.orders(id) ON DELETE SET NULL;

-- ORDER ITEMS
CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    notes TEXT,
    status public.order_status NOT NULL DEFAULT 'PENDING'::public.order_status,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INVOICES
CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method public.payment_method,
    payment_status public.payment_status NOT NULL DEFAULT 'pending'::public.payment_status,
    whatsapp_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CUSTOMER SESSIONS
CREATE TABLE public.customer_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) UNIQUE NOT NULL,
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AUDIT LOGS
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    super_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    super_admin_email VARCHAR(255) NOT NULL,
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    restaurant_name VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    ip_address VARCHAR(50),
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. CREATE DATABASE FUNCTIONS & RLS HELPERS

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
DECLARE
  u_role TEXT;
  u_restaurant_id UUID;
  u_email TEXT;
BEGIN
  -- Get email from auth.jwt()
  u_email := LOWER(COALESCE(auth.jwt() ->> 'email', ''));
  
  -- Allowlist check
  IF u_email IN ('amixsites@gmail.com', 'amixsites1@gmail.com', 'riyaans@platform', 'testadmin@gmail.com', 'botadmin-test@gmail.com')
     OR u_email LIKE '%superadmin%'
     OR u_email LIKE 'system@%'
     OR u_email = 'admin@system.com'
  THEN
    RETURN TRUE;
  END IF;

  -- Fallback DB check
  SELECT role::text, restaurant_id INTO u_role, u_restaurant_id
  FROM public.users
  WHERE id = auth.uid();

  RETURN (u_role = 'superadmin' OR (u_role = 'admin' AND u_restaurant_id IS NULL));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION public.is_restaurant_admin()
RETURNS BOOLEAN AS $$
DECLARE
  u_role TEXT;
  u_restaurant_id UUID;
BEGIN
  IF public.is_super_admin() THEN
    RETURN FALSE;
  END IF;

  SELECT role::text, restaurant_id INTO u_role, u_restaurant_id
  FROM public.users
  WHERE id = auth.uid();

  RETURN (u_role = 'admin' AND u_restaurant_id IS NOT NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION public.get_auth_user_restaurant_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT restaurant_id FROM public.users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT role::text FROM public.users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. AUTOMATIC PROFILE CREATION TRIGGER

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  u_role TEXT;
  u_restaurant_id UUID;
  u_full_name TEXT;
BEGIN
  -- Extract metadata
  u_role := COALESCE(new.raw_user_meta_data ->> 'role', 'waiter');
  u_restaurant_id := (new.raw_user_meta_data ->> 'restaurantId')::UUID;
  u_full_name := COALESCE(new.raw_user_meta_data ->> 'fullName', new.email);

  -- Determine if super admin email
  IF LOWER(new.email) IN ('amixsites@gmail.com', 'amixsites1@gmail.com', 'riyaans@platform', 'testadmin@gmail.com', 'botadmin-test@gmail.com')
     OR LOWER(new.email) LIKE '%superadmin%'
     OR LOWER(new.email) LIKE 'system@%'
     OR LOWER(new.email) = 'admin@system.com'
  THEN
    u_role := 'superadmin';
    u_restaurant_id := NULL;
  END IF;

  INSERT INTO public.users (id, restaurant_id, full_name, email, role)
  VALUES (
    new.id,
    u_restaurant_id,
    u_full_name,
    new.email,
    u_role::public.user_role
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    restaurant_id = EXCLUDED.restaurant_id,
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    role = EXCLUDED.role;
    
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 7. DEFINE SECURE TENANT-ISOLATION POLICIES

-- RESTAURANTS
CREATE POLICY "Public read restaurants" ON public.restaurants FOR SELECT USING (true);
CREATE POLICY "Super admin manage restaurants" ON public.restaurants FOR ALL USING (public.is_super_admin());

-- USERS (Staff profiles)
CREATE POLICY "Users read same restaurant users" ON public.users FOR SELECT 
  USING (restaurant_id = public.get_auth_user_restaurant_id() OR public.is_super_admin());

CREATE POLICY "Admins manage users in same restaurant" ON public.users FOR ALL 
  USING (public.is_super_admin() OR (public.is_restaurant_admin() AND restaurant_id = public.get_auth_user_restaurant_id()));

-- SUBSCRIPTIONS
CREATE POLICY "Users view subscriptions in same restaurant" ON public.subscriptions FOR SELECT 
  USING (restaurant_id = public.get_auth_user_restaurant_id() OR public.is_super_admin());

CREATE POLICY "Super admin manage subscriptions" ON public.subscriptions FOR ALL 
  USING (public.is_super_admin());

-- MENU CATEGORIES
CREATE POLICY "Public read menu_categories" ON public.menu_categories FOR SELECT USING (true);
CREATE POLICY "Staff manage menu_categories" ON public.menu_categories FOR ALL 
  USING (restaurant_id = public.get_auth_user_restaurant_id() OR public.is_super_admin());

-- MENU ITEMS
CREATE POLICY "Public read menu_items" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "Staff manage menu_items" ON public.menu_items FOR ALL 
  USING (restaurant_id = public.get_auth_user_restaurant_id() OR public.is_super_admin());

-- TABLES
CREATE POLICY "Public read tables" ON public.tables FOR SELECT USING (true);
CREATE POLICY "Staff manage tables" ON public.tables FOR ALL 
  USING (restaurant_id = public.get_auth_user_restaurant_id() OR public.is_super_admin());

-- ORDERS
CREATE POLICY "Select orders" ON public.orders FOR SELECT 
  USING (restaurant_id = public.get_auth_user_restaurant_id() OR public.is_super_admin() OR auth.role() = 'anon');

CREATE POLICY "Insert orders" ON public.orders FOR INSERT 
  WITH CHECK (restaurant_id = public.get_auth_user_restaurant_id() OR public.is_super_admin() OR auth.role() = 'anon');

CREATE POLICY "Staff update orders" ON public.orders FOR UPDATE 
  USING (restaurant_id = public.get_auth_user_restaurant_id() OR public.is_super_admin());

CREATE POLICY "Super admin delete orders" ON public.orders FOR DELETE 
  USING (public.is_super_admin());

-- ORDER ITEMS
CREATE POLICY "Select order_items" ON public.order_items FOR SELECT 
  USING (
    order_id IN (SELECT id FROM public.orders WHERE restaurant_id = public.get_auth_user_restaurant_id() OR auth.role() = 'anon')
    OR public.is_super_admin()
  );

CREATE POLICY "Insert order_items" ON public.order_items FOR INSERT 
  WITH CHECK (
    order_id IN (SELECT id FROM public.orders WHERE restaurant_id = public.get_auth_user_restaurant_id() OR auth.role() = 'anon')
    OR public.is_super_admin()
  );

CREATE POLICY "Staff update order_items" ON public.order_items FOR UPDATE 
  USING (
    order_id IN (SELECT id FROM public.orders WHERE restaurant_id = public.get_auth_user_restaurant_id())
    OR public.is_super_admin()
  );

CREATE POLICY "Super admin delete order_items" ON public.order_items FOR DELETE 
  USING (public.is_super_admin());

-- INVOICES
CREATE POLICY "Staff view invoices" ON public.invoices FOR SELECT 
  USING (restaurant_id = public.get_auth_user_restaurant_id() OR public.is_super_admin());

CREATE POLICY "Staff manage invoices" ON public.invoices FOR ALL 
  USING (restaurant_id = public.get_auth_user_restaurant_id() OR public.is_super_admin());

-- CUSTOMER SESSIONS
CREATE POLICY "Public select/insert customer_sessions" ON public.customer_sessions FOR SELECT USING (true);
CREATE POLICY "Public insert customer_sessions" ON public.customer_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Staff manage customer_sessions" ON public.customer_sessions FOR ALL 
  USING (restaurant_id = public.get_auth_user_restaurant_id() OR public.is_super_admin());

-- AUDIT LOGS
CREATE POLICY "Super admin read audit_logs" ON public.audit_logs FOR SELECT 
  USING (public.is_super_admin());

CREATE POLICY "Super admin write audit_logs" ON public.audit_logs FOR INSERT 
  WITH CHECK (public.is_super_admin());

-- 8. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_users_restaurant_id ON public.users(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_restaurant_id ON public.subscriptions(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_categories_restaurant_id ON public.menu_categories(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_id ON public.menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_tables_restaurant_id ON public.tables(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON public.orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_restaurant_id ON public.invoices(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_session_id ON public.customer_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- 9. ENABLE REALTIME
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
    EXCEPTION WHEN duplicate_object THEN
      RAISE NOTICE 'orders already in realtime';
    END;
    
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.tables;
    EXCEPTION WHEN duplicate_object THEN
      RAISE NOTICE 'tables already in realtime';
    END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_sessions;
    EXCEPTION WHEN duplicate_object THEN
      RAISE NOTICE 'customer_sessions already in realtime';
    END;
  END IF;
END $$;

-- 10. SETUP STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public) 
VALUES ('menu-images', 'menu-images', true)
ON CONFLICT (id) DO NOTHING;

-- 11. SEED DEMO DATA

-- Demo Restaurant
INSERT INTO public.restaurants (id, name, slug, address, phone, is_active)
VALUES (
  'd24e3a50-b7ad-48e4-aeb7-862b9db813d6',
  'Demo Bistro',
  'demo-bistro',
  '123 Gourmet Street, Foodville',
  '+1 (555) 019-9234',
  true
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name, slug = EXCLUDED.slug, address = EXCLUDED.address, phone = EXCLUDED.phone;

-- Demo Subscription
INSERT INTO public.subscriptions (id, restaurant_id, plan_name, status, valid_until)
VALUES (
  gen_random_uuid(),
  'd24e3a50-b7ad-48e4-aeb7-862b9db813d6',
  'Pro Plan',
  'active'::public.subscription_status,
  NOW() + INTERVAL '365 days'
)
ON CONFLICT DO NOTHING;

-- Demo Tables
INSERT INTO public.tables (id, restaurant_id, table_number, capacity, status, table_name, table_type)
VALUES 
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'd24e3a50-b7ad-48e4-aeb7-862b9db813d6', '1', 2, 'available'::public.table_status, 'Table 1', 'indoor'),
  ('b2c3d4e5-f67a-8b9c-0d1e-2f3a4b5c6d7e', 'd24e3a50-b7ad-48e4-aeb7-862b9db813d6', '2', 4, 'available'::public.table_status, 'Table 2', 'indoor'),
  ('c3d4e5f6-7a8b-9c0d-1e2f-3a4b5c6d7e8f', 'd24e3a50-b7ad-48e4-aeb7-862b9db813d6', '3', 6, 'available'::public.table_status, 'Table 3', 'outdoor'),
  ('d4e5f67a-8b9c-0d1e-2f3a-4b5c6d7e8f9a', 'd24e3a50-b7ad-48e4-aeb7-862b9db813d6', '4', 4, 'available'::public.table_status, 'Table 4', 'window')
ON CONFLICT (id) DO NOTHING;

-- Demo Menu Categories
INSERT INTO public.menu_categories (id, restaurant_id, name, sort_order, description)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'd24e3a50-b7ad-48e4-aeb7-862b9db813d6', 'Starters', 1, 'Appetizers and quick bites'),
  ('22222222-2222-2222-2222-222222222222', 'd24e3a50-b7ad-48e4-aeb7-862b9db813d6', 'Main Course', 2, 'Hearty dinner entrees'),
  ('33333333-3333-3333-3333-333333333333', 'd24e3a50-b7ad-48e4-aeb7-862b9db813d6', 'Desserts', 3, 'Sweet treats to end your meal'),
  ('44444444-4444-4444-4444-444444444444', 'd24e3a50-b7ad-48e4-aeb7-862b9db813d6', 'Beverages', 4, 'Hot and cold refreshments')
ON CONFLICT (id) DO NOTHING;

-- Demo Menu Items
INSERT INTO public.menu_items (id, restaurant_id, category_id, name, description, price, is_available, type)
VALUES 
  (gen_random_uuid(), 'd24e3a50-b7ad-48e4-aeb7-862b9db813d6', '11111111-1111-1111-1111-111111111111', 'Garlic Bread', 'Toasted bread with garlic butter and herbs', 150.00, true, 'veg'),
  (gen_random_uuid(), 'd24e3a50-b7ad-48e4-aeb7-862b9db813d6', '11111111-1111-1111-1111-111111111111', 'Spring Rolls', 'Crispy wrapper stuffed with mixed vegetables', 180.00, true, 'veg'),
  (gen_random_uuid(), 'd24e3a50-b7ad-48e4-aeb7-862b9db813d6', '22222222-2222-2222-2222-222222222222', 'Paneer Butter Masala', 'Soft cottage cheese in rich tomato gravy', 320.00, true, 'veg'),
  (gen_random_uuid(), 'd24e3a50-b7ad-48e4-aeb7-862b9db813d6', '22222222-2222-2222-2222-222222222222', 'Chicken Tikka Masala', 'Grilled chicken chunks in spiced onion tomato sauce', 380.00, true, 'non-veg'),
  (gen_random_uuid(), 'd24e3a50-b7ad-48e4-aeb7-862b9db813d6', '33333333-3333-3333-3333-333333333333', 'Sizzling Brownie', 'Warm brownie with vanilla ice cream and hot fudge', 220.00, true, 'egg'),
  (gen_random_uuid(), 'd24e3a50-b7ad-48e4-aeb7-862b9db813d6', '44444444-4444-4444-4444-444444444444', 'Fresh Lime Soda', 'Refreshing lemon fizz sweetened or salted', 90.00, true, 'veg')
ON CONFLICT (id) DO NOTHING;

-- Seed default super admin if auth user exists
DO $$
DECLARE
  auth_uid UUID;
BEGIN
  SELECT id INTO auth_uid FROM auth.users WHERE email = 'amixsites@gmail.com' LIMIT 1;
  
  IF auth_uid IS NOT NULL THEN
    INSERT INTO public.users (id, restaurant_id, full_name, email, role)
    VALUES (auth_uid, NULL, 'System Super Admin', 'amixsites@gmail.com', 'superadmin'::public.user_role)
    ON CONFLICT (id) DO UPDATE
    SET role = 'superadmin'::public.user_role, restaurant_id = NULL;
  END IF;
END $$;

-- Seed demo admin user if auth user exists
DO $$
DECLARE
  auth_uid UUID;
BEGIN
  SELECT id INTO auth_uid FROM auth.users WHERE email = 'botadmin-restaurant-2@gmail.com' LIMIT 1;
  
  IF auth_uid IS NOT NULL THEN
    INSERT INTO public.users (id, restaurant_id, full_name, email, role)
    VALUES (
      auth_uid,
      'd24e3a50-b7ad-48e4-aeb7-862b9db813d6',
      'Demo Restaurant Admin',
      'botadmin-restaurant-2@gmail.com',
      'admin'::public.user_role
    )
    ON CONFLICT (id) DO UPDATE
    SET restaurant_id = EXCLUDED.restaurant_id, role = 'admin'::public.user_role;
  END IF;
END $$;
