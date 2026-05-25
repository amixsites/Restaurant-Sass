-- Create a storage bucket for menu images
insert into storage.buckets (id, name, public)
values ('menu-images', 'menu-images', true)
on conflict (id) do nothing;

-- Set up storage policies for menu-images
create policy "Public Access to menu-images"
  on storage.objects for select
  using ( bucket_id = 'menu-images' );

create policy "Users can upload menu images"
  on storage.objects for insert
  with check ( bucket_id = 'menu-images' and auth.role() = 'authenticated' );

create policy "Users can update own menu images"
  on storage.objects for update
  using ( bucket_id = 'menu-images' and auth.role() = 'authenticated' );

create policy "Users can delete own menu images"
  on storage.objects for delete
  using ( bucket_id = 'menu-images' and auth.role() = 'authenticated' );
