-- Phase 4: Customer (Unauthenticated) RLS Policies
-- These policies allow QR-scanning customers to browse menus and place orders
-- without requiring a login account.

-- Allow public read of active menu categories
CREATE POLICY IF NOT EXISTS "public_read_menu_categories" ON menu_categories
  FOR SELECT USING (is_active = true);

-- Allow public read of available menu items
CREATE POLICY IF NOT EXISTS "public_read_menu_items" ON menu_items
  FOR SELECT USING (is_available = true);

-- Allow unauthenticated customers to insert orders
-- (restaurant_id is passed from the QR URL, validated by the app)
CREATE POLICY IF NOT EXISTS "customer_insert_orders" ON orders
  FOR INSERT WITH CHECK (true);

-- Allow customers to read their own order (by order id, no auth needed for status page)
CREATE POLICY IF NOT EXISTS "customer_read_own_order" ON orders
  FOR SELECT USING (true);

-- Allow customers to insert order items
CREATE POLICY IF NOT EXISTS "customer_insert_order_items" ON order_items
  FOR INSERT WITH CHECK (true);

-- Allow customers to read order items (for order success page)
CREATE POLICY IF NOT EXISTS "customer_read_order_items" ON order_items
  FOR SELECT USING (true);

-- Allow public read of restaurant info (for menu header display)
CREATE POLICY IF NOT EXISTS "public_read_restaurant_info" ON restaurants
  FOR SELECT USING (is_active = true);
