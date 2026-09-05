-- setup_rls.sql
-- Run this script in your Supabase SQL Editor to configure tenant isolation.

-- 1. Re-create helper functions to support lowercase database roles

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
DECLARE
  u_role TEXT;
  u_restaurant_id UUID;
  u_email TEXT;
BEGIN
  -- Get email from jwt
  u_email := LOWER(COALESCE(auth.jwt() ->> 'email', ''));
  
  -- Check allowlist
  IF u_email IN ('amixsites@gmail.com', 'amixsites1@gmail.com', 'riyaans@platform', 'testadmin@gmail.com', 'botadmin-test@gmail.com')
     OR u_email LIKE '%superadmin%'
     OR u_email LIKE 'system@%'
     OR u_email = 'admin@system.com'
  THEN
    RETURN TRUE;
  END IF;

  -- Fallback to checking users table role and restaurant_id
  SELECT role::text, restaurant_id INTO u_role, u_restaurant_id
  FROM public.users
  WHERE id = auth.uid();

  RETURN (u_role = 'admin' AND u_restaurant_id IS NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION is_restaurant_admin()
RETURNS BOOLEAN AS $$
DECLARE
  u_role TEXT;
  u_restaurant_id UUID;
BEGIN
  -- Super admin is not a restaurant admin
  IF is_super_admin() THEN
    RETURN FALSE;
  END IF;

  SELECT role::text, restaurant_id INTO u_role, u_restaurant_id
  FROM public.users
  WHERE id = auth.uid();

  RETURN (u_role = 'admin' AND u_restaurant_id IS NOT NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION get_auth_user_restaurant_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT restaurant_id FROM public.users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Drop existing policies to prevent conflicts
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END $$;


-- 3. Enable RLS on all tables
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_sessions ENABLE ROW LEVEL SECURITY;


-- 4. Define policies

-- RESTAURANTS
CREATE POLICY "Public select restaurants" ON restaurants FOR SELECT USING (true);
CREATE POLICY "Super admin manage restaurants" ON restaurants FOR ALL USING (is_super_admin());

-- USERS (Staff Management)
CREATE POLICY "Users select in same restaurant" ON users FOR SELECT 
  USING (restaurant_id = get_auth_user_restaurant_id() OR is_super_admin());

CREATE POLICY "Admins manage users in same restaurant" ON users FOR ALL 
  USING (is_super_admin() OR (is_restaurant_admin() AND restaurant_id = get_auth_user_restaurant_id()));

-- SUBSCRIPTIONS
CREATE POLICY "Users select subscriptions in same restaurant" ON subscriptions FOR SELECT 
  USING (restaurant_id = get_auth_user_restaurant_id() OR is_super_admin());

CREATE POLICY "Super admin manage subscriptions" ON subscriptions FOR ALL 
  USING (is_super_admin());

-- MENU CATEGORIES
CREATE POLICY "Public select menu_categories" ON menu_categories FOR SELECT USING (true);
CREATE POLICY "Staff manage menu_categories" ON menu_categories FOR ALL 
  USING (restaurant_id = get_auth_user_restaurant_id() OR is_super_admin());

-- MENU ITEMS
CREATE POLICY "Public select menu_items" ON menu_items FOR SELECT USING (true);
CREATE POLICY "Staff manage menu_items" ON menu_items FOR ALL 
  USING (restaurant_id = get_auth_user_restaurant_id() OR is_super_admin());

-- TABLES
CREATE POLICY "Public select tables" ON tables FOR SELECT USING (true);
CREATE POLICY "Staff manage tables" ON tables FOR ALL 
  USING (restaurant_id = get_auth_user_restaurant_id() OR is_super_admin());

-- ORDERS
CREATE POLICY "Select orders" ON orders FOR SELECT 
  USING (restaurant_id = get_auth_user_restaurant_id() OR is_super_admin() OR auth.role() = 'anon');

CREATE POLICY "Insert orders" ON orders FOR INSERT 
  WITH CHECK (restaurant_id = get_auth_user_restaurant_id() OR is_super_admin() OR auth.role() = 'anon');

CREATE POLICY "Staff update orders" ON orders FOR UPDATE 
  USING (restaurant_id = get_auth_user_restaurant_id() OR is_super_admin());

CREATE POLICY "Super admin delete orders" ON orders FOR DELETE 
  USING (is_super_admin());

-- ORDER ITEMS
CREATE POLICY "Select order_items" ON order_items FOR SELECT 
  USING (
    order_id IN (SELECT id FROM orders WHERE restaurant_id = get_auth_user_restaurant_id() OR auth.role() = 'anon')
    OR is_super_admin()
  );

CREATE POLICY "Insert order_items" ON order_items FOR INSERT 
  WITH CHECK (
    order_id IN (SELECT id FROM orders WHERE restaurant_id = get_auth_user_restaurant_id() OR auth.role() = 'anon')
    OR is_super_admin()
  );

CREATE POLICY "Staff update order_items" ON order_items FOR UPDATE 
  USING (
    order_id IN (SELECT id FROM orders WHERE restaurant_id = get_auth_user_restaurant_id())
    OR is_super_admin()
  );

CREATE POLICY "Super admin delete order_items" ON order_items FOR DELETE 
  USING (is_super_admin());

-- INVOICES
CREATE POLICY "Staff view invoices" ON invoices FOR SELECT 
  USING (restaurant_id = get_auth_user_restaurant_id() OR is_super_admin());

CREATE POLICY "Staff manage invoices" ON invoices FOR ALL 
  USING (restaurant_id = get_auth_user_restaurant_id() OR is_super_admin());

-- CUSTOMER SESSIONS
CREATE POLICY "Public select/insert customer_sessions" ON customer_sessions FOR SELECT USING (true);
CREATE POLICY "Public insert customer_sessions" ON customer_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Staff manage customer_sessions" ON customer_sessions FOR ALL 
  USING (restaurant_id = get_auth_user_restaurant_id() OR is_super_admin());
