import { getSiteSettings } from "@/lib/site-settings";
import { injectBrand } from "@/lib/brand";

type BrandInfoContentProps = {
  intro?: string;
  showCmsNote?: boolean;
};

export async function BrandInfoContent({
  intro,
  showCmsNote = true,
}: BrandInfoContentProps) {
  const settings = await getSiteSettings();
  const lead =
    intro ??
    `${settings.siteName} platformasi xavfsiz, qulay va shaffof savdo tajribasini yaratish uchun rivojlantirilmoqda.`;

  return (
    <div className="space-y-4 text-sm leading-7 text-gray-600">
      <p>{injectBrand(lead, settings.siteName)}</p>
      {showCmsNote ? (
        <p>
          Ushbu bo‘lim admin CMS bilan bog‘langanda matnlar kodga kirmasdan
          boshqariladi.
        </p>
      ) : null}
      <div className="rounded-2xl border border-[#f5b51b]/25 bg-[#fff8df] p-5 text-[#5d4700]">
        Qo‘shimcha ma’lumot uchun: <b>{settings.email}</b> ·{" "}
        <b>{settings.phone}</b>
      </div>
    </div>
  );
}
