-- Enable UUID generation
create extension if not exists pgcrypto;

-- Users table (Google-authenticated)
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  google_id text unique,
  email text,
  name text,
  avatar_url text,
  login_token text,
  token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Admins table
create table if not exists public.admins (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  status text not null default 'active' check (status in ('active','disabled')),
  avatar_url text,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Files table
create table if not exists public.files (
  id uuid primary key,
  file_name text not null,
  file_path text not null,
  thumbnail_path text not null,
  file_size bigint not null,
  file_format text not null,
  file_type text not null check (file_type in ('image','video')),
  ai_model text not null,
  prompt text not null,
  reference_image_ids text[] not null default array[]::text[],
  user_id uuid references public.admins(id) on delete set null,
  publish_status text not null default 'unpublished' check (publish_status in ('published','unpublished')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Reference images table
create table if not exists public.reference_images (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references public.files(id) on delete cascade,
  image_url text not null,
  preview_url text,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists idx_files_user_id on public.files(user_id);
create index if not exists idx_files_created_at on public.files(created_at);
create index if not exists idx_files_file_type on public.files(file_type);
create index if not exists idx_files_ai_model on public.files(ai_model);
create index if not exists idx_files_publish_status on public.files(publish_status);

-- Basic RLS setup disabled for service role usage; front-end uses anon via API
alter table public.users enable row level security;
alter table public.admins enable row level security;
alter table public.files enable row level security;
alter table public.reference_images enable row level security;

-- Public read policies (published files only)
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'files' and policyname = 'allow_public_read_published'
  ) then
    create policy allow_public_read_published on public.files
      for select using (publish_status = 'published');
  end if;
end $$;

