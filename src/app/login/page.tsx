"use client";
import { useEffect, useState } from "react";
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Sparkles } from "lucide-react";
import { Button, Field, inputClass } from "@/components/ui";
import { hasSupabase, setRememberPreference, supabase } from "@/lib/supabase";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void supabase?.auth.getSession().then(({ data }) => { if (data.session) window.location.replace(`${basePath}/`); });
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase) return setError("O Supabase ainda não foi configurado.");
    setLoading(true);
    setError("");
    setRememberPreference(remember);
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError) {
      setError(loginError.message === "Invalid login credentials" ? "E-mail ou senha incorretos." : loginError.message);
      setLoading(false);
      return;
    }
    window.location.replace(`${basePath}/`);
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#F1F1ED] px-4 py-10">
      <div className="w-full max-w-md animate-rise">
        <div className="mb-7 flex items-center justify-center gap-3">
          <div className="grid size-12 place-items-center rounded-2xl bg-[#1D1D1B] text-[#D9FF57]"><Sparkles size={24} /></div>
          <div><h1 className="font-display text-2xl font-extrabold">PostFlow</h1><p className="text-xs text-[#77776F]">seu conteúdo, no ritmo certo</p></div>
        </div>
        <form onSubmit={submit} className="rounded-[28px] border border-[#E0E0DA] bg-white p-6 shadow-xl shadow-black/5 sm:p-8">
          <div className="mb-6 grid size-12 place-items-center rounded-2xl bg-[#ECF5C9]"><LockKeyhole size={22} /></div>
          <h2 className="font-display text-2xl font-extrabold">Entrar</h2>
          <p className="mb-7 mt-1 text-sm text-[#77776F]">Acesse seus clientes e postagens.</p>
          <div className="space-y-5">
            <Field label="E-mail"><input className={inputClass} type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="seu@email.com" /></Field>
            <Field label="Senha"><div className="relative"><input className={`${inputClass} pr-11`} type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Sua senha" /><button type="button" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 rounded-lg p-1 text-[#77776F]"><span>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</span></button></div></Field>
            <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="size-4 accent-[#1D1D1B]" />Manter conectado neste dispositivo</label>
            {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <Button className="w-full" disabled={loading || !hasSupabase}>{loading ? <><LoaderCircle className="animate-spin" size={18} />Entrando...</> : "Entrar no PostFlow"}</Button>
          </div>
        </form>
      </div>
    </main>
  );
}
