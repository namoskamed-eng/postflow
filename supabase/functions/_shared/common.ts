import { createClient } from "npm:@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

export function adminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Supabase não configurado na função.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function requireUser(request: Request) {
  const authorization = request.headers.get("Authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) throw new Error("Sessão inválida.");
  const admin = adminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new Error("Sessão inválida.");
  return { admin, user: data.user };
}

const NOTION_VERSION = "2026-03-11";

export async function notionRequest(endpoint: string, init: RequestInit = {}) {
  const token = Deno.env.get("NOTION_TOKEN");
  if (!token) throw new Error("Token do Notion não configurado.");
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await fetch(`https://api.notion.com/v1${endpoint}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, "Notion-Version": NOTION_VERSION, "Content-Type": "application/json", ...init.headers },
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) return data;
    if (response.status === 429 && attempt < 4) {
      const retryAfter = Number(response.headers.get("Retry-After") || "1");
      await new Promise((resolve) => setTimeout(resolve, Math.max(1, retryAfter) * 1000));
      continue;
    }
    throw new Error(data.message || `Erro ${response.status} do Notion.`);
  }
  throw new Error("O Notion demorou para responder. Tente novamente.");
}

export async function listChildPages(parentId: string) {
  const pages: Array<{ id: string; title: string }> = [];
  let cursor = "";
  do {
    const query = new URLSearchParams({ page_size: "100" });
    if (cursor) query.set("start_cursor", cursor);
    const data = await notionRequest(`/blocks/${parentId}/children?${query}`);
    for (const block of data.results || []) {
      if (block.type === "child_page" && !block.in_trash) pages.push({ id: block.id, title: block.child_page?.title || "Sem nome" });
    }
    cursor = data.has_more ? data.next_cursor : "";
  } while (cursor);
  return pages;
}

export async function createChildPage(parentId: string, title: string, icon: string) {
  return notionRequest("/pages", {
    method: "POST",
    body: JSON.stringify({
      parent: { type: "page_id", page_id: parentId },
      icon: { type: "emoji", emoji: icon },
      properties: { title: { title: [{ type: "text", text: { content: title } }] } },
    }),
  });
}

export const ACTIVE_FOLDER_TITLE = "A POSTAR — POSTFLOW";
export const ARCHIVE_FOLDER_TITLE = "POSTADOS — POSTFLOW";

export function normalizeTitle(title: string) {
  return title.trim().toLocaleUpperCase("pt-BR").replace(/[—–-]/g, " ").replace(/\s+/g, " ");
}

export async function findClientStructure(clientPageId: string) {
  const clientChildren = await listChildPages(clientPageId);
  const posts = clientChildren.find((page) => normalizeTitle(page.title) === "POSTS");
  if (!posts) return { posts: null, active: null, archive: null };
  const postChildren = await listChildPages(posts.id);
  const active = postChildren.find((page) => normalizeTitle(page.title) === "A POSTAR POSTFLOW") || null;
  const archive = postChildren.find((page) => normalizeTitle(page.title) === "POSTADOS POSTFLOW") || null;
  return { posts, active, archive };
}

export async function ensureClientStructure(clientPageId: string) {
  const clientChildren = await listChildPages(clientPageId);
  let posts = clientChildren.find((page) => normalizeTitle(page.title) === "POSTS");
  if (!posts) {
    const created = await createChildPage(clientPageId, "POSTS", "📱");
    posts = { id: created.id, title: "POSTS" };
  }
  const postChildren = await listChildPages(posts.id);
  let active = postChildren.find((page) => normalizeTitle(page.title) === "A POSTAR POSTFLOW");
  if (!active) {
    const created = await createChildPage(posts.id, ACTIVE_FOLDER_TITLE, "📝");
    active = { id: created.id, title: ACTIVE_FOLDER_TITLE };
  }
  let archive = postChildren.find((page) => normalizeTitle(page.title) === "POSTADOS POSTFLOW");
  if (!archive) {
    const created = await createChildPage(posts.id, ARCHIVE_FOLDER_TITLE, "✅");
    archive = { id: created.id, title: ARCHIVE_FOLDER_TITLE };
  }
  return { notion_posts_page_id: posts.id, notion_active_page_id: active.id, notion_archive_page_id: archive.id };
}

export function richText(content: string) {
  return [{ type: "text", text: { content } }];
}

function valueOrDash(value?: string) {
  return value?.trim() || "—";
}

export function postMarkdown(post: Record<string, string>, clientName: string) {
  return [
    `**Cliente:** ${clientName}`,
    `**Data planejada:** ${post.planned_date || "Não informada"}`,
    `**Plataforma:** ${post.platform}`,
    `**Tipo:** ${post.type}`,
    `**Status:** ${post.status}`,
    "",
    "## Legenda",
    valueOrDash(post.caption),
    "",
    "## Texto do post / carrossel",
    valueOrDash(post.content),
    "",
    "## Observações",
    valueOrDash(post.notes),
  ].join("\n");
}

export async function replacePostContent(pageId: string, post: Record<string, string>, clientName: string) {
  await notionRequest(`/pages/${pageId}`, {
    method: "PATCH",
    body: JSON.stringify({ properties: { title: { title: richText(post.title) } } }),
  });
  await notionRequest(`/pages/${pageId}/markdown`, {
    method: "PATCH",
    body: JSON.stringify({ type: "replace_content", replace_content: { new_str: postMarkdown(post, clientName) } }),
  });
}

export async function createPostPage(parentId: string, post: Record<string, string>, clientName: string) {
  const page = await createChildPage(parentId, post.title, "📝");
  try {
    await replacePostContent(page.id, post, clientName);
  } catch (error) {
    await notionRequest(`/pages/${page.id}`, { method: "PATCH", body: JSON.stringify({ in_trash: true }) }).catch(() => undefined);
    throw error;
  }
  return page;
}

export async function trashPage(pageId?: string | null) {
  if (!pageId) return;
  await notionRequest(`/pages/${pageId}`, { method: "PATCH", body: JSON.stringify({ in_trash: true }) });
}
