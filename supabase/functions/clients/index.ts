import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, createChildPage, ensureClientStructure, findClientStructure, json, listChildPages, normalizeTitle, notionRequest, requireUser, trashPage } from "../_shared/common.ts";

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
    const rootId = Deno.env.get("NOTION_CLIENTS_PAGE_ID");
    if (!rootId) throw new Error("Página CLIENTES do Notion não configurada.");

    if (body.action === "sync") {
      const [notionClients, databaseResult] = await Promise.all([listChildPages(rootId), admin.from("clients").select("*")]);
      if (databaseResult.error) throw databaseResult.error;
      const databaseClients = databaseResult.data || [];
      const byNotionId = new Map(databaseClients.filter((client) => client.notion_client_page_id).map((client) => [client.notion_client_page_id, client]));
      const byName = new Map(databaseClients.map((client) => [client.name.toLocaleLowerCase("pt-BR"), client]));
      const visibleNotionIds = new Set<string>();
      let created = 0;
      let updated = 0;

      for (const notionClient of notionClients) {
        const found = await findClientStructure(notionClient.id);
        if (!found.posts || !found.active) continue;
        let archive = found.archive;
        if (!archive) {
          const page = await createChildPage(found.posts.id, "POSTADOS — POSTFLOW", "✅");
          archive = { id: page.id, title: "POSTADOS — POSTFLOW" };
        }
        visibleNotionIds.add(notionClient.id);
        const existing = byNotionId.get(notionClient.id) || byName.get(notionClient.title.toLocaleLowerCase("pt-BR"));
        const structure = {
          notion_client_page_id: notionClient.id,
          notion_posts_page_id: found.posts.id,
          notion_active_page_id: found.active.id,
          notion_archive_page_id: archive.id,
          hidden_in_app: false,
        };
        if (existing) {
          const { error } = await admin.from("clients").update({ name: notionClient.title, ...structure }).eq("id", existing.id);
          if (error) throw error;
          updated++;
        } else {
          const { error } = await admin.from("clients").insert({ name: notionClient.title, handle: "", color: "#31312F", notes: "Criado a partir do Notion", ...structure });
          if (error) throw error;
          created++;
        }
      }

      const toHide = databaseClients
        .filter((client) => client.notion_client_page_id && !visibleNotionIds.has(client.notion_client_page_id))
        .map((client) => client.id);
      if (toHide.length) {
        const { error } = await admin.from("clients").update({ hidden_in_app: true }).in("id", toHide);
        if (error) throw error;
      }
      return json({ created, updated, hidden: toHide.length });
    }

    if (body.action === "create") {
      const input = body.input;
      if (!input?.name?.trim()) return json({ error: "Informe o nome do cliente." }, 400);
      const name = input.name.trim();
      const [notionClients, databaseResult] = await Promise.all([
        listChildPages(rootId),
        admin.from("clients").select("*").order("created_at"),
      ]);
      if (databaseResult.error) throw databaseResult.error;
      const matches = notionClients
        .filter((client) => normalizeTitle(client.title) === normalizeTitle(name))
        .sort((a, b) => String(a.created_time || "").localeCompare(String(b.created_time || "")));
      const databaseMatches = (databaseResult.data || []).filter((client) => normalizeTitle(client.name) === normalizeTitle(name));
      let notionClient = matches.find((page) => databaseMatches.some((client) => client.notion_client_page_id === page.id)) || matches[0];
      const reusedNotionPage = Boolean(notionClient);
      if (!notionClient) notionClient = await createChildPage(rootId, name, "👤");
      try {
        const structure = await ensureClientStructure(notionClient.id);
        const existing = databaseMatches.find((client) => client.notion_client_page_id === notionClient.id) || databaseMatches[0];
        const values = { ...input, name, notion_client_page_id: notionClient.id, ...structure, hidden_in_app: false };
        const query = existing
          ? admin.from("clients").update(values).eq("id", existing.id)
          : admin.from("clients").insert(values);
        const { data, error } = await query.select().single();
        if (error) throw error;
        return json({ ...data, reusedNotionPage });
      } catch (error) {
        if (!reusedNotionPage) await trashPage(notionClient.id).catch(() => undefined);
        throw error;
      }
    }

    if (body.action === "update") {
      const { clientId, input } = body;
      const { data: client, error: findError } = await admin.from("clients").select("*").eq("id", clientId).single();
      if (findError || !client) throw findError || new Error("Cliente não encontrado.");
      if (client.notion_client_page_id) {
        await notionRequest(`/pages/${client.notion_client_page_id}`, { method: "PATCH", body: JSON.stringify({ properties: { title: { title: [{ type: "text", text: { content: input.name.trim() } }] } } }) });
      }
      const { data, error } = await admin.from("clients").update({
        ...input,
        notion_client_page_id: client.notion_client_page_id,
        notion_posts_page_id: client.notion_posts_page_id,
        notion_active_page_id: client.notion_active_page_id,
        notion_archive_page_id: client.notion_archive_page_id,
        hidden_in_app: false,
      }).eq("id", clientId).select().single();
      if (error) throw error;
      return json(data);
    }

    if (body.action === "delete") {
      const { clientId } = body;
      const { data: client, error: clientError } = await admin.from("clients").select("*").eq("id", clientId).single();
      if (clientError || !client) throw clientError || new Error("Cliente não encontrado.");
      const { data: images, error: imageError } = await admin.from("post_images").select("url, post:posts!inner(client_id)").eq("post.client_id", clientId);
      if (imageError) throw imageError;
      const paths = (images || []).map((image) => storagePath(image.url)).filter(Boolean) as string[];
      if (paths.length) {
        const { error } = await admin.storage.from(BUCKET).remove(paths);
        if (error) throw error;
      }
      await trashPage(client.notion_active_page_id);
      await trashPage(client.notion_archive_page_id);
      const { error } = await admin.from("clients").delete().eq("id", clientId);
      if (error) throw error;
      return json({ deleted: true });
    }

    return json({ error: "Ação inválida." }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao sincronizar clientes.";
    return json({ error: message }, message === "Sessão inválida." ? 401 : 500);
  }
});
