import { Suspense } from "react";
import { requirePvzPage } from "@/lib/page-auth";
import { PvzDeskClient } from "@/components/pvz/pvz-desk-client";

export const metadata = { title: "PVZ operator" };

export default async function PvzPage() {
  await requirePvzPage("/pvz");
  return (
    <Suspense fallback={<p className="px-4 py-8 text-sm text-gray-500">Yuklanmoqda...</p>}>
      <PvzDeskClient />
    </Suspense>
  );
}
