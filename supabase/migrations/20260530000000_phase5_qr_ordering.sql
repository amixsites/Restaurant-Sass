-- Phase 5: Secure Table QR Code Ordering and Session Management

-- 1. Add qr_token column to tables
ALTER TABLE tables ADD COLUMN IF NOT EXISTS qr_token VARCHAR(100) UNIQUE;

-- 2. Create customer_sessions table
CREATE TABLE IF NOT EXISTS customer_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) UNIQUE NOT NULL,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Add approval_status to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'APPROVED';

-- 4. Enable Row Level Security on customer_sessions
ALTER TABLE customer_sessions ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies for customer_sessions
CREATE POLICY "Allow public read of customer_sessions" ON customer_sessions
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert of customer_sessions" ON customer_sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update of customer_sessions" ON customer_sessions
  FOR UPDATE USING (true);

-- 6. RLS policy to allow public select of table metadata (number, capacity) for QR menus
CREATE POLICY "Allow public read of tables" ON tables
  FOR SELECT USING (true);
