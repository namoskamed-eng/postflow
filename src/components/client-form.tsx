"use client";
import { useEffect, useState } from "react";
import type { Client, ClientInput } from "@/types";
import { Button, Field, inputClass } from "./ui";

const colors=["#E36B3A","#6D5DFB","#168C74","#E04E72","#2583D8","#D7A116","#31312F"];
export function ClientForm({ client, onSave, onCancel }: { client?:Client|null; onSave:(v:ClientInput)=>Promise<void>; onCancel:()=>void }) {
  const [form,setForm]=useState<ClientInput>({name:"",handle:"",color:colors[0],notes:"",notion_client_page_id:"",notion_posts_page_id:"",notion_archive_page_id:"",hidden_in_app:false}); const [saving,setSaving]=useState(false);
  useEffect(()=>{setForm(client?{name:client.name,handle:client.handle,color:client.color,notes:client.notes,notion_client_page_id:client.notion_client_page_id||"",notion_posts_page_id:client.notion_posts_page_id||"",notion_archive_page_id:client.notion_archive_page_id||"",hidden_in_app:false}:{name:"",handle:"",color:colors[0],notes:"",notion_client_page_id:"",notion_posts_page_id:"",notion_archive_page_id:"",hidden_in_app:false})},[client]);
  async function submit(e:React.FormEvent){e.preventDefault();setSaving(true);try{await onSave(form)}finally{setSaving(false)}}
  return <form onSubmit={submit} className="space-y-5"><Field label="Nome do cliente"><input autoFocus required className={inputClass} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Ex.: Café Aurora"/></Field><Field label="Usuário / perfil"><input className={inputClass} value={form.handle} onChange={e=>setForm({...form,handle:e.target.value})} placeholder="@perfil"/></Field><Field label="Cor de identificação"><div className="flex flex-wrap gap-3">{colors.map(c=><button type="button" aria-label={`Selecionar cor ${c}`} key={c} onClick={()=>setForm({...form,color:c})} className="size-9 rounded-full transition" style={{background:c,outline:form.color===c?"3px solid #1D1D1B":"none",outlineOffset:3}}/>)}</div></Field><Field label="Observações"><textarea className={`${inputClass} min-h-24 py-3`} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Informações úteis sobre o cliente..."/></Field><div className="flex justify-end gap-3 pt-2"><Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button><Button disabled={saving}>{saving?"Salvando...":"Salvar cliente"}</Button></div></form>;
}
