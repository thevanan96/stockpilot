"use client";

import { Plus, TriangleExclamationPoint, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/shared/combobox";
import { formatINR, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ItemWithStock, LineItem } from "@/types";

type LineField = keyof LineItem;

interface LineItemsEditorProps {
  value: LineItem[];
  onChange: (lines: LineItem[]) => void;
  items: ItemWithStock[];
  /** Which catalogue price to prefill when an item is picked. */
  priceField: "costPrice" | "sellPrice";
  /** Sales: warn when a line asks for more than is on hand. */
  checkAvailability?: boolean;
  errorFor: (index: number, field: LineField) => string | undefined;
  rootError?: string;
}

const GRID = "sm:grid sm:grid-cols-[minmax(0,1fr)_76px_112px_100px_28px] sm:items-start sm:gap-2.5";

export function LineItemsEditor({
  value,
  onChange,
  items,
  priceField,
  checkAvailability,
  errorFor,
  rootError,
}: LineItemsEditorProps) {
  const itemMap = new Map(items.map((i) => [i.id, i]));
  const update = (index: number, patch: Partial<LineItem>) =>
    onChange(value.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  const usedIds = new Set(value.map((l) => l.itemId));

  const options = items.map((i) => ({
    value: i.id,
    label: i.name,
    keywords: [i.sku, i.category],
    meta: (
      <span className="num">
        <span className="font-mono">{i.sku}</span>
        <span className={cn("ml-2", i.status === "out" ? "text-danger-text" : i.status === "low" ? "text-warning-text" : "")}>
          {formatNumber(i.quantity)} on hand
        </span>
      </span>
    ),
  }));

  return (
    <div className="space-y-3">
      <div className={cn("hidden px-0.5 text-xs font-medium text-muted-foreground", GRID)}>
        <span>Item</span>
        <span className="text-right">Qty</span>
        <span className="text-right">Unit price</span>
        <span className="text-right">Amount</span>
        <span />
      </div>

      <ul className="space-y-3 sm:space-y-2">
        {value.map((line, index) => {
          const item = itemMap.get(line.itemId);
          const qty = Number.isFinite(line.qty) ? line.qty : 0;
          const price = Number.isFinite(line.unitPrice) ? line.unitPrice : 0;
          const short = checkAvailability && item && qty > item.quantity;
          const itemError = errorFor(index, "itemId");
          const qtyError = errorFor(index, "qty");
          const priceError = errorFor(index, "unitPrice");
          return (
            <li
              key={index}
              className={cn(
                "relative rounded-lg border border-border p-3 animate-fade-up sm:rounded-none sm:border-0 sm:p-0",
                GRID,
              )}
            >
              <div className="min-w-0 space-y-1 pr-9 sm:pr-0">
                <Combobox
                  id={`line-${index}-item`}
                  value={line.itemId}
                  invalid={!!itemError}
                  onChange={(itemId) => {
                    const picked = itemMap.get(itemId);
                    update(index, { itemId, unitPrice: picked ? picked[priceField] : line.unitPrice });
                  }}
                  options={options.map((o) => ({ ...o, disabled: o.value !== line.itemId && usedIds.has(o.value) }))}
                  placeholder="Choose an item"
                  searchPlaceholder="Search by name or SKU…"
                  contentClassName="min-w-96"
                />
                {itemError && <p className="text-xs text-destructive">{itemError}</p>}
                {short && item && (
                  <p className="flex items-center gap-1 text-xs text-warning-text">
                    <TriangleExclamationPoint className="size-3" />
                    Only {formatNumber(item.quantity)} {item.unit} on hand — fulfilment will be blocked until restocked.
                  </p>
                )}
              </div>

              <div className="mt-2 grid grid-cols-3 gap-2 sm:contents">
                <NumberCell
                  label="Qty"
                  value={line.qty}
                  onChange={(qty) => update(index, { qty })}
                  error={qtyError}
                  step={1}
                />
                <NumberCell
                  label="Unit price"
                  value={line.unitPrice}
                  onChange={(unitPrice) => update(index, { unitPrice })}
                  error={priceError}
                  step={0.01}
                  prefix="₹"
                />
                <div className="flex flex-col justify-center sm:h-9 sm:items-end">
                  <span className="text-[11px] text-muted-foreground sm:hidden">Amount</span>
                  <span className="num text-sm font-medium">{formatINR(qty * price)}</span>
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute top-2 right-2 text-subtle-foreground hover:text-destructive sm:static sm:mt-1"
                onClick={() => onChange(value.filter((_, i) => i !== index))}
                aria-label={`Remove line ${index + 1}`}
                disabled={value.length === 1}
              >
                <X />
              </Button>
            </li>
          );
        })}
      </ul>

      {rootError && <p className="text-xs text-destructive">{rootError}</p>}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...value, { itemId: "", qty: 1, unitPrice: 0 }])}
        disabled={value.length >= items.length}
      >
        <Plus /> Add line
      </Button>
    </div>
  );
}

function NumberCell({
  label,
  value,
  onChange,
  error,
  step,
  prefix,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  error?: string;
  step: number;
  prefix?: string;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] text-muted-foreground sm:sr-only">{label}</span>
      <span className="relative block">
        {prefix && (
          <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-xs text-subtle-foreground">{prefix}</span>
        )}
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step={step}
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => onChange(e.target.value === "" ? Number.NaN : e.target.valueAsNumber)}
          aria-invalid={!!error || undefined}
          className={cn(
            "num h-9 w-full rounded-lg border border-input bg-card px-2.5 text-right text-sm transition-[border-color,box-shadow] duration-150 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/15 dark:bg-input/30",
            prefix && "pl-6",
          )}
        />
      </span>
      {error && <span className="block text-right text-[11px] text-destructive">{error}</span>}
    </label>
  );
}
