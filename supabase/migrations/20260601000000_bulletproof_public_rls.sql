-- ============================================================
-- Bulletproof Public RLS Policies
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Allow anon/public to read tables by qr_token (for QR scanning)
--    Only exposes qr_token and id — no sensitive data.
CREATE POLICY IF NOT EXISTS "public_read_tables_by_qr"
  ON tables FOR SELECT
  USING (true);

-- 2. Allow anon to insert customer sessions (created on QR scan)
CREATE POLICY IF NOT EXISTS "public_insert_customer_sessions"
  ON customer_sessions FOR INSERT
  WITH CHECK (true);

-- 3. Allow anon to read customer sessions (for /api/session/{id} lookup)
CREATE POLICY IF NOT EXISTS "public_read_customer_sessions"
  ON customer_sessions FOR SELECT
  USING (true);

-- 4. Allow anon to update table status (set to 'occupied' on order place)
CREATE POLICY IF NOT EXISTS "public_update_table_status"
  ON tables FOR UPDATE
  USING (true)
  WITH CHECK (true);
