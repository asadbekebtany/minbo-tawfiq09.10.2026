import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function SearchPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  if (!query) {
    redirect("/catalog");
  }
  redirect(`/catalog?q=${encodeURIComponent(query)}`);
}
