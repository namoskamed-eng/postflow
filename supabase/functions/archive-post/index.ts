import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, createPostPage, json, notionRequest, replacePostContent, requireUser } from "../_shared/common.ts";

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
    const { postId, post } = await request.json();
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
      const { error: markError } = await admin.from("posts").update({ notion_page_id: notionPageId, notion_archived: true }).eq("id", postId);
      if (markError) throw markError;
    }

    const paths = (data.images || []).map((image: { url: string }) => storagePath(image.url)).filter(Boolean) as string[];
    if (paths.length) {
      const { error: removeError } = await admin.storage.from(BUCKET).remove(paths);
      if (removeError) throw removeError;
    }
    const { error: deleteError } = await admin.from("posts").delete().eq("id", postId);
    if (deleteError) throw deleteError;
    return json({ archived: true, notionPageId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível arquivar o post.";
    return json({ error: message }, message === "Sessão inválida." ? 401 : 500);
  }
});
