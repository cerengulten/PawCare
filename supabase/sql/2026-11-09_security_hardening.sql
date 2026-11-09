-- =============================================================================
-- V2 Security Hardening Migration (2026-11-09)
-- 1. Enforces owner-scoped RLS (auth.uid() = owner) on storage.objects for
--    both 'pet-photos' and 'avatars' buckets so users cannot overwrite or
--    delete another user's photos.
-- 2. Hardens SECURITY DEFINER habit RPCs (increment_habit_completion,
--    decrement_habit_completion, increment_habit_amount) with authentication,
--    habit ownership, and positive-bound checks.
-- =============================================================================

-- 1. Storage Bucket RLS Policies
drop policy if exists "Authenticated users can upload pet photos" on storage.objects;
create policy "Authenticated users can upload pet photos" on storage.objects
  for insert with check (bucket_id = 'pet-photos' and auth.role() = 'authenticated' and auth.uid() = owner);

drop policy if exists "Authenticated users can update pet photos" on storage.objects;
create policy "Authenticated users can update pet photos" on storage.objects
  for update using (bucket_id = 'pet-photos' and auth.uid() = owner)
  with check (bucket_id = 'pet-photos' and auth.uid() = owner);

drop policy if exists "Authenticated users can delete pet photos" on storage.objects;
create policy "Authenticated users can delete pet photos" on storage.objects
  for delete using (bucket_id = 'pet-photos' and auth.uid() = owner);

drop policy if exists "Authenticated users can upload avatars" on storage.objects;
create policy "Authenticated users can upload avatars" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.role() = 'authenticated' and auth.uid() = owner);

drop policy if exists "Authenticated users can update avatars" on storage.objects;
create policy "Authenticated users can update avatars" on storage.objects
  for update using (bucket_id = 'avatars' and auth.uid() = owner)
  with check (bucket_id = 'avatars' and auth.uid() = owner);

drop policy if exists "Authenticated users can delete avatars" on storage.objects;
create policy "Authenticated users can delete avatars" on storage.objects
  for delete using (bucket_id = 'avatars' and auth.uid() = owner);

-- 2. Harden SECURITY DEFINER Habit RPCs
create or replace function public.increment_habit_completion(
  p_habit_id uuid,
  p_completed_date date,
  p_max smallint
) returns smallint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid := auth.uid();
  v_count smallint;
begin
  if v_owner_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_max is null or p_max <= 0 then
    raise exception 'Invalid p_max: must be > 0';
  end if;

  if not exists (
    select 1 from public.habits where id = p_habit_id and owner_id = v_owner_id
  ) then
    raise exception 'Unauthorized: habit does not belong to current user';
  end if;

  insert into public.habit_completions (habit_id, owner_id, completed_date, occurrence_count)
  values (p_habit_id, v_owner_id, p_completed_date, 1)
  on conflict (habit_id, owner_id, completed_date)
  do update set occurrence_count = least(p_max, public.habit_completions.occurrence_count + 1)
  returning occurrence_count into v_count;
  return v_count;
end;
$$;

create or replace function public.decrement_habit_completion(
  p_habit_id uuid,
  p_completed_date date
) returns smallint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid := auth.uid();
  v_count smallint;
begin
  if v_owner_id is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1 from public.habits where id = p_habit_id and owner_id = v_owner_id
  ) then
    raise exception 'Unauthorized: habit does not belong to current user';
  end if;

  update public.habit_completions
  set occurrence_count = occurrence_count - 1
  where habit_id = p_habit_id and owner_id = v_owner_id and completed_date = p_completed_date
  returning occurrence_count into v_count;

  if v_count is null then
    return null;
  end if;

  if v_count <= 0 then
    delete from public.habit_completions
    where habit_id = p_habit_id and owner_id = v_owner_id and completed_date = p_completed_date;
    return 0;
  end if;

  return v_count;
end;
$$;

create or replace function public.increment_habit_amount(
  p_habit_id uuid,
  p_completed_date date,
  p_amount smallint,
  p_max smallint
) returns smallint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid := auth.uid();
  v_count smallint;
begin
  if v_owner_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Invalid p_amount: must be > 0';
  end if;

  if p_max is null or p_max <= 0 then
    raise exception 'Invalid p_max: must be > 0';
  end if;

  if not exists (
    select 1 from public.habits where id = p_habit_id and owner_id = v_owner_id
  ) then
    raise exception 'Unauthorized: habit does not belong to current user';
  end if;

  insert into public.habit_completions (habit_id, owner_id, completed_date, occurrence_count)
  values (p_habit_id, v_owner_id, p_completed_date, least(p_max, p_amount))
  on conflict (habit_id, owner_id, completed_date)
  do update set occurrence_count = least(p_max, public.habit_completions.occurrence_count + p_amount)
  returning occurrence_count into v_count;
  return v_count;
end;
$$;

revoke all on function public.increment_habit_completion(uuid, date, smallint) from public;
revoke all on function public.decrement_habit_completion(uuid, date) from public;
revoke all on function public.increment_habit_amount(uuid, date, smallint, smallint) from public;
grant execute on function public.increment_habit_completion(uuid, date, smallint) to authenticated;
grant execute on function public.decrement_habit_completion(uuid, date) to authenticated;
grant execute on function public.increment_habit_amount(uuid, date, smallint, smallint) to authenticated;
