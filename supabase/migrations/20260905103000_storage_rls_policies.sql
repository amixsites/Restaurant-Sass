-- Enable RLS on storage.objects if not already enabled (it usually is)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies just in case to avoid conflicts
DROP POLICY IF EXISTS "Public Access to menu-images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload menu images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update menu images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete menu images" ON storage.objects;

-- 1. Public Select Policy: Anyone can read images from the menu-images bucket
CREATE POLICY "Public Access to menu-images"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'menu-images' );

-- 2. Authenticated Insert Policy: Any authenticated user can upload images
CREATE POLICY "Users can upload menu images"
  ON storage.objects FOR INSERT
  WITH CHECK ( bucket_id = 'menu-images' AND auth.role() = 'authenticated' );

-- 3. Authenticated Update Policy: Any authenticated user can update images
CREATE POLICY "Users can update menu images"
  ON storage.objects FOR UPDATE
  USING ( bucket_id = 'menu-images' AND auth.role() = 'authenticated' );

-- 4. Authenticated Delete Policy: Any authenticated user can delete images
CREATE POLICY "Users can delete menu images"
  ON storage.objects FOR DELETE
  USING ( bucket_id = 'menu-images' AND auth.role() = 'authenticated' );
