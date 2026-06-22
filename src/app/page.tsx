"use client";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { Sidebar, type View } from "@/components/sidebar";
import { PostsView } from "@/components/posts-view";
import { ClientsView } from "@/components/clients-view";
import { Modal } from "@/components/ui";
import { ClientForm } from "@/components/client-form";
import { PostForm } from "@/components/post-form";
import { PostDetail } from "@/components/post-detail";
import { deleteClient, deletePost, deletePostImage, getClients, getPosts, saveClient, savePost, uploadPostImages } from "@/lib/data";
import { hasSupabase, supabase } from "@/lib/supabase";
import type { Client, ClientInput, Post, PostInput } from "@/types";

const basePath=process.env.NEXT_PUBLIC_BASE_PATH||"";

export default function Home(){
 const [view,setView]=useState<View>("posts");const [clients,setClients]=useState<Client[]>([]);const [posts,setPosts]=useState<Post[]>([]);const [loading,setLoading]=useState(true);const [syncing,setSyncing]=useState(false);const [error,setError]=useState("");const [clientModal,setClientModal]=useState(false);const [postModal,setPostModal]=useState(false);const [editingClient,setEditingClient]=useState<Client|null>(null);const [editingPost,setEditingPost]=useState<Post|null>(null);const [detail,setDetail]=useState<Post|null>(null);
 async function load(){try{setError("");const [c,p]=await Promise.all([getClients(),getPosts()]);setClients(c);setPosts(p)}catch(e){setError(e instanceof Error?e.message:"Não foi possível carregar os dados.")}finally{setLoading(false)}}
 useEffect(()=>{void (async()=>{if(hasSupabase){const {data}=await supabase!.auth.getSession();if(!data.session){window.location.replace(`${basePath}/login`);return}try{await supabase!.functions.invoke("clients",{body:{action:"sync"}})}catch{}}await load()})()},[]);
 const openClient=(c?:Client)=>{setEditingClient(c||null);setClientModal(true)};const openPost=(p?:Post)=>{setEditingPost(p||null);setPostModal(true)};
 async function handleSyncClients(){setSyncing(true);try{const {data,error:syncError}=await supabase!.functions.invoke("clients",{body:{action:"sync"}});if(syncError)throw syncError;await load();alert(`Clientes atualizados. ${data?.created||0} novo(s) encontrado(s).`)}catch(e){alert(e instanceof Error?e.message:"Não foi possível atualizar os clientes.")}finally{setSyncing(false)}}
 async function handleClient(input:ClientInput){
  if(!hasSupabase){await saveClient(input,editingClient?.id);setClientModal(false);await load();return}
  try{
   const {error:clientError}=await supabase!.functions.invoke("clients",{body:editingClient?{action:"update",clientId:editingClient.id,input}:{action:"create",input}});
   if(clientError)throw clientError;
   setClientModal(false);await load();
  }catch(e){alert(e instanceof Error?e.message:"Não foi possível sincronizar o cliente.")}
 }
 async function handlePost(input:PostInput,files:File[]){
  if(input.status==="Publicado"){
   if(!hasSupabase){alert("O arquivamento precisa do Supabase configurado. O post não foi alterado.");return}
   if(!confirm("Ao continuar, o post será arquivado no Notion e removido do PostFlow junto com todas as imagens. Deseja continuar?"))return;
  }
  try{
   const saved=await savePost(input,editingPost?.id);
   if(files.length)await uploadPostImages(saved.id,files);
   if(input.status==="Publicado"){
    const {error:archiveError}=await supabase!.functions.invoke("archive-post",{body:{postId:saved.id,post:input}});
    if(archiveError)throw archiveError;
    alert("Post arquivado no Notion e removido do PostFlow com sucesso.");
   }
   setPostModal(false);setDetail(null);await load();
  }catch(e){alert(e instanceof Error?e.message:"Não foi possível salvar o post.");await load()}
 }
 async function handleDeleteClient(c:Client){if(confirm(`Remover ${c.name} do PostFlow e excluir as postagens ativas? O histórico no Notion será preservado.`)){await deleteClient(c.id);await load()}}
 async function handleDeletePost(p:Post){if(confirm(`Excluir a postagem “${p.title}”?`)){await deletePost(p.id);setDetail(null);await load()}}
 async function handleDeleteImage(p:Post,imageId:string){if(confirm("Remover esta imagem?")){await deletePostImage(p.id,imageId);await load();setDetail(d=>d?{...d,images:d.images.filter(i=>i.id!==imageId)}:null)}}
 async function handleLogout(){await supabase?.auth.signOut();window.location.replace(`${basePath}/login`)}
 return <div className="min-h-screen"><Sidebar view={view} setView={v=>{setView(v);setDetail(null)}} onLogout={handleLogout}/><main className="pb-28 lg:ml-64 lg:pb-12"><div className="mx-auto max-w-7xl px-4 py-7 sm:px-7 lg:px-10 lg:py-10">{!hasSupabase&&<div className="mb-6 flex items-start gap-3 rounded-2xl bg-[#ECF5C9] px-4 py-3 text-sm"><Sparkles className="mt-0.5 shrink-0" size={18}/><p><strong>Modo de demonstração ativo.</strong> Seus dados ficam neste navegador. Configure o Supabase para sincronizar entre celular e computador.</p></div>}{error&&<div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}{loading?<div className="grid min-h-96 place-items-center"><div className="size-8 animate-spin rounded-full border-2 border-[#D9FF57] border-t-black"/></div>:view==="posts"?<PostsView posts={posts} clients={clients} onNew={()=>openPost()} onOpen={setDetail}/>:<ClientsView clients={clients} posts={posts} syncing={syncing} onSync={handleSyncClients} onNew={()=>openClient()} onEdit={openClient} onDelete={handleDeleteClient}/>}</div></main><Modal open={clientModal} onClose={()=>setClientModal(false)} title={editingClient?"Editar cliente":"Novo cliente"}><ClientForm client={editingClient} onSave={handleClient} onCancel={()=>setClientModal(false)}/></Modal><Modal open={postModal} onClose={()=>setPostModal(false)} title={editingPost?"Editar postagem":"Nova postagem"} wide><PostForm post={editingPost} clients={clients} onSave={handlePost} onCancel={()=>setPostModal(false)}/></Modal>{detail&&<PostDetail post={posts.find(p=>p.id===detail.id)||detail} client={clients.find(c=>c.id===detail.client_id)} onClose={()=>setDetail(null)} onEdit={()=>openPost(detail)} onDelete={()=>handleDeletePost(detail)} onDeleteImage={id=>handleDeleteImage(detail,id)}/>}</div>
}
