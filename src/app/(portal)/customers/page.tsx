import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { mockCustomers } from "@/lib/mock/crm";
import { AddCustomerMenu } from "./add-customer-menu";
import { CustomerList } from "./customer-list";

export const metadata: Metadata = { title: "Customers" };

export default function CustomersPage() {
  return (
    <>
      <PageHeader
        title="Customers"
        description="People who have messaged your WhatsApp Business numbers."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <AddCustomerMenu />
          </div>
        }
      />

      <CustomerList rows={mockCustomers} />
    </>
  );
}
