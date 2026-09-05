#!/bin/bash
# Run Supabase migrations

echo "🗄️  Running Supabase migrations..."

echo "Please run these SQL files in your Supabase SQL Editor in order:"
echo ""
echo "1. supabase/schema.sql"
echo "2. supabase/migrations/phase2_schema.sql"
echo "3. supabase/migrations/phase3_indexes.sql"
echo "4. supabase/migrations/phase4_customer_rls.sql"
echo ""
echo "After running migrations, enable realtime for:"
echo "  - orders"
echo "  - order_items"
echo "  - tables"
echo ""
echo "Go to: Supabase Dashboard → Database → Replication"
