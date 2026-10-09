import Link from "next/link";
import { notFound } from "next/navigation";
import { Store, BadgeCheck } from "lucide-react";
import { ProductGrid } from "@/components/product/product-grid";
import { resolveDataSource } from "@/lib/db";
import prisma from "@/lib/prisma";
import type { CatalogProduct } from "@/lib/catalog-product";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  return { title: `Do‘kon · ${slug}` };
}

export default async function StorePage({ params }: PageProps) {
  const { slug } = await params;
  const source = await resolveDataSource();

  let store: {
    name: string;
    slug: string;
    description: string | null;
    city: string | null;
    isVerified: boolean;
    rating: number;
    reviewCount: number;
  } | null = null;
  let products: CatalogProduct[] = [];

  if (source === "database") {
    const row = await prisma.store.findFirst({
      where: {
        OR: [{ slug }, { name: { equals: slug.replace(/-/g, " "), mode: "insensitive" } }],
      },
      include: {
        products: {
          where: { isActive: true, isApproved: true },
          orderBy: { soldCount: "desc" },
          take: 40,
          include: {
            images: { orderBy: { sortOrder: "asc" } },
            brand: { select: { name: true, slug: true } },
            category: { select: { id: true, name: true, slug: true } },
            store: { select: { id: true, name: true, slug: true, isVerified: true } },
          },
        },
      },
    });

    if (!row) notFound();
    store = {
      name: row.name,
      slug: row.slug,
      description: row.description,
      city: row.city,
      isVerified: row.isVerified,
      rating: row.rating,
      reviewCount: row.reviewCount,
    };
    products = row.products.map((product) => ({
      id: product.id,
      name: product.name,
      subtitle: product.oemNumber ?? product.brand?.name ?? undefined,
      slug: product.slug,
      price: product.price,
      oldPrice: product.oldPrice ?? undefined,
      discount: product.discount,
      rating: product.rating,
      reviewCount: product.reviewCount,
      stock: product.stock,
      soldCount: product.soldCount,
      isActive: product.isActive,
      isApproved: product.isApproved,
      isFeatured: product.isFeatured,
      images: product.images.map((image) => ({ url: image.url })),
      brand: product.brand ? { name: product.brand.name } : null,
      store: {
        name: product.store.name,
        slug: product.store.slug,
        isVerified: product.store.isVerified,
      },
      category: product.category,
    }));
  } else {
    notFound();
  }

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-6">
      <nav className="mb-4 text-sm text-gray-500">
        <Link href="/" className="hover:text-[#004733]">
          Bosh sahifa
        </Link>
        <span className="mx-2 text-gray-300">/</span>
        <span className="font-medium text-gray-900">{store.name}</span>
      </nav>

      <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#004733]/10 text-[#004733]">
            <Store size={26} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black text-[#002d21]">{store.name}</h1>
              {store.isVerified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                  <BadgeCheck size={12} /> Tasdiqlangan
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {store.city ? `${store.city} · ` : ""}
              {products.length} ta mahsulot
              {store.rating > 0 ? ` · ★ ${store.rating}` : ""}
            </p>
            {store.description ? (
              <p className="mt-2 text-sm text-gray-600">{store.description}</p>
            ) : null}
          </div>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-gray-500">
          Bu do‘konda hozircha mahsulot yo‘q.
        </div>
      ) : (
        <ProductGrid products={products} />
      )}
    </div>
  );
}
