import Link from "next/link";
import {
  CircleHelp,
  CreditCard,
  RotateCcw,
  ShieldCheck,
  Store,
  Truck,
  Percent,
} from "lucide-react";
import { InfoPage } from "@/components/ui/info-page";

const topics = [
  ["how-to-order", "Buyurtma berish", "Mahsulot tanlashdan tasdiqlashgacha", CircleHelp],
  ["delivery", "Yetkazib berish", "Narxlar, hududlar va muddatlar", Truck],
  ["returns", "Qaytarish", "14 kunlik qaytarish qoidalari", RotateCcw],
  ["payment", "To‘lov", "Payme, Click, karta va naqd", CreditCard],
  ["warranty", "Kafolat", "Original mahsulot va kafolat", ShieldCheck],
  ["commission", "Seller komissiyasi", "Marketplace komissiya qoidalari", Percent],
  ["seller-rules", "Sotuvchi qoidalari", "Marketplace sotuvchilari uchun", Store],
] as const;

export default function HelpPage() {
  return (
    <InfoPage
      title="Yordam markazi"
      description="Buyurtma, yetkazish, qaytarish va sotuvchilik bo‘yicha kerakli ma’lumotlar."
      icon={CircleHelp}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {topics.map(([slug, title, desc, Icon]) => (
          <Link
            href={`/help/${slug}`}
            key={slug}
            className="rounded-2xl border border-[#dfe8e2] p-5 hover:border-[#f5b51b] hover:shadow-lg"
          >
            <Icon className="mb-3 text-[#004733]" />
            <h2 className="font-black text-[#002d21]">{title}</h2>
            <p className="mt-1 text-sm text-gray-500">{desc}</p>
          </Link>
        ))}
      </div>
    </InfoPage>
  );
}
