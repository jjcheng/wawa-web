import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { EmbeddedSignupButton } from "@/components/whatsapp/embedded-signup-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Connect WhatsApp" };

const STEPS = [
  "Sign in with the Facebook account that owns your business portfolio.",
  "Pick or create a WhatsApp Business Account and business portfolio.",
  "Verify the phone number you want to use for customer conversations.",
  "We finish the setup and assign the number to your WAWAGO CRM account.",
];

export default function ConnectPage() {
  return (
    <>
      <PageHeader
        title="Connect WhatsApp"
        description="Link a WhatsApp Business number through Meta Embedded Signup."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Start onboarding</CardTitle>
            <CardDescription>
              A Meta-hosted dialog opens in a popup. Keep this tab open until it finishes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmbeddedSignupButton />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">What happens</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="text-muted-foreground list-decimal space-y-2 pl-4 text-sm">
              {STEPS.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
