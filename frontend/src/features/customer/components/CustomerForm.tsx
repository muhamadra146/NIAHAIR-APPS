import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { customerSchema, type CustomerFormValues } from "../schemas/customer.schema";
import type { Customer } from "../types";

interface CustomerFormProps {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit:     (values: CustomerFormValues) => void;
  isPending:    boolean;
  defaultValues?: Partial<Customer>;
  title:        string;
  error?:       string | null;
}

export function CustomerForm({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  defaultValues,
  title,
  error,
}: CustomerFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name:        defaultValues?.name ?? "",
      mobilePhone: defaultValues?.mobilePhone ?? "",
      email:       defaultValues?.email ?? "",
      gender:      defaultValues?.gender ?? "",
      birthDate:   defaultValues?.birthDate?.split("T")[0] ?? "",
      address:     defaultValues?.address ?? "",
      city:        defaultValues?.city ?? "",
      province:    defaultValues?.province ?? "",
      notes:       defaultValues?.notes ?? "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name:        defaultValues?.name ?? "",
        mobilePhone: defaultValues?.mobilePhone ?? "",
        email:       defaultValues?.email ?? "",
        gender:      defaultValues?.gender ?? "",
        birthDate:   defaultValues?.birthDate?.split("T")[0] ?? "",
        address:     defaultValues?.address ?? "",
        city:        defaultValues?.city ?? "",
        province:    defaultValues?.province ?? "",
        notes:       defaultValues?.notes ?? "",
      });
    }
  }, [open, defaultValues, reset]);

  function handleFormSubmit(values: CustomerFormValues) {
    onSubmit({
      ...values,
      mobilePhone: values.mobilePhone || undefined,
      email:       values.email || undefined,
      gender:      values.gender || undefined,
      birthDate:   values.birthDate || undefined,
      address:     values.address || undefined,
      city:        values.city || undefined,
      province:    values.province || undefined,
      notes:       values.notes || undefined,
    } as CustomerFormValues);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/*
        Mobile: full-screen (top-0, translate-y-0, h-full, rounded-none)
        Desktop: centered modal (max-w-lg, rounded-lg)
      */}
      <DialogContent
        className={cn(
          "flex flex-col gap-0 p-0",
          // mobile full-screen
          "top-0 translate-y-0 rounded-none h-[100dvh] max-w-full",
          // desktop centred modal
          "sm:top-[50%] sm:translate-y-[-50%] sm:rounded-lg sm:h-auto sm:max-w-lg sm:max-h-[90dvh]"
        )}
      >
        <DialogHeader className="shrink-0 border-b border-border px-4 py-4 sm:px-6">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="flex flex-1 flex-col overflow-hidden"
        >
          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            {error && (
              <div className="mb-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input id="name" {...register("name")} placeholder="Full name" />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mobilePhone">Phone</Label>
                <Input id="mobilePhone" {...register("mobilePhone")} placeholder="08123456789" inputMode="tel" />
                {errors.mobilePhone && (
                  <p className="text-xs text-destructive">{errors.mobilePhone.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" inputMode="email" {...register("email")} placeholder="email@example.com" />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="gender">Gender</Label>
                <select
                  id="gender"
                  {...register("gender")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">— Select gender —</option>
                  <option value="FEMALE">Female</option>
                  <option value="MALE">Male</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="birthDate">Birth Date</Label>
                <Input id="birthDate" type="date" {...register("birthDate")} />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="address">Address</Label>
                <Input id="address" {...register("address")} placeholder="Street address" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="city">City</Label>
                <Input id="city" {...register("city")} placeholder="City" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="province">Province</Label>
                <Input id="province" {...register("province")} placeholder="Province" />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  {...register("notes")}
                  rows={3}
                  placeholder="Additional notes..."
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Sticky footer */}
          <DialogFooter className="shrink-0 border-t border-border px-4 py-4 sm:px-6">
            <Button
              type="button"
              variant="outline"
              className="flex-1 sm:flex-none"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1 sm:flex-none" disabled={isPending}>
              {isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
