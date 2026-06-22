import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, createPostPage, json, listChildPages, notionRequest, replacePostContent, requireUser, trashPage } from "../_shared/common.ts";

const BUCKET = "post-images";
const PLATFORMS = ["Instagram", "TikTok", "YouTube Shorts", "Facebook", "LinkedIn", "Outro"];
const TYPES = ["Reels", "Carrossel", "Estático", "Story", "Outro"];
const STATUSES = ["Ideia", "Roteiro", "Arte", "Aprovação", "Agendado"];

function metadata(markdown: string, label: string) {
  const prefix = `**${label}:**`;
  return markdown.split("\n").find((line) => line.trim().startsWith(prefix))?.trim().slice(prefix.length).trim() || "";
}

function section(markdown: string, heading: string) {
  const marker = `## ${heading}`;
  const start = markdown.indexOf(marker);
  if (start < 0) return "";
  const content = markdown.slice(start + marker.length).replace(/^\s+/, "");
  const end = content.search(/\n##\s/);
  const value = (end < 0 ? content : content.slice(0, end)).trim();
  return value === "—" ? "" : value;
}

function postFromMarkdown(markdown: string, title: string, clientId: string) {
  const plannedDate = metadata(markdown, "Data planejada");
  const platform = metadata(markdown, "Plataforma");
  const type = metadata(markdown, "Tipo");
  const status = metadata(markdown, "Status");
  return {
    title,
    client_id: clientId,
    planned_date: /^\d{4}-\d{2}-\d{2}$/.test(plannedDate) ? plannedDate : null,
    platform: PLATFORMS.includes(platform) ? platform : "Instagram",
    type: TYPES.includes(type) ? type : "Outro",
    status: STATUSES.includes(status) ? status : "Ideia",
    caption: section(markdown, "Legenda"),
    content: section(markdown, "Texto do post / carrossel"),
    notes: section(markdown, "Observações"),
  };
}

function storagePath(url: string) {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const index = url.indexOf(marker);
  return index < 0 ? null : decodeURIComponent(url.slice(index + marker.length));
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { admin } = await requireUser(request);
    const body = await request.json().catch(() => ({}));

    if (body.action === "sync") {
      const [clientsResult, postsResult] = await Promise.all([
        admin.from("clients").select("id,name,notion_active_page_id").eq("hidden_in_app", false).neq("notion_active_page_id", ""),
        admin.from("posts").select("id,notion_page_id"),
      ]);
      if (clientsResult.error) throw clientsResult.error;
      if (postsResult.error) throw postsResult.error;
      const byNotionPage = new Map((postsResult.data || []).filter((post) => post.notion_page_id).map((post) => [post.notion_page_id, post]));
      let created = 0;
      let updated = 0;
      const errors: Array<{ title: string; message: string }> = [];

      for (const client of clientsResult.data || []) {
        const notionPosts = await listChildPages(client.notion_active_page_id);
        for (const notionPost of notionPosts) {
          try {
            const markdownPage = await notionRequest(`/pages/${notionPost.id}/markdown`);
            const input = postFromMarkdown(markdownPage.markdown || "", notionPost.title, client.id);
            const existing = byNotionPage.get(notionPost.id);
            if (existing) {
              const { error } = await admin.from("posts").update({ ...input, notion_archived: false, published_at: null }).eq("id", existing.id);
              if (error) throw error;
              updated++;
            } else {
              const { data, error } = await admin.from("posts").insert({ ...input, notion_page_id: notionPost.id, notion_archived: false, published_at: null }).select("id,notion_page_id").single();
              if (error) throw error;
              byNotionPage.set(notionPost.id, data);
              created++;
            }
          } catch (error) {
            errors.push({ title: notionPost.title, message: error instanceof Error ? error.message : "Falha ao importar." });
          }
        }
      }
      return json({ created, updated, ignored: errors.length, errors });
    }

    if (body.action === "save") {
      const { input, postId } = body;
      if (!input?.title?.trim() || !input?.client_id) return json({ error: "Preencha o título e o cliente." }, 400);
      const { data: client, error: clientError } = await admin.from("clients").select("name,notion_active_page_id").eq("id", input.client_id).single();
      if (clientError || !client) throw clientError || new Error("Cliente não encontrado.");
      if (!client.notion_active_page_id) throw new Error(`O cliente ${client.name} não possui a pasta A POSTAR — POSTFLOW.`);

      if (postId) {
        const { data: current, error: currentError } = await admin.from("posts").select("*").eq("id", postId).single();
        if (currentError || !current) throw currentError || new Error("Post não encontrado.");
        let notionPageId = current.notion_page_id;
        if (!notionPageId) {
          const page = await createPostPage(client.notion_active_page_id, input, client.name);
          notionPageId = page.id;
        } else {
          await replacePostContent(notionPageId, input, client.name);
          if (current.client_id !== input.client_id) {
            await notionRequest(`/pages/${notionPageId}/move`, {
              method: "POST",
              body: JSON.stringify({ parent: { type: "page_id", page_id: client.notion_active_page_id } }),
            });
          }
        }
        const { data, error } = await admin.from("posts").update({ ...input, notion_page_id: notionPageId, notion_archived: false, published_at: null }).eq("id", postId).select().single();
        if (error) throw error;
        return json(data);
      }

      const page = await createPostPage(client.notion_active_page_id, input, client.name);
      const { data, error } = await admin.from("posts").insert({ ...input, notion_page_id: page.id, notion_archived: false, published_at: null }).select().single();
      if (error) {
        await trashPage(page.id).catch(() => undefined);
        throw error;
      }
      return json(data);
    }

    if (body.action === "delete") {
      const { postId } = body;
      const { data: post, error: postError } = await admin.from("posts").select("*, images:post_images(url)").eq("id", postId).single();
      if (postError || !post) throw postError || new Error("Post não encontrado.");
      const paths = (post.images || []).map((image: { url: string }) => storagePath(image.url)).filter(Boolean) as string[];
      if (paths.length) {
        const { error } = await admin.storage.from(BUCKET).remove(paths);
        if (error) throw error;
      }
      if (!post.notion_archived) await trashPage(post.notion_page_id);
      const { error } = await admin.from("posts").delete().eq("id", postId);
      if (error) throw error;
      return json({ deleted: true });
    }

    return json({ error: "Ação inválida." }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao sincronizar o post.";
    return json({ error: message }, message === "Sessão inválida." ? 401 : 500);
  }
});
