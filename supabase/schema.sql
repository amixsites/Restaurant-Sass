-- Restaurant POS SaaS Database Schema
-- Run this script in your Supabase SQL Editor

-- 1. Create Enums
CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'RESTAURANT_ADMIN', 'MANAGER', 'WAITER', 'KITCHEN', 'CASHIER', 'CUSTOMER');
CREATE TYPE order_status AS ENUM ('PENDING', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED');
CREATE TYPE payment_method AS ENUM ('CASH', 'UPI', 'CARD', 'SPLIT');

-- 2. Restaurants Table (Multi-tenant core)
CREATE TABLE restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Users Table (Extends Supabase auth.users)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'CUSTOMER',
    phone VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Subscriptions Table
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    plan_name VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Menu Categories
CREATE TABLE menu_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Menu Items
CREATE TABLE menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    image_url TEXT,
    is_available BOOLEAN DEFAULT true,
    type VARCHAR(50) DEFAULT 'veg', -- veg, non-veg, egg
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Tables (Restaurant seating)
CREATE TABLE tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    table_number VARCHAR(50) NOT NULL,
    capacity INTEGER DEFAULT 4,
    status VARCHAR(50) DEFAULT 'available', -- available, occupied, reserved
    current_order_id UUID, -- Will reference orders(id)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Orders
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    table_id UUID REFERENCES tables(id) ON DELETE SET NULL,
    waiter_id UUID REFERENCES users(id) ON DELETE SET NULL,
    customer_phone VARCHAR(50),
    status order_status DEFAULT 'PENDING',
    total_amount DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key reference back from tables to orders safely
ALTER TABLE tables ADD CONSTRAINT fk_tables_orders FOREIGN KEY (current_order_id) REFERENCES orders(id) ON DELETE SET NULL;

-- 9. Order Items
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES menu_items(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    notes TEXT,
    status order_status DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Invoices & Billing
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id),
    invoice_number VARCHAR(100) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method payment_method,
    payment_status VARCHAR(50) DEFAULT 'pending',
    whatsapp_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security (RLS) Policies Setup
-- Enable RLS on all tables
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Create helper function to get current user's restaurant_id
CREATE OR REPLACE FUNCTION get_auth_user_restaurant_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT restaurant_id FROM users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to get current user's role
CREATE OR REPLACE FUNCTION get_auth_user_role()
RETURNS user_role AS $$
BEGIN
  RETURN (SELECT role FROM users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS: Restaurants
-- Super Admin can see and create all, others can only see their own
CREATE POLICY "Super admins view all restaurants" ON restaurants
  FOR SELECT USING (get_auth_user_role() = 'SUPER_ADMIN');

CREATE POLICY "Super admins can insert restaurants" ON restaurants
  FOR INSERT WITH CHECK (get_auth_user_role() = 'SUPER_ADMIN');

CREATE POLICY "Users view own restaurant" ON restaurants
  FOR SELECT USING (id = get_auth_user_restaurant_id() OR get_auth_user_role() = 'SUPER_ADMIN');

-- RLS: Users
CREATE POLICY "Users view users in same restaurant" ON users
  FOR SELECT USING (restaurant_id = get_auth_user_restaurant_id() OR get_auth_user_role() = 'SUPER_ADMIN');

-- RLS: Orders (Tenant Isolation)
CREATE POLICY "Users view orders in same restaurant" ON orders
  FOR SELECT USING (restaurant_id = get_auth_user_restaurant_id() OR get_auth_user_role() = 'SUPER_ADMIN');

CREATE POLICY "Users insert orders in same restaurant" ON orders
  FOR INSERT WITH CHECK (restaurant_id = get_auth_user_restaurant_id());

CREATE POLICY "Users update orders in same restaurant" ON orders
  FOR UPDATE USING (restaurant_id = get_auth_user_restaurant_id());

-- (Similar policies apply to other tenant tables, abbreviated here for core isolation)
CREATE POLICY "Tenant isolation for menu_items" ON menu_items
  FOR ALL USING (restaurant_id = get_auth_user_restaurant_id() OR get_auth_user_role() = 'SUPER_ADMIN');

CREATE POLICY "Tenant isolation for menu_categories" ON menu_categories
  FOR ALL USING (restaurant_id = get_auth_user_restaurant_id() OR get_auth_user_role() = 'SUPER_ADMIN');

CREATE POLICY "Tenant isolation for tables" ON tables
  FOR ALL USING (restaurant_id = get_auth_user_restaurant_id() OR get_auth_user_role() = 'SUPER_ADMIN');

CREATE POLICY "Tenant isolation for invoices" ON invoices
  FOR ALL USING (restaurant_id = get_auth_user_restaurant_id() OR get_auth_user_role() = 'SUPER_ADMIN');

CREATE POLICY "Tenant isolation for order_items" ON order_items
  FOR ALL USING (
    order_id IN (SELECT id FROM orders WHERE restaurant_id = get_auth_user_restaurant_id())
    OR get_auth_user_role() = 'SUPER_ADMIN'
  );

-- Enable Supabase Realtime for specific tables
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE tables;
