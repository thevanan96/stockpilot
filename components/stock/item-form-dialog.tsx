"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField } from "@/components/shared/form-field";
import { itemSchema, type ItemFormValues } from "@/lib/schemas";
import { useInventoryStore } from "@/store/inventory-store";
import { CATEGORIES, UNITS, type Item } from "@/types";
import { useRetained } from "@/hooks/use-retained";

interface ItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Item to edit; omit to create a new one. */
  item?: Item;
  onSaved?: (item: Item) => void;
}

export function ItemFormDialog({ open, onOpenChange, item: current, onSaved }: ItemFormDialogProps) {
  const item = useRetained(open, current);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle>{item ? `Edit ${item.name}` : "New item"}</DialogTitle>
          <DialogDescription>
            {item ? "Update catalogue details. Quantities change only through stock movements." : "Add a product to your catalogue."}
          </DialogDescription>
        </DialogHeader>
        {/* Content unmounts when closed, so the form always starts from fresh values. */}
        <ItemForm
          item={item}
          onDone={(saved) => {
            onOpenChange(false);
            onSaved?.(saved);
          }}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function ItemForm({ item, onDone, onCancel }: { item?: Item; onDone: (item: Item) => void; onCancel: () => void }) {
  const suppliers = useInventoryStore((s) => s.suppliers);
  const addItem = useInventoryStore((s) => s.addItem);
  const updateItem = useInventoryStore((s) => s.updateItem);

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: item
      ? { ...item, openingQty: 0 }
      : { name: "", sku: "", category: "Peripherals", unit: "pcs", minLevel: 10, openingQty: 0, preferredSupplierId: suppliers[0]?.id },
  });

  const onSubmit = handleSubmit(({ openingQty, ...values }) => {
    const input = { ...values, sku: values.sku.toUpperCase() };
    const result = item ? updateItem(item.id, input) : addItem(input, openingQty);
    if (!result.ok) {
      setError("sku", { message: result.error });
      return;
    }
    toast.success(item ? "Item updated" : "Item created", { description: `${result.data.name} · ${result.data.sku}` });
    onDone(result.data);
  });

  const num = { valueAsNumber: true } as const;

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="grid max-h-[65dvh] gap-4 overflow-y-auto px-5 py-5 sm:grid-cols-2">
        <FormField id="name" label="Item name" error={errors.name?.message} className="sm:col-span-2">
          <Input id="name" autoFocus placeholder="e.g. Wireless Mouse M220" aria-invalid={!!errors.name} {...register("name")} />
        </FormField>
        <FormField id="sku" label="SKU" error={errors.sku?.message}>
          <Input id="sku" placeholder="PER-1006" className="font-mono uppercase" aria-invalid={!!errors.sku} {...register("sku")} />
        </FormField>
        <FormField id="category" label="Category" error={errors.category?.message}>
          <Controller
            control={control}
            name="category"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
        <FormField id="unit" label="Unit" error={errors.unit?.message}>
          <Controller
            control={control}
            name="unit"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="unit" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
        <FormField id="minLevel" label="Minimum level" error={errors.minLevel?.message} hint="Low-stock alert at or below this">
          <Input id="minLevel" type="number" min={0} inputMode="numeric" className="num" aria-invalid={!!errors.minLevel} {...register("minLevel", num)} />
        </FormField>
        <FormField id="costPrice" label="Cost price (₹)" error={errors.costPrice?.message}>
          <Input id="costPrice" type="number" min={0} step="0.01" inputMode="decimal" className="num" aria-invalid={!!errors.costPrice} {...register("costPrice", num)} />
        </FormField>
        <FormField id="sellPrice" label="Selling price (₹)" error={errors.sellPrice?.message}>
          <Input id="sellPrice" type="number" min={0} step="0.01" inputMode="decimal" className="num" aria-invalid={!!errors.sellPrice} {...register("sellPrice", num)} />
        </FormField>
        <FormField id="supplier" label="Preferred supplier" optional error={errors.preferredSupplierId?.message} className={item ? "sm:col-span-2" : undefined}>
          <Controller
            control={control}
            name="preferredSupplierId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="supplier" className="w-full">
                  <SelectValue placeholder="Choose supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
        {!item && (
          <FormField id="openingQty" label="Opening quantity" error={errors.openingQty?.message} hint="Recorded in the ledger as an opening balance">
            <Input id="openingQty" type="number" min={0} inputMode="numeric" className="num" aria-invalid={!!errors.openingQty} {...register("openingQty", num)} />
          </FormField>
        )}
      </div>
      <DialogFooter className="m-0 rounded-b-xl px-5 py-3.5">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {item ? "Save changes" : "Create item"}
        </Button>
      </DialogFooter>
    </form>
  );
}
