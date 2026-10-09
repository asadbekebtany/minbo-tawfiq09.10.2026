import Link from "next/link";
import { Award } from "lucide-react";
import { InfoPage } from "@/components/ui/info-page";
import { getSiteSettings } from "@/lib/site-settings";
import { checkDatabaseConnection } from "@/lib/db";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function BrandsPage() {
  const { siteName } = await getSiteSettings();
  const db = await checkDatabaseConnection();
  const brands = db
    ? await prisma.brand.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: {
          _count: { select: { products: { where: { isActive: true, isApproved: true } } } },
        },
      })
    : [];

  return (
    <InfoPage
      title="Brendlar"
      description={`${siteName} marketplace’dagi ishonchli va original ishlab chiqaruvchilar.`}
      icon={Award}
    >
      {brands.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#cbd8d0] bg-[#f7f9f6] p-10 text-center text-gray-500">
          Brendlar hozircha yo‘q yoki database ulanmagan.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {brands.map((b) => (
            <Link
              key={b.id}
              href={`/brand/${b.slug}`}
              className="group flex items-center gap-3 rounded-2xl border border-[#e4e9e5] bg-[#fffdf7] p-4 hover:-translate-y-0.5 hover:border-[#f5b51b] hover:shadow-lg"
            >
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#002d21] text-lg font-black text-[#f5b51b]">
                {(b.logo || b.name[0] || "B").slice(0, 1).toUpperCase()}
              </span>
              <span>
                <strong className="block text-[#15231b]">{b.name}</strong>
                <small className="text-gray-500">
                  {b.country ?? "—"} · {b._count.products} mahsulot
                </small>
              </span>
            </Link>
          ))}
        </div>
      )}
    </InfoPage>
  );
}
