-- Phase 3: Performance Indexes
-- Run this in Supabase SQL Editor to improve query performance at scale.

-- Orders: most queried table
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status ON orders(restaurant_id, status);

-- Order Items: joined frequently with orders
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_menu_item_id ON order_items(menu_item_id);

-- Menu: frequently filtered by restaurant + availability
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_id ON menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON menu_items(restaurant_id, is_available);
CREATE INDEX IF NOT EXISTS idx_menu_categories_restaurant_id ON menu_categories(restaurant_id);

-- Tables: status checked frequently
CREATE INDEX IF NOT EXISTS idx_tables_restaurant_id ON tables(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_tables_status ON tables(restaurant_id, status);

-- Invoices: analytics queries
CREATE INDEX IF NOT EXISTS idx_invoices_restaurant_id ON invoices(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_restaurant_created ON invoices(restaurant_id, created_at DESC);

-- Users: staff lookups
CREATE INDEX IF NOT EXISTS idx_users_restaurant_id ON users(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
