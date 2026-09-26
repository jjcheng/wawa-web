"use client";

import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "@/lib/toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordStrengthIndicator } from "@/components/password-strength-indicator";
import { PhoneNumberFields } from "@/components/phone-number-fields";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiFetch } from "@/lib/api/client";
import { ApiError, toApiError } from "@/lib/api/errors";
import { createUserSchema, updateUserSchema, type CreateUserInput } from "@/lib/api/schemas";
import type { PhoneNumber, PhoneNumberListResponse, User, UserStatus, UserType } from "@/lib/api/types";
import { formatPhoneNumber } from "@/lib/format";
import { DeleteUserButton } from "./[userId]/delete-user-button";

const USER_TYPES: UserType[] = ["OPERATOR", "MASTER"];
const USER_STATUSES: UserStatus[] = ["ACTIVE", "INACTIVE"];

type FieldErrors = Partial<
  Record<
    "name" | "country_code" | "phone_number" | "email" | "type" | "status" | "description" | "password" | "confirm_password",
    string
  >
>;

export function UserForm({
  user,
  defaultCountryCode,
  initialTab = "profile",
}: {
  user?: User;
  defaultCountryCode?: string;
  initialTab?: "profile" | "assigned-phone-numbers";
}) {
  const router = useRouter();
  const isEditing = Boolean(user);

  const [values, setValues] = useState({
    name: user?.name ?? "",
    countryCode: user?.country_code ?? defaultCountryCode ?? "",
    phoneNumber: user?.phone_number ?? "",
    email: user?.email ?? "",
    type: (user?.type ?? "OPERATOR") as UserType,
    status: (user?.status ?? "ACTIVE") as UserStatus,
    description: user?.description ?? "",
    password: "",
    confirmPassword: "",
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [assignedPhoneNumberIds, setAssignedPhoneNumberIds] = useState<number[]>(
    (user?.assigned_phone_numbers ?? []).map((phoneNumber) => Number(phoneNumber.id)),
  );
  const [activeTab, setActiveTab] = useState(initialTab);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [phoneNumbersLoading, setPhoneNumbersLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadPhoneNumbers() {
      try {
        const response = await apiFetch<PhoneNumber[] | PhoneNumberListResponse>("v1/wa/phone-numbers");
        if (active) setPhoneNumbers(Array.isArray(response) ? response : response.items ?? []);
      } catch (error) {
        if (active) toast.error(toApiError(error).message);
      } finally {
        if (active) setPhoneNumbersLoading(false);
      }
    }

    void loadPhoneNumbers();
    return () => {
      active = false;
    };
  }, []);

  const createMutation = useMutation({
    mutationFn: (input: CreateUserInput) =>
      apiFetch<User>("v1/admin/users", {
        method: "POST",
        body: input,
      }),
    onSuccess: (createdUser: User) => {
      toast.success("User created.");
      router.push(`/users/${createdUser.id}?tab=assigned-phone-numbers`);
    },
    onError: (error) => {
      const apiError = toApiError(error);
      if (apiError instanceof ApiError && apiError.inputErrors.length > 0) {
        setFieldErrors(
          Object.fromEntries(
            apiError.inputErrors.map((inputError) => [inputError.field, inputError.message]),
          ),
        );
        return;
      }
      setSubmitError(apiError.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;

      const nextName = values.name.trim();
      const nextEmail = values.email.trim();
      const nextDescription = values.description.trim();

      await apiFetch(`v1/admin/users/${user.id}`, {
        method: "PATCH",
        body: {
          name: nextName,
          email: nextEmail,
          type: values.type,
          status: values.status,
          description: nextDescription,
        },
      });
    },
    onSuccess: () => {
      toast.success("User updated.");
      router.push("/users");
      router.refresh();
    },
    onError: (error) => {
      const apiError = toApiError(error);
      if (apiError instanceof ApiError && apiError.inputErrors.length > 0) {
        setFieldErrors(
          Object.fromEntries(
            apiError.inputErrors.map((inputError) => [inputError.field, inputError.message]),
          ),
        );
        return;
      }
      setSubmitError(apiError.message);
    },
  });

  const assignPhoneNumbersMutation = useMutation({
    mutationFn: () =>
      apiFetch("v1/admin/assign-phone-numbers", {
        method: "POST",
        body: { user_id: user?.id, phone_number_ids: assignedPhoneNumberIds },
      }),
    onSuccess: () => {
      toast.success("Assigned phone numbers updated.");
      router.refresh();
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  function submitCreate() {
    setSubmitError(null);
    const parsed = createUserSchema.safeParse({
      name: values.name.trim(),
      country_code: values.countryCode.trim(),
      phone_number: values.phoneNumber.trim(),
      email: values.email.trim(),
      type: values.type,
      description: values.description.trim(),
      password: values.password,
      confirm_password: values.confirmPassword,
    });
    if (!parsed.success) {
      setFieldErrors(
        Object.fromEntries(
          parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
        ),
      );
      return;
    }
    setFieldErrors({});
    createMutation.mutate(parsed.data);
  }

  function submitEdit() {
    setSubmitError(null);
    const parsed = updateUserSchema.safeParse({
      name: values.name.trim(),
      email: values.email.trim(),
      type: values.type,
      status: values.status,
      description: values.description.trim(),
    });
    if (!parsed.success) {
      setFieldErrors(
        Object.fromEntries(
          parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
        ),
      );
      return;
    }
    setFieldErrors({});
    updateMutation.mutate();
  }

  function submit() {
    if (isEditing) submitEdit();
    else submitCreate();
  }

  const pending = createMutation.isPending || updateMutation.isPending;
  const isMasterUser = isEditing && user?.type === "MASTER";
  const availablePhoneNumberIds = phoneNumbers.map((phoneNumber) => Number(phoneNumber.id));
  const allPhoneNumbersAssigned =
    availablePhoneNumberIds.length > 0 &&
    availablePhoneNumberIds.every((phoneNumberId) => assignedPhoneNumberIds.includes(phoneNumberId));
  const somePhoneNumbersAssigned =
    !allPhoneNumbersAssigned &&
    availablePhoneNumberIds.some((phoneNumberId) => assignedPhoneNumberIds.includes(phoneNumberId));

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as "profile" | "assigned-phone-numbers")}
      className="max-w-2xl space-y-4"
    >
      <TabsList aria-label="User sections">
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="assigned-phone-numbers" disabled={!isEditing}>
          Assign phone numbers
        </TabsTrigger>
      </TabsList>
      <TabsContent value="profile">
        <Card>
          <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="user-name">Name</Label>
          <Input
            id="user-name"
            value={values.name}
            placeholder="Enter user name"
            onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
          />
          {fieldErrors.name ? <p className="text-destructive text-sm">{fieldErrors.name}</p> : null}
        </div>
        <div className="space-y-2">
          <Label>Phone number</Label>
          <PhoneNumberFields
            countryName="user-country-code"
            phoneName="user-phone"
            countryValue={values.countryCode}
            onCountryChange={(value) => setValues((current) => ({ ...current, countryCode: value }))}
            phoneValue={values.phoneNumber}
            onPhoneChange={(event) =>
              setValues((current) => ({ ...current, phoneNumber: event.target.value }))
            }
            phoneMaxLength={15}
            countryError={fieldErrors.country_code}
            phoneError={fieldErrors.phone_number}
            className={isEditing ? "pointer-events-none opacity-60" : undefined}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="user-email">Email (optional)</Label>
          <Input
            id="user-email"
            type="email"
            placeholder="Enter user email"
            value={values.email}
            onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
          />
          {fieldErrors.email ? <p className="text-destructive text-sm">{fieldErrors.email}</p> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="user-type">Type</Label>
          <Select
            value={values.type}
            onValueChange={(value) => setValues((current) => ({ ...current, type: value as UserType }))}
          >
            <SelectTrigger id="user-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {USER_TYPES.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldErrors.type ? <p className="text-destructive text-sm">{fieldErrors.type}</p> : null}
        </div>
        {isEditing ? (
          <div className="space-y-2">
            <Label htmlFor="user-status">Status</Label>
            <Select
              value={values.status}
              onValueChange={(value) => setValues((current) => ({ ...current, status: value as UserStatus }))}
            >
              <SelectTrigger id="user-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {USER_STATUSES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.status ? <p className="text-destructive text-sm">{fieldErrors.status}</p> : null}
          </div>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="user-description">Description (optional)</Label>
          <Textarea
            id="user-description"
            rows={2}
            placeholder="For your reference"
            value={values.description}
            onChange={(event) =>
              setValues((current) => ({ ...current, description: event.target.value }))
            }
          />
          {fieldErrors.description ? (
            <p className="text-destructive text-sm">{fieldErrors.description}</p>
          ) : null}
        </div>
        {!isEditing ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="user-password">Password</Label>
              <PasswordInput
                id="user-password"
                autoComplete="new-password"
                placeholder="Enter password"
                value={values.password}
                onChange={(event) =>
                  setValues((current) => ({ ...current, password: event.target.value }))
                }
              />
              {fieldErrors.password ? (
                <p className="text-destructive text-sm">{fieldErrors.password}</p>
              ) : null}
              <PasswordStrengthIndicator password={values.password} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-confirm-password">Confirm password</Label>
              <PasswordInput
                id="user-confirm-password"
                autoComplete="new-password"
                placeholder="Enter confirm password"
                value={values.confirmPassword}
                onChange={(event) =>
                  setValues((current) => ({ ...current, confirmPassword: event.target.value }))
                }
              />
              {fieldErrors.confirm_password ? (
                <p className="text-destructive text-sm">{fieldErrors.confirm_password}</p>
              ) : null}
            </div>
          </>
        ) : null}
        {submitError ? <p className="text-destructive text-sm">{submitError}</p> : null}
        <div className="flex justify-start">
          <Button type="button" onClick={submit} disabled={pending || isMasterUser}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {isEditing ? "Save" : "Create"}
          </Button>
        </div>
          </CardContent>
        </Card>
        {user ? (
          <div className="mt-4">
            <DeleteUserButton userId={user.id} userName={user.name} />
          </div>
        ) : null}
      </TabsContent>
      {isEditing ? (
        <TabsContent value="assigned-phone-numbers">
          <div className="space-y-4">
              {phoneNumbersLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin" /></div>
              ) : phoneNumbers.length === 0 ? (
                <p className="text-muted-foreground text-sm">No phone numbers are available.</p>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            checked={allPhoneNumbersAssigned}
                            ref={(element) => {
                              if (element) element.indeterminate = somePhoneNumbersAssigned;
                            }}
                            onChange={(event) => {
                              setAssignedPhoneNumberIds((current) =>
                                event.target.checked
                                  ? [...new Set([...current, ...availablePhoneNumberIds])]
                                  : current.filter((id) => !availablePhoneNumberIds.includes(id)),
                              );
                            }}
                            aria-label="Assign all phone numbers"
                          />
                        </TableHead>
                        <TableHead>WhatsApp name</TableHead>
                        <TableHead>Number</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {phoneNumbers.map((phoneNumber) => {
                        const phoneNumberId = Number(phoneNumber.id);
                        const isAssigned = assignedPhoneNumberIds.includes(phoneNumberId);

                        return (
                          <TableRow key={phoneNumber.id}>
                            <TableCell>
                              <Checkbox
                                checked={isAssigned}
                                onChange={(event) => {
                                  setAssignedPhoneNumberIds((current) =>
                                    event.target.checked
                                      ? [...current, phoneNumberId]
                                      : current.filter((id) => id !== phoneNumberId),
                                  );
                                }}
                                aria-label={`Assign ${phoneNumber.name || "phone number"}`}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{phoneNumber.name || "Unnamed number"}</TableCell>
                            <TableCell>
                              {formatPhoneNumber(phoneNumber.display_phone_number || phoneNumber.phone_number) || "—"}
                            </TableCell>
                            <TableCell>{phoneNumber.status || "—"}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
              <Button
                type="button"
                onClick={() => assignPhoneNumbersMutation.mutate()}
                disabled={assignPhoneNumbersMutation.isPending}
              >
                {assignPhoneNumbersMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Save
              </Button>
          </div>
        </TabsContent>
      ) : null}
    </Tabs>
  );
}
