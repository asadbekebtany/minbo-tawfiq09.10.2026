import { BriefcaseBusiness } from "lucide-react";
import { InfoPage } from "@/components/ui/info-page";
import { BrandInfoContent } from "@/components/brand/brand-info-content";
import { getSiteSettings } from "@/lib/site-settings";

export default async function Page() {
  const { siteName } = await getSiteSettings();
  return (
    <InfoPage
      title="Karyera"
      description={`${siteName} jamoasiga qo‘shilish imkoniyatlari.`}
      icon={BriefcaseBusiness}
    >
      <BrandInfoContent />
    </InfoPage>
  );
}
