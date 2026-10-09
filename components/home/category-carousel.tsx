import Link from "next/link";
import {
  CircleDot,
  Disc3,
  Droplets,
  BatteryCharging,
  Disc,
  Lightbulb,
  Car,
  Armchair,
  Smartphone,
  FlaskConical,
  Wrench,
  Filter,
  Zap,
  Package,
  Snowflake,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export type HomeCategory = {
  slug: string;
  name: string;
  count: number;
};

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  shinalar: CircleDot,
  disklar: Disc3,
  moylar: Droplets,
  akkumulyator: BatteryCharging,
  tormoz: Disc,
  faralar: Lightbulb,
  kuzov: Car,
  salon: Armchair,
  elektronika: Smartphone,
  kimyo: FlaskConical,
  asboblar: Wrench,
  filtrlar: Filter,
  amortizator: Disc,
  svechalar: Zap,
  remenlar: Wrench,
  podshipnik: CircleDot,
  radiator: Snowflake,
  yuvish: Sparkles,
  "moy-nasos": Droplets,
  boshqa: Package,
};

function formatCount(count: number) {
  return count.toLocaleString("uz-UZ");
}

export function CategoryCarousel({ categories }: { categories: HomeCategory[] }) {
  if (categories.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-extrabold text-white">Kategoriyalar</h2>
        <Link
          href="/catalog"
          className="text-sm text-[#f5b51b] hover:text-[#ffc733] font-semibold transition-colors"
        >
          Barchasi →
        </Link>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-11 gap-2.5">
        {categories.map((cat) => {
          const Icon = CATEGORY_ICONS[cat.slug] ?? Package;
          return (
            <Link
              key={cat.slug}
              href={`/catalog/${cat.slug}`}
              className="group flex flex-col items-center text-center px-1.5 py-3 rounded-xl bg-[#fffdf7] border border-[#f5b51b]/20 hover:bg-[#f4faf6] hover:border-[#f5b51b] hover:shadow-md hover:-translate-y-0.5 focus-visible:bg-[#f4faf6] focus-visible:border-[#f5b51b] focus-visible:shadow-md focus-visible:-translate-y-0.5 focus-visible:outline-none transition-all duration-200 ease-out"
            >
              <div className="w-10 h-10 rounded-lg bg-[#004733]/8 flex items-center justify-center mb-1.5 group-hover:bg-[#004733]/12 group-focus-visible:bg-[#004733]/12 transition-colors duration-200 ease-out">
                <Icon size={20} className="text-[#004733] transition-colors duration-200 ease-out" />
              </div>
              <p className="text-[11px] font-semibold text-gray-800 leading-tight line-clamp-2 group-hover:text-[#002d21] group-focus-visible:text-[#002d21] transition-colors duration-200 ease-out">
                {cat.name}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">{formatCount(cat.count)}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
