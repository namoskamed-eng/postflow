import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, createPostPage, json, notionRequest, replacePostContent, requireUser, trashPage } from "../_shared/common.ts";

const BUCKET = "post-images";

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
        const { data, error } = await admin.from("posts").update({ ...input, notion_page_id: notionPageId, notion_archived: false }).eq("id", postId).select().single();
        if (error) throw error;
        return json(data);
      }

      const page = await createPostPage(client.notion_active_page_id, input, client.name);
      const { data, error } = await admin.from("posts").insert({ ...input, notion_page_id: page.id, notion_archived: false }).select().single();
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
