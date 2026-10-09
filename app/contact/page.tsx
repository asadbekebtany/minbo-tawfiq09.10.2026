import { Phone } from "lucide-react";
import { InfoPage, InfoBlocks } from "@/components/ui/info-page";
import { getSiteSettings } from "@/lib/site-settings";
import { getContactContent } from "@/lib/info-pages-content";

export const metadata = { title: "Aloqa" };

export default async function Page() {
  const settings = await getSiteSettings();
  return (
    <InfoPage
      title="Aloqa"
      description="Savol va takliflaringiz uchun biz bilan bog‘laning."
      icon={Phone}
    >
      <InfoBlocks blocks={getContactContent(settings)} />
    </InfoPage>
  );
}
