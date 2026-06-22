"use client";

import { ArrowLeft, CalendarDays, Edit3, Instagram, Plus } from "lucide-react";
import type { Client, Post } from "@/types";
import { Button, EmptyState } from "./ui";
import { formatDate, initials } from "@/lib/utils";

export function ClientDetail({ client, posts, onClose, onEdit, onNewPost, onOpenPost }: {
  client: Client;
  posts: Post[];
  onClose: () => void;
  onEdit: () => void;
  onNewPost: () => void;
  onOpenPost: (post: Post) => void;
}) {
  const ordered = [...posts].sort((a, b) => (a.planned_date || "9999").localeCompare(b.planned_date || "9999"));
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#F7F7F4] lg:left-64">
      <header className="sticky top-0 z-10 flex h-17 items-center justify-between border-b border-[#E1E1DB] bg-[#F7F7F4]/95 px-4 backdrop-blur sm:px-8">
        <button onClick={onClose} className="flex items-center gap-2 text-sm font-semibold"><ArrowLeft size={19} />Clientes</button>
        <Button variant="secondary" onClick={onEdit}><Edit3 size={16} />Editar</Button>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-7 pb-28 sm:px-8">
        <div className="mb-8 flex flex-col gap-5 rounded-3xl border border-[#E2E2DC] bg-white p-6 sm:flex-row sm:items-center">
          <div className="grid size-20 shrink-0 place-items-center rounded-3xl text-xl font-extrabold text-white" style={{ background: client.color }}>{initials(client.name)}</div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-[#77776F]">Cliente</p>
            <h1 className="font-display mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">{client.name}</h1>
            <p className="mt-2 flex items-center gap-2 text-sm text-[#77776F]"><Instagram size={16} />{client.handle || "Sem perfil informado"}</p>
          </div>
          <Button onClick={onNewPost}><Plus size={18} />Novo post</Button>
        </div>
        {client.notes && <section className="mb-8 rounded-2xl bg-[#ECECE7] p-5"><h2 className="text-xs font-bold uppercase tracking-wider text-[#77776F]">Observações</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{client.notes}</p></section>}
        <div className="mb-3 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-[#77776F]">Conteúdos ativos</p><h2 className="font-display text-2xl font-extrabold">{posts.length} postagens</h2></div></div>
        {!ordered.length ? <EmptyState icon={<CalendarDays />} title="Nenhum post ativo" text="Crie a primeira postagem deste cliente." action={<Button onClick={onNewPost}><Plus size={18} />Criar post</Button>} /> : <div className="grid gap-3 sm:grid-cols-2">{ordered.map((post) => <button key={post.id} onClick={() => onOpenPost(post)} className="rounded-2xl border border-[#E2E2DC] bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between gap-3"><h3 className="font-display font-extrabold">{post.title}</h3><span className="shrink-0 rounded-full bg-[#E8E8E2] px-2 py-1 text-[11px] font-bold">{post.status}</span></div><p className="mt-3 text-xs text-[#77776F]">{formatDate(post.planned_date)} · {post.platform} · {post.type}</p></button>)}</div>}
      </main>
    </div>
  );
}
