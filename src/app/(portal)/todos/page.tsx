import { redirect } from "next/navigation";

export default async function TodosPage({
  searchParams,
}: PageProps<"/todos">) {
  const params = await searchParams;
  const category = typeof params.category === "string" ? params.category : null;
  redirect(category ? `/tasks?category=${encodeURIComponent(category)}` : "/tasks");
}