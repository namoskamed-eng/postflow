import type { Metadata, Viewport } from "next";
import "./globals.css";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const metadata: Metadata = { title: "PostFlow", description: "Organize o conteúdo dos seus clientes", manifest: `${basePath}/manifest.webmanifest`, icons: { icon: `${basePath}/icon.svg`, apple: `${basePath}/icon.svg` } };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#F7F7F4" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
