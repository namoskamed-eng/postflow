"use client";

import { AlertTriangle, Bell, CalendarCheck, CalendarClock, Plus, Sunrise } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Client, Post } from "@/types";
import { Button, EmptyState } from "./ui";
import { formatDate } from "@/lib/utils";
import { InstallAppButton } from "./install-app";

function localDate(offset = 0) { const date = new Date(); date.setDate(date.getDate() + offset); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }

export function DashboardView({ posts, clients, onOpen, onNew, onCalendar }: { posts: Post[]; clients: Client[]; onOpen: (post: Post) => void; onNew: () => void; onCalendar: () => void }) {
  const [permission, setPermission] = useState(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  const today = localDate();
  const tomorrow = localDate(1);
  const weekEnd = localDate(7);
  const groups = useMemo(() => ({
    late: posts.filter((post) => post.planned_date && post.planned_date < today),
    today: posts.filter((post) => post.planned_date === today),
    tomorrow: posts.filter((post) => post.planned_date === tomorrow),
    week: posts.filter((post) => post.planned_date > tomorrow && post.planned_date <= weekEnd),
  }), [posts, today, tomorrow, weekEnd]);
  useEffect(() => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted" || (!groups.late.length && !groups.today.length)) return;
    const key = `postflow_notification_${today}`;
    if (localStorage.getItem(key)) return;
    new Notification("PostFlow", { body: `${groups.today.length} post(s) para hoje e ${groups.late.length} atrasado(s).`, icon: `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/icon.svg` });
    localStorage.setItem(key, "1");
  }, [groups.late.length, groups.today.length, today]);
  async function enableNotifications() { const result = await Notification.requestPermission(); setPermission(result); if (result === "granted") new Notification("PostFlow", { body: "Alertas ativados com sucesso." }); }
  const cards = [{ label: "Atrasados", value: groups.late.length, icon: AlertTriangle, color: "bg-[#FFF0ED] text-[#B43B27]" }, { label: "Para hoje", value: groups.today.length, icon: CalendarCheck, color: "bg-[#E8F6CF] text-[#477513]" }, { label: "Amanhã", value: groups.tomorrow.length, icon: Sunrise, color: "bg-[#FFF1D6] text-[#956111]" }, { label: "Próximos 7 dias", value: groups.week.length, icon: CalendarClock, color: "bg-[#E7F1FF] text-[#2163A5]" }];
  function Section({ title, items }: { title: string; items: Post[] }) { if (!items.length) return null; return <section className="mb-7"><h2 className="font-display mb-3 text-xl font-extrabold">{title}</h2><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{items.map((post) => { const client = clients.find((item) => item.id === post.client_id); return <button key={post.id} onClick={() => onOpen(post)} className="rounded-2xl border border-[#E2E2DC] bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-center gap-2 text-xs font-semibold text-[#77776F]"><span className="size-2 rounded-full" style={{ background: client?.color || "#aaa" }} />{client?.name || "Cliente"}</div><h3 className="font-display mt-2 font-extrabold">{post.title}</h3><p className="mt-3 text-xs text-[#77776F]">{formatDate(post.planned_date)} · {post.status}</p></button>; })}</div></section>; }
  return <div><div className="mb-7 flex flex-wrap items-end justify-between gap-3"><div><p className="mb-1 text-sm font-semibold text-[#7A7A73]">Visão da sua rotina</p><h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Hoje</h1></div><div className="flex gap-2"><InstallAppButton compact />{permission === "default" && <Button variant="secondary" onClick={enableNotifications}><Bell size={17} /><span className="hidden sm:inline">Ativar alertas</span></Button>}<Button onClick={onNew} disabled={!clients.length}><Plus size={18} />Novo post</Button></div></div><div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">{cards.map(({ label, value, icon: Icon, color }) => <button onClick={onCalendar} key={label} className="rounded-2xl border border-[#E2E2DC] bg-white p-4 text-left"><div className={`mb-4 grid size-10 place-items-center rounded-xl ${color}`}><Icon size={19} /></div><div className="font-display text-3xl font-extrabold">{value}</div><div className="text-xs font-semibold text-[#77776F]">{label}</div></button>)}</div>{!posts.length ? <EmptyState icon={<CalendarCheck />} title="Tudo em ordem" text="Não há postagens ativas no momento." action={clients.length ? <Button onClick={onNew}><Plus size={18} />Criar postagem</Button> : undefined} /> : <><Section title="Atrasados" items={groups.late} /><Section title="Para hoje" items={groups.today} /><Section title="Amanhã" items={groups.tomorrow} /><Section title="Próximos 7 dias" items={groups.week} /></>}</div>;
}
