create table if not exists public.ideas (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  client_id uuid references public.clients(id) on delete set null,
  text text not null default '',
  links text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.ideas enable row level security;
drop policy if exists "public ideas" on public.ideas;
create policy "public ideas" on public.ideas
  for all to authenticated using (true) with check (true);
