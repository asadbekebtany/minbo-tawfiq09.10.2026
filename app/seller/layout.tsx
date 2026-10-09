import { headers } from "next/headers";
import { SellerSidebar } from "@/components/seller/seller-sidebar";
import { requireSellerPage } from "@/lib/page-auth";

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  const pathname = (await headers()).get("x-pathname") ?? "";
  if (pathname === "/seller/register" || pathname.startsWith("/seller/register")) {
    return <>{children}</>;
  }

  if (pathname.startsWith("/seller")) {
    await requireSellerPage(pathname);
  }

  return (
    <div className="flex min-h-screen max-w-[100vw] overflow-x-clip bg-gray-50">
      <SellerSidebar />
      <main className="min-w-0 flex-1 overflow-x-clip p-4 pl-14 lg:p-6">{children}</main>
    </div>
  );
}
