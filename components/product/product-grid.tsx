import { ProductCard } from "./product-card";
import type { CatalogProduct } from "@/lib/catalog-product";

interface ProductGridProps {
  products: CatalogProduct[];
  className?: string;
}

/** WB-uslub densiti: 2 → 3 → 4 → 5 → 6 ustun */
export const PRODUCT_GRID_CLASS =
  "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3";

export function ProductGrid({ products, className }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="py-16 text-center text-gray-500">
        <p className="text-lg">Mahsulot topilmadi</p>
      </div>
    );
  }

  return (
    <div className={`${PRODUCT_GRID_CLASS} ${className ?? ""}`}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
