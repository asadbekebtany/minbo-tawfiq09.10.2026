import type { CatalogProduct } from "@/lib/catalog-product";

export interface CartItem {
  id: string;
  product: CatalogProduct;
  quantity: number;
  variantId?: string | null;
  sku?: string | null;
  unavailable?: boolean;
  unavailableReason?: string | null;
  priceChanged?: boolean;
  previousPrice?: number | null;
}
