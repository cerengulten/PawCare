create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid references public.dogs(id) on delete cascade,
  type text not null check (type in (
    'health_alert', 'streak', 'cycle', 'vaccine', 'hydration', 'habit_reminder', 'info'
  )),
  title text not null,
  body text not null,
  is_read boolean not null default false,
  action_type text,
  action_payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists notifications_owner_created_idx
  on public.notifications (owner_id, created_at desc);

create index if not exists notifications_owner_unread_idx
  on public.notifications (owner_id, is_read);

alter table public.notifications enable row level security;

do $$
begin
  create policy notifications_owner_all on public.notifications
    for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
exception
  when duplicate_object then null;
end $$;

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if to_regclass('public.notifications') is not null then
    delete from public.notifications where owner_id = auth.uid();
  end if;
  delete from public.dogs where owner_id = auth.uid();
  delete from public.profiles where id = auth.uid();
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;
