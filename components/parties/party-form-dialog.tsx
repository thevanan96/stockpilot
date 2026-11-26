"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";
import { partySchema, type PartyFormValues } from "@/lib/schemas";
import { useRetained } from "@/hooks/use-retained";
import type { Party } from "@/types";

interface PartyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noun: "customer" | "supplier";
  party?: Party;
  onSubmit: (values: PartyFormValues) => void;
}

export function PartyFormDialog({ open, onOpenChange, noun, party: current, onSubmit }: PartyFormDialogProps) {
  const party = useRetained(open, current);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle>{party ? `Edit ${party.name}` : `New ${noun}`}</DialogTitle>
          <DialogDescription>Contact details used on {noun === "customer" ? "invoices" : "purchase orders"}.</DialogDescription>
        </DialogHeader>
        <PartyForm party={party} onSubmit={onSubmit} onCancel={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function PartyForm({ party, onSubmit, onCancel }: { party?: Party; onSubmit: (v: PartyFormValues) => void; onCancel: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PartyFormValues>({
    resolver: zodResolver(partySchema),
    defaultValues: party ?? { name: "", contactName: "", email: "", phone: "", city: "" },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
        <FormField id="p-name" label="Business name" error={errors.name?.message} className="sm:col-span-2">
          <Input id="p-name" autoFocus aria-invalid={!!errors.name} {...register("name")} />
        </FormField>
        <FormField id="p-contact" label="Contact person" error={errors.contactName?.message}>
          <Input id="p-contact" aria-invalid={!!errors.contactName} {...register("contactName")} />
        </FormField>
        <FormField id="p-city" label="City" error={errors.city?.message}>
          <Input id="p-city" aria-invalid={!!errors.city} {...register("city")} />
        </FormField>
        <FormField id="p-email" label="Email" error={errors.email?.message}>
          <Input id="p-email" type="email" aria-invalid={!!errors.email} {...register("email")} />
        </FormField>
        <FormField id="p-phone" label="Phone" error={errors.phone?.message}>
          <Input id="p-phone" type="tel" aria-invalid={!!errors.phone} {...register("phone")} />
        </FormField>
      </div>
      <DialogFooter className="m-0 rounded-b-xl px-5 py-3.5">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{party ? "Save changes" : "Create"}</Button>
      </DialogFooter>
    </form>
  );
}
