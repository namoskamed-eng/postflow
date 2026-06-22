import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, createPostPage, json, notionRequest, replacePostContent, requireUser } from "../_shared/common.ts";

const BUCKET = "post-images";
const RETENTION_DAYS = 7;

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

    if (body.action === "cleanup") {
      const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
      const { data: expiredPosts, error: expiredError } = await admin
        .from("posts")
        .select("id, images:post_images(url)")
        .eq("notion_archived", true)
        .not("published_at", "is", null)
        .lte("published_at", cutoff);
      if (expiredError) throw expiredError;

      let cleaned = 0;
      const errors: Array<{ postId: string; message: string }> = [];
      for (const expired of expiredPosts || []) {
        try {
          const paths = (expired.images || []).map((image: { url: string }) => storagePath(image.url)).filter(Boolean) as string[];
          if (paths.length) {
            const { error: removeError } = await admin.storage.from(BUCKET).remove(paths);
            if (removeError) throw removeError;
          }
          const { error: deleteError } = await admin.from("posts").delete().eq("id", expired.id);
          if (deleteError) throw deleteError;
          cleaned++;
        } catch (error) {
          errors.push({ postId: expired.id, message: error instanceof Error ? error.message : "Falha na limpeza." });
        }
      }
      return json({ cleaned, errors });
    }

    if (body.action === "restore") {
      if (!body.postId) return json({ error: "Post inválido." }, 400);
      const { data: archived, error: archivedError } = await admin.from("posts")
        .select("*, client:clients(name,notion_active_page_id)")
        .eq("id", body.postId)
        .single();
      if (archivedError || !archived) throw archivedError || new Error("Post não encontrado.");
      if (!archived.notion_archived) return json({ restored: true });
      if (!archived.client?.notion_active_page_id) throw new Error(`O cliente ${archived.client?.name || "selecionado"} não possui a pasta A POSTAR — POSTFLOW.`);
      if (!archived.notion_page_id) throw new Error("A página deste post não foi encontrada no Notion.");

      const restoredPost = { ...archived, status: "Agendado" };
      await replacePostContent(archived.notion_page_id, restoredPost, archived.client.name);
      await notionRequest(`/pages/${archived.notion_page_id}/move`, {
        method: "POST",
        body: JSON.stringify({ parent: { type: "page_id", page_id: archived.client.notion_active_page_id } }),
      });
      const { error: restoreError } = await admin.from("posts").update({ notion_archived: false, published_at: null, status: "Agendado" }).eq("id", body.postId);
      if (restoreError) throw restoreError;
      return json({ restored: true });
    }

    const { postId, post } = body;
    if (!postId || !post) return json({ error: "Post inválido." }, 400);
    const { data, error } = await admin.from("posts").select("*, images:post_images(url,name), client:clients(name,notion_archive_page_id)").eq("id", postId).single();
    if (error || !data) throw error || new Error("Post não encontrado.");
    if (!data.client?.notion_archive_page_id) throw new Error(`O cliente ${data.client?.name || "selecionado"} não possui a pasta POSTADOS — POSTFLOW.`);

    let notionPageId = data.notion_page_id;
    if (!data.notion_archived) {
      if (!notionPageId) {
        const page = await createPostPage(data.client.notion_archive_page_id, post, data.client.name);
        notionPageId = page.id;
      } else {
        await replacePostContent(notionPageId, post, data.client.name);
        await notionRequest(`/pages/${notionPageId}/move`, {
          method: "POST",
          body: JSON.stringify({ parent: { type: "page_id", page_id: data.client.notion_archive_page_id } }),
        });
      }
      const { error: markError } = await admin.from("posts").update({
        notion_page_id: notionPageId,
        notion_archived: true,
        published_at: data.published_at || new Date().toISOString(),
        status: "Publicado",
      }).eq("id", postId);
      if (markError) throw markError;
    } else if (!data.published_at) {
      const { error: dateError } = await admin.from("posts").update({ published_at: new Date().toISOString() }).eq("id", postId);
      if (dateError) throw dateError;
    }
    const publishedAt = data.published_at || new Date().toISOString();
    const cleanupScheduledFor = new Date(new Date(publishedAt).getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    return json({ archived: true, notionPageId, cleanupScheduledFor });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível arquivar o post.";
    return json({ error: message }, message === "Sessão inválida." ? 401 : 500);
  }
});
