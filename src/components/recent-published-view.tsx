"use client";

import { Clock3, History, ImageIcon, RotateCcw } from "lucide-react";
import Image from "next/image";
import type { Client, Post } from "@/types";
import { Button, EmptyState } from "./ui";

const DAY = 24 * 60 * 60 * 1000;

function retention(post: Post) {
  const published = new Date(post.published_at || Date.now()).getTime();
  const remaining = published + 7 * DAY - Date.now();
  const days = Math.max(0, Math.ceil(remaining / DAY));
  if (days === 0) return "Limpeza na próxima atualização";
  if (days === 1) return "Imagens protegidas por mais 1 dia";
  return `Imagens protegidas por mais ${days} dias`;
}

function publishedDate(value?: string | null) {
  if (!value) return "Data não disponível";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function RecentPublishedView({ posts, clients, restoringId, onRestore }: { posts: Post[]; clients: Client[]; restoringId: string | null; onRestore: (post: Post) => void }) {
  return <div>
    <div className="mb-7">
      <p className="mb-1 text-sm font-semibold text-[#7A7A73]">Margem de segurança de 7 dias</p>
      <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Publicados recentemente</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#77776F]">Esses posts já estão em POSTADOS no Notion, mas as artes continuam protegidas temporariamente. Você pode restaurá-los antes da limpeza.</p>
    </div>
    {!posts.length ? <EmptyState icon={<History />} title="Nenhum post recente" text="Quando você publicar um post, ele ficará disponível aqui durante 7 dias." /> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{posts.map((post) => {
      const client = clients.find((item) => item.id === post.client_id);
      const cover = post.images[0];
      return <article key={post.id} className="overflow-hidden rounded-3xl border border-[#E2E2DC] bg-white shadow-sm">
        <div className="relative aspect-[16/10] bg-[#ECECE7]">{cover ? <Image src={cover.url} alt="" fill unoptimized className="object-cover" /> : <div className="grid h-full place-items-center text-[#AAA9A2]"><ImageIcon size={34} /></div>}</div>
        <div className="p-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#77776F]"><span className="size-2 rounded-full" style={{ background: client?.color || "#aaa" }} />{client?.name || "Cliente"}</div>
          <h2 className="font-display mt-2 text-lg font-extrabold leading-tight">{post.title}</h2>
          <div className="mt-4 space-y-1.5 text-xs text-[#77776F]"><p>Publicado em {publishedDate(post.published_at)}</p><p className="flex items-center gap-1.5 font-semibold text-[#6B741D]"><Clock3 size={14} />{retention(post)}</p><p>{post.images.length} {post.images.length === 1 ? "imagem guardada" : "imagens guardadas"}</p></div>
          <Button className="mt-5 w-full" variant="secondary" disabled={restoringId === post.id} onClick={() => onRestore(post)}><RotateCcw size={17} />{restoringId === post.id ? "Restaurando..." : "Restaurar post"}</Button>
        </div>
      </article>;
    })}</div>}
  </div>;
}
