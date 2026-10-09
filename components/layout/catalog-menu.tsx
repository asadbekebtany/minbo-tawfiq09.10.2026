"use client";

import Link from "next/link";
import { useState, type ComponentType } from "react";
import {
  Armchair,
  Battery,
  Car,
  CircleDot,
  Disc,
  Disc3,
  Droplets,
  Filter,
  Gauge,
  Lightbulb,
  SprayCan,
  Wrench,
  X,
  type LucideProps,
} from "lucide-react";

type CategoryIcon = ComponentType<LucideProps>;

type Category = {
  id: string;
  name: string;
  Icon: CategoryIcon;
  children: string[];
};

const categories: Category[] = [
  {
    id: "shinalar",
    name: "Shinalar",
    Icon: CircleDot,
    children: [
      "Yoz shinalar",
      "Qish shinalar",
      "Hamma mavsum shinalar",
      "4x4 / SUV shinalar",
      "Yuk mashina shinalar",
    ],
  },
  {
    id: "disklar",
    name: "Disklar (Rantlar)",
    Icon: Disc3,
    children: ["Alyumin disklar", "Po'lat disklar", "R13-R15", "R16-R18", "R19+"],
  },
  {
    id: "moylar",
    name: "Motor moylari",
    Icon: Droplets,
    children: ["5W-30", "5W-40", "10W-40", "0W-20", "Transmissiya moylari", "Gidravlik moylar"],
  },
  {
    id: "filtrlar",
    name: "Filtrlar",
    Icon: Filter,
    children: ["Havo filtri", "Moy filtri", "Yoqilg'i filtri", "Salon filtri"],
  },
  {
    id: "akkumulyator",
    name: "Akkumulyatorlar",
    Icon: Battery,
    children: ["45Ah", "55Ah", "60Ah", "74Ah", "90Ah+", "AGM akkumulyator"],
  },
  {
    id: "tormoz",
    name: "Tormoz tizimi",
    Icon: Disc,
    children: ["Tormoz kolodkalar", "Tormoz disklari", "Tormoz shlanglar", "Tormoz suyuqligi"],
  },
  {
    id: "faralar",
    name: "Yoritish",
    Icon: Lightbulb,
    children: ["Old faralar", "Orqa faralar", "Tuman chiroqlari", "LED lampalar", "Xenon"],
  },
  {
    id: "kuzov",
    name: "Kuzov qismlari",
    Icon: Car,
    children: ["Bamperlar", "Qanotlar", "Kapot", "Eshiklar", "Oynalar"],
  },
  {
    id: "salon",
    name: "Salon aksessuarlar",
    Icon: Armchair,
    children: ["Avtomobil gilam", "Chexol", "Rul qoplama", "Organayzer", "Parfyum"],
  },
  {
    id: "elektronika",
    name: "Avtomobil elektronika",
    Icon: Gauge,
    children: ["Registratorlar", "Radar detektorlar", "GPS navigatorlar", "USB zaryadlagich", "Kameralar"],
  },
  {
    id: "kimyo",
    name: "Avtokimyo",
    Icon: SprayCan,
    children: ["Antifrize", "Dvigatel tozalovchi", "Antiskorjina", "Qoplama sprey"],
  },
  {
    id: "asboblar",
    name: "Instrumentlar",
    Icon: Wrench,
    children: ["Gaechni kalitlar", "Domkratlar", "Kompressor", "Vulkanizatsiya", "Diagnostika"],
  },
];

const ICON_SIZE = 20;

interface CatalogMenuProps {
  onClose: () => void;
}

export function CatalogMenu({ onClose }: CatalogMenuProps) {
  const [activeCategory, setActiveCategory] = useState(categories[0]);
  const ActiveIcon = activeCategory.Icon;

  return (
    <div
      className="catalog-panel flex h-full w-full max-h-none flex-col overflow-hidden rounded-none border-0 bg-white shadow-none md:h-auto md:max-h-[min(75vh,720px)] md:flex-row md:rounded-2xl md:border md:border-gray-200/90 md:bg-[#fafafa] md:shadow-[0_12px_40px_rgba(0,0,0,0.12)]"
    >
      {/* Mobile header */}
      <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3 md:hidden">
        <p className="text-base font-bold text-[#002d21]">Katalog</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Yopish"
          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden md:contents">
        {/* Left: categories */}
        <div className="catalog-scroll w-[42%] shrink-0 overflow-y-auto border-r border-gray-200 bg-white md:w-[260px]">
          {categories.map((cat) => {
            const selected = activeCategory.id === cat.id;
            const Icon = cat.Icon;
            return (
              <button
                key={cat.id}
                type="button"
                onMouseEnter={() => setActiveCategory(cat)}
                onFocus={() => setActiveCategory(cat)}
                onClick={() => setActiveCategory(cat)}
                className={`flex h-12 w-full items-center gap-3 border-l-[3px] px-3.5 text-left text-sm transition-colors duration-150 md:h-[48px] ${
                  selected
                    ? "border-l-[#004733] bg-[#eef6f2] font-semibold text-[#004733]"
                    : "border-l-transparent text-gray-600 hover:bg-[#f3f5f4]"
                }`}
              >
                <Icon
                  size={ICON_SIZE}
                  strokeWidth={1.75}
                  className={`shrink-0 ${selected ? "text-[#004733]" : "text-gray-500"}`}
                />
                <span className="line-clamp-1">{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* Right: subcategories */}
        <div className="catalog-scroll min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-white px-4 py-4 md:px-5 md:py-4">
          <div className="mb-3 flex items-center gap-2">
            <ActiveIcon size={18} strokeWidth={1.75} className="shrink-0 text-[#004733]" />
            <h3 className="text-[15px] font-bold text-[#002d21]">{activeCategory.name}</h3>
          </div>

          <div className="grid grid-cols-1 gap-x-4 gap-y-0.5 sm:grid-cols-2 lg:grid-cols-3">
            {activeCategory.children.map((child) => (
              <Link
                key={child}
                href={`/catalog/${activeCategory.id}?sub=${encodeURIComponent(child)}`}
                onClick={onClose}
                className="rounded-md px-2 py-1.5 text-sm text-gray-600 transition-colors duration-150 hover:bg-[#f3f5f4] hover:text-[#004733]"
              >
                {child}
              </Link>
            ))}
          </div>

          <div className="mt-3 border-t border-gray-100 pt-2.5">
            <Link
              href={`/catalog/${activeCategory.id}`}
              onClick={onClose}
              className="inline-flex text-[13px] font-medium text-[#004733] transition-colors hover:text-[#002d21]"
            >
              Barcha {activeCategory.name} →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
