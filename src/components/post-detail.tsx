"use client";
/* eslint-disable @next/next/no-img-element */
import { Check, Copy, Download, Edit3, ImageIcon, LoaderCircle, Share2, Trash2, X } from "lucide-react";
import { useState } from "react";
import type { Client, Post } from "@/types";
import { formatDate } from "@/lib/utils";
import { Button } from "./ui";

type Props = {
  post: Post;
  client?: Client;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDeleteImage: (id: string) => void;
};

export function PostDetail({ post, client, onClose, onEdit, onDelete, onDeleteImage }: Props) {
  const [copied, setCopied] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  async function getImageFiles() {
    return Promise.all(post.images.map(async (image, index) => {
      const response = await fetch(image.url);
      if (!response.ok) throw new Error(`Não foi possível carregar ${image.name}.`);
      const blob = await response.blob();
      const extension = blob.type.split("/")[1]?.replace("jpeg", "jpg") || "png";
      const name = image.name || `${String(index + 1).padStart(2, "0")}-arte.${extension}`;
      return new File([blob], name, { type: blob.type || "image/png" });
    }));
  }

  async function shareImages() {
    setSharing(true);
    try {
      const files = await getImageFiles();
      if (!navigator.canShare?.({ files })) {
        alert("Este navegador não consegue compartilhar várias imagens. Use “Baixar todas” ou abra o PostFlow pelo celular.");
        return;
      }
      await navigator.share({ files });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      alert(error instanceof Error ? error.message : "Não foi possível compartilhar as artes.");
    } finally {
      setSharing(false);
    }
  }

  async function downloadAll() {
    setDownloading(true);
    try {
      const files = await getImageFiles();
      for (const file of files) {
        const url = URL.createObjectURL(file);
        const link = document.createElement("a");
        link.href = url;
        link.download = file.name;
        link.click();
        URL.revokeObjectURL(url);
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Não foi possível baixar as artes.");
    } finally {
      setDownloading(false);
    }
  }

  function TextSection({ title, text, id, copyLabel = "Copiar" }: { title: string; text: string; id: string; copyLabel?: string }) {
    return (
      <section className="rounded-2xl border border-[#E2E2DC] bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#77776F]">{title}</h3>
          {text && (
            <button onClick={() => copy(text, id)} className="flex items-center gap-1.5 rounded-lg bg-[#1D1D1B] px-3 py-2 text-xs font-semibold text-white transition hover:bg-black">
              {copied === id ? <><Check size={14} />Copiada</> : <><Copy size={14} />{copyLabel}</>}
            </button>
          )}
        </div>
        <p className="whitespace-pre-wrap text-sm leading-6">{text || "—"}</p>
      </section>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-[#F7F7F4] lg:left-64">
      <header className="sticky top-0 z-10 flex h-17 items-center justify-between border-b border-[#E1E1DB] bg-[#F7F7F4]/95 px-4 backdrop-blur sm:px-8">
        <button onClick={onClose} className="flex items-center gap-2 text-sm font-semibold"><X size={19} />Fechar</button>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onEdit}><Edit3 size={16} /><span className="hidden sm:inline">Editar</span></Button>
          <Button variant="danger" onClick={onDelete}><Trash2 size={16} /><span className="hidden sm:inline">Excluir</span></Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-7 pb-24 sm:px-8">
        <div className="mb-7">
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-[#1D1D1B] px-3 py-1 text-xs font-bold text-white">{post.status}</span>
            <span className="rounded-full bg-[#E8E8E2] px-3 py-1 text-xs font-semibold">{post.platform}</span>
            <span className="rounded-full bg-[#E8E8E2] px-3 py-1 text-xs font-semibold">{post.type}</span>
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{post.title}</h1>
          <p className="mt-2 text-sm text-[#74746E]"><span style={{ color: client?.color }}>●</span> {client?.name || "Cliente removido"} · {formatDate(post.planned_date)}</p>
        </div>

        {post.images.length > 0 ? (
          <section className="mb-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#77776F]">Artes ({post.images.length})</h3>
              <div className="flex gap-2">
                <Button variant="secondary" className="h-10 px-3" onClick={downloadAll} disabled={downloading || sharing}>
                  {downloading ? <LoaderCircle className="animate-spin" size={16} /> : <Download size={16} />}
                  <span className="hidden sm:inline">Baixar todas</span>
                </Button>
                <Button className="h-10 px-3" onClick={shareImages} disabled={sharing || downloading}>
                  {sharing ? <LoaderCircle className="animate-spin" size={16} /> : <Share2 size={16} />}
                  Enviar artes
                </Button>
              </div>
            </div>
            <p className="mb-3 text-xs text-[#77776F]">No celular, escolha o WhatsApp na próxima tela.</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {post.images.map((image) => (
                <div className="group relative aspect-square overflow-hidden rounded-2xl bg-[#E8E8E2]" key={image.id}>
                  <img src={image.url} alt={image.name} className="size-full object-cover" />
                  <div className="absolute inset-x-2 bottom-2 flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                    <a href={image.url} download={image.name} target="_blank" className="rounded-lg bg-white p-2 shadow"><Download size={16} /></a>
                    <button onClick={() => onDeleteImage(image.id)} className="rounded-lg bg-white p-2 text-red-600 shadow"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <div className="mb-5 flex items-center gap-3 rounded-2xl border border-dashed border-[#CECEC7] p-4 text-sm text-[#7B7B74]"><ImageIcon size={20} />Nenhuma arte vinculada ainda.</div>
        )}

        <div className="grid gap-4">
          <TextSection title="Legenda" text={post.caption} id="caption" copyLabel="Copiar legenda" />
          <TextSection title="Texto do post / carrossel" text={post.content} id="content" />
          <TextSection title="Observações" text={post.notes} id="notes" />
        </div>
      </main>
    </div>
  );
}
