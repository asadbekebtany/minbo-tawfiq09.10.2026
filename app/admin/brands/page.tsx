"use client";
import { useCallback, useEffect, useState } from "react";
import { Check, Edit2, Loader2, Plus, RefreshCcw, Search, Trash2, X } from "lucide-react";

type Brand = { id:string; name:string; slug:string; country:string; logo:string; isActive:boolean; sortOrder:number; count:number };
type Form = Omit<Brand,"id"|"count">;
const blank: Form = { name:"", slug:"", country:"", logo:"", isActive:true, sortOrder:0 };

export default function AdminBrandsPage(){
 const [brands,setBrands]=useState<Brand[]>([]),[query,setQuery]=useState(""),[loading,setLoading]=useState(true),[editing,setEditing]=useState<string|null>(null),[adding,setAdding]=useState(false),[form,setForm]=useState<Form>(blank),[message,setMessage]=useState("");
 const load=useCallback(async()=>{setLoading(true);try{const r=await fetch("/api/brands",{cache:"no-store"});const d=await r.json();setBrands(d.brands||[])}finally{setLoading(false)}},[]);
 useEffect(()=>{const timer=window.setTimeout(()=>{void load()},0);return()=>window.clearTimeout(timer)},[load]);
 const start=(b:Brand)=>{setEditing(b.id);setForm({name:b.name,slug:b.slug,country:b.country,logo:b.logo,isActive:b.isActive,sortOrder:b.sortOrder})};
 const save=async()=>{const url=editing?`/api/brands/${editing}`:"/api/brands";const r=await fetch(url,{method:editing?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});const d=await r.json();if(!r.ok){setMessage(d.error||"Saqlab bo‘lmadi");return}setEditing(null);setAdding(false);setForm(blank);setMessage("Saqlandi");await load()};
 const toggle=async(b:Brand)=>{await fetch(`/api/brands/${b.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({isActive:!b.isActive})});await load()};
 const remove=async(id:string)=>{if(!confirm("Brend o‘chirilsinmi?"))return;await fetch(`/api/brands/${id}`,{method:"DELETE"});await load()};
 const filtered=brands.filter(b=>b.name.toLowerCase().includes(query.toLowerCase()));
 return <div className="mx-auto max-w-6xl space-y-5">
  <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-black text-[#002d21]">Brendlar</h1><p className="text-sm text-gray-500">Brendlar API va doimiy JSON storage orqali boshqariladi.</p></div><button onClick={()=>{setAdding(true);setEditing(null);setForm({...blank,sortOrder:brands.length+1})}} className="flex items-center gap-2 rounded-xl bg-[#002d21] px-4 py-2.5 text-sm font-bold text-[#f5b51b]"><Plus size={16}/>Yangi brend</button></div>
  <div className="flex gap-2 rounded-2xl border border-[#dce5df] bg-white p-3 shadow-sm"><Search size={18} className="mt-2 text-gray-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Brend qidirish..." className="flex-1 outline-none"/><button onClick={()=>void load()} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"><RefreshCcw size={16}/></button></div>
  {message?<div className="rounded-xl border border-[#f5b51b]/35 bg-[#fff8de] px-4 py-2 text-sm text-[#6c5100]">{message}</div>:null}
  {(adding||editing)?<div className="rounded-2xl border border-[#f5b51b]/35 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><h2 className="font-black text-[#002d21]">{editing?"Brendni tahrirlash":"Yangi brend"}</h2><button onClick={()=>{setAdding(false);setEditing(null)}}><X size={18}/></button></div><div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
   <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Nomi" className="rounded-xl border px-3 py-2.5"/>
   <input value={form.slug} onChange={e=>setForm({...form,slug:e.target.value})} placeholder="slug" className="rounded-xl border px-3 py-2.5"/>
   <input value={form.country} onChange={e=>setForm({...form,country:e.target.value})} placeholder="Mamlakat" className="rounded-xl border px-3 py-2.5"/>
   <input value={form.logo} onChange={e=>setForm({...form,logo:e.target.value})} placeholder="Logo harfi" className="rounded-xl border px-3 py-2.5"/>
  </div><button onClick={()=>void save()} className="mt-4 flex items-center gap-2 rounded-xl bg-gradient-to-b from-[#f5b51b] to-[#d99a0a] px-5 py-2.5 font-bold text-[#002d21]"><Check size={16}/>Saqlash</button></div>:null}
  {loading?<div className="grid place-items-center py-20"><Loader2 className="animate-spin text-[#002d21]"/></div>:<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{filtered.map(b=><div key={b.id} className={`rounded-2xl border bg-white p-4 shadow-sm ${b.isActive?"border-[#dfe8e2]":"opacity-55"}`}><div className="flex items-center gap-3"><div className="grid h-13 w-13 place-items-center rounded-xl bg-[#002d21] text-xl font-black text-[#f5b51b]">{b.logo||b.name[0]}</div><div className="min-w-0 flex-1"><p className="font-bold text-[#18281f]">{b.name}</p><p className="text-xs text-gray-500">{b.country} · {b.count} mahsulot</p><p className="text-[10px] text-gray-400">/{b.slug}</p></div><div className="flex flex-col gap-1"><button onClick={()=>start(b)} className="rounded-lg p-2 text-gray-500 hover:bg-[#f5b51b]/15"><Edit2 size={14}/></button><button onClick={()=>void toggle(b)} className={`rounded-lg p-2 text-xs font-black ${b.isActive?"text-green-600":"text-gray-400"}`}>{b.isActive?"●":"○"}</button><button onClick={()=>void remove(b.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><Trash2 size={14}/></button></div></div></div>)}</div>}
 </div>
}
