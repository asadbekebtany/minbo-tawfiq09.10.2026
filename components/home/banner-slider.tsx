"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { HeroBannerView } from "./hero-banner-view";

export type HeroSlideData = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  discountText: string;
  buttonText: string;
  buttonUrl: string;
  imageUrl: string;
};

const FALLBACK_SLIDES: HeroSlideData[] = [
  {
    id: "fallback-disks",
    title: "Alyumin disklar",
    subtitle: "R15 — R20 · 500+ model",
    description: "Mustahkam va zamonaviy disklar — avtomobilingizga mos",
    discountText: "−15% chegirma",
    buttonText: "Hozir xarid qilish",
    buttonUrl: "/catalog/disklar",
    imageUrl: "/products/alloy-wheel.png",
  },
  {
    id: "fallback-tyres",
    title: "Premium shinalar",
    subtitle: "Michelin · Bridgestone · Continental",
    description: "Yozgi va qishki mavsum uchun original shinalar",
    discountText: "−30% gacha",
    buttonText: "Shinalarni ko‘rish",
    buttonUrl: "/catalog/shinalar",
    imageUrl: "/products/car-tyre.png",
  },
  {
    id: "fallback-oils",
    title: "Original motor moylari",
    subtitle: "Castrol · Shell · Mobil",
    description: "Dvigatelga uzoq muddatli himoya",
    discountText: "−20% chegirma",
    buttonText: "Moylarni tanlash",
    buttonUrl: "/catalog/moylar",
    imageUrl: "/products/motor-oil.png",
  },
];

export function BannerSlider({ slides = [] }: { slides?: HeroSlideData[] }) {
  const items = useMemo(() => (slides.length ? slides : FALLBACK_SLIDES), [slides]);
  const [current, setCurrent] = useState(0);
  const paused = useRef(false);
  const touchX = useRef<number | null>(null);
  const count = items.length;
  const activeIndex = count ? Math.min(current, count - 1) : 0;

  const next = useCallback(() => {
    setCurrent((index) => (count ? (index + 1) % count : 0));
  }, [count]);

  const previous = useCallback(() => {
    setCurrent((index) => (count ? (index - 1 + count) % count : 0));
  }, [count]);

  useEffect(() => {
    if (count < 2) return;
    const timer = window.setInterval(() => {
      if (!paused.current) next();
    }, 5600);
    return () => window.clearInterval(timer);
  }, [count, next]);

  const slide = items[activeIndex];

  return (
    <div
      className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl border border-[#f5b51b]/35 bg-[#00140f] shadow-[0_20px_50px_rgba(0,0,0,0.28)] sm:aspect-[16/10] sm:min-h-[320px] sm:rounded-[22px] lg:aspect-auto lg:h-full lg:min-h-[400px]"
      onMouseEnter={() => {
        paused.current = true;
      }}
      onMouseLeave={() => {
        paused.current = false;
      }}
      onTouchStart={(e) => {
        touchX.current = e.touches[0]?.clientX ?? null;
        paused.current = true;
      }}
      onTouchEnd={(e) => {
        const start = touchX.current;
        const end = e.changedTouches[0]?.clientX;
        touchX.current = null;
        paused.current = false;
        if (start == null || end == null) return;
        const delta = end - start;
        if (Math.abs(delta) < 48) return;
        if (delta < 0) next();
        else previous();
      }}
    >
      <HeroBannerView data={slide} />

      {count > 1 ? (
        <>
          {/* Desktop arrows */}
          <button
            type="button"
            onClick={previous}
            aria-label="Oldingi"
            className="absolute left-3 top-1/2 z-30 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/35 text-white backdrop-blur-md transition hover:border-[#f5b51b]/50 hover:text-[#f5b51b] sm:grid"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Keyingi"
            className="absolute right-3 top-1/2 z-30 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/35 text-white backdrop-blur-md transition hover:border-[#f5b51b]/50 hover:text-[#f5b51b] sm:grid"
          >
            <ChevronRight size={20} />
          </button>

          {/* Dots — always visible, thumb-friendly on mobile */}
          <div className="absolute bottom-3 left-0 right-0 z-30 flex items-center justify-center gap-1.5 sm:bottom-4">
            {items.map((item, index) => (
              <button
                type="button"
                key={item.id}
                aria-label={`${index + 1}-slayd`}
                onClick={() => setCurrent(index)}
                className={`h-1.5 rounded-full transition-all ${
                  index === activeIndex
                    ? "w-7 bg-[#f5b51b]"
                    : "w-1.5 bg-white/40 hover:bg-white/70"
                }`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
