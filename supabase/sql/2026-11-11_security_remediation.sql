-- =============================================================================
-- Security Remediation Migration (2026-11-11)
-- 1. Updates delete_own_account() to purge user-owned files in storage.objects
--    (avatars and pet-photos) so orphan blobs do not remain publicly accessible
--    after account deletion.
-- 2. Creates daily_chat_usage table and check_and_increment_chat_quota() RPC
--    to enforce server-side rate limits and daily consultation quotas on the
--    Gemini chat Edge Function.
-- =============================================================================

-- 1. Hardened Account Deletion: Purge Storage Objects
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Clear notifications
  if to_regclass('public.notifications') is not null then
    delete from public.notifications where owner_id = auth.uid();
  end if;

  -- Clear pet records and cascades
  delete from public.dogs where owner_id = auth.uid();

  -- Clear user profile
  delete from public.profiles where id = auth.uid();

  -- Purge all storage files (avatars, pet-photos) owned by this user
  if to_regclass('storage.objects') is not null then
    delete from storage.objects where owner = auth.uid();
  end if;

  -- Clear auth user record
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;

-- 2. Daily Chat Usage Quota & Rate Limiting Table
create table if not exists public.daily_chat_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default current_date,
  message_count integer not null default 1,
  primary key (user_id, usage_date)
);

alter table public.daily_chat_usage enable row level security;

do $$
begin
  create policy daily_chat_usage_owner on public.daily_chat_usage
    for select using (auth.uid() = user_id);
exception
  when duplicate_object then null;
end $$;

-- RPC to atomically check and increment daily consultation quota
create or replace function public.check_and_increment_chat_quota(p_max_messages integer default 15)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_count integer;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.daily_chat_usage (user_id, usage_date, message_count)
  values (v_user_id, current_date, 1)
  on conflict (user_id, usage_date)
  do update set message_count = public.daily_chat_usage.message_count + 1
  returning message_count into v_count;

  return v_count <= p_max_messages;
end;
$$;

revoke all on function public.check_and_increment_chat_quota(integer) from public;
grant execute on function public.check_and_increment_chat_quota(integer) to authenticated;
