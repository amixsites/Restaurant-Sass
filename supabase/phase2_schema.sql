-- 1. Add missing columns to menu_categories
ALTER TABLE menu_categories
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. Add missing columns to tables
ALTER TABLE tables
ADD COLUMN IF NOT EXISTS table_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS table_type VARCHAR(50) DEFAULT 'indoor',
ADD COLUMN IF NOT EXISTS qr_code_url TEXT;

-- 3. In case your users table doesn't have an explicit status column for Staff Management:
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 4. Update existing policies if necessary (Optional, but safe to run to ensure tenant isolation works with new columns)
-- No new policies strictly needed since the tables already exist and have RLS.
