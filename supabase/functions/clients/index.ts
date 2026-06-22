import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, createChildPage, ensureClientStructure, json, listChildPages, notionRequest, requireUser } from "../_shared/common.ts";

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
      let created = 0;
      let updated = 0;
      for (const notionClient of notionClients) {
        const existing = byNotionId.get(notionClient.id) || byName.get(notionClient.title.toLocaleLowerCase("pt-BR"));
        if (existing?.hidden_in_app) continue;
        const structure = existing?.notion_posts_page_id && existing?.notion_archive_page_id
          ? { notion_posts_page_id: existing.notion_posts_page_id, notion_archive_page_id: existing.notion_archive_page_id }
          : await ensureClientStructure(notionClient.id);
        if (existing) {
          const { error } = await admin.from("clients").update({ name: notionClient.title, notion_client_page_id: notionClient.id, ...structure }).eq("id", existing.id);
          if (error) throw error;
          updated++;
        } else {
          const { error } = await admin.from("clients").insert({ name: notionClient.title, handle: "", color: "#31312F", notes: "Criado a partir do Notion", notion_client_page_id: notionClient.id, ...structure });
          if (error) throw error;
          created++;
        }
      }
      return json({ created, updated });
    }

    if (body.action === "create") {
      const input = body.input;
      if (!input?.name?.trim()) return json({ error: "Informe o nome do cliente." }, 400);
      const notionClient = await createChildPage(rootId, input.name.trim(), "👤");
      const structure = await ensureClientStructure(notionClient.id);
      const { data, error } = await admin.from("clients").insert({ ...input, name: input.name.trim(), notion_client_page_id: notionClient.id, ...structure, hidden_in_app: false }).select().single();
      if (error) throw error;
      return json(data);
    }

    if (body.action === "update") {
      const { clientId, input } = body;
      const { data: client, error: findError } = await admin.from("clients").select("*").eq("id", clientId).single();
      if (findError || !client) throw findError || new Error("Cliente não encontrado.");
      if (client.notion_client_page_id) {
        await notionRequest(`/pages/${client.notion_client_page_id}`, { method: "PATCH", body: JSON.stringify({ properties: { title: { title: [{ type: "text", text: { content: input.name.trim() } }] } } }) });
      }
      const { data, error } = await admin.from("clients").update({ ...input, notion_client_page_id: client.notion_client_page_id, notion_posts_page_id: client.notion_posts_page_id, notion_archive_page_id: client.notion_archive_page_id, hidden_in_app: false }).eq("id", clientId).select().single();
      if (error) throw error;
      return json(data);
    }

    return json({ error: "Ação inválida." }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao sincronizar clientes.";
    return json({ error: message }, message === "Sessão inválida." ? 401 : 500);
  }
});
