import { redirect } from "next/navigation";

export default async function CustomerChatPage({
  params,
  searchParams,
}: PageProps<"/customers/[customerId]/chat">) {
  const [{ customerId }, query] = await Promise.all([params, searchParams]);
  const destination = new URLSearchParams();
  if (typeof query.identity === "string") destination.set("identity", query.identity);
  if (typeof query.return_to === "string") destination.set("return_to", query.return_to);
  const queryString = destination.toString();
  redirect(`/chats/${encodeURIComponent(customerId)}/chat${queryString ? `?${queryString}` : ""}`);
}