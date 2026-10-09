"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Car, Loader2, Plus, Star, Trash2 } from "lucide-react";

type FitmentMake = { id: string; name: string };
type FitmentModel = { id: string; name: string };
type FitmentGeneration = { id: string; name: string; yearFrom: number; yearTo: number | null };

type SavedCarRow = {
  id: string;
  generationId: string;
  name: string | null;
  year: number | null;
  make: string;
  model: string;
  generation: string;
  isDefault: boolean;
};

export default function CarsPage() {
  const [cars, setCars] = useState<SavedCarRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [makes, setMakes] = useState<FitmentMake[]>([]);
  const [models, setModels] = useState<FitmentModel[]>([]);
  const [generations, setGenerations] = useState<FitmentGeneration[]>([]);
  const [makeId, setMakeId] = useState("");
  const [modelId, setModelId] = useState("");
  const [generationId, setGenerationId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/cars", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Avtomobillar yuklanmadi");
      setCars(data.cars ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Yuklab bo‘lmadi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!adding) return;
    fetch("/api/fitment", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setMakes(data.makes ?? []))
      .catch(() => undefined);
  }, [adding]);

  useEffect(() => {
    if (!makeId) {
      setModels([]);
      return;
    }
    fetch(`/api/fitment?makeId=${encodeURIComponent(makeId)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setModels(data.models ?? []))
      .catch(() => undefined);
  }, [makeId]);

  useEffect(() => {
    if (!modelId) {
      setGenerations([]);
      return;
    }
    fetch(`/api/fitment?modelId=${encodeURIComponent(modelId)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setGenerations(data.generations ?? []))
      .catch(() => undefined);
  }, [modelId]);

  const handleAdd = async () => {
    if (!generationId) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/cars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generationId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Saqlanmadi");
      setAdding(false);
      setMakeId("");
      setModelId("");
      setGenerationId("");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Saqlanmadi");
    } finally {
      setBusy(false);
    }
  };

  const selectDefault = async (id: string, generationIdValue: string) => {
    setBusy(true);
    try {
      await fetch(`/api/cars/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ select: true }),
      });
      try {
        localStorage.setItem(
          "tavfiq-fitment",
          JSON.stringify({ generationId: generationIdValue }),
        );
      } catch {
        // ignore
      }
      await load();
    } finally {
      setBusy(false);
    }
  };

  const removeCar = async (id: string) => {
    setBusy(true);
    try {
      await fetch(`/api/cars/${id}`, { method: "DELETE" });
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900">Avtomobillarim</h1>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-b from-[#f5b51b] to-[#e0a40d] px-4 py-2 text-sm font-bold text-[#002d21] transition-all hover:from-[#ffc733] hover:to-[#f5b51b]"
        >
          <Plus size={14} /> Qo'shish
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {adding && (
        <div className="rounded-2xl border border-[#004733]/30 bg-white p-5">
          <h2 className="mb-4 font-semibold text-gray-900">Yangi avtomobil</h2>
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <select
              value={makeId}
              onChange={(e) => {
                setMakeId(e.target.value);
                setModelId("");
                setGenerationId("");
              }}
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#004733] focus:outline-none"
            >
              <option value="">Marka</option>
              {makes.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <select
              value={modelId}
              onChange={(e) => {
                setModelId(e.target.value);
                setGenerationId("");
              }}
              disabled={!makeId}
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#004733] focus:outline-none disabled:opacity-50"
            >
              <option value="">Model</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <select
              value={generationId}
              onChange={(e) => setGenerationId(e.target.value)}
              disabled={!modelId}
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#004733] focus:outline-none disabled:opacity-50"
            >
              <option value="">Avlod</option>
              {generations.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.yearFrom}
                  {g.yearTo ? `–${g.yearTo}` : "+"})
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleAdd()}
              disabled={!generationId || busy}
              className="rounded-xl bg-gradient-to-b from-[#f5b51b] to-[#e0a40d] px-5 py-2 text-sm font-bold text-[#002d21] transition-all hover:from-[#ffc733] hover:to-[#f5b51b] disabled:opacity-50"
            >
              Saqlash
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="rounded-xl border border-gray-200 px-5 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Bekor
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid place-items-center rounded-2xl border border-gray-100 bg-white p-12">
          <Loader2 className="animate-spin text-[#004733]" />
        </div>
      ) : cars.length === 0 && !adding ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center">
          <Car size={48} className="mx-auto mb-3 text-gray-200" />
          <p className="mb-2 text-gray-500">Avtomobil qo'shilmagan</p>
          <p className="text-xs text-gray-400">Avtomobilingizni qo'shing va mos ehtiyot qismlarni toping</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cars.map((car) => (
            <div
              key={car.id}
              className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#004733]/10">
                  <Car size={20} className="text-[#004733]" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {car.make} {car.model}
                    {car.isDefault ? (
                      <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-[#f5b51b]/20 px-2 py-0.5 text-[10px] font-bold text-[#9a6b00]">
                        <Star size={10} /> Asosiy
                      </span>
                    ) : null}
                  </p>
                  <p className="text-sm text-gray-500">
                    {car.generation}
                    {car.year ? ` · ${car.year}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {!car.isDefault ? (
                  <button
                    type="button"
                    onClick={() => void selectDefault(car.id, car.generationId)}
                    className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
                  >
                    Asosiy qilish
                  </button>
                ) : null}
                <Link
                  href={`/catalog?generationId=${encodeURIComponent(car.generationId)}&carMake=${encodeURIComponent(car.make)}&carModel=${encodeURIComponent(car.model)}`}
                  className="rounded-lg bg-[#004733]/10 px-3 py-1.5 text-xs font-medium text-[#004733] transition-colors hover:bg-[#004733]/20"
                >
                  Ehtiyot qismlar
                </Link>
                <button
                  type="button"
                  onClick={() => void removeCar(car.id)}
                  className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
