-- Username cooldown: once every 30 days, enforced server-side (not just in the client)
alter table public.profiles
  add column username_changed_at timestamptz;

create or replace function public.enforce_username_cooldown()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.username is distinct from old.username then
    if old.username_changed_at is not null
       and now() - old.username_changed_at < interval '30 days' then
      raise exception 'username_cooldown_active'
        using detail = old.username_changed_at::text;
    end if;
    new.username_changed_at := now();
  end if;
  return new;
end;
$$;

create trigger profiles_username_cooldown
  before update on public.profiles
  for each row execute function public.enforce_username_cooldown();

-- Full account deletion. `dogs` is deleted first so its own confirmed
-- on-delete-cascade chain clears habits/habit_completions/health_logs/
-- dog_moods/dog_allergens/water_logs/meal_details/vaccine_records.
-- `profiles` and `auth.users` are deleted explicitly since those two
-- tables predate this repo's migration history and their cascade
-- behavior against auth.users can't be confirmed from the SQL files here.
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.dogs where owner_id = auth.uid();
  delete from public.profiles where id = auth.uid();
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;
