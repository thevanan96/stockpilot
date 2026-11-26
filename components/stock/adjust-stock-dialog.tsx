"use client";

import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField } from "@/components/shared/form-field";
import { StatusBadge } from "@/components/shared/status-badge";
import { ADJUSTMENT_REASONS, adjustmentSchema, type AdjustmentFormValues } from "@/lib/schemas";
import { stockStatus } from "@/lib/domain";
import { formatNumber } from "@/lib/format";
import { useInventoryStore } from "@/store/inventory-store";
import { cn } from "@/lib/utils";
import { useRetained } from "@/hooks/use-retained";
import type { ItemWithStock } from "@/types";

interface AdjustStockDialogProps {
  item: ItemWithStock | null;
  onOpenChange: (open: boolean) => void;
}

export function AdjustStockDialog({ item: current, onOpenChange }: AdjustStockDialogProps) {
  const item = useRetained(!!current, current);
  return (
    <Dialog open={!!current} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-md">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle>Adjust stock</DialogTitle>
          <DialogDescription>
            {item ? (
              <>
                {item.name} <span className="font-mono text-xs">· {item.sku}</span>
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>
        {item && <AdjustForm item={item} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function AdjustForm({ item, onDone }: { item: ItemWithStock; onDone: () => void }) {
  const adjustStock = useInventoryStore((s) => s.adjustStock);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<AdjustmentFormValues>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: { direction: "add", reason: "Cycle count correction", note: "" },
  });
  const [direction, qty] = useWatch({ control, name: ["direction", "qty"] });
  const delta = (Number.isFinite(qty) ? qty : 0) * (direction === "add" ? 1 : -1);
  const after = item.quantity + delta;

  const onSubmit = handleSubmit((v) => {
    const reason = v.note ? `${v.reason} — ${v.note}` : v.reason;
    const result = adjustStock(item.id, v.direction === "add" ? v.qty : -v.qty, reason);
    if (!result.ok) {
      setError("qty", { message: result.error });
      return;
    }
    toast.success(`Stock adjusted · ${result.data.refDoc.number}`, {
      description: `${item.name}: ${formatNumber(item.quantity)} → ${formatNumber(after)} ${item.unit}`,
    });
    onDone();
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="grid gap-4 px-5 py-5">
        <Controller
          control={control}
          name="direction"
          render={({ field }) => (
            <div role="radiogroup" aria-label="Adjustment direction" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 ring-1 ring-border ring-inset">
              {(["add", "remove"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={field.value === d}
                  onClick={() => field.onChange(d)}
                  className={cn(
                    "flex h-8 items-center justify-center gap-1.5 rounded-md text-[13px] font-medium text-muted-foreground transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    field.value === d && "bg-card text-foreground shadow-card ring-1 ring-border",
                  )}
                >
                  {d === "add" ? <Plus className="size-3.5 text-success" /> : <Minus className="size-3.5 text-danger" />}
                  {d === "add" ? "Add stock" : "Remove stock"}
                </button>
              ))}
            </div>
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="adj-qty" label={`Quantity (${item.unit})`} error={errors.qty?.message}>
            <Input id="adj-qty" type="number" min={1} inputMode="numeric" autoFocus className="num" aria-invalid={!!errors.qty} {...register("qty", { valueAsNumber: true })} />
          </FormField>
          <FormField id="adj-reason" label="Reason">
            <Controller
              control={control}
              name="reason"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="adj-reason" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ADJUSTMENT_REASONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
        </div>
        <FormField id="adj-note" label="Note" optional error={errors.note?.message}>
          <Input id="adj-note" placeholder="e.g. Counted during monthly audit" {...register("note")} />
        </FormField>

        <div className="flex items-center justify-between rounded-lg border border-dashed border-border-strong bg-muted/40 px-3.5 py-3">
          <span className={cn("text-xs", after < 0 ? "text-danger-text" : "text-muted-foreground")}>
            {after < 0 ? `Only ${formatNumber(item.quantity)} ${item.unit} on hand` : "On hand"}
          </span>
          <span className="num flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{formatNumber(item.quantity)}</span>
            <ArrowRight className="size-3.5 text-subtle-foreground" />
            <span className={cn("font-semibold", after < 0 ? "text-danger-text" : "text-foreground")}>{formatNumber(after)}</span>
            {after >= 0 && <StatusBadge status={stockStatus(after, item.minLevel)} className="ml-1" />}
          </span>
        </div>
      </div>
      <DialogFooter className="m-0 rounded-b-xl px-5 py-3.5">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={after < 0}>
          Record adjustment
        </Button>
      </DialogFooter>
    </form>
  );
}
