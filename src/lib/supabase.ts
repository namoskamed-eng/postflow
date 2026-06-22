import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const hasSupabase = Boolean(url && key && !url.includes("seu-projeto"));
const rememberKey = "postflow_remember_me";

const hybridStorage = typeof window === "undefined" ? undefined : {
  getItem(keyName: string) {
    return (localStorage.getItem(rememberKey) === "true" ? localStorage : sessionStorage).getItem(keyName);
  },
  setItem(keyName: string, value: string) {
    (localStorage.getItem(rememberKey) === "true" ? localStorage : sessionStorage).setItem(keyName, value);
  },
  removeItem(keyName: string) {
    localStorage.removeItem(keyName);
    sessionStorage.removeItem(keyName);
  },
};

export function setRememberPreference(remember: boolean) {
  if (typeof window === "undefined") return;
  if (remember) localStorage.setItem(rememberKey, "true");
  else localStorage.removeItem(rememberKey);
}

export const supabase = hasSupabase ? createClient(url!, key!, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, ...(hybridStorage ? { storage: hybridStorage } : {}) },
}) : null;
