# PostFlow

Aplicação web responsiva para organizar o fluxo de postagens de vários clientes. A primeira versão usa **Next.js, TypeScript, Tailwind CSS e Supabase**. Se o Supabase ainda não estiver configurado, o app entra automaticamente em modo de demonstração e salva os dados no navegador.

## O que está incluído

- Cadastro, edição e exclusão de clientes
- Cadastro, edição e exclusão de postagens
- Legenda, texto de carrossel/roteiro, observações e imagens
- Datas, plataformas, tipos e seis etapas de status
- Lista com busca e filtros combináveis
- Visualização detalhada, cópia rápida dos textos e acesso às artes
- Interface responsiva para computador e celular
- Persistência no Supabase e fallback local para testes
- Compartilhamento das artes pelo menu nativo do celular
- Arquivamento automático no Notion ao marcar um post como Publicado
- Limpeza automática das imagens e do post após o arquivamento
- Sincronização de clientes nos dois sentidos entre PostFlow e Notion

## Rodar localmente

Requisitos: Node.js 20 ou superior e npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000). Sem preencher o `.env.local`, o modo de demonstração será usado.

## Configurar o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Abra o **SQL Editor**, cole o conteúdo de `supabase/schema.sql` e execute.
3. Em **Project Settings → API**, copie a URL do projeto e a chave pública `anon`.
4. Preencha `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon
```

5. Reinicie `npm run dev`.

O script cria as tabelas `clients`, `posts` e `post_images`, além do bucket público `post-images`. Depois de executar `schema.sql`, execute também `supabase/notion_clients_seed.sql`. Esse segundo arquivo cadastra os 17 clientes atuais e liga cada um à pasta `POSTADOS — POSTFLOW` correta no Notion.

## Configurar o arquivamento no Notion

1. Crie uma integração interna no Notion em **Configurações → Conexões → Desenvolver ou gerenciar integrações**.
2. Abra a página principal `CLIENTES`, use o menu `••• → Conexões` e adicione essa integração. O acesso será herdado pelas páginas dos clientes.
3. Copie o token da integração.
4. Copie `.env.example` para `.env.local` e preencha as variáveis do app.
5. Cadastre `NOTION_TOKEN` e `NOTION_CLIENTS_PAGE_ID` como secrets das Edge Functions do Supabase.
6. Publique as funções `clients` e `archive-post` da pasta `supabase/functions`.

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon
```

O token do Notion fica somente nos secrets do Supabase e nunca é enviado ao navegador ou ao GitHub. A chave `service_role` também nunca deve ser usada no código do navegador.

## Sincronização de clientes

- Ao cadastrar um cliente no PostFlow, o app cria no Notion a estrutura `Cliente → POSTS → POSTADOS — POSTFLOW` e salva os IDs automaticamente.
- Ao criar uma página de cliente diretamente dentro da página principal `CLIENTES` do Notion, ela aparece no PostFlow na próxima abertura ou atualização do app.
- Se o cliente criado no Notion não tiver `POSTS` ou `POSTADOS — POSTFLOW`, o PostFlow completa a estrutura.
- Renomear um cliente pelo PostFlow também atualiza o título da página no Notion.
- Remover um cliente pelo PostFlow apenas o oculta no app e remove seus posts ativos. A página e o histórico do Notion são preservados e o cliente não reaparece na sincronização.
- Os IDs das páginas, e não apenas os nomes, são usados para impedir duplicatas.

### Como funciona

- Ao selecionar o status **Publicado**, o app pede confirmação.
- O conteúdo estruturado é criado como uma nova página dentro de `POSTADOS — POSTFLOW` do cliente.
- Somente após a confirmação do Notion, as imagens são removidas do Storage e o post é apagado do PostFlow.
- Se qualquer etapa falhar, o post permanece no app para uma nova tentativa.
- O ID da página criada é salvo antes da limpeza, evitando duplicação caso apenas a exclusão das imagens falhe.

## Compartilhar artes pelo WhatsApp

Abra um post no celular e toque em **Enviar artes**. O PostFlow reúne todas as imagens e abre o menu de compartilhamento do aparelho; escolha WhatsApp e depois a conversa. Essa função exige que o app esteja publicado em HTTPS. **Baixar todas** serve como alternativa em navegadores sem compartilhamento de arquivos.

## Comandos

```bash
npm run dev    # desenvolvimento
npm run build  # build de produção
npm run lint   # verificação de código
```

## Publicação no GitHub Pages

O workflow `.github/workflows/pages.yml` gera a versão estática e publica o site automaticamente a cada envio para a branch `main`.

No repositório do GitHub:

1. Cadastre as variáveis `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` em **Settings → Secrets and variables → Actions → Variables**.
2. Em **Settings → Pages**, selecione **GitHub Actions** como fonte.
3. O endereço publicado será `https://SEU-USUARIO.github.io/postflow/`.

Os dados continuam no Supabase, e as operações com o Notion passam pelas Edge Functions já publicadas. Nenhuma chave secreta entra no site estático.

## Estrutura principal

- `src/app/page.tsx`: estado e fluxo principal da interface
- `src/components/`: lista, detalhes, formulários e navegação
- `src/lib/data.ts`: camada de dados Supabase/local
- `src/types/index.ts`: tipos e opções dos campos
- `supabase/schema.sql`: banco, storage e políticas
- `supabase/notion_clients_seed.sql`: clientes e destinos do Notion
- `supabase/functions/clients`: sincronização segura dos clientes com o Notion
- `supabase/functions/archive-post`: arquivamento seguro e limpeza das imagens
- `.github/workflows/pages.yml`: publicação automática no GitHub Pages
