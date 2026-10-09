import { notFound } from "next/navigation";
import { Award } from "lucide-react";
import { InfoPage } from "@/components/ui/info-page";
import { ProductGrid } from "@/components/product/product-grid";
import { getSiteSettings } from "@/lib/site-settings";
import { listCatalogProducts } from "@/lib/products";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function BrandPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!(await checkDatabaseConnection())) notFound();

  const brand = await prisma.brand.findFirst({
    where: { OR: [{ slug }, { name: { equals: slug.replace(/-/g, " "), mode: "insensitive" } }] },
  });
  if (!brand) notFound();

  const { siteName } = await getSiteSettings();
  const { products, total } = await listCatalogProducts({ brand: brand.slug, limit: 48 });

  return (
    <InfoPage
      title={brand.name}
      description={`${brand.country ?? ""} brendi. ${siteName} katalogida ${total} ta mahsulot.`}
      icon={Award}
      backHref="/brands"
    >
      {products.length ? (
        <ProductGrid products={products} />
      ) : (
        <div className="rounded-2xl border border-dashed border-[#cbd8d0] bg-[#f7f9f6] p-10 text-center text-gray-500">
          Bu brend mahsulotlari katalogga qo‘shilmoqda.
        </div>
      )}
    </InfoPage>
  );
}
