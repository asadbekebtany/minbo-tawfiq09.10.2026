"use client";

import { useEffect, useRef, useState } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Upload,
  ImageOff,
  Loader2,
} from "lucide-react";
import { HeroBannerView } from "@/components/home/hero-banner-view";

type Slide = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  discountText: string;
  buttonText: string;
  buttonUrl: string;
  imageUrl: string;
  sortOrder: number;
  isActive: boolean;
};

type FormState = Omit<Slide, "id"> & { id: string | null };

const BLANK: FormState = {
  id: null,
  title: "",
  subtitle: "",
  description: "",
  discountText: "",
  buttonText: "Hozir xarid qilish",
  buttonUrl: "/catalog",
  imageUrl: "",
  sortOrder: 0,
  isActive: true,
};

export default function AdminHeroSlidesPage() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "edit">("list");
  const [form, setForm] = useState<FormState>(BLANK);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hero-slides?all=1", { cache: "no-store" });
      const data = await res.json();
      setSlides(data.slides ?? []);
    } catch {
      setError("Slaydlarni yuklab bo'lmadi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const openNew = () => {
    const maxOrder = slides.reduce((m, s) => Math.max(m, s.sortOrder), 0);
    setForm({ ...BLANK, sortOrder: maxOrder + 1 });
    setError(null);
    setView("edit");
  };

  const openEdit = (s: Slide) => {
    setForm({ ...s });
    setError(null);
    setView("edit");
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Rasmni yuklab bo'lmadi");
        return;
      }
      set("imageUrl", data.url);
    } catch {
      setError("Rasmni yuklab bo'lmadi");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.title.trim()) {
      setError("Sarlavha kiritilishi shart");
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      title: form.title,
      subtitle: form.subtitle,
      description: form.description,
      discountText: form.discountText,
      buttonText: form.buttonText,
      buttonUrl: form.buttonUrl,
      imageUrl: form.imageUrl,
      sortOrder: form.sortOrder,
      isActive: form.isActive,
    };
    try {
      const res = form.id
        ? await fetch(`/api/hero-slides/${form.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/hero-slides", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Saqlab bo'lmadi");
        return;
      }
      await load();
      setView("list");
    } catch {
      setError("Saqlab bo'lmadi");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (s: Slide) => {
    await fetch(`/api/hero-slides/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !s.isActive }),
    });
    load();
  };

  const remove = async (id: string) => {
    await fetch(`/api/hero-slides/${id}`, { method: "DELETE" });
    setDeletingId(null);
    load();
  };

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= slides.length) return;
    const reordered = [...slides];
    const [item] = reordered.splice(index, 1);
    reordered.splice(target, 0, item);
    setSlides(reordered);
    await fetch("/api/hero-slides/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: reordered.map((s) => s.id) }),
    });
    load();
  };

  // ---------------------------------------------------------------- EDIT VIEW
  if (view === "edit") {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5 items-start">
          {/* Live preview */}
          <div className="lg:sticky lg:top-6">
            <p className="text-sm font-semibold text-gray-500 mb-2">
              Jonli ko'rinish (preview)
            </p>
            <div className="bg-ikat rounded-2xl p-3 shadow-inner">
              <div className="relative rounded-2xl overflow-hidden shadow-xl min-h-[340px] bg-[#013024]">
                <HeroBannerView
                  preview
                  data={{
                    title: form.title || "Sarlavha",
                    subtitle: form.subtitle,
                    description: form.description,
                    discountText: form.discountText,
                    buttonText: form.buttonText,
                    buttonUrl: form.buttonUrl,
                    imageUrl: form.imageUrl,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Edit panel */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-base font-black text-gray-900 mb-4">
              Hero slayderni tahrirlash
            </h2>

            {error && (
              <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <div className="space-y-3.5">
              <Field label="Sarlavha">
                <input
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  className={inputCls}
                />
              </Field>

              <Field label="Kichik sarlavha">
                <input
                  value={form.subtitle}
                  onChange={(e) => set("subtitle", e.target.value)}
                  className={inputCls}
                />
              </Field>

              <Field label="Tavsif">
                <textarea
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  rows={3}
                  className={`${inputCls} resize-none`}
                />
              </Field>

              <Field label="Chegirma matni">
                <input
                  value={form.discountText}
                  onChange={(e) => set("discountText", e.target.value)}
                  placeholder="-15% chegirma"
                  className={inputCls}
                />
              </Field>

              <Field label="Tugma matni">
                <input
                  value={form.buttonText}
                  onChange={(e) => set("buttonText", e.target.value)}
                  className={inputCls}
                />
              </Field>

              <Field label="Tugma havolasi">
                <input
                  value={form.buttonUrl}
                  onChange={(e) => set("buttonUrl", e.target.value)}
                  placeholder="/catalog/disklar"
                  className={inputCls}
                />
              </Field>

              <Field label="Rasm">
                <div className="flex items-stretch gap-3">
                  <div className="w-24 h-24 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                    {form.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={form.imageUrl}
                        alt="preview"
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <ImageOff size={22} className="text-gray-300" />
                    )}
                  </div>
                  <div className="flex-1 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="flex-1 flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-gray-300 text-gray-500 text-xs hover:border-[#f5b51b] hover:text-[#9a6b00] transition-colors disabled:opacity-60"
                    >
                      {uploading ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Upload size={18} />
                      )}
                      <span className="font-semibold">Rasmni tanlash</span>
                      <span className="text-[10px] text-gray-400">
                        JPG, PNG, WebP
                      </span>
                    </button>
                    {form.imageUrl && (
                      <button
                        type="button"
                        onClick={() => set("imageUrl", "")}
                        className="text-xs text-red-500 font-semibold hover:text-red-600"
                      >
                        O'chirish
                      </button>
                    )}
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUpload(f);
                      e.target.value = "";
                    }}
                  />
                </div>
              </Field>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Tartib raqami">
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => set("sortOrder", Number(e.target.value))}
                    className={inputCls}
                  />
                </Field>
                <Field label="Holati">
                  <button
                    type="button"
                    onClick={() => set("isActive", !form.isActive)}
                    className={`w-full px-3 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                      form.isActive
                        ? "bg-green-50 border-green-300 text-green-700"
                        : "bg-gray-50 border-gray-300 text-gray-500"
                    }`}
                  >
                    {form.isActive ? "Aktiv" : "Noaktiv"}
                  </button>
                </Field>
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setView("list")}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50"
              >
                Bekor qilish
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-b from-[#f5b51b] to-[#e0a40d] text-[#002d21] hover:from-[#ffc733] hover:to-[#f5b51b] transition-all disabled:opacity-60"
              >
                {saving && <Loader2 size={15} className="animate-spin" />}
                Saqlash
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- LIST VIEW
  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900">Hero slayderlar</h1>
          <p className="text-sm text-gray-500">
            Bosh sahifadagi asosiy bannerni boshqaring
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-gradient-to-b from-[#f5b51b] to-[#e0a40d] text-[#002d21] px-4 py-2.5 rounded-xl text-sm font-bold hover:from-[#ffc733] hover:to-[#f5b51b] transition-all"
        >
          <Plus size={16} /> Yangi slayd
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 size={22} className="animate-spin" />
        </div>
      ) : slides.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-500">
          Hali slayd yo'q. “Yangi slayd” tugmasi orqali qo'shing.
        </div>
      ) : (
        <div className="space-y-3">
          {slides.map((s, i) => (
            <div
              key={s.id}
              className={`bg-white rounded-2xl border overflow-hidden flex items-center ${
                s.isActive ? "border-gray-100" : "border-gray-200 opacity-70"
              }`}
            >
              {/* Reorder */}
              <div className="flex flex-col px-2 shrink-0">
                <button
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === slides.length - 1}
                  className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                >
                  <ChevronDown size={16} />
                </button>
              </div>

              {/* Thumbnail */}
              <div className="w-32 h-20 bg-[#013024] shrink-0 flex items-center justify-center overflow-hidden">
                {s.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.imageUrl}
                    alt={s.title}
                    className="max-w-full max-h-full object-contain p-2"
                  />
                ) : (
                  <ImageOff size={20} className="text-white/30" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 px-4 py-3 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-semibold text-gray-900 text-sm truncate">
                    {s.title}
                  </p>
                  {s.discountText && (
                    <span className="text-[10px] bg-[#f5b51b]/20 text-[#9a6b00] px-1.5 py-0.5 rounded font-bold">
                      {s.discountText}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">#{s.sortOrder}</span>
                </div>
                <p className="text-xs text-gray-500 truncate">{s.subtitle}</p>
                <p className="text-xs text-blue-500 mt-0.5 truncate">
                  {s.buttonUrl}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 px-4 shrink-0">
                <button
                  onClick={() => toggleActive(s)}
                  title={s.isActive ? "Noaktiv qilish" : "Aktiv qilish"}
                  className={`p-1.5 rounded-lg transition-colors ${
                    s.isActive
                      ? "text-green-500 hover:bg-green-50"
                      : "text-gray-400 hover:bg-gray-100"
                  }`}
                >
                  {s.isActive ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
                <button
                  onClick={() => openEdit(s)}
                  className="p-1.5 text-gray-400 hover:text-[#9a6b00] hover:bg-[#f5b51b]/10 rounded-lg transition-colors"
                >
                  <Edit2 size={15} />
                </button>
                {deletingId === s.id ? (
                  <div className="flex gap-1">
                    <button
                      onClick={() => remove(s.id)}
                      className="text-xs px-2 py-1 bg-red-500 text-white rounded-lg"
                    >
                      Ha
                    </button>
                    <button
                      onClick={() => setDeletingId(null)}
                      className="text-xs px-2 py-1 bg-gray-100 rounded-lg"
                    >
                      Yo'q
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeletingId(s.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-[#f5b51b] focus:ring-1 focus:ring-[#f5b51b]/40";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
