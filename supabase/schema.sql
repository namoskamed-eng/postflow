-- Execute no SQL Editor do seu projeto Supabase.
create extension if not exists "pgcrypto";

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  handle text not null default '',
  color text not null default '#31312F',
  notes text not null default '',
  notion_client_page_id text not null default '',
  notion_posts_page_id text not null default '',
  notion_active_page_id text not null default '',
  notion_archive_page_id text not null default '',
  hidden_in_app boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.clients add column if not exists notion_client_page_id text not null default '';
alter table public.clients add column if not exists notion_posts_page_id text not null default '';
alter table public.clients add column if not exists notion_active_page_id text not null default '';
alter table public.clients add column if not exists notion_archive_page_id text not null default '';
alter table public.clients add column if not exists hidden_in_app boolean not null default false;
create unique index if not exists clients_notion_page_unique on public.clients (notion_client_page_id) where notion_client_page_id <> '';

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text,
  notion_page_id text,
  notion_archived boolean not null default false,
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  planned_date date,
  platform text not null check (platform in ('Instagram','TikTok','YouTube Shorts','Facebook','LinkedIn','Outro')),
  type text not null check (type in ('Reels','Carrossel','Estático','Story','Outro')),
  status text not null check (status in ('Ideia','Roteiro','Arte','Aprovação','Agendado','Publicado')),
  caption text not null default '',
  content text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

-- Migração segura para projetos criados antes do sincronizador.
alter table public.posts add column if not exists slug text;
alter table public.posts add column if not exists notion_page_id text;
alter table public.posts add column if not exists notion_archived boolean not null default false;
create unique index if not exists posts_slug_unique on public.posts (slug) where slug is not null;
create unique index if not exists posts_notion_page_unique on public.posts (notion_page_id) where notion_page_id is not null and notion_page_id <> '';

create table if not exists public.post_images (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  url text not null,
  name text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.post_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  platform text not null check (platform in ('Instagram','TikTok','YouTube Shorts','Facebook','LinkedIn','Outro')),
  type text not null check (type in ('Reels','Carrossel','Estático','Story','Outro')),
  caption text not null default '',
  content text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.ideas (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  client_id uuid references public.clients(id) on delete set null,
  text text not null default '',
  links text[] not null default '{}',
  created_at timestamptz not null default now()
);

insert into storage.buckets (id, name, public) values ('post-images', 'post-images', true)
on conflict (id) do update set public = true;

alter table public.clients enable row level security;
alter table public.posts enable row level security;
alter table public.post_images enable row level security;
alter table public.post_templates enable row level security;
alter table public.ideas enable row level security;

-- Somente usuários autenticados podem acessar os dados pelo navegador.
drop policy if exists "public clients" on public.clients;
drop policy if exists "public posts" on public.posts;
drop policy if exists "public post images" on public.post_images;
drop policy if exists "public post templates" on public.post_templates;
drop policy if exists "public ideas" on public.ideas;
drop policy if exists "public image reads" on storage.objects;
drop policy if exists "public image uploads" on storage.objects;
drop policy if exists "public image deletes" on storage.objects;
create policy "public clients" on public.clients for all to authenticated using (true) with check (true);
create policy "public posts" on public.posts for all to authenticated using (true) with check (true);
create policy "public post images" on public.post_images for all to authenticated using (true) with check (true);
create policy "public post templates" on public.post_templates for all to authenticated using (true) with check (true);
create policy "public ideas" on public.ideas for all to authenticated using (true) with check (true);
create policy "public image reads" on storage.objects for select to authenticated using (bucket_id = 'post-images');
create policy "public image uploads" on storage.objects for insert to authenticated with check (bucket_id = 'post-images');
create policy "public image deletes" on storage.objects for delete to authenticated using (bucket_id = 'post-images');
