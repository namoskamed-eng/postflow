"use client";

import { CalendarDays, ChevronRight, CopyPlus, Filter, Plus, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import type { Client, Post, PostInput, PostStatus } from "@/types";
import { PLATFORMS, POST_TYPES, STATUSES } from "@/types";
import { Button, EmptyState, inputClass } from "./ui";
import { cn } from "@/lib/utils";

const statusStyle: Record<string, string> = {
  Ideia: "bg-[#EAEAE5] text-[#64645E]",
  Roteiro: "bg-[#E7F1FF] text-[#2163A5]",
  Arte: "bg-[#FFF1D6] text-[#956111]",
  Aprovação: "bg-[#F2E8FF] text-[#7141A8]",
  Agendado: "bg-[#DFF4EE] text-[#16705C]",
  Publicado: "bg-[#E8F6CF] text-[#477513]",
};

type Props = {
  posts: Post[];
  clients: Client[];
  onNew: () => void;
  onOpen: (post: Post) => void;
  onQuickUpdate: (post: Post, changes: Partial<PostInput>) => Promise<void>;
  onDuplicate: (post: Post) => Promise<void>;
};

export function PostsView({ posts, clients, onNew, onOpen, onQuickUpdate, onDuplicate }: Props) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [client, setClient] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [platform, setPlatform] = useState("");

  const filtered = useMemo(
    () => posts.filter((post) =>
      (!search || post.title.toLowerCase().includes(search.toLowerCase())) &&
      (!client || post.client_id === client) &&
      (!status || post.status === status) &&
      (!type || post.type === type) &&
      (!platform || post.platform === platform)
    ),
    [posts, search, client, status, type, platform],
  );

  const groups = useMemo(() => {
    const knownClients = clients
      .map((item) => ({ client: item, posts: filtered.filter((post) => post.client_id === item.id) }))
      .filter((group) => group.posts.length > 0);
    const withoutClient = filtered.filter((post) => !clients.some((item) => item.id === post.client_id));
    return withoutClient.length
      ? [...knownClients, { client: undefined, posts: withoutClient }]
      : knownClients;
  }, [clients, filtered]);

  const selects = [
    { value: client, setValue: setClient, label: "Todos os clientes", options: clients.map((item) => ({ value: item.id, label: item.name })) },
    { value: status, setValue: setStatus, label: "Todos os status", options: STATUSES.map((item) => ({ value: item, label: item })) },
    { value: type, setValue: setType, label: "Todos os tipos", options: POST_TYPES.map((item) => ({ value: item, label: item })) },
    { value: platform, setValue: setPlatform, label: "Todas as plataformas", options: PLATFORMS.map((item) => ({ value: item, label: item })) },
  ];
  const activeFilters = [client, status, type, platform].filter(Boolean).length;

  function clearFilters() {
    setClient("");
    setStatus("");
    setType("");
    setPlatform("");
  }

  return (
    <div>
      <div className="mb-7 flex items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-sm font-semibold text-[#7A7A73]">{posts.length} conteúdos no fluxo</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Postagens</h1>
        </div>
        <Button onClick={onNew} disabled={!clients.length}><Plus size={18} />Nova postagem</Button>
      </div>

      <div className="mb-5 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 text-[#85857E]" size={18} />
          <input className={`${inputClass} pl-10`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar postagem..." />
        </div>
        <Button variant="secondary" onClick={() => setFiltersOpen(!filtersOpen)} className="relative px-3 sm:px-4">
          <SlidersHorizontal size={18} />
          <span className="hidden sm:inline">Filtros</span>
          {activeFilters > 0 && <span className="grid size-5 place-items-center rounded-full bg-[#D9FF57] text-[10px] text-black">{activeFilters}</span>}
        </Button>
      </div>

      {filtersOpen && (
        <div className="animate-rise mb-6 grid gap-2 rounded-2xl border border-[#E0E0DA] bg-white p-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="col-span-full mb-1 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#77776F]"><Filter size={14} />Filtrar por</div>
            {activeFilters > 0 && <button onClick={clearFilters} className="text-xs font-semibold underline underline-offset-2">Limpar filtros</button>}
          </div>
          {selects.map((select) => (
            <select aria-label={select.label} key={select.label} value={select.value} onChange={(event) => select.setValue(event.target.value)} className={inputClass}>
              <option value="">{select.label}</option>
              {select.options.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
            </select>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={<CalendarDays />}
          title={posts.length ? "Nenhum resultado" : "Seu calendário está livre"}
          text={posts.length ? "Tente ajustar os filtros para encontrar o que procura." : "Crie sua primeira postagem e comece a colocar o conteúdo em movimento."}
          action={!posts.length && clients.length ? <Button onClick={onNew}><Plus size={18} />Criar postagem</Button> : undefined}
        />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.client?.id || "sem-cliente"}>
              <div className="mb-2 flex items-center gap-2 px-1">
                <span className="size-3 rounded-full" style={{ background: group.client?.color || "#AAA" }} />
                <h2 className="font-display text-lg font-extrabold">{group.client?.name || "Sem cliente"}</h2>
                <span className="rounded-full bg-[#E8E8E2] px-2.5 py-1 text-xs font-bold text-[#66665F]">{group.posts.length}</span>
              </div>
              <div className="overflow-hidden rounded-3xl border border-[#E0E0DA] bg-white">
                <div className="hidden grid-cols-[minmax(220px,1fr)_145px_155px_44px] border-b border-[#E8E8E2] bg-[#F2F2EE] px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-[#77776F] md:grid">
                  <span>Conteúdo</span><span>Status</span><span>Data</span><span />
                </div>
                {group.posts.map((post, index) => (
                  <div
                    key={post.id}
                    className={cn(
                      "animate-rise grid w-full items-center gap-3 border-b border-[#ECECE7] p-4 text-left transition last:border-0 hover:bg-[#FAFAF7] md:grid-cols-[minmax(220px,1fr)_145px_155px_44px] md:px-5",
                      index % 2 === 1 && "bg-[#FDFDFC]",
                    )}
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <button onClick={() => onOpen(post)} className="min-w-0 text-left">
                      <h3 className="truncate font-display text-[15px] font-extrabold">{post.title}</h3>
                      <p className="mt-1 flex items-center gap-1 text-xs text-[#81817A]">{post.platform} · {post.type}<ChevronRight size={14} /></p>
                    </button>
                    <select aria-label={`Status de ${post.title}`} value={post.status} onChange={(event) => void onQuickUpdate(post, { status: event.target.value as PostStatus })} className={cn("h-10 rounded-xl border-0 px-2 text-xs font-bold outline-none", statusStyle[post.status])}>{STATUSES.map((item) => <option key={item}>{item}</option>)}</select>
                    <input aria-label={`Data de ${post.title}`} type="date" value={post.planned_date || ""} onChange={(event) => void onQuickUpdate(post, { planned_date: event.target.value })} className="h-10 rounded-xl border border-[#DEDED8] bg-white px-2 text-xs" />
                    <button aria-label={`Duplicar ${post.title}`} title="Duplicar post" onClick={() => void onDuplicate(post)} className="grid size-10 place-items-center rounded-xl border border-[#DEDED8] bg-white hover:border-black"><CopyPlus size={17} /></button>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
