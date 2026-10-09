import type { CatalogProduct } from "@/lib/catalog-product";
import type { CartItem } from "@/lib/cart-types";

export type ApiCartProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  oldPrice: number | null;
  discount: number;
  rating: number;
  reviewCount: number;
  stock: number;
  soldCount: number;
  isActive: boolean;
  isApproved: boolean;
  isFeatured: boolean;
  oemNumber: string | null;
  images: { url: string }[];
  brand: { name: string } | null;
  store: { name: string; slug: string; isVerified: boolean };
  category: { id: string; name: string; slug: string };
};

export type ApiCartRow = {
  id: string;
  quantity: number;
  variantId?: string | null;
  currentPrice?: number;
  sku?: string | null;
  unavailable?: boolean;
  unavailableReason?: string | null;
  priceChanged?: boolean;
  previousPrice?: number | null;
  variant?: { id: string; name: string; value: string; price: number | null; stock: number; sku: string | null; isActive?: boolean } | null;
  product: ApiCartProduct;
};

export function mapApiCartRow(row: ApiCartRow): CartItem {
  const price = row.currentPrice ?? row.variant?.price ?? row.product.price;
  const stock = row.variant?.stock ?? row.product.stock;
  const unavailable = Boolean(row.unavailable) || !row.product.isActive || stock <= 0;
  const product: CatalogProduct = {
    id: row.product.id,
    name: row.variant ? `${row.product.name} · ${row.variant.value}` : row.product.name,
    subtitle: row.product.oemNumber ?? row.product.brand?.name ?? undefined,
    slug: row.product.slug,
    price,
    oldPrice: row.product.oldPrice ?? undefined,
    discount: row.product.discount,
    rating: row.product.rating,
    reviewCount: row.product.reviewCount,
    stock,
    soldCount: row.product.soldCount,
    isActive: row.product.isActive,
    isApproved: row.product.isApproved,
    isFeatured: row.product.isFeatured,
    images: row.product.images.length > 0 ? row.product.images : [{ url: "/placeholder-product.png" }],
    brand: row.product.brand,
    store: row.product.store,
    category: row.product.category,
    sku: row.sku ?? row.variant?.sku ?? row.product.oemNumber,
  };

  return {
    id: row.id,
    product,
    quantity: row.quantity,
    variantId: row.variantId ?? row.variant?.id ?? null,
    sku: product.sku,
    unavailable,
    unavailableReason: row.unavailableReason ?? (unavailable ? "SKU mavjud emas yoki tugagan" : null),
    priceChanged: Boolean(row.priceChanged),
    previousPrice: row.previousPrice ?? null,
  };
}
