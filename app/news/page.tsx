import { Newspaper } from "lucide-react";
import { InfoPage } from "@/components/ui/info-page";
import { BrandInfoContent } from "@/components/brand/brand-info-content";

export default function Page() {
  return (
    <InfoPage
      title="Yangiliklar"
      description="Marketplace yangiliklari va yangi aksiyalar."
      icon={Newspaper}
    >
      <BrandInfoContent />
    </InfoPage>
  );
}
