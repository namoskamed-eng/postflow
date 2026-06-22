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
- Pasta `A POSTAR — POSTFLOW` para posts ativos e `POSTADOS — POSTFLOW` para o histórico

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

- Um cliente do Notion só aparece no PostFlow quando possui `Cliente → POSTS → A POSTAR — POSTFLOW`.
- Ao cadastrar um cliente, o PostFlow procura primeiro uma página com o mesmo nome no Notion. Se encontrar, reutiliza a página original e apenas completa `A POSTAR — POSTFLOW` e `POSTADOS — POSTFLOW`; somente cria uma página de cliente quando o nome ainda não existe.
- Se um cliente do Notion tiver `A POSTAR — POSTFLOW`, mas não tiver `POSTADOS — POSTFLOW`, o app cria a pasta de histórico automaticamente.
- Renomear um cliente pelo PostFlow também atualiza o título da página no Notion.
- Remover um cliente pelo PostFlow move as duas pastas PostFlow para a lixeira do Notion, remove seus posts e imagens do app e preserva o restante da página do cliente.
- Os IDs das páginas, e não apenas os nomes, são usados para impedir duplicatas.
- A sincronização automática ocorre em segundo plano às 00h e 12h. Se o app estiver fechado, ela acontece na primeira abertura após o horário, sem bloquear o carregamento da tela. O botão **Atualizar do Notion** continua disponível para sincronização manual.

### Como funciona

- Ao criar um post no app, uma página de texto estruturado é criada dentro de `A POSTAR — POSTFLOW`.
- Editar o post atualiza a mesma página no Notion.
- Ao selecionar o status **Publicado**, o app pede confirmação e move a própria página para `POSTADOS — POSTFLOW`.
- Somente após a confirmação do Notion, as imagens são removidas do Storage e o post é apagado do PostFlow.
- Se qualquer etapa falhar, o post permanece no app para uma nova tentativa.
- O ID da página criada é salvo antes da limpeza, evitando duplicação caso apenas a exclusão das imagens falhe.

## Compartilhar artes pelo WhatsApp

Abra um post no celular e toque em **Enviar artes**. O PostFlow reúne somente as imagens e abre o menu de compartilhamento do aparelho; escolha WhatsApp e depois a conversa. Toque em **Salvar** para abrir o mesmo menu e escolher **Salvar nas Fotos/Galeria**, quando essa opção for oferecida pelo sistema. Em navegadores sem compartilhamento de arquivos, as imagens são baixadas normalmente.

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
- `supabase/functions/posts`: criação e atualização dos posts em `A POSTAR — POSTFLOW`
- `supabase/functions/archive-post`: arquivamento seguro e limpeza das imagens
- `.github/workflows/pages.yml`: publicação automática no GitHub Pages
