create extension if not exists citext;
-- If it doesn't land in the `public` schema, check with:
--   select extname, extnamespace::regnamespace from pg_extension where extname = 'citext';
-- and add that schema to the RPC's `search_path` below.

alter table public.profiles
  add column username citext;

alter table public.profiles
  add constraint profiles_username_format
  check (username is null or username ~ '^[A-Za-z][A-Za-z0-9_]{2,19}$');

-- citext is inherently case-insensitive, so a plain unique index suffices.
-- NULLs (pre-onboarding users) never collide with each other under a unique index.
create unique index profiles_username_key on public.profiles (username);

create or replace function public.is_username_available(candidate citext)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (select 1 from public.profiles where username = candidate);
$$;

revoke all on function public.is_username_available(citext) from public;
grant execute on function public.is_username_available(citext) to authenticated;
