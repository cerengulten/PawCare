alter table public.vaccine_records
  add column if not exists reminder_enabled boolean not null default false,
  add column if not exists notification_id text;
