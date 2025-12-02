alter table public.admins add column if not exists email text;
alter table public.admins add column if not exists google_id text;
create index if not exists idx_admins_email on public.admins(email);
create index if not exists idx_admins_google_id on public.admins(google_id);
