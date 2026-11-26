"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { addDays } from "date-fns";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/shared/combobox";
import { DatePicker } from "@/components/shared/date-picker";
import { EntityAvatar } from "@/components/shared/entity-avatar";
import { FormField } from "@/components/shared/form-field";
import { DocumentFormLayout, DocumentSummary, FormCard } from "@/components/documents/document-form-layout";
import { LineItemsEditor } from "@/components/documents/line-items-editor";
import { FormPageSkeleton } from "@/components/documents/form-page-skeleton";
import { suggestedReorderQty } from "@/lib/domain";
import { docNumber } from "@/lib/id";
import { purchaseSchema, type PurchaseFormValues } from "@/lib/schemas";
import { useItemsWithStock } from "@/store/hooks";
import { useInventoryStore } from "@/store/inventory-store";
import { useHydrated } from "@/store/use-hydrated";
import type { ItemWithStock } from "@/types";

export function NewPurchaseView() {
  const hydrated = useHydrated();
  const prefillId = useSearchParams().get("item");
  if (!hydrated) return <FormPageSkeleton title="New purchase order" />;
  // Keyed so arriving with a different ?item= starts a fresh form.
  return <PurchaseForm key={prefillId ?? "blank"} prefillId={prefillId} />;
}

function defaults(prefill: ItemWithStock | undefined): PurchaseFormValues {
  const today = new Date();
  return {
    supplierId: prefill?.preferredSupplierId ?? "",
    date: today.toISOString(),
    expectedDate: addDays(today, 7).toISOString(),
    lines: [
      prefill
        ? { itemId: prefill.id, qty: suggestedReorderQty(prefill.quantity, prefill.minLevel), unitPrice: prefill.costPrice }
        : { itemId: "", qty: 1, unitPrice: 0 },
    ],
    notes: "",
  };
}

function PurchaseForm({ prefillId }: { prefillId: string | null }) {
  const router = useRouter();
  const items = useItemsWithStock();
  const suppliers = useInventoryStore((s) => s.suppliers);
  const nextNumber = useInventoryStore((s) => docNumber("PO", s.counters.po + 1));
  const createPurchase = useInventoryStore((s) => s.createPurchase);
  const prefill = items.find((i) => i.id === prefillId);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PurchaseFormValues>({ resolver: zodResolver(purchaseSchema), defaultValues: defaults(prefill) });

  const [supplierId, lines] = useWatch({ control, name: ["supplierId", "lines"] });
  const supplier = suppliers.find((s) => s.id === supplierId);

  const onSubmit = handleSubmit((values) => {
    const result = createPurchase(values);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`${result.data.number} created`, { description: "Mark it as received when the goods arrive." });
    reset(defaults(undefined));
    router.push(`/purchases?po=${result.data.id}`);
  });

  return (
    <DocumentFormLayout
      backHref="/purchases"
      backLabel="Purchases"
      title="New purchase order"
      number={nextNumber}
      onSubmit={onSubmit}
      summary={
        <DocumentSummary
          partyLabel="Supplier"
          partyName={supplier?.name}
          lines={lines}
          actions={
            <>
              <Button type="submit" size="lg" disabled={isSubmitting}>
                Create purchase order
              </Button>
              <Button type="button" variant="ghost" onClick={() => router.push("/purchases")}>
                Cancel
              </Button>
            </>
          }
          footnote="Stock increases only when the PO is marked as received."
        />
      }
    >
      <FormCard title="Order details">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="supplier" label="Supplier" error={errors.supplierId?.message} className="sm:col-span-2">
            <Controller
              control={control}
              name="supplierId"
              render={({ field }) => (
                <Combobox
                  id="supplier"
                  value={field.value}
                  onChange={field.onChange}
                  invalid={!!errors.supplierId}
                  placeholder="Choose a supplier"
                  searchPlaceholder="Search suppliers…"
                  options={suppliers.map((s) => ({
                    value: s.id,
                    label: s.name,
                    keywords: [s.city, s.contactName],
                    meta: s.city,
                    leading: <EntityAvatar name={s.name} size="xs" />,
                  }))}
                />
              )}
            />
          </FormField>
          <FormField id="po-date" label="Order date" error={errors.date?.message}>
            <Controller
              control={control}
              name="date"
              render={({ field }) => <DatePicker id="po-date" value={field.value} onChange={(v) => field.onChange(v ?? "")} />}
            />
          </FormField>
          <FormField id="po-expected" label="Expected delivery" optional>
            <Controller
              control={control}
              name="expectedDate"
              render={({ field }) => <DatePicker id="po-expected" value={field.value} onChange={field.onChange} />}
            />
          </FormField>
        </div>
      </FormCard>

      <FormCard title="Line items" description="Unit prices default to each item's cost price.">
        <Controller
          control={control}
          name="lines"
          render={({ field }) => (
            <LineItemsEditor
              value={field.value}
              onChange={field.onChange}
              items={items}
              priceField="costPrice"
              errorFor={(i, f) => errors.lines?.[i]?.[f]?.message}
              rootError={errors.lines?.message ?? errors.lines?.root?.message}
            />
          )}
        />
      </FormCard>

      <FormCard title="Notes">
        <Textarea id="po-notes" placeholder="Delivery instructions, payment terms…" rows={3} aria-label="Notes" {...register("notes")} />
      </FormCard>
    </DocumentFormLayout>
  );
}
