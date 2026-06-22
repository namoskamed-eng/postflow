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
  const response = await fetch(`https://api.notion.com/v1${endpoint}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Notion-Version": NOTION_VERSION, "Content-Type": "application/json", ...init.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `Erro ${response.status} do Notion.`);
  return data;
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

export async function ensureClientStructure(clientPageId: string) {
  const clientChildren = await listChildPages(clientPageId);
  let posts = clientChildren.find((page) => page.title.trim().toLocaleUpperCase("pt-BR") === "POSTS");
  if (!posts) {
    const created = await createChildPage(clientPageId, "POSTS", "📱");
    posts = { id: created.id, title: "POSTS" };
  }
  const postChildren = await listChildPages(posts.id);
  let archive = postChildren.find((page) => page.title.trim().toLocaleUpperCase("pt-BR") === "POSTADOS — POSTFLOW");
  if (!archive) {
    const created = await createChildPage(posts.id, "POSTADOS — POSTFLOW", "✅");
    archive = { id: created.id, title: "POSTADOS — POSTFLOW" };
  }
  return { notion_posts_page_id: posts.id, notion_archive_page_id: archive.id };
}
