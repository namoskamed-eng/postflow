"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { Sidebar, type View } from "@/components/sidebar";
import { PostsView } from "@/components/posts-view";
import { ClientsView } from "@/components/clients-view";
import { Modal } from "@/components/ui";
import { ClientForm } from "@/components/client-form";
import { PostForm } from "@/components/post-form";
import { PostDetail } from "@/components/post-detail";
import { deleteClient, deletePost, deletePostImage, getClients, getPosts, saveClient, savePost, uploadPostImages } from "@/lib/data";
import { hasSupabase, supabase } from "@/lib/supabase";
import type { Client, ClientInput, Post, PostInput } from "@/types";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const CLIENT_SYNC_SLOT_KEY = "postflow_client_sync_slot";

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function currentSyncSlot(date = new Date()) {
  return `${dateKey(date)}-${date.getHours() < 12 ? "00" : "12"}`;
}

function millisecondsUntilNextSync(date = new Date()) {
  const next = new Date(date);
  if (date.getHours() < 12) next.setHours(12, 0, 0, 0);
  else {
    next.setDate(next.getDate() + 1);
    next.setHours(0, 0, 0, 0);
  }
  return Math.max(1000, next.getTime() - date.getTime());
}

export default function Home() {
  const [view, setView] = useState<View>("posts");
  const [clients, setClients] = useState<Client[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [clientModal, setClientModal] = useState(false);
  const [postModal, setPostModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [detail, setDetail] = useState<Post | null>(null);

  async function load() {
    try {
      setError("");
      const [loadedClients, loadedPosts] = await Promise.all([getClients(), getPosts()]);
      const visibleClientIds = new Set(loadedClients.map((client) => client.id));
      setClients(loadedClients);
      setPosts(loadedPosts.filter((post) => visibleClientIds.has(post.client_id)));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar os dados.");
    } finally {
      setLoading(false);
    }
  }

  async function syncClients(notify = false) {
    if (!hasSupabase) return;
    setSyncing(true);
    try {
      const { data, error: syncError } = await supabase!.functions.invoke("clients", { body: { action: "sync" } });
      if (syncError) throw syncError;
      if (data?.error) throw new Error(data.error);
      localStorage.setItem(CLIENT_SYNC_SLOT_KEY, currentSyncSlot());
      await load();
      if (notify) alert(`Clientes atualizados. ${data?.created || 0} novo(s) e ${data?.hidden || 0} ocultado(s) pela ausência de A POSTAR — POSTFLOW.`);
    } catch (syncError) {
      if (notify) alert(syncError instanceof Error ? syncError.message : "Não foi possível atualizar os clientes.");
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function runScheduledSync() {
      if (localStorage.getItem(CLIENT_SYNC_SLOT_KEY) !== currentSyncSlot()) await syncClients(false);
    }

    function scheduleNextSync() {
      timer = setTimeout(async () => {
        await runScheduledSync();
        if (!cancelled) scheduleNextSync();
      }, millisecondsUntilNextSync());
    }

    void (async () => {
      if (hasSupabase) {
        const { data } = await supabase!.auth.getSession();
        if (!data.session) {
          window.location.replace(`${basePath}/login`);
          return;
        }
      }
      await load();
      if (cancelled || !hasSupabase) return;
      void runScheduledSync();
      scheduleNextSync();
    })();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // O agendador deve ser criado uma única vez durante a sessão do app.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openClient(client?: Client) {
    setEditingClient(client || null);
    setClientModal(true);
  }

  function openPost(post?: Post) {
    setEditingPost(post || null);
    setPostModal(true);
  }

  async function handleSyncClients() {
    await syncClients(true);
  }

  async function handleClient(input: ClientInput) {
    if (!hasSupabase) {
      await saveClient(input, editingClient?.id);
      setClientModal(false);
      await load();
      return;
    }
    try {
      const { data, error: clientError } = await supabase!.functions.invoke("clients", {
        body: editingClient ? { action: "update", clientId: editingClient.id, input } : { action: "create", input },
      });
      if (clientError) throw clientError;
      if (data?.error) throw new Error(data.error);
      setClientModal(false);
      await load();
      if (!editingClient && data?.reusedNotionPage) alert("Esse cliente já existia no Notion. O PostFlow usou a página original e apenas completou as pastas A POSTAR e POSTADOS.");
    } catch (clientError) {
      alert(clientError instanceof Error ? clientError.message : "Não foi possível sincronizar o cliente.");
    }
  }

  async function handlePost(input: PostInput, files: File[]) {
    if (input.status === "Publicado") {
      if (!hasSupabase) {
        alert("O arquivamento precisa do Supabase configurado. O post não foi alterado.");
        return;
      }
      if (!confirm("Ao continuar, o post será arquivado no Notion e removido do PostFlow junto com todas as imagens. Deseja continuar?")) return;
    }
    try {
      const saved = await savePost(input, editingPost?.id);
      if (files.length) await uploadPostImages(saved.id, files);
      if (input.status === "Publicado") {
        const { data, error: archiveError } = await supabase!.functions.invoke("archive-post", { body: { postId: saved.id, post: input } });
        if (archiveError) throw archiveError;
        if (data?.error) throw new Error(data.error);
        alert("Post arquivado no Notion e removido do PostFlow com sucesso.");
      }
      setPostModal(false);
      setDetail(null);
      await load();
    } catch (postError) {
      alert(postError instanceof Error ? postError.message : "Não foi possível salvar o post.");
      await load();
    }
  }

  async function handleDeleteClient(client: Client) {
    if (confirm(`Excluir ${client.name} do PostFlow? As pastas A POSTAR — POSTFLOW e POSTADOS — POSTFLOW, incluindo o histórico, serão movidas para a lixeira do Notion.`)) {
      await deleteClient(client.id);
      await load();
    }
  }

  async function handleDeletePost(post: Post) {
    if (confirm(`Excluir a postagem “${post.title}”?`)) {
      await deletePost(post.id);
      setDetail(null);
      await load();
    }
  }

  async function handleDeleteImage(post: Post, imageId: string) {
    if (confirm("Remover esta imagem?")) {
      await deletePostImage(post.id, imageId);
      await load();
      setDetail((current) => current ? { ...current, images: current.images.filter((image) => image.id !== imageId) } : null);
    }
  }

  async function handleLogout() {
    await supabase?.auth.signOut();
    window.location.replace(`${basePath}/login`);
  }

  return (
    <div className="min-h-screen">
      <Sidebar view={view} setView={(nextView) => { setView(nextView); setDetail(null); }} onLogout={handleLogout} />
      <main className="pb-28 lg:ml-64 lg:pb-12">
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-7 lg:px-10 lg:py-10">
          {!hasSupabase && <div className="mb-6 flex items-start gap-3 rounded-2xl bg-[#ECF5C9] px-4 py-3 text-sm"><Sparkles className="mt-0.5 shrink-0" size={18} /><p><strong>Modo de demonstração ativo.</strong> Seus dados ficam neste navegador. Configure o Supabase para sincronizar entre celular e computador.</p></div>}
          {error && <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
          {loading ? <div className="grid min-h-96 place-items-center"><div className="size-8 animate-spin rounded-full border-2 border-[#D9FF57] border-t-black" /></div> : view === "posts" ? <PostsView posts={posts} clients={clients} onNew={() => openPost()} onOpen={setDetail} /> : <ClientsView clients={clients} posts={posts} syncing={syncing} onSync={handleSyncClients} onNew={() => openClient()} onEdit={openClient} onDelete={handleDeleteClient} />}
        </div>
      </main>
      <Modal open={clientModal} onClose={() => setClientModal(false)} title={editingClient ? "Editar cliente" : "Novo cliente"}><ClientForm client={editingClient} onSave={handleClient} onCancel={() => setClientModal(false)} /></Modal>
      <Modal open={postModal} onClose={() => setPostModal(false)} title={editingPost ? "Editar postagem" : "Nova postagem"} wide><PostForm post={editingPost} clients={clients} onSave={handlePost} onCancel={() => setPostModal(false)} /></Modal>
      {detail && <PostDetail post={posts.find((post) => post.id === detail.id) || detail} client={clients.find((client) => client.id === detail.client_id)} onClose={() => setDetail(null)} onEdit={() => openPost(detail)} onDelete={() => handleDeletePost(detail)} onDeleteImage={(id) => handleDeleteImage(detail, id)} />}
    </div>
  );
}
