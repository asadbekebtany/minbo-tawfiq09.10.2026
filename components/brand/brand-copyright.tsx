import { getSiteSettings } from "@/lib/site-settings";
import { getCopyrightText } from "@/lib/brand";

export async function BrandCopyright() {
  const { siteName } = await getSiteSettings();
  return (
    <p>{getCopyrightText(siteName)}</p>
  );
}
