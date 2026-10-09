"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";

type ProfileForm = { name: string; phone: string; email: string };

export default function SettingsPage() {
  const [form, setForm] = useState<ProfileForm>({ name: "", phone: "", email: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/profile", { cache: "no-store" })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Profil yuklanmadi");
        setForm({
          name: data.user?.name ?? "",
          phone: data.user?.phone ?? "",
          email: data.user?.email ?? "",
        });
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Profil yuklanmadi");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone || undefined,
          email: form.email,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Saqlanmadi");
      setForm({
        name: data.user?.name ?? form.name,
        phone: data.user?.phone ?? form.phone,
        email: data.user?.email ?? form.email,
      });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Saqlanmadi");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-[240px] place-items-center">
        <Loader2 className="animate-spin text-[#004733]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Sozlamalar</h1>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        <h2 className="mb-4 font-semibold text-gray-900">Shaxsiy ma'lumotlar</h2>
        <div className="space-y-4">
          {[
            { key: "name", label: "Ism", placeholder: "Ismingiz" },
            { key: "phone", label: "Telefon", placeholder: "+998 XX XXX XX XX" },
            { key: "email", label: "Email", placeholder: "email@example.com" },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
              <input
                value={form[key as keyof ProfileForm]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                placeholder={placeholder}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm transition-colors focus:border-[#004733] focus:outline-none"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || form.name.trim().length < 2}
            className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
              saved
                ? "bg-green-600 text-white"
                : "bg-gradient-to-b from-[#f5b51b] to-[#e0a40d] text-[#002d21] hover:from-[#ffc733] hover:to-[#f5b51b]"
            }`}
          >
            {saved ? (
              <>
                <Check size={14} /> Saqlandi
              </>
            ) : saving ? (
              "Saqlanmoqda..."
            ) : (
              "Saqlash"
            )}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        <h2 className="mb-2 font-semibold text-gray-900">Bildirishnomalar</h2>
        <p className="text-sm text-gray-500">
          Buyurtma va tizim xabarlari{" "}
          <a href="/profile/notifications" className="font-medium text-[#004733] hover:underline">
            /profile/notifications
          </a>{" "}
          sahifasida saqlanadi.
        </p>
      </div>
    </div>
  );
}
