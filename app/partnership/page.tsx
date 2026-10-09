import { Handshake } from "lucide-react";
import { InfoPage } from "@/components/ui/info-page";
import { BrandInfoContent } from "@/components/brand/brand-info-content";

export default function Page() {
  return (
    <InfoPage
      title="Hamkorlik"
      description="Brendlar, distribyutorlar va logistika hamkorlari uchun."
      icon={Handshake}
    >
      <BrandInfoContent />
    </InfoPage>
  );
}
