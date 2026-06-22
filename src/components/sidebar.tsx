"use client";
import { CalendarDays, LayoutDashboard, LogOut, Users, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type View = "posts"|"clients";
export function Sidebar({ view, setView, onLogout }: { view:View; setView:(v:View)=>void; onLogout:()=>void }) {
  const items = [{id:"posts" as const,label:"Postagens",icon:LayoutDashboard},{id:"clients" as const,label:"Clientes",icon:Users}];
  return <>
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-[#E0E0DA] bg-[#F1F1ED] p-5 lg:flex">
      <div className="flex items-center gap-3 px-2 py-2"><div className="grid size-10 place-items-center rounded-xl bg-[#1D1D1B] text-[#D9FF57]"><Sparkles size={21}/></div><div><div className="font-display text-xl font-extrabold tracking-tight">PostFlow</div><div className="text-[11px] text-[#7B7B74]">conteúdo em movimento</div></div></div>
      <nav className="mt-10 space-y-1.5">{items.map(({id,label,icon:Icon})=><button key={id} onClick={()=>setView(id)} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition",view===id?"bg-white text-black shadow-sm":"text-[#686862] hover:bg-white/60")}><Icon size={19}/>{label}</button>)}</nav>
      <div className="mt-auto"><div className="rounded-2xl bg-[#1D1D1B] p-4 text-white"><CalendarDays className="text-[#D9FF57]" size={22}/><p className="mt-3 text-sm font-bold">Tudo no ritmo certo.</p><p className="mt-1 text-xs leading-relaxed text-white/55">Planeje, aprove e publique sem perder o fio.</p></div><button onClick={onLogout} className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#686862] hover:bg-white"><LogOut size={18}/>Sair</button></div>
    </aside>
    <nav className="fixed inset-x-3 bottom-3 z-40 flex rounded-2xl border border-white/80 bg-[#1D1D1B]/95 p-1.5 shadow-xl backdrop-blur lg:hidden">{items.map(({id,label,icon:Icon})=><button key={id} onClick={()=>setView(id)} className={cn("flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold transition",view===id?"bg-[#D9FF57] text-black":"text-white/60")}><Icon size={17}/>{label}</button>)}<button onClick={onLogout} className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold text-white/60"><LogOut size={17}/>Sair</button></nav>
  </>;
}
