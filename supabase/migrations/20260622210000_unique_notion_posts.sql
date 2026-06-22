create unique index if not exists posts_notion_page_unique
  on public.posts (notion_page_id)
  where notion_page_id is not null and notion_page_id <> '';
