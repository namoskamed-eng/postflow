alter table public.posts
  add column if not exists published_at timestamptz;

create index if not exists posts_archived_cleanup_idx
  on public.posts (published_at)
  where notion_archived = true;
