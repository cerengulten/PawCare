-- Create storage buckets for pet photos and user profile avatars
insert into storage.buckets (id, name, public)
values ('pet-photos', 'pet-photos', true), ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Public read access for avatars and pet photos
create policy "Public Access Pet Photos" on storage.objects for select using (bucket_id = 'pet-photos');
create policy "Public Access Avatars" on storage.objects for select using (bucket_id = 'avatars');

-- Authenticated upload access
create policy "Authenticated users can upload pet photos" on storage.objects for insert with check (bucket_id = 'pet-photos' and auth.role() = 'authenticated');
create policy "Authenticated users can update pet photos" on storage.objects for update using (bucket_id = 'pet-photos' and auth.role() = 'authenticated');
create policy "Authenticated users can delete pet photos" on storage.objects for delete using (bucket_id = 'pet-photos' and auth.role() = 'authenticated');

create policy "Authenticated users can upload avatars" on storage.objects for insert with check (bucket_id = 'avatars' and auth.role() = 'authenticated');
create policy "Authenticated users can update avatars" on storage.objects for update using (bucket_id = 'avatars' and auth.role() = 'authenticated');
create policy "Authenticated users can delete avatars" on storage.objects for delete using (bucket_id = 'avatars' and auth.role() = 'authenticated');
