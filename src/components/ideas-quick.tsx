"use client";

import { ExternalLink, Lightbulb, Link2, Mic, MicOff, Plus, Rocket, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import type { Client, Idea, IdeaInput } from "@/types";
import { Button, Field, inputClass, Modal } from "./ui";

type SpeechEvent = { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> };
type SpeechRecognitionLike = { lang: string; continuous: boolean; interimResults: boolean; onresult: ((event: SpeechEvent) => void) | null; onend: (() => void) | null; onerror: (() => void) | null; start: () => void; stop: () => void };
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const blank: IdeaInput = { title: "", client_id: null, text: "", links: [""] };

export function IdeasQuick({ ideas, clients, onSave, onDelete, onConvert }: { ideas: Idea[]; clients: Client[]; onSave: (input: IdeaInput) => Promise<void>; onDelete: (idea: Idea) => Promise<void>; onConvert: (idea: Idea) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<IdeaInput>(blank);
  const [saving, setSaving] = useState(false);
  const [dictating, setDictating] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setSaving(true);
    try { await onSave({ ...form, links: form.links.map((link) => link.trim()).filter(Boolean) }); setForm(blank); }
    finally { setSaving(false); }
  }

  function toggleDictation() {
    if (dictating) { recognitionRef.current?.stop(); return; }
    const speechWindow = window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor };
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) { alert("O reconhecimento de voz não está disponível neste navegador. Você ainda pode usar o microfone do teclado do celular."); return; }
    const recognition = new Recognition(); recognition.lang = "pt-BR"; recognition.continuous = true; recognition.interimResults = false;
    recognition.onresult = (event) => { let transcript = ""; for (let index = event.resultIndex; index < event.results.length; index++) if (event.results[index].isFinal) transcript += event.results[index][0].transcript; if (transcript) setForm((current) => ({ ...current, text: `${current.text}${current.text ? " " : ""}${transcript.trim()}` })); };
    recognition.onend = () => setDictating(false); recognition.onerror = () => setDictating(false); recognitionRef.current = recognition; setDictating(true); recognition.start();
  }

  return <>
    <button aria-label="Abrir Caixa de Ideias" onClick={() => setOpen(true)} className="fixed bottom-20 right-4 z-30 grid size-14 place-items-center rounded-2xl bg-[#D9FF57] text-black shadow-xl transition hover:scale-105 lg:bottom-6 lg:right-6"><Lightbulb size={23} /></button>
    <Modal open={open} onClose={() => { recognitionRef.current?.stop(); setOpen(false); }} title="Caixa de Ideias" wide>
      <form onSubmit={submit} className="mb-7 rounded-2xl border border-[#E0E0DA] bg-white p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Título da ideia"><input required autoFocus className={inputClass} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Uma ideia rápida..." /></Field>
          <Field label="Cliente opcional"><select className={inputClass} value={form.client_id || ""} onChange={(event) => setForm({ ...form, client_id: event.target.value || null })}><option value="">Organizar depois</option>{clients.map((client) => <option value={client.id} key={client.id}>{client.name}</option>)}</select></Field>
          <Field label="Anotação" className="sm:col-span-2"><div className="relative"><textarea className={`${inputClass} min-h-32 py-3 pr-14`} value={form.text} onChange={(event) => setForm({ ...form, text: event.target.value })} placeholder="Escreva ou dite a ideia..." /><button type="button" aria-label={dictating ? "Parar ditado" : "Ditar ideia"} onClick={toggleDictation} className={`absolute right-3 top-3 grid size-10 place-items-center rounded-xl ${dictating ? "animate-pulse bg-red-100 text-red-600" : "bg-[#ECECE7]"}`}>{dictating ? <MicOff size={19} /> : <Mic size={19} />}</button></div>{dictating && <p className="mt-2 text-xs font-semibold text-red-600">Ouvindo… fale normalmente.</p>}</Field>
          <Field label="Links de referência" className="sm:col-span-2"><div className="space-y-2">{form.links.map((link, index) => <div key={index} className="flex gap-2"><div className="relative flex-1"><Link2 className="absolute left-3 top-3 text-[#77776F]" size={17} /><input type="url" className={`${inputClass} pl-10`} value={link} onChange={(event) => setForm({ ...form, links: form.links.map((item, itemIndex) => itemIndex === index ? event.target.value : item) })} placeholder="https://instagram.com/..." /></div>{form.links.length > 1 && <button type="button" onClick={() => setForm({ ...form, links: form.links.filter((_, itemIndex) => itemIndex !== index) })} className="grid size-11 place-items-center rounded-xl bg-[#FFF0ED] text-red-600"><Trash2 size={17} /></button>}</div>)}</div><button type="button" onClick={() => setForm({ ...form, links: [...form.links, ""] })} className="mt-2 flex items-center gap-1 text-xs font-bold"><Plus size={15} />Adicionar outro link</button></Field>
        </div><div className="mt-4 flex justify-end"><Button disabled={saving}>{saving ? "Salvando..." : "Guardar ideia"}</Button></div>
      </form>
      <h3 className="font-display mb-3 text-lg font-extrabold">Ideias guardadas ({ideas.length})</h3>
      {!ideas.length ? <p className="rounded-2xl border border-dashed border-[#CECEC7] p-5 text-center text-sm text-[#77776F]">Sua caixa está vazia.</p> : <div className="space-y-3">{ideas.map((idea) => <article key={idea.id} className="rounded-2xl border border-[#E2E2DC] bg-white p-4"><div className="flex items-start justify-between gap-3"><div><h4 className="font-display font-extrabold">{idea.title}</h4><p className="mt-1 text-xs text-[#77776F]">{clients.find((client) => client.id === idea.client_id)?.name || "Sem cliente definido"}</p></div><button onClick={() => void onDelete(idea)} className="rounded-lg p-2 text-red-600 hover:bg-[#FFF0ED]"><Trash2 size={16} /></button></div>{idea.text && <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{idea.text}</p>}{idea.links.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{idea.links.map((link) => <a key={link} href={link} target="_blank" className="flex items-center gap-1 rounded-lg bg-[#ECECE7] px-2 py-1 text-xs font-semibold"><ExternalLink size={13} />Referência</a>)}</div>}<Button onClick={() => { onConvert(idea); setOpen(false); }} variant="secondary" className="mt-4 h-9 px-3 text-xs"><Rocket size={15} />Transformar em post</Button></article>)}</div>}
    </Modal>
  </>;
}
