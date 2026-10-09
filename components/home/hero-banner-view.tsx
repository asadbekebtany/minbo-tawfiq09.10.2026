import Link from "next/link";
import { ArrowRight } from "lucide-react";

export type HeroBannerViewData = {
  title?: string;
  subtitle?: string;
  description?: string;
  discountText?: string;
  buttonText?: string;
  buttonUrl?: string;
  imageUrl?: string;
};

/**
 * Hero ichki sahna — toza, mahsulot markaziy, mobil/desktop mos.
 * Tashqi ikat fon homepage section da.
 */
export function HeroBannerView({
  data,
  preview = false,
}: {
  data: HeroBannerViewData;
  preview?: boolean;
}) {
  const { title, subtitle, description, discountText, buttonText, buttonUrl, imageUrl } = data;

  const cta = buttonText ? (
    preview || !buttonUrl ? (
      <span className="inline-flex items-center gap-2 rounded-full bg-[#f5b51b] px-5 py-2.5 text-sm font-extrabold text-[#002d21] shadow-[0_8px_24px_rgba(245,181,27,0.35)] sm:px-6 sm:py-3">
        {buttonText}
        <ArrowRight size={16} className="shrink-0" />
      </span>
    ) : (
      <Link
        href={buttonUrl}
        className="inline-flex items-center gap-2 rounded-full bg-[#f5b51b] px-5 py-2.5 text-sm font-extrabold text-[#002d21] shadow-[0_8px_24px_rgba(245,181,27,0.35)] transition hover:bg-[#ffc733] hover:shadow-[0_10px_28px_rgba(245,181,27,0.45)] active:scale-[0.98] sm:px-6 sm:py-3"
      >
        {buttonText}
        <ArrowRight size={16} className="shrink-0" />
      </Link>
    )
  ) : null;

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Base stage */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 80% at 85% 40%, rgba(245,181,27,0.18) 0%, transparent 50%), radial-gradient(ellipse 60% 50% at 10% 90%, rgba(0,71,51,0.5) 0%, transparent 55%), linear-gradient(160deg, #00140f 0%, #012a1f 45%, #001a12 100%)",
        }}
      />

      {/* Soft mesh / atmosphere — minimal */}
      <div
        className="pointer-events-none absolute -right-10 top-[-20%] h-[120%] w-[70%] opacity-40"
        style={{
          background:
            "conic-gradient(from 210deg at 60% 40%, transparent 0deg, rgba(245,181,27,0.12) 60deg, transparent 140deg)",
        }}
        aria-hidden
      />

      {/* Content grid */}
      <div className="relative z-10 grid h-full grid-cols-1 grid-rows-[1fr_auto] sm:grid-rows-1 sm:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        {/* Copy */}
        <div className="flex flex-col justify-end px-5 pb-4 pt-6 sm:justify-center sm:px-8 sm:py-8 md:px-10 lg:px-12">
          {discountText ? (
            <p className="mb-3 inline-flex w-fit items-center rounded-md border border-[#f5b51b]/40 bg-[#f5b51b]/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#f5b51b] sm:mb-4 sm:text-xs">
              {discountText}
            </p>
          ) : null}

          {title ? (
            <h2 className="max-w-[14ch] text-[1.75rem] font-black leading-[1.05] tracking-tight text-white sm:text-3xl md:text-4xl lg:text-[2.75rem]">
              {title}
            </h2>
          ) : null}

          {subtitle ? (
            <p className="mt-2 text-sm font-semibold text-[#f5b51b] sm:mt-2.5 sm:text-base">
              {subtitle}
            </p>
          ) : null}

          {description ? (
            <p className="mt-2 max-w-[34ch] text-xs leading-relaxed text-white/65 sm:mt-3 sm:text-sm">
              {description}
            </p>
          ) : null}

          {cta ? <div className="mt-4 sm:mt-6">{cta}</div> : null}
        </div>

        {/* Product — dominant visual */}
        <div className="relative flex min-h-[168px] items-center justify-center px-4 pb-10 pt-2 sm:min-h-0 sm:pb-8 sm:pt-8">
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 h-[70%] w-[75%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(circle, rgba(245,181,27,0.4) 0%, rgba(245,181,27,0.08) 45%, transparent 70%)",
            }}
            aria-hidden
          />
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={title || "Banner"}
              className="relative z-[1] max-h-[200px] w-auto max-w-[88%] object-contain drop-shadow-[0_24px_48px_rgba(0,0,0,0.55)] transition-transform duration-700 sm:max-h-[78%] sm:max-w-[92%] md:max-h-[84%]"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}



