"use client";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Button({ className, variant="primary", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary"|"secondary"|"ghost"|"danger" }) {
  const styles = { primary:"bg-[#1D1D1B] text-white hover:bg-black", secondary:"bg-white border border-[#DEDED8] hover:border-[#A8A8A1]", ghost:"hover:bg-[#EEEEEA]", danger:"bg-[#FFF0ED] text-[#B43B27] hover:bg-[#FFE2DC]" };
  return <button className={cn("inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition disabled:opacity-50", styles[variant], className)} {...props}/>;
}

export function Field({ label, children, className }: { label:string; children:React.ReactNode; className?:string }) {
  return <label className={cn("block",className)}><span className="mb-2 block text-xs font-bold uppercase tracking-[.08em] text-[#77776F]">{label}</span>{children}</label>;
}
export const inputClass = "h-11 w-full rounded-xl border border-[#DEDED8] bg-white px-3.5 text-sm outline-none transition placeholder:text-[#AAA9A2] focus:border-[#1D1D1B] focus:ring-2 focus:ring-[#D9FF57]/60";

export function Modal({ open, onClose, title, children, wide=false }: { open:boolean; onClose:()=>void; title:string; children:React.ReactNode; wide?:boolean }) {
  if(!open) return null;
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-6" onMouseDown={e => e.target===e.currentTarget && onClose()}>
    <div className={cn("max-h-[94vh] w-full overflow-y-auto rounded-t-[28px] bg-[#F7F7F4] shadow-2xl sm:rounded-[28px]",wide?"max-w-3xl":"max-w-xl")}>
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E5E5DF] bg-[#F7F7F4]/95 px-5 py-4 backdrop-blur sm:px-7">
        <h2 className="font-display text-xl font-extrabold">{title}</h2><button aria-label="Fechar" onClick={onClose} className="rounded-full p-2 hover:bg-[#E9E9E4]"><X size={20}/></button>
      </div><div className="p-5 sm:p-7">{children}</div>
    </div>
  </div>;
}

export function EmptyState({ icon, title, text, action }: { icon:React.ReactNode; title:string; text:string; action?:React.ReactNode }) {
  return <div className="flex min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-[#CECEC7] bg-white/45 p-8 text-center"><div className="mb-4 rounded-2xl bg-[#ECF5C9] p-4">{icon}</div><h3 className="font-display text-lg font-bold">{title}</h3><p className="mt-1 max-w-sm text-sm text-[#77776F]">{text}</p>{action&&<div className="mt-5">{action}</div>}</div>;
}
