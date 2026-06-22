"use client";

import { CalendarDays, Columns3, FileText, House, LayoutList, LogOut, Sparkles, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export type View = "today" | "posts" | "calendar" | "board" | "clients" | "templates";
const items = [
  { id: "today" as const, label: "Hoje", icon: House },
  { id: "posts" as const, label: "Postagens", icon: LayoutList },
  { id: "calendar" as const, label: "Calendário", icon: CalendarDays },
  { id: "board" as const, label: "Quadro", icon: Columns3 },
  { id: "clients" as const, label: "Clientes", icon: Users },
  { id: "templates" as const, label: "Modelos", icon: FileText },
];

export function Sidebar({ view, setView, onLogout }: { view: View; setView: (view: View) => void; onLogout: () => void }) {
  return <>
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-[#E0E0DA] bg-[#F1F1ED] p-5 lg:flex">
      <div className="flex items-center gap-3 px-2 py-2"><div className="grid size-10 place-items-center rounded-xl bg-[#1D1D1B] text-[#D9FF57]"><Sparkles size={21} /></div><div><div className="font-display text-xl font-extrabold tracking-tight">PostFlow</div><div className="text-[11px] text-[#7B7B74]">conteúdo em movimento</div></div></div>
      <nav className="mt-8 space-y-1">{items.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setView(id)} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition", view === id ? "bg-white text-black shadow-sm" : "text-[#686862] hover:bg-white/60")}><Icon size={18} />{label}</button>)}</nav>
      <div className="mt-auto"><div className="rounded-2xl bg-[#1D1D1B] p-4 text-white"><CalendarDays className="text-[#D9FF57]" size={22} /><p className="mt-3 text-sm font-bold">Tudo no ritmo certo.</p><p className="mt-1 text-xs leading-relaxed text-white/55">Planeje, aprove e publique sem perder o fio.</p></div><button onClick={onLogout} className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#686862] hover:bg-white"><LogOut size={18} />Sair</button></div>
    </aside>
    <nav className="scrollbar-none fixed inset-x-3 bottom-3 z-40 flex overflow-x-auto rounded-2xl border border-white/80 bg-[#1D1D1B]/95 p-1.5 shadow-xl backdrop-blur lg:hidden">{items.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setView(id)} className={cn("flex min-w-[76px] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[10px] font-bold transition", view === id ? "bg-[#D9FF57] text-black" : "text-white/60")}><Icon size={17} />{label}</button>)}<button onClick={onLogout} className="flex min-w-[64px] flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[10px] font-bold text-white/60"><LogOut size={17} />Sair</button></nav>
  </>;
}
