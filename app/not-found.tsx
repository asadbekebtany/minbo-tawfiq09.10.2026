import Link from "next/link";
import { Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-6 grid h-20 w-20 place-items-center rounded-2xl border border-[#f5b51b]/30 bg-[#002d21] text-3xl font-black text-[#f5b51b]">
        404
      </div>
      <h1 className="text-2xl font-black text-[#002d21]">Sahifa topilmadi</h1>
      <p className="mt-3 text-sm leading-6 text-gray-600">
        Siz qidirayotgan sahifa o‘chirilgan, nomi o‘zgartirilgan yoki vaqtincha
        mavjud emas.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-[#f5b51b] to-[#e0a40d] px-5 py-2.5 text-sm font-bold text-[#002d21]"
        >
          <Home size={16} />
          Bosh sahifa
        </Link>
        <Link
          href="/catalog"
          className="inline-flex items-center gap-2 rounded-xl border border-[#004733]/20 px-5 py-2.5 text-sm font-semibold text-[#004733] hover:bg-[#004733]/5"
        >
          <Search size={16} />
          Katalog
        </Link>
      </div>
    </div>
  );
}
