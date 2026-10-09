import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/product/product-card";
import type { CatalogProduct } from "@/lib/catalog-product";

interface ProductSectionProps {
  title: string;
  href: string;
  products: CatalogProduct[];
  badge?: string;
}

export function ProductSection({ title, href, products, badge }: ProductSectionProps) {
  if (products.length === 0) return null;

  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-3 sm:mb-3">
        <div className="flex min-w-0 items-center gap-3">
          <h2 className="truncate text-xl font-extrabold text-white">{title}</h2>
          {badge ? (
            <span className="shrink-0 rounded-md bg-gradient-to-b from-[#f5b51b] to-[#e0a40d] px-2.5 py-1 text-xs font-extrabold tracking-wide text-[#002d21]">
              {badge}
            </span>
          ) : null}
        </div>
        <Link
          href={href}
          className="shrink-0 text-sm font-semibold text-[#f5b51b] transition-colors hover:text-[#ffc733]"
        >
          Barchasi →
        </Link>
      </div>

      {/* Mobil: surish mumkinligi — scrollbar o‘rniga hint */}
      <p className="mb-2 flex items-center gap-1 text-[11px] text-white/55 sm:hidden">
        Yon tomonga suring
        <ChevronRight size={12} className="opacity-80" />
      </p>

      <div className="relative -mx-4 sm:mx-0">
        <div className="flex gap-2.5 overflow-x-auto px-4 pb-1 scrollbar-hide sm:grid sm:grid-cols-3 sm:gap-3 sm:overflow-visible sm:px-0 sm:pb-0 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {products.slice(0, 12).map((product) => (
            <div key={product.id} className="w-[38vw] max-w-[160px] shrink-0 sm:w-auto sm:max-w-none sm:shrink">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
        {/* O‘ng chetda fade — keyingi kartochka borligini bildiradi */}
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[#012a1f] to-transparent sm:hidden"
          aria-hidden
        />
      </div>
    </section>
  );
}
