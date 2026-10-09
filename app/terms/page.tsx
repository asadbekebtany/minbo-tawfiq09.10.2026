import { FileText } from "lucide-react";
import { InfoPage, InfoBlocks } from "@/components/ui/info-page";
import { getSiteSettings } from "@/lib/site-settings";
import { getTermsContent } from "@/lib/info-pages-content";

export const metadata = { title: "Foydalanish shartlari" };

export default async function Page() {
  const settings = await getSiteSettings();
  return (
    <InfoPage
      title="Foydalanish shartlari"
      description="Marketplace’dan foydalanishning asosiy qoidalari."
      icon={FileText}
    >
      <InfoBlocks blocks={getTermsContent(settings)} />
    </InfoPage>
  );
}
