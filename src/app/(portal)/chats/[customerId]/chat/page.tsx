import { Info, Pencil } from "lucide-react";

import { ApiErrorToast } from "@/components/api-error-toast";
import { BackBar } from "@/components/back-bar";
import { Chat } from "@/components/chat";
import { ChatComposeProvider, type ChatMessage } from "@/components/chat-compose-context";
import { ChatMessageComposer } from "@/components/chat-message-composer";
import { CustomerAgentSwitch } from "@/components/customer-agent-switch";
import { CustomerDetailsButton } from "@/components/customer-details-button";
import { CustomerInfo } from "@/components/customer-info";
import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ApiError, toApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import type { Customer, PhoneNumberListResponse } from "@/lib/api/types";
import { BUSINESS_AGENT_ENABLED } from "@/lib/feature-flags";

type MessageListResponse = {
	items: ChatMessage[];
	number_of_pages: number;
	number_of_items: number;
};

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
	const backHref = typeof returnTo === "string" && returnTo.startsWith("/chats") ? returnTo : "/chats";
	let customer: Customer | null = null;
	let customerLoadError: string | null = null;
	try {
		customer = await serverFetch<Customer>(`/v1/customers/${encodeURIComponent(customerId)}`, {
			query: { id: customerId },
		});
	} catch (error) {
		customerLoadError = toApiError(error).message;
	}

	if (!customer) {
		return (
			<>
				<BackBar href={backHref} />
				<PageHeader title="Customer chat" />
				<ApiErrorToast message={customerLoadError} />
			</>
		);
	}

	let messages: ChatMessage[] = [];
	let numberOfMessagePages = 1;
	let phoneNumberId = "";
	let loadError: string | null = null;
	try {
		const phoneNumbers = await serverFetch<PhoneNumberListResponse>("/v1/wa/phone-numbers", {
			query: { page: "1", page_size: "10" },
		});
		phoneNumberId = phoneNumbers.items[0]?.meta_phone_number_id ?? "";
		if (!phoneNumberId) throw new Error("No WhatsApp phone number is available.");
		const response = await serverFetch<MessageListResponse>("/v1/wa/messages", {
			query: { customer_id: customerId, page: "1", page_size: "50" },
		});
		messages = response.items.sort((first, second) => first.timestamp - second.timestamp);
		numberOfMessagePages = response.number_of_pages;
	} catch (error) {
		loadError = error instanceof ApiError || error instanceof Error ? error.message : "Could not load messages.";
	}

	const showAgentSwitch = BUSINESS_AGENT_ENABLED && Boolean(customer.sending_phone_number?.meta_agent_id?.trim());

	return (
		<>
			<BackBar
				href={backHref}
				actions={
					<div className="flex items-center gap-2">
						{showAgentSwitch ? (
							<CustomerAgentSwitch
								customerId={customer.id}
								initialOn={customer.agent_running === true}
							/>
						) : null}
						<CustomerDetailsButton
							customer={customer}
							startInEditMode
							trigger={
								<Button size="icon" variant="ghost" className="rounded-full bg-muted" aria-label="Edit customer" title="Edit customer">
									<Pencil className="size-4" />
								</Button>
							}
						/>
						<Popover>
							<PopoverTrigger asChild>
								<Button size="icon" variant="ghost" className="rounded-full bg-muted" aria-label="Customer details">
									<Info className="size-4" />
								</Button>
							</PopoverTrigger>
							<PopoverContent align="end" className="w-72 p-3">
								<CustomerInfo customer={customer} />
							</PopoverContent>
						</Popover>
					</div>
				}
			/>
			<PageHeader
				title={customer.display_name}
				description={
					customer.sending_phone_number?.display_phone_number
						? `Sending from: ${customer.sending_phone_number.display_phone_number}`
						: undefined
				}
				titleAction={
					customer.tags?.length ? (
						<div className="flex flex-wrap gap-1.5">
							{customer.tags.map((tag) => (
								<Badge
									key={tag}
									className="h-5 px-1.5 text-[10px] leading-none bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
								>
									{tag}
								</Badge>
							))}
						</div>
					) : null
				}
			/>
			{loadError ? (
				<Alert variant="destructive">
					<AlertDescription>{loadError}</AlertDescription>
				</Alert>
			) : (
				<ChatComposeProvider>
					<Chat
						initialMessages={messages}
						numberOfPages={numberOfMessagePages}
						phoneNumberId={phoneNumberId}
						customerId={customerId}
						customerWAId={customer.bsuid ? undefined : `${customer.country_code}${customer.phone_number}`}
						customerMetaUserId={customer.bsuid}
						recipient={customer.bsuid || `${customer.country_code}${customer.phone_number}`}
					/>
					<ChatMessageComposer
						customerId={customerId}
						messageId={[...messages].reverse().find((message) => !message.sending && message.type !== "reaction")?.id}
					/>
				</ChatComposeProvider>
			)}
		</>
	);
}
