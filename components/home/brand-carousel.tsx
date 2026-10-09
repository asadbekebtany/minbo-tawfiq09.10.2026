import Link from "next/link";

export type HomeBrand = {
  slug: string;
  name: string;
  country: string;
};

function brandMark(brand: HomeBrand) {
  const country = brand.country.trim();
  if (country && [...country].length <= 2) return country;
  return (brand.name[0] ?? "?").toUpperCase();
}

export function BrandCarousel({ brands }: { brands: HomeBrand[] }) {
  if (brands.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-2xl font-extrabold text-white">Brendlar</h2>
        <Link href="/brands" className="text-sm text-[#f5b51b] hover:text-[#ffc733] font-semibold transition-colors">
          Barchasi →
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {brands.map((brand) => (
          <Link
            key={brand.slug}
            href={`/brand/${brand.slug}`}
            className="group w-28 shrink-0 flex flex-col items-center gap-2 p-4 rounded-2xl bg-[#fffdf7] border border-[#f5b51b]/20 hover:border-[#C9A227]/50 hover:shadow-[0_6px_16px_rgba(28,25,23,0.07)] hover:-translate-y-px focus-visible:border-[#C9A227]/50 focus-visible:shadow-[0_6px_16px_rgba(28,25,23,0.07)] focus-visible:-translate-y-px focus-visible:outline-none transition-[transform,box-shadow,border-color] duration-[250ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#004733]/8 text-2xl">
              <span className="inline-block transition-[filter] duration-[250ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:[filter:drop-shadow(0_1px_1px_rgba(212,175,55,0.55))] group-focus-visible:[filter:drop-shadow(0_1px_1px_rgba(212,175,55,0.55))]">
                {brandMark(brand)}
              </span>
            </div>
            <p className="text-center text-xs font-semibold text-gray-700">
              {brand.name}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
