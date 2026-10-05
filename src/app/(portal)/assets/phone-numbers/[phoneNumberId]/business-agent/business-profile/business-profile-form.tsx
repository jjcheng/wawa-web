"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import { toast } from "@/lib/toast";

type BusinessInfo = {
  payment_method: string;
  return_policy: string;
  purchase_info: string;
  delivery_and_shipping: string;
  business_description: string;
  contact_info: {
    email: string;
    hours_of_operation: string;
    address: string;
  };
};

const EMPTY_BUSINESS_INFO: BusinessInfo = {
  payment_method: "",
  return_policy: "",
  purchase_info: "",
  delivery_and_shipping: "",
  business_description: "",
  contact_info: { email: "", hours_of_operation: "", address: "" },
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function BusinessProfileForm({ phoneNumberId }: { phoneNumberId: number }) {
  const [businessInfo, setBusinessInfo] = useState(EMPTY_BUSINESS_INFO);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);

  const email = businessInfo.contact_info.email.trim();
  const emailError = email && !EMAIL_PATTERN.test(email) ? "Enter a valid email address." : null;
  const showEmailError = emailTouched && emailError;

  useEffect(() => {
    let active = true;

    async function loadBusinessInfo() {
      try {
        const response = await apiFetch<BusinessInfo>("v1/wa/business-agent/business-info", {
          query: { phone_number_id: String(phoneNumberId) },
        });
        if (active) {
          setBusinessInfo({
            ...EMPTY_BUSINESS_INFO,
            ...response,
            contact_info: {
              ...EMPTY_BUSINESS_INFO.contact_info,
              ...response.contact_info,
            },
          });
        }
      } catch (error) {
        if (active) setLoadError(toApiError(error).message);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadBusinessInfo();
    return () => {
      active = false;
    };
  }, [phoneNumberId]);

  function updateField(field: Exclude<keyof BusinessInfo, "contact_info">, value: string) {
    setBusinessInfo((current) => ({ ...current, [field]: value }));
  }

  function updateContactField(field: keyof BusinessInfo["contact_info"], value: string) {
    setBusinessInfo((current) => ({
      ...current,
      contact_info: { ...current.contact_info, [field]: value },
    }));
  }

  async function saveBusinessInfo() {
    if (saving) return;
    if (emailError) {
      setEmailTouched(true);
      return;
    }
    setSaving(true);
    try {
      await apiFetch("v1/wa/business-agent/business-info", {
        method: "PUT",
        query: { phone_number_id: String(phoneNumberId) },
        body: {
          ...businessInfo,
          contact_info: { ...businessInfo.contact_info, email },
        },
      });
      toast.success("Business profile saved.");
    } catch (error) {
      toast.error(toApiError(error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="text-muted-foreground size-5 animate-spin" />
      </div>
    );
  }

  if (loadError) return <p className="text-destructive text-sm">{loadError}</p>;

  return (
    <div className="bg-card rounded-xl border">
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">
          Business description
          <Textarea rows={3} placeholder="We are a retail company specializing in home goods" value={businessInfo.business_description} onChange={(event) => updateField("business_description", event.target.value)} />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Payment method
          <Textarea rows={2} value={businessInfo.payment_method} placeholder="We accept Visa, Mastercard, and PayPal" onChange={(event) => updateField("payment_method", event.target.value)} />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Return policy
          <Textarea rows={2} value={businessInfo.return_policy} placeholder="30-day return policy for unused items" onChange={(event) => updateField("return_policy", event.target.value)} />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Purchase info
          <Textarea rows={2} placeholder="Order online or visit our stores" value={businessInfo.purchase_info} onChange={(event) => updateField("purchase_info", event.target.value)} />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Delivery and shipping
          <Textarea rows={2} placeholder="Free shipping on orders over $50" value={businessInfo.delivery_and_shipping} onChange={(event) => updateField("delivery_and_shipping", event.target.value)} />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Email
          <Input
            type="email"
            placeholder="Enter your email"
            value={businessInfo.contact_info.email}
            aria-invalid={showEmailError ? true : undefined}
            aria-describedby={showEmailError ? "business-contact-email-error" : undefined}
            onBlur={() => setEmailTouched(true)}
            onChange={(event) => updateContactField("email", event.target.value)}
          />
          {showEmailError ? (
            <span id="business-contact-email-error" className="text-destructive text-xs font-normal">
              {emailError}
            </span>
          ) : null}
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Hours of operation
          <Input placeholder="Mon-Fri 9am-5pm" value={businessInfo.contact_info.hours_of_operation} onChange={(event) => updateContactField("hours_of_operation", event.target.value)} />
        </label>
        <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">
          Address
          <Textarea placeholder="Enter store address" rows={2} value={businessInfo.contact_info.address} onChange={(event) => updateContactField("address", event.target.value)} />
        </label>
      </div>
      <div className="flex justify-start px-5 pb-5">
        <Button type="button" onClick={() => void saveBusinessInfo()} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          Save
        </Button>
      </div>
    </div>
  );
}
