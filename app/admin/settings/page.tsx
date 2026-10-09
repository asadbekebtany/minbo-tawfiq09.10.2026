"use client";
import { useEffect, useState } from "react";
import { Check, Loader2, Save } from "lucide-react";
import { PERMISSIONS, getAdminRoleLabel, type AdminRoleType } from "@/lib/permissions";
import { DEFAULT_SITE_SETTINGS, type SiteSettings } from "@/lib/site-settings-constants";

const SETTINGS_FIELDS: [keyof SiteSettings, string, string][] = [
  ["siteName", "Sayt nomi (brend)", "text"],
  ["siteShortName", "Qisqa nom", "text"],
  ["tagline", "Tagline", "text"],
  ["email", "Email", "email"],
  ["phone", "Telefon", "text"],
  ["address", "Manzil", "text"],
  ["freeDeliveryMin", "Bepul yetkazish summasi", "number"],
  ["commissionPercent", "Komissiya (%)", "number"],
];

export default function AdminSettingsPage(){
 const [site,setSite]=useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [saved,setSaved]=useState(false);
 const [error,setError]=useState<string | null>(null);

 useEffect(()=>{
  fetch("/api/site-settings",{cache:"no-store"})
   .then(async (r)=>{
    const d = await r.json() as { settings?: SiteSettings; error?: string };
    if(!r.ok) throw new Error(d.error ?? "Sozlamalarni yuklab bo‘lmadi");
    if(d.settings) setSite(d.settings);
   })
   .catch((e: unknown)=>setError(e instanceof Error ? e.message : "Sozlamalarni yuklab bo‘lmadi"))
   .finally(()=>setLoading(false));
 },[]);

 const save=async()=>{
  if(!site.siteName.trim()){setError("Sayt nomi majburiy");return;}
  if(!site.email.trim()){setError("Email majburiy");return;}
  setSaving(true);
  setError(null);
  try {
   const r=await fetch("/api/site-settings",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(site)});
   const d = await r.json() as { settings?: SiteSettings; error?: string };
   if(!r.ok) throw new Error(d.error ?? "Saqlashda xato yuz berdi");
   if(d.settings) setSite(d.settings);
   setSaved(true);
   setTimeout(()=>setSaved(false),1800);
  } catch (e: unknown) {
   setError(e instanceof Error ? e.message : "Saqlashda xato yuz berdi");
  } finally {
   setSaving(false);
  }
 };

 const roles=Object.keys(PERMISSIONS) as AdminRoleType[];
 if(loading)return <div className="grid min-h-[50vh] place-items-center"><Loader2 className="animate-spin text-[#002d21]"/></div>;
 const fields = SETTINGS_FIELDS;
 return <div className="mx-auto max-w-5xl space-y-6"><div><h1 className="text-2xl font-black text-[#002d21]">Sayt sozlamalari</h1><p className="text-sm text-gray-500">Brend nomi va umumiy sozlamalar database (Prisma) orqali saqlanadi.</p></div>
  {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
  <section className="rounded-2xl border border-[#dce5df] bg-white p-6 shadow-sm"><h2 className="mb-4 font-black text-[#002d21]">Umumiy sozlamalar</h2><div className="grid gap-4 md:grid-cols-2">{fields.map(([key,label,type])=><label key={key} className="text-sm font-semibold text-gray-700">{label}<input type={type} value={String(site[key])} onChange={e=>setSite({...site,[key]:type==='number'?Number(e.target.value):e.target.value})} className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-[#f5b51b] focus:ring-2 focus:ring-[#f5b51b]/20"/></label>)}</div><div className="mt-4 flex gap-4"><label className="text-sm font-semibold">Asosiy rang<input type="color" value={site.primaryColor} onChange={e=>setSite({...site,primaryColor:e.target.value})} className="ml-2 h-10 w-14 align-middle"/></label><label className="text-sm font-semibold">Aksent rang<input type="color" value={site.accentColor} onChange={e=>setSite({...site,accentColor:e.target.value})} className="ml-2 h-10 w-14 align-middle"/></label></div><button onClick={()=>void save()} disabled={saving} className="mt-5 flex items-center gap-2 rounded-xl bg-gradient-to-b from-[#f5b51b] to-[#d99a0a] px-5 py-2.5 font-bold text-[#002d21] disabled:opacity-60">{saved?<Check size={16}/>:<Save size={16}/>} {saving?'Saqlanmoqda...':saved?'Saqlandi':'Saqlash'}</button></section>
  <section className="rounded-2xl border border-[#dce5df] bg-white p-6 shadow-sm"><h2 className="mb-4 font-black text-[#002d21]">Admin role ruxsatlari</h2><div className="space-y-3">{roles.map(role=><div key={role} className="grid gap-2 rounded-xl bg-[#f6f8f5] p-3 md:grid-cols-[180px_1fr]"><strong className="text-sm text-[#002d21]">{getAdminRoleLabel(role)}</strong><div className="flex flex-wrap gap-1">{PERMISSIONS[role].map(p=><span key={p} className="rounded-full bg-white px-2 py-1 text-[10px] text-gray-600 ring-1 ring-gray-200">{p}</span>)}</div></div>)}</div></section>
 </div>
}
