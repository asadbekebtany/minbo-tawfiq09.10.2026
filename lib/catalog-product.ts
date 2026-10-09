/** Storefront mahsulot kartasi (mock va DB uchun umumiy tip) */
export type CatalogProduct = {
  id: string;
  name: string;
  subtitle?: string;
  slug: string;
  price: number;
  oldPrice?: number;
  discount: number;
  rating: number;
  reviewCount: number;
  stock: number;
  soldCount: number;
  isActive: boolean;
  isApproved: boolean;
  isFeatured: boolean;
  images: { url: string }[];
  brand?: { name: string } | null;
  store: { name: string; slug: string; isVerified: boolean };
  category: { id: string; name: string; slug: string };
  oemNumber?: string | null;
  sku?: string | null;
  description?: string | null;
  warranty?: string | null;
  returnPolicy?: string | null;
  compatibility?: Array<{
    generationId: string;
    label: string;
    note?: string | null;
  }>;
  variants?: Array<{
    id: string;
    name: string;
    value: string;
    price: number | null;
    stock: number;
    sku: string | null;
  }>;
};
