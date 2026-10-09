import { unstable_noStore as noStore } from "next/cache";
import { BannerSlider } from "@/components/home/banner-slider";
import { CategoryCarousel } from "@/components/home/category-carousel";
import { BrandCarousel } from "@/components/home/brand-carousel";
import { ProductSection } from "@/components/home/product-section";
import { CarSelector } from "@/components/home/car-selector";
import { Headset, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { getActiveSlides } from "@/lib/hero-slides";
import { BUYER_VISIBLE_PRODUCT_WHERE, listCatalogProducts } from "@/lib/products";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";
import type { HomeBrand } from "@/components/home/brand-carousel";
import type { HomeCategory } from "@/components/home/category-carousel";

const advantages = [
  { icon: ShieldCheck, title: "100% sifat kafolati", desc: "Rasmiy mahsulotlar" },
  { icon: Truck, title: "Bepul yetkazib berish", desc: "500 000 so‘mdan" },
  { icon: RotateCcw, title: "14 kun ichida qaytarish", desc: "Oson va tez" },
  { icon: Headset, title: "24/7 qo‘llab-quvvatlash", desc: "Doim siz bilan" },
];

async function loadHomeTaxonomy(): Promise<{
  categories: HomeCategory[];
  brands: HomeBrand[];
}> {
  if (!(await checkDatabaseConnection())) {
    return { categories: [], brands: [] };
  }

  const [categoryRows, brandRows] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        slug: true,
        name: true,
        _count: {
          select: {
            products: { where: BUYER_VISIBLE_PRODUCT_WHERE },
          },
        },
      },
    }),
    prisma.brand.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { slug: true, name: true, country: true },
    }),
  ]);

  return {
    categories: categoryRows.map((row) => ({
      slug: row.slug,
      name: row.name,
      count: row._count.products,
    })),
    brands: brandRows.map((row) => ({
      slug: row.slug,
      name: row.name,
      country: row.country ?? "",
    })),
  };
}

export default async function HomePage() {
  noStore();

  const heroSlides = (await getActiveSlides()).map((slide) => ({
    id: slide.id,
    title: slide.title,
    subtitle: slide.subtitle,
    description: slide.description,
    discountText: slide.discountText,
    buttonText: slide.buttonText,
    buttonUrl: slide.buttonUrl,
    imageUrl: slide.imageUrl,
  }));

  // WB joylashuv: hero → kategoriyalar → tavsiya → chegirma → brendlar → yangi → katalog
  const [recommended, discount, newest, catalog, taxonomy] = await Promise.all([
    listCatalogProducts({ sort: "popular", limit: 12, featured: true }),
    listCatalogProducts({ sort: "discount", limit: 12 }),
    listCatalogProducts({ sort: "new", limit: 12 }),
    listCatalogProducts({ sort: "popular", limit: 24 }),
    loadHomeTaxonomy(),
  ]);

  const recommendProducts =
    recommended.products.length > 0
      ? recommended.products
      : (await listCatalogProducts({ sort: "popular", limit: 12 })).products;

  return (
    <div className="min-h-screen overflow-x-clip bg-green-ornament">
      <section className="relative overflow-hidden border-b border-[#f5b51b]/25 bg-ikat">
        <div className="absolute inset-0 bg-[#012a1f]/22" />
        <div className="relative mx-auto max-w-[1280px] px-3 py-3 sm:px-4 sm:py-5 lg:px-4 lg:py-6">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(300px,340px)] lg:items-stretch lg:gap-4">
            <BannerSlider slides={heroSlides} />
            <CarSelector />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1280px] space-y-8 px-4 pb-10 pt-5">
        <CategoryCarousel categories={taxonomy.categories} />
        <ProductSection
          title="Siz uchun tavsiya"
          href="/catalog?sort=popular"
          products={recommendProducts}
          badge="TOP"
        />
        <ProductSection
          title="Chegirmadagi mahsulotlar"
          href="/catalog?sort=discount"
          products={discount.products}
          badge="Aksiya"
        />
        <BrandCarousel brands={taxonomy.brands} />
        <ProductSection
          title="Yangi kelganlar"
          href="/catalog?sort=new"
          products={newest.products}
          badge="Yangi"
        />
        <ProductSection title="Katalogdan tanlang" href="/catalog" products={catalog.products} />
      </div>

      <section className="relative">
        <div className="h-3.5 bg-ikat" />
        <div className="bg-[#002d21]">
          <div className="mx-auto grid max-w-[1280px] grid-cols-2 divide-x divide-[#f5b51b]/15 px-2 sm:px-4 md:grid-cols-4">
            {advantages.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex min-w-0 items-start gap-2 px-2 py-4 sm:items-center sm:gap-3 sm:px-4 sm:py-5">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#f5b51b]/25 bg-[#f5b51b]/10 sm:h-11 sm:w-11">
                    <Icon size={20} className="text-[#f5b51b] sm:size-[22px]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold leading-tight text-white sm:text-sm">{item.title}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-[#cdd6cf] sm:text-xs">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="h-3.5 bg-ikat" />
      </section>
    </div>
  );
}
