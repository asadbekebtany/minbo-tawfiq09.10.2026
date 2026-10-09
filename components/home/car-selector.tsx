"use client";

import { useEffect, useState } from "react";
import { Car, Search } from "lucide-react";

type Make = { id: string; name: string };
type Model = { id: string; name: string };
type Generation = { id: string; name: string; yearFrom: number; yearTo: number | null };
type Engine = { id: string; name: string; volume: number | null; fuelType: string | null };

const FITMENT_KEY = "tavfiq-fitment";

export function CarSelector() {
  const [makes, setMakes] = useState<Make[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [engines, setEngines] = useState<Engine[]>([]);
  const [makeId, setMakeId] = useState("");
  const [modelId, setModelId] = useState("");
  const [generationId, setGenerationId] = useState("");
  const [engineId, setEngineId] = useState("");
  const [makeName, setMakeName] = useState("");
  const [modelName, setModelName] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/fitment", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        setMakes(data.makes ?? []);
        if (!data.makes?.length) setLoadError("Markalar topilmadi");
      })
      .catch(() => setLoadError("Fitment yuklanmadi"));
  }, []);

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

  useEffect(() => {
    if (!generationId) {
      setEngines([]);
      return;
    }
    fetch(`/api/fitment?generationId=${encodeURIComponent(generationId)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setEngines(data.engines ?? []))
      .catch(() => undefined);
  }, [generationId]);

  const handleSearch = () => {
    if (!makeName || !modelName) return;
    const gen = generations.find((g) => g.id === generationId);
    const params = new URLSearchParams();
    params.set("carMake", makeName);
    params.set("carModel", modelName);
    if (generationId) params.set("generationId", generationId);
    if (gen?.yearFrom) params.set("year", String(gen.yearFrom));
    if (engineId) params.set("engineId", engineId);
    try {
      localStorage.setItem(
        FITMENT_KEY,
        JSON.stringify({ makeId, modelId, generationId, engineId, makeName, modelName }),
      );
    } catch {
      // ignore
    }
    window.location.href = `/catalog?${params.toString()}`;
  };

  const selectCls =
    "w-full appearance-none rounded-xl border border-[#002d21]/10 bg-white px-3.5 py-3 text-sm font-medium text-[#002d21] outline-none transition focus:border-[#f5b51b] focus:ring-2 focus:ring-[#f5b51b]/25 disabled:opacity-45";

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-[#f5b51b]/25 bg-[#fffdf7] shadow-[0_16px_40px_rgba(0,45,33,0.12)] sm:rounded-[22px]">
      <div className="flex items-center gap-3 border-b border-[#f5b51b]/15 bg-gradient-to-r from-[#002d21] to-[#014433] px-4 py-3.5 sm:px-5">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f5b51b]/15 ring-1 ring-[#f5b51b]/30">
          <Car size={20} className="text-[#f5b51b]" />
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-extrabold text-white sm:text-base">
            Mashinangizga mos qism
          </h3>
          <p className="text-[11px] text-white/60 sm:text-xs">Marka · model · avlod · dvigatel</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-4 sm:gap-3 sm:p-5">
        {loadError ? <p className="text-xs text-amber-700">{loadError}</p> : null}
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[#004733]/70">
            Marka
          </span>
          <select
            value={makeId}
            onChange={(e) => {
              const id = e.target.value;
              setMakeId(id);
              setMakeName(makes.find((m) => m.id === id)?.name ?? "");
              setModelId("");
              setModelName("");
              setGenerationId("");
              setEngineId("");
            }}
            className={selectCls}
          >
            <option value="">Tanlang</option>
            {makes.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[#004733]/70">
            Model
          </span>
          <select
            value={modelId}
            onChange={(e) => {
              const id = e.target.value;
              setModelId(id);
              setModelName(models.find((m) => m.id === id)?.name ?? "");
              setGenerationId("");
              setEngineId("");
            }}
            disabled={!makeId}
            className={selectCls}
          >
            <option value="">Tanlang</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[#004733]/70">
            Avlod
          </span>
          <select
            value={generationId}
            onChange={(e) => {
              setGenerationId(e.target.value);
              setEngineId("");
            }}
            disabled={!modelId}
            className={selectCls}
          >
            <option value="">Ixtiyoriy</option>
            {generations.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.yearFrom}
                {g.yearTo ? `–${g.yearTo}` : "+"})
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[#004733]/70">
            Dvigatel
          </span>
          <select
            value={engineId}
            onChange={(e) => setEngineId(e.target.value)}
            disabled={!generationId}
            className={selectCls}
          >
            <option value="">{engines.length ? "Ixtiyoriy" : "Ma’lumot yo‘q"}</option>
            {engines.map((eng) => (
              <option key={eng.id} value={eng.id}>
                {eng.name}
                {eng.volume ? ` ${eng.volume}L` : ""}
                {eng.fuelType ? ` · ${eng.fuelType}` : ""}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={handleSearch}
          disabled={!makeId || !modelId}
          className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl bg-[#f5b51b] py-3.5 text-sm font-extrabold text-[#002d21] shadow-[0_8px_20px_rgba(245,181,27,0.3)] transition hover:bg-[#ffc733] disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Search size={17} strokeWidth={2.5} />
          Topish
        </button>
      </div>
    </div>
  );
}
