import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LoginClient } from "@/components/auth/login-client";
import { getPageSessionUser } from "@/lib/page-auth";
import { loginMustReauthenticate, postLoginPath } from "@/lib/post-login-path";

export const metadata = { title: "Kirish" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const user = await getPageSessionUser();
  const { from } = await searchParams;
  if (user && !loginMustReauthenticate(user.role, from)) {
    redirect(postLoginPath(user.role, from));
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <Suspense fallback={<p className="text-sm text-gray-500">Yuklanmoqda...</p>}>
        <LoginClient />
      </Suspense>
    </div>
  );
}
