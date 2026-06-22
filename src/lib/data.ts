import { supabase } from "./supabase";
import type { Client, ClientInput, Post, PostImage, PostInput } from "@/types";

const CLIENTS_KEY = "postflow_clients";
const POSTS_KEY = "postflow_posts";

const seedClients: Client[] = [
  { id: "c1", name: "Café Aurora", handle: "@cafeaurora", color: "#E36B3A", notes: "", notion_client_page_id: "", notion_posts_page_id: "", notion_archive_page_id: "", hidden_in_app: false, created_at: new Date().toISOString() },
  { id: "c2", name: "Clínica Leve", handle: "@clinicaleve", color: "#6D5DFB", notes: "", notion_client_page_id: "", notion_posts_page_id: "", notion_archive_page_id: "", hidden_in_app: false, created_at: new Date().toISOString() },
];
const seedPosts: Post[] = [
  { id: "p1", client_id: "c1", title: "Bastidores do novo cardápio", planned_date: new Date().toISOString().slice(0,10), platform: "Instagram", type: "Reels", status: "Arte", caption: "Tem novidade sendo preparada por aqui ☕", content: "Cena 1: detalhes do preparo\nCena 2: apresentação dos pratos\nCena 3: convite para conhecer", notes: "Usar trilha leve e cortes rápidos.", created_at: new Date().toISOString(), images: [] },
  { id: "p2", client_id: "c2", title: "5 hábitos para uma rotina mais leve", planned_date: new Date(Date.now()+86400000*3).toISOString().slice(0,10), platform: "Instagram", type: "Carrossel", status: "Aprovação", caption: "Pequenas mudanças, grandes resultados.", content: "Slide 1: 5 hábitos\nSlide 2: comece devagar\nSlide 3: celebre o progresso", notes: "Aguardando retorno da cliente.", created_at: new Date().toISOString(), images: [] },
];

function readLocal<T>(key: string, seed: T): T {
  const value = localStorage.getItem(key);
  if (value) return JSON.parse(value) as T;
  localStorage.setItem(key, JSON.stringify(seed));
  return seed;
}
function writeLocal<T>(key: string, value: T) { localStorage.setItem(key, JSON.stringify(value)); }
function id() { return crypto.randomUUID(); }

export async function getClients(): Promise<Client[]> {
  if (!supabase) return readLocal(CLIENTS_KEY, seedClients);
  const { data, error } = await supabase.from("clients").select("*").eq("hidden_in_app", false).order("name");
  if (error) throw error;
  return data;
}

export async function saveClient(input: ClientInput, clientId?: string): Promise<Client> {
  if (!supabase) {
    const clients = readLocal(CLIENTS_KEY, seedClients);
    const client: Client = { ...input, id: clientId || id(), created_at: clientId ? clients.find(c => c.id === clientId)?.created_at || new Date().toISOString() : new Date().toISOString() };
    writeLocal(CLIENTS_KEY, clientId ? clients.map(c => c.id === clientId ? client : c) : [...clients, client]);
    return client;
  }
  const query = clientId ? supabase.from("clients").update(input).eq("id", clientId) : supabase.from("clients").insert(input);
  const { data, error } = await query.select().single();
  if (error) throw error;
  return data;
}

export async function deleteClient(clientId: string) {
  if (!supabase) {
    writeLocal(CLIENTS_KEY, readLocal<Client[]>(CLIENTS_KEY, seedClients).filter(c => c.id !== clientId));
    writeLocal(POSTS_KEY, readLocal<Post[]>(POSTS_KEY, seedPosts).filter(p => p.client_id !== clientId));
    return;
  }
  const { error: postsError } = await supabase.from("posts").delete().eq("client_id", clientId);
  if (postsError) throw postsError;
  const { error } = await supabase.from("clients").update({ hidden_in_app: true }).eq("id", clientId);
  if (error) throw error;
}

export async function getPosts(): Promise<Post[]> {
  if (!supabase) return readLocal(POSTS_KEY, seedPosts);
  const { data, error } = await supabase.from("posts").select("*, images:post_images(*)").order("planned_date");
  if (error) throw error;
  return data as Post[];
}

export async function savePost(input: PostInput, postId?: string): Promise<Post> {
  if (!supabase) {
    const posts = readLocal(POSTS_KEY, seedPosts);
    const old = posts.find(p => p.id === postId);
    const post: Post = { ...input, id: postId || id(), created_at: old?.created_at || new Date().toISOString(), images: old?.images || [] };
    writeLocal(POSTS_KEY, postId ? posts.map(p => p.id === postId ? post : p) : [...posts, post]);
    return post;
  }
  const query = postId ? supabase.from("posts").update(input).eq("id", postId) : supabase.from("posts").insert(input);
  const { data, error } = await query.select().single();
  if (error) throw error;
  return { ...data, images: [] } as Post;
}

export async function deletePost(postId: string) {
  if (!supabase) {
    writeLocal(POSTS_KEY, readLocal<Post[]>(POSTS_KEY, seedPosts).filter(p => p.id !== postId));
    return;
  }
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) throw error;
}

export async function uploadPostImages(postId: string, files: File[]): Promise<PostImage[]> {
  if (!supabase) {
    const images = await Promise.all(files.map(file => new Promise<PostImage>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ id: id(), post_id: postId, url: String(reader.result), name: file.name });
      reader.onerror = reject;
      reader.readAsDataURL(file);
    })));
    const posts = readLocal<Post[]>(POSTS_KEY, seedPosts).map(p => p.id === postId ? { ...p, images: [...p.images, ...images] } : p);
    writeLocal(POSTS_KEY, posts);
    return images;
  }
  const uploaded: PostImage[] = [];
  for (const file of files) {
    const path = `${postId}/${id()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    const { error } = await supabase.storage.from("post-images").upload(path, file);
    if (error) throw error;
    const { data: publicData } = supabase.storage.from("post-images").getPublicUrl(path);
    const { data, error: dbError } = await supabase.from("post_images").insert({ post_id: postId, url: publicData.publicUrl, name: file.name }).select().single();
    if (dbError) throw dbError;
    uploaded.push(data);
  }
  return uploaded;
}

export async function deletePostImage(postId: string, imageId: string) {
  if (!supabase) {
    const posts = readLocal<Post[]>(POSTS_KEY, seedPosts).map(p => p.id === postId ? { ...p, images: p.images.filter(i => i.id !== imageId) } : p);
    writeLocal(POSTS_KEY, posts);
    return;
  }
  const { error } = await supabase.from("post_images").delete().eq("id", imageId);
  if (error) throw error;
}
