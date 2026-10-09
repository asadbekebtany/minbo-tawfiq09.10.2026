import { redirect } from "next/navigation";
import { SuperAdminLoginClient } from "@/components/super-admin/super-admin-login-client";
import { isSuperAdminSession } from "@/lib/demo-staff";
import { getPageSessionUser } from "@/lib/page-auth";

export const metadata = { title: "Super Admin kirish" };

export default async function SuperAdminLoginPage() {
  const user = await getPageSessionUser();
  if (user && isSuperAdminSession(user)) {
    redirect("/super-admin/dashboard");
  }

  return <SuperAdminLoginClient />;
}
