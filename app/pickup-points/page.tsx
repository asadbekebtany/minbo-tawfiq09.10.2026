import { Clock, MapPin, Phone } from "lucide-react";
import { InfoPage } from "@/components/ui/info-page";
import { listActivePickupPoints } from "@/lib/pickup-points";
import { getSiteSettings } from "@/lib/site-settings";

export default async function PickupPointsPage() {
  const [{ siteName, phone }, points] = await Promise.all([
    getSiteSettings(),
    listActivePickupPoints(),
  ]);

  return (
    <InfoPage
      title="Olish punktlari"
      description={`Buyurtmangizni qulay ${siteName} pickup point’dan olib keting.`}
      icon={MapPin}
    >
      {points.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#cbd8d0] bg-[#f7f9f6] p-10 text-center text-gray-500">
          Hozircha olish punkti yo‘q.
        </div>
      ) : (
      <div className="grid gap-4 md:grid-cols-3">
        {points.map((point) => (
          <article
            key={point.id}
            className="rounded-2xl border border-[#dfe8e2] bg-[#fffdf7] p-5"
          >
            <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-[#002d21] text-[#f5b51b]">
              <MapPin size={20} />
            </div>
            <h2 className="font-black text-[#002d21]">{point.name}</h2>
            <p className="mt-2 text-sm text-gray-600">{point.address}</p>
            {point.district && (
              <p className="mt-1 text-xs text-gray-500">{point.city}, {point.district}</p>
            )}
            {point.workHours && (
              <p className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                <Clock size={14} />
                {point.workHours}
              </p>
            )}
            <p className="mt-2 flex items-center gap-2 text-xs text-gray-500">
              <Phone size={14} />
              {point.phone ?? phone}
            </p>
          </article>
        ))}
      </div>
      )}
    </InfoPage>
  );
}
