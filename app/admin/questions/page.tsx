import { AdminQuestionsClient } from "@/components/admin/admin-questions-client";
import { AdminForbidden } from "@/components/admin/admin-forbidden";
import { requireAdminPagePermission } from "@/lib/admin-page-permission";

export const metadata = { title: "Savol-javob" };

export default async function AdminQuestionsPage() {
  const gate = await requireAdminPagePermission("/admin/questions", "questions.view");
  if (gate.forbidden) {
    return <AdminForbidden permission="questions.view" message={gate.message} />;
  }
  return <AdminQuestionsClient />;
}
