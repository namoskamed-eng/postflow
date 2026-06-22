"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./ui";

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export function InstallAppButton({ compact = false }: { compact?: boolean }) {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
    let refreshing = false;
    const refreshOnUpdate = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("controllerchange", refreshOnUpdate);
      void navigator.serviceWorker.register(`${basePath}/sw.js?v=2`).then((registration) => registration.update());
    }
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);
    const capture = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt); };
    const done = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", done);
    return () => { window.removeEventListener("beforeinstallprompt", capture); window.removeEventListener("appinstalled", done); navigator.serviceWorker?.removeEventListener("controllerchange", refreshOnUpdate); };
  }, []);
  if (installed) return null;
  async function install() {
    if (prompt) {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === "accepted") setPrompt(null);
      return;
    }
    alert("No iPhone: toque em Compartilhar e depois em ‘Adicionar à Tela de Início’. No Android: abra o menu do navegador e escolha ‘Instalar app’.");
  }
  return <Button variant="secondary" onClick={install} className={compact ? "h-9 px-3 text-xs" : ""}><Download size={16} />{compact ? "Instalar" : "Instalar no celular"}</Button>;
}
