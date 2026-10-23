-- Update delete_own_account to explicitly clean up notifications
-- In-app notifications can have null pet_id (such as overall streak reminders),
-- so explicitly deleting all notifications owned by the user ensures no FK constraint
-- or orphan rows remain before deleting profiles and auth.users.

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.notifications where owner_id = auth.uid();
  delete from public.dogs where owner_id = auth.uid();
  delete from public.profiles where id = auth.uid();
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;
