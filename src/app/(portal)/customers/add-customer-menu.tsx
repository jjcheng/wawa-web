"use client";

import { ChevronDown } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { CustomerTagsSelect } from "@/components/customer-tags-select";
import { PhoneNumberFields } from "@/components/phone-number-fields";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import type { Customer, CustomerImportResult } from "@/lib/api/types";
import { MEDIUM_BUTTON_HEIGHT } from "@/lib/utils";

type ImportedContact = {
  id: string;
  displayName: string;
  phoneNumber: string;
  email?: string;
  organization?: string;
  jobTitle?: string;
  birthday?: string;
  address?: string;
  url?: string;
  gender?: string;
  anniversary?: string;
  timeZone?: string;
  uid?: string;
  categories?: string;
  note?: string;
  photo?: string;
};

function decodeVCardValue(value: string, quotedPrintable: boolean) {
  let decoded = value;
  if (quotedPrintable) {
    const bytes: number[] = [];
    for (let index = 0; index < decoded.length; index += 1) {
      if (decoded[index] === "=" && decoded.slice(index + 1, index + 3).length === 2 && !Number.isNaN(Number.parseInt(decoded.slice(index + 1, index + 3), 16))) {
        bytes.push(Number.parseInt(decoded.slice(index + 1, index + 3), 16));
        index += 2;
      } else {
        bytes.push(decoded.charCodeAt(index));
      }
    }
    decoded = new TextDecoder("utf-8").decode(new Uint8Array(bytes));
  }
  return decoded.replace(/\\([\\;,nN])/g, (_, character: string) => character.toLowerCase() === "n" ? "\n" : character);
}

function parseVCardContacts(value: string): ImportedContact[] {
  const unfolded = value.replace(/=\r?\n[ \t]?|\r?\n[ \t]/g, "");
  return unfolded
    .split(/BEGIN:VCARD/i)
    .slice(1)
    .map((card, index): ImportedContact | null => {
      const lines = card.split(/\r?\n/);
      const field = (name: string) => {
        const line = lines.find((value) => {
          const upperValue = value.toUpperCase();
          return upperValue.startsWith(`${name}:`) || upperValue.startsWith(`${name};`);
        });
        if (!line) return undefined;
        const separatorIndex = line.indexOf(":");
        const parameters = line.slice(0, separatorIndex).toUpperCase();
        return decodeVCardValue(line.slice(separatorIndex + 1).trim(), parameters.includes("ENCODING=QUOTED-PRINTABLE"));
      };
      const nameParts = field("N")?.split(";") ?? [];
      const displayName = field("FN") || [nameParts[1], nameParts[0]].filter(Boolean).join(" ");
      const phoneNumber = field("TEL") ?? "";
      const email = field("EMAIL");
      const jobTitle = field("TITLE");
      const birthday = field("BDAY");
      const addressParts = field("ADR")?.split(";").filter(Boolean) ?? [];
      const address = addressParts.join(", ");
      const url = field("URL");
      const gender = field("GENDER");
      const anniversary = field("ANNIVERSARY");
      const timeZone = field("TZ");
      const uid = field("UID");
      const categories = field("CATEGORIES");
      const note = field("NOTE");
      const photo = field("PHOTO");
      if (!displayName && !phoneNumber) return null;
      return {
        id: `${index}-${displayName}-${phoneNumber}`,
        displayName: displayName || "Unnamed contact",
        phoneNumber: phoneNumber || "—",
        email,
        organization: field("ORG"),
        jobTitle,
        birthday,
        address: address || undefined,
        url,
        gender,
        anniversary,
        timeZone,
        uid,
        categories,
        note,
        photo,
      };
    })
    .filter((contact): contact is ImportedContact => contact !== null);
}

export function AddCustomerMenu({ onCreated }: { onCreated?: (customer: Customer) => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [importInfoOpen, setImportInfoOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importedContacts, setImportedContacts] = useState<ImportedContact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [importResult, setImportResult] = useState<CustomerImportResult | null>(null);
  const importMutation = useMutation({
    mutationFn: () => apiFetch<CustomerImportResult>("v1/customers/import", {
      method: "POST",
      body: {
        contacts: importedContacts
          .filter((contact) => selectedContacts.has(contact.id))
          .map((contact) => ({
            display_name: contact.displayName,
            phone_number: contact.phoneNumber,
            email: contact.email,
            address: contact.address,
            organization: contact.organization,
            job_title: contact.jobTitle,
            birthday: contact.birthday,
            anniversary: contact.anniversary,
            gender: contact.gender,
            time_zone: contact.timeZone,
            categories: contact.categories,
            note: contact.note,
            photo: contact.photo,
            url: contact.url,
          })),
      },
    }),
    onSuccess: (result) => {
      if (result.message.trim()) toast.success(result.message);
      setImportResult(result);
      setSelectedContacts(new Set());
      router.refresh();
    },
    onError: (error) => toast.error(toApiError(error).message),
  });
  const allContactsSelected = importedContacts.length > 0 && importedContacts.every((contact) => selectedContacts.has(contact.id));

  function toggleAllContacts(checked: boolean) {
    setSelectedContacts(checked ? new Set(importedContacts.map((contact) => contact.id)) : new Set());
  }
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (importOpen) {
      const handleResize = () => {
        const content = document.querySelector('[data-slot="dialog-content"]') as HTMLElement | null;
        if (content) {
          if (window.innerWidth >= 640) {
            content.style.width = "70vw";
            content.style.maxWidth = "70vw";
          } else {
            content.style.width = "90vw";
            content.style.maxWidth = "90vw";
          }
        }
      };
      handleResize();
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, [importOpen]);

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<Customer>("v1/customers", {
        method: "POST",
        body: {
          display_name: displayName.trim(),
          country_code: countryCode.trim(),
          phone_number: phoneNumber.trim(),
          tags,
        },
      }),
    onSuccess: (customer) => {
      onCreated?.(customer);
      setOpen(false);
      setDisplayName("");
      setCountryCode("");
      setPhoneNumber("");
      setTags([]);
      toast.success("Customer created.");
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className={MEDIUM_BUTTON_HEIGHT}>
            Add Customer
            <ChevronDown className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setOpen(true)}>Create customer</DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              setImportInfoOpen(true);
            }}
          >
            Import customers
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => !mutation.isPending && setOpen(nextOpen)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add customer</DialogTitle>
            <DialogDescription>Add a customer to your account.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="customer-name">Name</Label>
              <Input
                id="customer-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-phone">Phone number</Label>
              <PhoneNumberFields
                countryName="customer-country-code"
                phoneName="customer-phone"
                countryValue={countryCode}
                onCountryChange={setCountryCode}
                phoneValue={phoneNumber}
                onPhoneChange={(event) => setPhoneNumber(event.target.value)}
                phoneMaxLength={13}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-tags">Tags</Label>
              <CustomerTagsSelect
                value={tags}
                onChange={setTags}
                disabled={mutation.isPending}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={
                !displayName.trim() ||
                !countryCode.trim() ||
                !phoneNumber.trim() ||
                mutation.isPending
              }
            >
              {mutation.isPending ? "Adding..." : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={importInfoOpen} onOpenChange={setImportInfoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import customers</DialogTitle>
            <DialogDescription>
              Select a .vcf file exported from the phone book on your iPhone or Android phone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportInfoOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setImportInfoOpen(false);
                importInputRef.current?.click();
              }}
            >
              Choose .vcf file
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <input
        ref={importInputRef}
        type="file"
        accept=".vcf,text/vcard,text/x-vcard"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          void file.text().then((value) => {
            const contacts = parseVCardContacts(value);
            if (contacts.length === 0) {
              toast.error("Could not find contacts in this vCard file.");
              return;
            }
            setImportResult(null);
            setImportedContacts(contacts);
            setSelectedContacts(new Set(contacts.map((contact) => contact.id)));
            setImportOpen(true);
          });
        }}
      />
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent
          className="max-h-[90vh]"
          style={{
            width: "70vw",
            maxWidth: "70vw",
          }}
        >
          <DialogHeader>
            <DialogTitle>Import customers</DialogTitle>
            <DialogDescription>Select the contacts to import.</DialogDescription>
          </DialogHeader>
          {importResult?.message.trim() ? (
            <p className="text-sm">{importResult.message}</p>
          ) : null}
          {importResult && importResult.skipped.length === 0 ? (
            <div className="flex min-h-32 items-center justify-center text-center text-lg font-semibold">
              All contacts imported
            </div>
          ) : null}
          {!importResult ? <div className="max-h-[60vh] overflow-auto">
            <Table containerClassName="overflow-visible">
              <TableHeader>
                <TableRow>
                  <TableHead className="bg-background sticky top-0 left-0 z-30 w-10">
                    <Checkbox
                      checked={allContactsSelected}
                      onChange={(event) => toggleAllContacts(event.target.checked)}
                      aria-label="Select all contacts"
                    />
                  </TableHead>
                  <TableHead className="bg-background sticky top-0 z-20">Name</TableHead>
                  <TableHead className="bg-background sticky top-0 z-20">Phone</TableHead>
                  <TableHead className="bg-background sticky top-0 z-20">Organization</TableHead>
                  <TableHead className="bg-background sticky top-0 z-20">Job Title</TableHead>
                  <TableHead className="bg-background sticky top-0 z-20">Email</TableHead>
                  <TableHead className="bg-background sticky top-0 z-20">Birthday</TableHead>
                  <TableHead className="bg-background sticky top-0 z-20">Address</TableHead>
                  <TableHead className="bg-background sticky top-0 z-20">Gender</TableHead>
                  <TableHead className="bg-background sticky top-0 z-20">Anniversary</TableHead>
                  <TableHead className="bg-background sticky top-0 z-20">Time Zone</TableHead>
                  <TableHead className="bg-background sticky top-0 z-20">Categories</TableHead>
                  <TableHead className="bg-background sticky top-0 z-20">Note</TableHead>
                  <TableHead className="bg-background sticky top-0 z-20">URL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importedContacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell className="bg-background sticky left-0 z-10">
                      <Checkbox
                        checked={selectedContacts.has(contact.id)}
                        onChange={(event) => {
                          setSelectedContacts((current) => {
                            const next = new Set(current);
                            if (event.target.checked) next.add(contact.id);
                            else next.delete(contact.id);
                            return next;
                          });
                        }}
                        aria-label={`Select ${contact.displayName}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{contact.displayName}</TableCell>
                    <TableCell>{contact.phoneNumber}</TableCell>
                    <TableCell>{contact.organization || "—"}</TableCell>
                    <TableCell>{contact.jobTitle || "—"}</TableCell>
                    <TableCell>{contact.email || "—"}</TableCell>
                    <TableCell>{contact.birthday || "—"}</TableCell>
                    <TableCell>{contact.address || "—"}</TableCell>
                    <TableCell>{contact.gender || "—"}</TableCell>
                    <TableCell>{contact.anniversary || "—"}</TableCell>
                    <TableCell>{contact.timeZone || "—"}</TableCell>
                    <TableCell>{contact.categories || "—"}</TableCell>
                    <TableCell className="whitespace-pre-wrap">{contact.note || "—"}</TableCell>
                    <TableCell>{contact.url || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div> : null}
          {importResult?.skipped.length ? (
            <div className="max-h-[30vh] overflow-auto">
              <h3 className="mb-2 text-sm font-medium">Skipped contacts</h3>
              <Table containerClassName="overflow-visible">
                <TableHeader>
                  <TableRow>
                    <TableHead className="bg-background sticky top-0 z-20">Name</TableHead>
                    <TableHead className="bg-background sticky top-0 z-20">Phone</TableHead>
                    <TableHead className="bg-background sticky top-0 z-20">Skip reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importResult.skipped.map((contact, index) => (
                    <TableRow key={`${contact.display_name}-${contact.phone_number}-${index}`}>
                      <TableCell>{contact.display_name || "—"}</TableCell>
                      <TableCell>{contact.phone_number || "—"}</TableCell>
                      <TableCell>{contact.skip_reason || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
          <DialogFooter>
            {importResult ? (
              <Button onClick={() => setImportOpen(false)}>Done</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
                <Button
                  onClick={() => importMutation.mutate()}
                  disabled={selectedContacts.size === 0 || importMutation.isPending}
                >
                  {importMutation.isPending ? "Importing..." : "Import"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
