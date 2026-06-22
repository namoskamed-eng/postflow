"use client";
import { Edit3, Plus, RefreshCw, Trash2, Users } from "lucide-react";
import type { Client, Post } from "@/types";
import { Button, EmptyState } from "./ui";
import { initials } from "@/lib/utils";

type Props = {
  clients: Client[];
  posts: Post[];
  syncing: boolean;
  onSync: () => void;
  onNew: () => void;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
  onOpen: (client: Client) => void;
};

export function ClientsView({ clients, posts, syncing, onSync, onNew, onEdit, onDelete, onOpen }: Props) {
  return (
    <div>
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-sm font-semibold text-[#7A7A73]">Sua carteira</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Clientes</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onSync} disabled={syncing} className="px-3 sm:px-4">
            <RefreshCw size={18} className={syncing ? "animate-spin" : ""} />
            <span className="hidden sm:inline">{syncing ? "Atualizando..." : "Atualizar do Notion"}</span>
          </Button>
          <Button onClick={onNew} className="px-3 sm:px-4"><Plus size={18} /><span className="hidden sm:inline">Novo cliente</span></Button>
        </div>
      </div>

      {clients.length === 0 ? (
        <EmptyState icon={<Users />} title="Nenhum cliente ainda" text="Cadastre seu primeiro cliente para começar a organizar as postagens." action={<Button onClick={onNew}><Plus size={18} />Cadastrar cliente</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {clients.map((client, index) => (
            <article key={client.id} className="animate-rise rounded-3xl border border-[#E2E2DC] bg-white p-5 shadow-[0_1px_0_rgba(0,0,0,.03)]" style={{ animationDelay: `${index * 40}ms` }}>
              <div className="flex items-start justify-between">
                <div className="grid size-12 place-items-center rounded-2xl text-sm font-extrabold text-white" style={{ background: client.color }}>{initials(client.name)}</div>
                <div className="flex">
                  <button aria-label="Editar cliente" onClick={() => onEdit(client)} className="rounded-lg p-2 text-[#77776F] hover:bg-[#F0F0EB] hover:text-black"><Edit3 size={17} /></button>
                  <button aria-label="Excluir cliente" onClick={() => onDelete(client)} className="rounded-lg p-2 text-[#77776F] hover:bg-[#FFF0ED] hover:text-red-600"><Trash2 size={17} /></button>
                </div>
              </div>
              <button onClick={() => onOpen(client)} className="block w-full text-left">
                <h2 className="font-display mt-5 text-lg font-extrabold">{client.name}</h2>
                <p className="text-sm text-[#85857E]">{client.handle || "Sem perfil informado"}</p>
                <div className="mt-5 border-t border-[#EEEEEA] pt-4 text-xs font-semibold text-[#66665F]">{posts.filter((post) => post.client_id === client.id).length} postagens · Ver cliente</div>
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
