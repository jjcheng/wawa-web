import { ChatPanel } from "@/components/chat-panel";

export default async function CustomerChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ customerId: string }>;
  searchParams: Promise<{
    identity?: string | string[];
    return_to?: string | string[];
  }>;
}) {
  const { customerId } = await params;
  const { return_to: returnTo } = await searchParams;
  const backHref =
    typeof returnTo === "string" && returnTo.startsWith("/chats") ? returnTo : "/chats";
  return <ChatPanel customerId={customerId} backHref={backHref} />;
}
