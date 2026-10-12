import type { Customer } from "@/lib/api/types";
import type { IncomingChatMessage } from "@/components/phone-number-messages-provider";

export type CustomerNotification = {
  message: IncomingChatMessage;
  receivedAt: string;
  order: number;
  read?: boolean;
};

/** Keep notification order even when customer-detail requests finish out of order. */
export function applyCustomerNotification(
  customers: Customer[],
  customerId: number,
  notifications: ReadonlyMap<number, CustomerNotification>,
  status: "ACTIVE" | "INACTIVE",
  selectedTags: string[],
  loadedCustomer?: Customer,
): Customer[] {
  const notification = notifications.get(customerId);
  const customer = customers.find((row) => row.id === customerId) ?? loadedCustomer;
  if (!notification || !customer) return customers;
  if (customer.status !== status || !selectedTags.every((tag) => customer.tags?.includes(tag))) {
    return customers;
  }
  const updated = {
    ...customer,
    latest_message_content: notification.message.notification_content,
    latest_message_timestamp: notification.receivedAt,
    latest_message_read: notification.read ?? notification.message.sending === true,
  };
  return [updated, ...customers.filter((row) => row.id !== customerId)].sort(
    (first, second) =>
      (notifications.get(second.id)?.order ?? 0) - (notifications.get(first.id)?.order ?? 0),
  );
}
