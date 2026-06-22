export const PLATFORMS = ["Instagram", "TikTok", "YouTube Shorts", "Facebook", "LinkedIn", "Outro"] as const;
export const POST_TYPES = ["Reels", "Carrossel", "Estático", "Story", "Outro"] as const;
export const STATUSES = ["Ideia", "Roteiro", "Arte", "Aprovação", "Agendado", "Publicado"] as const;

export type Platform = (typeof PLATFORMS)[number];
export type PostType = (typeof POST_TYPES)[number];
export type PostStatus = (typeof STATUSES)[number];

export interface Client {
  id: string;
  name: string;
  handle: string;
  color: string;
  notes: string;
  notion_client_page_id: string;
  notion_posts_page_id: string;
  notion_active_page_id: string;
  notion_archive_page_id: string;
  hidden_in_app: boolean;
  created_at: string;
}

export interface PostImage {
  id: string;
  post_id: string;
  url: string;
  name: string;
}

export interface Post {
  id: string;
  client_id: string;
  title: string;
  planned_date: string;
  platform: Platform;
  type: PostType;
  status: PostStatus;
  caption: string;
  content: string;
  notes: string;
  created_at: string;
  images: PostImage[];
}

export type ClientInput = Omit<Client, "id" | "created_at">;
export type PostInput = Omit<Post, "id" | "created_at" | "images">;
