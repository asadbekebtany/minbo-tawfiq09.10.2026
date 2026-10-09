import { Award } from "lucide-react";
import { InfoPage, InfoBlocks } from "@/components/ui/info-page";
import { getSiteSettings } from "@/lib/site-settings";
import { getAboutContent } from "@/lib/info-pages-content";

export const metadata = { title: "Biz haqimizda" };

export default async function Page() {
  const settings = await getSiteSettings();
  return (
    <InfoPage
      title="Biz haqimizda"
      description={`${settings.siteName} — avtomobil ehtiyot qismlari marketplace’i.`}
      icon={Award}
    >
      <InfoBlocks blocks={getAboutContent(settings)} />
    </InfoPage>
  );
}
