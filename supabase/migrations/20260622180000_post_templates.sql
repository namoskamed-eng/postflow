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

alter table public.post_templates enable row level security;
drop policy if exists "public post templates" on public.post_templates;
create policy "public post templates" on public.post_templates
  for all to authenticated using (true) with check (true);

insert into public.post_templates (name, platform, type, caption, content, notes)
select 'Carrossel educativo', 'Instagram', 'Carrossel', 'Salve este post para consultar depois.\n\n#conteúdo #dicas', 'Slide 1: Título forte\nSlide 2: Contexto do problema\nSlide 3: Primeira orientação\nSlide 4: Segunda orientação\nSlide 5: Chamada para ação', 'Adaptar a quantidade de slides ao tema.'
where not exists (select 1 from public.post_templates where name = 'Carrossel educativo');

insert into public.post_templates (name, platform, type, caption, content, notes)
select 'Roteiro de Reels', 'Instagram', 'Reels', 'Quer saber mais? Confira o vídeo e compartilhe.', 'Cena 1 — Gancho:\nCena 2 — Explicação:\nCena 3 — Exemplo:\nCena 4 — Chamada para ação:', 'Definir trilha, duração e texto de tela.'
where not exists (select 1 from public.post_templates where name = 'Roteiro de Reels');

insert into public.post_templates (name, platform, type, caption, content, notes)
select 'Post estático', 'Instagram', 'Estático', 'Legenda principal do post.\n\nChamada para ação.', 'Texto principal da arte:\n\nTexto de apoio:', 'Conferir legibilidade da arte no celular.'
where not exists (select 1 from public.post_templates where name = 'Post estático');
