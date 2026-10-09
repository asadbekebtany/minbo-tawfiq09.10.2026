import { ShieldCheck } from "lucide-react";
import { InfoPage, InfoBlocks } from "@/components/ui/info-page";
import { getSiteSettings } from "@/lib/site-settings";
import { getPrivacyContent } from "@/lib/info-pages-content";

export const metadata = { title: "Maxfiylik" };

export default async function Page() {
  const settings = await getSiteSettings();
  return (
    <InfoPage
      title="Maxfiylik siyosati"
      description="Foydalanuvchi ma’lumotlarini himoya qilish tamoyillari."
      icon={ShieldCheck}
    >
      <InfoBlocks blocks={getPrivacyContent(settings)} />
    </InfoPage>
  );
}
