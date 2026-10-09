export type ProductWithRelations = {
  id: string;
  name: string;
  nameRu?: string | null;
  slug: string;
  price: number;
  oldPrice?: number | null;
  discount: number;
  stock: number;
  rating: number;
  reviewCount: number;
  soldCount: number;
  isActive: boolean;
  isApproved: boolean;
  isFeatured: boolean;
  images: { url: string; alt?: string | null; sortOrder: number }[];
  category: { id: string; name: string; slug: string };
  brand?: { id: string; name: string; logo?: string | null } | null;
  store: { id: string; name: string; slug: string; isVerified: boolean };
};

export type CategoryWithChildren = {
  id: string;
  name: string;
  nameRu?: string | null;
  slug: string;
  image?: string | null;
  icon?: string | null;
  children?: CategoryWithChildren[];
};

export type CartItemType = {
  id: string;
  quantity: number;
  product: ProductWithRelations;
  variant?: { id: string; name: string; value: string; price?: number | null } | null;
};

export type OrderWithItems = {
  id: string;
  status: string;
  total: number;
  subtotal: number;
  deliveryCost: number;
  discount: number;
  paymentMethod: string;
  deliveryType: string;
  createdAt: Date;
  items: {
    id: string;
    name: string;
    image?: string | null;
    price: number;
    quantity: number;
    total: number;
  }[];
  store: { name: string };
};

export type FilterParams = {
  categoryId?: string;
  brandId?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  hasDiscount?: boolean;
  inStock?: boolean;
  carMakeId?: string;
  carModelId?: string;
  sort?: "popular" | "cheap" | "expensive" | "rating" | "new" | "discount";
  page?: number;
  limit?: number;
  q?: string;
};
