-- This file contains RPC functions to securely bypass RLS for administrative tasks
-- like Super Admin creating new Tenants and Staff.
-- Run this in your Supabase SQL Editor.

-- Enable pgcrypto for generating passwords if needed (already enabled by default in Supabase)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Create Staff (Callable by RESTAURANT_ADMIN)
CREATE OR REPLACE FUNCTION create_restaurant_staff(
    p_email VARCHAR,
    p_password VARCHAR,
    p_full_name VARCHAR,
    p_phone VARCHAR,
    p_role user_role,
    p_restaurant_id UUID
) RETURNS UUID AS $$
DECLARE
    v_user_id UUID;
    v_caller_role user_role;
    v_caller_restaurant_id UUID;
BEGIN
    -- 1. Verify caller is RESTAURANT_ADMIN for this restaurant OR SUPER_ADMIN
    SELECT role, restaurant_id INTO v_caller_role, v_caller_restaurant_id 
    FROM public.users WHERE id = auth.uid();

    IF v_caller_role != 'SUPER_ADMIN' AND (v_caller_role != 'RESTAURANT_ADMIN' OR v_caller_restaurant_id != p_restaurant_id) THEN
        RAISE EXCEPTION 'Unauthorized to create staff for this restaurant';
    END IF;

    -- 2. Create the user in auth.users (This requires postgres privileges, bypassing normal auth)
    -- WARNING: Modifying auth.users directly via SQL can be risky. 
    -- A better approach in production is using Supabase Edge Functions with Service Role Key.
    -- For this script, we assume the user will sign up via standard auth OR we provide this mock structure.
    
    -- In Supabase, the standard way to create users server-side is via the Admin API (auth.admin.createUser).
    -- Since SQL cannot directly call that, we will stub this. 
    
    RAISE EXCEPTION 'To securely create users, please deploy a Supabase Edge Function with SERVICE_ROLE_KEY or use the Dashboard. Creating auth.users directly via SQL is restricted by Supabase.';
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
