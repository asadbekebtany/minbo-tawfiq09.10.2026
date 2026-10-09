import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import type { InfoBlock } from "@/lib/info-pages-content";

export function InfoBlocks({ blocks }: { blocks: InfoBlock[] }) {
  return (
    <div className="space-y-8">
      {blocks.map((block, i) => (
        <div key={block.heading ?? i} className="space-y-3">
          {block.heading ? (
            <h2 className="text-lg font-black text-[#002d21]">{block.heading}</h2>
          ) : null}
          {block.paragraphs?.map((p) => (
            <p key={p} className="text-sm leading-7 text-gray-600">
              {p}
            </p>
          ))}
          {block.bullets?.length ? (
            <ul className="space-y-2">
              {block.bullets.map((item, idx) => (
                <li
                  key={item}
                  className="flex gap-3 rounded-2xl bg-[#f6f8f5] p-4 text-sm text-gray-700"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#002d21] text-xs font-bold text-[#f5b51b]">
                    {idx + 1}
                  </span>
                  <span className="pt-1">{item}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function InfoPage({
  title,
  description,
  icon: Icon,
  children,
  backHref = "/",
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  children?: React.ReactNode;
  backHref?: string;
}) {
  return (
    <div className="min-h-[65vh] bg-[#f2f4ef] py-10">
      <div className="mx-auto max-w-5xl px-4">
        <Link
          href={backHref}
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#004733] hover:text-[#002d21]"
        >
          <ArrowLeft size={16} />
          Orqaga
        </Link>
        <section className="overflow-hidden rounded-[28px] border border-[#f5b51b]/25 bg-white shadow-[0_20px_60px_rgba(0,45,33,.09)]">
          <div className="border-b border-[#f5b51b]/30 bg-green-ornament px-6 py-8 text-white md:px-10">
            <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-[#f5b51b]/35 bg-[#f5b51b]/12">
              <Icon className="text-[#f5b51b]" />
            </div>
            <h1 className="text-3xl font-black">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#d9e1dc]">{description}</p>
          </div>
          <div className="p-6 md:p-10">{children}</div>
        </section>
      </div>
    </div>
  );
}
