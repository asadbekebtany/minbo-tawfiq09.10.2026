import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { EnvBanner } from "@/components/layout/env-banner";
import { SiteChrome } from "@/components/layout/site-chrome";
import { AppProviders } from "@/components/providers/app-providers";
import { getSiteSettings } from "@/lib/site-settings";
import { getBrandPageTitle } from "@/lib/brand";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const brandTitle = getBrandPageTitle(settings);

  return {
    title: {
      default: brandTitle,
      template: `%s | ${settings.siteName}`,
    },
    description: `${settings.siteName} — ${settings.tagline}. Shinalar, disklar, motor moylari, akkumulyator va boshqa original avtomobil ehtiyot qismlari.`,
    keywords: [
      "shinalar",
      "disklar",
      "avto ehtiyot qismlar",
      "motor moyi",
      settings.siteName,
    ],
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const loggedIn = Boolean(session?.user);

  return (
    <html lang="uz" className="overflow-x-clip">
      <body className="flex min-h-screen max-w-[100vw] flex-col overflow-x-clip bg-[#eef0ea]">
        <AppProviders>
          <EnvBanner />
          <SiteChrome header={<Header loggedIn={loggedIn} />} footer={<Footer />}>
            {children}
          </SiteChrome>
        </AppProviders>
      </body>
    </html>
  );
}
