-- In-app notification inbox (screens/NotificationsScreen.tsx). Rows are created
-- client-side by lib/notificationService.ts when a condition is met (mood alert, streak
-- at risk, predicted heat cycle, vaccine due soon, water goal reached) — this is separate
-- from expo-notifications OS push (lib/notifications.ts), which is untouched.
--
-- Verify no existing `notifications` table before running — checked absent as of 2026-09-12.

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
  -- e.g. 'open_vet_finder' | 'open_pet_habits' | 'open_cycle_history' | 'open_pet_profile'
  action_payload jsonb,
  -- e.g. { "pet_id": "xxx" } for deep linking / dedup keys (vaccine_id, predicted_date)
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
