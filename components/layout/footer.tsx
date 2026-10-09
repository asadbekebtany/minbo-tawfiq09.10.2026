import Link from "next/link";
import { Mail, MapPin, Phone, Send } from "lucide-react";
import { BrandEmblem, BrandName } from "@/components/brand/brand-logo";
import { BrandCopyright } from "@/components/brand/brand-copyright";
import { getSiteSettings } from "@/lib/site-settings";

const columns = [
  { title: "Xaridor uchun", items: [["Qanday buyurtma berish", "/help/how-to-order"], ["Yetkazib berish", "/help/delivery"], ["Qaytarish", "/help/returns"], ["To‘lov usullari", "/help/payment"], ["Kafolat", "/help/warranty"]] },
  { title: "Sotuvchi uchun", items: [["Sotuvchi bo‘lish", "/seller/register"], ["Seller panel", "/seller/dashboard"], ["Komissiya", "/help/commission"], ["Sotuvchi qoidalari", "/help/seller-rules"]] },
  { title: "Kompaniya", items: [["Biz haqimizda", "/about"], ["Aloqa", "/contact"], ["Maxfiylik", "/privacy"], ["Foydalanish shartlari", "/terms"]] },
];

export async function Footer() {
  const { phone, email, address, siteShortName } = await getSiteSettings();
  const phoneDigits = phone.replace(/\D/g, "");
  const telegramHandle = `@${siteShortName.toLowerCase()}`;

  return (
    <footer className="mt-16 border-t-2 border-[#f5b51b]/30 bg-[#001d15] pb-20 text-[#cdd6cf] md:pb-0">
      <div className="bg-ikat h-3 opacity-80" />
      <div className="mx-auto max-w-[1280px] px-4 py-11">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="mb-4 flex items-center gap-2.5">
              <BrandEmblem className="h-10 w-10" />
              <BrandName className="text-xl" />
            </Link>
            <p className="mb-4 text-sm leading-6 text-[#9caaa3]">
              O‘zbekistondagi avtomobil ehtiyot qismlari, shinalar va disklar marketplace’i.
            </p>
            <div className="flex gap-2">
              <a
                href={`https://t.me/${siteShortName.toLowerCase()}`}
                className="grid h-9 w-9 place-items-center rounded-full bg-white/8 hover:bg-[#f5b51b] hover:text-[#002d21]"
              >
                T
              </a>
              <a href="#" className="grid h-9 w-9 place-items-center rounded-full bg-white/8 hover:bg-[#f5b51b] hover:text-[#002d21]">
                I
              </a>
              <a href="#" className="grid h-9 w-9 place-items-center rounded-full bg-white/8 hover:bg-[#f5b51b] hover:text-[#002d21]">
                F
              </a>
            </div>
          </div>
          {columns.map((column) => (
            <div key={column.title}>
              <h4 className="mb-4 text-sm font-bold text-white">{column.title}</h4>
              <ul className="space-y-2.5 text-sm">
                {column.items.map(([label, href]) => (
                  <li key={href}>
                    <Link href={href} className="hover:text-[#f5b51b]">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h4 className="mb-4 text-sm font-bold text-white">Aloqa</h4>
            <div className="space-y-3 text-sm">
              <a className="flex items-center gap-2 hover:text-[#f5b51b]" href={`tel:+${phoneDigits}`}>
                <Phone size={14} className="text-[#f5b51b]" />
                {phone}
              </a>
              <a
                className="flex items-center gap-2 hover:text-[#f5b51b]"
                href={`https://t.me/${siteShortName.toLowerCase()}`}
              >
                <Send size={14} className="text-[#f5b51b]" />
                {telegramHandle}
              </a>
              <a className="flex items-center gap-2 hover:text-[#f5b51b]" href={`mailto:${email}`}>
                <Mail size={14} className="text-[#f5b51b]" />
                {email}
              </a>
              <p className="flex items-start gap-2 text-xs text-[#9caaa3]">
                <MapPin size={14} className="mt-0.5 shrink-0 text-[#f5b51b]" />
                {address}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-9 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-[#73847c] md:flex-row">
          <BrandCopyright />
          <div className="flex gap-4">
            <span>Payme</span>
            <span>Click</span>
            <span>Naqd</span>
            <span>Karta</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
