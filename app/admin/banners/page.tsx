"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Edit2, Trash2, Eye, EyeOff, Check } from "lucide-react";

type BannerType = "main" | "secondary" | "category" | "brand";

type Banner = {
  id: string;
  title: string;
  titleRu: string | null;
  subtitle: string | null;
  link: string | null;
  image: string;
  type: BannerType;
  sortOrder: number;
  isActive: boolean;
};

const TYPE_LABELS: Record<BannerType, string> = {
  main: "Asosiy",
  secondary: "Ikkinchi",
  category: "Kategoriya",
  brand: "Brend",
};

const BLANK = {
  title: "",
  titleRu: "",
  subtitle: "",
  link: "",
  image: "/banners/placeholder.jpg",
  type: "main" as BannerType,
  sortOrder: 1,
  isActive: true,
};

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ ...BLANK });
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/banners", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Yuklanmadi");
      setBanners(data.banners ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Yuklanmadi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleActive = async (banner: Banner) => {
    setError(null);
    try {
      const response = await fetch(`/api/banners/${banner.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !banner.isActive }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Yangilanmadi");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Yangilanmadi");
    }
  };

  const saveEdit = async (id: string) => {
    setError(null);
    try {
      const response = await fetch(`/api/banners/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          titleRu: form.titleRu || null,
          subtitle: form.subtitle || null,
          link: form.link || null,
          image: form.image || "/banners/placeholder.jpg",
          type: form.type,
          sortOrder: form.sortOrder,
          isActive: form.isActive,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Saqlanmadi");
      setEditing(null);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Saqlanmadi");
    }
  };

  const saveNew = async () => {
    if (!form.title) return;
    setError(null);
    try {
      const response = await fetch("/api/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          titleRu: form.titleRu || null,
          subtitle: form.subtitle || null,
          link: form.link || null,
          image: form.image || "/banners/placeholder.jpg",
          type: form.type,
          sortOrder: form.sortOrder,
          isActive: form.isActive,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Yaratilmadi");
      setAdding(false);
      setForm({ ...BLANK });
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Yaratilmadi");
    }
  };

  const remove = async (id: string) => {
    setError(null);
    try {
      const response = await fetch(`/api/banners/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "O‘chirilmadi");
      setDeleting(null);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "O‘chirilmadi");
    }
  };

  const startEdit = (b: Banner) => {
    setEditing(b.id);
    setForm({
      title: b.title,
      titleRu: b.titleRu ?? "",
      subtitle: b.subtitle ?? "",
      link: b.link ?? "",
      image: b.image,
      type: b.type,
      sortOrder: b.sortOrder,
      isActive: b.isActive,
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-gray-900">Bannerlar</h1>
        <button
          onClick={() => {
            setAdding(true);
            setForm({ ...BLANK });
          }}
          className="flex items-center gap-2 bg-[#cb11ab] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#a50d8c] transition-colors"
        >
          <Plus size={16} /> Banner qo&apos;shish
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {adding && (
        <div className="bg-white rounded-2xl border border-[#cb11ab]/30 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Yangi banner</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-3">
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Sarlavha (UZ)"
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#cb11ab]"
            />
            <input
              value={form.titleRu}
              onChange={(e) => setForm({ ...form, titleRu: e.target.value })}
              placeholder="Заголовок (RU)"
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#cb11ab]"
            />
            <input
              value={form.subtitle}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              placeholder="Tavsif"
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#cb11ab]"
            />
            <input
              value={form.link}
              onChange={(e) => setForm({ ...form, link: e.target.value })}
              placeholder="/catalog/shinalar"
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#cb11ab]"
            />
            <input
              value={form.image}
              onChange={(e) => setForm({ ...form, image: e.target.value })}
              placeholder="Rasm URL"
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#cb11ab]"
            />
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as BannerType })}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#cb11ab]"
            >
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: +e.target.value })}
              placeholder="Tartib"
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#cb11ab]"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => void saveNew()}
              className="px-4 py-2 bg-[#cb11ab] text-white rounded-xl text-sm font-medium hover:bg-[#a50d8c]"
            >
              Saqlash
            </button>
            <button
              onClick={() => setAdding(false)}
              className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50"
            >
              Bekor
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-center text-gray-500 py-8">Yuklanmoqda...</p>
      ) : (
        <div className="space-y-3">
          {banners.length === 0 ? (
            <p className="rounded-2xl border bg-white p-8 text-center text-gray-500">Banner yo‘q</p>
          ) : null}
          {banners.map((banner) => (
            <div
              key={banner.id}
              className={`bg-white rounded-2xl border overflow-hidden ${
                banner.isActive ? "border-gray-100" : "border-gray-200 opacity-70"
              }`}
            >
              {editing === banner.id ? (
                <div className="p-5">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-3">
                    <input
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      className="px-3 py-2 border border-[#cb11ab] rounded-xl text-sm focus:outline-none"
                    />
                    <input
                      value={form.subtitle}
                      onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                      className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none"
                    />
                    <input
                      value={form.link}
                      onChange={(e) => setForm({ ...form, link: e.target.value })}
                      className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none"
                      placeholder="Link"
                    />
                    <input
                      value={form.image}
                      onChange={(e) => setForm({ ...form, image: e.target.value })}
                      className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none"
                      placeholder="Rasm URL"
                    />
                    <select
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value as BannerType })}
                      className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none"
                    >
                      {Object.entries(TYPE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => void saveEdit(banner.id)}
                      className="flex items-center gap-1.5 text-xs px-4 py-2 bg-green-500 text-white rounded-xl font-medium"
                    >
                      <Check size={12} /> Saqlash
                    </button>
                    <button
                      onClick={() => setEditing(null)}
                      className="text-xs px-4 py-2 bg-gray-100 text-gray-600 rounded-xl"
                    >
                      Bekor
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center">
                  <div className="relative w-40 h-20 shrink-0 bg-[#004733] flex items-center justify-center overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={banner.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    <div className="relative z-10 text-center px-3 bg-black/35 rounded px-2 py-1">
                      <p className="text-white text-xs font-bold line-clamp-1">{banner.title}</p>
                    </div>
                  </div>
                  <div className="flex-1 px-5 py-3 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900 text-sm">{banner.title}</p>
                      <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">
                        {TYPE_LABELS[banner.type]}
                      </span>
                      <span className="text-xs text-gray-400">#{banner.sortOrder}</span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-1">{banner.subtitle}</p>
                    <p className="text-xs text-blue-500 mt-0.5">{banner.link}</p>
                  </div>
                  <div className="flex items-center gap-1 px-4 shrink-0">
                    <button
                      onClick={() => void toggleActive(banner)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        banner.isActive
                          ? "text-green-500 hover:bg-green-50"
                          : "text-gray-400 hover:bg-gray-100"
                      }`}
                    >
                      {banner.isActive ? <Eye size={15} /> : <EyeOff size={15} />}
                    </button>
                    <button
                      onClick={() => startEdit(banner)}
                      className="p-1.5 text-gray-400 hover:text-[#cb11ab] hover:bg-[#cb11ab]/10 rounded-lg transition-colors"
                    >
                      <Edit2 size={15} />
                    </button>
                    {deleting === banner.id ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => void remove(banner.id)}
                          className="text-xs px-2 py-1 bg-red-500 text-white rounded-lg"
                        >
                          Ha
                        </button>
                        <button
                          onClick={() => setDeleting(null)}
                          className="text-xs px-2 py-1 bg-gray-100 rounded-lg"
                        >
                          Yo&apos;q
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleting(banner.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
