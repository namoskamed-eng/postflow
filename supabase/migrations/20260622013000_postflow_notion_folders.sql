alter table public.clients
  add column if not exists notion_active_page_id text not null default '';

alter table public.posts
  add column if not exists notion_archived boolean not null default false;
