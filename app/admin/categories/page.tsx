"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Edit2, Trash2, Check, X } from "lucide-react";
import { slugify } from "@/lib/utils";

type Category = {
  id: string;
  name: string;
  nameRu: string;
  slug: string;
  icon: string;
  parentId: string | null;
  count: number;
};

const BLANK = { name: "", nameRu: "", slug: "", icon: "📦", parentId: null as string | null };

export default function AdminCategoriesPage() {
  const [cats, setCats] = useState<Category[]>([]);
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
      const response = await fetch("/api/categories", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Yuklanmadi");
      setCats(
        (data.categories ?? []).map(
          (c: {
            id: string;
            name: string;
            nameRu?: string | null;
            slug: string;
            icon?: string | null;
            parentId?: string | null;
            count?: number;
          }) => ({
            id: c.id,
            name: c.name,
            nameRu: c.nameRu ?? "",
            slug: c.slug,
            icon: c.icon || "📦",
            parentId: c.parentId ?? null,
            count: c.count ?? 0,
          }),
        ),
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Yuklanmadi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const startEdit = (cat: Category) => {
    setEditing(cat.id);
    setForm({
      name: cat.name,
      nameRu: cat.nameRu,
      slug: cat.slug,
      icon: cat.icon,
      parentId: cat.parentId,
    });
  };

  const saveEdit = async (id: string) => {
    setError(null);
    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          nameRu: form.nameRu || null,
          slug: form.slug,
          icon: form.icon || null,
          parentId: form.parentId,
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
    if (!form.name) return;
    setError(null);
    const slug = form.slug || slugify(form.name);
    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          nameRu: form.nameRu || null,
          slug,
          icon: form.icon || null,
          parentId: form.parentId,
          isActive: true,
          sortOrder: cats.length,
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
      const response = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "O‘chirilmadi");
      setDeleting(null);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "O‘chirilmadi");
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-gray-900">Kategoriyalar</h1>
        <button
          onClick={() => {
            setAdding(true);
            setForm({ ...BLANK });
          }}
          className="flex items-center gap-2 bg-[#cb11ab] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#a50d8c] transition-colors"
        >
          <Plus size={16} /> Kategoriya qo&apos;shish
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {adding && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              value={form.name}
              onChange={(e) =>
                setForm({
                  ...form,
                  name: e.target.value,
                  slug: form.slug || slugify(e.target.value),
                })
              }
              placeholder="Nomi"
              className="px-3 py-2 border rounded-xl text-sm"
            />
            <input
              value={form.nameRu}
              onChange={(e) => setForm({ ...form, nameRu: e.target.value })}
              placeholder="Nomi (RU)"
              className="px-3 py-2 border rounded-xl text-sm"
            />
            <input
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="slug"
              className="px-3 py-2 border rounded-xl text-sm"
            />
            <input
              value={form.icon}
              onChange={(e) => setForm({ ...form, icon: e.target.value })}
              placeholder="Icon"
              className="px-3 py-2 border rounded-xl text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => void saveNew()}
              className="px-4 py-2 bg-[#cb11ab] text-white rounded-xl text-sm font-semibold"
            >
              Saqlash
            </button>
            <button
              onClick={() => setAdding(false)}
              className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors"
            >
              Bekor
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-gray-500">Yuklanmoqda...</p>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["#", "Icon", "Nomi", "Nomi (RU)", "Slug", "Mahsulotlar", "Amallar"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {cats.map((cat, i) => (
                <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-400">{i + 1}</td>
                  <td className="px-4 py-3 text-xl">{cat.icon}</td>
                  {editing === cat.id ? (
                    <>
                      <td className="px-2 py-2">
                        <input
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          className="w-full px-2 py-1.5 border border-[#cb11ab] rounded-lg text-sm focus:outline-none"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          value={form.nameRu}
                          onChange={(e) => setForm({ ...form, nameRu: e.target.value })}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          value={form.slug}
                          onChange={(e) => setForm({ ...form, slug: e.target.value })}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{cat.count}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button
                            onClick={() => void saveEdit(cat.id)}
                            className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => setEditing(null)}
                            className="p-1.5 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{cat.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{cat.nameRu}</td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-400">{cat.slug}</td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900">{cat.count}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button
                            onClick={() => startEdit(cat)}
                            className="p-1.5 text-gray-400 hover:text-[#cb11ab] hover:bg-[#cb11ab]/10 rounded-lg transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                          {deleting === cat.id ? (
                            <div className="flex gap-1">
                              <button
                                onClick={() => void remove(cat.id)}
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
                              onClick={() => setDeleting(cat.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
