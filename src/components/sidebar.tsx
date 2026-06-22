"use client";

import { CalendarDays, Columns3, FileText, History, House, LayoutList, LogOut, Sparkles, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export type View = "today" | "posts" | "calendar" | "board" | "clients" | "templates" | "recent";
const items = [
  { id: "today" as const, label: "Hoje", icon: House },
  { id: "posts" as const, label: "Postagens", icon: LayoutList },
  { id: "calendar" as const, label: "Calendário", icon: CalendarDays },
  { id: "board" as const, label: "Quadro", icon: Columns3 },
  { id: "clients" as const, label: "Clientes", icon: Users },
  { id: "templates" as const, label: "Modelos", icon: FileText },
  { id: "recent" as const, label: "Publicados recentemente", icon: History },
];

export function Sidebar({ view, setView, onLogout }: { view: View; setView: (view: View) => void; onLogout: () => void }) {
  return <>
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-[#E0E0DA] bg-[#F1F1ED] p-5 lg:flex">
      <div className="flex items-center gap-3 px-2 py-2"><div className="grid size-10 place-items-center rounded-xl bg-[#1D1D1B] text-[#D9FF57]"><Sparkles size={21} /></div><div><div className="font-display text-xl font-extrabold tracking-tight">PostFlow</div><div className="text-[11px] text-[#7B7B74]">conteúdo em movimento</div></div></div>
      <nav className="mt-8 space-y-1">{items.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setView(id)} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition", view === id ? "bg-white text-black shadow-sm" : "text-[#686862] hover:bg-white/60")}><Icon size={18} />{label}</button>)}</nav>
      <div className="mt-auto"><div className="rounded-2xl bg-[#1D1D1B] p-4 text-white"><CalendarDays className="text-[#D9FF57]" size={22} /><p className="mt-3 text-sm font-bold">Tudo no ritmo certo.</p><p className="mt-1 text-xs leading-relaxed text-white/55">Planeje, aprove e publique sem perder o fio.</p></div><button onClick={onLogout} className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#686862] hover:bg-white"><LogOut size={18} />Sair</button></div>
    </aside>
    <nav aria-label="Navegação principal" className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-around rounded-2xl border border-white/80 bg-[#1D1D1B]/95 p-2 shadow-xl backdrop-blur lg:hidden">{items.filter((item) => item.id !== "recent").map(({ id, label, icon: Icon }) => { const active = view === id || (view === "recent" && id === "today"); return <button key={id} aria-label={label} title={label} onClick={() => setView(id)} className={cn("grid size-10 shrink-0 place-items-center rounded-xl transition", active ? "bg-[#D9FF57] text-black shadow-sm" : "text-white/55 hover:bg-white/10 hover:text-white")}><Icon size={20} strokeWidth={active ? 2.5 : 2} /></button>; })}<button aria-label="Sair" title="Sair" onClick={onLogout} className="grid size-10 shrink-0 place-items-center rounded-xl text-white/55 transition hover:bg-white/10 hover:text-white"><LogOut size={20} /></button></nav>
  </>;
}
