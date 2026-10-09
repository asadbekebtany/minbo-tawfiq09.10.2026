import { ProfileSidebar } from "@/components/profile/profile-sidebar";
import { getUserBonusBalance } from "@/lib/bonus";
import { checkDatabaseConnection } from "@/lib/db";
import { requirePageSession } from "@/lib/page-auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";

export default async function ProfileLayout({ children }: { children: React.ReactNode }) {
  const pathname = (await headers()).get("x-pathname") ?? "/profile";
  const user = await requirePageSession(pathname);
  let name = user.name ?? null;
  let phone = user.phone ?? null;
  let bonusBalance = await getUserBonusBalance(user.id);
  if (await checkDatabaseConnection()) {
      try {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { name: true, phone: true, bonusBalance: true },
        });
        if (dbUser?.name) name = dbUser.name;
        if (dbUser?.phone) phone = dbUser.phone;
        if (typeof dbUser?.bonusBalance === "number") bonusBalance = dbUser.bonusBalance;
      } catch {
        // session qiymatlari
      }
    }

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-6">
      <div className="flex gap-6">
        <aside className="hidden lg:block w-64 shrink-0">
          <ProfileSidebar name={name} phone={phone} bonusBalance={bonusBalance} />
        </aside>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
