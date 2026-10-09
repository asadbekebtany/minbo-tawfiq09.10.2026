import { notFound } from "next/navigation";
import { CircleHelp } from "lucide-react";
import { InfoPage, InfoBlocks } from "@/components/ui/info-page";
import { HELP_ARTICLES } from "@/lib/info-pages-content";
import { getSiteSettings } from "@/lib/site-settings";
import { injectBrand } from "@/lib/brand";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = HELP_ARTICLES[slug];
  return { title: page?.title ?? "Yordam" };
}

export default async function HelpArticle({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = HELP_ARTICLES[slug];
  if (!page) notFound();

  const { siteName } = await getSiteSettings();

  return (
    <InfoPage
      title={page.title}
      description={injectBrand(page.description, siteName)}
      icon={CircleHelp}
      backHref="/help"
    >
      <InfoBlocks blocks={page.blocks} />
    </InfoPage>
  );
}
