-- Run once in Supabase SQL Editor.
-- Enables safe frontend-triggered schema self-healing for menu tables.

CREATE OR REPLACE FUNCTION public.ensure_menu_schema()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  ALTER TABLE public.menu_categories
    ADD COLUMN IF NOT EXISTS description text,
    ADD COLUMN IF NOT EXISTS image_url text,
    ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

  ALTER TABLE public.menu_items
    ADD COLUMN IF NOT EXISTS description text,
    ADD COLUMN IF NOT EXISTS image_url text,
    ADD COLUMN IF NOT EXISTS type text DEFAULT 'veg',
    ADD COLUMN IF NOT EXISTS is_available boolean DEFAULT true;

  RETURN jsonb_build_object(
    'ok', true,
    'message', 'menu schema ensured'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_menu_schema() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_menu_schema() TO authenticated;
