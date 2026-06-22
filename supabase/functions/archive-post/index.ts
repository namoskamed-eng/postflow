import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, json, notionRequest, requireUser } from "../_shared/common.ts";

const BUCKET = "post-images";

function richText(content: string) { return [{ type: "text", text: { content } }]; }
function splitText(text: string, size = 1800) {
  if (!text?.trim()) return ["—"];
  const pieces: string[] = [];
  let remaining = text.trim();
  while (remaining.length > size) {
    let cut = remaining.lastIndexOf("\n", size);
    if (cut < size / 2) cut = size;
    pieces.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  if (remaining) pieces.push(remaining);
  return pieces;
}
function archiveBlocks(post: Record<string, string>, clientName: string) {
  const metadata = [`Cliente: ${clientName}`, `Data planejada: ${post.planned_date || "Não informada"}`, `Plataforma: ${post.platform}`, `Tipo: ${post.type}`].join("\n");
  const blocks: Record<string, unknown>[] = [{ object: "block", type: "callout", callout: { icon: { type: "emoji", emoji: "✅" }, rich_text: richText(metadata), color: "green_background" } }];
  for (const [heading, value] of [["Legenda", post.caption], ["Texto do post / carrossel", post.content], ["Observações", post.notes]]) {
    blocks.push({ object: "block", type: "heading_2", heading_2: { rich_text: richText(heading), color: "default", is_toggleable: false } });
    for (const piece of splitText(value)) blocks.push({ object: "block", type: "paragraph", paragraph: { rich_text: richText(piece), color: "default" } });
  }
  return blocks;
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
    const { postId, post } = await request.json();
    if (!postId || !post) return json({ error: "Post inválido." }, 400);
    const { data, error } = await admin.from("posts").select("*, images:post_images(url,name), client:clients(name,notion_archive_page_id)").eq("id", postId).single();
    if (error || !data) throw error || new Error("Post não encontrado.");
    if (!data.client?.notion_archive_page_id) throw new Error(`O cliente ${data.client?.name || "selecionado"} não possui uma pasta do Notion configurada.`);
    let notionPageId = data.notion_page_id;
    let notionUrl: string | undefined;
    if (!notionPageId) {
      const notionPage = await notionRequest("/pages", {
        method: "POST",
        body: JSON.stringify({ parent: { type: "page_id", page_id: data.client.notion_archive_page_id }, icon: { type: "emoji", emoji: "✅" }, properties: { title: { title: richText(post.title) } }, children: archiveBlocks(post, data.client.name) }),
      });
      notionPageId = notionPage.id;
      notionUrl = notionPage.url;
      const { error: markError } = await admin.from("posts").update({ notion_page_id: notionPageId }).eq("id", postId);
      if (markError) throw markError;
    }
    const paths = (data.images || []).map((image: { url: string }) => storagePath(image.url)).filter(Boolean) as string[];
    if (paths.length) {
      const { error: removeError } = await admin.storage.from(BUCKET).remove(paths);
      if (removeError) throw removeError;
    }
    const { error: deleteError } = await admin.from("posts").delete().eq("id", postId);
    if (deleteError) throw deleteError;
    return json({ archived: true, notionPageId, notionUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível arquivar o post.";
    return json({ error: message }, message === "Sessão inválida." ? 401 : 500);
  }
});
