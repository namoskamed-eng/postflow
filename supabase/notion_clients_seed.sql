-- Execute depois de schema.sql. Liga os clientes atuais às páginas do Notion.
create temporary table postflow_notion_mapping (
  name text,
  notion_client_page_id text,
  notion_posts_page_id text,
  notion_archive_page_id text
) on commit drop;

insert into postflow_notion_mapping values
  ('ANGIOGRAPH', '38458080-7dd6-80b7-a411-f40349fed8f6', '38658080-7dd6-816b-a848-c02d0e831e43', '38658080-7dd6-8101-aa84-e9e2b7bf197b'),
  ('CLÍNICAS LQ', '38058080-7dd6-812a-9c15-ed0a438071f6', '38058080-7dd6-81ef-9410-cc1705b94ee3', '38658080-7dd6-8155-ba65-e29699f8c15a'),
  ('DRA ANA LAURA ZAGO', '19958080-7dd6-8071-b96c-f72627cc65fa', '20658080-7dd6-8011-9b3c-daa810d95548', '38658080-7dd6-81ef-8739-fc4ee042920a'),
  ('DR BRUNO MONGENOT', '19958080-7dd6-800d-a430-ec52b5d202a2', '22458080-7dd6-804d-8a4d-f63ddc74cf31', '38658080-7dd6-81e6-955b-d7e28d65819d'),
  ('DRA CRISTIANE GOTTSCHALL', '1d358080-7dd6-8022-b10e-d797a16aa9eb', '1d358080-7dd6-8087-b9df-cf5ad428d27c', '38658080-7dd6-81a6-b6ef-cdcd795d964e'),
  ('DRA DELANA LEÃO', '1ae58080-7dd6-80e5-b628-c60176d8a87e', '1f558080-7dd6-807d-8a5c-ca0c32b31712', '38658080-7dd6-8140-8205-c0ae2418223c'),
  ('DR ELIAS SATHLER', '19958080-7dd6-8091-bd69-fa63b6df8f8a', '2dd58080-7dd6-80dd-be89-dc58816ad296', '38658080-7dd6-8177-b5f9-da4e3722fa6e'),
  ('DRA IARA SELEGATTO', '20858080-7dd6-80fe-987d-edc3184dfd85', '2dd58080-7dd6-80d7-83dd-fd5cc3caaafa', '38658080-7dd6-8179-8676-cd9867d0f769'),
  ('DR JOÃO RAPHAEL DENARDI', '1d358080-7dd6-80cd-b441-ffa6d1782480', '22258080-7dd6-801b-a9a1-e068585fb9b0', '38658080-7dd6-810a-befe-eb4ff32dc14e'),
  ('DRA KELLEN CHAVEIRO', '19958080-7dd6-80fb-ba03-ed82bd4aee1f', '2dd58080-7dd6-808b-bfea-c918bc977141', '38658080-7dd6-81e5-8d73-d26320036dcf'),
  ('CHAPELARIA ACESSÓRIOS', '21858080-7dd6-8068-9939-ccedc4feec8e', '38658080-7dd6-81af-8d92-d4d6fc05ce06', '38658080-7dd6-8122-af3e-d43f5600a194'),
  ('MARIA CHAPÉU', '21858080-7dd6-805d-86e9-c6b3d856f47e', '38658080-7dd6-81e2-987b-ff9aaf6acddc', '38658080-7dd6-8133-b70e-f7d6fcee2d3f'),
  ('ZÉ DO CHAPÉU', '21858080-7dd6-80c6-a96f-ca7396dfe641', '38658080-7dd6-819d-90db-c6c58e1a3371', '38658080-7dd6-8134-aa0b-d6ccb794261f'),
  ('SIBU', '2f658080-7dd6-8056-901d-fbe6d1839144', '38658080-7dd6-81f5-9950-c4f675b57389', '38658080-7dd6-81c6-a70a-eb6757f96f1e'),
  ('RTT', 'dec85bd9-b597-47a2-ae64-fe11fd1199c9', '38658080-7dd6-818e-8cd3-d985ba0476ef', '38658080-7dd6-818a-b8dc-e267049b6a81'),
  ('PEDRO SABIE', '2dd58080-7dd6-80b9-919c-c1d7610f8e15', '2dd58080-7dd6-8064-a698-f85ff663397d', '38658080-7dd6-81a9-a2fe-c1e2ec9de801'),
  ('CURA SPA CAPILAR', '19958080-7dd6-80db-8df9-d92ba5ff9e76', '38658080-7dd6-8186-ae5d-fd1d5e430d68', '38658080-7dd6-81d4-a71b-dfa11001814e');

update public.clients as client
set notion_client_page_id = mapping.notion_client_page_id,
    notion_posts_page_id = mapping.notion_posts_page_id,
    notion_archive_page_id = mapping.notion_archive_page_id,
    hidden_in_app = false
from postflow_notion_mapping mapping
where lower(client.name) = lower(mapping.name);

insert into public.clients (name, handle, color, notes, notion_client_page_id, notion_posts_page_id, notion_archive_page_id)
select mapping.name, '', '#31312F', '', mapping.notion_client_page_id, mapping.notion_posts_page_id, mapping.notion_archive_page_id
from postflow_notion_mapping mapping
where not exists (select 1 from public.clients client where client.notion_client_page_id = mapping.notion_client_page_id or lower(client.name) = lower(mapping.name));

-- Pela regra atual, somente clientes com A POSTAR — POSTFLOW ficam visíveis.
update public.clients as client
set notion_active_page_id = case
      when client.notion_client_page_id = '19958080-7dd6-8091-bd69-fa63b6df8f8a' then '38758080-7dd6-8096-8240-cc6fc15d28d8'
      else ''
    end,
    hidden_in_app = client.notion_client_page_id <> '19958080-7dd6-8091-bd69-fa63b6df8f8a'
where exists (
  select 1 from postflow_notion_mapping mapping
  where mapping.notion_client_page_id = client.notion_client_page_id
);
