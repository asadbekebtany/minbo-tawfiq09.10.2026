"use client";

import { usePathname } from "next/navigation";

/** Do‘kon header/footer ko‘rinmasligi kerak bo‘lgan panellar */
const PANEL_PREFIXES = ["/admin", "/super-admin", "/seller", "/pvz"];

export function SiteChrome({
  header,
  footer,
  children,
}: {
  header: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isPanel = PANEL_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isPanel) {
    return <main className="flex-1">{children}</main>;
  }

  return (
    <>
      {header}
      <main className="flex-1">{children}</main>
      {footer}
    </>
  );
}
