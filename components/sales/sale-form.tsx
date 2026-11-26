"use client";

import { useRouter } from "next/navigation";
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
import { docNumber } from "@/lib/id";
import { saleSchema, type SaleFormValues } from "@/lib/schemas";
import { useItemsWithStock } from "@/store/hooks";
import { useInventoryStore } from "@/store/inventory-store";
import { useHydrated } from "@/store/use-hydrated";

const blank = (): SaleFormValues => ({
  customerId: "",
  date: new Date().toISOString(),
  lines: [{ itemId: "", qty: 1, unitPrice: 0 }],
  notes: "",
});

export function NewSaleView() {
  const hydrated = useHydrated();
  if (!hydrated) return <FormPageSkeleton title="New sale" />;
  return <SaleForm />;
}

function SaleForm() {
  const router = useRouter();
  const items = useItemsWithStock();
  const customers = useInventoryStore((s) => s.customers);
  const nextNumber = useInventoryStore((s) => docNumber("INV", s.counters.sale + 1));
  const createSale = useInventoryStore((s) => s.createSale);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SaleFormValues>({ resolver: zodResolver(saleSchema), defaultValues: blank() });

  const [customerId, lines] = useWatch({ control, name: ["customerId", "lines"] });
  const customer = customers.find((c) => c.id === customerId);

  const save = (confirm: boolean) =>
    handleSubmit((values) => {
      const result = createSale(values, confirm);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`${result.data.number} ${confirm ? "confirmed" : "saved as draft"}`, {
        description: confirm ? "Fulfil it to ship the stock." : "Confirm it when the customer approves.",
      });
      // The route stays mounted (Activity), so clear the form for next time.
      reset(blank());
      router.push(`/sales?invoice=${result.data.id}`);
    });

  return (
    <DocumentFormLayout
      backHref="/sales"
      backLabel="Sales"
      title="New sale"
      number={nextNumber}
      onSubmit={save(true)}
      summary={
        <DocumentSummary
          partyLabel="Customer"
          partyName={customer?.name}
          lines={lines}
          actions={
            <>
              <Button type="submit" size="lg" disabled={isSubmitting}>
                Confirm sale
              </Button>
              <Button type="button" variant="outline" disabled={isSubmitting} onClick={save(false)}>
                Save as draft
              </Button>
            </>
          }
          footnote="Stock is deducted only when the invoice is fulfilled."
        />
      }
    >
      <FormCard title="Invoice details">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_200px]">
          <FormField id="customer" label="Customer" error={errors.customerId?.message}>
            <Controller
              control={control}
              name="customerId"
              render={({ field }) => (
                <Combobox
                  id="customer"
                  value={field.value}
                  onChange={field.onChange}
                  invalid={!!errors.customerId}
                  placeholder="Choose a customer"
                  searchPlaceholder="Search customers…"
                  options={customers.map((c) => ({
                    value: c.id,
                    label: c.name,
                    keywords: [c.city, c.contactName],
                    meta: c.city,
                    leading: <EntityAvatar name={c.name} size="xs" />,
                  }))}
                />
              )}
            />
          </FormField>
          <FormField id="sale-date" label="Invoice date" error={errors.date?.message}>
            <Controller
              control={control}
              name="date"
              render={({ field }) => <DatePicker id="sale-date" value={field.value} onChange={(v) => field.onChange(v ?? "")} />}
            />
          </FormField>
        </div>
      </FormCard>

      <FormCard title="Line items" description="Prices default to each item's selling price. Stock on hand is shown while you pick.">
        <Controller
          control={control}
          name="lines"
          render={({ field }) => (
            <LineItemsEditor
              value={field.value}
              onChange={field.onChange}
              items={items}
              priceField="sellPrice"
              checkAvailability
              errorFor={(i, f) => errors.lines?.[i]?.[f]?.message}
              rootError={errors.lines?.message ?? errors.lines?.root?.message}
            />
          )}
        />
      </FormCard>

      <FormCard title="Notes">
        <Textarea id="sale-notes" placeholder="Delivery address, PO reference, terms…" rows={3} aria-label="Notes" {...register("notes")} />
      </FormCard>
    </DocumentFormLayout>
  );
}
