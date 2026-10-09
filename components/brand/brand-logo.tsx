"use client";

import { useEffect, useId, useState } from "react";
import { DEFAULT_SITE_SETTINGS } from "@/lib/site-settings-constants";

type BrandNameProps = {
  className?: string;
  stacked?: boolean;
  variant?: "dark" | "light";
};

function BrandEmblemSvg({
  className,
  gradientId,
}: {
  className: string;
  gradientId: string;
}) {
  return (
    <svg viewBox="0 0 52 52" className={className} fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="4" y1="3" x2="49" y2="49" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffe495" /><stop offset=".45" stopColor="#f5b51b" /><stop offset="1" stopColor="#b97800" />
        </linearGradient>
      </defs>
      <path d="M26 2 50 26 26 50 2 26 26 2Z" fill={`url(#${gradientId})`} />
      <path d="M26 7 45 26 26 45 7 26 26 7Z" fill="#002d21" />
      <path d="m16 15 10 11 10-11-5 16 5 6-10-5-10 5 5-6-5-16Z" fill={`url(#${gradientId})`} fillRule="evenodd" />
      <path d="M26 19 31 26 26 33 21 26 26 19Z" fill="#002d21" />
    </svg>
  );
}

function BrandEmblemAutoId({ className }: { className: string }) {
  const reactId = useId().replace(/:/g, "");
  return <BrandEmblemSvg className={className} gradientId={`brand-gold-${reactId}`} />;
}

export function BrandEmblem({
  className = "h-11 w-11",
  gradientId,
}: {
  className?: string;
  gradientId?: string;
}) {
  if (gradientId) {
    return <BrandEmblemSvg className={className} gradientId={gradientId} />;
  }
  return <BrandEmblemAutoId className={className} />;
}

export function BrandName({
  className = "",
  stacked = false,
  variant = "dark",
}: BrandNameProps) {
  const [settings, setSettings] = useState({
    siteName: DEFAULT_SITE_SETTINGS.siteName,
    tagline: DEFAULT_SITE_SETTINGS.tagline,
  });

  useEffect(() => {
    fetch("/api/site-settings", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data?.settings) setSettings(data.settings);
      })
      .catch(() => undefined);
  }, []);

  const words = settings.siteName.trim().split(/\s+/);
  const first = words.slice(0, -1).join(" ") || words[0] || DEFAULT_SITE_SETTINGS.siteShortName;
  const last = words.length > 1 ? words.at(-1) : "";
  const isSingleWord = words.length === 1;
  const firstClass = isSingleWord
    ? variant === "light"
      ? "font-black text-[#002d21]"
      : "font-black text-[#f5b51b]"
    : variant === "light"
      ? "font-black text-[#002d21]"
      : "font-black text-white";

  return (
    <span className={className}>
      <span className={firstClass}>
        {isSingleWord ? first : `${first}${last ? " " : ""}`}
      </span>
      {!isSingleWord && last ? <span className="font-black text-[#f5b51b]">{last}</span> : null}
      {stacked ? (
        <small className="mt-1 block text-[10px] font-medium tracking-wide text-[#cdd6cf]">
          {settings.tagline}
        </small>
      ) : null}
    </span>
  );
}
